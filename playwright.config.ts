import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests of the borrowing flow in a real browser, against a running app with the sample
 * data (README, "Browser tests"). They sign in as the Clerk test users and share one database, so
 * they run one at a time.
 *   E2E_BASE_URL=https://your-app.example npx playwright test
 *   E2E_CHANNEL=msedge npm run e2e      (an installed browser instead of Playwright's own)
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "en-GB",
    timezoneId: "UTC",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 860 },
        // E2E_CHANNEL=msedge or chrome uses an installed browser instead of Playwright's own.
        ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
      },
    },
  ],
});
