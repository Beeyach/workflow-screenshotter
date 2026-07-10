const S = window.GhlShotSettings;
const BRAND = window.GhlShotBrand;

const FIELDS = ["targetPixelRatio", "format", "hideBuilderUi", "fitBeforeCapture"];
const statusEl = document.getElementById("status");
const captureBtn = document.getElementById("capture");

function isBuilderTab(tab) {
  return !!tab && /\/automation\/workflow\//.test(tab.url || "");
}

async function init() {
  const site = document.getElementById("site");
  site.href = BRAND.website;
  site.textContent = BRAND.website.replace(/^https?:\/\//, "");

  const values = await S.load();
  for (const key of FIELDS) {
    const el = document.getElementById(key);
    if (el.type === "checkbox") el.checked = values[key];
    else el.value = String(values[key]);
    el.addEventListener("change", onChange);
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isBuilderTab(tab)) {
    captureBtn.disabled = true;
    statusEl.textContent = "Open a workflow to capture it.";
  }
}

async function onChange(e) {
  const el = e.target;
  const raw = el.type === "checkbox" ? el.checked : el.value;
  const value = el.id === "targetPixelRatio" ? Number(raw) : raw;
  await S.save({ [el.id]: value });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 1200);
}

captureBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  captureBtn.disabled = true;
  statusEl.textContent = "Starting…";
  try {
    // The declared content script already runs in the builder frame; this also
    // covers whitelabel domains, where it is injected on demand instead.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: [
        "src/settings.js",
        "src/geometry.js",
        "src/naming.js",
        "src/overlay.js",
        "src/content.js",
        "src/starter.js",
      ],
    });
    window.close(); // let the page overlay show the progress
  } catch (err) {
    captureBtn.disabled = false;
    statusEl.textContent = err.message;
  }
});

init();
