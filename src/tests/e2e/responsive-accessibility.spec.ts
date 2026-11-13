import { expect, test, type Page } from "@playwright/test";

async function expectNoDocumentHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectHomeContentAvailable(page: Page) {
  await expect(
    page.getByRole("heading", { name: /places worth returning to/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  await expectNoDocumentHorizontalOverflow(page);
}

test("reflows for 200% browser zoom and text enlargement", async ({ page }) => {
  // A 1440-pixel browser viewport exposes 720 CSS pixels at 200% zoom.
  await page.setViewportSize({ width: 720, height: 450 });
  await page.goto("/");
  await expectHomeContentAvailable(page);

  // Test text enlargement independently at the supported minimum layout width.
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expectHomeContentAvailable(page);
});
