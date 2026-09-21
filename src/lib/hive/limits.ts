import { LI_LETTERS, MAX_AGENTS_PER_LI, MAX_AGENTS_TOTAL, MAX_LI } from "./constants.ts";
import { allocateSplitters, type SplitAllocation } from "./splitter.ts";
import type { LieutenantPlan } from "./types.ts";

export type Allocation =
  | {
      ok: true;
      paused: false;
      lieutenants: LieutenantPlan[];
      totalAgents: number;
      /** New: physical Splitter plans produced by HRC */
      splitAllocation: SplitAllocation & { ok: true };
    }
  | {
      ok: false;
      paused: true;
      reason: string;
    };

/**
 * HRC allocation. The only legal path to decide swarm size.
 *
 * 1. Validate and clamp the requested LIs (hard 26 Li / 25 agents-per-Li limits).
 * 2. Pack those LIs into 1–5 physical Splitters via allocateSplitters().
 * 3. Reject any attempt at a 27th Li by pausing production.
 */
export function hrcAllocate(requested: LieutenantPlan[]): Allocation {
  if (requested.length > MAX_LI) {
    return {
      ok: false,
      paused: true,
      reason:
        "A 27th Li was attempted and immediately deleted. Production has been paused for investigation.",
    };
  }

  const usedLetters = new Set<string>();
  const lieutenants: LieutenantPlan[] = [];
  let totalAgents = 0;

  for (const li of requested) {
    if (lieutenants.length >= MAX_LI) {
      return {
        ok: false,
        paused: true,
        reason:
          "A 27th Li was attempted and immediately deleted. Production has been paused for investigation.",
      };
    }

    const letter = (li.letter || LI_LETTERS[lieutenants.length] || "A")
      .slice(0, 1)
      .toUpperCase();
    if (usedLetters.has(letter) || !LI_LETTERS.includes(letter)) {
      const next = LI_LETTERS.find((l) => !usedLetters.has(l));
      if (!next) {
        return {
          ok: false,
          paused: true,
          reason:
            "A 27th Li was attempted and immediately deleted. Production has been paused for investigation.",
        };
      }
      usedLetters.add(next);
      const agentCount = clampAgents(li.agentCount, totalAgents);
      totalAgents += agentCount;
      lieutenants.push({
        ...li,
        letter: next,
        agentCount,
      });
      continue;
    }

    usedLetters.add(letter);
    const agentCount = clampAgents(li.agentCount, totalAgents);
    totalAgents += agentCount;
    lieutenants.push({ ...li, letter, agentCount });
  }

  if (totalAgents > MAX_AGENTS_TOTAL) {
    const scaled = scaleToCap(lieutenants);
    if (!scaled.ok) return scaled;
    const split = allocateSplitters(scaled.lieutenants);
    if (!split.ok) {
      return { ok: false, paused: true, reason: split.reason };
    }
    return {
      ok: true,
      paused: false,
      lieutenants: scaled.lieutenants,
      totalAgents: scaled.totalAgents,
      splitAllocation: split,
    };
  }

  const split = allocateSplitters(lieutenants);
  if (!split.ok) {
    return { ok: false, paused: true, reason: split.reason };
  }

  return {
    ok: true,
    paused: false,
    lieutenants,
    totalAgents,
    splitAllocation: split,
  };
}

function clampAgents(requested: number, already: number): number {
  const n = Math.max(1, Math.min(MAX_AGENTS_PER_LI, Math.floor(requested || 1)));
  const remaining = MAX_AGENTS_TOTAL - already;
  return Math.max(0, Math.min(n, remaining));
}

function scaleToCap(lieutenants: LieutenantPlan[]): Allocation {
  let total = lieutenants.reduce((s, l) => s + l.agentCount, 0);
  const scaled = lieutenants.map((l) => ({ ...l }));
  let i = 0;
  while (total > MAX_AGENTS_TOTAL && i < 10_000) {
    const idx = i % scaled.length;
    if (scaled[idx].agentCount > 1) {
      scaled[idx].agentCount -= 1;
      total -= 1;
    }
    i += 1;
  }
  const split = allocateSplitters(scaled);
  if (!split.ok) {
    return { ok: false, paused: true, reason: split.reason };
  }
  return {
    ok: true,
    paused: false,
    lieutenants: scaled,
    totalAgents: total,
    splitAllocation: split,
  };
}

/** Software lock: only one worker may edit a given file at a time. */
export function acquireLock(
  locks: Map<string, { ownerId: string; ownerLabel: string }>,
  path: string,
  ownerId: string,
  ownerLabel: string,
): boolean {
  const current = locks.get(path);
  if (current && current.ownerId !== ownerId) return false;
  locks.set(path, { ownerId, ownerLabel });
  return true;
}

export function releaseLock(
  locks: Map<string, { ownerId: string; ownerLabel: string }>,
  path: string,
  ownerId: string,
): void {
  const current = locks.get(path);
  if (current && current.ownerId === ownerId) locks.delete(path);
}

/**
 * Provisional HRC estimate used before MC's plan returns.
 * Never exceeds hard limits.
 */
export function estimateSwarm(prompt: string): LieutenantPlan[] {
  const text = prompt.toLowerCase();
  // Default to the smallest useful swarm; HRC scales up only when the request warrants it.\n  let liCount = 1;
  if (
    /landing|website|app|dashboard|shop|store|auth|account|full|rebuild/.test(
      text,
    )
  ) {
    liCount = 3;
  }
  if (/and then|also|plus|multi|complex|platform|hive/.test(text)) {
    liCount = Math.min(5, liCount + 1);
  }
  if (/fix|typo|color|copy|tiny|small/.test(text) && prompt.length < 80) {
    liCount = 1;
  }

  const templates: { objective: string; files: string[] }[] = [
    { objective: "Structure, shell, and primary layout", files: ["index.html"] },
    { objective: "Visual design, typography, and motion", files: ["styles"] },
    { objective: "Interactive sections and content modules", files: ["sections"] },
    { objective: "Responsive behavior and polish", files: ["responsive"] },
    { objective: "Edge cases, empty states, and QA fixes", files: ["qa"] },
  ];

  return Array.from({ length: liCount }, (_, i) => {
    const t = templates[i] ?? {
      objective: `Support track ${LI_LETTERS[i]}`,
      files: [`track-${LI_LETTERS[i]}`],
    };
    return {
      letter: LI_LETTERS[i],
      objective: t.objective,
      agentCount: 1,
      files: t.files,
    };
  });
}
