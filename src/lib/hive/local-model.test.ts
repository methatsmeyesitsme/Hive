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
  it("starts at Qwen on ordinary devices and one step down on iOS", () => {
    assert.equal(effectiveRung("", false, 0), 0);
    assert.equal(effectiveRung("", true, 0), 1);
  });
  it("a stored rung can only move further down", () => {
    assert.equal(effectiveRung("", false, 2), 2);
    assert.equal(effectiveRung("", true, 0), 1);
    assert.equal(effectiveRung("", true, 99), 2);
  });
  it("?model= overrides everything", () => {
    assert.equal(effectiveRung("?model=qwen", true, 2), 0);
    assert.equal(effectiveRung("?model=135m", false, 0), 2);
    assert.equal(effectiveRung("?model=nope", false, 0), 0);
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
  it("iPhones and iPads start on SmolLM2-360M with the CPU backend", () => {
    assert.deepEqual(pickBackends("", true, true), [{ device: "wasm", dtype: "q4", model: SMOL360 }]);
  });
  it("after crashes an iPhone steps down to SmolLM2-135M", () => {
    assert.deepEqual(pickBackends("", true, true, 2), [{ device: "wasm", dtype: "q4", model: SMOL135 }]);
  });
  it("Qwen on an iPhone (forced) uses the smaller 8-bit file", () => {
    assert.deepEqual(pickBackends("?model=qwen", true, true), [
      { device: "wasm", dtype: "q8", model: QWEN },
    ]);
  });
  it("?device=wasm forces the CPU backend", () => {
    assert.deepEqual(pickBackends("?x=1&device=wasm", true, false), [
      { device: "wasm", dtype: "q4", model: QWEN },
    ]);
  });
  it("?dtype overrides the model file, ignoring unknown values", () => {
    assert.deepEqual(pickBackends("?dtype=q8", true, true), [{ device: "wasm", dtype: "q8", model: SMOL360 }]);
    assert.deepEqual(pickBackends("?dtype=nope", true, true), [{ device: "wasm", dtype: "q4", model: SMOL360 }]);
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
