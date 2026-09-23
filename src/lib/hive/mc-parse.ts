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
  projectName: string;
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

const APP_WORDS =
  /\b(app|apps|tool|calculator|clock|timer|stopwatch|countdown|counter|game|tracker|converter|to-?do|checklist|quiz|generator|planner|dashboard|widget|notepad|player|simulator|randomi[sz]er|interactive|interaction|click|button|toggle|input|form)\b/i;
const SITE_WORDS =
  /\b(landing|website|web ?site|homepage|home page|portfolio|blog|store|shop|restaurant|agency|studio|company|business|newsletter)\b/i;

const COMPLEX_BUILD_WORDS =
  /\b(dashboard|e-?commerce|checkout|authentication|auth|login|signup|database|backend|api|multi-?page|multiple pages|real-?time|payments?|accounts?|upload|gallery|search|filter|sorting|drag(?:-and)?-drop)\b/i;

/** Tiny, tightly-scoped builds do not need a separate agent pass; MC can build them directly. */
export function needsAgentPass(prompt: string): boolean {
  const normalized = prompt.trim();
  if (!normalized) return false;
  const words = normalized.split(/\s+/).filter(Boolean).length;
  return words > 28 || normalized.length > 220 || COMPLEX_BUILD_WORDS.test(normalized);
}

const WEB_RESEARCH_WORDS =
  /\b(search (?:the )?(?:web|internet|online)|web search|search online|look up online|research online|research (?:this|that|the latest)|latest news|latest updates|what(?:'s| is) new|today(?:'s|s)|current (?:news|status|version|price|events?|information)|right now)\b/i;

export function needsWebResearch(prompt: string): boolean {
  return WEB_RESEARCH_WORDS.test(prompt);
}

/**
 * Is the request for a small working app (a clock, a calculator, a game) rather than a
 * page to read? Apps need a different prompt: the page has to have working JavaScript,
 * not a hero and four marketing sections.
 */
export function looksLikeApp(prompt: string): boolean {
  return APP_WORDS.test(prompt) && !SITE_WORDS.test(prompt);
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
  const projectName = field(text, "NAME");
  const buildRaw = field(text, "BUILD").toLowerCase();

  let build: boolean;
  if (buildRaw.startsWith("no")) build = false;
  else if (buildRaw.startsWith("yes")) build = true;
  else build = BUILD_WORDS.test(prompt);

  const validName = projectName.split(/\s+/).filter(Boolean).slice(0, 4).join(" ").slice(0, 48);
  const hasLabels = Boolean(reply || objective || strategy);
  const looseReply = !hasLabels ? clean(text.split("\n")[0] ?? "") : "";

  return {
    reply: (reply || looseReply || "On it. Hive is starting on this now.").slice(0, 500),
    objective: (objective || prompt.trim()).slice(0, 240) || "Complete the request",
    strategy: (strategy || "Draft the page, then refine structure and styling.").slice(0, 240),
    projectName: validName || "New Project",
    build,
  };
}

export function buildPlan(build: boolean, prompt?: string): LieutenantPlan[] {
  if (!build || (prompt && !needsAgentPass(prompt))) {
    return [];
  }
  return [
    { letter: "A", objective: "Requirements and implementation behavior", agentCount: 1, files: ["index.html"] },
    { letter: "B", objective: "Visual design and responsive presentation", agentCount: 1, files: [] },
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
  if (!/<body[\s>]/i.test(html)) return false;
  const body = html.split(/<body[\s>]/i)[1] ?? "";
  if (visibleText(body).length >= 80) return true;
  // A small app (a clock, a counter) has little text of its own: the script fills it in.
  // Accept it when it carries a finished script and some real markup to put things in.
  const hasScript = /<script[\s>][\s\S]{20,}?<\/script\s*>/i.test(body);
  const hasInlineInteraction =
    /\bon(?:click|pointerdown|pointerup|change|input|submit)\s*=|addEventListener\s*\(/i.test(body);
  const markup = body.replace(/<script[\s\S]*?<\/script\s*>/gi, "").trim();
  return (hasScript || hasInlineInteraction) && markup.length >= 20;
}

const BASE_CSS =
  "*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.5}img,svg,video,canvas{max-width:100%}button,input,select,textarea{font:inherit}";

/**
 * Give a model-written page the basics a 0.5B model often forgets, so it shows up right
 * on a phone: charset, a viewport tag, and a tiny reset. The reset goes first in the
 * head, so every rule the model wrote still wins. Nothing else is added or changed.
 */
export function polishHtml(html: string): string {
  const extras: string[] = [];
  if (!/<meta[^>]+charset/i.test(html)) extras.push('<meta charset="utf-8">');
  if (!/<meta[^>]+name=["']?viewport/i.test(html)) {
    extras.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  }
  extras.push(`<style id="hive-base">${BASE_CSS}</style>`);
  const inject = extras.join("");

  if (/<head[\s>]/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}${inject}`);
  if (/<html[\s>]/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${inject}</head>`);
  return html.replace(/^(<!doctype[^>]*>)?/i, (m) => `${m}<head>${inject}</head>`);
}

export function pageTitle(html: string, fallback: string): string {
  const m = html.match(/<title[^>]*>([^<]{1,80})<\/title>/i);
  const t = m ? clean(m[1]) : "";
  return t || fallback;
}
