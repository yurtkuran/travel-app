import { defineConfig, devices } from "@playwright/test";

const testBaseUrl = "http://127.0.0.1:3100";

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
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: "desktop-chromium",
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
    },
    url: `${testBaseUrl}/health/live`,
    reuseExistingServer: !process.env.CI,
  },
});
