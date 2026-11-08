import { expect, test } from "@playwright/test";

test("renders the application foundation", async ({ page }) => {
  await page.goto("/");
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
});
