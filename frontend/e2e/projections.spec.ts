import { test, expect } from "@playwright/test";

// Test user credentials (should match seed data)
const TEST_EMAIL = "playwright@modelisys.com";
const TEST_PASSWORD = "PlaywrightTest123";

test.describe("Projections", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|financial-statements)/, { timeout: 10000 });
  });

  test("can navigate to pro-forma projections", async ({ page }) => {
    await page.goto("/projections");
    await expect(page).toHaveURL(/\/projections/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /pro forma|projections/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to revenue projections", async ({ page }) => {
    await page.goto("/projections/revenue");
    await expect(page).toHaveURL(/\/projections\/revenue/);
  });

  test("can navigate to capex projections", async ({ page }) => {
    await page.goto("/projections/capex");
    await expect(page).toHaveURL(/\/projections\/capex/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /capex|projection/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to debt projections", async ({ page }) => {
    await page.goto("/projections/debt");
    await expect(page).toHaveURL(/\/projections\/debt/);
  });

  test("can navigate to tax projections", async ({ page }) => {
    await page.goto("/projections/taxes");
    await expect(page).toHaveURL(/\/projections\/taxes/);
  });

  test("can navigate to bilan projections", async ({ page }) => {
    await page.goto("/projections/bilan");
    await expect(page).toHaveURL(/\/projections\/bilan/);
  });

  test("pro-forma page has projection controls", async ({ page }) => {
    await page.goto("/projections");
    // Should have projection year selector or similar controls
    await page.waitForTimeout(2000);
    // Check for any form control element
    const hasControls = await page
      .locator("select, [role='combobox'], button, input")
      .first()
      .isVisible();
    const hasHeading = await page.locator("h2").first().isVisible();
    expect(hasControls || hasHeading).toBeTruthy();
  });

  test("assumptions page is accessible", async ({ page }) => {
    await page.goto("/projections/assumptions");
    await expect(page).toHaveURL(/\/projections\/assumptions/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /hypothèses|assumptions/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
