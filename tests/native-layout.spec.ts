import { test, expect } from "@playwright/test";
import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";
import reference from "./fixtures/kruzhok-native-reference.json";

type Bounds = { x: number; y: number; width: number; height: number };
function native(width: number, height: number) {
  let bounds: Bounds = { x: 700, y: 250, width: 250, height: 250 };
  let animation = -1;
  const display = { id: 1, workArea: { x: 0, y: 0, width, height } };
  const context = vm.createContext({
    window: {},
    matchMedia: () => ({ matches: true }),
    Date,
    Math,
  });
  vm.runInContext(
    fs.readFileSync("public/kruzhok/runtime/native-layout.js", "utf8"),
    context,
  );
  const engine = context.window.createKruzhokNative({
    window: {
      isDestroyed: () => false,
      isVisible: () => false,
      getBounds: () => ({ ...bounds }),
      setBounds: (next: Bounds) => {
        bounds = { ...next };
      },
    },
    screen: {
      getPrimaryDisplay: () => display,
      getDisplayNearestPoint: () => display,
      getAllDisplays: () => [display],
    },
    emit: (channel: string, id: number) => {
      if (channel === "camera:animate-layout") animation = id;
    },
    change: () => {},
  });
  return { context, engine, bounds: () => bounds, animation: () => animation };
}
for (const profile of reference.profiles) {
  test(`native geometry parity: ${profile.width} × ${profile.height}`, () => {
    const h = native(profile.width, profile.height);
    for (const item of profile.cases) {
      h.engine.setShape(item.shape);
      h.engine.setAspect(item.aspect);
      h.engine.setSize(item.preset);
      expect(h.bounds().width, JSON.stringify(item)).toBe(item.width);
      expect(h.bounds().height, JSON.stringify(item)).toBe(item.height);
    }
  });
}
test("animation matches original app including late and duplicate frames", () => {
  const start = { x: 700, y: 250, width: 250, height: 250 };
  // Replace only the platform visibility/bounds binding, not layout code.
  const context = vm.createContext({
    window: {},
    matchMedia: () => ({ matches: false }),
    Date,
    Math,
  });
  vm.runInContext(
    fs.readFileSync("public/kruzhok/runtime/native-layout.js", "utf8"),
    context,
  );
  let bounds = { ...start },
    id = -1;
  const display = { id: 1, workArea: { x: 0, y: 0, width: 1440, height: 900 } };
  const engine = context.window.createKruzhokNative({
    settings: { shapeMode: "circle", aspectRatio: "1:1" },
    window: {
      isDestroyed: () => false,
      isVisible: () => true,
      getBounds: () => ({ ...bounds }),
      setBounds: (value: Bounds) => {
        bounds = { ...value };
      },
    },
    screen: {
      getPrimaryDisplay: () => display,
      getDisplayNearestPoint: () => display,
      getAllDisplays: () => [display],
    },
    emit: (channel: string, value: number) => {
      if (channel === "camera:animate-layout") id = value;
    },
    change: () => {},
  });
  engine.setSize("normal");
  for (const frame of reference.animation) {
    expect(engine.step(id, frame.timestamp)).toBe(frame.more);
    expect(bounds).toEqual(frame.bounds);
  }
});
test("renderer and styles remain byte-identical to the original app", () => {
  const manifest = JSON.parse(
    fs.readFileSync("public/kruzhok/runtime/provenance.json", "utf8"),
  );
  const hash = (value: string) =>
    crypto.createHash("sha256").update(value).digest("hex");
  expect(
    hash(fs.readFileSync("public/kruzhok/runtime/renderer.js", "utf8")),
  ).toBe(manifest.rendererSha256);
  const html = fs.readFileSync("public/kruzhok/runtime/index.html", "utf8");
  expect(hash(html.match(/<style>([\s\S]*?)<\/style>/)![1])).toBe(
    manifest.styleSha256,
  );
  new vm.Script(
    fs.readFileSync("public/kruzhok/runtime/browser-preload.js", "utf8"),
  );
});
