import { expect, test } from "@playwright/test";

import { expectNoAccessibilityViolations } from "./accessibility";

test("renders the application foundation", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  await expect(
    page.getByRole("heading", { name: /places worth returning to/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "TravelTrove" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Explore", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Cities" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Categories" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Administration" })).toHaveCount(
    0,
  );
  await expectNoAccessibilityViolations(page);
});
