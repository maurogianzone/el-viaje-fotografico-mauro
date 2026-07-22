(function () {
  const THEME_KEY = "mg-theme";

  function getStoredTheme() {
    try {
      return sessionStorage.getItem(THEME_KEY);
    } catch (error) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      sessionStorage.setItem(THEME_KEY, theme);
      localStorage.removeItem(THEME_KEY);
    } catch (error) {
      /* ignore */
    }
  }

  function updateThemeToggleIcons() {
    const isDark = document.documentElement.dataset.theme === "dark";
    const iconName = isDark ? "icon-light-mode.svg" : "icon-dark-mode.svg";

    document.querySelectorAll(".theme-toggle__icon").forEach(function (img) {
      const current = img.getAttribute("src") || "";
      const dir = current.includes("/") ? current.replace(/[^/]+$/, "") : "assets/icons/";
      img.src = dir + iconName;
    });
  }

  function applyTheme(theme, options) {
    const instant = options && options.instant;

    function run() {
      const root = document.documentElement;
      if (theme === "dark" || theme === "light") {
        root.dataset.theme = theme;
      } else {
        delete root.dataset.theme;
      }

      const isDark = root.dataset.theme === "dark";
      document.querySelectorAll(".theme-toggle").forEach(function (btn) {
        btn.setAttribute("aria-label", isDark ? "Activar modo claro" : "Activar modo oscuro");
      });

      updateThemeToggleIcons();
    }

    if (!instant && typeof document.startViewTransition === "function") {
      document.startViewTransition(run);
    } else {
      run();
    }
  }

  function initTheme() {
    const stored = getStoredTheme();
    if (stored === "dark" || stored === "light") {
      applyTheme(stored, { instant: true });
      return;
    }
    // Default: always light (white background), ignore OS preference
    applyTheme("light", { instant: true });
  }

  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const root = document.documentElement;
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      setStoredTheme(next);
      applyTheme(next);
    });
  });

  initTheme();

  function getActiveSectionFile() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf("/personal/") !== -1 || /\/personal\.html$/.test(path)) {
      return "personal.html";
    }
    if (path.indexOf("sobre-mi") !== -1) {
      return "sobre-mi.html";
    }
    return null;
  }

  function markCurrentNav() {
    var activeFile = getActiveSectionFile();
    var navLinks = document.querySelectorAll(
      ".navbar__nav a[href], .site-header__nav a[href], .menu-overlay a[href]"
    );

    navLinks.forEach(function (link) {
      link.removeAttribute("aria-current");
      if (!activeFile) return;

      var href = link.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:)/i.test(href)) return;

      try {
        var linkFile = new URL(href, window.location.href).pathname.split("/").pop();
        if (linkFile === activeFile) {
          link.setAttribute("aria-current", "page");
        }
      } catch (err) {
        /* ignore malformed href */
      }
    });
  }

  markCurrentNav();

  const menuBtn = document.querySelector("[data-menu-open]");
  const overlay = document.getElementById("menu-overlay");
  const menuClose = document.querySelector("[data-menu-close]");

  function setMenuOpen(open) {
    if (!overlay) return;
    var detailsOverlay = document.getElementById("gallery-details-overlay");
    var detailsBtns = document.querySelectorAll("[data-details-open]");

    if (open && detailsOverlay && detailsOverlay.classList.contains("is-open")) {
      detailsOverlay.classList.remove("is-open");
      detailsOverlay.setAttribute("aria-hidden", "true");
      detailsBtns.forEach(function (btn) {
        btn.setAttribute("aria-expanded", "false");
      });
    }

    overlay.classList.toggle("is-open", open);
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (menuBtn && overlay) {
    menuBtn.addEventListener("click", function () {
      setMenuOpen(!overlay.classList.contains("is-open"));
    });
  }
  if (menuClose && overlay) {
    menuClose.addEventListener("click", function () {
      setMenuOpen(false);
    });
  }
  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) setMenuOpen(false);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && overlay.classList.contains("is-open")) {
      setMenuOpen(false);
    }
  });
})();
