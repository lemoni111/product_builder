(function () {
  function getStoredTheme() {
    try {
      return localStorage.getItem("toolnest-theme");
    } catch (error) {
      return null;
    }
  }

  function getInitialTheme() {
    var savedTheme = getStoredTheme();
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : (prefersDark ? "dark" : "light");
  }

  function applyTheme(theme, shouldStore) {
    var isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);

    if (shouldStore) {
      try {
        localStorage.setItem("toolnest-theme", theme);
      } catch (error) {
        // Keep the visual theme even when storage is unavailable.
      }
    }

    Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]")).forEach(function (toggle) {
      var label = toggle.querySelector("[data-theme-label]");
      toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
      toggle.setAttribute("aria-label", isDark ? "화이트 모드로 전환" : "다크 모드로 전환");
      if (label) {
        label.textContent = isDark ? "다크 모드" : "화이트 모드";
      }
    });
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function bindThemeToggles() {
    Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]")).forEach(function (toggle) {
      if (toggle.getAttribute("data-theme-bound") === "true") {
        return;
      }
      toggle.setAttribute("data-theme-bound", "true");
      toggle.addEventListener("click", function () {
        applyTheme(getCurrentTheme() === "dark" ? "light" : "dark", true);
      });
    });

    applyTheme(getCurrentTheme(), false);
  }

  applyTheme(getInitialTheme(), false);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindThemeToggles);
  } else {
    bindThemeToggles();
  }
})();
