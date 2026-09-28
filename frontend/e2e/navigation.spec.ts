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
      "/evaluation/adjusted-ebitda",
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

  test("à propos page is public and loads", async ({ page }) => {
    test.setTimeout(90_000)
    const res = await page.goto("/a-propos", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/a-propos$/);
    await expect(page).toHaveTitle(/À propos/i);
    await expect(
      page.getByRole("heading", { name: /Fondée et pratiquée au Québec/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/améliorer la compréhension de la valeur auprès des propriétaires/i),
    ).toBeVisible();
    await expect(page.getByText(/joignable et imputable/i)).toHaveCount(0);
    await expect(page.getByText("Charles-Étienne Parent-Roy, CPA")).toBeVisible();
    await expect(page.getByText("Alexandre Moreau")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Études de cas" })).toHaveCount(0);
  });

  test("tarification page is public and loads", async ({ page }) => {
    test.setTimeout(90_000)
    const res = await page.goto("/tarification", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/tarification$/);
    await expect(page).toHaveTitle(/Tarification/i);
    await expect(
      page.getByRole("heading", {
        name: /Trois volets, une proposition claire/i,
      }),
    ).toBeVisible();
  });
});
