import { test, expect } from "@playwright/test";

// Test user credentials (should match seed data)
const TEST_EMAIL = "playwright@modelisys.com";
const TEST_PASSWORD = "PlaywrightTest123";

test.describe("Company Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|financial-statements)/, { timeout: 10000 });
  });

  test("can navigate to company settings", async ({ page }) => {
    await page.goto("/settings/companies");
    await expect(page).toHaveURL(/\/settings\/companies/);
    // Should show companies list or add company button
    await expect(
      page.locator("text=Sociétés").or(page.locator("text=Ajouter une société"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("company settings shows existing companies", async ({ page }) => {
    await page.goto("/settings/companies");
    // Wait for data to load
    await page.waitForTimeout(2000);
    // Should either show companies or an empty state
    const hasCompanies = await page.locator("table").isVisible();
    const hasEmptyState = await page
      .locator("text=Aucune société")
      .or(page.locator("text=Créer votre première société"))
      .isVisible();
    expect(hasCompanies || hasEmptyState).toBeTruthy();
  });

  test("can navigate to account mapping page", async ({ page }) => {
    await page.goto("/settings/accounting-mapping");
    await expect(page).toHaveURL(/\/settings\/accounting-mapping/);
    await expect(page.locator("text=Mapping")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to trial balance page", async ({ page }) => {
    // First go to company settings to get a company ID
    await page.goto("/settings/companies");
    await page.waitForTimeout(2000);

    // Try to click on first company if available
    const companyRow = page.locator("table tbody tr").first();
    if (await companyRow.isVisible()) {
      await companyRow.click();
      await page.waitForTimeout(1000);

      // Try to navigate to trial balance
      const trialBalanceLink = page.locator("text=Balance de vérification");
      if (await trialBalanceLink.isVisible()) {
        await trialBalanceLink.click();
        await expect(page).toHaveURL(/\/trial-balance/);
      }
    }
  });

  test("settings page has navigation links", async ({ page }) => {
    await page.goto("/settings");
    // Should show settings navigation
    await expect(
      page.locator("text=Sociétés").or(page.locator("text=Paramètres"))
    ).toBeVisible({ timeout: 10000 });
  });
});
