(function () {
  "use strict";

  var FADE_IN_MS = 520;
  var FADE_OUT_MS = 480;
  var FADE_ENTER_KEY = "mg-fade-enter";
  var SHAFT_SEEN_KEY = "mg-shaft-seen";

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isIndexPage() {
    var file = window.location.pathname.split("/").pop() || "";
    return file === "" || file === "index.html";
  }

  function isIndexFirstShaft() {
    if (!isIndexPage()) return false;
    if (!document.getElementById("shaft-loader")) return false;
    return !sessionStorage.getItem(SHAFT_SEEN_KEY);
  }

  function shouldSkipFadeIn() {
    return prefersReducedMotion() || isIndexFirstShaft();
  }

  function hideShaftIfPresent() {
    if (document.body.classList.contains("loader-active")) return;
    var loader = document.getElementById("shaft-loader");
    if (loader) {
      loader.style.display = "none";
      loader.setAttribute("aria-hidden", "true");
      loader.setAttribute("aria-busy", "false");
    }
    document.body.classList.remove("loader-active");
  }

  function collectImages() {
    var main = document.querySelector("main");
    if (!main) return [];
    return Array.prototype.slice.call(main.querySelectorAll("img[src]"));
  }

  function waitForImages(images, callback) {
    var pending = 0;

    images.forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) return;
      pending += 1;
      function done() {
        img.removeEventListener("load", done);
        img.removeEventListener("error", done);
        pending -= 1;
        if (pending <= 0) callback();
      }
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    });

    if (pending <= 0) callback();
  }

  function primeHidden(page, images) {
    if (!page) return;
    page.style.opacity = "0";
    images.forEach(function (img) {
      img.style.opacity = "0";
    });
  }

  function runFadeIn() {
    var page = document.querySelector(".page");
    var images = collectImages();

    document.body.classList.add("page-fade-enter");
    primeHidden(page, images);

    function reveal() {
      requestAnimationFrame(function () {
        if (page) {
          page.style.transition = "opacity " + FADE_IN_MS + "ms ease";
          page.style.opacity = "1";
        }

        images.forEach(function (img, i) {
          img.style.transition =
            "opacity " + FADE_IN_MS + "ms ease " + Math.min(i * 40, 200) + "ms";
          img.style.opacity = "1";
        });

        window.setTimeout(function () {
          document.body.classList.remove("page-fade-enter");
          if (page) {
            page.style.transition = "";
            page.style.opacity = "";
          }
          images.forEach(function (img) {
            img.style.transition = "";
            img.style.opacity = "";
          });
        }, FADE_IN_MS + 220);
      });
    }

    waitForImages(images, reveal);
    window.setTimeout(reveal, 1200);
  }

  function fadeOutAndNavigate(nextUrl) {
    var page = document.querySelector(".page");
    sessionStorage.setItem(FADE_ENTER_KEY, "1");

    if (!page || prefersReducedMotion()) {
      window.location.href = nextUrl;
      return;
    }

    page.style.transition = "opacity " + FADE_OUT_MS + "ms ease";
    page.style.opacity = "0";

    window.setTimeout(function () {
      window.location.href = nextUrl;
    }, FADE_OUT_MS);
  }

  function isInternalNavLink(anchor) {
    if (!anchor || anchor.tagName !== "A") return false;
    if (anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
    var href = anchor.getAttribute("href");
    if (!href || href.charAt(0) === "#") return false;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return false;

    try {
      var url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === ""
      ) {
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function bindPageNavigation() {
    document.addEventListener("click", function (e) {
      if (document.body.classList.contains("loader-active")) return;
      var anchor = e.target.closest("a[href]");
      if (!isInternalNavLink(anchor)) return;
      e.preventDefault();
      fadeOutAndNavigate(anchor.href);
    });
  }

  function boot() {
    hideShaftIfPresent();
    sessionStorage.removeItem(FADE_ENTER_KEY);

    if (shouldSkipFadeIn()) {
      return;
    }

    runFadeIn();
  }

  function primeOnParse() {
    if (shouldSkipFadeIn()) return;
    var page = document.querySelector(".page");
    if (page) {
      primeHidden(page, collectImages());
    }
  }

  primeOnParse();
  bindPageNavigation();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
