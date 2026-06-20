(function () {
  function parseDuration(value) {
    var parts = String(value || "").trim().split(":").map(Number);
    if (parts.length < 2 || parts.length > 3 || parts.some(function (part) { return Number.isNaN(part) || part < 0; })) {
      return null;
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  function formatMbps(kbps) {
    return (kbps / 1000).toFixed(2) + " Mbps";
  }

  function init() {
    var durationEl = document.getElementById("br-duration");
    var sizeEl = document.getElementById("br-size");
    var unitEl = document.getElementById("br-unit");
    var audioEl = document.getElementById("br-audio");
    var resultEl = document.getElementById("br-result");

    if (!durationEl || !sizeEl || !unitEl || !audioEl || !resultEl) return;

    function update() {
      var seconds = parseDuration(durationEl.value);
      var size = Number(sizeEl.value);
      var unit = unitEl.value;
      var audioKbps = Number(audioEl.value) || 128;

      if (!seconds || seconds <= 0 || !size || size <= 0) {
        resultEl.textContent = "영상 길이와 목표 용량을 올바르게 입력해 주세요.";
        return;
      }

      var megabytes = unit === "GB" ? size * 1024 : size;
      var totalKbps = (megabytes * 8192) / seconds;
      var videoKbps = Math.max(0, totalKbps - audioKbps);
      var estimatedPerMinute = (totalKbps * 60) / 8192;

      resultEl.innerHTML =
        '<div class="result-grid">' +
        '<div class="result-item"><span>권장 비디오 비트레이트</span><strong>' + formatMbps(videoKbps) + '</strong></div>' +
        '<div class="result-item"><span>전체 평균 비트레이트</span><strong>' + formatMbps(totalKbps) + '</strong></div>' +
        '<div class="result-item"><span>분당 예상 용량</span><strong>' + estimatedPerMinute.toFixed(1) + " MB" + '</strong></div>' +
        '</div>';
    }

    [durationEl, sizeEl, unitEl, audioEl].forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    update();
  }

  window.ToolNestTools = window.ToolNestTools || {};
  window.ToolNestTools.bitrate = { init: init };
})();
