(function () {
  "use strict";

  function prefersReducedMotion() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function isAnimatedPage() {
    if (!document.querySelector(".site-header")) return false;
    if (document.body.hasAttribute("data-no-page-transition")) return false;
    return true;
  }

  function wrapLine(el) {
    if (!el || el.querySelector(".chrome-reveal__inner")) return;

    var text = (el.textContent || "").trim();
    if (!text) return;

    el.textContent = "";

    var outer = document.createElement("span");
    outer.className = "chrome-reveal";
    outer.setAttribute("aria-hidden", "true");

    var inner = document.createElement("span");
    inner.className = "chrome-reveal__inner";
    inner.textContent = text;

    outer.appendChild(inner);
    el.appendChild(outer);
  }

  function wrapBlock(el) {
    if (!el || el.querySelector(".chrome-reveal__inner")) return;

    var content = el.firstElementChild;
    if (!content) return;

    var outer = document.createElement("span");
    outer.className = "chrome-reveal chrome-reveal--block";

    var inner = document.createElement("span");
    inner.className = "chrome-reveal__inner";
    inner.appendChild(content);

    outer.appendChild(inner);
    el.appendChild(outer);
  }

  function wrapTitle(title) {
    if (!title || title.querySelector(".chrome-reveal__inner")) return;

    var swipe = title.querySelector(".swipe-letters");
    if (!swipe) return;

    var outer = document.createElement("span");
    outer.className = "chrome-reveal chrome-reveal--title";

    var inner = document.createElement("span");
    inner.className = "chrome-reveal__inner";
    inner.appendChild(swipe);

    outer.appendChild(inner);
    title.appendChild(outer);
  }

  function setDelay(el, ms) {
    if (!el) return;
    el.style.setProperty("--chrome-enter-delay", ms + "ms");
  }

  function revealChrome() {
    document.body.classList.add("chrome-is-entered");
    window.setTimeout(function () {
      document.body.classList.remove("chrome-is-entering");
    }, 1800);
  }

  function boot() {
    if (!isAnimatedPage()) return;

    document.body.classList.add("chrome-is-entering");

    if (prefersReducedMotion()) {
      document.body.classList.add("chrome-is-entered");
      document.body.classList.remove("chrome-is-entering");
      return;
    }

    var navLinks = document.querySelectorAll(".site-header__nav a");
    navLinks.forEach(function (link, index) {
      wrapLine(link);
      setDelay(link, 50 + index * 75);
    });

    document.querySelectorAll(".site-header__social a").forEach(function (link, index) {
      wrapBlock(link);
      setDelay(link, 280 + index * 70);
    });

    var menuBtn = document.querySelector(".site-header__menu-btn");
    wrapBlock(menuBtn);
    setDelay(menuBtn, 420);

    var themeToggle = document.querySelector(".site-footer .theme-toggle");
    wrapBlock(themeToggle);
    setDelay(themeToggle, 480);

    var footerCopy = document.querySelector(".site-footer__copy");
    wrapLine(footerCopy);
    setDelay(footerCopy, 540);

    var title = document.querySelector(".site-header__title");
    wrapTitle(title);
    setDelay(title, 640);

    requestAnimationFrame(function () {
      requestAnimationFrame(revealChrome);
    });
  }

  function resetChromeFromCache() {
    if (!isAnimatedPage()) return;
    document.body.classList.remove("page-is-leaving", "chrome-is-entering");
    document.body.classList.add("chrome-is-entered");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      resetChromeFromCache();
    }
  });
})();
