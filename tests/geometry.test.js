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

test("computeTileGrid covers bounds with clipped edge tiles", () => {
  const tiles = G.computeTileGrid({ x: 5, y: 7, width: 250, height: 120 }, 100, 100);
  assert.equal(tiles.length, 6); // 3 cols x 2 rows
  assert.deepEqual(tiles[0], { col: 0, row: 0, x: 5, y: 7, width: 100, height: 100 });
  // last column is clipped to 50 wide, last row to 20 tall
  assert.deepEqual(tiles[5], { col: 2, row: 1, x: 205, y: 107, width: 50, height: 20 });
});

test("computeTileGrid emits a single tile when bounds fit", () => {
  const tiles = G.computeTileGrid({ x: 0, y: 0, width: 80, height: 90 }, 100, 100);
  assert.equal(tiles.length, 1);
  assert.deepEqual(tiles[0], { col: 0, row: 0, x: 0, y: 0, width: 80, height: 90 });
});

test("computeTranslate maps tile origin onto viewRect origin", () => {
  // container origin sits at screen (300, 150); view rect starts at (280, 100).
  // To show tile point (1000, 2000) at the view origin, the container must move
  // to (280 - 1000, 100 - 2000) relative to its origin position.
  const t = G.computeTranslate({ x: 1000, y: 2000 }, { x: 300, y: 150 }, { x: 280, y: 100 }, 1);
  assert.deepEqual(t, { tx: 280 - 300 - 1000, ty: 100 - 150 - 2000 });
});

test("computeTranslate accounts for content scale", () => {
  // At scale 2 (transform-origin 0 0), content point p lands at origin + t + 2p,
  // so t must subtract the SCALED tile position.
  const t = G.computeTranslate({ x: 1000, y: 2000 }, { x: 300, y: 150 }, { x: 280, y: 100 }, 2);
  assert.deepEqual(t, { tx: 280 - 300 - 2000, ty: 100 - 150 - 4000 });
});

test("computeOutputScale is 1 when within cap", () => {
  assert.equal(G.computeOutputScale({ width: 4000, height: 3000 }, 2, 16000), 1);
});

test("computeOutputScale shrinks oversized bounds", () => {
  // 20000 * 2 = 40000 device px wide -> scale 16000/40000 = 0.4
  assert.equal(G.computeOutputScale({ width: 20000, height: 1000 }, 2, 16000), 0.4);
});

test("computeDrawRects computes source crop and destination", () => {
  const tile = { x: 105, y: 107, width: 50, height: 20 };
  const bounds = { x: 5, y: 7, width: 250, height: 120 };
  const viewRect = { x: 280, y: 100, width: 100, height: 100 };
  const d = G.computeDrawRects(tile, bounds, viewRect, 2, 1, 0.5);
  assert.deepEqual(d, {
    sx: 560, sy: 200, sw: 100, sh: 40,      // viewRect and tile size at dpr 2
    dx: 100, dy: 100, dw: 50, dh: 20,       // (tile - bounds origin) * dpr * outScale
  });
});

test("computeDrawRects accounts for content scale (supersampling)", () => {
  const tile = { x: 105, y: 107, width: 50, height: 20 };
  const bounds = { x: 5, y: 7, width: 250, height: 120 };
  const viewRect = { x: 280, y: 100, width: 100, height: 100 };
  const d = G.computeDrawRects(tile, bounds, viewRect, 2, 3, 1);
  assert.deepEqual(d, {
    sx: 560, sy: 200,                        // screen position: dpr only
    sw: 300, sh: 120,                        // tile content px * scale 3 * dpr 2
    dx: 600, dy: 600, dw: 300, dh: 120,      // (tile - bounds) * scale * dpr * outScale
  });
});
