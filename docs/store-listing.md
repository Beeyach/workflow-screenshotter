# Chrome Web Store submission

Everything to paste into the developer dashboard, plus the reasoning behind
each answer. Nothing here is legal advice — it reflects the Chrome Web Store
policies linked at the bottom.

## Item name

```
Bloomwired Workflow Screenshotter
```

Deliberately does **not** contain "HighLevel" or "GoHighLevel". The trademark
belongs to HighLevel, Inc.; putting it in the name risks reading as an official
product and is the pattern that gets extensions removed. Our own brand is the
distinctive part of the name.

## Short description (132 char max)

```
Capture an entire automation workflow as one image — including the steps scrolled off screen. Free, no account, no tracking.
```

## Detailed description

```
Workflow builders put your automation on a canvas you can pan and zoom. Normal
full-page screenshot tools only capture what fits on screen, so documenting a
long workflow means stitching print-screens together by hand.

This extension captures the whole thing in one click.

HOW IT WORKS
1. Open a workflow in your automation builder.
2. Click the Bloomwired icon, then "Capture workflow".
3. A single image lands in your Downloads, named after the workflow.

WHAT YOU GET
• Every step, including the ones scrolled off screen
• Readable text at any zoom level — the canvas is reset to 100% before capture
• A clean image: the minimap and zoom controls are left out
• PNG or JPEG, at normal, 2x, or 3x size

PRIVACY
• Nothing is collected, transmitted, or sold. There is no account and no analytics.
• Capture happens entirely in your browser; the image goes straight to your Downloads.
• Works only on the automation workflow builder — no other site is touched.

OPEN SOURCE
Read every line before you install it:
https://github.com/Beeyach/workflow-screenshotter

Free, with no paid tier.

Not affiliated with, endorsed by, or sponsored by HighLevel, Inc. Compatible
with the HighLevel™ workflow builder, including whitelabel domains. HighLevel
is a trademark of HighLevel, Inc.
```

The repository is public and MIT-licensed, so the OPEN SOURCE claim is accurate.

## Category / language

Category: **Workflow & Planning**. Language: English.

## Single purpose

The store requires one narrow purpose. Ours:

```
Capture the automation workflow builder's canvas as a single image file.
```

## Permission justifications

Paste each into its box. Keep them literal — reviewers check the claim against
the code.

**activeTab**
```
Used to screenshot the visible area of the workflow tab the user is on. Chrome
grants this only when the user clicks the extension's toolbar icon, and the
extension captures only after the user presses "Capture workflow" in the popup.
```

**storage**
```
Stores two user preferences locally: output image size and file type (PNG/JPEG).
No user data is stored or transmitted.
```

**Content script on `client-app-automation-workflows.leadconnectorhq.com`**
```
This is the only page the extension works on: the automation workflow builder,
which is served in this iframe on both standard and whitelabel accounts. The
script measures the workflow canvas, pans it while screenshots are taken, and
stitches them into one image, then restores the canvas.
```

**Remote code: No.** Everything is bundled; nothing is fetched or eval'd.

## Privacy practices tab

- **What user data do you collect?** Nothing. Leave every category unchecked.
- **Privacy policy URL:** not required — Chrome's user-data FAQ says extensions
  that collect no user data "have no special or new obligations". Optional but
  reassuring if you want one on bloomwired.io.
- **Certifications** (all three are true here):
  - Not being sold to third parties, outside of the approved use cases ✓
  - Not being used or transferred for purposes unrelated to the item's single purpose ✓
  - Not being used or transferred to determine creditworthiness or for lending purposes ✓

The extension makes **no network requests at all**, which is the easiest version
of this form to defend.

## Trader status

Declare **trader** — this is published under a business brand. Expect to provide
and verify business contact details, which are shown publicly to EU users.

## Screenshots (1280x800, at least one)

1. A workflow open in the builder with the popup showing.
2. A captured PNG opened full-view, showing the whole workflow in one image.
3. Optional: a before/after — a viewport-only screenshot next to a full capture.

Do not include HighLevel's logo. Avoid showing real client names or contact data
in the workflow you screenshot; use a demo sub-account.

## Can I say it's open source?

Yes — the source is public and MIT-licensed at
https://github.com/Beeyach/workflow-screenshotter. Keep the listing's repo link
pointing there; if the repo is ever made private, drop the OPEN SOURCE paragraph
from the description, because an unverifiable claim is worse than no claim.

## Pre-submit checklist

- [ ] `node --test` passes
- [ ] Version bumped in `manifest.json`
- [ ] `scripts/package.ps1` run; upload `dist/bloomwired-workflow-screenshotter-<version>.zip`
- [ ] Repo pushed public (or OPEN SOURCE paragraph removed)
- [ ] Screenshots contain no client data and no HighLevel logo
- [ ] Listing visibility chosen (Unlisted to start, Public when proven)

## Sources

- [Program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Impersonation & intellectual property](https://developer.chrome.com/docs/webstore/program-policies/impersonation-and-intellectual-property)
- [Branding guidelines](https://developer.chrome.com/docs/webstore/branding)
- [Review process](https://developer.chrome.com/docs/webstore/review-process)
- [2026 policy updates](https://developer.chrome.com/blog/cws-policy-updates-2026)
