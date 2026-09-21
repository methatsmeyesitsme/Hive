import { escapeHtml, guessSubject } from "./mc-parse.ts";

/**
 * Small models (SmolLM2 135M/360M) cannot reliably write a whole HTML page, and
 * a long generation is what crashed Safari's tab. So for them the model only
 * writes a short "spec" (name, tagline, copy, style) as labelled lines, and this
 * module turns the spec into a finished, responsive page. The spec is embedded
 * in the page so the next request can revise it instead of starting over.
 */

export type SiteStyle = "warm" | "modern" | "dark" | "bright" | "elegant";

export type SiteSpec = {
  name: string;
  tagline: string;
  intro: string;
  about: string;
  services: { title: string; text: string }[];
  cta: string;
  contact: string;
  style: SiteStyle;
};

const STYLES: SiteStyle[] = ["warm", "modern", "dark", "bright", "elegant"];

type Palette = { bg: string; ink: string; muted: string; accent: string; card: string; line: string; serif: boolean };

const PALETTES: Record<SiteStyle, Palette> = {
  warm: { bg: "#f6f1ea", ink: "#231f1c", muted: "#6d635a", accent: "#b4532a", card: "#ffffff", line: "#e4dccf", serif: true },
  modern: { bg: "#f4f6fb", ink: "#12182b", muted: "#5b6478", accent: "#3b5bdb", card: "#ffffff", line: "#dfe4f1", serif: false },
  dark: { bg: "#0d1117", ink: "#e8edf5", muted: "#93a0b4", accent: "#f2b134", card: "#161c26", line: "#263041", serif: false },
  bright: { bg: "#fffdf5", ink: "#1f2937", muted: "#5f6b7a", accent: "#e8590c", card: "#ffffff", line: "#f0e7c8", serif: false },
  elegant: { bg: "#faf8f5", ink: "#1c1917", muted: "#78716c", accent: "#7c5e3c", card: "#ffffff", line: "#e7e0d6", serif: true },
};

const LIMITS = { name: 60, tagline: 120, intro: 240, about: 360, title: 40, text: 160, cta: 30, contact: 120 };

function clean(value: string, max: number): string {
  const v = value
    .replace(/^[\s"'`*_>#-]+|[\s"'`*_]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return v.slice(0, max);
}

/** Placeholders the model may echo back from the instructions, e.g. "<one short line>". */
function isPlaceholder(v: string): boolean {
  return /^<.*>$/.test(v) || /^\[.*\]$/.test(v) || /^\.{2,}$/.test(v);
}

export function defaultSpec(prompt: string): SiteSpec {
  const name = guessSubject(prompt);
  return {
    name,
    tagline: `Welcome to ${name}`,
    intro: "Tell us what you need and we will take care of the rest.",
    about: "Share who you are and what you care about in a sentence or two. Clear, specific copy is what makes a page work.",
    services: [
      { title: "First offering", text: "Describe your first product or service here." },
      { title: "Second offering", text: "Describe your second product or service here." },
      { title: "Third offering", text: "Describe your third product or service here." },
    ],
    cta: "Get in touch",
    contact: "Add an email address, booking link or visit address here.",
    style: "warm",
  };
}

export type SpecPatch = Partial<Omit<SiteSpec, "services">> & {
  services?: ({ title: string; text: string } | undefined)[];
};

/** Read whatever labelled lines the model produced; anything missing is left out. */
export function parseSpec(text: string): SpecPatch {
  const patch: SpecPatch = {};
  const services: ({ title: string; text: string } | undefined)[] = [undefined, undefined, undefined];

  for (const line of text.split("\n")) {
    const m = line.match(/^[\s*#>_\d.)-]*([A-Za-z][A-Za-z0-9 ]{1,10}?)\s*:\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().toUpperCase().replace(/\s+/g, "");
    const raw = m[2].trim();
    if (!raw || isPlaceholder(raw)) continue;

    switch (key) {
      case "NAME":
        patch.name = clean(raw, LIMITS.name);
        break;
      case "TAGLINE":
        patch.tagline = clean(raw, LIMITS.tagline);
        break;
      case "INTRO":
        patch.intro = clean(raw, LIMITS.intro);
        break;
      case "ABOUT":
        patch.about = clean(raw, LIMITS.about);
        break;
      case "CTA":
        patch.cta = clean(raw, LIMITS.cta);
        break;
      case "CONTACT":
        patch.contact = clean(raw, LIMITS.contact);
        break;
      case "STYLE": {
        const s = clean(raw, 20).toLowerCase();
        const hit = STYLES.find((x) => s.includes(x));
        if (hit) patch.style = hit;
        break;
      }
      default: {
        const sm = key.match(/^SERVICE([1-3])$/);
        if (!sm) break;
        const parts = raw.split(/\s+[-–—:]\s+|:\s+/);
        const title = clean(parts[0], LIMITS.title);
        const body = clean(parts.slice(1).join(" - "), LIMITS.text);
        if (title) services[Number(sm[1]) - 1] = { title, text: body };
      }
    }
  }
  if (services.some(Boolean)) patch.services = services;
  return patch;
}

export function mergeSpec(base: SiteSpec, patch: SpecPatch): SiteSpec {
  const pick = (a: string, b: string | undefined) => (b && b.length > 0 ? b : a);
  return {
    name: pick(base.name, patch.name),
    tagline: pick(base.tagline, patch.tagline),
    intro: pick(base.intro, patch.intro),
    about: pick(base.about, patch.about),
    services: base.services.map((s, i) => {
      const p = patch.services?.[i];
      return p ? { title: p.title, text: p.text || s.text } : s;
    }),
    cta: pick(base.cta, patch.cta),
    contact: pick(base.contact, patch.contact),
    style: patch.style ?? base.style,
  };
}

/** How many of the model's fields were usable (for telling the person when it wasn't). */
export function patchSize(patch: SpecPatch): number {
  const scalar = (["name", "tagline", "intro", "about", "cta", "contact", "style"] as const).filter(
    (k) => Boolean(patch[k]),
  ).length;
  return scalar + (patch.services?.filter(Boolean).length ?? 0);
}

export function specToLines(spec: SiteSpec): string {
  return [
    `NAME: ${spec.name}`,
    `TAGLINE: ${spec.tagline}`,
    `INTRO: ${spec.intro}`,
    `ABOUT: ${spec.about}`,
    ...spec.services.map((s, i) => `SERVICE${i + 1}: ${s.title} - ${s.text}`),
    `CTA: ${spec.cta}`,
    `CONTACT: ${spec.contact}`,
    `STYLE: ${spec.style}`,
  ].join("\n");
}

const SPEC_TAG = /<script type="application\/json" id="hive-spec">([\s\S]*?)<\/script>/;

/** Recover the spec from a page this module rendered, or null. */
export function readSpec(html: string): SiteSpec | null {
  const m = html.match(SPEC_TAG);
  if (!m) return null;
  try {
    const s = JSON.parse(m[1]) as SiteSpec;
    if (typeof s.name !== "string" || !Array.isArray(s.services) || s.services.length !== 3) return null;
    if (!STYLES.includes(s.style)) return null;
    return s;
  } catch {
    return null;
  }
}

export function renderSite(spec: SiteSpec): string {
  const p = PALETTES[spec.style];
  const e = escapeHtml;
  const font = p.serif
    ? 'Georgia, "Times New Roman", serif'
    : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const json = JSON.stringify(spec).replace(/</g, "\\u003c");
  const cards = spec.services
    .map((s) => `<div class="card"><h3>${e(s.title)}</h3><p>${e(s.text)}</p></div>`)
    .join("\n    ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(spec.name)}</title>
<style>
  :root { --bg:${p.bg}; --ink:${p.ink}; --muted:${p.muted}; --accent:${p.accent}; --card:${p.card}; --line:${p.line}; }
  * { box-sizing: border-box; }
  body { margin:0; font:17px/1.6 ${font}; color:var(--ink); background:var(--bg); }
  .wrap { max-width: 940px; margin: 0 auto; padding: 0 24px; }
  nav { display:flex; justify-content:space-between; align-items:center; padding:22px 0; font:600 15px system-ui, sans-serif; }
  nav a { color:var(--ink); text-decoration:none; margin-left:20px; }
  .hero { padding: 64px 0 56px; }
  .hero h1 { font-size: clamp(2.4rem, 8vw, 4.2rem); line-height:1.05; margin:0 0 .3em; }
  .hero .tag { font-size:1.25rem; color:var(--accent); margin:0 0 .6em; }
  .hero p { max-width: 34em; color:var(--muted); margin:0; }
  .btn { display:inline-block; margin-top:24px; padding:14px 26px; background:var(--accent); color:#fff; border-radius:999px; text-decoration:none; font:600 15px system-ui, sans-serif; }
  section { padding: 44px 0; border-top:1px solid var(--line); }
  h2 { margin:0 0 .5em; font-size:1.6rem; }
  .grid { display:grid; gap:18px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); margin-top:20px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:22px; }
  .card h3 { margin:0 0 6px; font-size:1.1rem; }
  .card p { margin:0; color:var(--muted); }
  footer { padding:32px 0 48px; color:var(--muted); font:14px system-ui, sans-serif; border-top:1px solid var(--line); }
</style>
</head>
<body>
<div class="wrap">
  <nav><strong>${e(spec.name)}</strong><span><a href="#about">About</a><a href="#offer">What we do</a><a href="#contact">Contact</a></span></nav>
  <header class="hero">
    <h1>${e(spec.name)}</h1>
    <p class="tag">${e(spec.tagline)}</p>
    <p>${e(spec.intro)}</p>
    <a class="btn" href="#contact">${e(spec.cta)}</a>
  </header>
  <section id="about"><h2>About</h2><p>${e(spec.about)}</p></section>
  <section id="offer"><h2>What we do</h2>
    <div class="grid">
    ${cards}
    </div>
  </section>
  <section id="contact"><h2>Contact</h2><p>${e(spec.contact)}</p><a class="btn" href="#contact">${e(spec.cta)}</a></section>
  <footer>&copy; ${e(spec.name)}</footer>
</div>
<script type="application/json" id="hive-spec">${json}</script>
</body>
</html>`;
}

/**
 * Model text (+ the page being revised, if any) -> finished page.
 * `used` is how many fields of the model's answer were usable.
 */
export function siteFromModelOutput(
  prompt: string,
  currentHtml: string | null | undefined,
  modelText: string,
): { html: string; spec: SiteSpec; used: number; revised: boolean } {
  const previous = currentHtml ? readSpec(currentHtml) : null;
  const patch = parseSpec(modelText);
  const spec = mergeSpec(previous ?? defaultSpec(prompt), patch);
  return { html: renderSite(spec), spec, used: patchSize(patch), revised: previous !== null };
}
