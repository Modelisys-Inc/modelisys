import { test, expect } from "@playwright/test"

test.describe("Études de cas — histoires résumées", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/etudes-de-cas", { waitUntil: "domcontentloaded", timeout: 90000 })
    await expect(page.locator("#etudes-de-cas")).toBeVisible({ timeout: 30000 })
  })

  test("page charge avec l’intro éditoriale et les onglets", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /Des histoires de valeur/i,
      }),
    ).toBeVisible()
    const nav = page.getByRole("navigation", { name: "Catégories d'études de cas" })
    await expect(nav.getByRole("tab", { name: "Services" })).toBeVisible()
    await expect(nav.getByRole("tab", { name: "Franchise" })).toBeVisible()
  })

  test("chaque étude suit Diagnostic / Planification / Pilotage", async ({ page }) => {
    const first = page.locator("#case-services")
    await expect(first.getByText("Diagnostic", { exact: true })).toBeVisible()
    await expect(first.getByText("Planification", { exact: true })).toBeVisible()
    await expect(first.getByText("Pilotage", { exact: true })).toBeVisible()
  })

  test("ancre #case-franchise active l’étude Franchise", async ({ page }) => {
    await page.goto("/etudes-de-cas#case-franchise", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    })
    await expect(page.locator("#case-franchise")).toBeVisible({ timeout: 30000 })
    await expect(
      page.locator("#etudes-de-cas").getByRole("tab", { name: "Franchise" }),
    ).toHaveAttribute("aria-selected", "true", { timeout: 15000 })
  })
})
