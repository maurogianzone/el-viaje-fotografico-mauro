(function () {
  "use strict";

  /**
   * Galería tipo siemprericc.com (portraits / video referencia):
   * - ventana de ítems relativos (-RANGE … +RANGE)
   * - paso con rueda + debounce 650ms
   * - drag en vivo + snap al soltar
   * - animación 1.75s power3.out, scale 1.45 / 0.87
   * - escala UI proporcional al ancho (desktop: Figma 1440px)
   * - móvil: foto activa casi a borde con gutter 19px (Figma 390×352)
   */

  var container = document.getElementById("gallery-container");
  var gallery = document.getElementById("gallery");
  var products = document.getElementById("gallery-products");
  if (!container || !gallery || !products) return;

  var MOBILE_BP = 900;
  var FIGMA_W = 1440;
  var RANGE_DESKTOP = 3;
  var RANGE_MOBILE = 1;
  var BASE_SIDE_W = 335;
  var BASE_SIDE_H = 223;
  var BASE_STEP = 675;
  var SCALE_SIDE = 0.87;
  var SCALE_CENTER = 1.45;
  var MOBILE_REF_W = 390;
  var MOBILE_GUTTER = 19;
  var MOBILE_VISUAL_W = 352;
  var MOBILE_VISUAL_H = 235;
  var MOBILE_STEP_RATIO = 364 / 390;
  var MOBILE_VISUAL_ASPECT = MOBILE_VISUAL_H / MOBILE_VISUAL_W;
  var SCALE_CENTER_MOBILE = 1.12;
  var PHOTO_SIZE_BOOST = 50;
  var SLOT_FRAME_SCALE = 0.6;
  var MOBILE_PORTRAIT_FRAME_SCALE = 0.68;
  var PORTRAIT_IMG_SCALE = 1;
  var UI_SCALE_MIN = 0.5;
  var DRAG_RATIO = 0.1;
  var WHEEL_LOCK_MS = 650;
  var ANIM_MS = 1750;
  var WHEEL_THRESHOLD = 15;

  var catalog = [];
  var slots = [];
  var activeIndex = 0;
  var count = 0;
  var isDesktop = true;
  var isLocked = false;
  var transitionsOn = false;
  var lockTimer = null;
  var wheelTimer = null;
  var resizeObserver = null;

  var isDragging = false;
  var dragStartX = 0;
  var dragDelta = 0;
  var mobileLeadEl = null;
  var mobileLeadTimer = null;
  var mobileEnterEl = null;
  var mobileIndicators = null;

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  var KNOWN_ASPECTS = {
    "colores-08.png": 1024 / 682,
    "colores-09.png": 1024 / 682,
    "colores-10.png": 681 / 1024,
    "colores-11.png": 682 / 1024,
    "colores-12.png": 1024 / 681,
    "colores-14.png": 1024 / 681,
  };

  var LANDSCAPE_ASPECT = BASE_SIDE_W / BASE_SIDE_H;

  function readImageOrientation(img) {
    var attr = img.getAttribute("data-orientation");
    if (attr === "portrait" || attr === "landscape") {
      return attr;
    }
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return img.naturalHeight > img.naturalWidth ? "portrait" : "landscape";
    }
    return "landscape";
  }

  function readImageAspect(img) {
    var attr = parseFloat(img.getAttribute("data-aspect"), 10);
    if (attr > 0) {
      return attr;
    }
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return img.naturalWidth / img.naturalHeight;
    }
    var name = (img.getAttribute("src") || "").split("/").pop();
    if (KNOWN_ASPECTS[name]) {
      return KNOWN_ASPECTS[name];
    }
    return LANDSCAPE_ASPECT;
  }

  function getMobilePortraitLimits(metrics) {
    var shell = document.querySelector(".gallery-shell");
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

  function getSlotSize(metrics, data) {
    if (data.orientation === "portrait") {
      var frameScale = isDesktop ? SLOT_FRAME_SCALE : MOBILE_PORTRAIT_FRAME_SCALE;
      var portraitW = metrics.sideW * frameScale * PORTRAIT_IMG_SCALE;
      var portraitH = portraitW / data.aspect;

      if (!isDesktop) {
        return clampMobilePortraitSize(metrics, portraitW, data.aspect);
      }

      return { w: portraitW, h: portraitH };
    }
    return { w: metrics.sideW, h: metrics.sideH };
  }

  function getLargestCenterVisual(metrics) {
    var maxW = 0;
    var maxH = 0;

    catalog.forEach(function (data) {
      var size = getSlotSize(metrics, data);
      var visualW = size.w * metrics.scaleCenter;
      var visualH = size.h * metrics.scaleCenter;
      if (visualH > maxH) {
        maxH = visualH;
        maxW = visualW;
      }
    });

    if (!maxW) {
      maxW = metrics.sideW * metrics.scaleCenter;
      maxH = metrics.sideH * metrics.scaleCenter;
    }

    return { w: maxW, h: maxH };
  }

  function getCenterVisual(metrics, dataIndex) {
    var data = catalog[dataIndex];
    var size = getSlotSize(metrics, data);
    return {
      w: size.w * metrics.scaleCenter,
      h: size.h * metrics.scaleCenter,
    };
  }

  function updateActivePhotoVars(metrics) {
    if (isDesktop) {
      document.documentElement.style.removeProperty("--photo-active-w");
      document.documentElement.style.removeProperty("--photo-active-h");
      return;
    }

    var center = slots.find(function (s) {
      return s.relativeIndex === 0;
    });
    if (!center) return;

    var visual = getCenterVisual(metrics, center.dataIndex);
    document.documentElement.style.setProperty("--photo-active-w", visual.w + "px");
    document.documentElement.style.setProperty("--photo-active-h", visual.h + "px");
  }

  function applySlotDimensions(el, size) {
    el.style.width = size.w + "px";
    el.style.height = size.h + "px";
    el.style.marginLeft = -size.w / 2 + "px";
    el.style.marginTop = -size.h / 2 + "px";
  }

  function getRange() {
    return isDesktop ? RANGE_DESKTOP : RANGE_MOBILE;
  }

  function getUiScale() {
    var w = window.innerWidth;
    if (!isDesktop) {
      return Math.max(UI_SCALE_MIN, w / MOBILE_REF_W);
    }
    return Math.max(UI_SCALE_MIN, w / FIGMA_W);
  }

  function getMobileMetrics(vw) {
    var visualW = Math.max(260, vw - MOBILE_GUTTER * 2);
    var sideW = visualW / SCALE_CENTER_MOBILE;
    var sideH = visualW * MOBILE_VISUAL_ASPECT;

    return {
      ui: vw / MOBILE_REF_W,
      sideW: sideW,
      sideH: sideH,
      scaleSide: SCALE_SIDE,
      scaleCenter: SCALE_CENTER_MOBILE,
      step: vw * MOBILE_STEP_RATIO,
      gutter: MOBILE_GUTTER,
      visualW: visualW,
    };
  }

  function getDesktopMetrics(ui) {
    var boost = PHOTO_SIZE_BOOST * ui;
    var heroWBase = BASE_SIDE_W * SCALE_CENTER;
    var sideW = BASE_SIDE_W * ui + boost / SCALE_CENTER;
    var sideH = sideW * (BASE_SIDE_H / BASE_SIDE_W);
    var step = BASE_STEP * ui + boost * (BASE_STEP / heroWBase);

    return {
      ui: ui,
      sideW: sideW,
      sideH: sideH,
      scaleSide: SCALE_SIDE,
      scaleCenter: SCALE_CENTER,
      step: step,
    };
  }

  function getMetrics() {
    var vw = window.innerWidth;

    if (!isDesktop) {
      return getMobileMetrics(vw);
    }

    return getDesktopMetrics(getUiScale());
  }

  function updateLayoutVars(metrics) {
    var centerVisual = getLargestCenterVisual(metrics);

    document.documentElement.style.setProperty("--gallery-ui-scale", String(metrics.ui));
    document.documentElement.style.setProperty("--photo-side-w", metrics.sideW + "px");
    document.documentElement.style.setProperty("--photo-side-h", metrics.sideH + "px");
    if (metrics.gutter != null) {
      document.documentElement.style.setProperty(
        "--mobile-gallery-gutter",
        metrics.gutter + "px"
      );
    }
    document.documentElement.style.setProperty("--photo-hero-w", centerVisual.w + "px");
    document.documentElement.style.setProperty("--photo-hero-h", centerVisual.h + "px");
    document.documentElement.style.setProperty("--gallery-step", metrics.step + "px");
    document.documentElement.style.setProperty(
      "--gallery-scale-center",
      String(metrics.scaleCenter)
    );
  }

  function getMobileOpacityFromScale(scale, metrics) {
    var minS = metrics.scaleSide;
    var maxS = metrics.scaleCenter;
    if (maxS <= minS) {
      return scale >= maxS ? 1 : 0;
    }
    var t = (scale - minS) / (maxS - minS);
    return Math.max(0, Math.min(1, t));
  }

  function getMobileDragOpacity(rel, metrics, dragPx) {
    if (rel === 0) return 1;
    var neighbor = dragPx < 0 ? 1 : dragPx > 0 ? -1 : null;
    if (neighbor === null || rel !== neighbor) return 0;
    var thresh = metrics.step * DRAG_RATIO;
    if (thresh <= 0) return 0;
    return Math.min(1, Math.abs(dragPx) / thresh);
  }

  function getMobileTransitionOpacity(slot, rel, metrics) {
    var isLead = mobileLeadEl && slot.el === mobileLeadEl;
    var isEnter = mobileEnterEl && slot.el === mobileEnterEl;

    if (isLead) {
      var leadScale = rel === 0 ? metrics.scaleCenter : metrics.scaleSide;
      return getMobileOpacityFromScale(leadScale, metrics);
    }
    if (isEnter) {
      if (rel === 0) return 0;
      return getMobileOpacityFromScale(metrics.scaleSide, metrics);
    }
    if (rel === 0) return 1;
    return 0;
  }

  function getMobileOpacity(slot, rel, metrics, dragPx) {
    if (isDragging) {
      return getMobileDragOpacity(rel, metrics, dragPx || 0);
    }
    if (mobileLeadEl || mobileEnterEl) {
      return getMobileTransitionOpacity(slot, rel, metrics);
    }
    return rel === 0 ? 1 : 0;
  }

  function captureMobileEnter(forward) {
    if (isDesktop) {
      mobileEnterEl = null;
      return;
    }
    var rel = forward ? 1 : -1;
    var incoming = slots.find(function (s) {
      return s.relativeIndex === rel;
    });
    mobileEnterEl = incoming ? incoming.el : null;
  }

  function bumpMobileEnterOpacity() {
    if (!mobileEnterEl) return;
    var el = mobileEnterEl;
    var metrics = getMetrics();
    var target = getMobileOpacityFromScale(metrics.scaleCenter, metrics);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (el.isConnected) {
          el.style.opacity = String(target);
        }
        mobileEnterEl = null;
      });
    });
  }

  function buildTransform(rel, metrics, dragPx, dragCenterOnly) {
    var tx = rel * metrics.step;
    if (dragPx) {
      if (dragCenterOnly) {
        if (rel === 0) tx += dragPx;
      } else {
        tx += dragPx;
      }
    }
    var scale = rel === 0 ? metrics.scaleCenter : metrics.scaleSide;
    if (tx === 0) {
      return "translate3d(0, 0, 0) scale(" + scale + ", " + scale + ")";
    }
    return (
      "translate3d(" + tx + "px, 0, 0) scale(" + scale + ", " + scale + ")"
    );
  }

  function applySlotStyles(dragPx, animate) {
    var metrics = getMetrics();
    var dragCenterOnly = !isDesktop && isDragging;
    updateLayoutVars(metrics);
    updateActivePhotoVars(metrics);
    products.classList.toggle("products--animate", animate && transitionsOn);

    slots.forEach(function (slot) {
      var rel = slot.relativeIndex;
      var isCenter = rel === 0;
      var absRel = Math.abs(rel);
      var zIndex = isCenter ? 100 : Math.max(1, 50 - absRel);

      if (!isDesktop) {
        if (isDragging && isCenter) {
          zIndex = 200;
        } else if (mobileLeadEl && slot.el === mobileLeadEl) {
          zIndex = 150;
        } else if (isCenter) {
          zIndex = 100;
        } else {
          zIndex = 1;
        }
      }

      var data = catalog[slot.dataIndex];
      var size = getSlotSize(metrics, data);

      slot.el.dataset.relativeIndex = String(rel);
      applySlotDimensions(slot.el, size);
      slot.el.style.transform = buildTransform(rel, metrics, dragPx, dragCenterOnly);
      slot.el.style.zIndex = String(zIndex);
      slot.el.classList.toggle("is-active", isCenter);

      if (!isDesktop) {
        slot.el.style.opacity = String(getMobileOpacity(slot, rel, metrics, dragPx));
      } else {
        slot.el.style.opacity = "";
      }

      slot.el.style.visibility = "";
      slot.el.style.pointerEvents = "";
    });
  }

  function markMobileLead() {
    if (isDesktop) return;
    var center = slots.find(function (s) {
      return s.relativeIndex === 0;
    });
    mobileLeadEl = center ? center.el : null;
    clearTimeout(mobileLeadTimer);
    mobileLeadTimer = setTimeout(function () {
      mobileLeadEl = null;
      mobileEnterEl = null;
      applySlotStyles(0, false);
    }, ANIM_MS);
  }

  function createSlotElement(dataIndex, relativeIndex) {
    var data = catalog[dataIndex];
    var li = document.createElement("li");
    li.dataset.index = String(dataIndex);
    li.dataset.relativeIndex = String(relativeIndex);

    var img = document.createElement("img");
    img.src = data.img;
    img.alt = data.alt;
    img.removeAttribute("width");
    img.removeAttribute("height");
    img.loading = Math.abs(relativeIndex) <= 1 ? "eager" : "lazy";
    img.draggable = false;

    li.appendChild(img);
    return li;
  }

  function addSlot(relativeIndex) {
    var dataIndex = mod(activeIndex + relativeIndex, count);
    var el = createSlotElement(dataIndex, relativeIndex);
    products.appendChild(el);
    slots.push({ el: el, relativeIndex: relativeIndex, dataIndex: dataIndex });
    return el;
  }

  function removeSlotAtRelative(rel) {
    var idx = slots.findIndex(function (s) {
      return s.relativeIndex === rel;
    });
    if (idx === -1) return;
    slots[idx].el.remove();
    slots.splice(idx, 1);
  }

  function rebuildSlots() {
    products.innerHTML = "";
    slots = [];
    var range = getRange();
    for (var rel = -range; rel <= range; rel++) {
      addSlot(rel);
    }
    applySlotStyles(0, false);
  }

  function enableTransitions() {
    if (transitionsOn) return;
    transitionsOn = true;
    container.classList.add("container--ready");
  }

  function animateToDragOffset(offset) {
    applySlotStyles(offset, false);
  }

  function animateToRest() {
    applySlotStyles(0, true);
  }

  function setLocked(locked) {
    isLocked = locked;
    document.body.classList.toggle("is-gallery-locked", locked);
    if (!locked) return;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () {
      isLocked = false;
      document.body.classList.remove("is-gallery-locked");
    }, WHEEL_LOCK_MS);
  }

  function stepNext() {
    if (!count || isLocked) return;
    enableTransitions();
    captureMobileEnter(true);
    markMobileLead();

    var range = getRange();
    activeIndex = mod(activeIndex + 1, count);
    removeSlotAtRelative(-range);
    slots.forEach(function (slot) {
      slot.relativeIndex -= 1;
    });
    addSlot(range);
    animateToRest();
    bumpMobileEnterOpacity();
    setLocked(true);
  }

  function stepPrev() {
    if (!count || isLocked) return;
    enableTransitions();
    captureMobileEnter(false);
    markMobileLead();

    var range = getRange();
    activeIndex = mod(activeIndex - 1, count);
    removeSlotAtRelative(range);
    slots.forEach(function (slot) {
      slot.relativeIndex += 1;
    });
    addSlot(-range);
    animateToRest();
    bumpMobileEnterOpacity();
    setLocked(true);
  }

  function goToDataIndex(targetIndex) {
    if (isLocked || mod(targetIndex, count) === activeIndex) return;
    enableTransitions();
    activeIndex = mod(targetIndex, count);
    rebuildSlots();
    setLocked(true);
  }

  function onWheel(e) {
    if (document.body.classList.contains("loader-active")) return;
    if (isDragging) return;
    e.preventDefault();
    if (isLocked) return;

    var delta = e.deltaY || e.deltaX;
    if (delta === 0) return;

    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () {
      wheelTimer = null;
      if (isLocked) return;
      if (delta > 0) stepNext();
      else stepPrev();
    }, 50);
  }

  function onDragStart(e) {
    if (document.body.classList.contains("loader-active")) return;
    if (isLocked || e.button !== 0) return;
    if (e.target.closest("a, button, .mobile-indicators")) return;

    isDragging = true;
    mobileEnterEl = null;
    dragStartX = e.clientX;
    dragDelta = 0;
    products.classList.remove("products--animate");
    document.body.classList.add("is-gallery-dragging");
  }

  function onDragMove(e) {
    if (!isDragging) return;
    dragDelta = e.clientX - dragStartX;
    animateToDragOffset(dragDelta);
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove("is-gallery-dragging");

    var metrics = getMetrics();
    var threshold = metrics.step * DRAG_RATIO;

    if (Math.abs(dragDelta) > threshold) {
      if (dragDelta < 0) stepNext();
      else stepPrev();
    } else {
      enableTransitions();
      animateToRest();
    }
    dragDelta = 0;
  }

  function onItemClick(e) {
    if (document.body.classList.contains("loader-active")) return;
    var li = e.target.closest("li");
    if (!li || isLocked || isDragging) return;
    var index = parseInt(li.getAttribute("data-index"), 10);
    if (isNaN(index) || index === activeIndex) return;
    goToDataIndex(index);
  }

  function onTouchStart(e) {
    if (document.body.classList.contains("loader-active")) return;
    if (e.touches.length !== 1 || isLocked) return;
    if (e.target.closest(".mobile-indicators")) return;
    isDragging = true;
    mobileEnterEl = null;
    dragStartX = e.touches[0].clientX;
    dragDelta = 0;
    products.classList.remove("products--animate");
  }

  function onTouchMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    dragDelta = e.touches[0].clientX - dragStartX;
    animateToDragOffset(dragDelta);
  }

  function onTouchEnd() {
    if (!isDragging) return;
    isDragging = false;
    var metrics = getMetrics();
    var threshold = metrics.step * DRAG_RATIO;
    if (Math.abs(dragDelta) > threshold) {
      if (dragDelta < 0) stepNext();
      else stepPrev();
    } else {
      enableTransitions();
      animateToRest();
    }
    dragDelta = 0;
  }

  function bindControls() {
    products.addEventListener("click", onItemClick);

    gallery.addEventListener("mousedown", onDragStart);
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);

    gallery.addEventListener("touchstart", onTouchStart, { passive: true });
    gallery.addEventListener("touchmove", onTouchMove, { passive: false });
    gallery.addEventListener("touchend", onTouchEnd, { passive: true });

    window.addEventListener("wheel", onWheel, { passive: false });
  }

  function setMode() {
    var wasDesktop = isDesktop;
    isDesktop = window.innerWidth > MOBILE_BP;
    document.body.classList.toggle("is-gallery-desktop", isDesktop);
    document.body.classList.toggle("is-gallery-mobile", !isDesktop);

    if (wasDesktop !== isDesktop && count) {
      rebuildSlots();
      return;
    }

    if (isDragging) {
      applySlotStyles(dragDelta, false);
    } else if (!isLocked) {
      applySlotStyles(0, false);
    } else {
      updateLayoutVars(getMetrics());
    }
  }

  function init(options) {
    options = options || {};
    var sourceItems = products.querySelectorAll("li");
    sourceItems.forEach(function (li) {
      var img = li.querySelector("img");
      if (!img) return;
      var aspect = readImageAspect(img);
      catalog.push({
        img: img.getAttribute("src"),
        alt: img.getAttribute("alt") || "",
        orientation: readImageOrientation(img),
        aspect: aspect,
      });
    });
    count = catalog.length;
    if (!count) return;

    activeIndex = count <= 2 ? 0 : Math.floor((count - 1) / 2);
    isDesktop = window.innerWidth > MOBILE_BP;
    document.body.classList.toggle("is-gallery-desktop", isDesktop);
    document.body.classList.toggle("is-gallery-mobile", !isDesktop);
    mobileIndicators = document.querySelector(".mobile-indicators");
    rebuildSlots();
    bindControls();

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(setMode);
      resizeObserver.observe(container);
      resizeObserver.observe(gallery);
    }
    window.addEventListener("resize", setMode);

    if (!options.deferTransitions) {
      requestAnimationFrame(function () {
        enableTransitions();
      });
    }
  }

  function revealGalleryBeforeExit(done) {
    init({ deferTransitions: true });
    var slotImages = products.querySelectorAll("li img");
    window.MGShaftLoader.waitForImages(slotImages, function () {
      var decodeJobs = [];
      slotImages.forEach(function (img) {
        if (img.decode) {
          decodeJobs.push(img.decode().catch(function () {}));
        }
      });
      var afterLayout = function () {
        applySlotStyles(0, false);
        if (typeof done === "function") done();
      };
      if (decodeJobs.length) {
        Promise.all(decodeJobs).then(afterLayout);
      } else {
        afterLayout();
      }
    });
  }

  function startWithShaftLoader() {
    if (!window.MGShaftLoader) {
      init();
      enableTransitions();
      return;
    }

    window.MGShaftLoader.initEnter({
      getPreloadUrls: function () {
        var urls = [];
        document.querySelectorAll("#gallery-products img[src]").forEach(function (img) {
          urls.push(img.getAttribute("src"));
        });
        return urls;
      },
      onReveal: revealGalleryBeforeExit,
      onComplete: enableTransitions,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWithShaftLoader);
  } else {
    startWithShaftLoader();
  }
})();
