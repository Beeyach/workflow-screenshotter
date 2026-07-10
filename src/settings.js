// Shared settings schema + storage helpers (popup and content script).
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GhlShotSettings = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  const DEFAULTS = {
    // Physical px per workflow CSS px. 2 = sharp, 3 = sharpest (slower).
    targetPixelRatio: 2,
    format: "png", // "png" | "jpeg"
    jpegQuality: 0.92,
    // Hide the builder's minimap/zoom controls so they aren't baked in.
    hideBuilderUi: true,
    // Zoom-to-fit first so off-screen nodes render (needed for big workflows).
    fitBeforeCapture: true,
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
