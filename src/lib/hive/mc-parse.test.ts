import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlan,
  extractHtml,
  fallbackPage,
  guessSubject,
  isUsablePage,
  pageTitle,
  parseBrief,
  repairHtml,
} from "./mc-parse.ts";

describe("parseBrief", () => {
  it("reads the four labelled lines", () => {
    const b = parseBrief(
      "REPLY: I'll build a warm landing page.\nOBJECTIVE: Ceramics studio site\nSTRATEGY: Hero, gallery, contact\nBUILD: yes",
      "Build me a landing page for a ceramics studio",
    );
    assert.equal(b.reply, "I'll build a warm landing page.");
    assert.equal(b.objective, "Ceramics studio site");
    assert.equal(b.strategy, "Hero, gallery, contact");
    assert.equal(b.build, true);
  });

  it("tolerates markdown decoration around labels", () => {
    const b = parseBrief("**REPLY:** Sure thing.\n- BUILD: no", "what is a hero section?");
    assert.equal(b.reply, "Sure thing.");
    assert.equal(b.build, false);
  });

  it("falls back to the prompt when the model ignores the format", () => {
    const b = parseBrief("Happy to help with that!", "Build me a landing page");
    assert.equal(b.reply, "Happy to help with that!");
    assert.equal(b.objective, "Build me a landing page");
    assert.equal(b.build, true);
  });

  it("does not treat a plain question as a build when BUILD is missing", () => {
    assert.equal(parseBrief("", "hello there").build, false);
  });
});

describe("buildPlan", () => {
  it("never exceeds the Li limit and gives distinct objectives", () => {
    const plan = buildPlan(true);
    assert.ok(plan.length <= 26);
    assert.equal(new Set(plan.map((p) => p.objective)).size, plan.length);
    assert.equal(buildPlan(false).length, 1);
  });
});

describe("extractHtml / repairHtml", () => {
  const page = "<!doctype html><html><head><title>Clay & Co</title></head><body><h1>Hi</h1></body></html>";

  it("returns a complete page unchanged", () => {
    assert.equal(extractHtml(page), page);
  });

  it("strips code fences and chatter", () => {
    const out = extractHtml(`Here you go:\n\`\`\`html\n${page}\n\`\`\`\nEnjoy!`);
    assert.equal(out, page);
  });

  it("adds a doctype when missing", () => {
    const out = extractHtml("<html><body>hello</body></html>");
    assert.match(out ?? "", /^<!doctype html>/i);
  });

  it("closes a page truncated mid-tag and mid-style", () => {
    const cut = "<!doctype html><html><head><style>body{color:red} h1{font-size:2r";
    const out = repairHtml(cut);
    assert.match(out, /<\/style>/);
    assert.match(out, /<\/body>\s*<\/html>$/);
  });

  it("drops a half-written tag at the end", () => {
    const out = repairHtml("<!doctype html><html><body><p>Hello</p><div cla");
    assert.ok(!out.includes("<div cla"));
    assert.match(out, /<\/html>$/);
  });

  it("drops an unfinished script instead of shipping broken JS", () => {
    const out = repairHtml("<!doctype html><html><body><p>Hi</p><script>const x = ");
    assert.ok(!out.includes("<script"));
  });

  it("returns null when there is no HTML at all", () => {
    assert.equal(extractHtml("Sorry, I can't do that."), null);
  });
});

describe("isUsablePage / pageTitle", () => {
  it("rejects near-empty pages and accepts real ones", () => {
    assert.equal(isUsablePage("<!doctype html><html><body></body></html>"), false);
    assert.equal(isUsablePage(fallbackPage("landing page for a ceramics studio")), true);
  });

  it("reads the title", () => {
    assert.equal(pageTitle("<title> Clay Studio </title>", "x"), "Clay Studio");
    assert.equal(pageTitle("<p>no title</p>", "x"), "x");
  });
});

describe("guessSubject / fallbackPage", () => {
  it("finds the subject of the request", () => {
    assert.equal(guessSubject("Build me a landing page for a ceramics studio"), "Ceramics Studio");
    assert.equal(guessSubject("Add a waitlist form"), "Your Project");
  });

  it("escapes the subject", () => {
    const html = fallbackPage("page for <script>alert(1)</script>");
    assert.ok(!html.includes("<script>alert"));
  });
});
