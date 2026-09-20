import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allocateSplitters } from "./splitter.ts";
import { estimateSwarm, hrcAllocate } from "./limits.ts";
import { buildSplitterStates, listSplitterIds, splitterOfLi } from "./splitter-state.ts";
import type { LieutenantPlan, LieutenantState } from "./types.ts";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const plans = (n: number, agents = 3): LieutenantPlan[] =>
  Array.from({ length: n }, (_, i) => ({
    letter: LETTERS[i],
    objective: `Track ${LETTERS[i]}`,
    agentCount: agents,
    files: [`f${i}.html`],
  }));

describe("allocateSplitters", () => {
  it("uses one Splitter for one or two Li, more as the work grows", () => {
    for (const [li, expected] of [[1, 1], [2, 1], [3, 2], [5, 3], [10, 5]] as const) {
      const r = allocateSplitters(plans(li));
      assert.ok(r.ok);
      assert.equal(r.splitters.length, expected, `${li} Li`);
    }
  });

  it("never exceeds five Splitters, even with all 26 Li", () => {
    const r = allocateSplitters(plans(26, 25));
    assert.ok(r.ok);
    assert.equal(r.splitters.length, 5);
    assert.equal(r.totalLogicalLis, 26);
    assert.equal(r.totalLogicalAgents, 650);
  });

  it("pauses production on a 27th Li", () => {
    const r = allocateSplitters(plans(27));
    assert.equal(r.ok, false);
    assert.equal(r.paused, true);
  });

  it("puts every Li on exactly one Splitter with unique agent ids", () => {
    const r = allocateSplitters(plans(7, 4));
    assert.ok(r.ok);
    const letters = r.splitters.flatMap((s) => s.lieutenants.map((l) => l.letter)).sort();
    assert.deepEqual(letters, LETTERS.slice(0, 7));
    const ids = r.splitters.flatMap((s) => s.lieutenants.flatMap((l) => l.agents.map((a) => a.id)));
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => /^S\d-Li[A-Z]-A\d+$/.test(id)));
  });

  it("repairs duplicate or invalid Li letters", () => {
    const r = allocateSplitters([
      { letter: "A", objective: "x", agentCount: 1, files: [] },
      { letter: "A", objective: "y", agentCount: 1, files: [] },
      { letter: "?", objective: "z", agentCount: 1, files: [] },
    ]);
    assert.ok(r.ok);
    const letters = r.splitters.flatMap((s) => s.lieutenants.map((l) => l.letter)).sort();
    assert.deepEqual(letters, ["A", "B", "C"]);
  });
});

describe("hrcAllocate", () => {
  it("returns a split allocation that covers the accepted Li", () => {
    const a = hrcAllocate(plans(4));
    assert.ok(a.ok);
    assert.equal(a.lieutenants.length, 4);
    assert.equal(a.splitAllocation.totalLogicalLis, 4);
    assert.ok(a.splitAllocation.splitters.length >= 1 && a.splitAllocation.splitters.length <= 5);
  });

  it("caps agents per Li at 25 and the swarm at 650", () => {
    const a = hrcAllocate(plans(26, 99));
    assert.ok(a.ok);
    assert.ok(a.lieutenants.every((l) => l.agentCount <= 25));
    assert.ok(a.totalAgents <= 650);
  });

  it("pauses on a 27th Li", () => {
    const a = hrcAllocate(plans(27));
    assert.equal(a.ok, false);
  });

  it("the provisional estimate always fits the limits", () => {
    for (const prompt of ["fix a typo", "Build me a landing page", "rebuild the whole platform and then also add auth"]) {
      const a = hrcAllocate(estimateSwarm(prompt));
      assert.ok(a.ok, prompt);
    }
  });
});

const li = (letter: string, splitterId: string, status: LieutenantState["status"], agents = 3): LieutenantState => ({
  letter,
  objective: `Track ${letter}`,
  activity: "",
  agentAllowance: agents,
  permissionGranted: true,
  status,
  splitterId,
  agents: Array.from({ length: agents }, (_, n) => ({
    id: `${letter}${n}`,
    liLetter: letter,
    assignment: "x",
    status: "working" as const,
    ownedFiles: [],
  })),
});

describe("splitter-state", () => {
  const split = allocateSplitters(plans(3));
  assert.ok(split.ok);

  it("maps each Li to its Splitter", () => {
    const m = splitterOfLi(split.splitters);
    assert.equal(m.size, 3);
    assert.equal(m.get("A"), "S1");
    assert.equal(m.get("B"), "S2");
    assert.equal(m.get("C"), "S1");
  });

  it("a Splitter with no Li yet is summoning (loading its model)", () => {
    const s = buildSplitterStates(split.splitters, []);
    assert.deepEqual(s.map((x) => x.status), ["summoning", "summoning"]);
    assert.match(s[0].activity, /Loading 7B model/);
  });

  it("derives working / reviewing / done from its Li", () => {
    const working = buildSplitterStates(split.splitters, [li("A", "S1", "working"), li("C", "S1", "working"), li("B", "S2", "working")]);
    assert.equal(working[0].status, "working");
    assert.match(working[0].activity, /Switching to Li [AC] · 2 Li · 6 agents/);
    assert.match(working[1].activity, /Running Li B · 3 agents/);

    const reviewing = buildSplitterStates(split.splitters, [li("A", "S1", "reviewing"), li("C", "S1", "reviewing"), li("B", "S2", "reviewing")]);
    assert.deepEqual(reviewing.map((x) => x.status), ["reviewing", "reviewing"]);

    const done = buildSplitterStates(split.splitters, [li("A", "S1", "done"), li("C", "S1", "done"), li("B", "S2", "done")]);
    assert.deepEqual(done.map((x) => x.status), ["done", "done"]);
    assert.equal(done[0].activity, "Results returned to MC");
  });

  it("rotates the active Li context as the tick advances", () => {
    const lis = [li("A", "S1", "working"), li("C", "S1", "working"), li("B", "S2", "working")];
    const a = buildSplitterStates(split.splitters, lis, 0)[0].activity;
    const b = buildSplitterStates(split.splitters, lis, 1)[0].activity;
    assert.notEqual(a, b);
  });

  it("lists Splitter ids for status text", () => {
    assert.equal(listSplitterIds(split.splitters), "S1 and S2");
    const one = allocateSplitters(plans(1));
    assert.ok(one.ok);
    assert.equal(listSplitterIds(one.splitters), "S1");
  });
});
