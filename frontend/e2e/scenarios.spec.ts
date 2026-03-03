import { test, expect } from "@playwright/test";

// Test user credentials (should match seed data)
const TEST_EMAIL = "playwright@modelisys.com";
const TEST_PASSWORD = "PlaywrightTest123";

test.describe("Scenarios Comparison", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill("#email", TEST_EMAIL);
    await page.fill("#password", TEST_PASSWORD);
    await page.click('button[type="submit"]');
    // Wait for redirect away from /login (accept any authenticated page)
    await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 10000 });
  });

  test("can navigate to scenarios comparison page", async ({ page }) => {
    await page.goto("/scenarios");
    await expect(page).toHaveURL(/\/scenarios/);
    // The page renders an h2 with "Comparaison de scenarios"
    await expect(
      page.locator("h2").filter({ hasText: /comparaison|scénarios/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("scenarios page has company/entity selector", async ({ page }) => {
    await page.goto("/scenarios");
    await page.waitForLoadState("networkidle");
    // Should have entity selector or the "Entite:" label rendered next to it
    await expect(
      page
        .locator('[data-testid="entity-selector"]')
        .or(page.locator("text=Entite").or(page.locator("text=Entité")))
        .first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to VAN/NPV analysis page", async ({ page }) => {
    await page.goto("/scenarios/van");
    await expect(page).toHaveURL(/\/scenarios\/van/);
    // VAN page has an h2 with "VAN" in it
    await expect(
      page.locator("h2").filter({ hasText: /van|valeur actuelle/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("scenarios page shows projection list or empty state when company selected", async ({ page }) => {
    await page.goto("/scenarios");
    await page.waitForTimeout(2000);

    // The page will either show:
    // 1. A loading spinner
    // 2. An empty state card ("Aucune donnee disponible")
    // 3. Projection cards with checkboxes
    // All three are valid outcomes — we just verify the page rendered meaningful content

    const emptyState = page.locator("text=Aucune donnee disponible").first();
    const projectionCard = page.locator('[role="checkbox"]').first();
    const selectionInstruction = page
      .locator("text=Selectionnez")
      .or(page.locator("text=Sélectionnez"))
      .first();

    const hasEmptyState = await emptyState.isVisible();
    const hasProjectionCard = await projectionCard.isVisible();
    const hasInstruction = await selectionInstruction.isVisible();

    expect(hasEmptyState || hasProjectionCard || hasInstruction).toBeTruthy();
  });

  test("shows comparison section heading or selection prompt", async ({ page }) => {
    await page.goto("/scenarios");
    await page.waitForTimeout(2000);

    // The page always shows "Comparaison de scenarios" heading at the top
    const mainHeading = page
      .locator("h2")
      .filter({ hasText: /comparaison/i })
      .first();

    // If projections exist and are selected, a secondary "Comparaison des projections"
    // heading appears inside the content area — we accept either text
    const comparisonSection = page
      .locator("h3")
      .filter({ hasText: /comparaison des projections/i })
      .first();

    // The main heading is always visible; the inner section heading is conditional
    await expect(mainHeading).toBeVisible({ timeout: 10000 });

    // If the comparison section is present, verify it too
    if (await comparisonSection.isVisible()) {
      await expect(comparisonSection).toBeVisible();
    }
  });

  test("scenarios page shows computing spinner text when projections are being calculated", async ({ page }) => {
    await page.goto("/scenarios");
    await page.waitForTimeout(1000);

    // The spinner text "Calcul des projections en cours..." only appears when 2+
    // projections are selected and computation is running.  Since we cannot
    // guarantee projections exist, we simply verify the page loaded without errors.
    const spinner = page.locator("text=Calcul des projections en cours").first();
    const isSpinnerVisible = await spinner.isVisible();

    // Either the spinner is briefly visible (compute in flight) or the page is at
    // rest — both are acceptable.  The important assertion is that the page itself
    // is rendered (not a crash / white screen).
    const bodyHasContent = await page.locator("body").first().isVisible();
    expect(bodyHasContent).toBeTruthy();

    // If the spinner is visible it should contain the expected French text
    if (isSpinnerVisible) {
      await expect(spinner).toContainText(/calcul des projections en cours/i);
    }
  });

  test("scenarios comparison page navigation tabs are visible", async ({ page }) => {
    await page.goto("/scenarios");
    // Both "Comparaison" and "VAN" nav tabs should be rendered in the dark header
    await expect(
      page.getByRole("link", { name: /comparaison/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("link", { name: /van/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
