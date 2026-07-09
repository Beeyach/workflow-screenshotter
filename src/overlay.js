window.GhlShotOverlay = (function () {
  let overlayEl = null;
  let progressEl = null;
  let cancelFn = null;

  function onKeyDown(e) {
    if (e.key === "Escape" && cancelFn) cancelFn();
  }

  function show() {
    if (overlayEl) return;
    overlayEl = document.createElement("div");
    overlayEl.setAttribute(
      "style",
      [
        "position:fixed",
        "inset:0",
        "z-index:2147483647",
        "background:rgba(0,0,0,0.25)",
        "display:flex",
        "align-items:flex-start",
        "justify-content:center",
        "cursor:progress",
      ].join(";")
    );
    progressEl = document.createElement("div");
    progressEl.setAttribute(
      "style",
      [
        "margin-top:80px",
        "padding:12px 20px",
        "border-radius:8px",
        "background:#111",
        "color:#fff",
        "font:14px/1.4 system-ui,sans-serif",
        "box-shadow:0 4px 16px rgba(0,0,0,0.4)",
      ].join(";")
    );
    progressEl.textContent = "Preparing capture… (Esc to cancel)";
    overlayEl.appendChild(progressEl);
    document.documentElement.appendChild(overlayEl);
    document.addEventListener("keydown", onKeyDown, true);
  }

  function setProgress(text) {
    if (progressEl) progressEl.textContent = text;
  }

  function hideForCapture() {
    if (overlayEl) overlayEl.style.visibility = "hidden";
  }

  function showAfterCapture() {
    if (overlayEl) overlayEl.style.visibility = "visible";
  }

  function onCancel(fn) {
    cancelFn = fn;
  }

  function remove() {
    document.removeEventListener("keydown", onKeyDown, true);
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
    progressEl = null;
    cancelFn = null;
  }

  function toast(message) {
    const el = document.createElement("div");
    el.setAttribute(
      "style",
      [
        "position:fixed",
        "top:16px",
        "left:50%",
        "transform:translateX(-50%)",
        "z-index:2147483647",
        "padding:10px 18px",
        "border-radius:8px",
        "background:#111",
        "color:#fff",
        "font:14px/1.4 system-ui,sans-serif",
        "box-shadow:0 4px 16px rgba(0,0,0,0.4)",
      ].join(";")
    );
    el.textContent = message;
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  return { show, setProgress, hideForCapture, showAfterCapture, onCancel, remove, toast };
})();
