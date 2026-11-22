import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/kruzhok", "/bible"];
for (const route of routes) {
  test(`${route}: content, SEO, links, responsive layout and accessibility`, async ({
    page,
    request,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /.+/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://leninblock.ru${route === "/" ? "" : route}`,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `https://leninblock.ru${route === "/" ? "" : route}`,
    );
    const imageUrl = await page
      .locator('meta[property="og:image"]')
      .getAttribute("content");
    expect(imageUrl).toMatch(/https:\/\/leninblock.ru\/og\/.+\.png$/);
    const image = await request.get(new URL(imageUrl!).pathname);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `no overflow at ${width}`,
      ).toBe(true);
      if (width === 390 || width === 1440) {
        const result = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(result.violations).toEqual([]);
        await page.screenshot({
          path: test
            .info()
            .outputPath(
              `${route === "/" ? "home" : route.slice(1)}-${width}.png`,
            ),
          fullPage: true,
        });
      }
    }
    const internalLinks = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => [
        ...new Set(links.map((link) => link.getAttribute("href")!)),
      ]);
    for (const href of internalLinks)
      expect((await request.get(href)).status(), href).toBe(200);
    await page.goto(route);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "К содержимому" }),
    ).toBeFocused();
    expect(
      await page
        .getByRole("link", { name: "К содержимому" })
        .evaluate((el) => getComputedStyle(el).outlineStyle),
    ).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    expect(errors).toEqual([]);
  });
}

test("real HTTP redirect and canonical www redirect", async ({ request }) => {
  const response = await request.get("/play", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("https://www.wherefrombible.ru/");
  const www = await request.get("/kruzhok", {
    headers: { Host: "www.leninblock.ru" },
    maxRedirects: 0,
  });
  expect(www.status()).toBe(308);
  expect(www.headers().location).toBe("https://leninblock.ru/kruzhok");
});

test("sitemap, robots, icon and absent future pages", async ({
  request,
  page,
}) => {
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(3);
  for (const route of ["/play", "/easm", "/work"])
    expect(xml).not.toContain(route);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Sitemap: https://leninblock.ru/sitemap.xml",
  );
  expect((await request.get("/icon.svg")).status()).toBe(200);
  expect((await request.get("/favicon.ico")).status()).toBe(200);
  for (const route of ["/easm", "/work", "/missing"]) {
    expect((await page.goto(route))?.status()).toBe(404);
    await expect(
      page.getByRole("link", { name: "На главную →" }),
    ).toBeVisible();
  }
});

test("navigation and honest product actions", async ({ page }) => {
  await page.goto("/");
  await page.locator(".camera-card").click();
  await expect(page).toHaveURL(/\/kruzhok$/);
  await page.getByRole("link", { name: "О скачивании" }).click();
  await expect(
    page.getByRole("heading", { name: "Версия для скачивания готовится" }),
  ).toBeInViewport();
  await expect(page.locator('a[href*="releases"]')).toHaveCount(0);
  await page
    .getByRole("link", { name: "Другой проект: Откуда из Библии?" })
    .click();
  await expect(page).toHaveURL(/\/bible$/);
  await expect(
    page.getByRole("link", { name: "Играть", exact: true }),
  ).toHaveAttribute("href", "https://www.wherefrombible.ru/");
});
