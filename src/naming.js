(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GhlShotNaming = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  function makeFilename(workflowName, date) {
    const cleaned = (workflowName || "")
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const base = cleaned || "workflow";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${base}_${yyyy}-${mm}-${dd}.png`;
  }

  return { makeFilename };
});
