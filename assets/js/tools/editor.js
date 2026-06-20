(function () {
  function formatSeconds(value) {
    var seconds = Math.max(0, Number(value) || 0);
    var minutes = Math.floor(seconds / 60);
    var rest = seconds - minutes * 60;
    return String(minutes).padStart(2, "0") + ":" + rest.toFixed(1).padStart(4, "0");
  }

  function pickMimeType() {
    var types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    for (var i = 0; i < types.length; i += 1) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(types[i])) return types[i];
    }
    return "";
  }

  function init() {
    var fileEl = document.getElementById("ed-file");
    var video = document.getElementById("ed-video");
    var empty = document.getElementById("ed-empty");
    var startEl = document.getElementById("ed-start");
    var endEl = document.getElementById("ed-end");
    var audioModeEl = document.getElementById("ed-audio-mode");
    var transformModeEl = document.getElementById("ed-transform-mode");
    var thumbFormatEl = document.getElementById("ed-thumb-format");
    var startRange = document.getElementById("ed-start-range");
    var endRange = document.getElementById("ed-end-range");
    var currentEl = document.getElementById("ed-current");
    var durationEl = document.getElementById("ed-duration");
    var selectedEl = document.getElementById("ed-selected");
    var markStart = document.getElementById("ed-mark-start");
    var markEnd = document.getElementById("ed-mark-end");
    var preview = document.getElementById("ed-preview");
    var loopBtn = document.getElementById("ed-loop");
    var thumbnailBtn = document.getElementById("ed-thumbnail");
    var exportMp4Btn = document.getElementById("ed-export-mp4");
    var exportWebmBtn = document.getElementById("ed-export-webm");
    var progressBar = document.getElementById("ed-progress-bar");
    var result = document.getElementById("ed-result");
    var nudgeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-ed-nudge]"));
    var objectUrl = "";
    var currentFile = null;
    var previewing = false;
    var looping = false;
    var exporting = false;
    var progressTimer = 0;
    var ffmpegInstance = null;
    var ffmpegLoaded = false;

    if (!fileEl || !video || !startEl || !endEl || !startRange || !endRange || !result) return;

    function setStatus(message) {
      result.innerHTML = "<strong>상태</strong><br>" + message;
    }

    function setProgress(percent) {
      if (progressBar) progressBar.style.width = Math.max(0, Math.min(100, percent)) + "%";
    }

    function setExporting(active) {
      exporting = active;
      if (exportMp4Btn) exportMp4Btn.disabled = active;
      if (exportWebmBtn) exportWebmBtn.disabled = active;
    }

    function getDuration() {
      return Number(video.duration) || 0;
    }

    function getStart() {
      return Number(startEl.value) || 0;
    }

    function getEnd() {
      return Number(endEl.value) || 0;
    }

    function shouldRemoveAudio() {
      return audioModeEl && audioModeEl.value === "mute";
    }

    function getTransformFilter() {
      var mode = transformModeEl ? transformModeEl.value : "none";
      if (mode === "rotate90") return "transpose=1";
      if (mode === "rotate180") return "transpose=1,transpose=1";
      if (mode === "rotate270") return "transpose=2";
      if (mode === "flipH") return "hflip";
      if (mode === "flipV") return "vflip";
      return "";
    }

    function hasTransform() {
      return !!getTransformFilter();
    }

    function updateReadout() {
      var start = getStart();
      var end = getEnd();
      var duration = getDuration();
      if (currentEl) currentEl.textContent = formatSeconds(video.currentTime || 0);
      if (durationEl) durationEl.textContent = formatSeconds(duration);
      if (selectedEl) selectedEl.textContent = formatSeconds(Math.max(0, end - start));
    }

    function renderSummary(message) {
      var start = getStart();
      var end = getEnd();
      var selected = Math.max(0, end - start);
      result.innerHTML =
        '<div class="result-grid">' +
        '<div class="result-item"><span>시작</span><strong>' + formatSeconds(start) + '</strong></div>' +
        '<div class="result-item"><span>끝</span><strong>' + formatSeconds(end) + '</strong></div>' +
        '<div class="result-item"><span>선택 길이</span><strong>' + formatSeconds(selected) + '</strong></div>' +
        '</div>' +
        '<p class="field-help">' + message + '</p>';
    }

    function clampRange(message) {
      var duration = getDuration();
      var start = Math.max(0, Math.min(Number(startEl.value) || 0, duration));
      var end = Math.max(0, Math.min(Number(endEl.value) || 0, duration));
      if (duration && end <= start) end = Math.min(duration, start + 0.1);
      startEl.value = start.toFixed(1);
      endEl.value = end.toFixed(1);
      startRange.value = start;
      endRange.value = end;
      updateReadout();
      renderSummary(message || "구간을 조정한 뒤 미리보기 또는 저장을 실행할 수 있습니다.");
    }

    function syncInputs(fromRange) {
      if (fromRange) {
        startEl.value = Number(startRange.value).toFixed(1);
        endEl.value = Number(endRange.value).toFixed(1);
      } else {
        startRange.value = Number(startEl.value) || 0;
        endRange.value = Number(endEl.value) || 0;
      }
      clampRange();
    }

    function seekToStartAndPlay() {
      previewing = true;
      video.currentTime = getStart();
      video.play().catch(function () {
        setStatus("브라우저가 자동 재생을 막았습니다. 영상 플레이어의 재생 버튼을 눌러 주세요.");
      });
    }

    function safeName(name, fallback) {
      return String(name || fallback || "clip")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9가-힣_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || fallback || "clip";
    }

    function downloadBlob(blob, filename) {
      var link = document.createElement("a");
      var url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function saveThumbnail() {
      if (!video.src || !video.videoWidth || !video.videoHeight) {
        setStatus("먼저 영상 파일을 선택하고 미리보기 화면이 표시된 뒤 썸네일을 저장해 주세요.");
        return;
      }

      var format = thumbFormatEl ? thumbFormatEl.value : "png";
      var canvas = document.createElement("canvas");
      var context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      var mimeType = format === "jpg" ? "image/jpeg" : "image/png";
      var extension = format === "jpg" ? "jpg" : "png";
      canvas.toBlob(function (blob) {
        if (!blob) {
          setStatus("썸네일 이미지를 만들지 못했습니다. 다른 프레임에서 다시 시도해 주세요.");
          return;
        }
        downloadBlob(blob, safeName(currentFile && currentFile.name, "toolnest-thumbnail") + "-thumbnail." + extension);
        renderSummary("현재 프레임 썸네일을 " + extension.toUpperCase() + " 파일로 저장했습니다.");
      }, mimeType, 0.92);
    }

    async function loadFfmpeg() {
      if (ffmpegLoaded && ffmpegInstance) return ffmpegInstance;
      if (!window.FFmpegWASM || !window.FFmpegUtil) {
        throw new Error("FFmpeg 라이브러리를 불러오지 못했습니다. 인터넷 연결 또는 CDN 차단 여부를 확인해 주세요.");
      }

      var FFmpeg = window.FFmpegWASM.FFmpeg;
      var toBlobURL = window.FFmpegUtil.toBlobURL;
      var baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
      var ffmpeg = new FFmpeg();

      ffmpeg.on("progress", function (event) {
        if (event && typeof event.progress === "number") {
          setProgress(event.progress * 100);
        }
      });

      setStatus("MP4 저장 엔진을 불러오는 중입니다. 첫 실행은 시간이 걸릴 수 있습니다.");
      await ffmpeg.load({
        coreURL: await toBlobURL(baseURL + "/ffmpeg-core.js", "text/javascript"),
        wasmURL: await toBlobURL(baseURL + "/ffmpeg-core.wasm", "application/wasm")
      });
      ffmpegInstance = ffmpeg;
      ffmpegLoaded = true;
      return ffmpeg;
    }

    fileEl.addEventListener("change", function () {
      var file = fileEl.files && fileEl.files[0];
      if (!file) return;
      currentFile = file;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.load();
      setProgress(0);
      if (empty) empty.textContent = file.name + " 파일을 불러왔습니다.";
      setStatus("영상 정보를 읽는 중입니다.");
    });

    video.addEventListener("loadedmetadata", function () {
      var duration = getDuration();
      startRange.max = duration;
      endRange.max = duration;
      startEl.max = duration;
      endEl.max = duration;
      startEl.value = "0.0";
      endEl.value = duration.toFixed(1);
      startRange.value = 0;
      endRange.value = duration;
      updateReadout();
      clampRange("영상이 준비되었습니다. 시작/끝 지점을 움직여 필요한 구간을 선택하세요.");
    });

    video.addEventListener("timeupdate", function () {
      updateReadout();
      var end = getEnd();
      if ((previewing || looping) && end && video.currentTime >= end) {
        if (looping && !exporting) {
          video.currentTime = getStart();
          video.play().catch(function () {});
        } else {
          video.pause();
          previewing = false;
        }
      }
    });

    [startEl, endEl].forEach(function (input) {
      input.addEventListener("input", function () { syncInputs(false); });
    });
    [startRange, endRange].forEach(function (input) {
      input.addEventListener("input", function () { syncInputs(true); });
    });

    nudgeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var target = button.getAttribute("data-ed-nudge");
        var delta = Number(button.getAttribute("data-ed-delta")) || 0;
        var input = target === "start" ? startEl : endEl;
        input.value = ((Number(input.value) || 0) + delta).toFixed(1);
        syncInputs(false);
      });
    });

    markStart.addEventListener("click", function () {
      startEl.value = video.currentTime.toFixed(1);
      syncInputs(false);
    });

    markEnd.addEventListener("click", function () {
      endEl.value = video.currentTime.toFixed(1);
      syncInputs(false);
    });

    preview.addEventListener("click", function () {
      if (!video.src) {
        setStatus("먼저 영상 파일을 선택해 주세요.");
        return;
      }
      clampRange("선택한 구간을 미리보는 중입니다.");
      seekToStartAndPlay();
    });

    loopBtn.addEventListener("click", function () {
      looping = !looping;
      loopBtn.setAttribute("aria-pressed", looping ? "true" : "false");
      loopBtn.textContent = looping ? "반복 켜짐" : "반복 꺼짐";
      if (looping && video.src) {
        clampRange("구간 반복이 켜졌습니다. 선택 구간 안에서 반복 재생됩니다.");
        seekToStartAndPlay();
      } else {
        renderSummary("구간 반복이 꺼졌습니다.");
      }
    });

    async function exportMp4() {
      if (!video.src) {
        setStatus("먼저 영상 파일을 선택해 주세요.");
        return;
      }
      if (!currentFile) {
        setStatus("영상 파일 정보를 찾을 수 없습니다. 파일을 다시 선택해 주세요.");
        return;
      }

      clampRange("MP4 저장을 준비하고 있습니다.");
      var start = getStart();
      var end = getEnd();
      var length = Math.max(0.1, end - start);
      var inputName = "input-" + Date.now() + "." + (currentFile.name.split(".").pop() || "mp4").toLowerCase();
      var outputName = "output-" + Date.now() + ".mp4";

      setExporting(true);
      setProgress(0);

      try {
        var ffmpeg = await loadFfmpeg();
        var fetchFile = window.FFmpegUtil.fetchFile;
        setStatus("원본 영상을 브라우저 편집 엔진에 준비하는 중입니다.");
        await ffmpeg.writeFile(inputName, await fetchFile(currentFile));

        setStatus("MP4 클립을 저장하는 중입니다. 큰 파일은 시간이 걸릴 수 있습니다.");
        var filter = getTransformFilter();
        var args = [
          "-y",
          "-ss", String(start),
          "-i", inputName,
          "-t", String(length)
        ];
        if (filter) {
          args.push("-vf", filter, "-c:v", "libx264", "-preset", "veryfast", "-crf", "23");
          if (shouldRemoveAudio()) {
            args.push("-an");
          } else {
            args.push("-c:a", "copy");
          }
        } else {
          args.push("-c", "copy");
          if (shouldRemoveAudio()) {
            args.push("-an");
          }
        }
        args.push(
          "-avoid_negative_ts", "make_zero",
          "-movflags", "+faststart",
          outputName
        );
        await ffmpeg.exec(args);

        var data = await ffmpeg.readFile(outputName);
        var blob = new Blob([data.buffer], { type: "video/mp4" });
        downloadBlob(blob, safeName(currentFile.name, "toolnest-clip") + "-clip.mp4");
        await ffmpeg.deleteFile(inputName).catch(function () {});
        await ffmpeg.deleteFile(outputName).catch(function () {});
        setProgress(100);
        renderSummary("MP4 클립 저장이 완료되었습니다." + (shouldRemoveAudio() ? " 오디오는 제거했습니다." : "") + (hasTransform() ? " 회전/뒤집기를 적용했습니다." : ""));
      } catch (error) {
        setProgress(0);
        setStatus("MP4 저장에 실패했습니다. 원본 코덱이나 브라우저 메모리 제한 때문일 수 있습니다. WebM 대체 저장을 사용해 주세요. (" + error.message + ")");
      } finally {
        setExporting(false);
      }
    }

    function exportWebm() {
      if (!video.src) {
        setStatus("먼저 영상 파일을 선택해 주세요.");
        return;
      }
      if (!window.MediaRecorder || typeof video.captureStream !== "function") {
        setStatus("현재 브라우저는 WebM 클립 저장 기능을 지원하지 않습니다. Chrome 또는 Edge 최신 버전을 권장합니다.");
        return;
      }

      clampRange("저장을 준비하고 있습니다.");
      var start = getStart();
      var end = getEnd();
      var length = Math.max(0.1, end - start);
      var mimeType = pickMimeType();
      var chunks = [];
      var stream = video.captureStream();
      if (shouldRemoveAudio()) {
        stream = new MediaStream(stream.getVideoTracks());
      }
      var recorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);

      setExporting(true);
      previewing = false;
      setProgress(0);
      setStatus("선택 구간을 WebM으로 대체 저장하는 중입니다. 재생이 끝날 때까지 기다려 주세요.");

      recorder.ondataavailable = function (event) {
        if (event.data && event.data.size) chunks.push(event.data);
      };
      recorder.onstop = function () {
        clearInterval(progressTimer);
        setProgress(100);
        var blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
        downloadBlob(blob, safeName(currentFile && currentFile.name, "toolnest-clip") + "-clip.webm");
        exporting = false;
        setExporting(false);
        renderSummary("WebM 클립 저장이 완료되었습니다." + (shouldRemoveAudio() ? " 오디오는 제거했습니다." : ""));
      };

      function stopAtEnd() {
        var progress = ((video.currentTime - start) / length) * 100;
        setProgress(progress);
        if (video.currentTime >= end) {
          video.removeEventListener("timeupdate", stopAtEnd);
          video.pause();
          if (recorder.state !== "inactive") recorder.stop();
        }
      }

      video.currentTime = start;
      video.addEventListener("timeupdate", stopAtEnd);
      video.play().then(function () {
        recorder.start();
        progressTimer = setInterval(function () {
          setProgress(((video.currentTime - start) / length) * 100);
        }, 120);
      }).catch(function () {
        video.removeEventListener("timeupdate", stopAtEnd);
        clearInterval(progressTimer);
        exporting = false;
        setExporting(false);
        setProgress(0);
        setStatus("재생을 시작할 수 없어 저장하지 못했습니다. 영상 파일 형식과 브라우저 권한을 확인해 주세요.");
      });
    }

    exportMp4Btn.addEventListener("click", function () {
      exportMp4();
    });

    thumbnailBtn.addEventListener("click", saveThumbnail);

    exportWebmBtn.addEventListener("click", exportWebm);

    updateReadout();
    setProgress(0);
    setStatus("영상 파일을 선택하면 시작/끝 구간을 지정할 수 있습니다.");
  }

  window.ToolNestTools = window.ToolNestTools || {};
  window.ToolNestTools.editor = { init: init };
})();
