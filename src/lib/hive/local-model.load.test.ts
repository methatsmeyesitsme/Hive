import { describe, it } from "node:test";
import assert from "node:assert/strict";

// A fake Transformers.js whose model files can be made to fail to open the way the
// real ones do on a low-memory device:
//   "Can't create a session. failed to allocate a buffer of size 786156820"
const attempts: string[] = [];
const failing = new Set<string>(); // "device/dtype" combinations that run out of memory
let slowTokens = 0; // when > 0, generation streams this many tokens, one per tick

const OOM = "Can't create a session. failed to allocate a buffer of size 786156820";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const setGpu = (features: string[] | null) => {
  Object.defineProperty(globalThis.navigator, "gpu", {
    value:
      features === null
        ? undefined
        : { requestAdapter: async () => ({ features: new Set(features) }) },
    configurable: true,
  });
};

(globalThis as { __HIVE_TRANSFORMERS__?: unknown }).__HIVE_TRANSFORMERS__ = {
  env: {},
  TextStreamer: class {
    options: { callback_function?: (t: string) => void; token_callback_function?: () => void };
    constructor(
      _t: unknown,
      options: { callback_function?: (t: string) => void; token_callback_function?: () => void },
    ) {
      this.options = options;
    }
  },
  InterruptableStoppingCriteria: class {
    interrupted = false;
    interrupt() {
      this.interrupted = true;
    }
  },
  pipeline: async (_task: string, _id: string, opts: { device: string; dtype: string }) => {
    const key = `${opts.device}/${opts.dtype}`;
    attempts.push(key);
    if (failing.has(key)) throw new Error(OOM);
    const generator = async (
      messages: { role: string; content: string }[],
      callOpts: {
        streamer: {
          options: {
            callback_function?: (t: string) => void;
            token_callback_function?: () => void;
          };
        };
        stopping_criteria: { interrupted: boolean };
      },
    ) => {
      if (!slowTokens) {
        callOpts.streamer.options.token_callback_function?.();
        return [{ generated_text: [...messages, { role: "assistant", content: `ok on ${key}` }] }];
      }
      let out = "";
      for (let i = 0; i < slowTokens; i++) {
        await sleep(5);
        out += `t${i} `;
        callOpts.streamer.options.callback_function?.(`t${i} `);
        callOpts.streamer.options.token_callback_function?.();
        if (callOpts.stopping_criteria.interrupted) break;
      }
      return [{ generated_text: [...messages, { role: "assistant", content: out.trim() }] }];
    };
    generator.tokenizer = {};
    generator.dispose = async () => {};
    return generator;
  },
};

const fresh = async (tag: string) =>
  (await import(`./local-model.ts?${tag}`)) as typeof import("./local-model.ts");
const msgs = [{ role: "user" as const, content: "hi" }];

describe("a model file that does not fit in memory", () => {
  it("falls back from the GPU's small file to the CPU's 8-bit file, skipping the bigger GPU file", async () => {
    attempts.length = 0;
    failing.clear();
    failing.add("webgpu/q4f16");
    setGpu(["shader-f16"]);
    const m = await fresh("gpu");
    const out = await m.generateChat(msgs, { maxNewTokens: 5 });
    // q4 on WebGPU (786 MB) is bigger than the q4f16 file (480 MB) that just ran out of memory: skipped.
    assert.deepEqual(attempts, ["webgpu/q4f16", "wasm/q8"]);
    assert.equal(out.device, "wasm");
    assert.equal(m.getModelStatus().stage, "ready");
  });

  it("starts with the smaller 8-bit file on the CPU, so the 786 MB file is never needed", async () => {
    attempts.length = 0;
    failing.clear();
    failing.add("wasm/q4"); // the file from the bug report
    setGpu(null);
    const m = await fresh("cpu");
    Object.defineProperty(globalThis, "location", { value: { search: "?model=qwen" }, configurable: true });
    const out = await m.generateChat(msgs, { maxNewTokens: 5 });
    assert.deepEqual(attempts, ["wasm/q8"]);
    assert.equal(out.device, "wasm");
  });

  it("does not try a bigger file after a smaller one ran out of memory, and reports the real error", async () => {
    attempts.length = 0;
    failing.clear();
    failing.add("wasm/q8");
    failing.add("wasm/q4");
    setGpu(null);
    const m = await fresh("cpu-all-fail");
    Object.defineProperty(globalThis, "location", { value: { search: "?model=qwen" }, configurable: true });
    await assert.rejects(
      m.generateChat(msgs, { maxNewTokens: 5 }),
      /failed to allocate a buffer of size 786156820/,
    );
    assert.deepEqual(attempts, ["wasm/q8"], "q4 is bigger than q8, so it cannot fit either");
    assert.equal(m.getModelStatus().stage, "error");

    // Memory frees up (a tab was closed): the next request tries again and works.
    failing.clear();
    const out = await m.generateChat(msgs, { maxNewTokens: 5 });
    assert.equal(out.device, "wasm");
    assert.equal(attempts.at(-1), "wasm/q8");
  });
});

describe("cancelling a generation", () => {
  it("stops the model and rejects with GenerationCancelled, without restarting the model", async () => {
    attempts.length = 0;
    failing.clear();
    slowTokens = 200;
    setGpu(null);
    const m = await fresh("cancel");
    Object.defineProperty(globalThis, "location", { value: { search: "?model=qwen" }, configurable: true });
    const controller = new AbortController();
    let tokens = 0;
    const run = m.generateChat(msgs, {
      maxNewTokens: 500,
      signal: controller.signal,
      onToken: (n) => {
        tokens = n;
        if (n === 5) controller.abort();
      },
    });
    await assert.rejects(run, (err: Error) => err instanceof m.GenerationCancelled);
    assert.ok(tokens < 50, `stopped within a few tokens (${tokens})`);
    assert.equal(attempts.length, 1, "a cancel is not a runtime failure: no model restart");

    // The next run is not stuck behind the cancelled one.
    slowTokens = 0;
    assert.equal((await m.generateChat(msgs, { maxNewTokens: 5 })).text, "ok on wasm/q8");
    assert.equal(attempts.length, 1);
  });

  it("a run that is already cancelled never reaches the model", async () => {
    const m = await fresh("cancel-early");
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      m.generateChat(msgs, { maxNewTokens: 5, signal: controller.signal }),
      (e: Error) => e instanceof m.GenerationCancelled,
    );
  });
});

describe("keeping the model warm between projects", () => {
  it("releaseModelIfWorn keeps a fresh session and recycles one that has run several times", async () => {
    attempts.length = 0;
    failing.clear();
    slowTokens = 0;
    setGpu(null);
    const m = await fresh("worn");
    Object.defineProperty(globalThis, "location", { value: { search: "?model=qwen" }, configurable: true });
    await m.generateChat(msgs, { maxNewTokens: 5 });
    assert.equal(await m.releaseModelIfWorn(), false, "one run: keep the session");
    for (let i = 0; i < 63; i++) await m.generateChat(msgs, { maxNewTokens: 5 });
    assert.equal(await m.releaseModelIfWorn(), true, "sixty-four runs: recycle it");
    await m.generateChat(msgs, { maxNewTokens: 5 });
    assert.equal(attempts.length, 2, "loaded once, recycled, loaded again");
  });
});
