(function () {
  function pad(value) {
    return String(Math.max(0, Math.floor(value))).padStart(2, "0");
  }

  function parseTimecode(value, fps) {
    var parts = String(value || "").trim().split(":").map(Number);
    if (parts.length !== 4 || parts.some(function (part) { return Number.isNaN(part) || part < 0; })) {
      return null;
    }
    var frameRate = Math.round(fps);
    var hours = parts[0];
    var minutes = parts[1];
    var seconds = parts[2];
    var frames = parts[3];
    if (minutes > 59 || seconds > 59 || frames >= frameRate) return null;
    return Math.round(((hours * 3600) + (minutes * 60) + seconds) * fps + frames);
  }

  function formatTimecode(totalFrames, fps) {
    var frameRate = Math.round(fps);
    var frames = Math.max(0, Math.round(totalFrames));
    var totalSeconds = Math.floor(frames / fps);
    var framePart = Math.round(frames - (totalSeconds * fps));
    if (framePart >= frameRate) {
      totalSeconds += 1;
      framePart = 0;
    }
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds) + ":" + pad(framePart);
  }

  function renderResult(resultEl, frames, fps) {
    var seconds = frames / fps;
    resultEl.innerHTML =
      '<div class="result-grid">' +
      '<div class="result-item"><span>총 프레임</span><strong>' + frames.toLocaleString("ko-KR") + '</strong></div>' +
      '<div class="result-item"><span>초 단위 길이</span><strong>' + seconds.toFixed(3) + "초" + '</strong></div>' +
      '<div class="result-item"><span>타임코드</span><strong>' + formatTimecode(frames, fps) + '</strong></div>' +
      '</div>';
  }

  function init() {
    var fpsEl = document.getElementById("tc-fps");
    var timecodeEl = document.getElementById("tc-timecode");
    var framesEl = document.getElementById("tc-frames");
    var resultEl = document.getElementById("tc-result");
    var lastEdited = "timecode";

    if (!fpsEl || !timecodeEl || !framesEl || !resultEl) return;

    function update() {
      var fps = Number(fpsEl.value) || 30;
      var frames = lastEdited === "frames"
        ? Math.max(0, Math.round(Number(framesEl.value) || 0))
        : parseTimecode(timecodeEl.value, fps);

      if (frames === null) {
        resultEl.textContent = "타임코드 형식을 확인해 주세요. 예: 00:01:30:00";
        return;
      }

      if (lastEdited === "frames") {
        timecodeEl.value = formatTimecode(frames, fps);
      } else {
        framesEl.value = frames;
      }
      renderResult(resultEl, frames, fps);
    }

    timecodeEl.addEventListener("input", function () {
      lastEdited = "timecode";
      update();
    });
    framesEl.addEventListener("input", function () {
      lastEdited = "frames";
      update();
    });
    fpsEl.addEventListener("change", update);
    update();
  }

  window.ToolNestTools = window.ToolNestTools || {};
  window.ToolNestTools.timecode = { init: init };
})();
