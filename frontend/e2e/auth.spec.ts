import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("unauthenticated user is redirected to login from protected routes", async ({
    page,
  }) => {
    // Try accessing a protected route without auth
    await page.goto("/dashboard");
    // Should be redirected to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from settings", async ({
    page,
  }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user is redirected from financial-statements", async ({
    page,
  }) => {
    await page.goto("/financial-statements/income-statement");
    await expect(page).toHaveURL(/\/login/);
  });

  test("public routes are accessible without auth", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);
    // Should NOT redirect away from login
    await expect(page.locator("text=Connexion")).toBeVisible();
  });

  test("landing page is accessible without auth", async ({ page }) => {
    await page.goto("/");
    // Should stay on root, not redirect to login
    await expect(page).toHaveURL(/\/$/);

  });

  test("login form shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    // Fill in invalid credentials
    await page.fill("#email", "invalid@test.com");
    await page.fill("#password", "wrongpassword");
    // Submit the form
    await page.click('button[type="submit"]');
    // Should show an error message (either server error or connection error)
    const errorMessage = page.locator(
      ".bg-red-50, [class*='error'], [class*='red']"
    );
    await expect(errorMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test("login form can be filled and submitted", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "test@test.com");
    await page.fill("#password", "password");

    const button = page.locator('button[type="submit"]');
    await expect(button).toBeEnabled();
    // Submit the form
    await page.click('button[type="submit"]');
    // After submit, either an error appears or the page transitions
    const errorOrTransition = page.locator(".bg-red-50").or(page.locator("text=Connexion..."));
    await expect(errorOrTransition.first()).toBeVisible({ timeout: 10000 });
  });

  test("login page has remember me checkbox", async ({ page }) => {
    await page.goto("/login");
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).toBeVisible();
    await expect(
      page.locator("text=Se souvenir de moi")
    ).toBeVisible();
  });

  test("login page has forgot password link", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.locator("text=Mot de passe oublié")
    ).toBeVisible();
  });

  test("login page has link back to landing", async ({ page }) => {
    await page.goto("/login");
    const backLink = page.locator("text=Retour à l'accueil");
    await expect(backLink).toBeVisible();
  });

  test("login page has contact us link", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Contactez-nous")).toBeVisible();
  });
});
