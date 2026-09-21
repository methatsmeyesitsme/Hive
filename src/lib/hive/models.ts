/**
 * Hive model assignment.
 *
 * Architecture:
 *   - MC, HRC, RO  → dedicated logical core roles (not implemented as separate physical model copies)
 *   - Splitters    → 1–5 logical Splitter contexts managed by HRC
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

/** The three dedicated core roles. */
export const CORE_MODELS: Record<"MC" | "HRC" | "RO", ModelSpec> = {
  MC: {
    role: "MC",
    sizeClass: "1.5B",
    modelId: "onnx-community/Qwen2.5-0.5B-Instruct",
    fallbackId: "HuggingFaceTB/SmolLM2-360M-Instruct",
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
  sizeClass: "1.5B",
  modelId: "onnx-community/Qwen2.5-0.5B-Instruct",
  fallbackId: "HuggingFaceTB/SmolLM2-360M-Instruct",
  canSplit: true,
};

export function coreModel(role: "MC" | "HRC" | "RO"): ModelSpec {
  return CORE_MODELS[role];
}

export function splitterModel(): ModelSpec {
  return SPLITTER_MODEL;
}
