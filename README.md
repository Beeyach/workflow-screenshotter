# Workflow Screenshotter

A Chrome extension that captures an entire GoHighLevel workflow — the whole
pan/zoom canvas, not just the visible screen — as a single image.

Free, no account, no tracking. Works **only** with the HighLevel™ workflow
builder (including whitelabel domains) — not with Zapier, Make, n8n, or other
automation tools. Not affiliated with or endorsed by HighLevel, Inc.

## Why

The workflow builder draws your automation on a canvas inside a cross-origin
iframe. The page itself never scrolls, so ordinary full-page screenshot tools
capture only the viewport. This extension resets the canvas to 100%, pans it
tile by tile, screenshots each tile, and stitches the result into one image.

## Install

1. Open `chrome://extensions` and enable **Developer mode**.
2. **Load unpacked** → select this folder.

## Use

Open a workflow, click the toolbar icon, then **Capture workflow**. The image
lands in Downloads as `<workflow name>_<YYYY-MM-DD>.png`.

- **Image size** — Normal matches what you see on screen. 2×/3× are for zooming
  in or printing, and cost roughly 4×/9× the capture time.
- **File type** — PNG (lossless) or JPEG (smaller).
- **Cancel** — the button on the progress pill, or Esc.

The minimap and zoom controls are always excluded, and off-screen steps are
always included.

## Privacy

No data is collected, and the extension makes no network requests. Capture runs
entirely in the browser; the image goes straight to Downloads. Permissions are
`activeTab` (screenshot the tab when you press Capture) and `storage` (remember
your two preferences). It runs on the workflow builder's iframe only.

## Troubleshooting

- **"Reload the workflow page, then try again"** — the content script wasn't
  loaded yet (usually right after installing or reloading the extension).
- **Alt-click "Capture workflow"** to also save `ghl-shot-debug.txt`, which
  reports the detected canvas, node count, measured bounds, and capture scale.
- If the builder's markup ever changes, the selectors live in the `CONFIG`
  object at the top of [src/content.js](src/content.js).

## Development

No dependencies and no build step.

```
node --test                              # unit tests for the geometry/naming math
powershell -File scripts/make-icons.ps1  # regenerate icons from brand colors
powershell -File scripts/package.ps1     # build the Web Store zip into dist/
```

Code changes need an extension reload on `chrome://extensions`.

- [src/content.js](src/content.js) — capture orchestrator (canvas discovery, measuring, tiling, stitching)
- [src/geometry.js](src/geometry.js) — pure rect/tile math (unit-tested)
- [src/brand.js](src/brand.js) — brand colors and site URL
- [site/](site/) — the landing page and privacy policy (deployed to Cloudflare Pages)
- [docs/store-listing.md](docs/store-listing.md) — Chrome Web Store submission notes

## License

MIT — see [LICENSE](LICENSE).
