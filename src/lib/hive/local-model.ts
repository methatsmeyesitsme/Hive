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
  TextStreamer?: new (
    tokenizer: unknown,
    options: {
      skip_prompt?: boolean;
      skip_special_tokens?: boolean;
      callback_function?: (text: string) => void;
      token_callback_function?: (tokens: bigint[]) => void;
    },
  ) => unknown;
  InterruptableStoppingCriteria?: new () => { interrupt: () => void };
  env?: {
    useBrowserCache?: boolean;
    backends?: { onnx?: { wasm?: { numThreads?: number } } };
  };
};

export type ModelStatus = {
  stage: "idle" | "loading" | "ready" | "error";
  progress: number;
  device: LocalDevice | null;
  model: string | null;
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

export function describeModelStatus(s: ModelStatus): string | null {
  if (s.stage !== "loading") return null;
  const name = s.model ?? "on-device model";
  if (s.progress >= 0.995) return `Starting ${name}…`;
  if (s.progress > 0) return `Downloading ${name}… ${Math.round(s.progress * 100)}%`;
  return `Loading ${name}…`;
}

export function subscribeModelStatus(fn: (s: ModelStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function localModelSupported(): boolean {
  return typeof window !== "undefined" && typeof WebAssembly !== "undefined";
}

const MODEL_ALIASES: Record<string, number> = { qwen: 0, "360m": 1, "135m": 2 };

export function effectiveRung(search: string): number {
  const forced = new URLSearchParams(search).get("model");
  return forced && forced in MODEL_ALIASES ? MODEL_ALIASES[forced] : 0;
}

/**
 * Return the backend ladder. A WebGPU adapter's maxStorageBufferBindingSize is
 * checked before pipeline creation so an oversized model is never handed to
 * ONNX Runtime just to fail later with a huge allocation error.
 */
export function pickBackends(
  search: string,
  hasWebGpu: boolean,
  ios: boolean,
  hasShaderF16 = false,
  maxStorageBufferBindingSize: number | null = null,
): LocalBackend[] {
  const params = new URLSearchParams(search);
  const forcedModel = params.get("model");
  const requestedRung = effectiveRung(search);
  // Keep Qwen on WebGPU. On CPU-only desktops, use the smaller 360M model
  // unless the user explicitly selected a model, keeping the slow path usable.
  const wasmRung =
    !hasWebGpu && !ios && !forcedModel
      ? 1
      : requestedRung;
  const model = MODEL_LADDER[wasmRung];
  const isQwen = model === MODEL_LADDER[0];
  const forcedDtype = params.get("dtype");
  const dtype: LocalDtype | null =
    forcedDtype === "q4" || forcedDtype === "q4f16" || forcedDtype === "q8" ? forcedDtype : null;

  const wasmDtypes: LocalDtype[] = dtype
    ? [dtype === "q4f16" ? "q4" : dtype]
    : isQwen
      ? ["q8", "q4"]
      : ["q4"];
  const wasm: LocalBackend[] = wasmDtypes.map((d) => ({ device: "wasm", dtype: d, model }));

  const wasmOnly = params.get("device") === "wasm" || ios || !hasWebGpu;
  if (wasmOnly) return wasm;

  const gpuDtypes: LocalDtype[] = dtype
    ? [dtype]
    : isQwen && hasShaderF16
      ? ["q4f16", "q4"]
      : ["q4"];

  const gpu = gpuDtypes
    .filter((d) => {
      if (maxStorageBufferBindingSize == null) return true;
      return APPROX_FILE_MB[d] * 1024 * 1024 <= maxStorageBufferBindingSize;
    })
    .map((d): LocalBackend => ({ device: "webgpu", dtype: d, model }));

  return [...gpu, ...wasm];
}

function detectIOS(): boolean {
  return isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
}

export function useLowMemory(search: string, ios: boolean): boolean {
  const forced = new URLSearchParams(search).get("lowmem");
  if (forced === "on") return true;
  if (forced === "off") return false;
  return ios;
}

export function isFirefox(userAgent: string): boolean {
  return /Firefox\//i.test(userAgent) && !/Seamonkey\//i.test(userAgent);
}

export function isIOS(ua: string, platform: string, touchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && touchPoints > 1);
}

let avoidWebGpu = false;
const WEBGPU_FAIL_LIMIT = 1;

async function candidateBackends(): Promise<LocalBackend[]> {
  let hasWebGpu = false;
  let hasShaderF16 = false;
  let maxStorageBufferBindingSize: number | null = null;
  const gpu = (navigator as unknown as {
    gpu?: {
      requestAdapter: () => Promise<{
        features?: { has?: (name: string) => boolean };
        limits?: { maxStorageBufferBindingSize?: number };
      } | null>;
    };
  }).gpu;
  if (gpu) {
    try {
      const adapter = await gpu.requestAdapter();
      hasWebGpu = Boolean(adapter);
      hasShaderF16 = Boolean(adapter?.features?.has?.("shader-f16"));
      maxStorageBufferBindingSize = adapter?.limits?.maxStorageBufferBindingSize ?? null;
    } catch {
      hasWebGpu = false;
    }
  }
  const search = typeof location === "undefined" ? "" : location.search;
  return pickBackends(
    search,
    hasWebGpu && !avoidWebGpu,
    detectIOS(),
    hasShaderF16,
    maxStorageBufferBindingSize,
  );
}

const failedBackends = new Set<string>();

export function wasmThreads(isolated: boolean, cores: number, search = ""): number {
  const forced = Number(new URLSearchParams(search).get("threads"));
  if (isolated && Number.isFinite(forced) && forced >= 1 && forced <= 8) return Math.floor(forced);
  if (!isolated) return 1;
  return Math.max(1, Math.min(4, Math.floor((cores || 2) / 2)));
}

export function progressLabel(fraction: number): string {
  if (fraction >= 0.995) return "starting the model (download finished)";
  const bucket = Math.min(90, Math.max(0, Math.floor(fraction * 10) * 10));
  return `downloading the model (${bucket}%)`;
}

const CRUMB_KEY = "hive-mc-breadcrumb";
export type Breadcrumb = { stage: string; device: string | null; at: number; clean?: boolean };

function writeCrumb(crumb: Breadcrumb | null) {
  try {
    if (crumb) localStorage.setItem(CRUMB_KEY, JSON.stringify(crumb));
    else localStorage.removeItem(CRUMB_KEY);
  } catch {}
}
function setBreadcrumb(stage: string, device: string | null) { writeCrumb({ stage, device, at: Date.now() }); }
export function markBreadcrumbClean() {
  try {
    const raw = localStorage.getItem(CRUMB_KEY);
    if (!raw) return;
    const crumb = JSON.parse(raw) as Breadcrumb;
    crumb.clean = true;
    localStorage.setItem(CRUMB_KEY, JSON.stringify(crumb));
  } catch {}
}
export function takeLastBreadcrumb(): Breadcrumb | null {
  try {
    const raw = localStorage.getItem(CRUMB_KEY);
    if (!raw) return null;
    localStorage.removeItem(CRUMB_KEY);
    return JSON.parse(raw) as Breadcrumb;
  } catch { return null; }
}

function backendLabel({ device, dtype, model }: LocalBackend): string {
  return `${model.name} ${device}/${dtype}`;
}

let runsSinceLoad = 0;
const WORN_AFTER_RUNS = 32;
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
    let lastProgressUiAt = -Infinity;
    const onProgress = (e: ProgressEvent) => {
      if (!e.file || typeof e.total !== "number" || typeof e.loaded !== "number") return;
      files.set(e.file, { loaded: e.loaded, total: e.total });
      let loaded = 0, total = 0;
      for (const f of files.values()) { loaded += f.loaded; total += f.total; }
      if (total > 0) {
        const progress = Math.min(1, loaded / total);
        if (progress >= 0.995 && tDownloadDone === null) tDownloadDone = perf.now();
        const now = perf.now();
        if (progress >= 0.995 || now - lastProgressUiAt >= 120) {
          lastProgressUiAt = now;
          setStatus({ progress });
        }
        const label = progressLabel(progress);
        if (label !== lastLabel) { lastLabel = label; setBreadcrumb(label, attempt); }
      }
    };
    const injected = (globalThis as { __HIVE_TRANSFORMERS__?: TransformersModule }).__HIVE_TRANSFORMERS__;
    const mod = injected ?? ((await import(/* @vite-ignore */ TRANSFORMERS_URL)) as TransformersModule);
    const tLibrary = perf.now();
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
    else failedBackends.clear();
    const tooBig: { device: LocalDevice; mb: number }[] = [];
    for (const backend of ladder) {
      const { device, dtype, model } = backend;
      const label = backendLabel(backend);
      if (tooBig.some((t) => t.device === device && APPROX_FILE_MB[dtype] >= t.mb)) {
        failedBackends.add(label);
        continue;
      }
      if (device === "webgpu" && avoidWebGpu) continue;
      try {
        attempt = label;
        lastLabel = "";
        setStatus({ model: model.name, progress: 0 });
        setBreadcrumb("loading the model", label);
        tDownloadDone = null;
        const tPipeline = perf.now();
        const generator = await mod.pipeline("text-generation", model.id, {
          device, dtype, progress_callback: onProgress, session_options: sessionOptions,
        });
        const tReady = perf.now();
        runsSinceLoad = 0;
        setStatus({ stage: "ready", progress: 1, device, dtype });
        writeCrumb(null);
        perf.recordLoad({ label, totalMs: tReady - tStart, libraryMs: tLibrary - tStart, downloadMs: tDownloadDone === null ? null : tDownloadDone - tPipeline, initMs: tDownloadDone === null ? null : tReady - tDownloadDone });
        return { generator, device, label, mod };
      } catch (err) {
        lastError = err;
        files.clear();
        failedBackends.add(label);
        if (isMemoryFailure(err)) tooBig.push({ device, mb: APPROX_FILE_MB[dtype] });
        if (device === "webgpu" && isRuntimeFailure(err)) avoidWebGpu = true;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    throw lastError ?? new Error("No usable compute backend");
  })().catch((err) => {
    loading = null;
    setStatus({ stage: "error", error: err instanceof Error ? err.message : String(err) });
    throw err;
  });
  return loading;
}

export function preloadLocalModel(): Promise<unknown> { return loadModel(); }
let queue: Promise<unknown> = Promise.resolve();
export type GenerateOptions = {
  maxNewTokens: number | ((device: LocalDevice) => number);
  onToken?: (tokens: number) => void;
  temperature?: number;
  label?: string;
  stopWhen?: (textSoFar: string) => boolean;
  signal?: AbortSignal;
};
export function isAbortError(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "AbortError") return true;
  const message = err instanceof Error ? err.message : String(err);
  return /operation was aborted|AbortError/i.test(message);
}
export function isMemoryFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /failed to allocate|allocation failed|array buffer allocation|invalid array length|out of memory|cannot enlarge memory/i.test(message);
}
export function isRuntimeFailure(err: unknown): boolean {
  if (isAbortError(err)) return true;
  if (isMemoryFailure(err)) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /OrtRun|onnxruntime|buffer_manager|webgpu|GPUDevice|device (was )?lost|Aborted\(/i.test(message);
}
export class GenerationCancelled extends Error {
  constructor() { super("Generation cancelled"); this.name = "GenerationCancelled"; }
}
let resetInFlight: Promise<void> | null = null;
async function resetModel(): Promise<void> {
  if (resetInFlight) return resetInFlight;
  resetInFlight = (async () => {
    const old = loading;
    loading = null;
    setStatus({ stage: "idle", progress: 0, error: null });
    try {
      const loaded = await old;
      await Promise.race([Promise.resolve(loaded?.generator.dispose?.()), new Promise((resolve) => setTimeout(resolve, 700))]);
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  })();
  try { await resetInFlight; } finally { resetInFlight = null; }
}
export async function releaseModel(): Promise<void> { await resetModel(); }
export async function releaseModelIfWorn(): Promise<boolean> {
  if (!loading || runsSinceLoad < WORN_AFTER_RUNS) return false;
  await resetModel(); return true;
}
export function startModelPreload(): void {
  // Do not load or initialize the local model when Hive opens.
  // The model is loaded lazily by generateChat()/generateChatParallel()
  // only when an actual AI generation is requested.
}
export type ParallelGenerateRequest = {
  messages: LocalChatMessage[];
  maxNewTokens?: number;
};

export async function generateChatParallel(
  requests: ParallelGenerateRequest[],
  options: {
    maxNewTokens: number;
    label?: string;
    signal?: AbortSignal;
  },
): Promise<Array<{ text: string; device: LocalDevice }>> {
  if (requests.length === 0) return [];

  const generateBatchOnce = async ({ generator, device, label }: Loaded) => {
    if (options.signal?.aborted) throw new GenerationCancelled();
    setBreadcrumb(`parallel ${options.label ?? "agent"} thinking`, label);
    const maxNew = options.maxNewTokens;
    const batchInput = requests.map((request) => request.messages);
    const batchGenerator = generator as unknown as (
      messages: LocalChatMessage[][],
      callOptions: Record<string, unknown>,
    ) => Promise<Array<{ generated_text: LocalChatMessage[] | string }>>;
    const out = await batchGenerator(batchInput, {
      max_new_tokens: maxNew,
      do_sample: false,
    });
    if (options.signal?.aborted) throw new GenerationCancelled();

    return out.map((item) => {
      const generated = item?.generated_text;
      if (Array.isArray(generated)) {
        return {
          text: generated.at(-1)?.content ?? "",
          device,
        };
      }
      return { text: typeof generated === "string" ? generated : "", device };
    });
  };

  const run = async () => {
    let failures = 0;
    for (;;) {
      const loaded = await loadModel();
      try {
        return await generateBatchOnce(loaded);
      } catch (err) {
        if (failures >= WEBGPU_FAIL_LIMIT || !isRuntimeFailure(err)) throw err;
        failures += 1;
        perf.recovery();
        if (loaded.device === "webgpu") avoidWebGpu = true;
        await resetModel();
      }
    }
  };

  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

export function generateChat(messages: LocalChatMessage[], options: GenerateOptions): Promise<{ text: string; device: LocalDevice }> {
  const generateOnce = async ({ generator, device, label, mod }: Loaded) => {
    if (options.signal?.aborted) throw new GenerationCancelled();
    setBreadcrumb(`writing ${options.label ?? "a reply"}`, label);
    const maxNew = typeof options.maxNewTokens === "function" ? options.maxNewTokens(device) : options.maxNewTokens;
    const callOptions: Record<string, unknown> = { max_new_tokens: maxNew, do_sample: false };
    const t0 = perf.now();
    let tFirst: number | null = null, tokens = 0, stoppedEarly = false, soFar = "";
    let onCancel: (() => void) | null = null;
    if (mod.TextStreamer && mod.InterruptableStoppingCriteria && generator.tokenizer) {
      const stopper = new mod.InterruptableStoppingCriteria();
      callOptions.stopping_criteria = stopper;
      if (options.signal) { onCancel = () => stopper.interrupt(); options.signal.addEventListener("abort", onCancel, { once: true }); }
      callOptions.streamer = new mod.TextStreamer(generator.tokenizer, {
        skip_prompt: true, skip_special_tokens: true,
        callback_function: (text) => { soFar += text; if (options.stopWhen && !stoppedEarly && options.stopWhen(soFar)) { stoppedEarly = true; stopper.interrupt(); } },
        token_callback_function: () => { tokens += 1; if (tFirst === null) tFirst = perf.now(); options.onToken?.(tokens); },
      });
    }
    const finish = (text: string) => {
      const t1 = perf.now(); writeCrumb(null); runsSinceLoad += 1;
      const decodeMs = tFirst === null ? null : t1 - tFirst;
      perf.addGen({ label: options.label ?? "reply", totalMs: t1 - t0, ttftMs: tFirst === null ? null : tFirst - t0, decodeMs, tokens, tokPerSec: decodeMs !== null && decodeMs > 0 && tokens > 1 ? (tokens - 1) / (decodeMs / 1000) : null, maxNew, promptChars: messages.reduce((n, m) => n + m.content.length, 0), stoppedEarly });
      return { text, device };
    };
    try {
      const out = await generator(messages, callOptions);
      if (options.signal?.aborted) throw new GenerationCancelled();
      return finish(out[0]?.generated_text?.at(-1)?.content ?? soFar);
    } catch (err) {
      if (options.signal?.aborted) throw new GenerationCancelled();
      if (isAbortError(err) && soFar && (stoppedEarly || options.stopWhen?.(soFar))) return finish(soFar);
      throw err;
    } finally { if (onCancel) options.signal?.removeEventListener("abort", onCancel); }
  };
  const run = async () => {
    let failures = 0;
    for (;;) {
      const loaded = await loadModel();
      try { return await generateOnce(loaded); }
      catch (err) {
        if (failures >= WEBGPU_FAIL_LIMIT || !isRuntimeFailure(err)) throw err;
        failures += 1; perf.recovery(); if (loaded.device === "webgpu") avoidWebGpu = true; await resetModel();
      }
    }
  };
  const next = queue.then(run, run); queue = next.catch(() => undefined); return next;
}
export async function warmModelIfCached(): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    if (!(await caches.has("transformers-cache"))) return false;
    const cache = await caches.open("transformers-cache");
    if ((await cache.keys()).length === 0) return false;
    void loadModel().catch(() => undefined); return true;
  } catch { return false; }
}
