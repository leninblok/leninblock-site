/* Browser platform bindings for the unmodified Electron renderer. MIT. */
(() => {
  const DEMO = "demo-leonid";
  const frame = window.frameElement;
  if (!frame || parent === window) return;
  const origin = location.origin;
  // Match the embedding document's scheme to keep the native transparent gutter.
  document.documentElement.style.colorScheme = "light";
  const handlers = new Map();
  let saved = {},
    saveTimer;
  try {
    saved = JSON.parse(localStorage.getItem("kruzhok.demo.v1") || "{}");
  } catch {}
  const tracks = new Set();
  let disposed = false,
    visible = false,
    cursor = { x: -1, y: -1 };
  let bounds = { x: 0, y: 0, width: 300, height: 500 };
  let cameraDevices = [],
    mediaRevision = 0,
    mediaPending = false,
    readyCamera = null;
  let wantsCamera = saved.cameraDeviceId !== DEMO,
    suspended = false,
    mediaMessage = "",
    actualSource = DEMO;
  const nativeCapture = navigator.mediaDevices?.getUserMedia.bind(
    navigator.mediaDevices,
  );
  const nativeEnumerate = navigator.mediaDevices?.enumerateDevices.bind(
    navigator.mediaDevices,
  );
  const emit = (channel, ...args) => {
    if (channel === "camera:animate-layout") frame.dataset.animating = "true";
    if (channel === "camera:cancel-layout") frame.dataset.animating = "false";
    handlers.get(channel)?.(...args);
  };
  const post = (type, value) =>
    parent.postMessage({ kruzhok: true, type, value }, origin);
  const area = () => ({
    x: 0,
    y: 0,
    width: parent.screen.availWidth || parent.innerWidth,
    height: parent.screen.availHeight || parent.innerHeight,
  });
  const display = () => ({ id: 1, workArea: area(), bounds: area() });
  const surface = () => frame.parentElement;
  function publish() {
    if (!disposed)
      post("state", {
        ...engine.getState(),
        cameraDevices,
        actualSource,
        cameraPending: mediaPending,
        message: mediaMessage,
      });
  }
  function applyBounds(next) {
    const host = surface();
    // Keep native pixel dimensions. Only the available position is constrained
    // by the webpage: a browser cannot move an OS-level desktop window.
    const width = host.clientWidth || parent.innerWidth;
    host.style.setProperty("--window-height", `${next.height}px`);
    const height = host.clientHeight || parent.innerHeight;
    bounds = {
      ...next,
      x: Math.round(
        Math.max(0, Math.min(next.x, Math.max(0, width - next.width))),
      ),
      y: Math.round(
        Math.max(0, Math.min(next.y, Math.max(0, height - next.height))),
      ),
    };
    Object.assign(frame.style, {
      left: `${bounds.x}px`,
      top: `${bounds.y}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    });
    frame.dataset.bounds = JSON.stringify(bounds);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 120);
  }
  function persist() {
    if (disposed) return;
    const state = engine.getState();
    const settings = {
      shapeMode: state.shapeMode,
      aspectRatio: state.aspectRatio,
      sizePresetId: state.sizePresetId,
      borderEnabled: state.borderEnabled,
      shadowEnabled: state.shadowEnabled,
      mirrorEnabled: state.mirrorEnabled,
      cameraDeviceId: state.cameraDeviceId,
      x: state.focusEnabled ? saved.x : bounds.x,
      y: state.focusEnabled ? saved.y : bounds.y,
    };
    try {
      localStorage.setItem("kruzhok.demo.v1", JSON.stringify(settings));
      saved = settings;
    } catch {}
  }
  const engine = window.createKruzhokNative({
    settings: saved,
    window: {
      isDestroyed: () => disposed,
      isVisible: () => visible,
      getBounds: () => ({ ...bounds }),
      setBounds: applyBounds,
      setPosition: (x, y) => applyBounds({ ...bounds, x, y }),
    },
    screen: {
      getPrimaryDisplay: display,
      getDisplayNearestPoint: display,
      getAllDisplays: () => [
        {
          id: 1,
          workArea: {
            x: 0,
            y: 0,
            width: surface().clientWidth,
            height: surface().clientHeight,
          },
          bounds: area(),
        },
      ],
    },
    emit,
    change: () => {
      publish();
      persist();
    },
  });
  applyBounds(engine.initialBounds());

  function own(stream, stopSource) {
    for (const track of stream.getTracks()) {
      tracks.add(track);
      const stop = track.stop.bind(track);
      track.stop = () => {
        stop();
        tracks.delete(track);
        stopSource?.();
      };
      track.addEventListener("ended", () => tracks.delete(track), {
        once: true,
      });
    }
    return stream;
  }
  async function authorStream() {
    if (!HTMLCanvasElement.prototype.captureStream)
      throw new Error("Этот браузер не поддерживает демонстрацию видео.");
    const source = document.createElement("video");
    source.src = "/kruzhok/intro.mp4";
    source.muted = true;
    source.playsInline = true;
    source.loop = true;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 640;
    const context = canvas.getContext("2d", { alpha: false });
    let stopped = false,
      tick = null,
      videoTick = null;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(tick);
      if (videoTick !== null) source.cancelVideoFrameCallback?.(videoTick);
      source.pause();
      source.removeAttribute("src");
      source.load();
    };
    try {
      await source.play();
    } catch {
      // Autoplay restrictions retain the same first-frame presentation.
      const poster = new Image();
      poster.src = "/kruzhok/intro-poster.jpg";
      await poster.decode();
      context.drawImage(poster, 0, 0, 640, 640);
    }
    if (disposed) {
      stop();
      throw new DOMException("Closed", "AbortError");
    }
    const result = canvas.captureStream(24);
    const draw = () => {
      if (stopped) return;
      if (source.readyState >= 2) context.drawImage(source, 0, 0, 640, 640);
      else context.drawImage(canvas, 0, 0); // publish the poster as the first frame
      if (source.paused) return;
      if (source.requestVideoFrameCallback)
        videoTick = source.requestVideoFrameCallback(draw);
      else tick = requestAnimationFrame(draw);
    };
    draw();
    actualSource = DEMO;
    publish();
    return own(result, stop);
  }
  function beginCamera(constraints) {
    if (mediaPending || !wantsCamera || suspended || disposed) return;
    if (!nativeCapture) {
      mediaMessage = "Камера недоступна в этом браузере.";
      publish();
      return;
    }
    const revision = mediaRevision;
    mediaPending = true;
    mediaMessage = "";
    publish();
    void nativeCapture(constraints)
      .then((stream) => {
        if (
          disposed ||
          suspended ||
          revision !== mediaRevision ||
          !wantsCamera
        ) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        readyCamera = own(stream);
        mediaPending = false;
        // The real renderer performs its normal source switch, loading shell,
        // first-frame readiness and 100ms video reveal.
        emit(
          "camera:set-device",
          engine.getState().cameraDeviceId === DEMO
            ? null
            : engine.getState().cameraDeviceId,
        );
        publish();
      })
      .catch((error) => {
        if (disposed || revision !== mediaRevision) return;
        mediaPending = false;
        if (
          constraints.video?.deviceId &&
          ["NotFoundError", "OverconstrainedError"].includes(error.name)
        ) {
          engine.setCamera(null, true);
          return;
        }
        mediaMessage =
          error.name === "NotAllowedError"
            ? "Разрешите доступ к камере в браузере."
            : "Камера недоступна. Можно попробовать видео Леонида.";
        engine.setCamera(DEMO, false);
        publish();
      });
  }
  if (navigator.mediaDevices) {
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const video =
        typeof constraints.video === "object" ? constraints.video : {};
      const id =
        typeof video.deviceId === "object"
          ? video.deviceId.exact
          : video.deviceId;
      if (id === DEMO || !wantsCamera) return authorStream();
      if (readyCamera) {
        const stream = readyCamera;
        readyCamera = null;
        actualSource = "camera";
        publish();
        return stream;
      }
      beginCamera(constraints);
      return authorStream();
    };
    navigator.mediaDevices.enumerateDevices = async () => {
      let devices = [];
      try {
        devices = await nativeEnumerate();
      } catch {
        /* no device access yet */
      }
      return [
        ...devices,
        {
          deviceId: DEMO,
          kind: "videoinput",
          label: "Видео Леонида",
          groupId: "",
          toJSON() {
            return { deviceId: DEMO, kind: "videoinput", label: this.label };
          },
        },
      ];
    };
  }
  function changeSource(id) {
    mediaRevision++;
    mediaPending = false;
    readyCamera?.getTracks().forEach((track) => track.stop());
    readyCamera = null;
    wantsCamera = id !== DEMO;
    mediaMessage = "";
    engine.setCamera(id, true);
  }
  const api = (window.electronAPI = {
    markStartup(phase) {
      post("phase", phase);
    },
    stepLayout: async (id, timestamp) => {
      const more = engine.step(id, timestamp);
      if (!more) frame.dataset.animating = "false";
      return more;
    },
    getBounds: async () => {
      engine.interrupt();
      return { ...bounds };
    },
    getCursorInWindow: async () => ({ ...cursor }),
    setMouseEventsEnabled(enabled) {
      frame.style.pointerEvents =
        matchMedia("(pointer: coarse)").matches || enabled ? "auto" : "none";
    },
    moveWindow: (position) => engine.move(position),
    toggleFocus: async () => engine.toggleFocus(),
    finishMove: async () => engine.finishMove(),
    revealWindow: async () => {
      visible = true;
      frame.style.visibility = "visible";
      post("ready", true);
    },
    getInitialState: async () => engine.getState(),
    ensureCameraAccess: async () => ({ granted: true }),
    openCameraPrivacySettings: async () => {
      post(
        "privacy",
        mediaMessage || "Разрешите доступ к камере в настройках браузера.",
      );
    },
    setCameraDeviceId: async (id) => engine.setCamera(id, false),
    syncCameraDevices: async (devices) => {
      const ids = new Set();
      cameraDevices = devices
        .filter((device) => {
          if (
            typeof device.id !== "string" ||
            !device.id ||
            device.id.length > 1024 ||
            ids.has(device.id)
          )
            return false;
          ids.add(device.id);
          return true;
        })
        .map((device, index) => ({
          id: device.id,
          label: (device.label?.trim() || `Камера ${index + 1}`).slice(0, 256),
        }));
      publish();
    },
  });
  for (const [name, channel] of Object.entries({
    onAnimateLayout: "camera:animate-layout",
    onCancelLayout: "camera:cancel-layout",
    onSyncMouseHit: "camera:sync-mouse-hit",
    onSetMirror: "camera:set-mirror",
    onSetBorder: "camera:set-border",
    onSetShadow: "camera:set-shadow",
    onSizeChanged: "camera:size-changed",
    onSetShape: "camera:set-shape",
    onSetFocus: "camera:set-focus",
    onSetCameraDevice: "camera:set-device",
  }))
    api[name] = (handler) => handlers.set(channel, handler);

  const beforeUnload = new Event("beforeunload");
  const dispatch = window.dispatchEvent.bind(window);
  window.disposeKruzhokDemo = () => {
    if (disposed) return;
    dispatch(beforeUnload);
    dispose();
  };
  function dispose() {
    if (disposed) return;
    persist();
    disposed = true;
    clearTimeout(saveTimer);
    mediaRevision++;
    engine.dispose();
    for (const track of [...tracks]) track.stop();
    parent.removeEventListener("resize", resize);
    parent.removeEventListener("pointermove", parentMove);
    window.removeEventListener("message", message);
  }
  function message(event) {
    if (
      event.source !== parent ||
      event.origin !== origin ||
      !event.data?.kruzhok
    )
      return;
    const { action, value } = event.data;
    if (action === "dispose") {
      window.dispatchEvent(new Event("beforeunload"));
      dispose();
      return;
    }
    if (action === "source") changeSource(value);
    if (action === "shape") engine.setShape(value);
    if (action === "aspect") engine.setAspect(value);
    if (action === "size") engine.setSize(value);
    if (action === "mirror") engine.setMirror(value);
    if (action === "border") engine.setBorder(value);
    if (action === "shadow") engine.setShadow(value);
    if (action === "focus") engine.setFocus(value);
  }
  function resize() {
    if (!disposed) engine.resize();
  }
  function parentMove(event) {
    const rect = frame.getBoundingClientRect();
    cursor = { x: event.clientX - rect.x, y: event.clientY - rect.y };
    emit("camera:sync-mouse-hit");
  }
  window.addEventListener("message", message);
  parent.addEventListener("resize", resize);
  parent.addEventListener("pointermove", parentMove, { passive: true });
  window.addEventListener(
    "pointermove",
    (event) => {
      cursor = { x: event.clientX, y: event.clientY };
    },
    { passive: true },
  );
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("beforeunload", dispose);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      suspended = true;
      mediaRevision++;
      mediaPending = false;
      for (const track of [...tracks]) track.stop();
      readyCamera = null;
    } else if (suspended && !disposed) {
      suspended = false;
      emit("camera:set-device", engine.getState().cameraDeviceId);
    }
  });
  publish();
})();
