import type { LieutenantPlan } from "./types";

/**
 * Pure helpers for the on-device MC. A 0.5B model cannot reliably emit one big
 * JSON object containing a full HTML page, so Hive asks it for two simpler
 * things — a four-line plain-text brief, then raw HTML — and does the
 * structuring here, in code.
 */

export type Brief = {
  reply: string;
  objective: string;
  strategy: string;
  build: boolean;
};

const BUILD_WORDS =
  /\b(build|make|create|design|redesign|landing|website|web ?site|page|site|app|fix|change|add|update|tweak|layout|style|restyle|improve|rewrite)\b/i;

function clean(value: string): string {
  return value
    .replace(/^[\s"'`*_>#-]+|[\s"'`*_]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function field(text: string, name: string): string {
  const m = text.match(new RegExp(`^[\\s*#>_-]*${name}\\s*:\\s*(.+)$`, "im"));
  return m ? clean(m[1]) : "";
}

/** Does the request look like a page/app to build or change (rather than a question)? */
export function looksLikeBuild(prompt: string): boolean {
  return BUILD_WORDS.test(prompt);
}

/** The REPLY line of a model answer, if it wrote one. */
export function replyLine(text: string): string | null {
  const m = text.match(/^[\s*#>_-]*REPLY\s*:\s*(.+)$/im);
  const v = m ? clean(m[1]) : "";
  return v && !/^<.*>$/.test(v) ? v.slice(0, 300) : null;
}

export function parseBrief(text: string, prompt: string): Brief {
  const reply = field(text, "REPLY");
  const objective = field(text, "OBJECTIVE");
  const strategy = field(text, "STRATEGY");
  const buildRaw = field(text, "BUILD").toLowerCase();

  let build: boolean;
  if (buildRaw.startsWith("no")) build = false;
  else if (buildRaw.startsWith("yes")) build = true;
  else build = BUILD_WORDS.test(prompt);

  const hasLabels = Boolean(reply || objective || strategy);
  const looseReply = !hasLabels ? clean(text.split("\n")[0] ?? "") : "";

  return {
    reply: (reply || looseReply || "On it. Hive is starting on this now.").slice(0, 500),
    objective: (objective || prompt.trim()).slice(0, 240) || "Complete the request",
    strategy: (strategy || "Draft the page, then refine structure and styling.").slice(0, 240),
    build,
  };
}

export function buildPlan(build: boolean): LieutenantPlan[] {
  if (!build) {
    return [{ letter: "A", objective: "Answer the request", agentCount: 2, files: [] }];
  }
  return [
    { letter: "A", objective: "Page structure and semantic HTML", agentCount: 3, files: ["index.html"] },
    { letter: "B", objective: "Visual design and responsive CSS", agentCount: 3, files: [] },
    { letter: "C", objective: "Copy and content", agentCount: 2, files: [] },
  ];
}

/** Make a possibly-truncated HTML string into a complete, renderable document. */
export function repairHtml(input: string): string {
  let out = input.trim();

  const close = out.match(/<\/html\s*>/i);
  if (close && close.index !== undefined) {
    out = out.slice(0, close.index + close[0].length);
  } else {
    // Output was cut off by the token limit. Drop a half-written tag, drop an
    // unfinished <script>, close <style>, then close the document.
    const lt = out.lastIndexOf("<");
    const gt = out.lastIndexOf(">");
    if (lt > gt) out = out.slice(0, lt);

    const count = (re: RegExp) => (out.match(re) ?? []).length;
    if (count(/<script[\s>]/gi) > count(/<\/script\s*>/gi)) {
      out = out.slice(0, out.toLowerCase().lastIndexOf("<script"));
    }
    if (count(/<style[\s>]/gi) > count(/<\/style\s*>/gi)) out += "\n</style>";
    if (!/<body[\s>]/i.test(out)) out += "\n</head>\n<body>";
    out += "\n</body>\n</html>";
  }

  if (!/^<!doctype/i.test(out)) out = `<!doctype html>\n${out}`;
  return out;
}

/** Pull an HTML document out of raw model output, or null if there isn't one. */
export function extractHtml(raw: string): string | null {
  let text = raw.trim();

  const fence = text.match(/```(?:html)?[ \t]*\n([\s\S]*?)(?:```|$)/i);
  if (fence && /<(?:!doctype|html|head|body|style|header|main|section|div)/i.test(fence[1])) {
    text = fence[1];
  }

  const start = text.search(/<!doctype html|<html[\s>]/i);
  if (start !== -1) {
    text = text.slice(start);
  } else {
    const alt = text.search(/<head[\s>]|<body[\s>]|<style[\s>]/i);
    if (alt === -1) return null;
    text = text.slice(alt);
  }
  return repairHtml(text);
}

export function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<script[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isUsablePage(html: string): boolean {
  return /<body[\s>]/i.test(html) && visibleText(html.split(/<body[\s>]/i)[1] ?? "").length >= 80;
}

export function pageTitle(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([^<]{1,80})<\/title>/i);
  const t = m ? clean(m[1]) : "";
  return t || fallback;
}
