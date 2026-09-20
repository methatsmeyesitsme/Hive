import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { perf, perfRows } from "./perf.ts";

describe("perf", () => {
  it("collects a run and reports rows", () => {
    perf.recordLoad({ label: "Qwen wasm/q8", totalMs: 30_000, libraryMs: 1200, downloadMs: 9000, initMs: 19_800 });
    perf.beginRun();
    perf.prep(4.4);
    perf.addGen({ label: "brief", totalMs: 20_000, ttftMs: 5000, decodeMs: 15_000, tokens: 61, tokPerSec: 4, maxNew: 160, promptChars: 900, stoppedEarly: true });
    perf.addGen({ label: "page", totalMs: 200_000, ttftMs: 6000, decodeMs: 194_000, tokens: 800, tokPerSec: 4.1, maxNew: 1000, promptChars: 1200, stoppedEarly: false });
    perf.pacing(false, 4000);
    perf.pacing(true, 300);
    perf.waitModel(150_000);
    perf.integrate(1200);
    const run = perf.finishRun();
    assert.ok(run && run.wallMs !== null);
    assert.equal(run.gens.length, 2);
    assert.equal(run.pacingAfterMs, 300);
    assert.equal(run.load?.label, "Qwen wasm/q8");
    assert.equal(perf.getLast(), run);

    const rows = Object.fromEntries(perfRows(run).map(([k, v]) => [k, v]));
    assert.match(rows["Inference"], /220 s/);
    assert.match(rows["page"], /800 tok · 4\.1 tok\/s/);
    assert.match(rows["brief"], /stopped early/);
    assert.match(rows["Model load (page load)"], /files 9\.0 s · start-up 20 s/);
  });

  it("ignores events outside a run and notifies subscribers", () => {
    let calls = 0;
    const off = perf.subscribe(() => calls++);
    perf.prep(5);
    perf.addGen({ label: "x", totalMs: 1, ttftMs: null, decodeMs: null, tokens: 0, tokPerSec: null, maxNew: 1, promptChars: 1, stoppedEarly: false });
    assert.equal(perf.finishRun(), null);
    perf.beginRun();
    perf.finishRun();
    off();
    assert.equal(calls, 1);
  });
});
