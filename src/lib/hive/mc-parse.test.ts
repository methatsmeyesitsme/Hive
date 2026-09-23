import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildPlan,
  extractHtml,
  isUsablePage,
  looksLikeApp,
  looksLikeBuild,
  pageTitle,
  parseBrief,
  polishHtml,
  repairHtml,
  needsWebResearch,
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
  it("uses real agent counts for builds and no phantom agents for direct answers", () => {
    const build = buildPlan(true);
    assert.deepEqual(build.map((p) => p.agentCount), [1, 1]);
    assert.equal(buildPlan(false).length, 0);
  });
});

describe("buildPlan", () => {
  it("never exceeds the Li limit and gives distinct objectives", () => {
    const plan = buildPlan(true);
    assert.ok(plan.length <= 26);
    assert.equal(new Set(plan.map((p) => p.objective)).size, plan.length);
    assert.equal(buildPlan(false).length, 0);
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
    assert.equal(
      isUsablePage(
        "<!doctype html><html><body><h1>Clay & Fire</h1><p>Hand-thrown pottery for everyday life, made in small batches in our studio.</p></body></html>",
      ),
      true,
    );
  });

  it("reads the title", () => {
    assert.equal(pageTitle("<title> Clay Studio </title>", "x"), "Clay Studio");
    assert.equal(pageTitle("<p>no title</p>", "x"), "x");
  });
});

describe("needsWebResearch", () => {
  it("detects explicit current web research requests", () => {
    assert.equal(needsWebResearch("search the web for the latest Bambu Studio version"), true);
    assert.equal(needsWebResearch("research this online and summarize it"), true);
    assert.equal(needsWebResearch("what is new today in web browsers?"), true);
  });

  it("does not send a normal current-time app request to web search", () => {
    assert.equal(needsWebResearch("make an app that shows the current time"), false);
  });
});

describe("looksLikeApp", () => {
  it("treats tools, clocks, calculators and games as apps", () => {
    assert.equal(looksLikeApp("make a app that shows the current time"), true);
    assert.equal(looksLikeApp("build me a pomodoro timer"), true);
    assert.equal(looksLikeApp("a tip calculator"), true);
    assert.equal(looksLikeApp("create a todo list app"), true);
    assert.equal(looksLikeApp("snake game"), true);
  });
  it("keeps websites and landing pages as pages", () => {
    assert.equal(looksLikeApp("build a landing page for my bakery"), false);
    assert.equal(looksLikeApp("make a website for a ceramics studio"), false);
    assert.equal(looksLikeApp("a portfolio app for photographers"), false);
    assert.equal(looksLikeApp("what is a hero section?"), false);
  });
  it("the request from the bug report is a build request and an app", () => {
    assert.equal(looksLikeBuild("make a app that shows the current time"), true);
    assert.equal(looksLikeApp("make a app that shows the current time"), true);
  });
});

describe("isUsablePage for small apps", () => {
  const clock =
    "<!doctype html><html><body><h1>Clock</h1><div id=\"t\"></div><script>const t=document.getElementById('t');setInterval(()=>{t.textContent=new Date().toLocaleTimeString()},1000);</script></body></html>";
  it("accepts a clock: little text, but a finished script and real markup", () => {
    assert.equal(isUsablePage(clock), true);
  });
  it("still rejects an empty shell, and a script with nothing to act on", () => {
    assert.equal(isUsablePage("<!doctype html><html><body></body></html>"), false);
    assert.equal(
      isUsablePage("<!doctype html><html><body><script>console.log('a long enough script body here');</script></body></html>"),
      false,
    );
  });
  it("rejects a tiny static page with no script", () => {
    assert.equal(isUsablePage("<!doctype html><html><body><h1>Hello there</h1></body></html>"), false);
  });
  it("the repaired output of a cut-off script is not treated as a working app", () => {
    const cut = repairHtml("<!doctype html><html><body><h1>Clock</h1><div id='t'></div><script>const t = doc");
    assert.equal(cut.includes("<script"), false);
    assert.equal(isUsablePage(cut), false);
  });
});

describe("polishHtml", () => {
  it("adds charset, a viewport tag and a reset at the start of the head, ahead of the model's own CSS", () => {
    const out = polishHtml("<!doctype html><html><head><title>T</title><style>body{margin:9px}</style></head><body>x</body></html>");
    assert.match(out, /<head><meta charset="utf-8"><meta name="viewport"[^>]+><style id="hive-base">/);
    assert.ok(out.indexOf("hive-base") < out.indexOf("body{margin:9px}"), "the model's rules come later, so they win");
    assert.match(out, /<title>T<\/title>/);
  });
  it("does not duplicate tags the model already wrote", () => {
    const out = polishHtml(
      '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head><body>x</body></html>',
    );
    assert.equal((out.match(/charset/gi) ?? []).length, 1);
    assert.equal((out.match(/name="viewport"/gi) ?? []).length, 1);
  });
  it("creates a head when the page has none", () => {
    const withHtml = polishHtml("<!doctype html><html><body>x</body></html>");
    assert.match(withHtml, /<html><head>.*<\/head><body>/);
    const bare = polishHtml("<!doctype html><body>x</body>");
    assert.match(bare, /^<!doctype html><head>/i);
  });
  it("leaves the visible text and the title alone", () => {
    const html = "<!doctype html><html><head><title>Clay</title></head><body><h1>Hi there</h1></body></html>";
    assert.equal(pageTitle(polishHtml(html), "x"), "Clay");
    assert.match(polishHtml(html), /<h1>Hi there<\/h1>/);
  });
});
