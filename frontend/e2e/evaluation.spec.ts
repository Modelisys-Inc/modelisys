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
    await page.waitForURL(/\/(dashboard|financial-statements|mon-portail)/, { timeout: 15000 });
  });

  test("can navigate to valuation hub", async ({ page }) => {
    await page.goto("/evaluation");
    await expect(page).toHaveURL(/\/evaluation/);
    await expect(
      page.locator("h2").filter({ hasText: /^Valorisation$/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("new-valuation-button")).toBeVisible();
  });

  test("can navigate to business model evaluation", async ({ page }) => {
    await page.goto("/evaluation/business-model");
    await expect(page).toHaveURL(/\/evaluation\/business-model/);
    await expect(
      page.getByRole("heading", { name: /modèle d'affaires/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("business model has no entity selector", async ({ page }) => {
    await page.goto("/evaluation/business-model");
    await expect(
      page.getByRole("heading", { name: /modèle d'affaires/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Entité:", { exact: true })).toHaveCount(0);
    await expect(page.getByTestId("business-model-report")).toBeVisible();
    await expect(page.getByTestId("business-model-section-menu")).toBeVisible();
  });

  test("can navigate to adjusted EBITDA evaluation", async ({ page }) => {
    await page.goto("/evaluation/adjusted-ebitda");
    await expect(page).toHaveURL(/\/evaluation\/adjusted-ebitda/);
    const acceptButton = page.getByRole("button", { name: /j'ai compris|accepte|continuer/i }).first();
    if (await acceptButton.isVisible().catch(() => false)) {
      await acceptButton.click();
    }
    await expect(
      page.getByRole("heading", { name: /flux monétaires/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("adjusted-ebitda-report")).toBeVisible();
    await expect(page.getByTestId("adjusted-ebitda-section-menu")).toBeVisible();
    await expect(page.getByRole("button", { name: /4\. Flux caractéristiques/i })).toBeVisible();
    await expect(page.getByTestId("adjusted-ebitda-cash-flow-bridge")).toBeVisible();
    await expect(page.getByTestId("adjusted-ebitda-overview-cf-mid")).toBeVisible();
  });

  test("can navigate to EBITDA multiple evaluation", async ({ page }) => {
    await page.goto("/evaluation/ebitda-multiple");
    await expect(page).toHaveURL(/\/evaluation\/ebitda-multiple/);
    const acceptButton = page.getByRole("button", { name: /j'ai compris|accepte|continuer/i }).first();
    if (await acceptButton.isVisible().catch(() => false)) {
      await acceptButton.click();
    }
    await expect(
      page.getByRole("heading", { name: /capitalisation/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("ebitda multiple has no entity selector", async ({ page }) => {
    await page.goto("/evaluation/ebitda-multiple");
    const acceptButton = page.getByRole("button", { name: /j'ai compris|accepte|continuer/i }).first();
    if (await acceptButton.isVisible().catch(() => false)) {
      await acceptButton.click();
    }
    await expect(
      page.getByRole("heading", { name: /capitalisation/i }).first()
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("capitalisation-report")).toBeVisible();
    await expect(page.getByTestId("capitalisation-section-menu")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Détermination de la valeur d'entreprise/i })
    ).toBeVisible();
    await expect(page.getByTestId("capitalisation-determination-table")).toBeVisible();
    await expect(page.getByTestId("capitalisation-multiple-bridge")).toBeVisible();
    await expect(page.getByText("Entité:", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "CCF" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "VCA" })).toHaveCount(0);
  });

  test("can navigate to DCF evaluation", async ({ page }) => {
    await page.goto("/evaluation/dcf");
    await expect(page).toHaveURL(/\/evaluation\/dcf/);
    await expect(
      page.locator("h2").filter({ hasText: /dcf|actualisation|discounted/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("can navigate to net tangible assets evaluation", async ({ page }) => {
    await page.goto("/evaluation/net-tangible-assets");
    await expect(page).toHaveURL(/\/evaluation\/net-tangible-assets/);
    await expect(
      page.getByRole("heading", { name: /valeur comptable ajust/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("evaluation pages show disclaimer if required", async ({ page }) => {
    await page.goto("/evaluation/dcf");
    const disclaimerOrContent = page
      .locator("text=Avertissement")
      .or(page.locator("h2").filter({ hasText: /dcf/i }));
    await expect(disclaimerOrContent.first()).toBeVisible({ timeout: 10000 });
  });
});
