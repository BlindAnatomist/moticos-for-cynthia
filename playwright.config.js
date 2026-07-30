import { defineConfig, devices } from "@playwright/test";

const iphone13 = devices["iPhone 13"];

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 7_500 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "webkit-iphone-13",
      use: {
        ...iphone13,
        browserName: "webkit",
      },
    },
    {
      name: "webkit-iphone-large",
      use: {
        ...iphone13,
        browserName: "webkit",
        viewport: { width: 430, height: 932 },
        screen: { width: 430, height: 932 },
        deviceScaleFactor: 3,
      },
    },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
