const S = window.GhlShotSettings;
const BRAND = window.GhlShotBrand;

const FIELDS = ["targetPixelRatio", "format"];
const statusEl = document.getElementById("status");
const captureBtn = document.getElementById("capture");

const SIZE_HINTS = {
  1: "Normal — same size as on screen",
  2: "Double size — for zooming in or print",
  3: "Triple size — huge file, slow capture",
};

function isBuilderTab(tab) {
  return !!tab && /\/automation\/workflow\//.test(tab.url || "");
}

function updateSizeHint() {
  const value = document.getElementById("targetPixelRatio").value;
  document.getElementById("sizeHint").textContent = SIZE_HINTS[value];
}

function setStatus(text, sticky) {
  statusEl.textContent = text;
  if (!sticky && text) setTimeout(() => (statusEl.textContent = ""), 1400);
}

async function onChange(e) {
  const el = e.target;
  const value = el.id === "targetPixelRatio" ? Number(el.value) : el.value;
  await S.save({ [el.id]: value });
  if (el.id === "targetPixelRatio") updateSizeHint();
  setStatus("Saved.");
}

captureBtn.addEventListener("click", async (e) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  captureBtn.disabled = true;
  setStatus("Starting…", true);
  try {
    // The content script already runs in the builder's iframe; this just tells
    // it to go. Alt-click also saves a debug dump for troubleshooting.
    await chrome.tabs.sendMessage(tab.id, { type: "GHLSHOT_START", debug: e.altKey });
    window.close(); // the page overlay takes over from here
  } catch (_err) {
    captureBtn.disabled = false;
    setStatus("Reload the workflow page, then try again.", true);
  }
});

async function init() {
  const site = document.getElementById("site");
  site.href = BRAND.website;
  site.textContent = BRAND.website.replace(/^https?:\/\//, "");

  const values = await S.load();
  for (const key of FIELDS) {
    const el = document.getElementById(key);
    el.value = String(values[key]);
    el.addEventListener("change", onChange);
  }
  updateSizeHint();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isBuilderTab(tab)) {
    captureBtn.disabled = true;
    setStatus("Open a workflow to capture it.", true);
  }
}

init();
