import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
const source = process.argv[2];
if (!source) throw new Error("Pass the original floating-camera checkout.");
const file = path.join(source, "tests/main.test.js");
const input = fs.readFileSync(file, "utf8");
const ast = ts.createSourceFile(
  file,
  input,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const harnessSource = ast.statements
  .find((n) => ts.isFunctionDeclaration(n) && n.name?.text === "harness")
  .getText(ast);
const require = createRequire(file);
const context = vm.createContext({
  require,
  fs,
  path,
  vm,
  EventEmitter: require("node:events").EventEmitter,
  __dirname: path.dirname(file),
  process,
  console,
});
vm.runInContext(harnessSource, context);
const profiles = [
  [1440, 900],
  [1920, 1080],
  [390, 844],
];
const result = {
  source:
    "floating-camera v1.1.0, complete main.js executed in its own original test harness",
  profiles: [],
};
for (const [width, height] of profiles) {
  const h = vm.runInContext("harness({appDefaults:true})", context);
  h.displays[0].workArea = { x: 0, y: 0, width, height };
  h.displays.splice(1);
  const cases = [];
  for (const [shape, aspect] of [
    ["circle", "1:1"],
    ["rectangle", "1:1"],
    ["rectangle", "4:5"],
    ["rectangle", "9:16"],
  ]) {
    h.run(
      `shapeMode=${JSON.stringify(shape)};aspectRatio=${JSON.stringify(aspect)}`,
    );
    const presets = JSON.parse(
      JSON.stringify(h.run("sizePresetsForCurrentShape()")),
    );
    for (const preset of presets) {
      const dimensions = h.run(
        `dimensionsForSize(sizeForPreset(sizePresetsForCurrentShape().find(p=>p.id===${JSON.stringify(preset.id)})))`,
      );
      cases.push({
        shape,
        aspect,
        preset: preset.id,
        label: preset.label,
        ...dimensions,
      });
    }
  }
  result.profiles.push({ width, height, cases });
}
const h = vm.runInContext("harness({appDefaults:true})", context);
h.displays[0].workArea = { x: 0, y: 0, width: 1440, height: 900 };
h.displays.splice(1);
h.run(
  "shapeMode='circle';aspectRatio='1:1';mainWindow.setBounds({x:700,y:250,width:250,height:250});setMainWindowSize(SIZE_PRESET_SETS.square[1])",
);
const timestamps = [
  0, 16, 32, 120, 136, 136, 152, 168, 184, 200, 216, 232, 248,
];
result.animation = timestamps.map((timestamp) => ({
  timestamp,
  more: h.run(`stepBoundsAnimation(boundsAnimation?.id ?? -1,${timestamp})`),
  bounds: h.bounds(),
}));
fs.writeFileSync(
  "tests/fixtures/kruzhok-native-reference.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  "Generated native reference from original app, including delayed-frame animation.",
);
