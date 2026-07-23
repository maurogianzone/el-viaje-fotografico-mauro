(function () {
  "use strict";

  var EXIT_MS = 450;

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isAnimatedPage() {
    if (!document.querySelector(".site-header")) return false;
    if (document.body.hasAttribute("data-no-page-transition")) return false;
    return true;
  }

  function closeMenuIfOpen() {
    var menu = document.getElementById("menu-overlay");
    if (!menu || menu.getAttribute("aria-hidden") !== "false") return;

    var closeBtn = document.querySelector("[data-menu-close]");
    if (closeBtn) closeBtn.click();
  }

  function isInternalNavLink(anchor) {
    if (!anchor || anchor.tagName !== "A") return false;
    if (anchor.target === "_blank") return false;
    if (anchor.hasAttribute("download")) return false;

    var href = anchor.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

    try {
      var next = new URL(anchor.href, window.location.href);
      var current = new URL(window.location.href);
      if (next.origin !== current.origin) return false;
      return next.pathname !== current.pathname || next.search !== current.search;
    } catch (error) {
      return false;
    }
  }

  function navigate(url) {
    window.location.href = url;
  }

  function runExit(url) {
    if (prefersReducedMotion()) {
      navigate(url);
      return;
    }

    closeMenuIfOpen();
    document.body.classList.add("page-is-leaving");

    window.setTimeout(function () {
      navigate(url);
    }, EXIT_MS);
  }

  function boot() {
    if (!isAnimatedPage()) return;

    var leaving = false;

    function resetLeaveState() {
      leaving = false;
      document.body.classList.remove("page-is-leaving");
    }

    document.addEventListener(
      "click",
      function (event) {
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        var link = event.target.closest("a");
        if (!isInternalNavLink(link)) return;

        event.preventDefault();
        event.stopPropagation();

        if (leaving) return;
        leaving = true;

        runExit(link.href);
      },
      true
    );

    // Browser back/forward can restore a frozen page mid-exit (bfcache).
    window.addEventListener("pageshow", function (event) {
      if (event.persisted || document.body.classList.contains("page-is-leaving")) {
        resetLeaveState();
      }
    });

    window.addEventListener("pagehide", function () {
      resetLeaveState();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
