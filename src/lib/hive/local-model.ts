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

type Generator = ((
  messages: LocalChatMessage[],
  options: Record<string, unknown>,
) => Promise<Array<{ generated_text: LocalChatMessage[] }>>) & { tokenizer?: unknown };

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
      dtype: LocalDtype;
      progress_callback?: (event: ProgressEvent) => void;
      session_options?: Record<string, unknown>;
    },
  ) => Promise<Generator>;
  /** Streams tokens as they are generated (lets us time prefill vs decode). */
  TextStreamer?: new (
    tokenizer: unknown,
    options: {
      skip_prompt?: boolean;
      skip_special_tokens?: boolean;
      callback_function?: (text: string) => void;
      token_callback_function?: (tokens: bigint[]) => void;
    },
  ) => unknown;
  /** Lets us end generation early, e.g. right after </html>. */
  InterruptableStoppingCriteria?: new () => { interrupt: () => void };
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
  /** Display name of the model being loaded or running. */
  model: string | null;
  error: string | null;
};

let status: ModelStatus = { stage: "idle", progress: 0, device: null, model: null, error: null };
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

const MODEL_ALIASES: Record<string, number> = { qwen: 0, "360m": 1, "135m": 2 };

/**
 * Which model to use: always Qwen2.5-0.5B, on every device. A smaller model is
 * used only when the page address says so: `?model=360m` or `?model=135m`.
 */
export function effectiveRung(search: string): number {
  const forced = new URLSearchParams(search).get("model");
  return forced && forced in MODEL_ALIASES ? MODEL_ALIASES[forced] : 0;
}

/**
 * Which model/backend/model-file combinations to try, in order.
 *
 * iOS uses the CPU (WASM) backend, with the smaller 8-bit Qwen file. On other
 * devices WebGPU comes first with a WASM fallback. Overrides on the page address:
 * `?device=wasm`, `?dtype=q4|q4f16|q8`, `?model=qwen|360m|135m`.
 */
export function pickBackends(search: string, hasWebGpu: boolean, ios: boolean): LocalBackend[] {
  const params = new URLSearchParams(search);
  const model = MODEL_LADDER[effectiveRung(search)];
  const forcedDtype = params.get("dtype");
  const dtype: LocalDtype | null =
    forcedDtype === "q4" || forcedDtype === "q4f16" || forcedDtype === "q8" ? forcedDtype : null;

  const wasmOnly = params.get("device") === "wasm" || ios || !hasWebGpu;
  // Qwen on an iPhone uses the smaller 8-bit file; everything else uses 4-bit.
  const wasmDefault: LocalDtype = ios && model === MODEL_LADDER[0] ? "q8" : "q4";
  if (wasmOnly) return [{ device: "wasm", dtype: dtype ?? wasmDefault, model }];
  return [
    { device: "webgpu", dtype: dtype ?? "q4", model },
    { device: "wasm", dtype: dtype === "q4f16" ? "q4" : (dtype ?? "q4"), model },
  ];
}

function detectIOS(): boolean {
  return isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
}

export function isIOS(ua: string, platform: string, touchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && touchPoints > 1);
}

async function candidateBackends(): Promise<LocalBackend[]> {
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
  return pickBackends(
    typeof location === "undefined" ? "" : location.search,
    hasWebGpu,
    detectIOS(),
  );
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

type Loaded = { generator: Generator; device: LocalDevice; label: string; mod: TransformersModule };
let loading: Promise<Loaded> | null = null;

function loadModel(): Promise<Loaded> {
  if (loading) return loading;

  loading = (async () => {
    const tStart = perf.now();
    let tDownloadDone: number | null = null;
    setStatus({ stage: "loading", progress: 0, error: null });

    const files = new Map<string, { loaded: number; total: number }>();
    let attempt = "wasm";
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
        if (progress >= 0.995 && tDownloadDone === null) tDownloadDone = perf.now();
        setStatus({ progress });
        const label = progressLabel(progress);
        if (label !== lastLabel) {
          lastLabel = label;
          setBreadcrumb(label, attempt);
        }
      }
    };

    // `__HIVE_TRANSFORMERS__` lets tests supply a fake library; unset in normal use.
    const injected = (globalThis as { __HIVE_TRANSFORMERS__?: TransformersModule })
      .__HIVE_TRANSFORMERS__;
    const mod =
      injected ?? ((await import(/* @vite-ignore */ TRANSFORMERS_URL)) as TransformersModule);

    const tLibrary = perf.now();

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
    for (const backend of await candidateBackends()) {
      const { device, dtype, model } = backend;
      const label = `${model.name} ${device}/${dtype}`;
      try {
        attempt = label;
        lastLabel = "";
        setStatus({ model: model.name, progress: 0 });
        setBreadcrumb("loading the model", label);
        tDownloadDone = null;
        const tPipeline = perf.now();
        const generator = await mod.pipeline("text-generation", model.id, {
          device,
          dtype,
          progress_callback: onProgress,
          session_options: sessionOptions,
        });
        const tReady = perf.now();
        setStatus({ stage: "ready", progress: 1, device });
        writeCrumb(null);
        perf.recordLoad({
          label,
          totalMs: tReady - tStart,
          libraryMs: tLibrary - tStart,
          downloadMs: tDownloadDone === null ? null : tDownloadDone - tPipeline,
          initMs: tDownloadDone === null ? null : tReady - tDownloadDone,
        });
        return { generator, device, label, mod };
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
  /** Shown in the breadcrumb and timing report, e.g. "the brief" or "the page". */
  label?: string;
  /** End generation as soon as this returns true for the text produced so far. */
  stopWhen?: (textSoFar: string) => boolean;
};

export function generateChat(
  messages: LocalChatMessage[],
  options: GenerateOptions,
): Promise<{ text: string; device: LocalDevice }> {
  const run = async () => {
    // The model is loaded once per page load and reused by every call.
    const { generator, device, label, mod } = await loadModel();
    setBreadcrumb(`writing ${options.label ?? "a reply"}`, label);

    const callOptions: Record<string, unknown> = {
      max_new_tokens: options.maxNewTokens,
      do_sample: true,
      temperature: options.temperature ?? 0.5,
      top_p: 0.9,
      repetition_penalty: 1.05,
    };

    const t0 = perf.now();
    let tFirst: number | null = null;
    let tokens = 0;
    let stoppedEarly = false;
    if (mod.TextStreamer && mod.InterruptableStoppingCriteria && generator.tokenizer) {
      const stopper = new mod.InterruptableStoppingCriteria();
      let soFar = "";
      callOptions.stopping_criteria = stopper;
      callOptions.streamer = new mod.TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (text) => {
          soFar += text;
          if (options.stopWhen && !stoppedEarly && options.stopWhen(soFar)) {
            stoppedEarly = true;
            stopper.interrupt();
          }
        },
        token_callback_function: () => {
          tokens += 1;
          if (tFirst === null) tFirst = perf.now();
        },
      });
    }

    const out = await generator(messages, callOptions);
    const t1 = perf.now();
    const text = out[0]?.generated_text?.at(-1)?.content ?? "";
    writeCrumb(null);

    const decodeMs = tFirst === null ? null : t1 - tFirst;
    perf.addGen({
      label: options.label ?? "reply",
      totalMs: t1 - t0,
      ttftMs: tFirst === null ? null : tFirst - t0,
      decodeMs,
      tokens,
      tokPerSec: decodeMs !== null && decodeMs > 0 && tokens > 1 ? (tokens - 1) / (decodeMs / 1000) : null,
      maxNew: options.maxNewTokens,
      promptChars: messages.reduce((n, m) => n + m.content.length, 0),
      stoppedEarly,
    });
    return { text, device };
  };
  // One generation at a time: a single ONNX session cannot run concurrently.
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

/**
 * If the model files are already in the browser cache, start loading the model
 * now so the start-up cost overlaps with the person typing their first message.
 * Never triggers a first-time download.
 */
export async function warmModelIfCached(): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    if (!(await caches.has("transformers-cache"))) return false;
    const cache = await caches.open("transformers-cache");
    if ((await cache.keys()).length === 0) return false;
    void loadModel().catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
