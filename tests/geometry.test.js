const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("../src/geometry.js");

test("computeUnionBounds returns null for empty array", () => {
  assert.equal(G.computeUnionBounds([]), null);
});

test("computeUnionBounds unions two rects", () => {
  const union = G.computeUnionBounds([
    { x: 10, y: 20, width: 30, height: 40 },
    { x: 100, y: 5, width: 50, height: 10 },
  ]);
  assert.deepEqual(union, { x: 10, y: 5, width: 140, height: 55 });
});

test("intersectRects returns overlap", () => {
  const r = G.intersectRects(
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 50, y: 60, width: 100, height: 100 }
  );
  assert.deepEqual(r, { x: 50, y: 60, width: 50, height: 40 });
});

test("intersectRects returns null when disjoint", () => {
  const r = G.intersectRects(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 20, y: 20, width: 10, height: 10 }
  );
  assert.equal(r, null);
});

test("relativeBounds subtracts origin", () => {
  const r = G.relativeBounds({ x: 110, y: 220, width: 5, height: 6 }, { x: 100, y: 200 });
  assert.deepEqual(r, { x: 10, y: 20, width: 5, height: 6 });
});
