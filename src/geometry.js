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

  // scale = content scale factor applied via `translate(...) scale(s)` with
  // transform-origin 0 0: content point p lands at origin + t + s*p.
  function computeTranslate(tile, origin, viewRect, scale) {
    return {
      tx: viewRect.x - origin.x - tile.x * scale,
      ty: viewRect.y - origin.y - tile.y * scale,
    };
  }

  function computeOutputScale(bounds, dpr, maxSide, maxArea) {
    const w = bounds.width * dpr;
    const h = bounds.height * dpr;
    return Math.min(1, maxSide / w, maxSide / h, Math.sqrt(maxArea / (w * h)));
  }

  // Physical px per workflow CSS px the output can afford: the target density,
  // reduced only as far as the browser's canvas side/area caps require.
  function computeEffectiveScale(bounds, targetScale, maxSide, maxArea) {
    return Math.min(
      targetScale,
      maxSide / bounds.width,
      maxSide / bounds.height,
      Math.sqrt(maxArea / (bounds.width * bounds.height))
    );
  }

  // dpr = captured physical px per screen CSS px; contentScale = supersampling
  // scale applied to the canvas during capture; outScale = shrink factor to
  // stay under the browser's max canvas size.
  function computeDrawRects(tile, bounds, viewRect, dpr, contentScale, outScale) {
    return {
      sx: viewRect.x * dpr,
      sy: viewRect.y * dpr,
      sw: tile.width * contentScale * dpr,
      sh: tile.height * contentScale * dpr,
      dx: (tile.x - bounds.x) * contentScale * dpr * outScale,
      dy: (tile.y - bounds.y) * contentScale * dpr * outScale,
      dw: tile.width * contentScale * dpr * outScale,
      dh: tile.height * contentScale * dpr * outScale,
    };
  }

  return {
    computeUnionBounds,
    intersectRects,
    relativeBounds,
    computeTileGrid,
    computeTranslate,
    computeOutputScale,
    computeEffectiveScale,
    computeDrawRects,
  };
});
