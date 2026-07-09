console.log("[ghl-shot] content script injected");
chrome.runtime.sendMessage({ type: "GHLSHOT_CAPTURE" }, (res) => {
  if (chrome.runtime.lastError) {
    console.error("[ghl-shot] capture failed:", chrome.runtime.lastError.message);
  } else if (res && res.ok) {
    console.log("[ghl-shot] capture ok, dataUrl length:", res.dataUrl.length);
  } else {
    console.error("[ghl-shot] capture error:", res && res.error);
  }
});
