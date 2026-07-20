(function () {
  "use strict";

  var MOBILE_BP = 900;
  function getMobileGutter() {
    return (
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--shell-pad-x")) || 20
    );
  }
  var MOBILE_VISUAL_ASPECT = 235 / 352;
  var SCALE_CENTER_MOBILE = 1.12;
  var MOBILE_PORTRAIT_FRAME_SCALE = 0.68;
  var WHEEL_LOCK_MS = 650;
  var WHEEL_THRESHOLD = 12;
  var FADE_MS = 220;
  var SWIPE_THRESHOLD = 44;
  var SWIPE_AXIS_LOCK = 12;

  function getMobilePhotoDims() {
    var rootStyle = getComputedStyle(document.documentElement);
    return {
      w: parseFloat(rootStyle.getPropertyValue("--mobile-photo-w")) || 0,
      h: parseFloat(rootStyle.getPropertyValue("--mobile-photo-h")) || 0,
    };
  }

  function isMobile() {
    return window.innerWidth <= MOBILE_BP;
  }

  function getMobileMetrics() {
    var gutter = getMobileGutter();
    var visualW = Math.max(260, window.innerWidth - gutter * 2);
    var sideW = visualW / SCALE_CENTER_MOBILE;
    var sideH = visualW * MOBILE_VISUAL_ASPECT;

    return {
      visualW: visualW,
      sideW: sideW,
      sideH: sideH,
      scaleCenter: SCALE_CENTER_MOBILE,
    };
  }

  function getMobilePortraitLimits(metrics) {
    var shell =
      document.querySelector(".gallery-mobile__stage") || document.querySelector(".gallery-mobile");
    var maxH = shell ? shell.clientHeight * 0.96 : window.innerHeight * 0.55;
    return {
      maxW: metrics.visualW,
      maxH: maxH,
    };
  }

  function clampMobilePortraitSize(metrics, portraitW, aspect) {
    var portraitH = portraitW / aspect;
    var limits = getMobilePortraitLimits(metrics);
    var visualW = portraitW * metrics.scaleCenter;
    var visualH = portraitH * metrics.scaleCenter;

    if (visualH > limits.maxH) {
      var hScale = limits.maxH / visualH;
      portraitW *= hScale;
      portraitH = portraitW / aspect;
      visualW = portraitW * metrics.scaleCenter;
      visualH = portraitH * metrics.scaleCenter;
    }

    if (visualW > limits.maxW) {
      portraitW = limits.maxW / metrics.scaleCenter;
      portraitH = portraitW / aspect;
    }

    return { w: portraitW, h: portraitH };
  }

  function getMobileSlotSize(metrics, data) {
    if (data.orientation === "portrait") {
      var portraitW = metrics.sideW * MOBILE_PORTRAIT_FRAME_SCALE;
      return clampMobilePortraitSize(metrics, portraitW, data.aspect);
    }
    return { w: metrics.sideW, h: metrics.sideH };
  }

  function getMobileDisplaySize(metrics, data) {
    var size = getMobileSlotSize(metrics, data);
    return {
      w: Math.round(size.w * metrics.scaleCenter),
      h: Math.round(size.h * metrics.scaleCenter),
    };
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function preload(src) {
    if (!src) return;
    var img = new Image();
    img.src = src;
  }

  var lightboxOverlay = null;
  var lightboxImg = null;
  var lightboxOpen = false;
  var lightboxSuppressUntil = 0;
  var lightboxGalleryApi = null;

  function getIconUrl(filename) {
    return (window.location.pathname.indexOf("/personal/") !== -1 ? "../" : "") + "assets/icons/" + filename;
  }

  function updateLightboxImage(data) {
    if (!lightboxImg || !data) return;
    lightboxImg.alt = data.alt || "";
    lightboxImg.src = data.src;
    lightboxImg.classList.toggle("is-portrait", data.orientation === "portrait");
    if (lightboxOverlay) {
      lightboxOverlay.classList.toggle("has-portrait", data.orientation === "portrait");
    }
  }

  function updateLightboxNavState() {
    if (!lightboxOverlay || !lightboxGalleryApi) return;
    lightboxOverlay.classList.toggle("is-single", lightboxGalleryApi.getTotal() <= 1);
  }

  function ensureGalleryLightbox() {
    if (lightboxOverlay) return lightboxOverlay;

    lightboxOverlay = document.createElement("div");
    lightboxOverlay.className = "gallery-lightbox";
    lightboxOverlay.id = "gallery-lightbox";
    lightboxOverlay.setAttribute("aria-hidden", "true");
    lightboxOverlay.setAttribute("role", "dialog");
    lightboxOverlay.setAttribute("aria-modal", "true");
    lightboxOverlay.setAttribute("aria-label", "Vista ampliada");
    lightboxOverlay.innerHTML =
      '<div class="gallery-lightbox__blocking" data-lightbox-close tabindex="-1" aria-hidden="true"></div>' +
      '<div class="gallery-lightbox__wrap">' +
      '<div class="gallery-lightbox__content">' +
      '<figure class="gallery-lightbox__figure"><img class="gallery-lightbox__img" alt="" /></figure>' +
      "</div></div>" +
      '<button type="button" class="gallery-lightbox__nav gallery-lightbox__nav--prev" data-lightbox-prev aria-label="Foto anterior">' +
      '<img src="' +
      getIconUrl("arrow-scroll-left.svg") +
      '" width="28" height="28" alt="" /></button>' +
      '<button type="button" class="gallery-lightbox__nav gallery-lightbox__nav--next" data-lightbox-next aria-label="Foto siguiente">' +
      '<img src="' +
      getIconUrl("arrow-scroll-right.svg") +
      '" width="28" height="28" alt="" /></button>' +
      '<button type="button" class="gallery-lightbox__close" data-lightbox-close aria-label="Cerrar">' +
      '<svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle class="gallery-lightbox__close-bg" cx="20" cy="20" r="20"></circle>' +
      '<path d="M13.5 13.5l13 13M26.5 13.5l-13 13" stroke="#141414" stroke-width="1.5" fill="none"></path>' +
      "</svg></button>";

    lightboxImg = lightboxOverlay.querySelector(".gallery-lightbox__img");

    lightboxOverlay.querySelectorAll("[data-lightbox-close]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        setGalleryLightboxOpen(false);
      });
    });

    var prevBtn = lightboxOverlay.querySelector("[data-lightbox-prev]");
    var nextBtn = lightboxOverlay.querySelector("[data-lightbox-next]");

    if (prevBtn) {
      prevBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (lightboxGalleryApi) lightboxGalleryApi.step(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (lightboxGalleryApi) lightboxGalleryApi.step(1);
      });
    }

    document.addEventListener("keydown", function (e) {
      if (!lightboxOpen) return;
      if (e.key === "Escape") {
        setGalleryLightboxOpen(false);
        return;
      }
      if (!lightboxGalleryApi || lightboxGalleryApi.getTotal() <= 1) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        lightboxGalleryApi.step(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        lightboxGalleryApi.step(-1);
      }
    });

    document.body.appendChild(lightboxOverlay);
    return lightboxOverlay;
  }

  function setGalleryLightboxOpen(open) {
    ensureGalleryLightbox();
    lightboxOpen = open;
    lightboxOverlay.classList.toggle("is-open", open);
    lightboxOverlay.setAttribute("aria-hidden", open ? "false" : "true");
    document.documentElement.classList.toggle("gallery-lightbox-enabled", open);
    if (!open) {
      lightboxSuppressUntil = Date.now() + 450;
    } else {
      updateLightboxNavState();
    }
    if (open) {
      document.body.style.overflow = "hidden";
    } else if (
      !document.querySelector(".gallery-details-overlay.is-open") &&
      !document.querySelector(".menu-overlay.is-open")
    ) {
      document.body.style.overflow = "";
    }
  }

  function openGalleryLightbox(data) {
    if (!data || !data.src || isMobile()) return;
    if (Date.now() < lightboxSuppressUntil) return;
    ensureGalleryLightbox();
    updateLightboxImage(data);
    setGalleryLightboxOpen(true);
  }

  function isOverlayBlocking() {
    return (
      lightboxOpen ||
      document.querySelector(".menu-overlay.is-open") ||
      document.querySelector(".gallery-details-overlay.is-open")
    );
  }

  function initGalleryLightbox(root, api) {
    if (root.hasAttribute("data-index-hero")) return;

    lightboxGalleryApi = api;

    var desktopMains = root.querySelectorAll(".gallery-desktop [data-gallery-main]");
    desktopMains.forEach(function (main) {
      main.addEventListener("click", function (e) {
        if (isMobile()) return;
        if (Date.now() < lightboxSuppressUntil) return;
        if (isOverlayBlocking()) return;
        e.preventDefault();
        e.stopPropagation();
        openGalleryLightbox(api.getCurrentPhoto());
      });
    });
  }

  function initSeriesGallery(root) {
    var mains = Array.prototype.slice.call(root.querySelectorAll("[data-gallery-main]"));
    var pageRoot = root.closest(".page") || root;
    var counters = Array.prototype.slice.call(pageRoot.querySelectorAll("[data-gallery-counter]"));
    var photosRoot = root.querySelector("[data-gallery-photos]");
    var photos = [];

    if (photosRoot) {
      photos = Array.prototype.slice.call(photosRoot.querySelectorAll("[data-gallery-photo]"));
    }
    if (photos.length === 0) {
      var legacyStrip = root.querySelector("[data-gallery-strip]");
      if (legacyStrip) {
        photos = Array.prototype.slice.call(legacyStrip.querySelectorAll("button[data-src]"));
      }
    }

    if (photos.length === 0 || mains.length === 0) return;

    var total = photos.length;
    var index = 0;
    var locked = false;
    var wheelTimer = null;
    var heroSlotH = 0;
    var heroSlotW = 0;

    function getDesktopDisplayHeight(data, maxW, maxH) {
      if (data.orientation === "portrait") {
        return Math.min(maxH, maxW / data.aspect);
      }
      var w = Math.min(maxW, maxH * data.aspect);
      return w / data.aspect;
    }

    function getDesktopDisplayWidth(data, maxW, maxH) {
      if (data.orientation === "portrait") {
        var h = Math.min(maxH, maxW / data.aspect);
        return h * data.aspect;
      }
      return Math.min(maxW, maxH * data.aspect);
    }

    function getDesktopLimits() {
      var docStyle = getComputedStyle(document.documentElement);
      var maxW = parseFloat(docStyle.getPropertyValue("--series-hero-max-w"));
      var maxH = parseFloat(docStyle.getPropertyValue("--series-hero-max-h"));
      if (!maxW || !maxH) {
        var shellPad = parseFloat(docStyle.getPropertyValue("--shell-pad-x")) || 40;
        var uiScale = Math.max(0.5, window.innerWidth / 1440);
        maxW = Math.min(720 * uiScale, window.innerWidth - shellPad * 2);
        maxH = Math.min(480 * uiScale, window.innerHeight * 0.6);
      }
      return { maxW: maxW, maxH: maxH };
    }

    function getMobileMaxHeroH() {
      var docStyle = getComputedStyle(document.documentElement);
      var chromeHeader = parseFloat(docStyle.getPropertyValue("--chrome-header")) || 72;
      var chromeFooter = parseFloat(docStyle.getPropertyValue("--chrome-footer")) || 80;
      var reserveRaw = docStyle.getPropertyValue("--gallery-mobile-reserve").trim();
      var reserve = reserveRaw.endsWith("px") ? parseFloat(reserveRaw) : 24;
      if (!root.classList.contains("gallery-page--single")) {
        reserve += 56;
      }
      if (root.querySelector(".gallery-mobile__bar")) {
        reserve += 36;
      }
      var viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      return Math.max(140, viewportH - chromeHeader - chromeFooter - reserve);
    }

    function applyFrameMetrics() {
      var doc = document.documentElement;
      if (!heroSlotW || !heroSlotH) return;

      var isSingle = root.classList.contains("gallery-page--single");
      var navSize = isSingle ? 0 : 28;
      var gap = isSingle ? 0 : 50;
      var slotW = heroSlotW;
      var slotH = heroSlotH;
      var frameW = slotW + navSize * 2 + gap * 2;

      if (isMobile()) {
        var rootStyle = getComputedStyle(document.documentElement);
        var shellPad = parseFloat(rootStyle.getPropertyValue("--shell-pad-x")) || 20;
        var maxFrameW = Math.max(200, window.innerWidth - shellPad * 2);

        if (!isSingle) {
          var photoDims = getMobilePhotoDims();
          if (photoDims.w && photoDims.h) {
            slotW = photoDims.w;
            slotH = photoDims.h;
            frameW = slotW;
            navSize = 0;
            gap = 0;
          }
        } else {
          var singleDims = getMobilePhotoDims();
          if (singleDims.w && singleDims.h) {
            slotW = singleDims.w;
            slotH = singleDims.h;
            frameW = slotW;
            navSize = 0;
            gap = 0;
          } else {
            var maxHeroH = getMobileMaxHeroH();

            if (slotH > maxHeroH) {
              var hScale = maxHeroH / slotH;
              slotH = Math.round(slotH * hScale);
              slotW = Math.round(slotW * hScale);
            }

            frameW = slotW + navSize * 2 + gap * 2;
            if (frameW > maxFrameW) {
              var wScale = maxFrameW / frameW;
              frameW = maxFrameW;
              slotW = Math.round(slotW * wScale);
              slotH = Math.round(slotH * wScale);
            }
          }
        }
      }

      doc.style.setProperty("--series-hero-slot-w", slotW + "px");
      doc.style.setProperty("--series-hero-slot-h", slotH + "px");
      doc.style.setProperty("--series-frame-w", frameW + "px");
      doc.style.setProperty("--gallery-nav-gap", gap + "px");

      root.querySelectorAll("[data-gallery-frame]").forEach(function (frame) {
        if (isMobile()) {
          frame.style.removeProperty("width");
          frame.style.removeProperty("max-width");
          frame.style.removeProperty("min-width");
          frame.style.removeProperty("height");
          frame.style.removeProperty("min-height");
          frame.style.removeProperty("max-height");
        } else {
          frame.style.width = frameW + "px";
          frame.style.minWidth = frameW + "px";
          frame.style.height = slotH + "px";
          frame.style.minHeight = slotH + "px";
        }
      });
    }

    function refreshHeroSlot() {
      var doc = document.documentElement;
      heroSlotH = 0;
      heroSlotW = 0;

      if (isMobile()) {
        var photoDims = getMobilePhotoDims();
        heroSlotW = photoDims.w;
        heroSlotH = photoDims.h;
        doc.style.removeProperty("--series-hero-max-w");
        doc.style.removeProperty("--series-hero-max-h");
        applyFrameMetrics();
        return;
      }

      doc.style.removeProperty("--series-hero-max-w");
      doc.style.removeProperty("--series-hero-max-h");

      var limits = getDesktopLimits();
      photos.forEach(function (photo) {
        var data = readPhoto(photo);
        var w = getDesktopDisplayWidth(data, limits.maxW, limits.maxH);
        var h = getDesktopDisplayHeight(data, limits.maxW, limits.maxH);
        if (w > heroSlotW) heroSlotW = w;
        if (h > heroSlotH) heroSlotH = h;
      });

      if (heroSlotW && heroSlotH) {
        applyFrameMetrics();
      } else {
        doc.style.removeProperty("--series-hero-slot-w");
        doc.style.removeProperty("--series-hero-slot-h");
        doc.style.removeProperty("--series-frame-w");
      }
    }

    function readPhoto(el) {
      var w = Number(el.getAttribute("data-w")) || 0;
      var h = Number(el.getAttribute("data-h")) || 0;
      var orient = el.getAttribute("data-orientation");
      if (!orient && w && h) {
        orient = h > w ? "portrait" : "landscape";
      }
      return {
        src: el.getAttribute("data-src") || "",
        w: w,
        h: h,
        alt: el.getAttribute("data-alt") || "",
        orientation: orient || "landscape",
        aspect: w && h ? w / h : 1.5,
      };
    }

    function applyMobileHeroSize(img, data) {
      if (!img.closest(".gallery-mobile")) return;

      if (!heroSlotH) refreshHeroSlot();

      var metrics = getMobileMetrics();
      var display = getMobileDisplaySize(metrics, data);

      img.style.display = "block";
      img.style.width = display.w + "px";
      img.style.height = display.h + "px";
      img.style.maxWidth = heroSlotW + "px";
      img.style.maxHeight = heroSlotH + "px";
      img.style.objectFit = "";
    }

    function clearMobileHeroSize(img) {
      img.style.display = "";
      img.style.width = "";
      img.style.height = "";
      img.style.maxWidth = "";
      img.style.maxHeight = "";
      img.style.objectFit = "";
    }

    function applyHeroMeta(data) {
      mains.forEach(function (main) {
        main.setAttribute("data-orientation", data.orientation);
        main.classList.toggle("is-portrait", data.orientation === "portrait");
        main.classList.toggle("is-landscape", data.orientation !== "portrait");
        if (data.alt) main.alt = data.alt;

        if (main.closest(".gallery-mobile") && isMobile()) {
          clearMobileHeroSize(main);
        } else {
          clearMobileHeroSize(main);
          main.style.width = "";
          main.style.height = "";
          main.style.maxWidth = heroSlotW ? heroSlotW + "px" : "";
          main.style.maxHeight = heroSlotH ? heroSlotH + "px" : "";
        }
      });
    }

    function initMobileSwipe() {
      var swipeRoot = root.querySelector(".gallery-mobile__stage");
      if (!swipeRoot || total <= 1) return;

      var touchStartX = 0;
      var touchStartY = 0;
      var touchDeltaX = 0;
      var tracking = false;

      function shouldIgnoreSwipe() {
        return isOverlayBlocking();
      }

      swipeRoot.addEventListener(
        "touchstart",
        function (e) {
          if (shouldIgnoreSwipe() || e.touches.length !== 1) return;
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchDeltaX = 0;
          tracking = true;
        },
        { passive: true }
      );

      swipeRoot.addEventListener(
        "touchmove",
        function (e) {
          if (!tracking || e.touches.length !== 1) return;
          var dx = e.touches[0].clientX - touchStartX;
          var dy = e.touches[0].clientY - touchStartY;
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE_AXIS_LOCK) {
            tracking = false;
            return;
          }
          if (Math.abs(dx) > SWIPE_AXIS_LOCK) {
            touchDeltaX = dx;
            e.preventDefault();
          }
        },
        { passive: false }
      );

      swipeRoot.addEventListener(
        "touchend",
        function () {
          if (!tracking) return;
          tracking = false;
          if (Math.abs(touchDeltaX) >= SWIPE_THRESHOLD) {
            step(touchDeltaX < 0 ? 1 : -1);
          }
          touchDeltaX = 0;
        },
        { passive: true }
      );
    }

    function updateCounter() {
      var label = index + 1 + "/" + total;
      counters.forEach(function (el) {
        el.textContent = label;
      });
    }

    function swapMain(data, animate) {
      mains.forEach(function (main) {
        var wrap = main.closest("[data-img-reveal]");
        if (wrap && animate) {
          wrap.classList.add("is-carousel-ready");
        }

        function apply() {
          main.src = data.src;
          main.alt = data.alt;
          applyHeroMeta(data);
          main.classList.remove("is-fading");
        }

        if (!animate || !data.src) {
          apply();
          return;
        }

        main.classList.add("is-fading");
        window.setTimeout(function () {
          var done = false;
          function finish() {
            if (done) return;
            done = true;
            apply();
          }
          main.addEventListener("load", finish, { once: true });
          main.src = data.src;
          window.setTimeout(finish, FADE_MS + 120);
        }, FADE_MS);
      });
    }

    function setActive(newIndex, opts) {
      opts = opts || {};
      index = mod(newIndex, total);
      var data = readPhoto(photos[index]);
      swapMain(data, opts.animate !== false);
      updateCounter();
      preload(readPhoto(photos[mod(index + 1, total)]).src);
      preload(readPhoto(photos[mod(index - 1, total)]).src);
    }

    function step(delta, opts) {
      opts = opts || {};
      if (total <= 1) return;
      if (locked && !opts.keepLightbox) return;
      if (lightboxOpen && !opts.keepLightbox) setGalleryLightboxOpen(false);
      if (!opts.keepLightbox) locked = true;
      setActive(index + delta, { animate: opts.keepLightbox ? false : opts.animate !== false });
      if (lightboxOpen && opts.keepLightbox) {
        updateLightboxImage(readPhoto(photos[index]));
      }
      if (!opts.keepLightbox) {
        window.clearTimeout(wheelTimer);
        wheelTimer = window.setTimeout(function () {
          locked = false;
          wheelTimer = null;
        }, WHEEL_LOCK_MS);
      }
    }

    root.querySelectorAll("[data-gallery-prev]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        step(-1);
      });
    });

    root.querySelectorAll("[data-gallery-next]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        step(1);
      });
    });

    root.addEventListener(
      "wheel",
      function (e) {
        if (root.hasAttribute("data-index-hero")) return;
        if (isOverlayBlocking()) return;
        var dy = e.deltaY;
        if (Math.abs(dy) < WHEEL_THRESHOLD) return;
        e.preventDefault();
        step(dy > 0 ? 1 : -1);
      },
      { passive: false }
    );

    window.addEventListener("keydown", function (e) {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (!root.isConnected) return;
      if (isOverlayBlocking()) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        step(-1);
      }
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      if (!root.isConnected) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        refreshHeroSlot();
        applyHeroMeta(readPhoto(photos[index]));
      }, 80);
    });

    root.classList.toggle(
      "gallery-page--single",
      total <= 1 || root.hasAttribute("data-index-hero")
    );

    function initSlideshowClick() {
      if (total <= 1) return;

      var selectors = [".cursor-slideshow-target"];
      if (!root.hasAttribute("data-index-hero")) {
        selectors.push(".gallery-mobile .gallery-page__viewport");
      }

      var targets = root.querySelectorAll(selectors.join(", "));
      if (!targets.length) return;

      targets.forEach(function (target) {
        target.addEventListener("click", function (e) {
          if (total <= 1 || locked) return;
          if (e.target.closest("a, button, input, textarea, select, [role='button']")) return;

          var rect = target.getBoundingClientRect();
          step(e.clientX < rect.left + rect.width / 2 ? -1 : 1);
        });
      });
    }

    refreshHeroSlot();
    setActive(0, { animate: false });
    initMobileSwipe();
    initSlideshowClick();
    initGalleryLightbox(root, {
      getCurrentPhoto: function () {
        return readPhoto(photos[index]);
      },
      getTotal: function () {
        return total;
      },
      step: function (delta) {
        step(delta, { keepLightbox: true });
      },
    });
  }

  function initLegacyStrip(strip) {
    if (strip.closest("[data-series-gallery]")) return;
    var root = strip.closest(".gallery-desktop") || strip.closest(".gallery-mobile");
    if (!root) return;
    var main = root.querySelector("[data-gallery-main]");
    var counters = root.querySelectorAll("[data-gallery-counter]");
    var buttons = strip.querySelectorAll("button[data-src]");
    var total = buttons.length;
    if (!main || total === 0) return;

    function setActive(idx) {
      buttons.forEach(function (btn, i) {
        btn.setAttribute("aria-current", i === idx ? "true" : "false");
      });
      var btn = buttons[idx];
      var src = btn.getAttribute("data-src");
      var w = btn.getAttribute("data-w");
      var h = btn.getAttribute("data-h");
      if (src) main.src = src;
      if (w) main.width = Number(w);
      if (h) main.height = Number(h);
      var label = idx + 1 + "/" + total;
      counters.forEach(function (el) {
        el.textContent = label;
      });
    }

    strip.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-src]");
      if (!btn || !strip.contains(btn)) return;
      var idx = Array.prototype.indexOf.call(buttons, btn);
      if (idx >= 0) setActive(idx);
    });

    setActive(0);
  }

  function initGalleryDetails() {
    var openBtns = document.querySelectorAll("[data-details-open]");
    var overlay = document.getElementById("gallery-details-overlay");
    var closeBtns = document.querySelectorAll("[data-details-close]");
    var panel = overlay ? overlay.querySelector(".gallery-details-overlay__panel") : null;
    if (!openBtns.length || !overlay) return;

    function setDetailsOpen(open) {
      var menuOverlay = document.getElementById("menu-overlay");
      var menuBtn = document.querySelector("[data-menu-open]");

      if (open && menuOverlay && menuOverlay.classList.contains("is-open")) {
        menuOverlay.classList.remove("is-open");
        menuOverlay.setAttribute("aria-hidden", "true");
        if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      }

      overlay.classList.toggle("is-open", open);
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
      openBtns.forEach(function (btn) {
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.body.style.overflow = open ? "hidden" : "";
    }

    openBtns.forEach(function (openBtn) {
      openBtn.addEventListener("click", function (e) {
        e.preventDefault();
        setDetailsOpen(true);
      });
    });

    closeBtns.forEach(function (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        setDetailsOpen(false);
      });
    });

    if (panel) {
      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        setDetailsOpen(false);
      }
    });
  }

  var SERIES_NAV = [
    { file: "la-hora-queta.html", title: "La hora quieta" },
    { file: "geografias-de-ocio.html", title: "Geografías de ocio" },
    { file: "rituales.html", title: "Rituales" },
    { file: "coreografia-urbana.html", title: "Coreografía urbana" },
    { file: "japon.html", title: "Japón" },
    { file: "random-access-memory.html", title: "Random Access Memory" },
  ];

  function getCurrentSeriesIndex() {
    var file = window.location.pathname.split("/").pop() || "";
    for (var i = 0; i < SERIES_NAV.length; i += 1) {
      if (SERIES_NAV[i].file === file) return i;
    }
    return -1;
  }

  function getSeriesStageContext(counter) {
    var center = counter.closest(".gallery-page__center");
    if (center) {
      var stage = center.querySelector(".gallery-page__stage");
      if (stage) {
        return {
          container: stage,
          frame: stage.querySelector("[data-gallery-frame]"),
        };
      }
    }

    return null;
  }

  function createSeriesNavLink(kind, series, options) {
    options = options || {};
    var link = document.createElement("a");
    link.className = "gallery-page__series-link gallery-page__series-link--" + kind;
    link.href = series.file;

    var label = document.createElement("span");
    label.className = "gallery-page__series-link-label";
    label.textContent = kind === "prev" ? "Anterior:" : "Siguiente:";

    var title = document.createElement("span");
    title.className = "gallery-page__series-link-title";
    title.textContent = options.bracketTitle ? "[" + series.title + "]" : series.title;

    link.appendChild(label);
    link.appendChild(title);
    link.setAttribute(
      "aria-label",
      (kind === "prev" ? "Serie anterior: " : "Serie siguiente: ") + series.title
    );
    return link;
  }

  function createSeriesNavLinks(prev, next) {
    return {
      prevLink: createSeriesNavLink("prev", prev, { bracketTitle: true }),
      nextLink: createSeriesNavLink("next", next, { bracketTitle: true }),
    };
  }

  function createMobileSeriesNavLink(kind, series) {
    return createSeriesNavLink(kind, series);
  }

  function createSeriesStageRow(prev, next) {
    var row = document.createElement("div");
    row.className = "gallery-page__stage-row";
    row.setAttribute("data-series-stage-row", "");

    var links = createSeriesNavLinks(prev, next);
    row.appendChild(links.prevLink);
    row.appendChild(links.nextLink);
    return row;
  }

  function initSeriesNav() {
    var index = getCurrentSeriesIndex();
    if (index < 0) return;

    var prev = SERIES_NAV[(index - 1 + SERIES_NAV.length) % SERIES_NAV.length];
    var next = SERIES_NAV[(index + 1) % SERIES_NAV.length];

    document.querySelectorAll("[data-gallery-counter]").forEach(function (counter) {
      var mobileStage = counter.closest(".gallery-mobile__stage");
      if (mobileStage) {
        if (mobileStage.querySelector("[data-series-nav]")) return;

        var nav = document.createElement("nav");
        nav.className = "gallery-page__series-nav";
        nav.setAttribute("data-series-nav", "");
        nav.setAttribute("aria-label", "Navegación entre series");
        nav.appendChild(createMobileSeriesNavLink("prev", prev));
        nav.appendChild(createMobileSeriesNavLink("next", next));
        counter.insertAdjacentElement("afterend", nav);
        return;
      }

      var ctx = getSeriesStageContext(counter);
      if (!ctx || !ctx.container || !ctx.frame) return;
      if (ctx.container.querySelector("[data-series-stage-row]")) return;

      var row = createSeriesStageRow(prev, next);
      var frame = ctx.frame;
      frame.parentNode.insertBefore(row, frame);
      row.insertBefore(frame, row.querySelector(".gallery-page__series-link--next"));
    });
  }

  document.querySelectorAll("[data-series-gallery]").forEach(initSeriesGallery);
  document.querySelectorAll("[data-gallery-strip]").forEach(initLegacyStrip);
  initGalleryDetails();
  initSeriesNav();
})();
