import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isIOS, pickBackends, progressLabel } from "./local-model.ts";

describe("pickBackends", () => {
  it("prefers WebGPU with a WASM fallback on ordinary devices", () => {
    assert.deepEqual(pickBackends("", true, false), [
      { device: "webgpu", dtype: "q4" },
      { device: "wasm", dtype: "q4" },
    ]);
  });
  it("uses WASM only when there is no WebGPU", () => {
    assert.deepEqual(pickBackends("", false, false), [{ device: "wasm", dtype: "q4" }]);
  });
  it("iPhones and iPads get WASM with the smaller 8-bit file", () => {
    assert.deepEqual(pickBackends("", true, true), [{ device: "wasm", dtype: "q8" }]);
  });
  it("?device=wasm forces the CPU backend", () => {
    assert.deepEqual(pickBackends("?x=1&device=wasm", true, false), [{ device: "wasm", dtype: "q4" }]);
  });
  it("?dtype overrides the model file, ignoring unknown values", () => {
    assert.deepEqual(pickBackends("?dtype=q4", true, true), [{ device: "wasm", dtype: "q4" }]);
    assert.deepEqual(pickBackends("?dtype=nope", true, true), [{ device: "wasm", dtype: "q8" }]);
  });
  it("never asks the CPU backend for the fp16 file", () => {
    assert.deepEqual(pickBackends("?dtype=q4f16", true, false), [
      { device: "webgpu", dtype: "q4f16" },
      { device: "wasm", dtype: "q4" },
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
