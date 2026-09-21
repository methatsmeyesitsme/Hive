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

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function guessSubject(prompt: string): string {
  const m = prompt.match(
    /\b(?:for|of)\s+(?:an?|the|my|our)?\s*([a-z0-9][a-z0-9 '&-]{2,40}?)(?=[.,!?]|\s+(?:with|that|which|using|in|on)\b|$)/i,
  );
  const raw = (m?.[1] ?? "").trim();
  if (!raw) return "Your Project";
  return raw.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Used only when the model's draft is empty or unusable, so the person always
 * gets a working page to iterate on. The reply says so plainly.
 */
export function fallbackPage(prompt: string): string {
  const name = escapeHtml(guessSubject(prompt));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
<style>
  :root { --ink:#231f1c; --paper:#f6f1ea; --accent:#b4532a; --muted:#6d635a; }
  * { box-sizing: border-box; }
  body { margin:0; font:17px/1.6 Georgia, "Times New Roman", serif; color:var(--ink); background:var(--paper); }
  header, section, footer { padding: 56px 24px; max-width: 920px; margin: 0 auto; }
  nav { display:flex; justify-content:space-between; align-items:center; font:600 15px system-ui, sans-serif; }
  nav a { color:var(--ink); text-decoration:none; margin-left:20px; }
  .hero h1 { font-size: clamp(2.4rem, 8vw, 4.2rem); line-height:1.05; margin:.4em 0 .3em; }
  .hero p { max-width: 34em; color:var(--muted); }
  .btn { display:inline-block; margin-top:20px; padding:14px 26px; background:var(--accent); color:#fff; border-radius:999px; text-decoration:none; font:600 15px system-ui, sans-serif; }
  .grid { display:grid; gap:20px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); margin-top:24px; }
  .card { background:#fff; border:1px solid #e4dccf; border-radius:14px; padding:22px; }
  .card h3 { margin:0 0 6px; font-size:1.1rem; }
  footer { color:var(--muted); font:14px system-ui, sans-serif; border-top:1px solid #e4dccf; }
</style>
</head>
<body>
<header>
  <nav><strong>${name}</strong><span><a href="#about">About</a><a href="#offer">What we do</a><a href="#contact">Contact</a></span></nav>
</header>
<section class="hero">
  <h1>${name}</h1>
  <p>Welcome. This is a starting layout for your page. Tell MC what to change and Hive will revise it.</p>
  <a class="btn" href="#contact">Get in touch</a>
</section>
<section id="about">
  <h2>About</h2>
  <p>Say who you are and what you care about in a sentence or two. Clear, specific copy is what makes a landing page work.</p>
</section>
<section id="offer">
  <h2>What we do</h2>
  <div class="grid">
    <div class="card"><h3>First offering</h3><p>Describe your first product or service here.</p></div>
    <div class="card"><h3>Second offering</h3><p>Describe your second product or service here.</p></div>
    <div class="card"><h3>Third offering</h3><p>Describe your third product or service here.</p></div>
  </div>
</section>
<section id="contact">
  <h2>Contact</h2>
  <p>Add how people can reach you: email, a booking link, or a visit address.</p>
</section>
<footer>&copy; ${name}</footer>
</body>
</html>`;
}
