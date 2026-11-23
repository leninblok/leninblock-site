/* Generated from leninblok/floating-camera v1.1.0 (MIT). See LICENSE and provenance.json.
 * Native function bodies below are copied verbatim. Regenerate with scripts/sync-kruzhok-runtime.mjs.
 */
window.createKruzhokNative = function(adapter) {
const MIN_SIZE = 100;
const MAX_SIZE = 10_000;
const SHADOW_INSET = 44;
const CIRCLE_EDGE_MARGINS = { x: 24, y: 48 };
const RECTANGLE_EDGE_MARGINS = { x: 24, y: 16 };
const PROGRAMMATIC_LAYOUT_TOLERANCE = 16;
const EDGE_ANCHOR_TOLERANCE = 1;
const SIZE_PRESET_SETS = {
  square: [
    { id: 'compact', label: 'Компактный', scale: 0.22 },
    { id: 'normal', label: 'Обычный', scale: 0.34 },
    { id: 'large', label: 'Большой', scale: 0.46 },
    { id: 'very-large', label: 'Очень большой', scale: 0.58 },
  ],
  '4:5': [
    { id: 'compact', label: 'Компактный', scale: 0.24 },
    { id: 'normal', label: 'Обычный', scale: 0.35 },
    { id: 'large', label: 'Большой', scale: 0.46 },
  ],
  '9:16': [
    { id: 'compact', label: 'Компактный', scale: 0.38 },
    { id: 'normal', label: 'Обычный', scale: 0.58 },
    { id: 'large', label: 'Большой', scale: 0.78 },
  ],
};
const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', width: 1, height: 1 },
  { label: '4:5', value: '4:5', width: 4, height: 5 },
  { label: '9:16', value: '9:16', width: 9, height: 16 },
];

const mainWindow = adapter.window;
const screen = adapter.screen;
const systemPreferences = { getAnimationSettings: () => ({ prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches }) };
let borderEnabled = false, shadowEnabled = true, mirrorEnabled = false, focusEnabled = false;
let shapeMode = 'rectangle', aspectRatio = '9:16', selectedSizePreset = 'large', cameraDeviceId = null;
let focusRestoreBounds = null, boundsAnimation = null, layoutRevision = 0, dragDisplays = null;
let programmaticLayoutStartBounds = null, lastProgrammaticBounds = null, programmaticLayoutExpiresAt = 0;
const stored = adapter.settings || {};
if (stored.shapeMode === 'circle' || stored.shapeMode === 'rectangle') shapeMode = stored.shapeMode;
if (ASPECT_RATIOS.some(item => item.value === stored.aspectRatio)) aspectRatio = stored.aspectRatio;
if (['compact','normal','large','very-large'].includes(stored.sizePresetId)) selectedSizePreset = stored.sizePresetId;
for (const key of ['borderEnabled','shadowEnabled','mirrorEnabled']) {
 if (typeof stored[key] !== 'boolean') continue;
 if (key === 'borderEnabled') borderEnabled = stored[key];
 if (key === 'shadowEnabled') shadowEnabled = stored[key];
 if (key === 'mirrorEnabled') mirrorEnabled = stored[key];
}
if (typeof stored.cameraDeviceId === 'string' && stored.cameraDeviceId.length <= 1024) cameraDeviceId = stored.cameraDeviceId;
const sendToRenderer = (channel, ...args) => adapter.emit(channel, ...args);
function snapshot() {
 return { borderEnabled, shadowEnabled, mirrorEnabled, focusEnabled, shapeMode, aspectRatio,
  sizePresetId: selectedSizePreset, cameraDeviceId, sizes: sizePresetsForCurrentShape(),
  bounds: mainWindow.getBounds(), shadowInset: SHADOW_INSET, nativeShadow: false };
}
const saveLastState = () => adapter.change(snapshot());
const buildApplicationMenu = saveLastState;
const refreshNativeShadow = () => {};
function compactBounds(bounds) {
  if (!bounds) return null;
  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
  };
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(number, maximum));
}

function selectedAspectRatio() {
  return ASPECT_RATIOS.find((item) => item.value === aspectRatio) || ASPECT_RATIOS[0];
}

function sizePresetsForCurrentShape() {
  if (shapeMode === 'circle' || aspectRatio === '1:1') return SIZE_PRESET_SETS.square;
  return SIZE_PRESET_SETS[aspectRatio] || SIZE_PRESET_SETS.square;
}

function maximumContentSizeForDisplay(display = null) {
  const targetDisplay = display || (mainWindow && !mainWindow.isDestroyed()
    ? displayForBounds(mainWindow.getBounds())
    : screen.getPrimaryDisplay());
  const workArea = targetDisplay.workArea;
  const { x: marginX, y: marginY } = windowEdgeMargins();
  const shadowSpace = SHADOW_INSET * 2;
  const availableWidth = Math.max(1, workArea.width - marginX * 2 - shadowSpace);
  const availableHeight = Math.max(1, workArea.height - marginY * 2 - shadowSpace);
  const ratio = shapeMode === 'circle'
    ? 1
    : selectedAspectRatio().width / selectedAspectRatio().height;
  return Math.min(MAX_SIZE, Math.max(1, Math.min(availableHeight, availableWidth / ratio)));
}

function sizeForPreset(preset, display = null) {
  const maximum = maximumContentSizeForDisplay(display);
  const minimum = Math.min(MIN_SIZE, maximum);
  return clampNumber(Math.round(maximum * Number(preset?.scale || 0)), minimum, maximum, minimum);
}

function activeSizePreset(size = null, display = null) {
  const presets = sizePresetsForCurrentShape();
  const selected = presets.find((preset) => preset.id === selectedSizePreset);
  if (selected) return selected;

  const maximum = maximumContentSizeForDisplay(display);
  const referenceScale = clampNumber(size, 0, maximum, sizeForPreset(presets[0], display)) / maximum;
  const closest = presets.reduce((nearest, preset) => (
    Math.abs(preset.scale - referenceScale) < Math.abs(nearest.scale - referenceScale) ? preset : nearest
  ));
  selectedSizePreset = closest.id;
  return closest;
}

function dimensionsForSize(size) {
  const maximumSide = clampNumber(size, 1, MAX_SIZE, 250);
  const inset = SHADOW_INSET * 2;
  if (shapeMode === 'circle') return { width: maximumSide + inset, height: maximumSide + inset };
  const ratio = selectedAspectRatio().width / selectedAspectRatio().height;
  return ratio >= 1
    ? { width: maximumSide + inset, height: Math.max(1, Math.round(maximumSide / ratio)) + inset }
    : { width: Math.max(1, Math.round(maximumSide * ratio)) + inset, height: maximumSide + inset };
}

function largestSide(bounds) {
  const inset = SHADOW_INSET * 2;
  return clampNumber(Math.max(bounds?.width, bounds?.height) - inset, 1, MAX_SIZE, 250);
}

function normalizeBoundsForCurrentShape(bounds) {
  const dimensions = dimensionsForSize(largestSide(bounds));
  return {
    x: Math.round(Number.isFinite(bounds?.x) ? bounds.x : 0),
    y: Math.round(Number.isFinite(bounds?.y) ? bounds.y : 0),
    ...dimensions,
  };
}

function displayForBounds(bounds) {
  const x = Number.isFinite(bounds?.x) ? bounds.x : 0;
  const y = Number.isFinite(bounds?.y) ? bounds.y : 0;
  const width = clampNumber(bounds?.width, MIN_SIZE, MAX_SIZE, 250);
  const height = clampNumber(bounds?.height, MIN_SIZE, MAX_SIZE, 250);
  return screen.getDisplayNearestPoint({
    x: Math.round(x + width / 2),
    y: Math.round(y + height / 2),
  });
}

function windowEdgeMargins() {
  return shapeMode === 'rectangle' ? RECTANGLE_EDGE_MARGINS : CIRCLE_EDGE_MARGINS;
}

function boundsWithSizePreservingAnchor(bounds, size) {
  const dimensions = dimensionsForSize(size);
  const display = displayForBounds(bounds);
  const workArea = display.workArea;
  const { x: marginX, y: marginY } = windowEdgeMargins();
  const left = workArea.x + marginX;
  const top = workArea.y + marginY;
  const right = workArea.x + workArea.width - marginX;
  const bottom = workArea.y + workArea.height - marginY;
  const current = compactBounds(bounds);

  const attachedToLeft = Math.abs(current.x - left) <= EDGE_ANCHOR_TOLERANCE;
  const attachedToRight = Math.abs(current.x + current.width - right) <= EDGE_ANCHOR_TOLERANCE;
  const attachedToTop = Math.abs(current.y - top) <= EDGE_ANCHOR_TOLERANCE;
  const attachedToBottom = Math.abs(current.y + current.height - bottom) <= EDGE_ANCHOR_TOLERANCE;

  // Preserve the corner or edge at which the camera is already resting.
  // Away from an edge, preserve its centre so an arbitrary placement also
  // feels stable while the form changes.
  const x = attachedToLeft
    ? left
    : attachedToRight
      ? right - dimensions.width
      : current.x + (current.width - dimensions.width) / 2;
  const y = attachedToTop
    ? top
    : attachedToBottom
      ? bottom - dimensions.height
      : current.y + (current.height - dimensions.height) / 2;

  return clampToVisibleDisplay({ x, y, ...dimensions });
}

function cancelBoundsAnimation() {
  if (!boundsAnimation) return;
  const id = boundsAnimation.id;
  boundsAnimation = null;
  sendToRenderer('camera:cancel-layout', id);
}

function setWindowBoundsProgrammatically(bounds, { animate = true, duration = 180 } = {}) {
  if (!mainWindow || mainWindow.isDestroyed() || !bounds) return;
  const next = compactBounds(bounds);
  const current = mainWindow.getBounds();
  cancelBoundsAnimation();
  if (Object.keys(next).every((key) => next[key] === current[key])) return;
  const shouldAnimate = Boolean(animate && mainWindow.isVisible()
    && !systemPreferences.getAnimationSettings().prefersReducedMotion);
  programmaticLayoutStartBounds = current;
  lastProgrammaticBounds = next;
  programmaticLayoutExpiresAt = Date.now() + duration + 750;
  if (!shouldAnimate) {
    mainWindow.setBounds(next, false);
    return;
  }
  // The renderer requests each step on its next presentation frame, with at
  // most one request in flight. No independent timer can outrun painting.
  boundsAnimation = { id: ++layoutRevision, from: current, target: next, duration, elapsed: 0, previousTime: null };
  sendToRenderer('camera:animate-layout', boundsAnimation.id);
}

function stepBoundsAnimation(id, timestamp) {
  const animation = boundsAnimation;
  if (!animation || animation.id !== id || !Number.isFinite(timestamp) || timestamp < 0) return false;
  if (animation.previousTime !== null && timestamp <= animation.previousTime) return true;
  if (animation.previousTime !== null) {
    // A late frame extends the transition slightly instead of teleporting
    // straight to where a wall-clock timer thinks the window should be.
    animation.elapsed += Math.min(20, timestamp - animation.previousTime);
  }
  animation.previousTime = timestamp;
  const progress = Math.min(1, animation.elapsed / animation.duration);
  // Ease in as well as out: a 60 Hz first frame must not jump almost 20% of
  // the whole distance, especially when focus travels across the screen.
  const eased = progress * progress * (3 - 2 * progress);
  const frame = {};
  for (const key of ['x', 'y', 'width', 'height']) {
    frame[key] = Math.round(animation.from[key] + (animation.target[key] - animation.from[key]) * eased);
  }
  const current = mainWindow.getBounds();
  if (Object.keys(frame).some((key) => frame[key] !== current[key])) mainWindow.setBounds(frame, false);
  if (progress === 1) {
    boundsAnimation = null;
    refreshNativeShadow();
  }
  return progress < 1;
}

function clampToVisibleDisplay(bounds) {
  const normalized = normalizeBoundsForCurrentShape(bounds);
  const display = displayForBounds(normalized);
  const workArea = display.workArea;
  const { x: marginX, y: marginY } = windowEdgeMargins();
  const insetX = workArea.x + marginX;
  const insetY = workArea.y + marginY;
  const insetWidth = Math.max(0, workArea.width - marginX * 2);
  const insetHeight = Math.max(0, workArea.height - marginY * 2);
  // Clamp the camera itself, then add the fixed shadow gutter. Scaling the
  // entire window would distort the aspect ratio because the gutter is fixed.
  const size = Math.min(largestSide(normalized), maximumContentSizeForDisplay(display));
  const { width, height } = dimensionsForSize(size);
  let x = Number.isFinite(normalized.x) ? normalized.x : insetX;
  let y = Number.isFinite(normalized.y) ? normalized.y : insetY;

  x = Math.max(insetX, Math.min(x, insetX + insetWidth - width));
  y = Math.max(insetY, Math.min(y, insetY + insetHeight - height));
  return { x, y, width, height };
}

function constrainDragPosition(position, bounds) {
  const displays = dragDisplays || (dragDisplays = screen.getAllDisplays());
  const center = { x: position.x + bounds.width / 2, y: position.y + bounds.height / 2 };
  // Project the proposed centre onto each work area to choose a display.
  // This uses the cached screen layout, not a synchronous screen IPC call.
  const distance = (display) => {
    const area = display.workArea;
    const dx = Math.max(area.x - center.x, 0, center.x - area.x - area.width);
    const dy = Math.max(area.y - center.y, 0, center.y - area.y - area.height);
    return dx * dx + dy * dy;
  };
  const display = displays.reduce((nearest, item) => distance(item) < distance(nearest) ? item : nearest);
  const area = display.workArea;
  const physical = display.bounds || area;
  const margins = windowEdgeMargins();
  const limit = {
    left: area.x + margins.x,
    right: area.x + area.width - margins.x - bounds.width,
    top: area.y + margins.y,
    bottom: area.y + area.height - margins.y - bounds.height,
  };
  for (const other of displays) {
    if (other.id === display.id) continue;
    const edge = other.bounds || other.workArea;
    const inVerticalRange = center.y >= other.workArea.y && center.y <= other.workArea.y + other.workArea.height;
    const inHorizontalRange = center.x >= other.workArea.x && center.x <= other.workArea.x + other.workArea.width;
    // Unlock only actual shared screen edges, never a gap between monitors.
    if (inVerticalRange && Math.abs(edge.x + edge.width - physical.x) <= 1) limit.left = -Infinity;
    if (inVerticalRange && Math.abs(edge.x - physical.x - physical.width) <= 1) limit.right = Infinity;
    if (inHorizontalRange && Math.abs(edge.y + edge.height - physical.y) <= 1) limit.top = -Infinity;
    if (inHorizontalRange && Math.abs(edge.y - physical.y - physical.height) <= 1) limit.bottom = Infinity;
  }
  const rubberBand = (value, minimum, maximum) => {
    if (maximum < minimum) maximum = minimum;
    const clamped = Math.max(minimum, Math.min(value, maximum));
    const delta = value - clamped;
    // Up to 22 DIP of give: enough to feel responsive without losing the
    // camera outside the display. Release eases back to the legal position.
    return Math.round(clamped + Math.sign(delta) * 22 * (1 - Math.exp(-Math.abs(delta) / 65)));
  };
  return {
    x: rubberBand(position.x, limit.left, limit.right),
    y: rubberBand(position.y, limit.top, limit.bottom),
  };
}

function currentWindowSize() {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const bounds = mainWindow.getBounds();
  return largestSide(bounds);
}

function focusSizeForCurrentShape() {
  const display = mainWindow && !mainWindow.isDestroyed()
    ? displayForBounds(mainWindow.getBounds())
    : screen.getPrimaryDisplay();
  const scale = shapeMode === 'rectangle' && aspectRatio === '9:16'
    ? 0.98
    : shapeMode === 'rectangle' && aspectRatio === '4:5'
      ? 0.94
      : 0.92;
  const maximum = maximumContentSizeForDisplay(display);
  return clampNumber(Math.round(maximum * scale), Math.min(MIN_SIZE, maximum), maximum, maximum);
}

function centeredBoundsForSize(size) {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const dimensions = dimensionsForSize(size);
  const workArea = displayForBounds(mainWindow.getBounds()).workArea;
  return clampToVisibleDisplay({
    x: workArea.x + (workArea.width - dimensions.width) / 2,
    y: workArea.y + (workArea.height - dimensions.height) / 2,
    ...dimensions,
  });
}

function responsiveBoundsForCurrentPreset(bounds) {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  const current = bounds || mainWindow.getBounds();
  const display = displayForBounds(current);
  const preset = activeSizePreset(largestSide(current), display);
  return boundsWithSizePreservingAnchor(current, sizeForPreset(preset, display));
}

function fitPresetToCurrentDisplay({ save = false, duration = 180 } = {}) {
  const bounds = responsiveBoundsForCurrentPreset();
  if (!bounds) return null;
  setWindowBoundsProgrammatically(bounds, { duration });
  if (save) saveLastState(bounds);
  sendToRenderer('camera:size-changed', largestSide(bounds));
  buildApplicationMenu();
  return bounds;
}

function setMainWindowSize(preset) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const current = focusRestoreBounds || boundsAnimation?.target || mainWindow.getBounds();
  selectedSizePreset = preset.id;
  const bounds = boundsWithSizePreservingAnchor(current, sizeForPreset(preset, displayForBounds(current)));
  setWindowBoundsProgrammatically(bounds);
  focusEnabled = false;
  focusRestoreBounds = null;
  sendToRenderer('camera:set-focus', false);
  saveLastState(bounds);
  sendToRenderer('camera:size-changed', largestSide(bounds));
  buildApplicationMenu();
}

function setMirrorEnabled(enabled) {
  mirrorEnabled = Boolean(enabled);
  if (mainWindow && !mainWindow.isDestroyed()) saveLastState(mainWindow.getBounds());
  sendToRenderer('camera:set-mirror', mirrorEnabled);
  buildApplicationMenu();
}

function setBorderEnabled(enabled) {
  borderEnabled = Boolean(enabled);
  if (mainWindow && !mainWindow.isDestroyed()) saveLastState(mainWindow.getBounds());
  sendToRenderer('camera:set-border', borderEnabled);
  buildApplicationMenu();
}

function setFocusEnabled(enabled) {
  if (!mainWindow || mainWindow.isDestroyed() || Boolean(enabled) === focusEnabled) return;
  if (enabled) {
    focusRestoreBounds = boundsAnimation?.target || mainWindow.getBounds();
    focusEnabled = true;
    setWindowBoundsProgrammatically(centeredBoundsForSize(focusSizeForCurrentShape()));
  } else {
    focusEnabled = false;
    if (focusRestoreBounds) setWindowBoundsProgrammatically(clampToVisibleDisplay(focusRestoreBounds));
    focusRestoreBounds = null;
  }
  sendToRenderer('camera:set-focus', focusEnabled);
  buildApplicationMenu();
}

function setShapeMode(mode) {
  if (mode !== 'circle' && mode !== 'rectangle') return;
  // A new shape replaces the current transition. Compute it from the normal
  // destination, never from an intermediate focus-animation frame.
  const current = focusRestoreBounds || boundsAnimation?.target
    || (mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null);
  if (focusEnabled) sendToRenderer('camera:set-focus', false);
  focusEnabled = false;
  focusRestoreBounds = null;
  shapeMode = mode;
  if (current) {
    const display = displayForBounds(current);
    const preset = activeSizePreset(largestSide(current), display);
    const bounds = boundsWithSizePreservingAnchor(current, sizeForPreset(preset, display));
    sendToRenderer('camera:set-shape', { shapeMode, aspectRatio });
    setWindowBoundsProgrammatically(bounds);
    refreshNativeShadow(180);
    saveLastState(bounds);
    sendToRenderer('camera:size-changed', largestSide(bounds));
  }
  buildApplicationMenu();
}

function setAspectRatio(value) {
  if (!ASPECT_RATIOS.some((item) => item.value === value)) return;
  aspectRatio = value;
  if (shapeMode === 'rectangle') setShapeMode('rectangle');
  else {
    if (mainWindow && !mainWindow.isDestroyed()) saveLastState(mainWindow.getBounds());
    buildApplicationMenu();
  }
}

function setCameraDeviceId(deviceId, notifyRenderer = false) {
  cameraDeviceId = typeof deviceId === 'string' && deviceId.length > 0 && deviceId.length <= 1024 ? deviceId : null;
  if (mainWindow && !mainWindow.isDestroyed()) saveLastState(mainWindow.getBounds());
  if (notifyRenderer) sendToRenderer('camera:set-device', cameraDeviceId);
  buildApplicationMenu();
}
return {
 getState: snapshot,
 initialBounds() {
  const display = screen.getPrimaryDisplay();
  const dimensions = dimensionsForSize(sizeForPreset(activeSizePreset(null, display), display));
  return clampToVisibleDisplay({ x: Number.isFinite(stored.x) ? stored.x : display.workArea.width - dimensions.width, y: Number.isFinite(stored.y) ? stored.y : 0, ...dimensions });
 },
 setSize(id) { const preset = sizePresetsForCurrentShape().find(item => item.id === id); if (preset) setMainWindowSize(preset); },
 setShape: setShapeMode, setAspect: setAspectRatio, setMirror: setMirrorEnabled, setBorder: setBorderEnabled,
 setFocus: setFocusEnabled, toggleFocus: () => setFocusEnabled(!focusEnabled),
 setCamera: setCameraDeviceId,
 setShadow(enabled) { shadowEnabled = Boolean(enabled); sendToRenderer('camera:set-shadow', shadowEnabled); saveLastState(); },
 interrupt: cancelBoundsAnimation,
 step: stepBoundsAnimation,
 move(position) {
  if (focusEnabled) return;
  cancelBoundsAnimation();
  const constrained = constrainDragPosition(position, mainWindow.getBounds());
  mainWindow.setPosition(constrained.x, constrained.y, false);
 },
 finishMove() { dragDisplays = null; if (!focusEnabled) fitPresetToCurrentDisplay({ save: true, duration: 160 }); },
 resize() { dragDisplays = null; if (focusEnabled) setWindowBoundsProgrammatically(centeredBoundsForSize(focusSizeForCurrentShape())); else fitPresetToCurrentDisplay({ save: true }); },
 dispose: cancelBoundsAnimation,
};
};
