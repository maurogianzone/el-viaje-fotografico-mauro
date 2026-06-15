(function () {
  "use strict";

  var SHAFT_OPEN_MS = 1200;
  var SHAFT_CLOSE_MS = 650;
  var SHAFT_MIN_VISIBLE_MS = 500;
  var SHAFT_EXIT_DELAY_MS = 120;
  var scrollBlock = null;
  var scrollOpts = { passive: false, capture: true };

  function getLoader() {
    return document.getElementById("shaft-loader");
  }

  function blockLoaderKeys(e) {
    var keys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " ",
      "PageUp",
      "PageDown",
      "Home",
      "End",
    ];
    if (keys.indexOf(e.key) !== -1) {
      e.preventDefault();
    }
  }

  function lockScroll() {
    scrollBlock =
      scrollBlock ||
      function (e) {
        e.preventDefault();
        e.stopPropagation();
      };
    document.body.classList.add("loader-active");
    window.addEventListener("wheel", scrollBlock, scrollOpts);
    window.addEventListener("touchmove", scrollBlock, scrollOpts);
    window.addEventListener("keydown", blockLoaderKeys, scrollOpts);
  }

  function unlockScroll() {
    if (scrollBlock) {
      window.removeEventListener("wheel", scrollBlock, scrollOpts);
      window.removeEventListener("touchmove", scrollBlock, scrollOpts);
      window.removeEventListener("keydown", blockLoaderKeys, scrollOpts);
    }
    document.body.classList.remove("loader-active");
  }

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function waitForImages(images, callback) {
    var list = Array.prototype.slice.call(images);
    var total = list.length;
    var loaded = 0;

    if (!total) {
      callback();
      return;
    }

    function checkDone() {
      loaded += 1;
      if (loaded >= total) callback();
    }

    list.forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        checkDone();
        return;
      }
      function done() {
        img.removeEventListener("load", done);
        img.removeEventListener("error", done);
        checkDone();
      }
      img.addEventListener("load", done);
      img.addEventListener("error", done);
    });
  }

  function preloadImageUrls(urls, onProgress, onComplete) {
    var total = urls.length;
    var loaded = 0;

    if (!total) {
      onProgress(100);
      onComplete();
      return;
    }

    urls.forEach(function (src) {
      var img = new Image();
      function finish() {
        loaded += 1;
        onProgress(total ? (loaded / total) * 100 : 100);
        if (loaded >= total) onComplete();
      }
      img.onload = finish;
      img.onerror = finish;
      img.src = src;
    });
  }

  function defaultPreloadUrls() {
    var urls = [];
    var seen = {};
    document.querySelectorAll("main img[src], #gallery-products img[src]").forEach(function (img) {
      var src = img.getAttribute("src");
      if (src && !seen[src]) {
        seen[src] = true;
        urls.push(src);
      }
    });
    return urls;
  }

  function setProgress(pct) {
    var lowerEl = document.querySelector("[data-shaft-lower]");
    if (!lowerEl) return;
    lowerEl.textContent = Math.min(100, Math.max(0, Math.round(pct))) + "%";
  }

  function skipEnter() {
    var loader = getLoader();
    unlockScroll();
    if (loader) {
      loader.classList.remove("is-closing", "is-exiting", "is-no-transition");
      loader.setAttribute("aria-hidden", "true");
      loader.setAttribute("aria-busy", "false");
      loader.style.display = "none";
    }
  }

  function initEnter(options) {
    options = options || {};
    var loader = getLoader();
    if (!loader) {
      if (typeof options.onComplete === "function") options.onComplete();
      return;
    }

    var panelTop = loader.querySelector(".panel-top");
    var reduced = prefersReducedMotion();
    var getUrls = options.getPreloadUrls || defaultPreloadUrls;
    var onReveal = options.onReveal;
    var onComplete = options.onComplete;

    loader.style.display = "";
    loader.classList.remove("is-closing", "is-exiting");
    loader.setAttribute("aria-hidden", "false");
    loader.setAttribute("aria-busy", "true");
    lockScroll();

    function finishEnter() {
      unlockScroll();
      loader.setAttribute("aria-hidden", "true");
      loader.setAttribute("aria-busy", "false");
      loader.style.display = "none";
      if (typeof onComplete === "function") onComplete();
    }

    function playOpen() {
      setProgress(100);
      window.setTimeout(function () {
        loader.classList.add("is-exiting");
        var duration = reduced ? 0 : SHAFT_OPEN_MS;

        if (!duration) {
          finishEnter();
          return;
        }

        var done = false;
        function onPanelDone() {
          if (done) return;
          done = true;
          finishEnter();
        }

        if (panelTop) {
          panelTop.addEventListener("transitionend", onPanelDone, { once: true });
        } else {
          window.setTimeout(onPanelDone, duration);
        }
      }, SHAFT_EXIT_DELAY_MS);
    }

    var startedAt = Date.now();
    var exitScheduled = false;

    function maybeOpen() {
      if (exitScheduled) return;
      var elapsed = Date.now() - startedAt;
      if (document.readyState !== "complete") return;
      if (elapsed < SHAFT_MIN_VISIBLE_MS) {
        window.setTimeout(maybeOpen, SHAFT_MIN_VISIBLE_MS - elapsed);
        return;
      }
      exitScheduled = true;

      if (typeof onReveal === "function") {
        onReveal(function () {
          requestAnimationFrame(function () {
            requestAnimationFrame(playOpen);
          });
        });
        return;
      }

      playOpen();
    }

    setProgress(0);
    preloadImageUrls(getUrls(), setProgress, function () {
      if (document.readyState === "complete") {
        maybeOpen();
      } else {
        window.addEventListener("load", maybeOpen);
      }
    });
  }

  window.MGShaftLoader = {
    initEnter: initEnter,
    skipEnter: skipEnter,
    lockScroll: lockScroll,
    unlockScroll: unlockScroll,
    waitForImages: waitForImages,
  };
})();

