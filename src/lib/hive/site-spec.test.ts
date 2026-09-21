import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSpec,
  mergeSpec,
  parseSpec,
  patchSize,
  readSpec,
  renderSite,
  siteFromModelOutput,
  specToLines,
} from "./site-spec.ts";

const GOOD = `NAME: Clay & Fire Studio
TAGLINE: Hand-thrown pottery for everyday life
INTRO: Small-batch mugs, bowls and vases made in our studio.
ABOUT: We are a two-person ceramics studio.
SERVICE1: Classes - Weekly wheel-throwing for beginners
SERVICE2: Custom orders - Dinner sets made to match your table
SERVICE3: Gift cards - Give someone a class
CTA: Book a class
CONTACT: hello@clayfire.example
STYLE: warm`;

describe("parseSpec", () => {
  it("reads every labelled line", () => {
    const p = parseSpec(GOOD);
    assert.equal(p.name, "Clay & Fire Studio");
    assert.equal(p.services?.[1]?.title, "Custom orders");
    assert.equal(p.services?.[1]?.text, "Dinner sets made to match your table");
    assert.equal(p.style, "warm");
    assert.equal(patchSize(p), 10);
  });

  it("tolerates numbering, bullets, bold and lower case labels", () => {
    const p = parseSpec("1. **Name:** Pine & Co\n- tagline: Fresh every day\n3) Style: Dark and moody");
    assert.equal(p.name, "Pine & Co");
    assert.equal(p.tagline, "Fresh every day");
    assert.equal(p.style, "dark");
  });

  it("ignores placeholders, chatter and unknown styles", () => {
    const p = parseSpec("Sure! Here you go:\nNAME: <business name>\nTAGLINE: ...\nSTYLE: neon\nRANDOM: x");
    assert.deepEqual(p, {});
    assert.equal(patchSize(p), 0);
  });

  it("caps very long values", () => {
    const p = parseSpec(`ABOUT: ${"word ".repeat(200)}`);
    assert.ok((p.about ?? "").length <= 360);
  });
});

describe("mergeSpec / defaults", () => {
  it("fills gaps from the defaults and keeps what the model gave", () => {
    const base = defaultSpec("Build me a landing page for a ceramics studio");
    assert.equal(base.name, "Ceramics Studio");
    const merged = mergeSpec(base, parseSpec("TAGLINE: Made by hand\nSERVICE2: Classes - Weekly"));
    assert.equal(merged.tagline, "Made by hand");
    assert.equal(merged.services[1].title, "Classes");
    assert.equal(merged.services[0].title, "First offering");
    assert.equal(merged.name, "Ceramics Studio");
  });
});

describe("renderSite / readSpec", () => {
  it("renders a complete responsive page", () => {
    const html = renderSite(mergeSpec(defaultSpec("x"), parseSpec(GOOD)));
    assert.match(html, /^<!doctype html>/);
    assert.match(html, /name="viewport"/);
    assert.match(html, /<h1>Clay &amp; Fire Studio<\/h1>/);
    assert.match(html, /Book a class/);
    assert.ok(html.length < 12_000);
  });

  it("escapes markup from the model", () => {
    const spec = { ...defaultSpec("x"), name: '<script>alert(1)</script>', about: '"><img src=x onerror=alert(1)>' };
    const html = renderSite(spec);
    assert.ok(!html.includes("<script>alert(1)"));
    assert.ok(!html.includes("<img src=x"));
    assert.ok(!/<\/script>[\s\S]*<\/script>[\s\S]*<\/script>/.test(html));
  });

  it("round-trips the embedded spec", () => {
    const spec = mergeSpec(defaultSpec("x"), parseSpec(GOOD));
    assert.deepEqual(readSpec(renderSite(spec)), spec);
    assert.equal(readSpec("<html><body>plain</body></html>"), null);
  });

  it("survives a hostile </script> in a field", () => {
    const spec = { ...defaultSpec("x"), contact: "</script><b>x" };
    assert.deepEqual(readSpec(renderSite(spec)), spec);
  });

  it("every style renders", () => {
    for (const style of ["warm", "modern", "dark", "bright", "elegant"] as const) {
      assert.match(renderSite({ ...defaultSpec("x"), style }), /--accent:#/);
    }
  });
});

describe("siteFromModelOutput", () => {
  it("builds a fresh site from the model's lines", () => {
    const r = siteFromModelOutput("Build a site for a ceramics studio", null, GOOD);
    assert.equal(r.revised, false);
    assert.equal(r.used, 10);
    assert.match(r.html, /Clay &amp; Fire Studio/);
  });

  it("revises the previous page: only changed fields move", () => {
    const first = siteFromModelOutput("p", null, GOOD);
    const second = siteFromModelOutput("make it dark", first.html, "STYLE: dark");
    assert.equal(second.revised, true);
    assert.equal(second.spec.style, "dark");
    assert.equal(second.spec.name, "Clay & Fire Studio");
    assert.match(second.html, /#0d1117/);
  });

  it("falls back to defaults when the model says nothing useful", () => {
    const r = siteFromModelOutput("Build a landing page for a bakery", null, "I cannot help with that.");
    assert.equal(r.used, 0);
    assert.equal(r.spec.name, "Bakery");
    assert.match(r.html, /<h1>Bakery<\/h1>/);
  });

  it("specToLines feeds back into parseSpec", () => {
    const spec = mergeSpec(defaultSpec("x"), parseSpec(GOOD));
    assert.deepEqual(mergeSpec(defaultSpec("y"), parseSpec(specToLines(spec))), spec);
  });
});
