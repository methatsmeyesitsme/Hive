import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickDevices, progressLabel } from "./local-model.ts";

describe("pickDevices", () => {
  it("prefers WebGPU when present, with WASM as fallback", () => {
    assert.deepEqual(pickDevices("", true), ["webgpu", "wasm"]);
  });
  it("uses WASM only when there is no WebGPU", () => {
    assert.deepEqual(pickDevices("", false), ["wasm"]);
  });
  it("?device=wasm forces the CPU backend", () => {
    assert.deepEqual(pickDevices("?device=wasm", true), ["wasm"]);
    assert.deepEqual(pickDevices("?x=1&device=wasm", true), ["wasm"]);
  });
  it("ignores unknown values", () => {
    assert.deepEqual(pickDevices("?device=quantum", true), ["webgpu", "wasm"]);
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
