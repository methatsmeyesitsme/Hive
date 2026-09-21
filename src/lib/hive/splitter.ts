/**
 * Splitter — a logical execution context that role-plays multiple LIs + Agents.
 *
 * HRC decides how many logical Splitter contexts to allocate (1–5).
 * A Splitter context never claims to be a separate physical model; it maintains separate
 * conversation contexts and switches between them (context switching).
 *
 * Logical hierarchy inside one Splitter remains:
 *   Li → Agents → Li reviews → result returned to MC
 */

import { MAX_AGENTS_PER_LI, MAX_LI, MAX_SPLITTERS, LI_LETTERS } from "./constants.ts";
import type { LieutenantPlan } from "./types.ts";

export type LogicalAgent = {
  id: string;
  liLetter: string;
  assignment: string;
  ownedFiles: string[];
};

export type LogicalLi = {
  letter: string;
  objective: string;
  agents: LogicalAgent[];
};

export type SplitterPlan = {
  /** S1 … S5 */
  id: string;
  /** The LIs (and their agents) this Splitter will role-play */
  lieutenants: LogicalLi[];
};

export type SplitAllocation =
  | {
      ok: true;
      paused: false;
      splitters: SplitterPlan[];
      totalLogicalAgents: number;
      totalLogicalLis: number;
    }
  | {
      ok: false;
      paused: true;
      reason: string;
    };

/**
 * HRC's job: turn a list of requested LIs into 1–5 logical Splitter plans.
 *
 * Strategy: pack LIs into Splitters so that each Splitter gets a balanced
 * amount of work. We never create more than MAX_SPLITTERS logical Splitter contexts.
 */
export function allocateSplitters(requested: LieutenantPlan[]): SplitAllocation {
  if (requested.length === 0) {
    return {
      ok: true,
      paused: false,
      splitters: [],
      totalLogicalAgents: 0,
      totalLogicalLis: 0,
    };
  }

  if (requested.length > MAX_LI) {
    return {
      ok: false,
      paused: true,
      reason:
        "A 27th Li was attempted and immediately deleted. Production has been paused for investigation.",
    };
  }

  // Normalize letters and clamp agent counts.
  const used = new Set<string>();
  const normalized: LieutenantPlan[] = [];
  let totalAgents = 0;

  for (const li of requested) {
    let letter = (li.letter || "").slice(0, 1).toUpperCase();
    if (!letter || used.has(letter) || !LI_LETTERS.includes(letter)) {
      const next = LI_LETTERS.find((l) => !used.has(l));
      if (!next) {
        return {
          ok: false,
          paused: true,
          reason:
            "A 27th Li was attempted and immediately deleted. Production has been paused for investigation.",
        };
      }
      letter = next;
    }
    used.add(letter);

    const agentCount = Math.max(
      1,
      Math.min(MAX_AGENTS_PER_LI, Math.floor(li.agentCount || 1)),
    );
    totalAgents += agentCount;
    normalized.push({
      letter,
      objective: li.objective,
      agentCount,
      files: li.files ?? [],
    });
  }

  // Decide how many logical Splitter contexts to use (1–MAX_SPLITTERS).
  // Prefer fewer stronger workers when the job is small.
  const splitterCount = Math.min(
    MAX_SPLITTERS,
    Math.max(1, Math.ceil(normalized.length / 2)),
  );

  // Round-robin pack LIs into Splitters.
  const buckets: LieutenantPlan[][] = Array.from({ length: splitterCount }, () => []);
  normalized.forEach((li, i) => {
    buckets[i % splitterCount].push(li);
  });

  const splitters: SplitterPlan[] = buckets.map((bucket, idx) => {
    const id = `S${idx + 1}`;
    const lieutenants: LogicalLi[] = bucket.map((li) => {
      const agents: LogicalAgent[] = Array.from({ length: li.agentCount }, (_, n) => ({
        id: `${id}-Li${li.letter}-A${n + 1}`,
        liLetter: li.letter,
        assignment: li.objective,
        ownedFiles:
          li.files.length > 0
            ? [li.files[n % li.files.length]]
            : [`work/${li.letter}/${n + 1}`],
      }));
      return {
        letter: li.letter,
        objective: li.objective,
        agents,
      };
    });
    return { id, lieutenants };
  });

  return {
    ok: true,
    paused: false,
    splitters,
    totalLogicalAgents: totalAgents,
    totalLogicalLis: normalized.length,
  };
}

/** System prompt used when a Splitter is acting as a specific Lieutenant. */
export function liSystemPrompt(li: LogicalLi, splitterId: string): string {
  return [
    `You are Lieutenant ${li.letter} inside Splitter ${splitterId} of Hive.`,
    `Your objective: ${li.objective}`,
    `You manage ${li.agents.length} agent(s). Review their work, keep file ownership clean, and return a coherent result to MC.`,
    `Never claim to be MC, HRC, or RO. Never access the web or GitHub directly.`,
    `Only edit files you or your agents own.`,
  ].join(" ");
}

/** System prompt used when a Splitter is acting as a specific Agent. */
export function agentSystemPrompt(agent: LogicalAgent, splitterId: string): string {
  return [
    `You are Agent ${agent.id} inside Splitter ${splitterId} of Hive.`,
    `You report to Lieutenant ${agent.liLetter}.`,
    `Your assignment: ${agent.assignment}`,
    `Owned files: ${agent.ownedFiles.join(", ") || "(none yet)"}`,
    `Do only your assignment. Do not edit files owned by other agents. Do not browse the web or access GitHub.`,
  ].join(" ");
}
