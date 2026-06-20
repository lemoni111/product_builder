(function () {
  function initTabs() {
    var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-tool-target]"));
    var panels = Array.prototype.slice.call(document.querySelectorAll("[data-tool-panel]"));

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tool-target");
        tabs.forEach(function (item) {
          var active = item === tab;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-selected", active ? "true" : "false");
        });
        panels.forEach(function (panel) {
          var active = panel.getAttribute("data-tool-panel") === target;
          panel.classList.toggle("is-active", active);
          panel.hidden = !active;
        });
      });
    });
  }

  function renderContent() {
    var content = window.ToolNestContent || {};
    var featureList = document.getElementById("feature-list");
    var faqList = document.getElementById("faq-list");

    if (featureList && Array.isArray(content.features)) {
      featureList.innerHTML = content.features.map(function (feature) {
        return (
          '<article class="info-card">' +
          '<h3>' + feature.title + '</h3>' +
          '<p>' + feature.description + '</p>' +
          '</article>'
        );
      }).join("");
    }

    if (faqList && Array.isArray(content.faqs)) {
      faqList.innerHTML = content.faqs.map(function (faq) {
        return (
          '<article class="faq-item">' +
          '<h3>' + faq.question + '</h3>' +
          '<p>' + faq.answer + '</p>' +
          '</article>'
        );
      }).join("");
    }
  }

  function initTools() {
    var tools = window.ToolNestTools || {};
    ["timecode", "bitrate", "editor", "subtitle"].forEach(function (name) {
      if (tools[name] && typeof tools[name].init === "function") {
        tools[name].init();
      }
    });
  }

  function initThemeToggle() {
    var toggles = Array.prototype.slice.call(document.querySelectorAll("[data-theme-toggle]"));
    if (!toggles.length) {
      return;
    }

    function getTheme() {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }

    function applyTheme(theme) {
      var isDark = theme === "dark";
      document.documentElement.setAttribute("data-theme", theme);
      try {
        localStorage.setItem("toolnest-theme", theme);
      } catch (error) {
        // Ignore storage errors and keep the current page theme.
      }
      toggles.forEach(function (toggle) {
        var label = toggle.querySelector("[data-theme-label]");
        toggle.setAttribute("aria-pressed", isDark ? "true" : "false");
        toggle.setAttribute("aria-label", isDark ? "화이트 모드로 전환" : "다크 모드로 전환");
        if (label) {
          label.textContent = isDark ? "다크 모드" : "화이트 모드";
        }
      });
    }

    toggles.forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        applyTheme(getTheme() === "dark" ? "light" : "dark");
      });
    });

    applyTheme(getTheme());
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderContent();
    initTabs();
    initTools();
    initThemeToggle();
  });
})();
