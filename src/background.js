// The toolbar icon opens popup/popup.html, which handles injection.
// This worker exists solely to take tab screenshots on the content script's
// behalf — captureVisibleTab is not available inside content scripts.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "GHLSHOT_CAPTURE") {
    chrome.tabs
      .captureVisibleTab(sender.tab.windowId, { format: "png" })
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the message channel open for the async response
  }
});
