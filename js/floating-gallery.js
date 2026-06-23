(function () {
  "use strict";

  var root = document.querySelector("[data-floating-gallery]");
  if (!root) return;

  var canvas = root.querySelector("[data-floating-canvas]");
  if (!canvas) return;

  var reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var maxX = 0;
  var maxY = 0;

  function updateMax() {
    maxX = Math.max(0, canvas.offsetWidth - window.innerWidth);
    maxY = Math.max(0, canvas.offsetHeight - window.innerHeight);
  }

  function pan(clientX, clientY) {
    var xDecimal = clientX / window.innerWidth;
    var yDecimal = clientY / window.innerHeight;
    var panX = maxX * xDecimal * -1;
    var panY = maxY * yDecimal * -1;

    canvas.style.transform = "translate(" + panX + "px, " + panY + "px)";
  }

  function centerStatic() {
    pan(window.innerWidth * 0.5, window.innerHeight * 0.5);
  }

  function enableTransition() {
    if (reducedMotion) return;
    canvas.style.transition = "transform 4s ease";
  }

  function boot() {
    updateMax();

    if (reducedMotion) {
      canvas.classList.add("floating-gallery--static");
      centerStatic();
      return;
    }

    canvas.style.transition = "none";
    centerStatic();

    requestAnimationFrame(function () {
      requestAnimationFrame(enableTransition);
    });

    window.addEventListener("mousemove", function (event) {
      pan(event.clientX, event.clientY);
    });

    window.addEventListener(
      "touchmove",
      function (event) {
        if (!event.touches.length) return;
        pan(event.touches[0].clientX, event.touches[0].clientY);
      },
      { passive: true }
    );

    window.addEventListener("resize", function () {
      updateMax();
      centerStatic();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
