import { describe, it } from "node:test";
import assert from "node:assert/strict";

// A fake Transformers.js: counts model loads, tracks concurrent runs, and streams
// one word at a time so early stopping and timing can be checked.
let loads = 0;
let active = 0;
let maxActive = 0;
let slowTokens = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class FakeStopper {
  interrupted = false;
  interrupt() {
    this.interrupted = true;
  }
}
class FakeStreamer {
  opts: { callback_function?: (t: string) => void; token_callback_function?: (t: bigint[]) => void };
  constructor(
    _tokenizer: unknown,
    opts: { callback_function?: (t: string) => void; token_callback_function?: (t: bigint[]) => void },
  ) {
    this.opts = opts;
  }
}

const PAGE = "<!doctype html> <html> <body> hello </body> </html> and then a lot of extra rambling words that should never be generated at all";

(globalThis as { __HIVE_TRANSFORMERS__?: unknown }).__HIVE_TRANSFORMERS__ = {
  env: {},
  TextStreamer: FakeStreamer,
  InterruptableStoppingCriteria: FakeStopper,
  pipeline: async () => {
    loads += 1;
    await sleep(40);
    const generator = async (
      messages: { role: string; content: string }[] | { role: string; content: string }[][],
      opts: { max_new_tokens: number; streamer?: FakeStreamer; stopping_criteria?: FakeStopper },
    ) => {
      const batch = Array.isArray(messages[0])
        ? (messages as { role: string; content: string }[][])
        : [messages as { role: string; content: string }[]];
      active += batch.length;
      maxActive = Math.max(maxActive, active);
      const results = [];
      for (const chat of batch) {
        const words = PAGE.split(" ");
        let out = "";
        for (let i = 0; i < Math.min(words.length, opts.max_new_tokens); i++) {
          await sleep(slowTokens > 0 ? 4 : 0);
          const chunk = (i === 0 ? "" : " ") + words[i];
          out += chunk;
          opts.streamer?.callback_function?.(chunk);
          opts.streamer?.token_callback_function?.();
          if (opts.stopping_criteria?.interrupted) break;
        }
        results.push({ generated_text: [...chat, { role: "assistant", content: out }] });
      }
      active -= batch.length;
      return results;
    };
    generator.tokenizer = {};
    return generator;
  },
};

const { generateChat, generateChatParallel } = await import("./local-model.ts");
const { perf } = await import("./perf.ts");

const msgs = [
  { role: "system" as const, content: "s" },
  { role: "user" as const, content: "u" },
];

describe("generateChat with a persistent model", () => {
  it("loads the model once and serialises concurrent calls", async () => {
    perf.beginRun();
    const [a, b, c] = await Promise.all([
      generateChat(msgs, { maxNewTokens: 5, label: "a" }),
      generateChat(msgs, { maxNewTokens: 5, label: "b" }),
      generateChat(msgs, { maxNewTokens: 5, label: "c" }),
    ]);
    assert.equal(loads, 1, "model must load once for every call");
    assert.equal(maxActive, 1, "one ONNX session runs one generation at a time");
    assert.equal(a.device, "wasm");
    assert.ok(b.text.length > 0 && c.text.length > 0);
    const run = perf.finishRun();
    assert.equal(run?.gens.length, 3);
  });

  it("runs multiple agent chats in one parallel batch", async () => {
    perf.beginRun();
    const [a, b, c] = await generateChatParallel(
      [
        { messages: msgs, maxNewTokens: 5 },
        { messages: msgs, maxNewTokens: 5 },
        { messages: msgs, maxNewTokens: 5 },
      ],
      { maxNewTokens: 5, label: "agents" },
    );
    assert.equal(loads, 1, "the batch should reuse the existing loaded model");
    assert.equal(maxActive, 3, "the batched agent work should execute together");
    assert.ok(a.text.length > 0 && b.text.length > 0 && c.text.length > 0);
    perf.finishRun();
  });

  it("stops generating as soon as the stop condition is met", async () => {
    perf.beginRun();
    const total = PAGE.split(" ").length;
    const out = await generateChat(msgs, {
      maxNewTokens: 500,
      label: "page",
      stopWhen: (t) => /<\/html\s*>/i.test(t),
    });
    assert.match(out.text, /<\/html>$/);
    assert.ok(!out.text.includes("rambling"));
    const g = perf.finishRun()!.gens[0];
    assert.equal(g.stoppedEarly, true);
    assert.ok(g.tokens < total, `${g.tokens} tokens < ${total}`);
    assert.ok(g.ttftMs !== null && g.decodeMs !== null && g.tokPerSec !== null && g.tokPerSec > 0);
  });

  it("without a stop condition it runs to the token limit", async () => {
    perf.beginRun();
    const out = await generateChat(msgs, { maxNewTokens: 4, label: "x" });
    assert.equal(out.text.split(" ").length, 4);
    const g = perf.finishRun()!.gens[0];
    assert.equal(g.stoppedEarly, false);
    assert.equal(g.tokens, 4);
  });

  it("never loaded the model a second time", () => {
    assert.equal(loads, 1);
  });
});
