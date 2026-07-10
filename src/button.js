// Floating capture button, auto-injected into the GHL automation builder
// frames via the declared content script in manifest.json.
(function () {
  if (window.__ghlShotButton) return;
  window.__ghlShotButton = true;

  const btn = document.createElement("button");
  btn.id = "ghl-shot-button";
  btn.title = "Capture full workflow screenshot (Alt-click: debug info)";
  btn.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>' +
    '<circle cx="12" cy="13" r="4"/></svg>';
  const baseShadow = "0 4px 14px rgba(124,58,237,0.45)";
  btn.setAttribute(
    "style",
    [
      "position:fixed",
      // Above Vue Flow's minimap (bottom-right corner of the builder).
      "bottom:160px",
      "right:20px",
      "z-index:2147483646",
      "width:48px",
      "height:48px",
      "border-radius:50%",
      "border:none",
      "background:linear-gradient(135deg,#6366f1,#c052f5)",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "cursor:pointer",
      `box-shadow:${baseShadow}`,
      "padding:0",
      "transition:transform 0.15s ease, box-shadow 0.15s ease",
    ].join(";")
  );
  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "scale(1.12)";
    btn.style.boxShadow = "0 6px 20px rgba(124,58,237,0.6)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = baseShadow;
  });
  btn.addEventListener("click", (e) => {
    // Alt-click also downloads a ghl-shot-debug.txt for troubleshooting.
    if (!window.__ghlShotStart) return;
    Promise.resolve(window.__ghlShotStart({ debug: e.altKey })).catch((err) => {
      console.error("[ghl-shot] start failed:", err);
      window.__ghlShotRunning = false;
    });
  });
  document.documentElement.appendChild(btn);
})();
