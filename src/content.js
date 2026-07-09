// Defines the capture entry point; started by src/starter.js (toolbar click)
// or the floating button from src/button.js.
window.__ghlShotStart = async function main() {
  if (window.__ghlShotRunning) return;
  window.__ghlShotRunning = true;

  const G = window.GhlShotGeometry;
  const N = window.GhlShotNaming;
  const overlay = window.GhlShotOverlay;

  // All GHL-DOM-dependent knobs live here (see design spec: selectors are
  // isolated for easy patching when GHL changes its builder).
  const CONFIG = {
    // Selectors tried first when locating the pan/zoom container; tuned in the
    // live-DOM discovery task. The generic heuristic below is the fallback.
    candidateSelectors: [],
    // Floating UI inside the clip area to hide during capture (minimap, zoom
    // buttons); populated during the live-DOM discovery task.
    hideSelectors: [],
    // Optional selector for the workflow-name element; null = use document.title.
    nameSelector: null,
    // Elements larger than this on either axis are ignored when measuring
    // workflow bounds (filters out full-canvas background layers).
    maxNodeSize: 5000,
    // Wait after each pan before capturing so the canvas repaints fully.
    settleMs: 150,
    // Gap between captures; chrome throttles captureVisibleTab at ~2/sec.
    captureDelayMs: 600,
    // Browsers cap canvas dimensions around 16384px; stay under it.
    maxCanvasSide: 16000,
    // Shrink the usable capture area by this many px on every side, so
    // borders/shadows at the clip edge don't bleed into tile seams.
    viewInset: 4,
    // TEMPORARY (live tuning): also download a ghl-shot-debug.txt with
    // overlay-element and header info. Remove once CONFIG is finalized.
    debug: true,
  };

  const state = { cancelled: false };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function nextFrames(n) {
    return new Promise((resolve) => {
      function step(remaining) {
        if (remaining <= 0) return resolve();
        requestAnimationFrame(() => step(remaining - 1));
      }
      step(n);
    });
  }

  function findPanContainer() {
    for (const sel of CONFIG.candidateSelectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // Heuristic fallback: the CSS-transformed element with the most
    // descendants is the pan/zoom layer holding the workflow.
    let best = null;
    let bestCount = 0;
    for (const el of document.querySelectorAll("*")) {
      if (getComputedStyle(el).transform === "none") continue;
      const count = el.querySelectorAll("*").length;
      if (count > bestCount) {
        best = el;
        bestCount = count;
      }
    }
    return bestCount >= 10 ? best : null;
  }

  function findClipRect(container) {
    const viewport = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    let el = container.parentElement;
    while (el && el !== document.body) {
      const style = getComputedStyle(el);
      if (/(hidden|clip|auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY)) {
        const r = el.getBoundingClientRect();
        const clip = G.intersectRects(
          { x: r.left, y: r.top, width: r.width, height: r.height },
          viewport
        );
        if (clip) return clip;
      }
      el = el.parentElement;
    }
    return viewport;
  }

  function measureScreenBounds(container) {
    const rects = [];
    for (const el of container.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width > CONFIG.maxNodeSize || r.height > CONFIG.maxNodeSize) continue;
      rects.push({ x: r.left, y: r.top, width: r.width, height: r.height });
    }
    return G.computeUnionBounds(rects);
  }

  function getWorkflowName() {
    if (CONFIG.nameSelector) {
      const el = document.querySelector(CONFIG.nameSelector);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return document.title;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function collectDebugInfo(container, clipRect) {
    const overlays = [];
    for (const el of document.querySelectorAll("body *")) {
      if (container.contains(el)) continue;
      const st = getComputedStyle(el);
      if (st.position !== "fixed" && st.position !== "sticky" && st.position !== "absolute") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (!G.intersectRects({ x: r.left, y: r.top, width: r.width, height: r.height }, clipRect)) continue;
      if (r.width > clipRect.width * 0.9 && r.height > clipRect.height * 0.9) continue;
      overlays.push({
        tag: el.tagName,
        id: el.id || null,
        cls: String(el.className).slice(0, 140),
        pos: st.position,
        rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      });
      if (overlays.length >= 80) break;
    }
    const headers = [];
    for (const el of document.querySelectorAll('header, [class*="header"], [class*="topbar"], [class*="title"]')) {
      const text = (el.innerText || "").trim().slice(0, 160);
      if (text) headers.push({ tag: el.tagName, id: el.id || null, cls: String(el.className).slice(0, 140), text });
      if (headers.length >= 12) break;
    }
    return { url: location.href, title: document.title, overlays, headers };
  }

  function captureTile() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "GHLSHOT_CAPTURE" }, (res) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!res || !res.ok) return reject(new Error(res ? res.error : "no response"));
        resolve(res.dataUrl);
      });
    });
  }

  async function captureTileWithRetry() {
    try {
      return await captureTile();
    } catch (_err) {
      await sleep(700); // one retry after backing off past the throttle window
      return await captureTile();
    }
  }

  function loadImage(dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    return img.decode().then(() => img);
  }

  const container = findPanContainer();
  if (!container) {
    // The builder lives in a cross-origin iframe on *.leadconnectorhq.com; this
    // script runs in every frame. Only one frame should own the "not found" UX:
    // the automation iframe itself, or a top frame with no embedded GHL app.
    const isAutomationFrame = location.hostname.includes("automation-workflows");
    const hasEmbeddedApp = !!document.querySelector('iframe[src*="leadconnectorhq"]');
    if (isAutomationFrame || (window === window.top && !hasEmbeddedApp)) {
      overlay.toast("GHL Screenshotter: no workflow canvas found — open a workflow first.");
    }
    window.__ghlShotRunning = false;
    return;
  }
  console.log("[ghl-shot] frame:", location.hostname, "| container:", container.tagName,
    container.id || "", String(container.className).slice(0, 100));

  const savedTransform = container.style.transform;
  const savedTransition = container.style.transition;
  const hidden = [];
  let finished = false;

  function restore() {
    if (finished) return;
    finished = true;
    container.style.transform = savedTransform;
    container.style.transition = savedTransition;
    for (const item of hidden) item.el.style.visibility = item.visibility;
    overlay.remove();
    window.__ghlShotRunning = false;
  }

  overlay.show();
  overlay.onCancel(() => {
    state.cancelled = true;
  });

  try {
    // Our own floating button must never appear in the capture.
    const hideTargets = ["#ghl-shot-button"].concat(CONFIG.hideSelectors);
    for (const sel of hideTargets) {
      for (const el of document.querySelectorAll(sel)) {
        hidden.push({ el, visibility: el.style.visibility });
        el.style.visibility = "hidden";
      }
    }

    // Identity transform = 100% zoom, no pan: measure everything from here.
    container.style.transition = "none";
    container.style.transform = "none";
    await nextFrames(2);

    const originRect = container.getBoundingClientRect();
    const origin = { x: originRect.left, y: originRect.top };
    const screenBounds = measureScreenBounds(container);
    if (!screenBounds) throw new Error("workflow appears to be empty.");
    const bounds = G.relativeBounds(screenBounds, origin);

    const rawClip = findClipRect(container);
    const viewRect = {
      x: rawClip.x + CONFIG.viewInset,
      y: rawClip.y + CONFIG.viewInset,
      width: rawClip.width - 2 * CONFIG.viewInset,
      height: rawClip.height - 2 * CONFIG.viewInset,
    };
    if (CONFIG.debug) {
      downloadText("ghl-shot-debug.txt", JSON.stringify(collectDebugInfo(container, rawClip), null, 1));
    }

    // Calibration probe: one throwaway capture to measure the true ratio of
    // captured pixels to this frame's CSS pixels (covers devicePixelRatio AND
    // browser zoom, and verifies capture actually works before panning).
    overlay.setProgress("Calibrating…");
    overlay.hideForCapture();
    await nextFrames(2);
    let probeUrl;
    try {
      probeUrl = await captureTileWithRetry();
    } finally {
      overlay.showAfterCapture();
    }
    const probeImg = await loadImage(probeUrl);
    const dpr = probeImg.width / window.innerWidth;
    await sleep(CONFIG.captureDelayMs);

    const outScale = G.computeOutputScale(bounds, dpr, CONFIG.maxCanvasSide);
    const tiles = G.computeTileGrid(bounds, viewRect.width, viewRect.height);
    console.log("[ghl-shot] bounds:", JSON.stringify(bounds), "| viewRect:", JSON.stringify(viewRect),
      "| dpr:", dpr, "| outScale:", outScale, "| tiles:", tiles.length);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = Math.round(bounds.width * dpr * outScale);
    outCanvas.height = Math.round(bounds.height * dpr * outScale);
    const ctx = outCanvas.getContext("2d");

    if (outScale < 1) {
      overlay.setProgress("Workflow is huge — output will be scaled down to fit browser limits.");
      await sleep(1500);
    }

    for (let i = 0; i < tiles.length; i++) {
      if (state.cancelled) throw new Error("cancelled.");
      const tile = tiles[i];
      overlay.setProgress(`Capturing tile ${i + 1} of ${tiles.length}… (Esc to cancel)`);

      const t = G.computeTranslate(tile, origin, viewRect);
      container.style.transform = `translate(${t.tx}px, ${t.ty}px)`;
      await nextFrames(2);
      await sleep(CONFIG.settleMs);

      overlay.hideForCapture();
      await nextFrames(2);
      let dataUrl;
      try {
        dataUrl = await captureTileWithRetry();
      } finally {
        overlay.showAfterCapture();
      }

      const img = await loadImage(dataUrl);
      const d = G.computeDrawRects(tile, bounds, viewRect, dpr, outScale);
      ctx.drawImage(img, d.sx, d.sy, d.sw, d.sh, d.dx, d.dy, d.dw, d.dh);

      await sleep(CONFIG.captureDelayMs);
    }

    overlay.setProgress("Stitching and saving…");
    const blob = await new Promise((resolve) => outCanvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("failed to encode PNG (image may be too large).");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = N.makeFilename(getWorkflowName(), new Date());
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    restore();
    overlay.toast("Workflow screenshot saved to Downloads.");
  } catch (err) {
    restore();
    overlay.toast(`GHL Screenshotter: ${err.message}`);
  }
};
