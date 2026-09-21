/**
 * On-device model runner for Hive (browser only).
 *
 * Runs Qwen2.5-0.5B-Instruct with Transformers.js. No API key, no server
 * round-trip: the weights are downloaded once by the browser, cached, and
 * executed on WebGPU when available (falling back to WASM/CPU).
 *
 * Transformers.js is loaded from a pinned CDN URL at runtime instead of being
 * bundled. Its Node build pulls in native onnxruntime-node binaries, which the
 * SSR/Vercel build cannot bundle; the CDN import keeps this module out of that
 * graph entirely. It is only ever executed in the browser.
 */

import { perf } from "./perf.ts";

export type ModelSpec = { id: string; name: string };

/** Qwen is the model. The smaller ones are only used when asked for with `?model=`. */
export const MODEL_LADDER: ModelSpec[] = [
  { id: "onnx-community/Qwen2.5-0.5B-Instruct", name: "Qwen2.5-0.5B" },
  { id: "HuggingFaceTB/SmolLM2-360M-Instruct", name: "SmolLM2-360M" },
  { id: "HuggingFaceTB/SmolLM2-135M-Instruct", name: "SmolLM2-135M" },
];
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

export type LocalChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LocalDevice = "webgpu" | "wasm";
export type LocalDtype = "q4" | "q4f16" | "q8";
export type LocalBackend = { device: LocalDevice; dtype: LocalDtype; model: ModelSpec };

// CONTENT_CONTINUES - see full file on disk
