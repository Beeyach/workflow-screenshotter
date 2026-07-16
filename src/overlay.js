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
        "background:rgba(20,20,28,0.28)",
        "display:flex",
        "align-items:flex-start",
        "justify-content:center",
        "cursor:progress",
      ].join(";")
    );

    const pill = document.createElement("div");
    pill.setAttribute(
      "style",
      [
        "margin-top:80px",
        "padding:10px 10px 10px 22px",
        "border-radius:999px",
        "background:linear-gradient(135deg,#14141c,#5e3e58)",
        "border:1px solid rgba(180,142,173,0.5)",
        "color:#fff",
        "font:14px/1.4 system-ui,-apple-system,sans-serif",
        "box-shadow:0 6px 24px rgba(20,20,28,0.45)",
        "display:flex",
        "align-items:center",
        "gap:14px",
      ].join(";")
    );

    progressEl = document.createElement("span");
    progressEl.textContent = "Preparing capture…";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.setAttribute(
      "style",
      [
        "padding:5px 14px",
        "border-radius:999px",
        "border:1px solid rgba(255,255,255,0.35)",
        "background:transparent",
        "color:#fff",
        "font:13px/1 system-ui,-apple-system,sans-serif",
        "cursor:pointer",
      ].join(";")
    );
    cancelBtn.addEventListener("mouseenter", () => {
      cancelBtn.style.background = "rgba(255,255,255,0.16)";
    });
    cancelBtn.addEventListener("mouseleave", () => {
      cancelBtn.style.background = "transparent";
    });
    cancelBtn.addEventListener("click", () => {
      if (cancelFn) cancelFn();
    });
    cancelBtn.title = "Cancel capture (Esc)";

    pill.appendChild(progressEl);
    pill.appendChild(cancelBtn);
    overlayEl.appendChild(pill);
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
        "border-radius:999px",
        "background:linear-gradient(135deg,#14141c,#5e3e58)",
        "border:1px solid rgba(180,142,173,0.5)",
        "color:#fff",
        "font:14px/1.4 system-ui,-apple-system,sans-serif",
        "box-shadow:0 4px 16px rgba(20,20,28,0.4)",
      ].join(";")
    );
    el.textContent = message;
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  return { show, setProgress, hideForCapture, showAfterCapture, onCancel, remove, toast };
})();
