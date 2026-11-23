import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const source = process.argv[2];
if (!source)
  throw new Error(
    "Usage: node scripts/sync-kruzhok-runtime.mjs /path/to/floating-camera",
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
const version = JSON.parse(
  fs.readFileSync(path.join(source, "package.json"), "utf8"),
).version;
const layout = fs.readFileSync(path.join(source, "src/native-layout.js"));
const target = "public/kruzhok/runtime";
fs.writeFileSync(`${target}/native-layout.js`, layout);
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
      version,
      layoutSha256: hash(layout),
      styleSha256: hash(
        fs
          .readFileSync(path.join(source, "index.html"), "utf8")
          .match(/<style>([\s\S]*?)<\/style>/)[1],
      ),
      rendererSha256: hash(fs.readFileSync(path.join(source, "renderer.js"))),
      indexSha256: hash(fs.readFileSync(path.join(source, "index.html"))),
      functions: names,
      adaptations: [
        "Tauri native window bindings replaced by browser adapter",
        "Native OS permission button uses browser guidance",
        "Author video offered as an additional local camera source",
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Copied shared native renderer, styling and ${names.length} layout functions.`,
);
