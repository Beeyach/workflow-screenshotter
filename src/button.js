// Floating capture button, auto-injected into the GHL automation builder
// frames via the declared content script in manifest.json.
(function () {
  if (window.__ghlShotButton) return;
  window.__ghlShotButton = true;

  const btn = document.createElement("button");
  btn.textContent = "\u{1F4F8}";
  btn.id = "ghl-shot-button";
  btn.title = "Capture full workflow screenshot";
  btn.setAttribute(
    "style",
    [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "z-index:2147483646",
      "width:44px",
      "height:44px",
      "border-radius:50%",
      "border:none",
      "background:#111",
      "font-size:20px",
      "line-height:44px",
      "text-align:center",
      "cursor:pointer",
      "box-shadow:0 4px 12px rgba(0,0,0,0.35)",
      "padding:0",
    ].join(";")
  );
  btn.addEventListener("click", () => {
    if (window.__ghlShotStart) window.__ghlShotStart();
  });
  document.documentElement.appendChild(btn);
})();
