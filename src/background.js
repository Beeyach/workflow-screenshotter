chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.scripting.executeScript({
    // allFrames: the GHL workflow builder lives in a cross-origin iframe on
    // *.leadconnectorhq.com (host_permissions grants access to it).
    target: { tabId: tab.id, allFrames: true },
    files: ["src/geometry.js", "src/naming.js", "src/overlay.js", "src/content.js", "src/starter.js"],
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "GHLSHOT_CAPTURE") {
    chrome.tabs
      .captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the message channel open for the async response
  }
});
