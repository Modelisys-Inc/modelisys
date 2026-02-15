import { test, expect } from "@playwright/test";

// Test user credentials (should match seed data)
const TEST_EMAIL = "playwright@modelisys.com";
const TEST_PASSWORD = "PlaywrightTest123";

test.describe("Financial Statements", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|financial-statements)/, { timeout: 10000 });
  });

  test("can navigate to income statement", async ({ page }) => {
    await page.goto("/financial-statements/income-statement");
    await expect(page).toHaveURL(/\/financial-statements\/income-statement/);
    // Check for key elements
    await expect(page.locator("text=État des résultats")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to balance sheet", async ({ page }) => {
    await page.goto("/financial-statements/balance-sheet");
    await expect(page).toHaveURL(/\/financial-statements\/balance-sheet/);
    await expect(page.locator("text=Bilan")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to cash flow", async ({ page }) => {
    await page.goto("/financial-statements/cash-flow");
    await expect(page).toHaveURL(/\/financial-statements\/cash-flow/);
    await expect(page.locator("text=Flux de trésorerie")).toBeVisible({ timeout: 10000 });
  });

  test("income statement shows company selector", async ({ page }) => {
    await page.goto("/financial-statements/income-statement");
    // Should have entity selector
    const entitySelector = page.locator('[data-testid="entity-selector"]').or(
      page.locator("text=Entité")
    );
    await expect(entitySelector.first()).toBeVisible({ timeout: 10000 });
  });

  test("income statement has period filters", async ({ page }) => {
    await page.goto("/financial-statements/income-statement");
    // Should have filter controls
    await expect(page.locator("text=Horizon").or(page.locator("text=Période"))).toBeVisible({ timeout: 10000 });
  });

  test("balance sheet displays data table", async ({ page }) => {
    await page.goto("/financial-statements/balance-sheet");
    // Wait for table to load
    await page.waitForSelector("table", { timeout: 15000 });
    const table = page.locator("table");
    await expect(table).toBeVisible();
  });

  test("can switch between summary and detail views", async ({ page }) => {
    await page.goto("/financial-statements/income-statement");
    // Look for view toggle buttons
    const summaryButton = page.locator("text=Sommaire").first();
    const detailButton = page.locator("text=Détail").first();

    if (await summaryButton.isVisible()) {
      await summaryButton.click();
      await page.waitForTimeout(500);
    }

    if (await detailButton.isVisible()) {
      await detailButton.click();
      await page.waitForTimeout(500);
    }
  });
});
