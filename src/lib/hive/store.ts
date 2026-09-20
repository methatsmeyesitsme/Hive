import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getAiStatus, runMcTask } from "./mc";
import {
  connectGithub,
  createGithubRepo,
  disconnectGithub,
  listGithubRepos,
  pushToGithub,
} from "../github/api";
import { STORAGE_KEY } from "./constants";
import { acquireLock, estimateSwarm, hrcAllocate } from "./limits";
import type {
  Artifact,
  Attachment,
  AuditEvent,
  ChatMessage,
  ExecStatus,
  FileLock,
  GithubRepo,
  HiveView,
  LieutenantState,
  MemoryEntry,
  Project,
  RunPhase,
  SplitterState,
} from "./types";
import { nid } from "../utils";

type HiveState = {
  hydrated: boolean;
  workspaceId: string;
  sessionName: string | null;
  view: HiveView;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  rightOpenMobile: boolean;
  leftOpenMobile: boolean;
  previewOpen: boolean;
  previewRunning: boolean;
  aiAvailable: boolean | null;

  projects: Project[];
  activeProjectId: string | null;

  phase: RunPhase;
  status: ExecStatus;
  /** Physical 7B models managed by HRC (1–5). */
  splitters: SplitterState[];
  /** Flattened logical LIs for the status panel (derived from splitters). */
  lieutenants: LieutenantState[];
  agentTotal: number;
  fileLocks: FileLock[];
  pauseReason: string | null;
  frozen: boolean;
  audits: AuditEvent[];
  runId: string | null;

  memories: MemoryEntry[];

  githubConnected: boolean;
  githubUsername: string;
  githubRepo: string | null;
  githubRepos: GithubRepo[];
  githubBusy: boolean;
  githubError: string | null;
  pushBusy: boolean;

  enterWorkspace: (name: string) => void;
  logout: () => void;
  setView: (view: HiveView) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setLeftOpenMobile: (open: boolean) => void;
  setRightOpenMobile: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  runPreview: () => void;

  createProject: (name?: string, repoFullName?: string | null) => void;
  selectProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;

  send: (text: string, attachments: Attachment[]) => Promise<void>;
  cancel: () => void;
  freeze: () => void;

  addMemory: (entry: Omit<MemoryEntry, "id" | "createdAt" | "editable">) => void;
  updateMemory: (id: string, patch: Partial<Pick<MemoryEntry, "title" | "content">>) => void;
  deleteMemory: (id: string) => void;

  checkAi: () => Promise<void>;
  connectGithub: (username: string, pat: string) => Promise<boolean>;
  disconnectGithub: () => Promise<void>;
  refreshRepos: () => Promise<void>;
  createRepo: (name: string) => Promise<string | null>;
  setGithubRepo: (fullName: string | null) => void;
  pushApprovedWork: () => Promise<{ ok: boolean; error?: string }>;

  activeProject: () => Project | null;
};

const idleStatus: ExecStatus = {
  mc: "Standing by",
  hrc: "Standing by",
  ro: "Standing by",
};

const memoryStorage = createJSONStorage<Partial<HiveState>>(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return localStorage;
});

let abortRun: AbortController | null = null;
const lockMap = new Map<string, { ownerId: string; ownerLabel: string }>();

function audit(actor: string, action: string): AuditEvent {
  return { id: nid("aud"), at: Date.now(), actor, action };
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(resolve, ms);
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function newProject(name: string, repoFullName: string | null = null): Project {
  const now = Date.now();
  return {
    id: nid("prj"),
    name,
    createdAt: now,
    updatedAt: now,
    messages: [],
    artifact: null,
    repoFullName,
  };
}

export const useHiveStore = create<HiveState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      workspaceId: nid("ws"),
      sessionName: null,
      view: "workspace",
      leftCollapsed: false,
      rightCollapsed: false,
      rightOpenMobile: false,
      leftOpenMobile: false,
      previewOpen: false,
      previewRunning: false,
      aiAvailable: null,

      projects: [],
      activeProjectId: null,

      phase: "idle",
      status: idleStatus,
      splitters: [],
      lieutenants: [],
      agentTotal: 0,
      fileLocks: [],
      pauseReason: null,
      frozen: false,
      audits: [],
      runId: null,

      memories: [],

      githubConnected: false,
      githubUsername: "",
      githubRepo: null,
      githubRepos: [],
      githubBusy: false,
      githubError: null,
      pushBusy: false,

      activeProject: () => {
        const { projects, activeProjectId } = get();
        return projects.find((p) => p.id === activeProjectId) ?? null;
      },

      enterWorkspace: (name) => {
        const trimmed = name.trim().slice(0, 48);
        if (!trimmed) return;
        const { projects } = get();
        if (projects.length === 0) {
          const project = newProject("Untitled project");
          set({
            sessionName: trimmed,
            projects: [project],
            activeProjectId: project.id,
            view: "workspace",
          });
          return;
        }
        set({ sessionName: trimmed, view: "workspace" });
      },

      logout: () => {
        abortRun?.abort();
        abortRun = null;
        set({
          sessionName: null,
          view: "workspace",
          phase: "idle",
          status: idleStatus,
          splitters: [],
          lieutenants: [],
          agentTotal: 0,
          previewOpen: false,
          previewRunning: false,
        });
      },

      setView: (view) => set({ view, leftOpenMobile: false }),
      toggleLeft: () => set((s) => ({ leftCollapsed: !s.leftCollapsed })),
      toggleRight: () => set((s) => ({ rightCollapsed: !s.rightCollapsed })),
      setLeftOpenMobile: (open) => set({ leftOpenMobile: open }),
      setRightOpenMobile: (open) => set({ rightOpenMobile: open }),
      setPreviewOpen: (open) => set({ previewOpen: open }),
      runPreview: () => set({ previewRunning: true, previewOpen: true }),

      createProject: (name, repoFullName) => {
        abortRun?.abort();
        abortRun = null;
        const project = newProject(name?.trim() || "Untitled project", repoFullName ?? get().githubRepo);
        set((s) => ({
          projects: [project, ...s.projects],
          activeProjectId: project.id,
          view: "workspace",
          phase: "idle",
          status: idleStatus,
          splitters: [],
          lieutenants: [],
          agentTotal: 0,
          fileLocks: [],
          pauseReason: null,
          frozen: false,
          previewOpen: false,
          previewRunning: false,
          leftOpenMobile: false,
          audits: [audit("MC", `Opened project “${project.name}”`), ...s.audits].slice(0, 80),
        }));
      },

      selectProject: (id) => {
        abortRun?.abort();
        abortRun = null;
        set({
          activeProjectId: id,
          view: "workspace",
          phase: "idle",
          status: idleStatus,
          splitters: [],
          lieutenants: [],
          agentTotal: 0,
          fileLocks: [],
          pauseReason: null,
          frozen: false,
          previewRunning: false,
          leftOpenMobile: false,
        });
      },

      renameProject: (id, name) => {
        const trimmed = name.trim().slice(0, 64);
        if (!trimmed) return;
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p,
          ),
        }));
      },

      deleteProject: (id) => {
        set((s) => {
          const projects = s.projects.filter((p) => p.id !== id);
          const activeProjectId =
            s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId;
          return { projects, activeProjectId };
        });
      },

      // send() and remaining methods: full Splitter implementation is in local
      // commit 9195337. Temporary stub so the repo is not broken while we
      // re-upload the large send() body in the next commit.
      send: async () => {
        console.warn("Hive store send() incomplete after restore — re-sync needed");
      },
      cancel: () => {
        abortRun?.abort();
        abortRun = null;
        set({
          phase: "cancelled",
          status: idleStatus,
          splitters: [],
          lieutenants: [],
          agentTotal: 0,
        });
      },
      freeze: () => set({ frozen: true }),

      addMemory: (entry) => {
        set((s) => ({
          memories: [
            {
              id: nid("mem"),
              createdAt: Date.now(),
              editable: true as const,
              ...entry,
            },
            ...s.memories,
          ].slice(0, 200),
        }));
      },
      updateMemory: (id, patch) => {
        set((s) => ({
          memories: s.memories.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },
      deleteMemory: (id) => {
        set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
      },

      checkAi: async () => {
        const r = await getAiStatus();
        set({ aiAvailable: r.available });
      },
      connectGithub: async (username, pat) => {
        set({ githubBusy: true, githubError: null });
        try {
          const ok = await connectGithub(username, pat);
          if (ok) {
            set({ githubConnected: true, githubUsername: username, githubBusy: false });
            await get().refreshRepos();
            return true;
          }
          set({ githubBusy: false, githubError: "Could not connect" });
          return false;
        } catch (e) {
          set({
            githubBusy: false,
            githubError: e instanceof Error ? e.message : String(e),
          });
          return false;
        }
      },
      disconnectGithub: async () => {
        await disconnectGithub();
        set({
          githubConnected: false,
          githubUsername: "",
          githubRepo: null,
          githubRepos: [],
        });
      },
      refreshRepos: async () => {
        try {
          const repos = await listGithubRepos();
          set({ githubRepos: repos });
        } catch {
          /* ignore */
        }
      },
      createRepo: async (name) => {
        try {
          const full = await createGithubRepo(name);
          await get().refreshRepos();
          return full;
        } catch {
          return null;
        }
      },
      setGithubRepo: (fullName) => set({ githubRepo: fullName }),
      pushApprovedWork: async () => {
        set({ pushBusy: true });
        try {
          const project = get().activeProject();
          if (!project?.artifact) {
            set({ pushBusy: false });
            return { ok: false, error: "No artifact to push" };
          }
          await pushToGithub({
            fullName: project.repoFullName || get().githubRepo || "",
            files: project.artifact.files,
            message: `Hive: ${project.artifact.title}`,
          });
          set({ pushBusy: false });
          return { ok: true };
        } catch (e) {
          set({ pushBusy: false });
          return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: memoryStorage,
      partialize: (s) =>
        ({
          workspaceId: s.workspaceId,
          sessionName: s.sessionName,
          projects: s.projects,
          activeProjectId: s.activeProjectId,
          memories: s.memories,
          leftCollapsed: s.leftCollapsed,
          rightCollapsed: s.rightCollapsed,
        }) as unknown as HiveState,
      onRehydrateStorage: () => () => {
        useHiveStore.setState({
          hydrated: true,
          phase: "idle",
          status: idleStatus,
          splitters: [],
          lieutenants: [],
          agentTotal: 0,
          frozen: false,
          previewRunning: false,
          githubConnected: false,
        });
      },
    },
  ),
);
