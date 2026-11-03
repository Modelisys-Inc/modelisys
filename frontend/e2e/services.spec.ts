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

  test("le menu Nos services propose l'accompagnement et les solutions Excel", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const nav = page.locator("nav").first()
    const services = nav.getByRole("button", { name: "Nos services", exact: true })
    await expect(services).toBeVisible()
    await services.hover()
    await expect(nav.getByRole("link", { name: "Accompagnement financier fractionnaire" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Accompagnement financier fractionnaire" })).toHaveAttribute(
      "href",
      "/accompagnement-financier",
    )
    const excel = nav.getByRole("link", { name: "Solutions Excel" })
    await expect(excel).toBeVisible()
    await expect(excel).toHaveAttribute("href", "/solutions-excel")
    await expect(nav.getByRole("link", { name: "Tenue de livres" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Notre approche", exact: true })).toBeVisible()
  })

  test("la page Accompagnement financier reprend les sections de l'accueil", async ({ page }) => {
    test.setTimeout(120000)
    const res = await page.goto("/accompagnement-financier", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/Accompagnement financier fractionnaire/i)
    await expect(
      page.getByRole("heading", { name: "Gestion de la performance et création de valeur pour les PME" }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Pont de valeur", exact: true })).toBeVisible()
    await expect(page.locator("#rendement")).toBeVisible()
    await expect(page.locator("#notre-objectif")).toBeVisible()
    await expect(page.locator("#approche-modelisys")).toBeVisible()
    await expect(page.locator("#rapport-annuel")).toBeVisible()
  })

  test("la page Solutions Excel présente l'offre", async ({ page }) => {
    test.setTimeout(120000)
    const res = await page.goto("/solutions-excel", { waitUntil: "domcontentloaded", timeout: 90000 })
    expect(res?.status()).toBe(200)
    await expect(page).toHaveTitle(/Solutions Excel/i)
    await expect(
      page.getByRole("heading", { name: "Des outils Excel conçus autour de votre réalité d’affaires." }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Multiples fichiers à gérer" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Tableaux de bord et analyse" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Automatisation", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Télécharger la démonstration (.xlsx)" })).toHaveCount(0)
    await expect(page.getByRole("heading", { name: "Trois démonstrations, avec des données fictives." })).toHaveCount(0)
    await expect(page.getByText(/sur devis/i).first()).toBeVisible()
    await expect(page.getByRole("link", { name: "Discuter de votre projet" }).first()).toHaveAttribute(
      "href",
      "/#demo",
    )
  })

  test("le footer propose l'accompagnement financier fractionnaire", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const footer = page.locator("footer")
    await expect(footer.getByRole("heading", { name: "Nos services" })).toBeVisible({
      timeout: 30000,
    })
    await expect(footer.getByRole("heading", { name: "Notre service" })).toHaveCount(0)
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
    ).toHaveAttribute("href", "/accompagnement-financier")
    await expect(footer.getByRole("link", { name: "Solutions Excel" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Solutions Excel" })).toHaveAttribute(
      "href",
      "/solutions-excel",
    )
    await expect(footer.getByRole("link", { name: "Tarification" })).toHaveAttribute(
      "href",
      "/tarification",
    )
    await expect(footer.getByRole("link", { name: "Diagnostic financier et planification" })).toHaveCount(0)
    await expect(footer.getByRole("heading", { name: "Entreprise" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Notre objectif" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Notre objectif" })).toHaveAttribute(
      "href",
      "/#notre-objectif",
    )
  })

  test("Notre approche suit Nos services, sans sous-menu", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const nav = page.locator("nav").first()
    const objectif = nav.getByRole("link", { name: "Notre objectif", exact: true })
    const services = nav.getByRole("button", { name: "Nos services", exact: true })
    const approche = nav.getByRole("link", { name: "Notre approche", exact: true })
    await expect(objectif).toBeVisible()
    await expect(approche).toBeVisible()
    await expect(approche).toHaveAttribute("href", "/#approche-modelisys")
    const objectifBox = await objectif.boundingBox()
    const servicesBox = await services.boundingBox()
    const approcheBox = await approche.boundingBox()
    expect(objectifBox?.x).toBeLessThan(servicesBox?.x ?? 0)
    expect(servicesBox?.x).toBeLessThan(approcheBox?.x ?? 0)
    await approche.hover()
    await expect(nav.getByRole("link", { name: "Comprendre" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Planifier" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Exécuter" })).toHaveCount(0)
  })
})
