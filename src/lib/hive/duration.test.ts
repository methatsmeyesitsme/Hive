import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDuration } from "./duration.ts";

describe("formatDuration", () => {
  it("shows tenths of a second under ten seconds", () => {
    assert.equal(formatDuration(0), "0.0 s");
    assert.equal(formatDuration(349), "0.3 s");
    assert.equal(formatDuration(9_999), "9.9 s");
  });
  it("shows whole seconds under a minute", () => {
    assert.equal(formatDuration(10_000), "10 s");
    assert.equal(formatDuration(59_999), "59 s");
  });
  it("shows minutes and seconds, then hours", () => {
    assert.equal(formatDuration(60_000), "1m 00s");
    assert.equal(formatDuration(125_400), "2m 05s");
    assert.equal(formatDuration(3_720_000), "1h 02m");
  });
  it("never goes negative or NaN", () => {
    assert.equal(formatDuration(-5), "0.0 s");
    assert.equal(formatDuration(Number.NaN), "0.0 s");
  });
});
