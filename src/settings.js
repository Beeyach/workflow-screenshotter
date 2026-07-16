// Shared settings schema + storage helpers (popup and content script).
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GhlShotSettings = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  // Only genuine user preferences live here. Hiding the builder's minimap and
  // zoom controls, and fitting the view before measuring, are always-on
  // requirements for a clean, complete capture — not choices.
  const DEFAULTS = {
    // Physical px per workflow CSS px. 1 keeps the image at the workflow's
    // natural size (and the tile count low); 2-3 are for zooming in or print,
    // at ~4x/9x the tiles and file size.
    targetPixelRatio: 1,
    format: "png", // "png" | "jpeg"
    jpegQuality: 0.92,
  };

  function load() {
    if (typeof chrome === "undefined" || !chrome.storage) {
      return Promise.resolve({ ...DEFAULTS });
    }
    return chrome.storage.sync.get(DEFAULTS);
  }

  function save(values) {
    return chrome.storage.sync.set(values);
  }

  return { DEFAULTS, load, save };
});
