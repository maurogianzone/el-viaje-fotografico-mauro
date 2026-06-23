(function () {
  "use strict";

  if (!document.body.classList.contains("page-index")) return;

  var html = document.documentElement;
  var SLIDE_SELECTOR = ".cursor-slideshow-target";
  var SLIDE_ON = "cursor-slideshow-on";
  var slideCursor = null;
  var mouseX = 0;
  var mouseY = 0;
  var lastPointEl = null;
  var rafId = null;

  function isDesktopPointer() {
    try {
      return (
        window.matchMedia("(hover: hover)").matches &&
        window.matchMedia("(pointer: fine)").matches
      );
    } catch (error) {
      return false;
    }
  }

  function closest(el, selector) {
    return el && el.closest ? el.closest(selector) : null;
  }

  function ensureCursor() {
    slideCursor = document.getElementById("mg-slide-cursor");
    if (slideCursor) return slideCursor;

    slideCursor = document.createElement("div");
    slideCursor.id = "mg-slide-cursor";
    slideCursor.setAttribute("aria-hidden", "true");
    slideCursor.textContent = "→";
    document.body.appendChild(slideCursor);
    return slideCursor;
  }

  function setTransform(el, x, y) {
    if (!el) return;
    el.style.transform = "translate(" + x + "px," + y + "px) translate(-50%, -50%)";
  }

  function setSlideArrow(target, x) {
    if (!target || !slideCursor) return;
    var rect = target.getBoundingClientRect();
    slideCursor.textContent = x < rect.left + rect.width / 2 ? "←" : "→";
  }

  function updateCursor() {
    rafId = null;
    setTransform(slideCursor, mouseX, mouseY);
    lastPointEl = document.elementFromPoint(mouseX, mouseY);
    var slideTarget = closest(lastPointEl, SLIDE_SELECTOR);
    html.classList.toggle(SLIDE_ON, !!slideTarget);
    if (slideTarget) setSlideArrow(slideTarget, mouseX);
  }

  function requestUpdate() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(updateCursor);
  }

  function boot() {
    if (!isDesktopPointer()) return;

    ensureCursor();
    document.addEventListener(
      "mousemove",
      function (e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        requestUpdate();
      },
      { passive: true }
    );
    window.addEventListener("blur", function () {
      html.classList.remove(SLIDE_ON);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
