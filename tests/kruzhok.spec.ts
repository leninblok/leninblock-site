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
const orb = (page: Page) => page.getByRole("group", { name: "Кружок с видео" });

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
  ["Linux x86_64", "Mozilla/5.0 (X11; Linux x86_64)", 0, "Скачать Кружок", ""],
  [
    "MacIntel",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    5,
    "Скачать Кружок",
    "",
  ],
  [
    "iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    5,
    "Скачать Кружок",
    "",
  ],
  ["Linux armv8l", "Mozilla/5.0 (Linux; Android 15)", 5, "Скачать Кружок", ""],
] as const) {
  test(`download selection: ${platform} / touch ${touch}`, async ({ page }) => {
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
    const primary = page.locator(".kruzhok-primary");
    await expect(primary).toHaveText(label);
    if (file)
      await expect(primary).toHaveAttribute(
        "href",
        new RegExp(`${file.replaceAll(".", "\\.")}$`),
      );
    else {
      await primary.click();
      await expect(page.locator(".kruzhok-picker")).toHaveAttribute("open", "");
    }
    if (file) await page.getByText("Другие версии", { exact: true }).click();
    await expect(page.locator(".kruzhok-platform-option")).toHaveCount(2);
    await page.getByRole("heading", { name: "Кружок", exact: true }).click();
    await expect(page.locator(".kruzhok-picker")).not.toHaveAttribute(
      "open",
      "",
    );
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
    .poll(async () => (await orb(page).boundingBox())!.x)
    .toBeLessThanOrEqual(108);
  const bounds = (await orb(page).boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(12);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(532);
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

test("camera requires a click, excludes audio and stops on off/navigation", async ({
  page,
}) => {
  await cameraMock(page);
  await page.goto("/kruzhok");
  expect(await page.evaluate(() => window.cameraTest.calls)).toEqual([]);
  await page.getByRole("button", { name: "Включить мою камеру" }).click();
  await expect(orb(page)).toHaveClass(/is-live/);
  expect(await page.evaluate(() => window.cameraTest.calls)).toEqual([
    { video: { facingMode: "user" }, audio: false },
  ]);
  await page.getByRole("button", { name: "Выключить камеру" }).click();
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
  await page.getByRole("button", { name: "Включить мою камеру" }).click();
  await expect(orb(page)).toHaveClass(/is-live/);
  await page.getByRole("link", { name: "Леонид Макаров", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(() =>
      window.cameraTest.streams.every((s) =>
        s.getTracks().every((t) => t.readyState === "ended"),
      ),
    ),
  ).toBe(true);
});

test("late camera permission after cancel is discarded and stopped", async ({
  page,
}) => {
  await cameraMock(page, "pending");
  await page.goto("/kruzhok");
  await page.getByRole("button", { name: "Включить мою камеру" }).click();
  await page.getByRole("button", { name: "Отменить подключение" }).click();
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
  await expect(
    page.getByRole("button", { name: "Включить мою камеру" }),
  ).toBeVisible();
});

test("camera denial keeps the demo and gives an explanation", async ({
  page,
}) => {
  await cameraMock(page, "denied");
  await page.goto("/kruzhok");
  await page.getByRole("button", { name: "Включить мою камеру" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Доступ к камере не разрешён",
  );
  await expect(page.locator("video")).toHaveAttribute(
    "src",
    "/kruzhok/intro.mp4",
  );
  await expect(
    page.getByRole("button", { name: "Включить мою камеру" }),
  ).toBeVisible();
});

test("reduced motion and explicit playback/pause", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/kruzhok");
  await expect
    .poll(() =>
      page.locator("video").evaluate((v) => (v as HTMLVideoElement).paused),
    )
    .toBe(true);
  await orb(page).hover();
  await page
    .getByRole("button", { name: "Воспроизвести демонстрацию" })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v) => (v as HTMLVideoElement).paused),
    )
    .toBe(false);
  await page
    .getByRole("button", { name: "Приостановить демонстрацию" })
    .click();
  await expect
    .poll(() =>
      page.locator("video").evaluate((v) => (v as HTMLVideoElement).paused),
    )
    .toBe(true);
});

test("real browser media policy survives navigation from home", async ({
  page,
  context,
  request,
}) => {
  await page.addInitScript(() => {
    const capture = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      try {
        return await capture(constraints);
      } catch (error) {
        window.cameraFailure = {
          name: (error as Error).name,
          message: (error as Error).message,
        };
        throw error;
      }
    };
  });
  await context.grantPermissions(["camera"]);
  const response = await page.goto("/");
  expect(response?.headers()["permissions-policy"]).toBe(
    "camera=(self), microphone=(), geolocation=()",
  );
  await page.locator(".camera-card").click();
  await page.getByRole("button", { name: "Включить мою камеру" }).click();
  try {
    await expect(orb(page)).toHaveClass(/is-live/);
  } catch (error) {
    const details = await page.evaluate(async () => ({
      failure: window.cameraFailure,
      visibility: document.visibilityState,
      devices: (await navigator.mediaDevices.enumerateDevices()).map((d) => ({
        kind: d.kind,
        label: d.label,
      })),
      status: document.querySelector('[role="status"]')?.textContent,
    }));
    throw new Error(
      `${(error as Error).message}\nMedia diagnostics: ${JSON.stringify(details)}`,
    );
  }
  expect(
    await page
      .locator("video")
      .evaluate(
        (v) =>
          ((v as HTMLVideoElement).srcObject as MediaStream).getAudioTracks()
            .length,
      ),
  ).toBe(0);
  await page.getByRole("button", { name: "Выключить камеру" }).click();
  const clip = await request.get("/kruzhok/intro.mp4");
  expect(clip.status()).toBe(200);
  expect(clip.headers()["content-type"]).toContain("video/mp4");
  expect((await clip.body()).length).toBeLessThan(400000);
});
