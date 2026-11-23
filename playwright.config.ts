import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-fake-device-for-media-stream"],
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run start -- --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: false,
        timeout: 60000,
      },
});
