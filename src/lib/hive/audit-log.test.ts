import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUDIT_LIMIT,
  auditDurationMs,
  closeOpenAudits,
  hasOpenAudit,
  logAudits,
} from "./audit-log.ts";
import type { AuditEvent } from "./types.ts";

const ev = (id: string, at: number, actor = "MC"): AuditEvent => ({ id, at, actor, action: id });

describe("logAudits", () => {
  it("a new step closes the previous step at the moment the new one begins", () => {
    let log = logAudits([], [ev("a", 1_000)]);
    assert.equal(log[0].endedAt, undefined, "the newest step is still running");
    log = logAudits(log, [ev("b", 3_500)]);
    assert.equal(log[1].id, "a");
    assert.equal(log[1].endedAt, 3_500);
    assert.equal(auditDurationMs(log[1], 99_999), 2_500);
    assert.equal(log[0].endedAt, undefined);
  });

  it("keeps the order events were given in, newest batch first", () => {
    const log = logAudits(logAudits([], [ev("old", 1)]), [ev("x", 5), ev("y", 5)]);
    assert.deepEqual(
      log.map((e) => e.id),
      ["x", "y", "old"],
    );
  });

  it("a running step's timer grows with the clock", () => {
    const [running] = logAudits([], [ev("a", 1_000)]);
    assert.equal(auditDurationMs(running, 1_400), 400);
    assert.equal(auditDurationMs(running, 61_000), 60_000);
  });

  it("a final event closes everything, including itself", () => {
    let log = logAudits([], [ev("a", 1_000)]);
    log = logAudits(log, [ev("b", 2_000)]);
    log = logAudits(log, [ev("done", 9_000)], "final");
    assert.equal(hasOpenAudit(log), false);
    assert.equal(log.find((e) => e.id === "b")?.endedAt, 9_000);
    assert.equal(auditDurationMs(log[0], 1_000_000), 0);
  });

  it("an instant event is born finished and leaves the running step alone", () => {
    let log = logAudits([], [ev("work", 1_000)]);
    log = logAudits(log, [ev("Memory: x", 2_000, "RO")], "instant");
    assert.equal(log[0].endedAt, 2_000);
    assert.equal(log[1].id, "work");
    assert.equal(log[1].endedAt, undefined, "the step that was running keeps running");
  });

  it("never lets an end time fall before the start time", () => {
    const log = logAudits([ev("late", 5_000)], [ev("early", 4_000)]);
    assert.equal(log[1].endedAt, 5_000);
    assert.equal(auditDurationMs(log[1], 0), 0);
  });

  it("caps the log", () => {
    let log: AuditEvent[] = [];
    for (let i = 0; i < AUDIT_LIMIT + 20; i++) log = logAudits(log, [ev(`e${i}`, i)]);
    assert.equal(log.length, AUDIT_LIMIT);
    assert.equal(log[0].id, `e${AUDIT_LIMIT + 19}`);
  });
});

describe("closeOpenAudits", () => {
  it("stops the timers of an abandoned run and does not touch finished entries", () => {
    const finished = { ...ev("f", 1), endedAt: 2 };
    const log = closeOpenAudits([ev("open", 10), finished], 500);
    assert.equal(log[0].endedAt, 500);
    assert.equal(log[1].endedAt, 2);
    assert.equal(hasOpenAudit(log), false);
  });
  it("returns the same array when nothing is open", () => {
    const log = [{ ...ev("f", 1), endedAt: 2 }];
    assert.equal(closeOpenAudits(log, 9), log);
  });
});
