import { test, expect } from "@playwright/test";

// Test user credentials (should match seed data)
const TEST_EMAIL = "playwright@modelisys.com";
const TEST_PASSWORD = "PlaywrightTest123";

test.describe("Evaluation Pages", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|financial-statements)/, { timeout: 10000 });
  });

  test("can navigate to business model evaluation", async ({ page }) => {
    await page.goto("/evaluation/business-model");
    await expect(page).toHaveURL(/\/evaluation\/business-model/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /modèle d'affaires|business model/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to EBITDA multiple evaluation", async ({ page }) => {
    await page.goto("/evaluation/ebitda-multiple");
    await expect(page).toHaveURL(/\/evaluation\/ebitda-multiple/);
    // Use heading selector or any visible content
    await expect(
      page.locator("h2").filter({ hasText: /baiia|ebitda|multiple/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to DCF evaluation", async ({ page }) => {
    await page.goto("/evaluation/dcf");
    await expect(page).toHaveURL(/\/evaluation\/dcf/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /dcf|actualisation|discounted/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to CCF evaluation", async ({ page }) => {
    await page.goto("/evaluation/ccf");
    await expect(page).toHaveURL(/\/evaluation\/ccf/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /ccf|capital cash flow/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to VCA evaluation", async ({ page }) => {
    await page.goto("/evaluation/vca");
    await expect(page).toHaveURL(/\/evaluation\/vca/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /vca|valeur comptable/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to net tangible assets evaluation", async ({ page }) => {
    await page.goto("/evaluation/net-tangible-assets");
    await expect(page).toHaveURL(/\/evaluation\/net-tangible-assets/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /actif corporel|tangible/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("evaluation pages show disclaimer if required", async ({ page }) => {
    await page.goto("/evaluation/dcf");
    // Some evaluation pages may show a disclaimer first - use first() to avoid strict mode
    const disclaimerOrContent = page
      .locator("text=Avertissement")
      .or(page.locator("h2").filter({ hasText: /dcf/i }));
    await expect(disclaimerOrContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("evaluation pages have entity selector", async ({ page }) => {
    await page.goto("/evaluation/ebitda-multiple");
    // Wait for page to load
    await page.waitForTimeout(2000);
    // Accept disclaimer if shown - use first() to handle multiple matches
    const acceptButton = page.getByRole("button", { name: /j'ai compris|accepte|continuer/i }).first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      await page.waitForTimeout(500);
    }
    // Should have entity selector - use first() to avoid strict mode
    await expect(
      page.locator("text=Entité").or(page.locator('[data-testid="entity-selector"]')).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
