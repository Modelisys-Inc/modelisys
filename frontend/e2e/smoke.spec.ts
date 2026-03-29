import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Financial Dashboard|Modelisys/i);
    await expect(page.locator("body")).toBeVisible();
  });

  test("login page loads with correct elements", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    // Check for the Modelisys branding
    await expect(page.locator("h1")).toContainText("Modelisys");
    // Check for login form heading
    await expect(page.locator("text=Connexion")).toBeVisible();
  });

  test("login page has email and password fields", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("login page has submit button", async ({ page }) => {
    await page.goto("/login");
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText("Se connecter");
  });
});
