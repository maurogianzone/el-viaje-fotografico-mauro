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

  function getTapHintDelayMs() {
    var style = getComputedStyle(document.documentElement);
    var delay = parseFloat(style.getPropertyValue("--content-reveal-opacity-delay")) || 1.15;
    var duration = parseFloat(style.getPropertyValue("--content-reveal-opacity-duration")) || 1.35;
    return Math.round((delay + duration * 0.45) * 1000);
  }

  function revealTapHint(wrap, img) {
    if (!document.body.classList.contains("page-index")) return;

    var stage = wrap.closest(".gallery-mobile__stage");
    if (!stage) return;

    var hint = stage.querySelector(".gallery-page__tap-hint");
    if (!hint || hint.classList.contains("is-visible")) return;

    function show() {
      hint.classList.add("is-visible");
    }

    if (prefersReducedMotion() || wrap.classList.contains("is-reduced")) {
      show();
      return;
    }

    if (!img) {
      show();
      return;
    }

    var done = false;
    function finish() {
      if (done) return;
      done = true;
      img.removeEventListener("transitionend", onTransitionEnd);
      show();
    }

    function onTransitionEnd(e) {
      if (e.target !== img || e.propertyName !== "transform") return;
      finish();
    }

    img.addEventListener("transitionend", onTransitionEnd);
    window.setTimeout(finish, getTapHintDelayMs());
  }

  function markCarouselReady(wrap) {
    if (wrap.classList.contains("is-carousel-ready")) return;

    var gallery = wrap.closest(".gallery-page[data-series-gallery]");
    if (!gallery || gallery.classList.contains("gallery-page--single")) return;

    wrap.classList.add("is-carousel-ready");
  }

  function revealWrap(wrap) {
    if (wrap.classList.contains("is-revealed")) return;

    var img = wrap.querySelector("img");
    wrap.classList.add("is-ready");

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        wrap.classList.add("is-revealed");

        revealTapHint(wrap, img);

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
      revealTapHint(wrap, img);
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
