import { expect, test } from "@playwright/test";

test("renders the application foundation", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /places worth returning to/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "TravelTrove" })).toBeVisible();
});
