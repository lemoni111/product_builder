(function () {
  function parseTime(value) {
    var match = String(value).match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!match) return null;
    return (
      Number(match[1]) * 3600000 +
      Number(match[2]) * 60000 +
      Number(match[3]) * 1000 +
      Number(match[4])
    );
  }

  function formatTime(ms) {
    var value = Math.max(0, Math.round(ms));
    var hours = Math.floor(value / 3600000);
    value -= hours * 3600000;
    var minutes = Math.floor(value / 60000);
    value -= minutes * 60000;
    var seconds = Math.floor(value / 1000);
    var millis = value - seconds * 1000;
    return (
      String(hours).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0") + "," +
      String(millis).padStart(3, "0")
    );
  }

  function shiftSrt(text, offsetMs) {
    var changed = 0;
    var output = String(text).replace(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/g,
      function (_match, start, end) {
        var startMs = parseTime(start);
        var endMs = parseTime(end);
        if (startMs == null || endMs == null) return _match;
        changed += 1;
        return formatTime(startMs + offsetMs) + " --> " + formatTime(endMs + offsetMs);
      }
    );
    return { output: output, changed: changed };
  }

  function downloadText(text, filename) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function init() {
    var fileEl = document.getElementById("sub-file");
    var fileInfo = document.getElementById("sub-file-info");
    var offsetEl = document.getElementById("sub-offset");
    var directionEl = document.getElementById("sub-direction");
    var applyBtn = document.getElementById("sub-apply");
    var downloadBtn = document.getElementById("sub-download");
    var originalEl = document.getElementById("sub-original");
    var outputEl = document.getElementById("sub-output");
    var resultEl = document.getElementById("sub-result");
    var originalText = "";
    var outputText = "";
    var sourceName = "subtitle";

    if (!fileEl || !offsetEl || !directionEl || !applyBtn || !downloadBtn || !originalEl || !outputEl || !resultEl) return;

    function setStatus(message) {
      resultEl.innerHTML = "<strong>상태</strong><br>" + message;
    }

    function getOffsetMs() {
      var seconds = Math.abs(Number(offsetEl.value) || 0);
      var sign = directionEl.value === "advance" ? -1 : 1;
      return sign * seconds * 1000;
    }

    function applyShift() {
      if (!originalText) {
        setStatus("먼저 SRT 파일을 선택해 주세요.");
        return;
      }
      var shifted = shiftSrt(originalText, getOffsetMs());
      outputText = shifted.output;
      outputEl.value = outputText.slice(0, 6000);
      setStatus(shifted.changed + "개의 자막 시간을 조정했습니다. 미리보기는 앞부분만 표시됩니다.");
    }

    fileEl.addEventListener("change", function () {
      var file = fileEl.files && fileEl.files[0];
      if (!file) return;
      sourceName = file.name.replace(/\.[^.]+$/, "") || "subtitle";
      var reader = new FileReader();
      reader.onload = function () {
        originalText = String(reader.result || "").replace(/^\uFEFF/, "");
        originalEl.value = originalText.slice(0, 6000);
        outputEl.value = "";
        outputText = "";
        if (fileInfo) fileInfo.textContent = file.name + " 파일을 불러왔습니다.";
        setStatus("자막 파일을 읽었습니다. 이동 시간을 입력한 뒤 싱크 조정을 누르세요.");
      };
      reader.onerror = function () {
        setStatus("자막 파일을 읽지 못했습니다. 파일 인코딩이나 권한을 확인해 주세요.");
      };
      reader.readAsText(file, "utf-8");
    });

    applyBtn.addEventListener("click", applyShift);

    downloadBtn.addEventListener("click", function () {
      if (!outputText) applyShift();
      if (!outputText) return;
      downloadText(outputText, sourceName + "-synced.srt");
      setStatus("수정된 SRT 파일을 다운로드했습니다.");
    });

    [offsetEl, directionEl].forEach(function (input) {
      input.addEventListener("change", function () {
        if (originalText) applyShift();
      });
    });

    setStatus("SRT 파일을 선택하면 자막 시간을 앞이나 뒤로 이동할 수 있습니다.");
  }

  window.ToolNestTools = window.ToolNestTools || {};
  window.ToolNestTools.subtitle = { init: init };
})();
