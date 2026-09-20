/**
 * On-device model runner for Hive (browser only).
 *
 * Runs onnx-community/Qwen2.5-0.5B-Instruct with Transformers.js. No API key,
 * no server round-trip: the weights are downloaded once by the browser, cached,
 * and executed on WebGPU when available (falling back to WASM/CPU).
 *
 * Transformers.js is loaded from a pinned CDN URL at runtime instead of being
 * bundled. Its Node build pulls in native onnxruntime-node binaries, which the
 * SSR/Vercel build cannot bundle; the CDN import keeps this module out of that
 * graph entirely. It is only ever executed in the browser.
 */

export const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

export type LocalChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LocalDevice = "webgpu" | "wasm";

type Generator = (
  messages: LocalChatMessage[],
  options: Record<string, unknown>,
) => Promise<Array<{ generated_text: LocalChatMessage[] }>>;

type ProgressEvent = {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
};

type TransformersModule = {
  pipeline: (
    task: "text-generation",
    model: string,
    options: {
      device: LocalDevice;
      dtype: "q4";
      progress_callback?: (event: ProgressEvent) => void;
    },
  ) => Promise<Generator>;
};

export type ModelStatus = {
  stage: "idle" | "loading" | "ready" | "error";
  /** 0..1 download progress across all model files (approximate). */
  progress: number;
  device: LocalDevice | null;
  error: string | null;
};

let status: ModelStatus = { stage: "idle", progress: 0, device: null, error: null };
const listeners = new Set<(s: ModelStatus) => void>();

function setStatus(patch: Partial<ModelStatus>) {
  status = { ...status, ...patch };
  for (const fn of listeners) fn(status);
}

export function getModelStatus(): ModelStatus {
  return status;
}

/** Subscribe to load progress. Returns an unsubscribe function. */
export function subscribeModelStatus(fn: (s: ModelStatus) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function localModelSupported(): boolean {
  return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
}

async function candidateDevices(): Promise<LocalDevice[]> {
  const gpu = (navigator as unknown as {
    gpu?: { requestAdapter: () => Promise<unknown | null> };
  }).gpu;
  if (gpu) {
    try {
      if (await gpu.requestAdapter()) return ["webgpu", "wasm"];
    } catch {
      // fall through to WASM
    }
  }
  return ["wasm"];
}

let loading: Promise<{ generator: Generator; device: LocalDevice }> | null = null;

function loadModel(): Promise<{ generator: Generator; device: LocalDevice }> {
  if (loading) return loading;

  loading = (async () => {
    setStatus({ stage: "loading", progress: 0, error: null });

    const files = new Map<string, { loaded: number; total: number }>();
    const onProgress = (e: ProgressEvent) => {
      if (!e.file || typeof e.total !== "number" || typeof e.loaded !== "number") return;
      files.set(e.file, { loaded: e.loaded, total: e.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      if (total > 0) setStatus({ progress: Math.min(1, loaded / total) });
    };

    const mod = (await import(/* @vite-ignore */ TRANSFORMERS_URL)) as TransformersModule;

    let lastError: unknown = null;
    for (const device of await candidateDevices()) {
      try {
        const generator = await mod.pipeline("text-generation", MODEL_ID, {
          device,
          dtype: "q4",
          progress_callback: onProgress,
        });
        setStatus({ stage: "ready", progress: 1, device });
        return { generator, device };
      } catch (err) {
        lastError = err;
        files.clear();
      }
    }
    throw lastError ?? new Error("No usable compute backend");
  })().catch((err) => {
    loading = null; // allow a retry on the next request
    setStatus({
      stage: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });

  return loading;
}

/** Start downloading/initialising the model without generating anything. */
export function preloadLocalModel(): Promise<unknown> {
  return loadModel();
}

// One generation at a time: a single ONNX session cannot be run concurrently.
let queue: Promise<unknown> = Promise.resolve();

export type GenerateOptions = {
  maxNewTokens: number;
  temperature?: number;
};

export function generateChat(
  messages: LocalChatMessage[],
  options: GenerateOptions,
): Promise<{ text: string; device: LocalDevice }> {
  const run = async () => {
    const { generator, device } = await loadModel();
    const out = await generator(messages, {
      max_new_tokens: options.maxNewTokens,
      do_sample: true,
      temperature: options.temperature ?? 0.5,
      top_p: 0.9,
      repetition_penalty: 1.05,
    });
    const text = out[0]?.generated_text?.at(-1)?.content ?? "";
    return { text, device };
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
