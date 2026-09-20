import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickDevices } from "./local-model.ts";

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
