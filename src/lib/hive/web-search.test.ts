import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSearchResults } from "./web-search.server.ts";

describe("parseSearchResults", () => {
  it("extracts titles, safe URLs, and snippets from DuckDuckGo HTML", () => {
    const html = `
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fone">Example One</a>
      <a class="result__snippet" href="#">First useful result</a>
      <a class="result__a" href="https://example.com/two">Example Two</a>
      <a class="result__snippet" href="#">Second useful result</a>
    `;
    assert.deepEqual(parseSearchResults(html), [
      { title: "Example One", url: "https://example.com/one", snippet: "First useful result" },
      { title: "Example Two", url: "https://example.com/two", snippet: "Second useful result" },
    ]);
  });

  it("rejects non-http URLs and caps results at five", () => {
    const rows = Array.from({ length: 8 }, (_, i) => {
      const href = i === 0 ? "javascript:alert(1)" : "https://example.com/" + i;
      return '<a class="result__a" href="' + href + '">Result ' + i + '</a>' +
        '<a class="result__snippet" href="#">Snippet ' + i + '</a>';
    }).join("");
    const results = parseSearchResults(rows);
    assert.equal(results.length, 5);
    assert.ok(results.every((r) => /^https?:$/.test(new URL(r.url).protocol)));
  });

  it("deduplicates identical result URLs", () => {
    const html = `
      <a class="result__a" href="https://example.com/a">Same</a>
      <a class="result__snippet" href="#">A</a>
      <a class="result__a" href="https://example.com/a">Same again</a>
      <a class="result__snippet" href="#">B</a>
    `;
    assert.equal(parseSearchResults(html).length, 1);
  });
});
