(() => {
  const api = window.electronAPI;
  const video = document.getElementById('cam');
  const circle = document.getElementById('circle');
  const cameraShell = document.getElementById('cameraShell');
  const errBox = document.getElementById('err');
  const errText = document.getElementById('errText');
  const retryButton = document.getElementById('retryButton');
  const privacyButton = document.getElementById('privacyButton');

  const CORNER_RADIUS_FRACTIONS = { '1:1': 0.286, '4:5': 0.22, '9:16': 0.16 };
  let enlarged = false;
  let borderEnabled = false;
  let shapeMode = 'rectangle';
  let aspectRatio = '9:16';
  let contentWidth = 0;
  let contentHeight = 0;
  let activeStream = null;
  let selectedDeviceId = null;
  let cameraRevision = 0;
  let cameraStarting = false;
  let disposed = false;
  let frameAbort = null;
  let qualityTimer = null;
  let qualityApplying = false;
  let appliedCaptureWidth = 0;
  let dragRevision = 0;
  let drag = null;
  let mouseEventsEnabled = false;
  let mouseHitRevision = 0;
  let mouseHitQuery = 0;
  let moveFrame = null;
  let pendingPosition = null;
  let layoutId = null;
  let layoutFrame = null;

  function isInteractiveTarget(target) {
    return Boolean(target?.closest?.('button, input, select, textarea, label, a'));
  }

  function setCameraMouseEventsEnabled(enabled) {
    if (disposed || drag || mouseEventsEnabled === enabled) return;
    mouseEventsEnabled = enabled;
    api.setMouseEventsEnabled?.(enabled);
  }

  function updateMouseHit(x, y, eventTarget = null) {
    if (disposed || drag) return;
    const target = eventTarget?.nodeType === 1 ? eventTarget : document.elementFromPoint?.(x, y);
    setCameraMouseEventsEnabled(Boolean(target && (target === circle || circle.contains(target))));
  }

  async function syncMouseHit() {
    if (!api.getCursorInWindow) return;
    const revision = mouseHitRevision;
    const query = ++mouseHitQuery;
    try {
      const point = await api.getCursorInWindow();
      if (query === mouseHitQuery && revision === mouseHitRevision
        && point && Number.isFinite(point.x) && Number.isFinite(point.y)) updateMouseHit(point.x, point.y);
    } catch (_) {
      // The window may close while a cursor query is in flight.
    }
  }

  window.addEventListener('mousemove', (event) => {
    mouseHitRevision++;
    updateMouseHit(event.clientX, event.clientY, event.target);
  }, { passive: true });
  window.addEventListener('mouseleave', () => {
    mouseHitRevision++;
    setCameraMouseEventsEnabled(false);
  });

  function showError(message, canOpenPrivacy = false) {
    errText.textContent = message;
    privacyButton.hidden = !canOpenPrivacy;
    errBox.hidden = false;
    document.body.classList.add('has-error');
    void api.revealWindow();
  }

  function hideError() {
    errBox.hidden = true;
    document.body.classList.remove('has-error');
    errText.textContent = '';
  }

  function stopCamera() {
    frameAbort?.abort();
    frameAbort = null;
    clearTimeout(qualityTimer);
    if (activeStream) activeStream.getTracks().forEach((track) => track.stop());
    activeStream = null;
    video.srcObject = null;
    document.body.classList.remove('has-video');
    appliedCaptureWidth = 0;
  }

  function waitForFirstVideoFrame(signal, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      let callbackId = null;
      let timeoutId = null;
      let finished = false;
      const finish = (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeoutId);
        if (callbackId !== null) video.cancelVideoFrameCallback?.(callbackId);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('playing', onReady);
        signal.removeEventListener('abort', onAbort);
        if (error) reject(error);
        else resolve();
      };
      const onReady = () => {
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) finish();
      };
      const onAbort = () => finish(new DOMException('Camera changed', 'AbortError'));
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
      // loadeddata and playing remain active even when rVFC is supported.
      // A delayed compositor callback must not add seconds to camera startup.
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('playing', onReady);
      if (typeof video.requestVideoFrameCallback === 'function') {
        callbackId = video.requestVideoFrameCallback(() => finish());
      }
      onReady();
      if (!finished) timeoutId = setTimeout(() => finish(new Error('Камера не передала изображение.')), timeoutMs);
    });
  }

  function updateGeometry(width = contentWidth, height = contentHeight) {
    contentWidth = width;
    contentHeight = height;
    const shortSide = Math.min(width, height);
    cameraShell.style.setProperty('--short-side', `${shortSide}px`);
    circle.style.setProperty('--border-width', `${shortSide >= 350 ? 4 : shortSide >= 250 ? 3 : 2}px`);
    document.body.classList.toggle('border-enabled', borderEnabled);
  }

  function applyShape() {
    const rectangle = shapeMode === 'rectangle';
    cameraShell.classList.toggle('rectangle', rectangle);
    // Only the roundness factor animates. The short side follows each actual
    // native resize, so the mask cannot lag behind or turn into a capsule.
    cameraShell.style.setProperty('--corner-fraction', rectangle ? (CORNER_RADIUS_FRACTIONS[aspectRatio] || 0.22) : 0.5);
    cameraShell.style.setProperty('--corner-exponent', rectangle ? 1.5 : 1);
    updateGeometry();
  }

  function captureConstraints() {
    // Match capture to the displayed pixels (including cover cropping), with
    // only three tiers so a small resize never renegotiates the camera.
    const ratio = window.devicePixelRatio || 1;
    const requiredWidth = Math.max(contentWidth, contentHeight * 16 / 9) * ratio;
    const width = requiredWidth <= 640 ? 640 : requiredWidth <= 1280 ? 1280 : 1920;
    return { width: { ideal: width }, height: { ideal: width * 9 / 16 }, frameRate: { ideal: 30, max: 30 } };
  }

  async function updateCaptureQuality() {
    const track = activeStream?.getVideoTracks()[0];
    if (!track || qualityApplying || disposed || layoutId !== null || drag) return;
    const constraints = captureConstraints();
    if (constraints.width.ideal === appliedCaptureWidth) return;
    qualityApplying = true;
    try {
      await track.applyConstraints(constraints);
      if (track === activeStream?.getVideoTracks()[0]) appliedCaptureWidth = constraints.width.ideal;
    } catch (_) {
      // An optional quality adjustment must never interrupt a working camera.
    } finally {
      qualityApplying = false;
      // A size or source may have changed during applyConstraints.
      if (activeStream && captureConstraints().width.ideal !== constraints.width.ideal) scheduleCaptureQuality();
    }
  }

  function scheduleCaptureQuality() {
    clearTimeout(qualityTimer);
    if (layoutId !== null || drag) return;
    // Reopening a camera format can briefly pause its driver. Keep that work
    // out of resize/focus/drag and wait for a full quiet interval afterwards.
    qualityTimer = setTimeout(() => { void updateCaptureQuality(); }, 800);
  }

  async function refreshCameraDevices() {
    if (!navigator.mediaDevices?.enumerateDevices || disposed) return;
    const revision = cameraRevision;
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter((device) => device.kind === 'videoinput');
    if (disposed || revision !== cameraRevision) return;
    await api.syncCameraDevices(devices.map((device, index) => ({
      id: device.deviceId,
      label: device.label || `Камера ${index + 1}`,
    })));
    if (disposed || revision !== cameraRevision) return;
    if (selectedDeviceId && !devices.some((device) => device.deviceId === selectedDeviceId)) {
      selectedDeviceId = null;
      await api.setCameraDeviceId(null);
      void startCamera();
    }
  }

  async function startCamera() {
    cameraRevision += 1;
    stopCamera();
    if (cameraStarting || disposed) return;
    cameraStarting = true;
    try {
      // getUserMedia cannot be cancelled. Open one device at a time, discard
      // stale results, and immediately process the user's latest selection.
      while (!disposed) {
        const revision = cameraRevision;
        const deviceId = selectedDeviceId;
        const isCurrent = () => !disposed && revision === cameraRevision;
        hideError();
        try {
          api.markStartup('camera-access');
          const access = await api.ensureCameraAccess();
          api.markStartup('camera-permission');
          if (!isCurrent()) continue;
          if (!access?.granted) {
            showError(access?.message || 'Нет доступа к камере.', true);
            break;
          }
          const constraints = captureConstraints();
          api.markStartup('camera-request');
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              ...constraints,
              ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'user' } }),
            },
          });
          if (!isCurrent()) {
            stream.getTracks().forEach((track) => track.stop());
            continue;
          }
          api.markStartup('camera-stream');
          activeStream = stream;
          appliedCaptureWidth = constraints.width.ideal;
          video.srcObject = stream;
          frameAbort = new AbortController();
          // Attach readiness/abort listeners before play() can deliver a frame.
          const firstFrame = waitForFirstVideoFrame(frameAbort.signal);
          await Promise.all([video.play(), firstFrame]);
          if (!isCurrent()) continue;
          api.markStartup('camera-frame');
          document.body.classList.add('has-video');
          const track = stream.getVideoTracks()[0];
          track?.addEventListener('ended', () => {
            if (!isCurrent()) return;
            stopCamera();
            showError('Камера отключена. Подключите её и нажмите «Повторить».');
          }, { once: true });
          if (!isCurrent()) continue;
          hideError();
          scheduleCaptureQuality();
          void refreshCameraDevices().catch(() => {});
          break;
        } catch (error) {
          if (!isCurrent()) continue;
          stopCamera();
          // A saved USB camera may be absent on the next launch. Recover with
          // the default camera instead of leaving an unusable exact deviceId.
          if (deviceId && (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError')) {
            selectedDeviceId = null;
            await api.setCameraDeviceId(null);
            if (isCurrent()) cameraRevision += 1;
            continue;
          }
          const detail = error?.name === 'NotAllowedError'
            ? 'Доступ к камере запрещён. Разрешите его в настройках системы и повторите попытку.'
            : error?.name === 'NotFoundError'
              ? 'Камера не найдена. Подключите камеру и нажмите «Повторить».'
              : `Не удалось включить камеру: ${error?.message || 'неизвестная ошибка'}`;
          showError(detail, error?.name === 'NotAllowedError');
          break;
        }
      }
    } finally {
      cameraStarting = false;
    }
  }

  function flushMove() {
    if (moveFrame !== null) cancelAnimationFrame(moveFrame);
    moveFrame = null;
    if (!pendingPosition) return;
    api.moveWindow(pendingPosition);
    pendingPosition = null;
  }

  function cancelDrag() {
    dragRevision += 1;
    if (moveFrame !== null) cancelAnimationFrame(moveFrame);
    moveFrame = null;
    pendingPosition = null;
    const pointerId = drag?.pointerId;
    drag = null;
    if (pointerId !== undefined && circle.hasPointerCapture?.(pointerId)) circle.releasePointerCapture(pointerId);
    scheduleCaptureQuality();
  }

  circle.addEventListener('dblclick', (event) => {
    if (isInteractiveTarget(event.target)) return;
    cancelDrag();
    void api.toggleFocus().catch(() => {});
  });
  circle.addEventListener('pointerdown', async (event) => {
    if (enlarged || event.button !== 0 || isInteractiveTarget(event.target)) return;
    cancelDrag();
    const revision = dragRevision;
    clearTimeout(qualityTimer);
    drag = { pointerId: event.pointerId, mouseX: event.screenX, mouseY: event.screenY, bounds: null, moved: false };
    // Capture immediately: pointerup must also arrive while getBounds is pending.
    circle.setPointerCapture?.(event.pointerId);
    const bounds = await api.getBounds();
    if (revision !== dragRevision || !drag || enlarged || !bounds) return;
    drag.bounds = bounds;
  });
  circle.addEventListener('pointermove', (event) => {
    if (!drag?.bounds || event.pointerId !== drag.pointerId) return;
    const dx = event.screenX - drag.mouseX;
    const dy = event.screenY - drag.mouseY;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
    drag.moved = true;
    pendingPosition = { x: Math.round(drag.bounds.x + dx), y: Math.round(drag.bounds.y + dy) };
    if (moveFrame === null) moveFrame = requestAnimationFrame(flushMove);
  });
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const moved = drag.moved;
    flushMove();
    cancelDrag();
    mouseHitRevision++;
    updateMouseHit(event.clientX, event.clientY);
    if (moved) void api.finishMove().catch(() => {});
  };
  circle.addEventListener('pointerup', endDrag);
  circle.addEventListener('pointercancel', endDrag);
  circle.addEventListener('lostpointercapture', endDrag);
  window.addEventListener('blur', () => {
    const moved = drag?.moved;
    flushMove();
    cancelDrag();
    void syncMouseHit();
    if (moved) void api.finishMove().catch(() => {});
  });

  retryButton.addEventListener('click', () => { void startCamera(); });
  privacyButton.addEventListener('click', () => { void api.openCameraPrivacySettings(); });
  const onDeviceChange = () => { void refreshCameraDevices().catch(() => {}); };
  navigator.mediaDevices?.addEventListener('devicechange', onDeviceChange);

  function cancelLayout(id = layoutId) {
    if (id !== layoutId) return;
    if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
    layoutFrame = null;
    layoutId = null;
    void syncMouseHit();
    scheduleCaptureQuality();
  }

  api.onAnimateLayout((id) => {
    cancelLayout();
    layoutId = id;
    clearTimeout(qualityTimer);
    const step = async (timestamp) => {
      layoutFrame = null;
      try {
        const more = await api.stepLayout(id, timestamp);
        if (disposed || layoutId !== id) return;
        if (more) layoutFrame = requestAnimationFrame(step);
        else cancelLayout(id);
      } catch (_) {
        cancelLayout(id);
      }
    };
    layoutFrame = requestAnimationFrame(step);
  });
  api.onCancelLayout((id) => cancelLayout(id));
  api.onSyncMouseHit?.(() => { void syncMouseHit(); });

  api.onSetMirror((enabled) => video.classList.toggle('mirror', enabled));
  api.onSetBorder((enabled) => { borderEnabled = enabled; updateGeometry(); });
  api.onSetShadow((enabled) => document.body.classList.toggle('shadow-enabled', enabled));
  api.onSizeChanged(() => cancelDrag());
  api.onSetShape((shape) => {
    cancelDrag();
    shapeMode = shape.shapeMode;
    aspectRatio = shape.aspectRatio;
    applyShape();
    void syncMouseHit();
  });
  api.onSetFocus((enabled) => {
    cancelDrag();
    enlarged = enabled;
    circle.classList.toggle('locked', enabled);
  });
  api.onSetCameraDevice((deviceId) => {
    selectedDeviceId = deviceId;
    void startCamera();
  });

  const resizeObserver = new ResizeObserver(([entry]) => {
    // Use the dimensions already calculated by layout; no forced synchronous
    // getBoundingClientRect() read after changing styles on every resize.
    updateGeometry(entry.contentRect.width, entry.contentRect.height);
    scheduleCaptureQuality();
  });
  resizeObserver.observe(cameraShell);
  window.addEventListener('beforeunload', () => {
    disposed = true;
    cameraRevision += 1;
    cancelLayout();
    cancelDrag();
    stopCamera();
    resizeObserver.disconnect();
    navigator.mediaDevices?.removeEventListener('devicechange', onDeviceChange);
  });

  (async () => {
    const initialState = await api.getInitialState();
    if (disposed) return;
    borderEnabled = Boolean(initialState.borderEnabled);
    shapeMode = initialState.shapeMode;
    aspectRatio = initialState.aspectRatio;
    selectedDeviceId = initialState.cameraDeviceId;
    const gutter = (initialState.shadowInset ?? 44) * 2;
    contentWidth = Math.max(1, window.innerWidth - gutter);
    contentHeight = Math.max(1, window.innerHeight - gutter);
    applyShape();
    video.classList.toggle('mirror', initialState.mirrorEnabled);
    document.body.classList.toggle('native-shadow', initialState.nativeShadow);
    document.body.classList.toggle('shadow-enabled', initialState.shadowEnabled);
    api.markStartup('ui-ready');
    // Reveal the dark camera shell immediately, then show the live image as
    // soon as the device supplies a frame.
    await api.revealWindow();
    void syncMouseHit();
    await startCamera();
  })().catch((error) => showError(`Ошибка запуска: ${error?.message || error}`));
})();
