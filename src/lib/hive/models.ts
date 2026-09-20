/**
 * Hive model assignment.
 *
 * Architecture:
 *   - MC, HRC, RO  → dedicated ~1.5B models (never split)
 *   - Splitters    → 1–5 × ~7B models managed by HRC
 *                    Each Splitter role-plays multiple LIs + Agents
 *                    via separate conversation contexts (context switching).
 *
 * These IDs are the open-weight Qwen checkpoints we target.
 * The actual inference runtime (local server, vLLM, llama.cpp, etc.)
 * is replaceable; this module only defines the logical assignment.
 */

export type ModelRole = "MC" | "HRC" | "RO" | "Splitter";

export type ModelSpec = {
  role: ModelRole;
  /** Human-readable size class */
  sizeClass: "1.5B" | "7B";
  /** Preferred Hugging Face / local model id */
  modelId: string;
  /** Fallback if the preferred model is unavailable */
  fallbackId: string;
  /** Does this model ever act as multiple logical workers? */
  canSplit: boolean;
};

/** The three dedicated core models. */
export const CORE_MODELS: Record<"MC" | "HRC" | "RO", ModelSpec> = {
  MC: {
    role: "MC",
    sizeClass: "1.5B",
    modelId: "Qwen/Qwen2.5-1.5B-Instruct",
    fallbackId: "Qwen/Qwen3-1.7B",
    canSplit: false,
  },
  HRC: {
    role: "HRC",
    sizeClass: "1.5B",
    modelId: "Qwen/Qwen2.5-1.5B-Instruct",
    fallbackId: "Qwen/Qwen3-1.7B",
    canSplit: false,
  },
  RO: {
    role: "RO",
    sizeClass: "1.5B",
    modelId: "Qwen/Qwen2.5-1.5B-Instruct",
    fallbackId: "Qwen/Qwen3-1.7B",
    canSplit: false,
  },
};

/** Template for every Splitter instance. */
export const SPLITTER_MODEL: ModelSpec = {
  role: "Splitter",
  sizeClass: "7B",
  modelId: "Qwen/Qwen2.5-7B-Instruct",
  fallbackId: "Qwen/Qwen3-8B",
  canSplit: true,
};

export function coreModel(role: "MC" | "HRC" | "RO"): ModelSpec {
  return CORE_MODELS[role];
}

export function splitterModel(): ModelSpec {
  return SPLITTER_MODEL;
}
