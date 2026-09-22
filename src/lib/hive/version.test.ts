import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APP_VERSION, nextVersion } from "./version.ts";

describe("version", () => {
  it("is written as major.tenth", () => {
    assert.match(APP_VERSION, /^\d+\.\d{1,2}$/);
  });
  it("supports normal tenths and tiny hundredth bumps", () => {
    assert.equal(nextVersion("1.0"), "1.1");
    assert.equal(nextVersion("1.8"), "1.9");
    assert.equal(nextVersion("1.9"), "2.0");
    assert.equal(nextVersion("9.9"), "10.0");
    assert.equal(nextVersion("2.53"), "2.54");
  });
});
