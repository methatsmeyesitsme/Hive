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
      session_options?: Record<string, unknown>;
    },
  ) => Promise<Generator>;
  env?: {
    useBrowserCache?: boolean;
    backends?: { onnx?: { wasm?: { numThreads?: number } } };
  };
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

/**
 * Which compute backends to try, in order. Adding `?device=wasm` to the page
 * address forces the CPU (WASM) backend, which is slower but avoids WebGPU
 * problems on some phones.
 */
export function pickDevices(search: string, hasWebGpu: boolean): LocalDevice[] {
  if (new URLSearchParams(search).get("device") === "wasm") return ["wasm"];
  return hasWebGpu ? ["webgpu", "wasm"] : ["wasm"];
}

async function candidateDevices(): Promise<LocalDevice[]> {
  let hasWebGpu = false;
  const gpu = (navigator as unknown as {
    gpu?: { requestAdapter: () => Promise<unknown | null> };
  }).gpu;
  if (gpu) {
    try {
      hasWebGpu = Boolean(await gpu.requestAdapter());
    } catch {
      hasWebGpu = false;
    }
  }
  return pickDevices(typeof location === "undefined" ? "" : location.search, hasWebGpu);
}

/** Breadcrumb text for a download fraction (0..1), bucketed so it is written rarely. */
export function progressLabel(fraction: number): string {
  if (fraction >= 0.995) return "starting the model (download finished)";
  const bucket = Math.min(90, Math.max(0, Math.floor(fraction * 10) * 10));
  return `downloading the model (${bucket}%)`;
}

// Breadcrumb: what the model was doing, so a page that reloads mid-run (for
// example because the phone ran out of memory) can say where it stopped.
const CRUMB_KEY = "hive-mc-breadcrumb";

export type Breadcrumb = { stage: string; device: string | null; at: number; clean?: boolean };

function writeCrumb(crumb: Breadcrumb | null) {
  try {
    if (crumb) localStorage.setItem(CRUMB_KEY, JSON.stringify(crumb));
    else localStorage.removeItem(CRUMB_KEY);
  } catch {
    // storage unavailable: diagnostics are best-effort
  }
}

function setBreadcrumb(stage: string, device: string | null) {
  writeCrumb({ stage, device, at: Date.now() });
}

/** Call when the page is being closed or navigated normally. */
export function markBreadcrumbClean() {
  try {
    const raw = localStorage.getItem(CRUMB_KEY);
    if (!raw) return;
    const crumb = JSON.parse(raw) as Breadcrumb;
    crumb.clean = true;
    localStorage.setItem(CRUMB_KEY, JSON.stringify(crumb));
  } catch {
    // ignore
  }
}

/** The breadcrumb left by the previous page load (removed once read). */
export function takeLastBreadcrumb(): Breadcrumb | null {
  try {
    const raw = localStorage.getItem(CRUMB_KEY);
    if (!raw) return null;
    localStorage.removeItem(CRUMB_KEY);
    return JSON.parse(raw) as Breadcrumb;
  } catch {
    return null;
  }
}

let loading: Promise<{ generator: Generator; device: LocalDevice }> | null = null;

function loadModel(): Promise<{ generator: Generator; device: LocalDevice }> {
  if (loading) return loading;

  loading = (async () => {
    setStatus({ stage: "loading", progress: 0, error: null });

    const files = new Map<string, { loaded: number; total: number }>();
    let attempt: LocalDevice = "wasm";
    let lastLabel = "";
    const onProgress = (e: ProgressEvent) => {
      if (!e.file || typeof e.total !== "number" || typeof e.loaded !== "number") return;
      files.set(e.file, { loaded: e.loaded, total: e.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      if (total > 0) {
        const progress = Math.min(1, loaded / total);
        setStatus({ progress });
        const label = progressLabel(progress);
        if (label !== lastLabel) {
          lastLabel = label;
          setBreadcrumb(label, attempt);
        }
      }
    };

    const mod = (await import(/* @vite-ignore */ TRANSFORMERS_URL)) as TransformersModule;

    // Memory-saving defaults for phones. Escape hatches on the page address:
    //   ?cache=off   skip the browser cache copy of the model files
    //   ?lowmem=off  use the runtime's normal (faster, hungrier) load settings
    const flags = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
    if (mod.env) {
      if (flags.get("cache") === "off") mod.env.useBrowserCache = false;
      const wasm = mod.env.backends?.onnx?.wasm;
      if (wasm) wasm.numThreads = 1;
    }
    const sessionOptions =
      flags.get("lowmem") === "off"
        ? undefined
        : { graphOptimizationLevel: "disabled", enableCpuMemArena: false, enableMemPattern: false };

    let lastError: unknown = null;
    for (const device of await candidateDevices()) {
      try {
        attempt = device;
        lastLabel = "";
        setBreadcrumb("loading the model", device);
        const generator = await mod.pipeline("text-generation", MODEL_ID, {
          device,
          dtype: "q4",
          progress_callback: onProgress,
          session_options: sessionOptions,
        });
        setStatus({ stage: "ready", progress: 1, device });
        writeCrumb(null);
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
  /** Shown in the breadcrumb, e.g. "the brief" or "the page". */
  label?: string;
};

export function generateChat(
  messages: LocalChatMessage[],
  options: GenerateOptions,
): Promise<{ text: string; device: LocalDevice }> {
  const run = async () => {
    const { generator, device } = await loadModel();
    setBreadcrumb(`writing ${options.label ?? "a reply"}`, device);
    const out = await generator(messages, {
      max_new_tokens: options.maxNewTokens,
      do_sample: true,
      temperature: options.temperature ?? 0.5,
      top_p: 0.9,
      repetition_penalty: 1.05,
    });
    const text = out[0]?.generated_text?.at(-1)?.content ?? "";
    writeCrumb(null);
    return { text, device };
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
