import { test, expect } from "@playwright/test";

test("privacy settings shows error when unauthenticated", async ({ page }) => {
  await page.goto("/settings/privacy");
  await expect(page.getByRole("heading", { name: "Privatsphäre" })).toBeVisible();
  await expect(page.getByText("Einstellungen konnten nicht geladen werden.")).toBeVisible();
});
