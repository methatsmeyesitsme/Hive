import { describe, it } from "node:test";
import assert from "node:assert/strict";

// A fake Transformers.js whose WebGPU sessions can be made to fail like the real
// "failed to call OrtRun() ... webgpu ... buffer_manager" error.
const loads: string[] = [];
let disposed = 0;
let webgpuFailuresLeft = 0; // fail this many webgpu generations, then work
let webgpuAlwaysFails = false;
let boom = false;

Object.defineProperty(globalThis.navigator, "gpu", {
  value: { requestAdapter: async () => ({}) },
  configurable: true,
});

(globalThis as { __HIVE_TRANSFORMERS__?: unknown }).__HIVE_TRANSFORMERS__ = {
  env: {},
  pipeline: async (_task: string, _id: string, opts: { device: string }) => {
    loads.push(opts.device);
    const generator = async (messages: { role: string; content: string }[]) => {
      if (boom) throw new Error("boom: the request itself is bad");
      if (opts.device === "webgpu" && (webgpuAlwaysFails || webgpuFailuresLeft > 0)) {
        if (webgpuFailuresLeft > 0) webgpuFailuresLeft -= 1;
        throw new Error(
          "failed to call OrtRun(). ERROR_CODE: 1, ERROR_MESSAGE: providers/webgpu/buffer_manager.cc:643 BufferManager::Download",
        );
      }
      return [{ generated_text: [...messages, { role: "assistant", content: `ok on ${opts.device}` }] }];
    };
    generator.dispose = async () => {
      disposed += 1;
    };
    return generator;
  },
};

const { generateChat, isRuntimeFailure } = await import("./local-model.ts");
const msgs = [{ role: "user" as const, content: "hi" }];
const ask = () => generateChat(msgs, { maxNewTokens: 5 });

describe("isRuntimeFailure", () => {
  it("recognises runtime and GPU errors but not ordinary ones", () => {
    assert.equal(isRuntimeFailure(new Error("failed to call OrtRun(). ERROR_CODE: 1")), true);
    assert.equal(isRuntimeFailure(new Error("GPUDevice was lost")), true);
    assert.equal(isRuntimeFailure("out of memory"), true);
    assert.equal(isRuntimeFailure(new Error("boom: the request itself is bad")), false);
  });
});

describe("recovering from a failing GPU session", () => {
  it("a one-off WebGPU failure is fixed by restarting the session on WebGPU", async () => {
    webgpuFailuresLeft = 1;
    const out = await ask();
    assert.equal(out.text, "ok on webgpu");
    assert.deepEqual(loads, ["webgpu", "webgpu"]);
    assert.equal(disposed, 1, "the broken session is disposed");
  });

  it("two WebGPU failures in a row fall back to the CPU backend", async () => {
    webgpuAlwaysFails = true;
    const out = await ask();
    assert.equal(out.text, "ok on wasm");
    assert.equal(out.device, "wasm");
    assert.deepEqual(loads, ["webgpu", "webgpu", "webgpu", "wasm"]);
  });

  it("stays on the CPU session afterwards without reloading", async () => {
    const before = loads.length;
    assert.equal((await ask()).text, "ok on wasm");
    assert.equal((await ask()).text, "ok on wasm");
    assert.equal(loads.length, before);
  });

  it("does not retry errors that are not from the runtime, and keeps working after", async () => {
    boom = true;
    const before = loads.length;
    await assert.rejects(ask(), /boom/);
    assert.equal(loads.length, before);
    boom = false;
    assert.equal((await ask()).text, "ok on wasm");
  });
});
