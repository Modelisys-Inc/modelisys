import { test, expect } from "@playwright/test"

test.describe("Navigation & Routing", () => {
  test("root path serves the marketing landing (no redirect)", async ({ page }) => {
    const res = await page.goto("/")
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(/\/$/)
    await expect(page).toHaveTitle(/Modelisys/i)
  })

  test("former portal routes redirect to the landing", async ({ page }) => {
    for (const route of ["/login", "/mon-portail"]) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/$/)
    }
  })

  test("nav has no Mon Portail link", async ({ page }) => {
    await page.goto("/")
    const nav = page.locator("nav").first()
    await expect(nav.getByRole("link", { name: "Mon Portail" })).toHaveCount(0)
  })

  test("à propos page is public and loads", async ({ page }) => {
    test.setTimeout(90_000)
    const res = await page.goto("/a-propos", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveURL(/\/a-propos$/)
    await expect(page).toHaveTitle(/À propos/i)
    await expect(
      page.getByRole("heading", { name: /Fondée et pratiquée au Québec/i }),
    ).toBeVisible()
    await expect(
      page.getByText(/améliorer la compréhension de la valeur auprès des propriétaires/i),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Tristan Bellerose, CPA, CBV" })).toBeVisible()
    await expect(page.getByRole("img", { name: /Tristan Bellerose/i })).toBeVisible()
    await expect(page.getByText("Charles-Étienne Parent-Roy, CPA")).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Études de cas" })).toHaveCount(0)
  })

  test("removed marketing pages redirect to the landing", async ({ page }) => {
    for (const route of [
      "/tarification",
      "/cabinets-comptables",
      "/partenaires-financiers",
      "/clause-de-non-responsabilite",
    ]) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/$/)
    }
  })
})
