import { defineConfig, devices } from "@playwright/test";

const testBaseUrl = "http://127.0.0.1:3100";
const accessibilityReflowTest = /responsive-accessibility\.spec\.ts/;

// Keep browser tests isolated from the Docker development server on port 3000.
// Workers inherit this value, so generated setup links and Better Auth's trusted
// origin use the same dedicated test server as Playwright.
process.env.BETTER_AUTH_URL = testBaseUrl;

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: testBaseUrl,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "minimum-tablet-chromium",
      testIgnore: accessibilityReflowTest,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: "desktop-chromium",
      testIgnore: accessibilityReflowTest,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "wide-desktop-chromium",
      testIgnore: accessibilityReflowTest,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: "accessibility-reflow-chromium",
      testMatch: accessibilityReflowTest,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3100",
    env: {
      BETTER_AUTH_URL: testBaseUrl,
      NEXT_DIST_DIR: ".next-playwright",
    },
    // Warm the authentication route before workers begin. Waiting only on the
    // lightweight health handler leaves the sign-in client bundle to compile
    // during the first serial authentication journey, which can trigger a
    // development Fast Refresh after credentials have been entered.
    url: `${testBaseUrl}/sign-in`,
    reuseExistingServer: !process.env.CI,
  },
});
