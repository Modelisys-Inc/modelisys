import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Modelisys/i);
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("body")).toBeVisible();
});
