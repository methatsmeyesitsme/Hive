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
import type { SplitterPlan } from "./splitter";
import { perf } from "./perf";
import { releaseModel } from "./local-model";
import { buildSplitterStates, listSplitterIds, splitterOfLi } from "./splitter-state";
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
  lieutenants: LieutenantState[];
  /** Physical ~7B Splitters, each role-playing one or more Li. */
  splitters: SplitterState[];
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
      lieutenants: [],
          splitters: [],
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
          lieutenants: [],
          splitters: [],
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
          lieutenants: [],
          splitters: [],
          agentTotal: 0,
          fileLocks: [],
          pauseReason: null,
          frozen: false,
          previewOpen: false,
          previewRunning: false,
          leftOpenMobile: false,
          audits: [audit("MC", `Opened project “${project.name}”`), ...s.audits].slice(0, 80),
        }));
        // Fresh project → free any previous WebGPU session so OrtRun stays stable.
        void releaseModel();
      },

      selectProject: (id) => {
        abortRun?.abort();
        abortRun = null;
        set({
          activeProjectId: id,
          view: "workspace",
          phase: "idle",
          status: idleStatus,
          lieutenants: [],
          splitters: [],
          agentTotal: 0,
          fileLocks: [],
          pauseReason: null,
          frozen: false,
          previewRunning: false,
          leftOpenMobile: false,
        });
        void releaseModel();
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
        const wasActive = get().activeProjectId === id;
        // Deleting the project a run is working on stops that run first.
        const idle = ["idle", "complete", "error", "cancelled"].includes(get().phase);
        if (wasActive && !idle) get().cancel();
        set((s) => {
          const projects = s.projects.filter((p) => p.id !== id);
          const activeProjectId = wasActive ? (projects[0]?.id ?? null) : s.activeProjectId;
          return {
            projects,
            activeProjectId,
            ...(wasActive
              ? {
                  previewOpen: false,
                  previewRunning: false,
                  phase: "idle" as const,
                  status: idleStatus,
                  lieutenants: [],
                  splitters: [],
                  agentTotal: 0,
                  fileLocks: [],
                  pauseReason: null,
                  frozen: false,
                }
              : {}),
          };
        });
        // Free WebGPU / ONNX session memory so the next project starts clean.
        void releaseModel();
      },

      send: async (text, attachments) => {
        const prompt = text.trim();
        if (!prompt && attachments.length === 0) return;
        const state = get();
        if (state.frozen) return;
        if (state.phase !== "idle" && state.phase !== "complete" && state.phase !== "cancelled" && state.phase !== "error") {
          return;
        }

        let project = state.activeProject();
        if (!project) {
          const created = newProject("Untitled project");
          set({ projects: [created, ...state.projects], activeProjectId: created.id });
          project = created;
        }

        abortRun?.abort();
        const controller = new AbortController();
        abortRun = controller;
        const signal = controller.signal;
        const runId = nid("run");
        perf.beginRun();
        lockMap.clear();

        const userMsg: ChatMessage = {
          id: nid("msg"),
          role: "user",
          content: prompt || "(attachments)",
          createdAt: Date.now(),
          attachments,
        };

        const patchProject = (fn: (p: Project) => Project) => {
          set((s) => ({
            projects: s.projects.map((p) => (p.id === project!.id ? fn(p) : p)),
          }));
        };

        patchProject((p) => ({
          ...p,
          messages: [...p.messages, userMsg],
          updatedAt: Date.now(),
          artifact: p.artifact ? { ...p.artifact, ready: false } : p.artifact,
        }));

        const provisional = estimateSwarm(prompt);
        set({
          runId,
          phase: "planning",
          previewRunning: false,
          pauseReason: null,
          status: {
            mc: "Planning the requested changes",
            hrc: "Waiting for objective",
            ro: state.githubConnected ? "Reviewing repository context" : "Standing by",
          },
          lieutenants: [],
          splitters: [],
          agentTotal: 0,
          fileLocks: [],
          audits: [
            audit("MC", "Received the human’s original request"),
            ...get().audits,
          ].slice(0, 80),
        });

        const history = project.messages
          .filter((m) => m.role === "user" || m.role === "mc")
          .map((m) => ({
            role: m.role === "mc" ? ("mc" as const) : ("user" as const),
            content: m.content,
          }));

        const apiPromise = runMcTask({
          data: {
            prompt,
            history,
            attachments: attachments.map((a) => ({
              name: a.name,
              mime: a.mime,
              kind: a.kind,
              dataUrl: a.kind === "image" ? a.dataUrl : undefined,
              textExcerpt: a.textExcerpt,
            })),
            memory: get().memories.slice(0, 12).map((m) => ({
              title: m.title,
              content: m.content,
            })),
            currentHtml: project.artifact?.html ?? null,
            projectName: project.name,
            // Show the model's real progress in MC's status line (a few updates a second).
            onProgress: (() => {
              let last = 0;
              return ({ label, tokens }: { label: string; tokens: number }) => {
                const now = perf.now();
                if (now - last < 250 || get().runId !== runId) return;
                last = now;
                set({ status: { ...get().status, mc: `Writing the ${label}… ${tokens} tokens` } });
              };
            })(),
          },
        });

        // Splitter bookkeeping for this run (filled in once HRC allocates).
        let splitPlans: SplitterPlan[] = [];
        let splitOf = new Map<string, string>();
        let tick = 0;
        const syncSplitters = () =>
          set({ splitters: buildSplitterStates(splitPlans, get().lieutenants, tick) });
        const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

        // The swarm view is paced so it looks alive while the model works. That pacing
        // overlaps with inference. Once the model has answered, it must not add wall
        // time, so pauses collapse to a blink.
        let modelSettled = false;
        void apiPromise.then(
          () => {
            modelSettled = true;
          },
          () => {
            modelSettled = true;
          },
        );
        // Keep the swarm animation snappy: long pauses only while the model is
        // still thinking; after it answers, collapse to a few frames.
        const pace = async (ms: number) => {
          const afterModel = modelSettled;
          const t = perf.now();
          const capped = afterModel ? Math.min(ms, 12) : Math.min(ms, 180);
          await sleep(capped, signal);
          perf.pacing(afterModel, perf.now() - t);
        };

        const fail = (message: string) => {
          if (signal.aborted) return;
          const sys: ChatMessage = {
            id: nid("msg"),
            role: "mc",
            content: message,
            createdAt: Date.now(),
          };
          patchProject((p) => ({
            ...p,
            messages: [...p.messages, sys],
            updatedAt: Date.now(),
          }));
          lockMap.clear();
          set({
            phase: "error",
            status: { mc: "Could not complete the run", hrc: "Standing by", ro: "Standing by" },
            audits: [audit("MC", "Run failed"), ...get().audits].slice(0, 80),
            agentTotal: 0,
            fileLocks: [],
            lieutenants: get().lieutenants.map((li) => ({
              ...li,
              status: "failed" as const,
              activity: "Stopped",
              agents: li.agents.map((a) => ({ ...a, status: "failed" as const })),
            })),
          });
          syncSplitters();
          perf.finishRun();
        };

        try {
          await pace(700);
          if (get().runId !== runId) return;
          set({
            phase: "dispatching",
            status: {
              mc: "Sending the overall objective to HRC and RO",
              hrc: "Receiving objective",
              ro: "Receiving objective",
            },
            audits: [
              audit("MC", "Sent overall objective to HRC"),
              audit("MC", "Sent overall objective to RO"),
              ...get().audits,
            ].slice(0, 80),
          });

          await pace(650);
          const pre = hrcAllocate(provisional);
          if (!pre.ok) {
            set({
              phase: "paused",
              pauseReason: pre.reason,
              status: {
                mc: "Production paused",
                hrc: "27th Li deleted — investigation",
                ro: "Standing by",
              },
            });
            fail(pre.reason);
            return;
          }
          // HRC packs the Li onto 1-5 physical Splitters (~7B models). A Splitter
          // role-plays several Li by keeping a separate conversation for each.
          splitPlans = pre.splitAllocation.splitters;
          splitOf = splitterOfLi(splitPlans);

          set({
            phase: "allocating",
            status: {
              mc: "Waiting for swarm readiness",
              hrc: `Allocating ${pre.totalAgents} agents across ${pre.lieutenants.length} Li on ${plural(splitPlans.length, "Splitter")}`,
              ro: pre.lieutenants.length > 2 ? "Preparing research channels" : "Standing by",
            },
            audits: [
              audit(
                "HRC",
                `Planned ${plural(splitPlans.length, "Splitter")} for ${plural(pre.lieutenants.length, "Li")}`,
              ),
              ...get().audits,
            ].slice(0, 80),
          });

          await pace(700);
          set({
            phase: "summoning",
            status: { ...get().status, hrc: `Activating ${plural(splitPlans.length, "Splitter")}` },
            splitters: splitPlans.map((sp) => ({
              id: sp.id,
              status: "summoning" as const,
              activity: "Loading 7B model",
              lieutenants: [],
            })),
            audits: [
              audit("HRC", `Activated ${listSplitterIds(splitPlans)}`),
              ...get().audits,
            ].slice(0, 80),
          });
          await pace(450);
          set({ status: { ...get().status, hrc: "Summoning Li" } });

          const summoned: LieutenantState[] = [];
          for (const li of pre.lieutenants) {
            if (signal.aborted) return;
            summoned.push({
              letter: li.letter,
              objective: li.objective,
              activity: "Coming online",
              agentAllowance: li.agentCount,
              permissionGranted: true,
              agents: [],
              status: "summoning",
              splitterId: splitOf.get(li.letter),
            });
            set({
              lieutenants: [...summoned],
              status: {
                ...get().status,
                hrc: `Summoned Li ${li.letter} on ${splitOf.get(li.letter) ?? "a Splitter"} · allowance ${li.agentCount}`,
              },
              audits: [
                audit(
                  "HRC",
                  `Summoned Li ${li.letter} on ${splitOf.get(li.letter) ?? "a Splitter"} with allowance ${li.agentCount}`,
                ),
                ...get().audits,
              ].slice(0, 80),
            });
            syncSplitters();
            await pace(220);
          }

          let agentTotal = 0;
          for (let i = 0; i < summoned.length; i++) {
            const li = summoned[i];
            const plan = pre.lieutenants[i];
            const logical = splitPlans
              .flatMap((sp) => sp.lieutenants)
              .find((l) => l.letter === li.letter);
            for (let n = 0; n < li.agentAllowance; n++) {
              if (signal.aborted) return;
              const agentId = logical?.agents[n]?.id ?? nid("ag");
              const file =
                logical?.agents[n]?.ownedFiles[0] ??
                (plan.files[n % Math.max(1, plan.files.length)] || `work/${li.letter}/${n + 1}`);
              const ownerLabel = `${li.splitterId ? `${li.splitterId} · ` : ""}Li ${li.letter} · agent ${n + 1}`;
              acquireLock(lockMap, file, agentId, ownerLabel);
              li.agents.push({
                id: agentId,
                liLetter: li.letter,
                assignment: plan.objective,
                status: "working",
                ownedFiles: [file],
              });
              agentTotal += 1;
              li.activity = `Managing ${li.agents.length} agents`;
              li.status = "working";
              set({
                lieutenants: summoned.map((x) => ({ ...x, agents: [...x.agents] })),
                agentTotal,
                fileLocks: [...lockMap.entries()].map(([path, v]) => ({
                  path,
                  ownerId: v.ownerId,
                  ownerLabel: v.ownerLabel,
                })),
                status: {
                  mc: "Waiting for swarm readiness",
                  hrc: `Managing ${agentTotal} active agents`,
                  ro: get().status.ro,
                },
              });
              syncSplitters();
              await pace(70);
            }
          }

          set({
            phase: "distributing",
            status: {
              mc: "Distributing designated objectives",
              hrc: "All required Li and agents created",
              ro: "Memory standing by",
            },
            audits: [
              audit("HRC", "Notified MC that the swarm is ready"),
              audit("MC", "Distributed designated objectives to Li"),
              ...get().audits,
            ].slice(0, 80),
          });
          await pace(500);

          set({
            phase: "working",
            status: {
              mc: "Monitoring mini-swarms",
              hrc: `Managing ${agentTotal} active agents`,
              ro: "Standing by",
            },
          });

          const tWait = perf.now();
          const result = await apiPromise;
          const tResult = perf.now();
          perf.waitModel(tResult - tWait);
          if (signal.aborted || get().runId !== runId) return;

          if (!result.ok) {
            fail(result.error);
            return;
          }

          const allocated = hrcAllocate(result.plan.lieutenants);
          if (!allocated.ok) {
            set({
              phase: "paused",
              pauseReason: allocated.reason,
              lieutenants: [],
          splitters: [],
              agentTotal: 0,
              status: {
                mc: "Production paused",
                hrc: "27th Li deleted — investigation",
                ro: "Standing by",
              },
            });
            fail(allocated.reason);
            return;
          }

          // HRC re-splits the Li across Splitters using MC's real plan.
          const previousSplitters = splitPlans.length;
          splitPlans = allocated.splitAllocation.splitters;
          splitOf = splitterOfLi(splitPlans);
          if (splitPlans.length !== previousSplitters) {
            set({
              audits: [
                audit(
                  "HRC",
                  `Re-split ${plural(allocated.lieutenants.length, "Li")} across ${plural(splitPlans.length, "Splitter")}`,
                ),
                ...get().audits,
              ].slice(0, 80),
            });
          }

          // Merge real designated objectives onto the live swarm.
          const merged: LieutenantState[] = allocated.lieutenants.map((li, idx) => {
            const existing = summoned[idx];
            const agents =
              existing?.agents.map((a) => ({
                ...a,
                assignment: li.objective,
                status: "working" as const,
              })) ??
              Array.from({ length: li.agentCount }, (_, n) => ({
                id:
                  splitPlans
                    .flatMap((sp) => sp.lieutenants)
                    .find((l) => l.letter === li.letter)?.agents[n]?.id ?? nid("ag"),
                liLetter: li.letter,
                assignment: li.objective,
                status: "working" as const,
                ownedFiles: li.files.slice(0, 1),
              }));
            return {
              letter: li.letter,
              objective: li.objective,
              activity: `Managing ${agents.length} agents`,
              agentAllowance: li.agentCount,
              permissionGranted: true,
              agents,
              status: "working" as const,
              splitterId: splitOf.get(li.letter),
            };
          });
          const liveTotal = merged.reduce((s, l) => s + l.agents.length, 0);
          set({
            lieutenants: merged,
            agentTotal: liveTotal,
            status: {
              mc: result.plan.objective.slice(0, 64),
              hrc: `Managing ${liveTotal} agents on ${plural(splitPlans.length, "Splitter")}`,
              ro: result.plan.researchNeeded
                ? `Researching ${result.plan.researchTopic || "external context"}`
                : "Standing by",
            },
          });
          syncSplitters();

          if (result.plan.researchNeeded) {
            set({
              phase: "researching",
              status: {
                mc: "Distributing RO findings",
                hrc: `Managing ${liveTotal} active agents`,
                ro: `Researching ${result.plan.researchTopic || "the open web"}`,
              },
              audits: [
                audit("RO", `Web research: ${result.plan.researchTopic || "context"}`),
                audit("RO", "Returned findings directly to requesting agents"),
                audit("MC", "Distributed relevant new information to Li"),
                ...get().audits,
              ].slice(0, 80),
            });
            await pace(900);
          }

          set({
            phase: "working",
            status: {
              mc: "Agents implementing assigned work",
              hrc: `Managing ${liveTotal} active agents`,
              ro: "Standing by",
            },
          });

          const workTicks = 5;
          for (let t = 0; t < workTicks; t++) {
            if (signal.aborted) return;
            tick = t;
            set((s) => ({
              lieutenants: s.lieutenants.map((li, i) => ({
                ...li,
                activity:
                  t === workTicks - 1
                    ? "Reviewing agent work"
                    : [
                        `Managing ${li.agents.length} agents`,
                        "Answering non-web questions",
                        "Checking file ownership",
                        "Collecting completed assignments",
                      ][(t + i) % 4],
                agents: li.agents.map((a, n) => ({
                  ...a,
                  status:
                    t > 2 && n % 3 === t % 3
                      ? "done"
                      : t === 1 && n % 5 === 0
                        ? "research"
                        : "working",
                })),
              })),
            }));
            syncSplitters();
            await pace(420);
          }

          set({
            phase: "reviewing",
            status: {
              mc: "Receiving compiled Li results",
              hrc: "Holding population steady",
              ro: "Standing by",
            },
            lieutenants: get().lieutenants.map((li) => ({
              ...li,
              status: "reviewing",
              activity: "Stitching mini-swarm work",
              agents: li.agents.map((a) => ({ ...a, status: "done" })),
            })),
          });
          syncSplitters();
          await pace(700);

          set({
            phase: "integrating",
            status: {
              mc: `Integrating ${merged.map((l) => `Li ${l.letter}`).join(" and ")}`,
              hrc: "Standing down spare capacity",
              ro: "Waiting for knowledge extraction",
            },
            lieutenants: get().lieutenants.map((li) => ({
              ...li,
              status: "done",
              activity: "Compiled result sent to MC",
            })),
            audits: [
              audit("Li", "Sent compiled mini-swarm results to MC"),
              audit("MC", "Performing final integration"),
              ...get().audits,
            ].slice(0, 80),
          });
          syncSplitters();
          await pace(750);

          lockMap.clear();
          set({
            phase: "extracting",
            fileLocks: [],
            status: {
              mc: "Presenting completed work",
              hrc: "Swarm idle",
              ro: "Storing useful knowledge in memory",
            },
          });

          for (const mem of result.memory) {
            get().addMemory(mem);
          }
          if (result.artifact) {
            get().addMemory({
              title: `Completed: ${result.artifact.title}`,
              content: result.plan.objective,
              source: "work",
            });
          }

          await pace(400);
          if (signal.aborted || get().runId !== runId) return;

          const mcMsg: ChatMessage = {
            id: nid("msg"),
            role: "mc",
            content: result.mcMessage,
            createdAt: Date.now(),
            hasArtifact: Boolean(result.artifact),
          };

          const artifact: Artifact | null = result.artifact
            ? { ...result.artifact, ready: true }
            : get().activeProject()?.artifact ?? null;

          patchProject((p) => ({
            ...p,
            messages: [...p.messages, mcMsg],
            artifact,
            updatedAt: Date.now(),
            name:
              p.name === "Untitled project" && result.artifact?.title
                ? result.artifact.title.slice(0, 48)
                : p.name,
          }));

          perf.integrate(perf.now() - tResult);
          perf.finishRun();
          set({
            phase: "complete",
            agentTotal: 0,
            previewRunning: false,
            status: {
              mc: "Work presented to the human",
              hrc: "Standing by",
              ro: "Standing by",
            },
            audits: [audit("MC", "Presented completed work"), ...get().audits].slice(0, 80),
          });
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          fail("Something went wrong while Hive was working. Try again.");
        }
      },

      cancel: () => {
        abortRun?.abort();
        abortRun = null;
        lockMap.clear();
        const project = get().activeProject();
        if (project) {
          const msg: ChatMessage = {
            id: nid("msg"),
            role: "mc",
            content:
              "Cancelled. Hive stopped further deployment. Completed work is still here — nothing was deleted.",
            createdAt: Date.now(),
          };
          set((s) => ({
            projects: s.projects.map((p) =>
              p.id === project.id ? { ...p, messages: [...p.messages, msg], updatedAt: Date.now() } : p,
            ),
          }));
        }
        set({
          phase: "cancelled",
          status: {
            mc: "Acknowledged cancellation",
            hrc: "Stopped further swarm deployment",
            ro: "Standing by",
          },
          agentTotal: 0,
          fileLocks: [],
          previewRunning: false,
          audits: [audit("MC", "Run cancelled by human"), ...get().audits].slice(0, 80),
        });
      },

      freeze: () => {
        abortRun?.abort();
        abortRun = null;
        lockMap.clear();
        set({
          frozen: true,
          phase: "frozen",
          status: {
            mc: "Emergency freeze",
            hrc: "Population frozen",
            ro: "GitHub operations frozen",
          },
          agentTotal: 0,
          fileLocks: [],
          audits: [audit("HRC", "Emergency freeze engaged"), ...get().audits].slice(0, 80),
        });
      },

      addMemory: (entry) => {
        const item: MemoryEntry = {
          id: nid("mem"),
          createdAt: Date.now(),
          editable: true,
          ...entry,
        };
        set((s) => ({
          memories: [item, ...s.memories].slice(0, 80),
          audits: [audit("RO", `Memory: ${item.title}`), ...s.audits].slice(0, 80),
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
        try {
          const res = await getAiStatus();
          set({ aiAvailable: res.available });
        } catch {
          set({ aiAvailable: false });
        }
      },

      connectGithub: async (username, pat) => {
        set({ githubBusy: true, githubError: null });
        try {
          const res = await connectGithub({
            data: { workspaceId: get().workspaceId, username, pat },
          });
          if (!res.ok) {
            set({ githubBusy: false, githubError: res.error, githubConnected: false });
            return false;
          }
          set({
            githubBusy: false,
            githubConnected: true,
            githubUsername: res.username,
            githubError: null,
            audits: [audit("RO", `GitHub connected as ${res.username}`), ...get().audits].slice(0, 80),
          });
          await get().refreshRepos();
          return true;
        } catch {
          set({
            githubBusy: false,
            githubError: "GitHub authentication failed. Try again from Settings.",
          });
          return false;
        }
      },

      disconnectGithub: async () => {
        await disconnectGithub({ data: { workspaceId: get().workspaceId } });
        set({
          githubConnected: false,
          githubUsername: "",
          githubRepo: null,
          githubRepos: [],
          githubError: null,
        });
      },

      refreshRepos: async () => {
        if (!get().githubConnected) return;
        set({ githubBusy: true });
        const res = await listGithubRepos({ data: { workspaceId: get().workspaceId } });
        if (!res.ok) {
          set({ githubBusy: false, githubError: res.error });
          return;
        }
        set({ githubBusy: false, githubRepos: res.repos, githubError: null });
      },

      createRepo: async (name) => {
        set({ githubBusy: true, githubError: null });
        const res = await createGithubRepo({
          data: { workspaceId: get().workspaceId, name, isPrivate: true },
        });
        if (!res.ok) {
          set({ githubBusy: false, githubError: res.error });
          return null;
        }
        set({ githubBusy: false, githubRepo: res.fullName });
        await get().refreshRepos();
        return res.fullName;
      },

      setGithubRepo: (fullName) => {
        set({ githubRepo: fullName });
        const project = get().activeProject();
        if (project) {
          set((s) => ({
            projects: s.projects.map((p) =>
              p.id === project.id ? { ...p, repoFullName: fullName } : p,
            ),
          }));
        }
      },

      pushApprovedWork: async () => {
        const project = get().activeProject();
        const repo = project?.repoFullName || get().githubRepo;
        if (!project?.artifact || !repo) {
          return { ok: false, error: "Connect a repository and finish work before pushing." };
        }
        set({ pushBusy: true });
        const files =
          project.artifact.files.length > 0
            ? project.artifact.files
            : [{ path: "index.html", content: project.artifact.html }];
        const res = await pushToGithub({
          data: {
            workspaceId: get().workspaceId,
            repoFullName: repo,
            files,
            message: `Hive: ${project.artifact.title}`,
          },
        });
        set({ pushBusy: false });
        if (!res.ok) return { ok: false, error: res.error };
        set((s) => ({
          audits: [audit("RO", `Pushed approved work to ${repo}`), ...s.audits].slice(0, 80),
        }));
        return { ok: true };
      },
    }),
    {
      name: STORAGE_KEY,
      storage: memoryStorage,
      partialize: (s) =>
        ({
          workspaceId: s.workspaceId,
          sessionName: s.sessionName,
          leftCollapsed: s.leftCollapsed,
          rightCollapsed: s.rightCollapsed,
          projects: s.projects,
          activeProjectId: s.activeProjectId,
          memories: s.memories,
          githubUsername: s.githubUsername,
          githubRepo: s.githubRepo,
        }) as unknown as HiveState,
      onRehydrateStorage: () => () => {
        useHiveStore.setState({
          hydrated: true,
          phase: "idle",
          status: idleStatus,
          lieutenants: [],
          splitters: [],
          agentTotal: 0,
          frozen: false,
          previewRunning: false,
          githubConnected: false,
        });
      },
    },
  ),
);
