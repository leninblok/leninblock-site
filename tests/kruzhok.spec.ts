import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import reference from "./fixtures/kruzhok-native-reference.json";

declare global {
  interface Window {
    cameraTracks: MediaStreamTrack[];
    cameraTest: {
      calls: MediaStreamConstraints[];
      streams: MediaStream[];
      resolve?: (stream: MediaStream) => void;
      makeStream: () => MediaStream;
    };
  }
}
const app = (page: Page) => page.frameLocator(".kruzhok-app-window");
const windowBounds = async (page: Page) =>
  JSON.parse((await page.locator("iframe").getAttribute("data-bounds"))!);
async function ready(page: Page) {
  await expect(
    page.getByRole("radio", { name: "Круг", exact: true }),
  ).toBeEnabled();
}
async function choose(page: Page, label: string) {
  await page.getByRole("radio", { name: label, exact: true }).click();
  await expect(
    page.getByRole("radio", { name: label, exact: true }),
  ).toBeChecked();
}
async function mockCamera(
  page: Page,
  mode: "live" | "pending" | "denied" = "denied",
) {
  await page.addInitScript((behavior) => {
    if (!location.pathname.endsWith("/runtime/index.html")) return;
    const makeStream = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#6550aa";
      ctx.fillRect(0, 0, 64, 64);
      const stream = canvas.captureStream(25);
      const timer = setInterval(() => ctx.fillRect(0, 0, 64, 64), 40);
      const track = stream.getVideoTracks()[0],
        stop = track.stop.bind(track);
      track.stop = () => {
        clearInterval(timer);
        stop();
      };
      window.cameraTest.streams.push(stream);
      return stream;
    };
    window.cameraTest = { calls: [], streams: [], makeStream };
    navigator.mediaDevices.getUserMedia = (constraints) => {
      window.cameraTest.calls.push(constraints ?? {});
      if (behavior === "denied")
        return Promise.reject(new DOMException("Denied", "NotAllowedError"));
      if (behavior === "pending")
        return new Promise<MediaStream>((resolve) => {
          window.cameraTest.resolve = resolve;
        });
      return Promise.resolve(makeStream());
    };
  }, mode);
}
for (const [platform, ua, expected, file] of [
  [
    "MacIntel",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Mac",
    "mac-universal.dmg",
  ],
  [
    "Win32",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Windows",
    "windows-x64-Setup.exe",
  ],
  [
    "iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    "Mac",
    "mac-universal.dmg",
  ],
] as const) {
  test(`direct downloads on ${platform}`, async ({ page }) => {
    await mockCamera(page);
    await page.addInitScript(
      ({ platform, ua }) => {
        Object.defineProperty(navigator, "platform", { value: platform });
        Object.defineProperty(navigator, "userAgent", { value: ua });
      },
      { platform, ua },
    );
    await page.goto("/kruzhok");
    await expect(page.locator(".kruzhok-primary")).toHaveText(
      `Скачать для ${expected}`,
    );
    await expect(page.locator(".kruzhok-primary")).toHaveAttribute(
      "href",
      new RegExp(file.replaceAll(".", "\\.") + "$"),
    );
    await expect(page.locator(".kruzhok-secondary")).toHaveText(
      `Скачать для ${expected === "Mac" ? "Windows" : "Mac"}`,
    );
  });
}
test("all native camera settings are visible below download, without a context menu", async ({
  page,
}) => {
  await mockCamera(page);
  await page.goto("/kruzhok");
  await ready(page);
  await expect(
    page.getByRole("heading", { name: "Параметры", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Выбрать камеру", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Прямоугольник", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "9:16", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Большой", exact: true }),
  ).toBeChecked();
  for (const name of ["Контур", "Тень", "Отразить по горизонтали", "Фокус"])
    await expect(
      page.getByRole("checkbox", { name, exact: true }),
    ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Тень", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Контур", exact: true }),
  ).not.toBeChecked();
  await app(page).locator("#circle").click({ button: "right" });
  await expect(page.getByRole("menu")).toHaveCount(0);
  await choose(page, "Круг");
  await expect(
    page.getByRole("group", { name: "Соотношение сторон", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("radio", { name: "Очень большой", exact: true }),
  ).toBeVisible();
  await choose(page, "Прямоугольник");
  await choose(page, "4:5");
  await expect(
    page.getByRole("radio", { name: "Очень большой", exact: true }),
  ).toHaveCount(0);
  await choose(page, "1:1");
  await expect(
    page.getByRole("radio", { name: "Очень большой", exact: true }),
  ).toBeVisible();
});
for (const profile of reference.profiles.filter((p) => p.width !== 1920)) {
  test(`browser uses actual native dimensions at ${profile.width} × ${profile.height}`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      screen: { width: profile.width, height: profile.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await mockCamera(page);
    await page.goto("/kruzhok");
    await ready(page);
    for (const item of profile.cases) {
      await choose(page, item.shape === "circle" ? "Круг" : "Прямоугольник");
      if (item.shape === "rectangle") await choose(page, item.aspect);
      await choose(page, item.label);
      await expect
        .poll(async () => {
          const b = await windowBounds(page);
          return [b.width, b.height];
        })
        .toEqual([item.width, item.height]);
    }
    await context.close();
  });
}
test("native loading shell waits for its first frame and keeps the author while permission is pending", async ({
  page,
}) => {
  await mockCamera(page, "pending");
  await page.route("**/kruzhok/intro.mp4", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.goto("/kruzhok");
  await ready(page);
  await expect(app(page).locator("#circle")).toHaveCSS(
    "background-color",
    "rgb(8, 8, 8)",
  );
  await expect(app(page).locator("body")).toHaveClass(/has-video/);
  expect(
    await app(page)
      .locator("#cam")
      .evaluate((v) => (v as HTMLVideoElement).videoWidth),
  ).toBe(640);
  await expect
    .poll(() =>
      app(page)
        .locator("body")
        .evaluate(() => window.cameraTest.calls.length),
    )
    .toBe(1);
  await page
    .getByLabel("Выбрать камеру", { exact: true })
    .selectOption("demo-leonid");
  await app(page)
    .locator("body")
    .evaluate(() => window.cameraTest.resolve!(window.cameraTest.makeStream()));
  await expect
    .poll(() =>
      app(page)
        .locator("body")
        .evaluate(() => window.cameraTest.streams[0].getTracks()[0].readyState),
    )
    .toBe("ended");
});
test("camera starts automatically, excludes audio, switches source and stops after leaving", async ({
  page,
}) => {
  await mockCamera(page, "live");
  await page.goto("/");
  await page.getByRole("link", { name: "Попробовать Кружок" }).click();
  await ready(page);
  await expect
    .poll(() =>
      app(page)
        .locator("body")
        .evaluate(() => window.cameraTest.calls.length),
    )
    .toBe(1);
  await expect(app(page).locator("body")).toHaveClass(/has-video/);
  const constraints = await app(page)
    .locator("body")
    .evaluate(() => window.cameraTest.calls[0]);
  expect(constraints.audio).toBe(false);
  expect(constraints.video).toMatchObject({
    facingMode: { ideal: "user" },
    frameRate: { ideal: 30, max: 30 },
  });
  await page
    .getByLabel("Выбрать камеру", { exact: true })
    .selectOption("demo-leonid");
  await expect
    .poll(() =>
      app(page)
        .locator("body")
        .evaluate(() => window.cameraTest.streams[0].getTracks()[0].readyState),
    )
    .toBe("ended");
  await page.getByLabel("Выбрать камеру", { exact: true }).selectOption("");
  await expect
    .poll(() =>
      app(page)
        .locator("body")
        .evaluate(() => window.cameraTest.streams.length),
    )
    .toBe(2);
  await page.evaluate(() => {
    const frame = document.querySelector("iframe")!;
    window.cameraTracks = (
      frame.contentWindow as Window
    ).cameraTest.streams.flatMap((s) => s.getTracks());
  });
  await page.goBack();
  await page.waitForURL(/\/$/);
  await expect(page.locator(".site-header")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.cameraTracks.every((t) => t.readyState === "ended"),
      ),
    )
    .toBe(true);
});
test("native shape, border, shadow and mirroring styles are applied by original renderer", async ({
  page,
}) => {
  await mockCamera(page);
  await page.goto("/kruzhok");
  await ready(page);
  await choose(page, "Круг");
  for (const [label, className, selector] of [
    ["Контур", "border-enabled", "body"],
    ["Тень", "shadow-enabled", "body"],
    ["Отразить по горизонтали", "mirror", "#cam"],
  ]) {
    const checkbox = page.getByRole("checkbox", { name: label, exact: true });
    const previous = await checkbox.isChecked();
    await checkbox.click();
    if (previous)
      await expect(app(page).locator(selector)).not.toHaveClass(
        new RegExp(className),
      );
    else
      await expect(app(page).locator(selector)).toHaveClass(
        new RegExp(className),
      );
  }
  await expect(app(page).locator("#cameraShell")).toHaveCSS(
    "--corner-fraction",
    "0.5",
  );
  await choose(page, "Прямоугольник");
  await choose(page, "4:5");
  await expect(app(page).locator("#cameraShell")).toHaveCSS(
    "--corner-fraction",
    "0.22",
  );
});
test("double click focuses and locks movement, and restores exact previous bounds", async ({
  page,
}) => {
  await mockCamera(page);
  await page.goto("/kruzhok");
  await ready(page);
  await choose(page, "Круг");
  await expect
    .poll(async () => {
      const b = await windowBounds(page);
      return b.width === b.height;
    })
    .toBe(true);
  const before = await windowBounds(page);
  await app(page).locator("#circle").dblclick();
  await expect(
    page.getByRole("checkbox", { name: "Фокус", exact: true }),
  ).toBeChecked();
  await expect(app(page).locator("#circle")).toHaveClass(/locked/);
  await expect
    .poll(async () => (await windowBounds(page)).width)
    .toBeGreaterThan(before.width);
  await page.getByRole("checkbox", { name: "Фокус", exact: true }).click();
  await expect.poll(() => windowBounds(page)).toEqual(before);
});
test("drag is frame-coalesced and releases back from the elastic edge", async ({
  page,
}) => {
  await mockCamera(page);
  await page.goto("/kruzhok");
  await ready(page);
  await choose(page, "Круг");
  await choose(page, "Компактный");
  await expect(page.locator("iframe")).not.toHaveAttribute(
    "data-animating",
    "true",
  );
  const circle = app(page).locator("#circle");
  await page.locator("iframe").scrollIntoViewIfNeeded();
  const rect = (await circle.boundingBox())!;
  const before = await windowBounds(page);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width / 2 - 100,
    rect.y + rect.height / 2 + 60,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => (await windowBounds(page)).x)
    .toBe(before.x - 100);
  const moved = (await circle.boundingBox())!;
  await page.mouse.move(moved.x + moved.width / 2, moved.y + moved.height / 2);
  await page.mouse.down();
  await page.mouse.move(0, moved.y + moved.height / 2, { steps: 12 });
  const stretched = (await windowBounds(page)).x;
  expect(stretched).toBeLessThan(24);
  await page.mouse.up();
  await expect.poll(async () => (await windowBounds(page)).x).toBe(24);
});
test("settings survive reload like the app", async ({ page }) => {
  await mockCamera(page);
  await page.goto("/kruzhok");
  await ready(page);
  await choose(page, "Круг");
  await choose(page, "Обычный");
  await page.getByRole("checkbox", { name: "Контур", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("kruzhok.demo.v1")!).borderEnabled,
      ),
    )
    .toBe(true);
  await page.reload();
  await ready(page);
  await expect(
    page.getByRole("radio", { name: "Круг", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Обычный", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Контур", exact: true }),
  ).toBeChecked();
});
test("settings and embedded app pass accessibility checks", async ({
  page,
}) => {
  await mockCamera(page);
  await page.goto("/kruzhok");
  await ready(page);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
test("real browser media policy permits automatic camera after home navigation", async ({
  page,
  context,
  request,
}) => {
  await context.grantPermissions(["camera"]);
  await page.goto("/");
  await page.getByRole("link", { name: "Попробовать Кружок" }).click();
  await ready(page);
  await expect(app(page).locator("body")).toHaveClass(/has-video/);
  await expect
    .poll(() =>
      app(page)
        .locator("#cam")
        .evaluate((v) => {
          const stream = (v as HTMLVideoElement).srcObject as MediaStream;
          return Boolean(stream?.getVideoTracks()[0]?.getSettings().deviceId);
        }),
    )
    .toBe(true);
  expect(
    await app(page)
      .locator("#cam")
      .evaluate(
        (v) =>
          ((v as HTMLVideoElement).srcObject as MediaStream).getAudioTracks()
            .length,
      ),
  ).toBe(0);
  const headers = (await request.get("/kruzhok/runtime/index.html")).headers();
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect((await request.get("/")).headers()["x-frame-options"]).toBe("DENY");
});

test("Safari fallback preserves clipping, border and shape changes", async ({ page }) => {
  await mockCamera(page);
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = ((property: string, value?: string) =>
      property === "corner-shape" ? false : value === undefined
        ? supports(property) : supports(property, value)) as typeof CSS.supports;
  });
  await page.goto("/kruzhok");
  await ready(page);
  const frame = app(page);
  await expect(frame.locator("body")).toHaveClass(/shape-fallback/);
  await expect(frame.locator("#camera-shape-clip path")).toHaveAttribute("d", /^M.+ Z$/);
  await choose(page, "Круг");
  await page.waitForTimeout(250);
  const hit = await frame.locator("#circle").evaluate((circle) => {
    const rect = circle.getBoundingClientRect();
    const center = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const corner = document.elementFromPoint(rect.x + 0.2, rect.y + 0.2);
    return [center === circle || circle.contains(center), corner !== circle && !circle.contains(corner)];
  });
  expect(hit).toEqual([true, true]);
  await page.getByRole("checkbox", { name: "Контур", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Контур", exact: true })).toBeChecked();
  await expect(frame.locator(".shape-border")).toHaveCSS("opacity", "1");
  const circlePath = await frame.locator("#camera-shape-clip path").getAttribute("d");
  await choose(page, "Прямоугольник");
  await choose(page, "4:5");
  await page.waitForTimeout(250);
  expect(await frame.locator("#camera-shape-clip path").getAttribute("d")).not.toBe(circlePath);
});

test("live camera opens centered above the title and downloads", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCamera(page);
  await page.goto("/kruzhok");
  await ready(page);
  const camera = (await app(page).locator("#circle").boundingBox())!;
  const title = (await page.getByRole("heading", { name: "Кружок", exact: true }).boundingBox())!;
  const download = (await page.locator(".kruzhok-primary").boundingBox())!;
  expect(Math.abs(camera.x + camera.width / 2 - 720)).toBeLessThanOrEqual(1);
  expect(camera.y + camera.height).toBeLessThan(title.y);
  expect(title.y + title.height).toBeLessThan(download.y);
  await expect(page.locator(".kruzhok-topbar")).toHaveCount(0);
});
