// Single source of truth for Bloomwired brand values used by the injected UI.
// Sampled from bloomwired.io: ink buttons, warm off-white surfaces, and the
// mauve "bloom" accent from the logo mark.
// To rebrand: update here, the --bw-* vars in popup/popup.html, and
// scripts/make-icons.ps1.
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GhlShotBrand = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  return {
    ink: "#14141c",
    inkDeep: "#0f0f16",
    plum: "#5e3e58",
    mauve: "#b48ead",
    blush: "#f5e3e3",
    surface: "#f7f3f6",
    muted: "#3a3545",
    gradient: "linear-gradient(135deg,#14141c,#5e3e58)",
    website: "https://bloomwired.io",
    name: "Bloomwired Workflow Screenshotter",
  };
});
