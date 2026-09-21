/**
 * On-device model runner for Hive (browser only).
 *
 * Runs Qwen2.5-0.5B-Instruct with Transformers.js. No API key, no server
 * round-trip: the weights are downloaded once by the browser, cached, and
 * executed on WebGPU when available (falling back to WASM/CPU).
 *
 * Qwen ships in several file sizes: q4f16 ~480 MB (WebGPU only), q8 ~510 MB and
 * q4 ~790 MB. Many phones and low-memory browsers cannot allocate the 790 MB file
 * ("Can't create a session. failed to allocate a buffer of size 786156820"), so
 * Hive tries the smaller files first and steps down through every Qwen variant
 * before it gives up.
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

/** Approximate size in MB of each Qwen2.5-0.5B model file. Bigger files need more memory to open. */
export const APPROX_FILE_MB: Record<LocalDtype, number> = { q4f16: 480, q8: 512, q4: 786 };

type Generator = ((
  messages: LocalChatMessage[],
  options: Record<string, unknown>,
) => Promise<Array<{ generated_text: LocalChatMessage[] }>>) & { tokenizer?: unknown; dispose?: () => Promise<void> | void };

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
  /** Which model file is loaded (q4f16 / q8 / q4), once ready. */
  dtype: LocalDtype | null;
  error: string | null;
};

let status: ModelStatus = {
  stage: "idle",
  progress: 0,
  device: null,
  model: null,
  dtype: null,
  error: null,
};
const listeners = new Set<(s: ModelStatus) => void>();

function setStatus(patch: Partial<ModelStatus>) {
  status = { ...status, ...patch };
  for (const fn of listeners) fn(status);
}

export function getModelStatus(): ModelStatus {
  return status;
}

/** One line about what the model is doing while it loads, or null when it is not loading. */
export function describeModelStatus(s: ModelStatus): string | null {
  if (s.stage !== "loading") return null;
  const name = s.model ?? "on-device model";
  if (s.progress >= 0.995) return `Starting ${name}…`;
  if (s.progress > 0) return `Downloading ${name}… ${Math.round(s.progress * 100)}%`;
  return `Loading ${name}…`;
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
 * Which model/backend/model-file combinations to try, in order. Qwen only: every
 * entry is the same model in a different file size or on a different backend.
 *
 *   WebGPU with fp16 shaders: q4f16 (smallest, fastest) -> q4 -> CPU q8 -> CPU q4
 *   WebGPU without fp16:      q4 -> CPU q8 -> CPU q4
 *   CPU only (iOS, no WebGPU): q8 -> q4
 *
 * The 8-bit file (512 MB) comes before the 4-bit file (786 MB) on the CPU because
 * browsers often cannot allocate the bigger one. Overrides on the page address:
 * `?device=wasm`, `?dtype=q4|q4f16|q8`, `?model=qwen|360m|135m`.
 */
export function pickBackends(
  search: string,
  hasWebGpu: boolean,
  ios: boolean,
  hasShaderF16 = false,
): LocalBackend[] {
  const params = new URLSearchParams(search);
  const model = MODEL_LADDER[effectiveRung(search)];
  const isQwen = model === MODEL_LADDER[0];
  const forcedDtype = params.get("dtype");
  const dtype: LocalDtype | null =
    forcedDtype === "q4" || forcedDtype === "q4f16" || forcedDtype === "q8" ? forcedDtype : null;

  // The CPU never gets the fp16 file.
  const wasmDtypes: LocalDtype[] = dtype
    ? [dtype === "q4f16" ? "q4" : dtype]
    : isQwen
      ? ["q8", "q4"]
      : ["q4"];
  const wasm: LocalBackend[] = wasmDtypes.map((d) => ({ device: "wasm", dtype: d, model }));

  const wasmOnly = params.get("device") === "wasm" || ios || !hasWebGpu;
  if (wasmOnly) return wasm;

  const gpuDtypes: LocalDtype[] = dtype ? [dtype] : isQwen && hasShaderF16 ? ["q4f16", "q4"] : ["q4"];
  return [...gpuDtypes.map((d): LocalBackend => ({ device: "webgpu", dtype: d, model })), ...wasm];
}

function detectIOS(): boolean {
  return isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
}

/**
 * Memory-saving load settings (no graph optimisation, no memory arena) reduce
 * WebGPU buffer pressure and OrtRun / buffer_manager crashes after a few runs.
 * Default on for iOS and for WebGPU sessions; `?lowmem=on|off` overrides.
 */
export function useLowMemory(search: string, ios: boolean): boolean {
  const forced = new URLSearchParams(search).get("lowmem");
  if (forced === "on") return true;
  if (forced === "off") return false;
  // Prefer stability over a small speed gain: WebGPU sessions fail more often
  // without these options after repeated generations.
  return true;
}

export function isIOS(ua: string, platform: string, touchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && touchPoints > 1);
}

/**
 * Set once WebGPU has failed on this page; the CPU backend is used from then on.
 * Falling back after a single OrtRun / buffer_manager failure is more reliable:
 * WebGPU sessions can go bad after a few generations and keep failing, and the
 * user sees the error before the second retry finishes.
 */
let avoidWebGpu = false;

/** How many consecutive WebGPU runtime failures before we permanently prefer WASM. */
const WEBGPU_FAIL_LIMIT = 1;

async function candidateBackends(): Promise<LocalBackend[]> {
  let hasWebGpu = false;
  let hasShaderF16 = false;
  const gpu = (navigator as unknown as {
    gpu?: {
      requestAdapter: () => Promise<{ features?: { has?: (name: string) => boolean } } | null>;
    };
  }).gpu;
  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter();
      hasWebGpu = Boolean(adapter);
      // fp16 shaders let WebGPU use the smaller, faster q4f16 file.
      hasShaderF16 = Boolean(adapter?.features?.has?.("shader-f16"));
    } catch {
      hasWebGpu = false;
    }
  }
  return pickBackends(
    typeof location === "undefined" ? "" : location.search,
    hasWebGpu && !avoidWebGpu,
    detectIOS(),
    hasShaderF16,
  );
}

/**
 * Model-file combinations that already failed on this page, so a retry does not
 * download and try the same doomed file again. Cleared when everything has failed.
 */
const failedBackends = new Set<string>();

/** How many CPU threads the WASM runtime may use. More than one needs a cross-origin-isolated page. */
export function wasmThreads(isolated: boolean, cores: number, search = ""): number {
  const forced = Number(new URLSearchParams(search).get("threads"));
  if (isolated && Number.isFinite(forced) && forced >= 1 && forced <= 8) return Math.floor(forced);
  if (!isolated) return 1;
  return Math.max(1, Math.min(4, Math.floor((cores || 2) / 2)));
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

function backendLabel({ device, dtype, model }: LocalBackend): string {
  return `${model.name} ${device}/${dtype}`;
}

/** Generations run on the current session; a long-used WebGPU session is recycled between projects. */
let runsSinceLoad = 0;
const WORN_AFTER_RUNS = 4;

type Loaded = { generator: Generator; device: LocalDevice; label: string; mod: TransformersModule };
let loading: Promise<Loaded> | null = null;

function loadModel(): Promise<Loaded> {
  if (loading) return loading;

  loading = (async () => {
    if (resetInFlight) await resetInFlight;
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

    // Page-address switches:
    //   ?cache=off   skip the browser cache copy of the model files
    //   ?lowmem=on|off  force the memory-saving load settings on or off
    //                   (default: on — reduces WebGPU OrtRun / buffer_manager crashes)
    const flags = new URLSearchParams(typeof location === "undefined" ? "" : location.search);
    if (mod.env) {
      if (flags.get("cache") === "off") mod.env.useBrowserCache = false;
      const wasm = mod.env.backends?.onnx?.wasm;
      if (wasm) {
        const isolated = typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
        const cores = typeof navigator === "undefined" ? 2 : (navigator.hardwareConcurrency ?? 2);
        wasm.numThreads = wasmThreads(isolated, cores, flags.toString());
      }
    }
    const sessionOptions = useLowMemory(flags.toString(), detectIOS())
      ? { graphOptimizationLevel: "disabled", enableCpuMemArena: false, enableMemPattern: false }
      : undefined;

    let lastError: unknown = null;
    let ladder = await candidateBackends();
    const untried = ladder.filter((b) => !failedBackends.has(backendLabel(b)));
    if (untried.length > 0) ladder = untried;
    else failedBackends.clear(); // everything failed before: memory may have been freed, try again

    // Sizes (MB) of files that ran out of memory, per backend: anything at least that big will too.
    const tooBig: { device: LocalDevice; mb: number }[] = [];
    for (const backend of ladder) {
      const { device, dtype, model } = backend;
      const label = backendLabel(backend);
      if (tooBig.some((t) => t.device === device && APPROX_FILE_MB[dtype] >= t.mb)) {
        failedBackends.add(label); // cannot fit either; a later retry starts over from the smallest file
        continue;
      }
      if (device === "webgpu" && avoidWebGpu) continue; // the GPU session already died on this page
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
        runsSinceLoad = 0;
        setStatus({ stage: "ready", progress: 1, device, dtype });
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
        failedBackends.add(label);
        if (isMemoryFailure(err)) tooBig.push({ device, mb: APPROX_FILE_MB[dtype] });
        // A WebGPU abort/OrtRun during load means the GPU session is already dead —
        // skip further WebGPU attempts in this page lifetime.
        if (device === "webgpu" && isRuntimeFailure(err)) avoidWebGpu = true;
        // Let the browser free what the failed attempt held before the next one starts.
        await new Promise((resolve) => setTimeout(resolve, 50));
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
  /** A fixed limit, or one chosen once the backend (webgpu / wasm) is known. */
  maxNewTokens: number | ((device: LocalDevice) => number);
  /** Called for every generated token with the running count. */
  onToken?: (tokens: number) => void;
  temperature?: number;
  /** Shown in the breadcrumb and timing report, e.g. "the brief" or "the page". */
  label?: string;
  /** End generation as soon as this returns true for the text produced so far. */
  stopWhen?: (textSoFar: string) => boolean;
  /** Cancels the generation: the model stops within a token and the call rejects with GenerationCancelled. */
  signal?: AbortSignal;
};

/** Errors from the runtime itself (a lost GPU device, a failed buffer download), not from the request. */
export function isAbortError(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "AbortError") {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  return /operation was aborted|AbortError/i.test(message);
}

/** The browser could not find enough memory (opening a model file, or growing the WASM heap). */
export function isMemoryFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /failed to allocate|allocation failed|array buffer allocation|invalid array length|out of memory|cannot enlarge memory/i.test(
    message,
  );
}

export function isRuntimeFailure(err: unknown): boolean {
  if (isAbortError(err)) return true;
  if (isMemoryFailure(err)) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /OrtRun|onnxruntime|buffer_manager|webgpu|GPUDevice|device (was )?lost|Aborted\(/i.test(message);
}

/** Thrown when the person cancels a run; never treated as a runtime failure. */
export class GenerationCancelled extends Error {
  constructor() {
    super("Generation cancelled");
    this.name = "GenerationCancelled";
  }
}

/** In-flight dispose so a new load never overlaps a teardown (that abort is "The operation was aborted"). */
let resetInFlight: Promise<void> | null = null;

/** Throw away the current session so the next call loads a fresh one. */
async function resetModel(): Promise<void> {
  if (resetInFlight) return resetInFlight;
  resetInFlight = (async () => {
    const old = loading;
    loading = null;
    setStatus({ stage: "idle", progress: 0, error: null });
    try {
      const loaded = await old;
      await Promise.race([
        Promise.resolve(loaded?.generator.dispose?.()),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } catch {
      // the old session may already be unusable
    }
    // Give WebGPU a beat to release buffers before the next session starts.
    await new Promise((resolve) => setTimeout(resolve, 50));
  })();
  try {
    await resetInFlight;
  } finally {
    resetInFlight = null;
  }
}

/**
 * Release the on-device model (dispose the ONNX session and clear the load
 * promise). Call when switching or deleting projects so WebGPU memory is
 * returned to the browser and the next run starts clean.
 */
export async function releaseModel(): Promise<void> {
  await resetModel();
}

/**
 * Like `releaseModel`, but only once the session has run a few generations. A fresh
 * session stays loaded, so switching projects does not throw away a model that took
 * seconds to open; a well-used WebGPU session is recycled before it starts to fail.
 */
export async function releaseModelIfWorn(): Promise<boolean> {
  if (!loading || runsSinceLoad < WORN_AFTER_RUNS) return false;
  await resetModel();
  return true;
}

let preloadStarted = false;

/**
 * Start opening the model in the background, once per page, so the first request
 * does not also pay for the download and start-up. `?preload=off` disables it.
 * A failure here is silent: the next request retries with the fallback ladder.
 */
export function startModelPreload(): void {
  if (preloadStarted || !localModelSupported()) return;
  if (new URLSearchParams(location.search).get("preload") === "off") return;
  preloadStarted = true;
  void loadModel().catch(() => undefined);
}

export function generateChat(
  messages: LocalChatMessage[],
  options: GenerateOptions,
): Promise<{ text: string; device: LocalDevice }> {
  const generateOnce = async ({ generator, device, label, mod }: Loaded) => {
    if (options.signal?.aborted) throw new GenerationCancelled();
    setBreadcrumb(`writing ${options.label ?? "a reply"}`, label);

    const maxNew =
      typeof options.maxNewTokens === "function" ? options.maxNewTokens(device) : options.maxNewTokens;
    const callOptions: Record<string, unknown> = {
      max_new_tokens: maxNew,
      do_sample: true,
      temperature: options.temperature ?? 0.5,
      top_p: 0.9,
      repetition_penalty: 1.05,
    };

    const t0 = perf.now();
    let tFirst: number | null = null;
    let tokens = 0;
    let stoppedEarly = false;
    let soFar = "";
    let onCancel: (() => void) | null = null;
    if (mod.TextStreamer && mod.InterruptableStoppingCriteria && generator.tokenizer) {
      const stopper = new mod.InterruptableStoppingCriteria();
      callOptions.stopping_criteria = stopper;
      if (options.signal) {
        onCancel = () => stopper.interrupt();
        options.signal.addEventListener("abort", onCancel, { once: true });
      }
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
          options.onToken?.(tokens);
        },
      });
    }

    const finish = (text: string) => {
      const t1 = perf.now();
      writeCrumb(null);
      runsSinceLoad += 1;
      const decodeMs = tFirst === null ? null : t1 - tFirst;
      perf.addGen({
        label: options.label ?? "reply",
        totalMs: t1 - t0,
        ttftMs: tFirst === null ? null : tFirst - t0,
        decodeMs,
        tokens,
        tokPerSec: decodeMs !== null && decodeMs > 0 && tokens > 1 ? (tokens - 1) / (decodeMs / 1000) : null,
        maxNew,
        promptChars: messages.reduce((n, m) => n + m.content.length, 0),
        stoppedEarly,
      });
      return { text, device };
    };

    try {
      const out = await generator(messages, callOptions);
      // Cancelled mid-way: the stopper ended the run early, so the text is unfinished. Drop it.
      if (options.signal?.aborted) throw new GenerationCancelled();
      return finish(out[0]?.generated_text?.at(-1)?.content ?? soFar);
    } catch (err) {
      // A cancel can surface as AbortError on WebGPU. It is not a GPU failure, so do not recover from it.
      if (options.signal?.aborted) throw new GenerationCancelled();
      // Interrupting once </html> is in the stream often surfaces as AbortError on WebGPU.
      // The page is already complete — return it instead of failing the run.
      if (isAbortError(err) && soFar && (stoppedEarly || options.stopWhen?.(soFar))) {
        return finish(soFar);
      }
      throw err;
    } finally {
      if (onCancel) options.signal?.removeEventListener("abort", onCancel);
    }
  };

  const run = async () => {
    // The model is loaded once per page load and reused by every call. If the runtime
    // itself fails (e.g. OrtRun / buffer_manager after a few runs), restart the session
    // and retry; after WEBGPU_FAIL_LIMIT WebGPU failures fall back to the CPU backend.
    let failures = 0;
    for (;;) {
      const loaded = await loadModel();
      try {
        return await generateOnce(loaded);
      } catch (err) {
        if (failures >= WEBGPU_FAIL_LIMIT || !isRuntimeFailure(err)) throw err;
        failures += 1;
        perf.recovery();
        if (loaded.device === "webgpu") avoidWebGpu = true;
        await resetModel();
      }
    }
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
