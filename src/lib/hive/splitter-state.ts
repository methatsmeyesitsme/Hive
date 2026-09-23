import { MODEL_CLASS } from "./constants.ts";
import type { SplitterPlan } from "./splitter.ts";
import type { LieutenantState, SplitterState } from "./types.ts";

/** Li letter -> the independent Splitter context assigned to it. */
export function splitterOfLi(plans: SplitterPlan[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const sp of plans) for (const li of sp.lieutenants) map.set(li.letter, sp.id);
  return map;
}

/** Status of one Splitter, derived from the Li assigned to that context. */
function splitterStatus(lis: LieutenantState[]): SplitterState["status"] {
  if (lis.length === 0) return "summoning";
  if (lis.some((l) => l.status === "failed")) return "failed";
  if (lis.every((l) => l.status === "done")) return "done";
  if (lis.some((l) => l.status === "reviewing") && lis.every((l) => l.status !== "working")) {
    return "reviewing";
  }
  if (lis.some((l) => l.status === "working" || l.status === "reviewing")) return "working";
  return "summoning";
}

function splitterActivity(status: SplitterState["status"], lis: LieutenantState[], tick: number): string {
  const agents = lis.reduce((sum, l) => sum + l.agentAllowance, 0);
  switch (status) {
    case "summoning":
      return lis.length === 0
        ? `Loading ${MODEL_CLASS.splitter} model`
        : `Starting ${lis.length} Li context${lis.length === 1 ? "" : "s"}`;
    case "working": {
      // Show the assigned Li context and its actual agent count.
      const current = lis[Math.abs(tick) % lis.length];
      return lis.length === 1
        ? `Running Li ${current.letter} · ${agents} agents`
        : `Switching to Li ${current.letter} · ${lis.length} Li · ${agents} agents`;
    }
    case "reviewing":
      return `Reviewing ${lis.length} Li report${lis.length === 1 ? "" : "s"}`;
    case "done":
      return "Results returned to MC";
    case "failed":
      return "Stopped";
  }
}

/**
 * The Splitter view of a run: one entry per active 0.5B inference context. `tick`
 * advances during work so the displayed activity remains alive while inference runs.
 */
export function buildSplitterStates(
  plans: SplitterPlan[],
  lieutenants: LieutenantState[],
  tick = 0,
): SplitterState[] {
  return plans.map((plan) => {
    const mine = lieutenants.filter((li) => li.splitterId === plan.id);
    const status = splitterStatus(mine);
    return { id: plan.id, status, activity: splitterActivity(status, mine, tick), lieutenants: mine };
  });
}

/** "S1, S2 and S3" */
export function listSplitterIds(plans: SplitterPlan[]): string {
  const ids = plans.map((p) => p.id);
  if (ids.length <= 1) return ids.join("");
  return `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
}
