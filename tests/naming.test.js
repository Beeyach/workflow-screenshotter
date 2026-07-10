const test = require("node:test");
const assert = require("node:assert/strict");
const N = require("../src/naming.js");

test("makeFilename formats name and date", () => {
  assert.equal(
    N.makeFilename("Lead Nurture", new Date(2026, 6, 9)),
    "Lead Nurture_2026-07-09.png"
  );
});

test("makeFilename strips illegal filename characters", () => {
  assert.equal(
    N.makeFilename('A/B: "Test" <v2>?', new Date(2026, 0, 5)),
    "A B Test v2_2026-01-05.png"
  );
});

test("makeFilename falls back to 'workflow' for empty names", () => {
  assert.equal(N.makeFilename("///", new Date(2026, 11, 31)), "workflow_2026-12-31.png");
  assert.equal(N.makeFilename("", new Date(2026, 11, 31)), "workflow_2026-12-31.png");
});

test("makeFilename honours the extension argument", () => {
  assert.equal(
    N.makeFilename("Lead Nurture", new Date(2026, 6, 9), "jpg"),
    "Lead Nurture_2026-07-09.jpg"
  );
});
