import { runMcTask as runQwen, getAiStatus } from "../src/lib/hive/mc";
import type { McTaskResult } from "../src/lib/hive/types";

/**
 * MC for the static build: on-device Qwen2.5-0.5B-Instruct only.
 * There is no Claude or other API fallback. Inside a claude.ai artifact frame
 * the model download is usually blocked, so the error explains that.
 */

type RunInput = Parameters<typeof runQwen>[0];

const HOSTED_HINT =
  " This claude.ai frame may block the model download from Hugging Face. Open Hive from its own web address (for example GitHub Pages) to run the model.";

const insideClaudeFrame = () =>
  typeof (window as unknown as { claude?: { use?: unknown } }).claude?.use === "function";

export async function runMcTask(input: RunInput): Promise<McTaskResult> {
  const res = await runQwen(input);
  return res.ok || !insideClaudeFrame() ? res : { ...res, error: res.error + HOSTED_HINT };
}

export { getAiStatus };
