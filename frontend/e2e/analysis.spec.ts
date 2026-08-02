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
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /fonds de roulement|working capital/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to capex analysis", async ({ page }) => {
    await page.goto("/analysis/capex");
    await expect(page).toHaveURL(/\/analysis\/capex/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /capex/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to ratios analysis", async ({ page }) => {
    await page.goto("/analysis/ratios");
    await expect(page).toHaveURL(/\/analysis\/ratios/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /ratios/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to product margin analysis", async ({ page }) => {
    await page.goto("/analysis/product-margin");
    await expect(page).toHaveURL(/\/analysis\/product-margin/);
    // Use heading selector for more specificity
    await expect(
      page.locator("h2").filter({ hasText: /marge/i }).first()
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
    await expect(
      page.locator("text=Entités").or(page.locator("text=Entité")).or(page.locator('[data-testid="entity-selector"]')).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("analysis pages have horizon selector", async ({ page }) => {
    await page.goto("/analysis/capex");
    // Should have horizon/period selector - use first() to avoid strict mode
    await expect(
      page.locator("text=Horizon").or(page.locator("text=Période")).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("capex page has dashboard and summary sections", async ({ page }) => {
    await page.goto("/analysis/capex");
    await expect(page.getByRole("button", { name: "Tableau de bord" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Sommaire" })).toBeVisible();
    await page.getByRole("button", { name: "Sommaire" }).click();
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "Paramètres" })).toBeVisible();
  });

  test("capex page shows reference date selector in header", async ({ page }) => {
    await page.goto("/analysis/capex");
    await expect(page.getByText("Date de référence")).toBeVisible({ timeout: 10000 });
  });
});
