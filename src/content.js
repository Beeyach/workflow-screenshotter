// Defines the capture entry point; started by src/starter.js (toolbar click)
// or the floating button from src/button.js.
window.__ghlShotStart = async function main(opts) {
  if (window.__ghlShotRunning) return;
  window.__ghlShotRunning = true;
  const runDebug = !!(opts && opts.debug);

  const G = window.GhlShotGeometry;
  const N = window.GhlShotNaming;
  const overlay = window.GhlShotOverlay;
  const settings = await window.GhlShotSettings.load();

  // All GHL-DOM-dependent knobs live here (see design spec: selectors are
  // isolated for easy patching when GHL changes its builder).
  const CONFIG = {
    // GHL's builder is Vue Flow. The zoom/pan transform lives on the
    // TRANSFORMATION PANE, not on its .vue-flow__viewport parent — overriding
    // the parent leaves the canvas at its current zoom. The generic heuristic
    // below is the fallback if GHL restructures.
    candidateSelectors: [".vue-flow__transformationpane", ".vue-flow__viewport"],
    // Floating UI inside the clip area to hide during capture. All of GHL's
    // builder chrome (minimap, zoom controls, +Add, shortcuts) are panels.
    hideSelectors: [".vue-flow__panel"],
    // The editable workflow-name heading in the builder header.
    nameSelector: "#cmp-header__txt--edit-workflow-name",
    // The builder's own zoom-to-fit control (last button in this panel).
    // Clicking it forces Vue Flow to render every node (it virtualizes
    // off-screen nodes, which would otherwise be missing from the capture).
    fitPanelSelector: ".vue-flow__panel.bottom.left",
    // Wait after zoom-to-fit for all nodes to render.
    fitSettleMs: 400,
    // Vue Flow's node elements — the authoritative extent of the workflow.
    nodeSelector: ".vue-flow__node",
    // Breathing room around the outermost nodes, in workflow CSS px.
    boundsPadding: 40,
    // Fallback scan only: elements larger than this on either axis are ignored
    // when measuring workflow bounds (filters out full-canvas background layers).
    maxNodeSize: 5000,
    // Wait after each pan before capturing so the canvas repaints fully.
    settleMs: 150,
    // Gap between captures; chrome throttles captureVisibleTab at ~2/sec.
    captureDelayMs: 600,
    // Chrome canvas caps: ~32767px per side and ~16384x16384 total area.
    // Stay just under; density degrades only when a workflow exceeds these.
    maxCanvasSide: 32000,
    maxCanvasArea: 16384 * 16384,
    // Shrink the usable capture area by this many px on every side, so
    // borders/shadows at the clip edge don't bleed into tile seams.
    viewInset: 16,
    // Target physical pixels per workflow CSS pixel in the output. When the
    // screen delivers less (browser zoomed out / low-DPI display), the canvas
    // is scaled UP during capture so text stays crisp. User-configurable.
    targetPixelRatio: settings.targetPixelRatio,
    // Upper bound for that supersampling scale. Tile count grows with the
    // square of this, so it trades capture time for zoomed-out-screen support:
    // 6 keeps full sharpness down to ~33% browser zoom on a 1x display.
    maxCaptureScale: Math.max(6, settings.targetPixelRatio),
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

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }

  // Measure the workflow in CANVAS coordinates, straight from each node's own
  // `translate(x, y)` and its unscaled offsetWidth/Height. Screen rects would
  // be multiplied by whatever zoom the builder happens to be at; these values
  // are zoom-independent, so the bounds are always the workflow's true size.
  function measureNodeBounds(container) {
    const rects = [];
    for (const el of container.querySelectorAll(CONFIG.nodeSelector)) {
      const pos = G.parseTranslate(el.style.transform || getComputedStyle(el).transform);
      if (!pos) continue;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (!width || !height) continue;
      rects.push({ x: pos.x, y: pos.y, width, height });
    }
    const union = G.computeUnionBounds(rects);
    if (!union) return null;
    const p = CONFIG.boundsPadding;
    return { x: union.x - p, y: union.y - p, width: union.width + 2 * p, height: union.height + 2 * p };
  }

  function measureScreenBounds(container) {
    const rects = [];
    for (const el of container.querySelectorAll("*")) {
      const r = rectOf(el);
      if (r.width === 0 || r.height === 0) continue;
      if (r.width > CONFIG.maxNodeSize || r.height > CONFIG.maxNodeSize) continue;
      rects.push(r);
    }
    return G.computeUnionBounds(rects);
  }

  // Why bounds came out the way they did — written into the alt-click dump.
  function measureDiagnostics(container) {
    const all = [...container.querySelectorAll("*")];
    const biggest = all
      .map((el) => ({ el, r: rectOf(el) }))
      .sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)
      .slice(0, 6)
      .map(({ el, r }) => ({
        tag: el.tagName,
        cls: String(el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 60),
        w: Math.round(r.width),
        h: Math.round(r.height),
      }));
    const nodes = [...container.querySelectorAll(CONFIG.nodeSelector)];
    let zeroSized = 0;
    const details = nodes.map((el) => {
      const r = rectOf(el);
      if (r.width === 0 || r.height === 0) zeroSized++;
      const st = getComputedStyle(el);
      return {
        inlineTransform: (el.style.transform || "").slice(0, 48),
        offset: { w: el.offsetWidth, h: el.offsetHeight },
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        display: st.display,
        visibility: st.visibility,
        contentVisibility: st.contentVisibility,
      };
    });
    return {
      containerCls: String(container.className).slice(0, 80),
      descendantCount: all.length,
      nodeSelector: CONFIG.nodeSelector,
      nodeCount: nodes.length,
      zeroSizedNodes: zeroSized,
      // Does the builder's own minimap know about more nodes than the DOM has?
      minimapNodeCount: document.querySelectorAll(".vue-flow__minimap-node").length,
      nodeDetails: details.slice(0, 40),
      biggestDescendants: biggest,
      nodeBounds: measureNodeBounds(container),
      heuristicBounds: measureScreenBounds(container),
    };
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
        if (!res || !res.ok) {
          const msg = res ? res.error : "no response";
          // Chrome only grants screenshot access when the user invokes the
          // extension from the toolbar; an in-page button doesn't count.
          if (/all_urls|activeTab|permission/i.test(msg)) {
            return reject(
              new Error(
                "click the toolbar icon and press Capture (or turn on one-click capture there)."
              )
            );
          }
          return reject(new Error(msg));
        }
        resolve(res.dataUrl);
      });
    });
  }

  async function captureTileWithRetry() {
    try {
      return await captureTile();
    } catch (err) {
      // A missing permission will never fix itself; only retry throttle errors.
      if (/toolbar icon/.test(err.message)) throw err;
      await sleep(700); // one retry after backing off past the throttle window
      return await captureTile();
    }
  }

  function loadImage(dataUrl) {
    const img = new Image();
    img.src = dataUrl;
    return img.decode().then(() => img);
  }

  async function fitView() {
    const panel = document.querySelector(CONFIG.fitPanelSelector);
    if (!panel) return false;
    const buttons = panel.querySelectorAll("button, [role='button']");
    const target = buttons.length ? buttons[buttons.length - 1] : panel.lastElementChild;
    if (!target) return false;
    target.click();
    await nextFrames(2);
    await sleep(CONFIG.fitSettleMs);
    return true;
  }

  // Vue Flow ANIMATES fit-view, re-writing the transform every frame for a
  // while. Anything we set during that window gets overwritten — so wait
  // until the computed transform holds still before touching it.
  async function waitForStableTransform(el, timeoutMs) {
    let last = getComputedStyle(el).transform;
    let stable = 0;
    const start = performance.now();
    while (performance.now() - start < timeoutMs) {
      await nextFrames(1);
      const cur = getComputedStyle(el).transform;
      if (cur === last) {
        stable++;
        if (stable >= 5) return true;
      } else {
        stable = 0;
        last = cur;
      }
    }
    return false;
  }

  // Vue Flow binds the viewport transform reactively, so an inline style we
  // set gets overwritten on its next re-render. A stylesheet rule marked
  // !important outranks Vue's (non-important) inline style and survives every
  // re-render — this is how we hold the canvas still while tiling.
  const OVERRIDE_ATTR = "data-ghl-shot-capture";
  let styleEl = null;

  function setCanvasTransform(el, transformCss) {
    if (!styleEl) {
      styleEl = document.createElement("style");
      document.head.appendChild(styleEl);
      el.setAttribute(OVERRIDE_ATTR, "1");
    }
    styleEl.textContent =
      `[${OVERRIDE_ATTR}] {` +
      `transform: ${transformCss} !important;` +
      `transform-origin: 0 0 !important;` +
      `transition: none !important;}`;
  }

  function clearCanvasTransform(el) {
    if (styleEl) styleEl.remove();
    styleEl = null;
    el.removeAttribute(OVERRIDE_ATTR);
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

  // Zoom-to-fit BEFORE saving state: Vue Flow virtualizes off-screen nodes,
  // and fitting the view is what forces the whole workflow into the DOM. The
  // node set then stays rendered while we pan via style override (Vue Flow's
  // internal state never changes, so it never re-culls). Saving the transform
  // after the fit also means we restore to a state Vue Flow agrees with.
  try {
    await fitView();
    await waitForStableTransform(container, 2500);
  } catch (err) {
    console.error("[ghl-shot] fit-view failed:", err);
    overlay.toast(`GHL Screenshotter: ${err.message}`);
    window.__ghlShotRunning = false;
    return;
  }

  const savedTransform = container.style.transform;
  const savedTransition = container.style.transition;
  const savedTransformOrigin = container.style.transformOrigin;
  const hidden = [];
  let finished = false;

  function restore() {
    if (finished) return;
    finished = true;
    clearCanvasTransform(container);
    container.style.transform = savedTransform;
    container.style.transition = savedTransition;
    container.style.transformOrigin = savedTransformOrigin;
    for (const item of hidden) item.el.style.visibility = item.visibility;
    overlay.remove();
    window.__ghlShotRunning = false;
  }

  let debugInfo = null;
  function dumpDebug() {
    if (debugInfo) downloadText("ghl-shot-debug.txt", JSON.stringify(debugInfo, null, 1));
  }

  overlay.show();
  overlay.onCancel(() => {
    state.cancelled = true;
  });

  try {
    // Our own floating button and the builder's chrome must never appear.
    const hideTargets = ["#ghl-shot-button"].concat(CONFIG.hideSelectors);
    for (const sel of hideTargets) {
      for (const el of document.querySelectorAll(sel)) {
        hidden.push({ el, visibility: el.style.visibility });
        el.style.visibility = "hidden";
      }
    }

    // Identity transform = 100% zoom, no pan: measure everything from here.
    // Origin 0 0 keeps the scale math simple during the tile pans below.
    setCanvasTransform(container, "none");
    await nextFrames(2);

    // Prove the zoom override actually landed: a node's on-screen width must
    // now equal its unscaled width. This exact bug shipped once — the override
    // was applied to the viewport while the zoom lived on the transformation
    // pane, so everything was measured at the builder's zoom and upscaled.
    const probeNode = container.querySelector(CONFIG.nodeSelector);
    if (probeNode && probeNode.offsetWidth) {
      const shownScale = probeNode.getBoundingClientRect().width / probeNode.offsetWidth;
      if (Math.abs(shownScale - 1) > 0.02) {
        throw new Error(
          `could not reset the canvas zoom (stuck at ${Math.round(shownScale * 100)}%) — ` +
            "the builder's layout may have changed."
        );
      }
    }

    const originRect = container.getBoundingClientRect();
    const origin = { x: originRect.left, y: originRect.top };
    // Node bounds are already in canvas coordinates; the fallback scan returns
    // screen rects, which need the container origin subtracted.
    const nodeBounds = measureNodeBounds(container);
    const screenFallback = nodeBounds ? null : measureScreenBounds(container);
    if (!nodeBounds && !screenFallback) throw new Error("workflow appears to be empty.");
    const bounds = nodeBounds || G.relativeBounds(screenFallback, origin);

    const rawClip = findClipRect(container);
    const viewRect = {
      x: rawClip.x + CONFIG.viewInset,
      y: rawClip.y + CONFIG.viewInset,
      width: rawClip.width - 2 * CONFIG.viewInset,
      height: rawClip.height - 2 * CONFIG.viewInset,
    };
    if (runDebug) {
      debugInfo = collectDebugInfo(container, rawClip);
      debugInfo.measure = measureDiagnostics(container);
      // Dump now, not at the end: if the capture itself fails, the measurement
      // data is exactly what's needed to diagnose it.
      dumpDebug();
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

    // Density the output can afford: the 2x target, reduced only as far as
    // the browser's canvas caps require for this workflow's size.
    const effectiveScale = G.computeEffectiveScale(
      bounds, CONFIG.targetPixelRatio, CONFIG.maxCanvasSide, CONFIG.maxCanvasArea
    );
    // Supersample (or shrink, for enormous workflows) the canvas so tiles are
    // captured at that density directly — no wasted tiles, no post-shrink blur.
    const captureScale = Math.min(
      CONFIG.maxCaptureScale,
      Math.max(0.4, effectiveScale / dpr)
    );
    const outScale = G.computeOutputScale(
      bounds, captureScale * dpr, CONFIG.maxCanvasSide, CONFIG.maxCanvasArea
    );
    const tiles = G.computeTileGrid(
      bounds,
      viewRect.width / captureScale,
      viewRect.height / captureScale
    );
    console.log("[ghl-shot] bounds:", JSON.stringify(bounds), "| viewRect:", JSON.stringify(viewRect),
      "| dpr:", dpr, "| effectiveScale:", effectiveScale, "| captureScale:", captureScale,
      "| outScale:", outScale, "| tiles:", tiles.length);

    const outCanvas = document.createElement("canvas");
    outCanvas.width = Math.round(bounds.width * captureScale * dpr * outScale);
    outCanvas.height = Math.round(bounds.height * captureScale * dpr * outScale);
    const ctx = outCanvas.getContext("2d");

    if (debugInfo) {
      debugInfo.capture = {
        bounds,
        viewRect,
        dpr,
        effectiveScale,
        captureScale,
        outScale,
        tiles: tiles.length,
        outputPx: { w: outCanvas.width, h: outCanvas.height },
        // The number that matters: physical px per workflow CSS px. 2 = sharp.
        finalDensity: captureScale * dpr * outScale,
        canvasTransformAtMeasure: getComputedStyle(container).transform,
      };
      dumpDebug();
    }

    // Warn on the density actually achieved, which the supersampling cap can
    // limit too (very zoomed-out screens), not just the canvas-size cap.
    const achievedDensity = captureScale * dpr * outScale;
    if (achievedDensity < CONFIG.targetPixelRatio * 0.95) {
      const pct = Math.round((achievedDensity / CONFIG.targetPixelRatio) * 100);
      const why =
        effectiveScale < CONFIG.targetPixelRatio * 0.95
          ? "this workflow is near the browser's maximum image size"
          : "the browser is zoomed out a long way — zoom in for a sharper capture";
      overlay.setProgress(`Capturing at ${pct}% of target sharpness — ${why}.`);
      await sleep(2000);
    }

    for (let i = 0; i < tiles.length; i++) {
      if (state.cancelled) throw new Error("cancelled.");
      const tile = tiles[i];
      overlay.setProgress(`Capturing tile ${i + 1} of ${tiles.length}… (Esc to cancel)`);

      const t = G.computeTranslate(tile, origin, viewRect, captureScale);
      setCanvasTransform(container, `translate(${t.tx}px, ${t.ty}px) scale(${captureScale})`);
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
      const d = G.computeDrawRects(tile, bounds, viewRect, dpr, captureScale, outScale);
      ctx.drawImage(img, d.sx, d.sy, d.sw, d.sh, d.dx, d.dy, d.dw, d.dh);

      await sleep(CONFIG.captureDelayMs);
    }

    overlay.setProgress("Stitching and saving…");
    const isJpeg = settings.format === "jpeg";
    const mime = isJpeg ? "image/jpeg" : "image/png";
    if (isJpeg) {
      // JPEG has no alpha: paint white behind, else transparency turns black.
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
      ctx.globalCompositeOperation = "source-over";
    }
    const blob = await new Promise((resolve) =>
      outCanvas.toBlob(resolve, mime, isJpeg ? settings.jpegQuality : undefined)
    );
    if (!blob) throw new Error("failed to encode image (it may be too large).");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = N.makeFilename(getWorkflowName(), new Date(), isJpeg ? "jpg" : "png");
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    restore();
    overlay.toast("Workflow screenshot saved to Downloads.");
  } catch (err) {
    restore();
    console.error("[ghl-shot] capture failed:", err);
    if (debugInfo) {
      debugInfo.error = String(err && err.message);
      dumpDebug();
    }
    overlay.toast(`GHL Screenshotter: ${err.message}`);
  } finally {
    // Belt and braces: never leave the button dead if restore() was skipped.
    window.__ghlShotRunning = false;
  }
};
