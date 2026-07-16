const S = window.GhlShotSettings;
const BRAND = window.GhlShotBrand;

const FIELDS = ["targetPixelRatio", "format"];
const statusEl = document.getElementById("status");
const captureBtn = document.getElementById("capture");

function isBuilderTab(tab) {
  return !!tab && /\/automation\/workflow\//.test(tab.url || "");
}

// Chrome grants screenshot access only via activeTab (a toolbar click) unless
// the extension holds <all_urls>. Opting in here is what lets the in-page
// camera button capture on its own.
const ALL_URLS = { origins: ["<all_urls>"] };

async function initOneClick() {
  const box = document.getElementById("oneClick");
  box.checked = await chrome.permissions.contains(ALL_URLS);
  box.addEventListener("change", async () => {
    const granted = box.checked
      ? await chrome.permissions.request(ALL_URLS)
      : !(await chrome.permissions.remove(ALL_URLS));
    box.checked = granted;
    statusEl.textContent = granted ? "One-click capture on." : "One-click capture off.";
    setTimeout(() => (statusEl.textContent = ""), 1600);
  });
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
  updateSizeHint();
  await initOneClick();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!isBuilderTab(tab)) {
    captureBtn.disabled = true;
    statusEl.textContent = "Open a workflow to capture it.";
  }
}

const SIZE_HINTS = {
  1: "Normal — same size as on screen",
  2: "Double size — for zooming in or print",
  3: "Triple size — huge file, slow capture",
};

function updateSizeHint() {
  const value = document.getElementById("targetPixelRatio").value;
  document.getElementById("sizeHint").textContent = SIZE_HINTS[value];
}

async function onChange(e) {
  const el = e.target;
  const raw = el.type === "checkbox" ? el.checked : el.value;
  const value = el.id === "targetPixelRatio" ? Number(raw) : raw;
  await S.save({ [el.id]: value });
  if (el.id === "targetPixelRatio") updateSizeHint();
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
