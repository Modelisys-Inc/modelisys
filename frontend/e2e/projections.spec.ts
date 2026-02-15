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
    await page.goto("/projections/pro-forma");
    await expect(page).toHaveURL(/\/projections\/pro-forma/);
    await expect(
      page.locator("text=Pro Forma").or(page.locator("text=Projections"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to revenue projections", async ({ page }) => {
    await page.goto("/projections/revenue");
    await expect(page).toHaveURL(/\/projections\/revenue/);
  });

  test("can navigate to capex projections", async ({ page }) => {
    await page.goto("/projections/capex");
    await expect(page).toHaveURL(/\/projections\/capex/);
    await expect(
      page.locator("text=Capex").or(page.locator("text=Projection"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to debt projections", async ({ page }) => {
    await page.goto("/projections/debt");
    await expect(page).toHaveURL(/\/projections\/debt/);
  });

  test("pro-forma page has projection controls", async ({ page }) => {
    await page.goto("/projections/pro-forma");
    // Should have projection year selector or similar controls
    await page.waitForTimeout(2000);
    const hasControls = await page
      .locator("select")
      .or(page.locator('[role="combobox"]'))
      .first()
      .isVisible();
    expect(hasControls).toBeTruthy();
  });

  test("assumptions page is accessible", async ({ page }) => {
    await page.goto("/projections/assumptions");
    await expect(page).toHaveURL(/\/projections\/assumptions/);
    await expect(
      page.locator("text=Hypothèses").or(page.locator("text=Assumptions"))
    ).toBeVisible({ timeout: 10000 });
  });
});
