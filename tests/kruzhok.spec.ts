import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    cameraFailure?: { name: string; message: string };
    cameraTest: {
      calls: MediaStreamConstraints[];
      streams: MediaStream[];
      resolve?: (stream: MediaStream) => void;
      makeStream: () => MediaStream;
    };
  }
}
async function cameraMock(
  page: Page,
  mode: "live" | "pending" | "denied" = "live",
) {
  await page.addInitScript((behavior) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const makeStream = () => {
      ctx.fillStyle = "#6550aa";
      ctx.fillRect(0, 0, 64, 64);
      const stream = canvas.captureStream(5);
      window.cameraTest.streams.push(stream);
      return stream;
    };
    window.cameraTest = { calls: [], streams: [], makeStream };
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: (constraints: MediaStreamConstraints) => {
        window.cameraTest.calls.push(constraints);
        if (behavior === "denied")
          return Promise.reject(new DOMException("Denied", "NotAllowedError"));
        if (behavior === "pending")
          return new Promise<MediaStream>((resolve) => {
            window.cameraTest.resolve = resolve;
          });
        return Promise.resolve(makeStream());
      },
    });
  }, mode);
}
const orb = (page: Page) =>
  page.getByRole("button", { name: "Кружок с видео", exact: true });
async function openMenu(page: Page) {
  await orb(page).click({ button: "right" });
  await expect(
    page.getByRole("menu", { name: "Настройки кружка" }),
  ).toBeVisible();
}
async function source(page: Page, name: "Моя камера" | "Видео Леонида") {
  await openMenu(page);
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}

for (const [platform, ua, touch, label, file] of [
  [
    "MacIntel",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    0,
    "Скачать для Mac",
    "mac-universal.dmg",
  ],
  [
    "Win32",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    0,
    "Скачать для Windows",
    "windows-x64-Setup.exe",
  ],
  [
    "Linux x86_64",
    "Mozilla/5.0 (X11; Linux x86_64)",
    0,
    "Скачать для Mac",
    "mac-universal.dmg",
  ],
  [
    "MacIntel",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    5,
    "Скачать для Mac",
    "mac-universal.dmg",
  ],
  [
    "iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    5,
    "Скачать для Mac",
    "mac-universal.dmg",
  ],
  [
    "Linux armv8l",
    "Mozilla/5.0 (Linux; Android 15)",
    5,
    "Скачать для Mac",
    "mac-universal.dmg",
  ],
] as const) {
  test(`two direct downloads: ${platform} / touch ${touch}`, async ({
    page,
  }) => {
    await cameraMock(page, "denied");
    await page.addInitScript(
      ({ platform, ua, touch }) => {
        for (const [key, value] of Object.entries({
          platform,
          userAgent: ua,
          maxTouchPoints: touch,
        }))
          Object.defineProperty(navigator, key, { value, configurable: true });
      },
      { platform, ua, touch },
    );
    await page.goto("/kruzhok");
    await expect(page.locator(".kruzhok-primary")).toHaveText(label);
    await expect(page.locator(".kruzhok-primary")).toHaveAttribute(
      "href",
      new RegExp(`${file.replaceAll(".", "\\.")}$`),
    );
    await expect(page.locator(".kruzhok-secondary")).toHaveText(
      label === "Скачать для Mac" ? "Скачать для Windows" : "Скачать для Mac",
    );
    await expect(page.locator(".kruzhok-download a")).toHaveCount(2);
  });
}

test("dragging, keyboard movement, reset and viewport bounds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/kruzhok");
  const initial = (await orb(page).boundingBox())!;
  await page.mouse.move(initial.x + 100, initial.y + 100);
  await page.mouse.down();
  await page.mouse.move(initial.x - 100, initial.y + 180, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await orb(page).boundingBox())!.x)
    .toBe(initial.x - 200);
  await orb(page).focus();
  await page.keyboard.press("ArrowLeft");
  expect((await orb(page).boundingBox())!.x).toBe(initial.x - 216);
  await page.keyboard.press("Home");
  expect((await orb(page).boundingBox())!.x).toBe(initial.x);
  await page.keyboard.press("ArrowRight");
  await page.setViewportSize({ width: 320, height: 568 });
  await expect
    .poll(async () => {
      const bounds = (await orb(page).boundingBox())!;
      return bounds.x + bounds.width;
    })
    .toBeLessThanOrEqual(308);
  const bounds = (await orb(page).boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(12);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(556);
});

test("touch dragging on a phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/kruzhok");
  const bounds = (await orb(page).boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: bounds.x + 100, y: bounds.y + 100 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: bounds.x + 140, y: bounds.y + 180 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => (await orb(page).boundingBox())!.x)
    .toBe(bounds.x + 40);
  expect((await orb(page).boundingBox())!.y).toBe(bounds.y + 80);
  await context.close();
});

test("camera is requested on entry, excludes audio, and switches source", async ({
  page,
}) => {
  await cameraMock(page);
  await page.goto("/kruzhok");
  await expect(orb(page)).toHaveClass(/is-live/);
  expect(await page.evaluate(() => window.cameraTest.calls)).toEqual([
    { video: { facingMode: "user" }, audio: false },
  ]);
  await source(page, "Видео Леонида");
  await expect(orb(page)).not.toHaveClass(/is-live/);
  expect(
    await page.evaluate(
      () => window.cameraTest.streams[0].getTracks()[0].readyState,
    ),
  ).toBe("ended");
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    "/kruzhok/intro.mp4",
  );
  await source(page, "Моя камера");
  await expect(orb(page)).toHaveClass(/is-live/);
  await page
    .getByRole("link", { name: "Ленинблок — главная", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() =>
      window.cameraTest.streams.every((s) =>
        s.getTracks().every((t) => t.readyState === "ended"),
      ),
    ),
  ).toBe(true);
});

test("pending permission retains author video and a late grant after changing source is stopped", async ({
  page,
}) => {
  await cameraMock(page, "pending");
  await page.goto("/kruzhok");
  await expect
    .poll(() => page.evaluate(() => window.cameraTest.calls.length))
    .toBe(1);
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    "/kruzhok/intro.mp4",
  );
  await source(page, "Видео Леонида");
  await page.evaluate(() =>
    window.cameraTest.resolve!(window.cameraTest.makeStream()),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => window.cameraTest.streams[0].getTracks()[0].readyState,
      ),
    )
    .toBe("ended");
  await expect(orb(page)).not.toHaveClass(/is-live/);
});

test("camera denial falls back quietly and can be retried from settings", async ({
  page,
}) => {
  await cameraMock(page, "denied");
  await page.goto("/kruzhok");
  await expect
    .poll(() => page.evaluate(() => window.cameraTest.calls.length))
    .toBe(1);
  await expect(orb(page)).not.toHaveClass(/is-live/);
  await expect(page.getByRole("status")).toHaveCount(0);
  await openMenu(page);
  await expect(page.getByRole("status")).toContainText(
    "Доступ к камере закрыт",
  );
  await expect(
    page.getByRole("menuitemradio", { name: "Видео Леонида" }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("menuitemradio", { name: "Моя камера", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.cameraTest.calls.length))
    .toBe(2);
});

test("context menu changes size and appearance without a selection outline", async ({
  page,
}) => {
  await cameraMock(page, "denied");
  await page.goto("/kruzhok");
  await openMenu(page);
  await page
    .getByRole("menuitemradio", { name: "Компактный", exact: true })
    .click();
  const compact = (await orb(page).boundingBox())!.width;
  await openMenu(page);
  await page
    .getByRole("menuitemradio", { name: "Очень большой", exact: true })
    .click();
  await expect
    .poll(async () => (await orb(page).boundingBox())!.width)
    .toBeGreaterThan(compact);
  for (const [name, className] of [
    ["Контур", "has-border"],
    ["Тень", "has-shadow"],
    ["Отразить по горизонтали", "is-mirrored"],
  ]) {
    const wasEnabled = (await orb(page).getAttribute("class"))!.includes(
      className,
    );
    await openMenu(page);
    await page.getByRole("menuitemcheckbox", { name, exact: true }).click();
    expect((await orb(page).getAttribute("class"))!.includes(className)).toBe(
      !wasEnabled,
    );
  }
  await orb(page).focus();
  expect(
    await orb(page).evaluate((el) => getComputedStyle(el).outlineStyle),
  ).toBe("none");
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitemradio", { name: "Компактный", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(orb(page)).toBeFocused();
});

test("context menu stays in the viewport, closes outside, and opens by long press", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await cameraMock(page, "denied");
  await page.goto("/kruzhok");
  const bounds = (await orb(page).boundingBox())!;
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    ],
  });
  await expect(page.getByRole("menu")).toBeVisible();
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const menu = (await page.getByRole("menu").boundingBox())!;
  expect(menu.x).toBeGreaterThanOrEqual(8);
  expect(menu.x + menu.width).toBeLessThanOrEqual(382);
  expect(menu.y + menu.height).toBeLessThanOrEqual(836);
  await page.touchscreen.tap(10, 60);
  await expect(page.getByRole("menu")).toHaveCount(0);
  await context.close();
});

test("reduced motion uses a still frame; playback control is only in the context menu", async ({
  page,
}) => {
  await cameraMock(page, "denied");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/kruzhok");
  await expect
    .poll(() =>
      page.locator("video").evaluate((v) => (v as HTMLVideoElement).paused),
    )
    .toBe(true);
  await openMenu(page);
  await page
    .getByRole("menuitem", { name: "Воспроизвести видео", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v) => (v as HTMLVideoElement).paused),
    )
    .toBe(false);
  await openMenu(page);
  await page
    .getByRole("menuitem", { name: "Приостановить видео", exact: true })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v) => (v as HTMLVideoElement).paused),
    )
    .toBe(true);
});

test("native media API works automatically after navigation from home", async ({
  page,
  context,
  request,
}) => {
  await context.grantPermissions(["camera"]);
  const response = await page.goto("/");
  expect(response?.headers()["permissions-policy"]).toBe(
    "camera=(self), microphone=(), geolocation=()",
  );
  await page.locator(".camera-card").click();
  await expect(orb(page)).toHaveClass(/is-live/);
  expect(
    await page
      .locator("video")
      .evaluate(
        (v) =>
          ((v as HTMLVideoElement).srcObject as MediaStream).getAudioTracks()
            .length,
      ),
  ).toBe(0);
  await source(page, "Видео Леонида");
  const clip = await request.get("/kruzhok/intro.mp4");
  expect(clip.status()).toBe(200);
  expect(clip.headers()["content-type"]).toContain("video/mp4");
  expect((await clip.body()).length).toBeLessThan(400000);
});
