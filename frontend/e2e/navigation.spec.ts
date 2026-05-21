import { test, expect } from "@playwright/test";

test.describe("Navigation & Routing", () => {
  test("root path serves the marketing landing (no redirect)", async ({
    page,
  }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle(/Modelisys/i);
  });

  test("all protected analysis routes redirect to login", async ({
    page,
  }) => {
    const protectedRoutes = [
      "/analysis/working-capital",
      "/analysis/capex",
      "/analysis/seasonality",
      "/analysis/product-margin",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("all protected evaluation routes redirect to login", async ({
    page,
  }) => {
    const protectedRoutes = [
      "/evaluation/business-model",
      "/evaluation/ebitda-multiple",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("projection routes redirect to login", async ({ page }) => {
    await page.goto("/projections");
    await expect(page).toHaveURL(/\/login/);
  });

  test("settings routes redirect to login", async ({ page }) => {
    const protectedRoutes = [
      "/settings",
      "/settings/companies",
      "/settings/accounting-mapping",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("year-end-cpa route redirects to login", async ({ page }) => {
    await page.goto("/year-end-cpa");
    await expect(page).toHaveURL(/\/login/);
  });
});
