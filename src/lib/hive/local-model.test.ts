import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPROX_FILE_MB,
  describeModelStatus,
  effectiveRung,
  isIOS,
  isMemoryFailure,
  MODEL_LADDER,
  pickBackends,
  progressLabel,
  isFirefox,
  useLowMemory,
  wasmThreads,
} from "./local-model.ts";

const [QWEN, SMOL360, SMOL135] = MODEL_LADDER;

describe("effectiveRung", () => {
  it("is always Qwen unless the address asks for another model", () => {
    assert.equal(effectiveRung(""), 0);
    assert.equal(effectiveRung("?model=nope"), 0);
    assert.equal(effectiveRung("?model=qwen"), 0);
  });
  it("?model=360m / 135m opt in to a smaller model", () => {
    assert.equal(effectiveRung("?model=360m"), 1);
    assert.equal(effectiveRung("?model=135m"), 2);
  });
});

describe("pickBackends", () => {
  it("prefers WebGPU, then the small 8-bit CPU file, then the big 4-bit CPU file", () => {
    assert.deepEqual(pickBackends("", true, false), [
      { device: "webgpu", dtype: "q4", model: QWEN },
      { device: "wasm", dtype: "q8", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("uses the smaller q4f16 file first when the GPU supports fp16 shaders", () => {
    assert.deepEqual(pickBackends("", true, false, true), [
      { device: "webgpu", dtype: "q4f16", model: QWEN },
      { device: "webgpu", dtype: "q4", model: QWEN },
      { device: "wasm", dtype: "q8", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("uses the fast SmolLM2-360M path on a CPU-only desktop", () => {
    assert.deepEqual(pickBackends("", false, false), [
      { device: "wasm", dtype: "q4", model: SMOL360 },
    ]);
    assert.deepEqual(pickBackends("?model=qwen", false, false), [
      { device: "wasm", dtype: "q8", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("iPhones and iPads use Qwen on the CPU backend, 8-bit file first", () => {
    assert.deepEqual(pickBackends("", true, true), [
      { device: "wasm", dtype: "q8", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("uses Qwen by default on GPU/iOS and allows an explicit fast-model choice", () => {
    for (const b of pickBackends("", true, false, true)) assert.equal(b.model, QWEN);
    for (const b of pickBackends("", true, true)) assert.equal(b.model, QWEN);
    assert.ok(pickBackends("", false, false).every((b) => b.model === SMOL360));
    assert.ok(pickBackends("?model=135m", false, false).every((b) => b.model === SMOL135));
  });
  it("?model= opts in to a smaller model on a phone", () => {
    assert.deepEqual(pickBackends("?model=360m", true, true), [{ device: "wasm", dtype: "q4", model: SMOL360 }]);
    assert.deepEqual(pickBackends("?model=135m", true, true), [{ device: "wasm", dtype: "q4", model: SMOL135 }]);
  });
  it("?device=wasm forces the CPU backend", () => {
    assert.deepEqual(pickBackends("?x=1&device=wasm", true, false), [
      { device: "wasm", dtype: "q8", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("?dtype overrides the model file, ignoring unknown values", () => {
    assert.deepEqual(pickBackends("?dtype=q4", true, true), [{ device: "wasm", dtype: "q4", model: QWEN }]);
    assert.deepEqual(pickBackends("?dtype=nope", true, true), [
      { device: "wasm", dtype: "q8", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("never asks the CPU backend for the fp16 file", () => {
    assert.deepEqual(pickBackends("?dtype=q4f16", true, false), [
      { device: "webgpu", dtype: "q4f16", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
});

describe("file sizes", () => {
  it("orders the Qwen files so the biggest (the one that failed to allocate) is tried last", () => {
    assert.ok(APPROX_FILE_MB.q4f16 < APPROX_FILE_MB.q8);
    assert.ok(APPROX_FILE_MB.q8 < APPROX_FILE_MB.q4);
    assert.ok(APPROX_FILE_MB.q4 * 1024 * 1024 > 786_156_820 * 0.99);
  });
});

describe("isMemoryFailure", () => {
  it("recognises the error from the bug report and other out-of-memory failures", () => {
    assert.equal(isMemoryFailure(new Error("Can't create a session. failed to allocate a buffer of size 786156820")), true);
    assert.equal(isMemoryFailure(new Error("RangeError: Array buffer allocation failed")), true);
    assert.equal(isMemoryFailure("Out of memory"), true);
    assert.equal(isMemoryFailure(new Error("Failed to fetch")), false);
    assert.equal(isMemoryFailure(new Error("boom")), false);
  });
});

describe("wasmThreads", () => {
  it("is one thread unless the page is cross-origin isolated", () => {
    assert.equal(wasmThreads(false, 8), 1);
    assert.equal(wasmThreads(false, 8, "?threads=4"), 1);
  });
  it("uses about half the cores, at most four, when isolated; ?threads= overrides", () => {
    assert.equal(wasmThreads(true, 8), 4);
    assert.equal(wasmThreads(true, 4), 2);
    assert.equal(wasmThreads(true, 1), 1);
    assert.equal(wasmThreads(true, 16), 4);
    assert.equal(wasmThreads(true, 8, "?threads=2"), 2);
    assert.equal(wasmThreads(true, 8, "?threads=99"), 4);
  });
});

describe("isIOS", () => {
  it("detects iPhone, iPad and iPadOS-as-Mac", () => {
    assert.equal(isIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)", "iPhone", 5), true);
    assert.equal(isIOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 5), true);
    assert.equal(isIOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "MacIntel", 0), false);
    assert.equal(isIOS("Mozilla/5.0 (Linux; Android 14)", "Linux armv8l", 5), false);
  });
});

describe("progressLabel", () => {
  it("buckets progress by ten percent", () => {
    assert.equal(progressLabel(0), "downloading the model (0%)");
    assert.equal(progressLabel(0.37), "downloading the model (30%)");
    assert.equal(progressLabel(0.99), "downloading the model (90%)");
  });
  it("switches to the init stage once the download is done", () => {
    assert.equal(progressLabel(1), "starting the model (download finished)");
  });
});

describe("useLowMemory", () => {
  it("defaults on for iOS and off for desktop so CPU inference can use normal runtime optimizations", () => {
    assert.equal(useLowMemory("", true), true);
    assert.equal(useLowMemory("", false), false);
  });
  it("?lowmem=on / off override", () => {
    assert.equal(useLowMemory("?lowmem=on", false), true);
    assert.equal(useLowMemory("?lowmem=off", true), false);
  });
});

describe("describeModelStatus", () => {
  const base = { stage: "loading" as const, progress: 0, device: null, model: "Qwen2.5-0.5B", dtype: null, error: null };
  it("says nothing unless the model is loading", () => {
    assert.equal(describeModelStatus({ ...base, stage: "ready" }), null);
    assert.equal(describeModelStatus({ ...base, stage: "idle" }), null);
  });
  it("walks from loading, to a download percentage, to starting", () => {
    assert.equal(describeModelStatus(base), "Loading Qwen2.5-0.5B…");
    assert.equal(describeModelStatus({ ...base, progress: 0.426 }), "Downloading Qwen2.5-0.5B… 43%");
    assert.equal(describeModelStatus({ ...base, progress: 1 }), "Starting Qwen2.5-0.5B…");
  });
});


describe("isFirefox", () => {
  it("detects Firefox but not SeaMonkey", () => {
    assert.equal(isFirefox("Mozilla/5.0 Firefox/156.0"), true);
    assert.equal(isFirefox("Mozilla/5.0 Seamonkey/2.53"), false);
    assert.equal(isFirefox("Mozilla/5.0 Chrome/140.0.0.0"), false);
  });
});
