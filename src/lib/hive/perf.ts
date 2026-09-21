/**
 * Timing for one Hive run, split by where the time goes:
 *   model load (per page load), prompt prep, inference (prefill / decode),
 *   scheduling pauses (the swarm animation), waiting on the model, integration.
 * Recorded in the browser; shown in the status panel and on `window.__hivePerf`.
 */

export type LoadPerf = {
  /** Which model/backend was loaded, e.g. "Qwen2.5-0.5B wasm/q8". */
  label: string;
  /** Whole load, including fetching the library. */
  totalMs: number;
  /** Fetching Transformers.js itself. */
  libraryMs: number;
  /** Fetching the model files (or reading them from the browser cache). */
  downloadMs: number | null;
  /** Creating the runtime session after the files are in memory. */
  initMs: number | null;
};

export type GenPerf = {
  label: string;
  totalMs: number;
  /** Time to first token = prompt prefill. Null if the runtime could not report it. */
  ttftMs: number | null;
  decodeMs: number | null;
  tokens: number;
  tokPerSec: number | null;
  maxNew: number;
  promptChars: number;
  stoppedEarly: boolean;
};

export type RunPerf = {
  startedAt: number;
  wallMs: number | null;
  prepMs: number;
  gens: GenPerf[];
  /** Swarm-animation pauses that ran while the model was still working (overlapped, free). */
  pacingOverlappedMs: number;
  /** Swarm-animation pauses that ran after the model had finished (added to the wait). */
  pacingAfterMs: number;
  /** Time spent blocked waiting for the model after the animation had caught up. */
  waitModelMs: number;
  /** From the model's answer to "complete". */
  integrateMs: number;
  /** Times the model session was restarted after a runtime failure. */
  recoveries: number;
  load: LoadPerf | null;
};

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

let load: LoadPerf | null = null;
let current: RunPerf | null = null;
let last: RunPerf | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const fn of listeners) fn();
};

export const perf = {
  now,

  recordLoad(l: LoadPerf) {
    load = l;
    emit();
  },

  beginRun() {
    current = {
      startedAt: now(),
      wallMs: null,
      prepMs: 0,
      gens: [],
      pacingOverlappedMs: 0,
      pacingAfterMs: 0,
      waitModelMs: 0,
      integrateMs: 0,
      recoveries: 0,
      load: null,
    };
  },
  prep(ms: number) {
    if (current) current.prepMs += ms;
  },
  addGen(g: GenPerf) {
    current?.gens.push(g);
  },
  pacing(afterModel: boolean, ms: number) {
    if (!current) return;
    if (afterModel) current.pacingAfterMs += ms;
    else current.pacingOverlappedMs += ms;
  },
  waitModel(ms: number) {
    if (current) current.waitModelMs += ms;
  },
  integrate(ms: number) {
    if (current) current.integrateMs += ms;
  },
  recovery() {
    if (current) current.recoveries += 1;
  },

  finishRun(): RunPerf | null {
    if (!current) return null;
    current.wallMs = now() - current.startedAt;
    last = { ...current, load };
    current = null;
    try {
      (globalThis as { __hivePerf?: RunPerf }).__hivePerf = last;
    } catch {
      // read-only global: skip
    }
    emit();
    return last;
  },

  getLast: () => last,
  getLoad: () => load,
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

const sec = (ms: number) => `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;

/** Rows for the status panel: [label, value, indent]. */
export function perfRows(run: RunPerf): [string, string, boolean][] {
  const rows: [string, string, boolean][] = [];
  const inference = run.gens.reduce((s, g) => s + g.totalMs, 0);
  if (run.wallMs !== null) rows.push(["Total", sec(run.wallMs), false]);
  rows.push(["Inference", sec(inference), false]);
  for (const g of run.gens) {
    const parts = [
      g.ttftMs !== null ? `prefill ${sec(g.ttftMs)}` : null,
      g.decodeMs !== null ? `decode ${sec(g.decodeMs)}` : null,
      g.tokens > 0 ? `${g.tokens} tok` : null,
      g.tokPerSec !== null ? `${g.tokPerSec.toFixed(1)} tok/s` : null,
      g.stoppedEarly ? "stopped early" : null,
    ].filter(Boolean);
    rows.push([g.label, `${sec(g.totalMs)}${parts.length ? ` · ${parts.join(" · ")}` : ""}`, true]);
  }
  rows.push(["Prompt prep", `${Math.round(run.prepMs)} ms`, false]);
  rows.push(["Waiting on model", sec(run.waitModelMs), false]);
  rows.push(["Swarm pauses after model", sec(run.pacingAfterMs), false]);
  rows.push(["Integration", sec(run.integrateMs), false]);
  if (run.recoveries > 0) rows.push(["Model restarts", String(run.recoveries), false]);
  if (run.wallMs !== null) rows.push(["Not inference", sec(Math.max(0, run.wallMs - inference)), false]);
  if (run.load) {
    const l = run.load;
    rows.push([
      "Model load (page load)",
      `${sec(l.totalMs)} · library ${sec(l.libraryMs)}${l.downloadMs !== null ? ` · files ${sec(l.downloadMs)}` : ""}${l.initMs !== null ? ` · start-up ${sec(l.initMs)}` : ""}`,
      false,
    ]);
  }
  return rows;
}
