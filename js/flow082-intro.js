(function () {
  "use strict";

  var STACK_SCALE = 0.48;
  var STACK_STEP = 14;
  var ENTER_Y = 150;
  var EXIT_Y = -340;

  function stackRestY(index) {
    return -index * STACK_STEP;
  }

  function exitPrevious(tl, media) {
    tl.to(
      media,
      {
        y: EXIT_Y,
        scale: STACK_SCALE * 0.42,
        opacity: 1,
        duration: 0.34,
        ease: "power4.in",
        onComplete: function () {
          gsap.set(media, { opacity: 0, visibility: "hidden" });
        },
      },
      "<0.18"
    );
  }

  var PHOTOS = [
    { src: "assets/photos/colores-08.png", alt: "Pileta y patio con sillas", w: 1024, h: 682 },
    { src: "assets/photos/colores-09.png", alt: "Ropa colgada en la vereda", w: 1024, h: 682 },
    { src: "assets/photos/colores-10.png", alt: "Estación Shell bajo cielo azul", w: 681, h: 1024 },
    { src: "assets/photos/colores-11.png", alt: "Globos en jaula metálica", w: 682, h: 1024 },
    { src: "assets/photos/colores-12.png", alt: "Subte en Las Heras", w: 1024, h: 681 },
    { src: "assets/photos/colores-14.png", alt: "Sombras sobre pared iluminada", w: 1024, h: 681 },
  ];

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isDesktop() {
    return window.matchMedia && window.matchMedia("(min-width: 56.3125rem)").matches;
  }

  function getHeroSlotSize() {
    var docStyle = getComputedStyle(document.documentElement);
    var shellPad = parseFloat(docStyle.getPropertyValue("--shell-pad-x")) || 40;
    var uiScale = Math.max(0.5, window.innerWidth / 1440);
    var maxW = Math.min(720 * uiScale, window.innerWidth - shellPad * 2);
    var chromeHeader = parseFloat(docStyle.getPropertyValue("--chrome-header")) || 88;
    var chromeFooter = parseFloat(docStyle.getPropertyValue("--chrome-footer")) || 88;
    var maxH = Math.min(480 * uiScale, window.innerHeight - chromeHeader - chromeFooter - 64);
    var aspect = 1.5;
    var w = Math.min(maxW, maxH * aspect);
    var h = w / aspect;
    return { w: Math.round(w), h: Math.round(h) };
  }

  function applySlotSize(container) {
    var size = getHeroSlotSize();
    document.documentElement.style.setProperty("--flow082-slot-w", size.w + "px");
    document.documentElement.style.setProperty("--flow082-slot-h", size.h + "px");
    container.style.width = size.w + "px";
    container.style.height = size.h + "px";
  }

  function preloadPhotos(callback) {
    var pending = PHOTOS.length;
    PHOTOS.forEach(function (photo) {
      var img = new Image();
      function done() {
        pending -= 1;
        if (pending <= 0) callback();
      }
      img.onload = done;
      img.onerror = done;
      img.src = photo.src;
    });
  }

  function showFinalOnly(medias) {
    medias.forEach(function (media, i) {
      var isFinal = i === medias.length - 1;
      media.classList.toggle("is-final", isFinal);
      if (!isFinal) {
        media.style.visibility = "hidden";
        media.style.opacity = "0";
        return;
      }
      media.style.visibility = "visible";
      media.style.opacity = "1";
      if (typeof gsap !== "undefined") {
        gsap.set(media, { clearProps: "transform" });
      }
    });
  }

  function initLoadFlow(container, medias) {
    if (typeof gsap === "undefined") {
      showFinalOnly(medias);
      return;
    }

    var lastIndex = medias.length - 1;

    medias.forEach(function (media, index) {
      gsap.set(media, {
        xPercent: -50,
        yPercent: -50,
        x: 0,
        y: ENTER_Y,
        scale: STACK_SCALE * 0.72,
        opacity: 0,
        zIndex: index + 1,
        transformOrigin: "50% 50%",
        visibility: "visible",
      });
    });

    var tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

    tl.to({}, { duration: 0.08 });

    medias.forEach(function (media, index) {
      var isLast = index === lastIndex;
      var restY = stackRestY(index);

      tl.to(media, {
        y: restY,
        scale: STACK_SCALE,
        opacity: 1,
        duration: 0.48,
        ease: "back.out(1.85)",
      });

      if (index > 0) {
        exitPrevious(tl, medias[index - 1]);
      }

      if (!isLast) {
        tl.to({}, { duration: 0.12 });
        return;
      }

      media.classList.add("is-final");
      tl.to(media, {
        y: 0,
        scale: 1,
        duration: 0.72,
        ease: "power3.out",
      });
    });
  }

  function boot() {
    var root = document.querySelector("[data-flow082-root]");
    var container = document.querySelector("[data-flow082-container]");
    if (!root || !container) return;

    if (!isDesktop()) return;

    applySlotSize(container);

    var medias = Array.prototype.slice.call(container.querySelectorAll(".flow082__media"));

    if (prefersReducedMotion()) {
      showFinalOnly(medias);
      return;
    }

    preloadPhotos(function () {
      initLoadFlow(container, medias);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("resize", function () {
    var container = document.querySelector("[data-flow082-container]");
    if (container && isDesktop()) applySlotSize(container);
  });
})();
