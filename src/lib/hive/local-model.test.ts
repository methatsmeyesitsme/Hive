import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  effectiveRung,
  isIOS,
  MODEL_LADDER,
  pickBackends,
  progressLabel,
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
  it("prefers WebGPU with a WASM fallback on ordinary devices", () => {
    assert.deepEqual(pickBackends("", true, false), [
      { device: "webgpu", dtype: "q4", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("uses WASM only when there is no WebGPU", () => {
    assert.deepEqual(pickBackends("", false, false), [{ device: "wasm", dtype: "q4", model: QWEN }]);
  });
  it("iPhones and iPads use Qwen on the CPU backend with the smaller 8-bit file", () => {
    assert.deepEqual(pickBackends("", true, true), [{ device: "wasm", dtype: "q8", model: QWEN }]);
  });
  it("?model= opts in to a smaller model on a phone", () => {
    assert.deepEqual(pickBackends("?model=360m", true, true), [{ device: "wasm", dtype: "q4", model: SMOL360 }]);
    assert.deepEqual(pickBackends("?model=135m", true, true), [{ device: "wasm", dtype: "q4", model: SMOL135 }]);
  });
  it("?device=wasm forces the CPU backend", () => {
    assert.deepEqual(pickBackends("?x=1&device=wasm", true, false), [
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("?dtype overrides the model file, ignoring unknown values", () => {
    assert.deepEqual(pickBackends("?dtype=q4", true, true), [{ device: "wasm", dtype: "q4", model: QWEN }]);
    assert.deepEqual(pickBackends("?dtype=nope", true, true), [{ device: "wasm", dtype: "q8", model: QWEN }]);
  });
  it("never asks the CPU backend for the fp16 file", () => {
    assert.deepEqual(pickBackends("?dtype=q4f16", true, false), [
      { device: "webgpu", dtype: "q4f16", model: QWEN },
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
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
