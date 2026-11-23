import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import ts from "typescript";

const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/sync-kruzhok-runtime.mjs /path/to/floating-camera",
  );
const main = fs.readFileSync(path.join(source, "main.js"), "utf8");
const tree = ts.createSourceFile(
  "main.js",
  main,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const names = [
  "compactBounds",
  "clampNumber",
  "selectedAspectRatio",
  "sizePresetsForCurrentShape",
  "maximumContentSizeForDisplay",
  "sizeForPreset",
  "activeSizePreset",
  "dimensionsForSize",
  "largestSide",
  "normalizeBoundsForCurrentShape",
  "displayForBounds",
  "windowEdgeMargins",
  "boundsWithSizePreservingAnchor",
  "cancelBoundsAnimation",
  "setWindowBoundsProgrammatically",
  "stepBoundsAnimation",
  "clampToVisibleDisplay",
  "constrainDragPosition",
  "currentWindowSize",
  "focusSizeForCurrentShape",
  "centeredBoundsForSize",
  "responsiveBoundsForCurrentPreset",
  "fitPresetToCurrentDisplay",
  "setMainWindowSize",
  "setMirrorEnabled",
  "setBorderEnabled",
  "setFocusEnabled",
  "setShapeMode",
  "setAspectRatio",
  "setCameraDeviceId",
];
const functions = names.map((name) => {
  const node = tree.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name,
  );
  if (!node) throw new Error(`Missing native function: ${name}`);
  return node.getText(tree);
});
const constantNames = new Set([
  "MIN_SIZE",
  "MAX_SIZE",
  "SHADOW_INSET",
  "CIRCLE_EDGE_MARGINS",
  "RECTANGLE_EDGE_MARGINS",
  "PROGRAMMATIC_LAYOUT_TOLERANCE",
  "EDGE_ANCHOR_TOLERANCE",
  "SIZE_PRESET_SETS",
  "ASPECT_RATIOS",
]);
const constants = tree.statements
  .filter(
    (node) =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((declaration) =>
        constantNames.has(declaration.name.getText(tree)),
      ),
  )
  .map((node) => node.getText(tree))
  .join("\n");
const header = `/* Generated from leninblok/floating-camera v1.1.0 (MIT). See LICENSE and provenance.json.
 * Native function bodies below are copied verbatim. Regenerate with scripts/sync-kruzhok-runtime.mjs.
 */\nwindow.createKruzhokNative = function(adapter) {\n${constants}\n`;
const setup = `
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
`;
const footer = `
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
};\n`;
const target = "public/kruzhok/runtime";
fs.writeFileSync(
  `${target}/native-layout.js`,
  header + setup + functions.join("\n\n") + footer,
);
for (const file of ["renderer.js", "LICENSE"])
  fs.copyFileSync(path.join(source, file), `${target}/${file}`);
const html = fs
  .readFileSync(path.join(source, "index.html"), "utf8")
  .replace(
    '<script src="renderer.js"></script>',
    '<script src="native-layout.js"></script>\n  <script src="browser-preload.js"></script>\n  <script src="renderer.js"></script>',
  )
  .replace("Настройки macOS", "Доступ к камере");
fs.writeFileSync(`${target}/index.html`, html);
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
fs.writeFileSync(
  `${target}/provenance.json`,
  JSON.stringify(
    {
      repository: "https://github.com/leninblok/floating-camera",
      version: "1.1.0",
      mainSha256: hash(main),
      styleSha256: hash(
        fs
          .readFileSync(path.join(source, "index.html"), "utf8")
          .match(/<style>([\s\S]*?)<\/style>/)[1],
      ),
      rendererSha256: hash(fs.readFileSync(path.join(source, "renderer.js"))),
      indexSha256: hash(fs.readFileSync(path.join(source, "index.html"))),
      functions: names,
      adaptations: [
        "Electron IPC/window bindings replaced by browser adapter",
        "Native OS permission button uses browser guidance",
        "Author video offered as an additional local camera source",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Copied native renderer, styling and ${names.length} layout functions.`,
);
