// Single source of truth for Bloomwired brand values used by the injected UI.
// Update the two hex codes here (and the matching --bw-* vars in
// popup/popup.html, plus scripts/make-icons.ps1) to rebrand everything.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GhlShotBrand = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  return {
    primary: "#6366f1",
    accent: "#c052f5",
    gradient: "linear-gradient(135deg,#6366f1,#c052f5)",
    website: "https://bloomwired.com",
    name: "Bloomwired Workflow Screenshotter",
  };
});
