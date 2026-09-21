export type Role = "MC" | "HRC" | "RO" | "Splitter" | "Li" | "Agent";

export type RunPhase =
  | "idle"
  | "planning"
  | "dispatching"
  | "allocating"
  | "summoning"
  | "distributing"
  | "working"
  | "researching"
  | "reviewing"
  | "integrating"
  | "extracting"
  | "complete"
  | "cancelled"
  | "paused"
  | "frozen"
  | "error";

export type Attachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: "image" | "file";
  dataUrl?: string;
  textExcerpt?: string;
};

export type ArtifactFile = {
  path: string;
  content: string;
};

export type Artifact = {
  title: string;
  kind: "website" | "code";
  html: string;
  files: ArtifactFile[];
  ready: boolean;
};

export type ChatMessage = {
  id: string;
  role: "user" | "mc" | "system";
  content: string;
  createdAt: number;
  attachments?: Attachment[];
  hasArtifact?: boolean;
};

export type AgentState = {
  id: string;
  liLetter: string;
  assignment: string;
  status: "summoning" | "working" | "question" | "research" | "done" | "failed";
  ownedFiles: string[];
};

export type LieutenantState = {
  letter: string;
  objective: string;
  activity: string;
  agentAllowance: number;
  permissionGranted: boolean;
  agents: AgentState[];
  status: "summoning" | "working" | "reviewing" | "done" | "failed";
  /** Which logical Splitter context is role-playing this Li */
  splitterId?: string;
};

/** One logical Splitter context managed by HRC; browser inference currently uses one physical local model session. */
export type SplitterState = {
  id: string; // S1 … S5
  status: "summoning" | "working" | "reviewing" | "done" | "failed";
  activity: string;
  /** Logical LIs this Splitter is currently role-playing */
  lieutenants: LieutenantState[];
};

export type ExecStatus = {
  mc: string;
  hrc: string;
  ro: string;
};

export type MemoryEntry = {
  id: string;
  title: string;
  content: string;
  source: "web" | "work" | "project" | "research";
  createdAt: number;
  editable: true;
};

export type AuditEvent = {
  id: string;
  at: number;
  actor: string;
  action: string;
  /** When this activity finished. Missing while it is still running (its timer keeps growing). */
  endedAt?: number;
};

export type FileLock = {
  path: string;
  ownerId: string;
  ownerLabel: string;
};

export type Project = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  artifact: Artifact | null;
  repoFullName: string | null;
};

export type GithubRepo = {
  fullName: string;
  private: boolean;
  description: string | null;
};

export type HiveView = "workspace" | "settings" | "memory";

export type LieutenantPlan = {
  letter: string;
  objective: string;
  agentCount: number;
  files: string[];
};

export type ExecPlan = {
  objective: string;
  strategy: string;
  researchNeeded: boolean;
  researchTopic: string;
  lieutenants: LieutenantPlan[];
};

export type McTaskResult = {
  ok: true;
  mcMessage: string;
  plan: ExecPlan;
  artifact: Artifact | null;
  memory: { title: string; content: string; source: MemoryEntry["source"] }[];
} | {
  ok: false;
  error: string;
};
