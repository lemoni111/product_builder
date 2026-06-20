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

  document.addEventListener("DOMContentLoaded", function () {
    renderContent();
    initTabs();
    initTools();
  });
})();
