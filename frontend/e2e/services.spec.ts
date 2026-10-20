import { test, expect } from "@playwright/test"

test.describe("Page Services", () => {
  test("les anciennes pages services redirigent vers l'accueil", async ({ page }) => {
    test.setTimeout(120000)
    for (const path of [
      "/services",
      "/services/licences",
      "/services/developpement-sur-mesure",
      "/services/accompagnement-financier",
      "/etudes-de-cas",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded", timeout: 90000 })
      await expect(page).toHaveURL("/")
      await expect(page.getByRole("link", { name: "Licence Modelisys" })).toHaveCount(0)
      await expect(page.getByRole("link", { name: "Développement sur mesure" })).toHaveCount(0)
    }
  })

  test("le menu ne propose plus Nos services", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const nav = page.locator("nav").first()
    await expect(nav.getByRole("link", { name: "Nos services", exact: true })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Tenue de livres" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Notre approche", exact: true })).toBeVisible()
  })

  test("le footer propose l'accompagnement financier fractionnaire", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const footer = page.locator("footer")
    await expect(footer.getByRole("heading", { name: "Notre service" })).toBeVisible({
      timeout: 30000,
    })
    await expect(footer.getByRole("heading", { name: "Nos services" })).toHaveCount(0)
    await expect(footer.getByRole("heading", { name: "Parcours" })).toHaveCount(0)
    await expect(footer.getByRole("link", { name: "Nos services", exact: true })).toHaveCount(0)
    await expect(footer.getByRole("link", { name: "Licence Modelisys" })).toHaveCount(0)
    await expect(footer.getByRole("link", { name: "Développement sur mesure" })).toHaveCount(0)
    await expect(footer.getByRole("link", { name: "Tenue de livres" })).toHaveCount(0)
    await expect(
      footer.getByRole("link", { name: "Accompagnement financier fractionnaire" }),
    ).toBeVisible()
    await expect(
      footer.getByRole("link", { name: "Accompagnement financier fractionnaire" }),
    ).toHaveAttribute("href", "/#approche-modelisys")
    await expect(footer.getByRole("heading", { name: "Entreprise" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Notre objectif" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Notre objectif" })).toHaveAttribute(
      "href",
      "/#notre-objectif",
    )
  })

  test("le menu Notre approche propose Comprendre, Planifier et Exécuter", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const nav = page.locator("nav").first()
    await nav.getByRole("link", { name: "Notre approche", exact: true }).hover()
    await expect(nav.getByRole("link", { name: "Comprendre" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Planifier" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Exécuter" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Diagnostic", exact: true })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Études de cas" })).toHaveCount(0)
  })
})
