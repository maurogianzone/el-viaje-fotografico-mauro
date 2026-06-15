(function () {
  "use strict";

  if (!window.MGShaftLoader) return;

  var SEEN_KEY = "mg-shaft-seen";

  function isIndexPage() {
    var path = window.location.pathname.toLowerCase();
    return path.endsWith("/index.html") || path.endsWith("/") || /\/index\.html$/.test(path);
  }

  function boot() {
    if (!isIndexPage()) return;

    if (sessionStorage.getItem(SEEN_KEY)) {
      window.MGShaftLoader.skipEnter();
      return;
    }

    window.MGShaftLoader.initEnter({
      onComplete: function () {
        sessionStorage.setItem(SEEN_KEY, "1");
      },
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
