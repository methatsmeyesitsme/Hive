import type { AuditEvent } from "./types";

/**
 * The "Recent activity" log, with a duration for every entry.
 *
 * An entry is a *step* of the run: it starts when it is logged and ends when the next
 * step begins, or when the run stops (finished, failed, cancelled, frozen). While a
 * step is still going, `endedAt` is missing and the panel shows a live, growing timer.
 * One-off facts (a memory saved, GitHub connected) are *instant*: they are born
 * finished and never disturb the step that is running.
 */

export const AUDIT_LIMIT = 80;

/** How a batch of new entries relates to the entries that are still open. */
export type AuditMode =
  /** A new step: it closes the previous open steps and stays open itself. */
  | "step"
  /** A one-off fact: born finished, leaves open steps alone. */
  | "instant"
  /** The run is over: closes every open step and is born finished. */
  | "final";

function closeAll(events: AuditEvent[], at: number): AuditEvent[] {
  return events.map((e) => (e.endedAt === undefined ? { ...e, endedAt: Math.max(at, e.at) } : e));
}

/**
 * `events` go on top of the log in the order given (like the old
 * `[audit(a), audit(b), ...audits]`). The log is capped at `AUDIT_LIMIT`.
 */
export function logAudits(
  existing: AuditEvent[],
  events: AuditEvent[],
  mode: AuditMode = "step",
): AuditEvent[] {
  if (events.length === 0) return existing;
  const at = Math.min(...events.map((e) => e.at));
  const older = mode === "instant" ? existing : closeAll(existing, at);
  const fresh =
    mode === "step"
      ? events
      : events.map((e) => (e.endedAt === undefined ? { ...e, endedAt: e.at } : e));
  return [...fresh, ...older].slice(0, AUDIT_LIMIT);
}

/** Stop every running timer, e.g. when a run is abandoned by switching project or logging out. */
export function closeOpenAudits(existing: AuditEvent[], at: number = Date.now()): AuditEvent[] {
  return existing.some((e) => e.endedAt === undefined) ? closeAll(existing, at) : existing;
}

export function hasOpenAudit(events: AuditEvent[]): boolean {
  return events.some((e) => e.endedAt === undefined);
}

/** How long an entry took, or has taken so far when it is still running. */
export function auditDurationMs(event: AuditEvent, now: number): number {
  return Math.max(0, (event.endedAt ?? now) - event.at);
}
