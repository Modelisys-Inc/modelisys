import { test, expect } from "@playwright/test";

// Test user credentials (should match seed data)
const TEST_EMAIL = "playwright@modelisys.com";
const TEST_PASSWORD = "PlaywrightTest123";

test.describe("Analysis Pages", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|financial-statements)/, { timeout: 10000 });
  });

  test("can navigate to working capital analysis", async ({ page }) => {
    await page.goto("/analysis/working-capital");
    await expect(page).toHaveURL(/\/analysis\/working-capital/);
    await expect(
      page.locator("text=Fonds de roulement").or(page.locator("text=Working Capital"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to capex analysis", async ({ page }) => {
    await page.goto("/analysis/capex");
    await expect(page).toHaveURL(/\/analysis\/capex/);
    await expect(page.locator("text=Capex")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to ratios analysis", async ({ page }) => {
    await page.goto("/analysis/ratios");
    await expect(page).toHaveURL(/\/analysis\/ratios/);
    await expect(
      page.locator("text=Ratios").or(page.locator("text=ratios"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to product margin analysis", async ({ page }) => {
    await page.goto("/analysis/product-margin");
    await expect(page).toHaveURL(/\/analysis\/product-margin/);
    await expect(
      page.locator("text=Marge").or(page.locator("text=marge"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to revenue by customer analysis", async ({ page }) => {
    await page.goto("/analysis/revenue-by-customer");
    await expect(page).toHaveURL(/\/analysis\/revenue-by-customer/);
  });

  test("can navigate to purchases by supplier analysis", async ({ page }) => {
    await page.goto("/analysis/purchases-by-supplier");
    await expect(page).toHaveURL(/\/analysis\/purchases-by-supplier/);
  });

  test("analysis pages have entity selector", async ({ page }) => {
    await page.goto("/analysis/working-capital");
    // Should have entity selector
    await expect(
      page.locator("text=Entité").or(page.locator('[data-testid="entity-selector"]'))
    ).toBeVisible({ timeout: 10000 });
  });

  test("analysis pages have horizon selector", async ({ page }) => {
    await page.goto("/analysis/capex");
    // Should have horizon/period selector
    await expect(
      page.locator("text=Horizon").or(page.locator("text=Période"))
    ).toBeVisible({ timeout: 10000 });
  });
});
