(function () {
  "use strict";

  var REVEAL_SELECTOR = "[data-img-reveal]";

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function whenImageReady(img, callback) {
    function done() {
      if (img.decode) {
        img.decode().then(callback).catch(callback);
        return;
      }
      callback();
    }

    if (img.complete && img.naturalWidth > 0) {
      done();
      return;
    }

    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  }

  function markCarouselReady(wrap) {
    if (wrap.classList.contains("is-carousel-ready")) return;

    var gallery = wrap.closest(".gallery-page[data-series-gallery]");
    if (!gallery || gallery.classList.contains("gallery-page--single")) return;

    wrap.classList.add("is-carousel-ready");
  }

  function revealWrap(wrap) {
    if (wrap.classList.contains("is-revealed")) return;

    wrap.classList.add("is-ready");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add("is-revealed");

        window.setTimeout(function () {
          markCarouselReady(wrap);
        }, 2600);
      });
    });
  }

  function initWrap(wrap) {
    var img = wrap.querySelector("img");
    if (!img) return;

    if (prefersReducedMotion()) {
      wrap.classList.add("is-ready", "is-revealed", "is-reduced");
      markCarouselReady(wrap);
      return;
    }

    whenImageReady(img, function () {
      revealWrap(wrap);
    });
  }

  function boot() {
    var wraps = document.querySelectorAll(REVEAL_SELECTOR);
    if (!wraps.length) return;
    wraps.forEach(initWrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
