(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GhlShotGeometry = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  // All rects are {x, y, width, height} in CSS pixels.

  function computeUnionBounds(rects) {
    if (!rects.length) return null;
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    for (const r of rects) {
      left = Math.min(left, r.x);
      top = Math.min(top, r.y);
      right = Math.max(right, r.x + r.width);
      bottom = Math.max(bottom, r.y + r.height);
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  function intersectRects(a, b) {
    const x = Math.max(a.x, b.x);
    const y = Math.max(a.y, b.y);
    const right = Math.min(a.x + a.width, b.x + b.width);
    const bottom = Math.min(a.y + a.height, b.y + b.height);
    if (right <= x || bottom <= y) return null;
    return { x, y, width: right - x, height: bottom - y };
  }

  function relativeBounds(rect, origin) {
    return { x: rect.x - origin.x, y: rect.y - origin.y, width: rect.width, height: rect.height };
  }

  function computeTileGrid(bounds, tileWidth, tileHeight) {
    const cols = Math.max(1, Math.ceil(bounds.width / tileWidth));
    const rows = Math.max(1, Math.ceil(bounds.height / tileHeight));
    const tiles = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = bounds.x + col * tileWidth;
        const y = bounds.y + row * tileHeight;
        tiles.push({
          col,
          row,
          x,
          y,
          width: Math.min(tileWidth, bounds.x + bounds.width - x),
          height: Math.min(tileHeight, bounds.y + bounds.height - y),
        });
      }
    }
    return tiles;
  }

  function computeTranslate(tile, origin, viewRect) {
    return { tx: viewRect.x - origin.x - tile.x, ty: viewRect.y - origin.y - tile.y };
  }

  function computeOutputScale(bounds, dpr, maxSide) {
    return Math.min(1, maxSide / (bounds.width * dpr), maxSide / (bounds.height * dpr));
  }

  function computeDrawRects(tile, bounds, viewRect, dpr, outScale) {
    return {
      sx: viewRect.x * dpr,
      sy: viewRect.y * dpr,
      sw: tile.width * dpr,
      sh: tile.height * dpr,
      dx: (tile.x - bounds.x) * dpr * outScale,
      dy: (tile.y - bounds.y) * dpr * outScale,
      dw: tile.width * dpr * outScale,
      dh: tile.height * dpr * outScale,
    };
  }

  return {
    computeUnionBounds,
    intersectRects,
    relativeBounds,
    computeTileGrid,
    computeTranslate,
    computeOutputScale,
    computeDrawRects,
  };
});
