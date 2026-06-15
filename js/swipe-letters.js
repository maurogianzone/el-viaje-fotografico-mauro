(function () {
  "use strict";

  var SWIPE_STAGGER_MS = 12;
  var SELECTOR = ".site-header__title";

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function buildSwipeLetters(el) {
    var text = (el.textContent || "").trim();
    if (!text || el.dataset.swipeLetters === "true") return;

    el.dataset.swipeLetters = "true";
    el.setAttribute("aria-label", text);
    el.textContent = "";

    var wrap = document.createElement("span");
    wrap.className = "swipe-letters";
    wrap.setAttribute("aria-hidden", "true");

    Array.from(text).forEach(function (char, index) {
      var displayChar = char === " " ? "\u00a0" : char;
      var fromTop = index % 2 === 1;

      var charEl = document.createElement("span");
      charEl.className =
        "swipe-letters__char swipe-letters__char--" + (fromTop ? "top" : "bottom");

      var inner = document.createElement("span");
      inner.className = "swipe-letters__inner";
      inner.style.setProperty("--swipe-stagger", index * SWIPE_STAGGER_MS + "ms");

      var base = document.createElement("span");
      base.className = "swipe-letters__line";
      base.textContent = displayChar;

      var hover = document.createElement("span");
      hover.className = "swipe-letters__line swipe-letters__line--hover";
      hover.textContent = displayChar;

      if (fromTop) {
        inner.appendChild(hover);
        inner.appendChild(base);
      } else {
        inner.appendChild(base);
        inner.appendChild(hover);
      }

      charEl.appendChild(inner);
      wrap.appendChild(charEl);
    });

    el.appendChild(wrap);

    if (prefersReducedMotion()) {
      el.classList.add("swipe-letters--static");
    }
  }

  function initSwipeLetters() {
    document.querySelectorAll(SELECTOR).forEach(buildSwipeLetters);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSwipeLetters);
  } else {
    initSwipeLetters();
  }
})();
