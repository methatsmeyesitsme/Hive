/** Hard resource limits — enforced in software, never by prompts alone. */

/** Maximum dedicated top-level models that never split. */
export const MAX_CORE_MODELS = 3; // MC, HRC, RO

/** Maximum Splitter instances HRC may activate. */
export const MAX_SPLITTERS = 5;

/** Logical Lieutenants still exist inside Splitters (for ownership & status). */
export const MAX_LI = 26;
export const MAX_AGENTS_PER_LI = 25;

/** Theoretical max logical agents across all Splitters (not separate model instances). */
export const MAX_AGENTS_TOTAL = 650;

export const LI_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export const STORAGE_KEY = "hive-workspace-v1";

/** Model size classes used by Hive. */
export const MODEL_CLASS = {
  core: "1.5B",
  splitter: "7B",
} as const;
