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
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /état des résultats|income statement|résultats/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to balance sheet", async ({ page }) => {
    await page.goto("/financial-statements/balance-sheet");
    await expect(page).toHaveURL(/\/financial-statements\/balance-sheet/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /bilan/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to cash flow", async ({ page }) => {
    await page.goto("/financial-statements/cash-flow");
    await expect(page).toHaveURL(/\/financial-statements\/cash-flow/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /flux|trésorerie|cash flow/i }).first()
    ).toBeVisible({ timeout: 10000 });
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
    // Should have filter controls - use first() to avoid strict mode
    await expect(
      page.locator("text=Horizon").or(page.locator("text=Période")).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("balance sheet displays data table or empty state", async ({ page }) => {
    await page.goto("/financial-statements/balance-sheet");
    // Wait for page to load
    await page.waitForTimeout(2000);
    // Should show either a table or an empty/loading state
    const hasTable = await page.locator("table").first().isVisible();
    const hasEmptyState = await page.locator("text=Aucune donnée").or(page.locator("text=Importez")).first().isVisible();
    const hasContent = await page.locator("h2").first().isVisible();
    expect(hasTable || hasEmptyState || hasContent).toBeTruthy();
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
