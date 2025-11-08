import { test, expect } from "@playwright/test";

test.describe("Discovery swipe deck", () => {
  test("removes cards after swipes", async ({ page }) => {
    await page.goto("/discover");

    const cards = page.locator('[data-testid="swipe-card"]');
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    await page.getByTestId("pass-button").click();
    await expect(cards).toHaveCount(initialCount - 1);

    await page.getByTestId("like-button").click();
    await expect(cards).toHaveCount(initialCount - 2);
  });
});
