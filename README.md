# GHL Workflow Screenshotter

Chrome extension that captures an entire GoHighLevel workflow — the whole pan/zoom canvas, not just the visible screen — into a single high-resolution PNG.

## Why

GHL's workflow builder lives in a pan/zoom canvas inside a cross-origin iframe, so normal full-page screenshot tools only ever capture the visible viewport. This extension pans the canvas tile-by-tile, screenshots each tile, and stitches them into one image.

## Install

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. Accept the `leadconnectorhq.com` / `gohighlevel.com` permissions.

## Use

Open any workflow in the GHL automation builder and either:

- click the floating **📸 button** (bottom-right of the builder), or
- click the extension's toolbar icon.

A progress overlay pans across the workflow (Esc cancels). The finished PNG lands in Downloads as `<workflow name>_<YYYY-MM-DD>.png`. Text is captured at ~2× density, so it stays crisp even if you work zoomed out.

On a **whitelabel domain**, use the toolbar icon (the floating button can't take screenshots there without a host permission for that domain).

## Troubleshooting

- **Alt-click** the 📸 button to also download a `ghl-shot-debug.txt` with the detected canvas, bounds, and overlay elements.
- If GHL redesigns the builder, the selectors live in the `CONFIG` object at the top of [src/content.js](src/content.js).

## Development

No dependencies, no build step. Unit tests for the geometry/naming math:

```
node --test
```

Extension code changes require a reload on `chrome://extensions` to take effect.
