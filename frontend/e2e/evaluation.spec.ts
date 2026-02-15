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
    await expect(
      page.locator("text=Modèle d'affaires").or(page.locator("text=Business Model"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to EBITDA multiple evaluation", async ({ page }) => {
    await page.goto("/evaluation/ebitda-multiple");
    await expect(page).toHaveURL(/\/evaluation\/ebitda-multiple/);
    await expect(
      page.locator("text=BAIIA").or(page.locator("text=EBITDA"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to DCF evaluation", async ({ page }) => {
    await page.goto("/evaluation/dcf");
    await expect(page).toHaveURL(/\/evaluation\/dcf/);
    await expect(page.locator("text=DCF")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to CCF evaluation", async ({ page }) => {
    await page.goto("/evaluation/ccf");
    await expect(page).toHaveURL(/\/evaluation\/ccf/);
    await expect(page.locator("text=CCF")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to VCA evaluation", async ({ page }) => {
    await page.goto("/evaluation/vca");
    await expect(page).toHaveURL(/\/evaluation\/vca/);
    await expect(page.locator("text=VCA")).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to net tangible assets evaluation", async ({ page }) => {
    await page.goto("/evaluation/net-tangible-assets");
    await expect(page).toHaveURL(/\/evaluation\/net-tangible-assets/);
    await expect(
      page.locator("text=Actif Corporel").or(page.locator("text=Tangible"))
    ).toBeVisible({ timeout: 10000 });
  });

  test("evaluation pages show disclaimer if required", async ({ page }) => {
    await page.goto("/evaluation/dcf");
    // Some evaluation pages may show a disclaimer first
    const disclaimerOrContent = page
      .locator("text=Avertissement")
      .or(page.locator("text=DCF"));
    await expect(disclaimerOrContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("evaluation pages have entity selector", async ({ page }) => {
    await page.goto("/evaluation/ebitda-multiple");
    // Wait for page to load
    await page.waitForTimeout(2000);
    // Accept disclaimer if shown
    const acceptButton = page.locator("text=J'accepte").or(page.locator("text=Continuer"));
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      await page.waitForTimeout(500);
    }
    // Should have entity selector
    await expect(
      page.locator("text=Entité").or(page.locator('[data-testid="entity-selector"]'))
    ).toBeVisible({ timeout: 10000 });
  });
});
