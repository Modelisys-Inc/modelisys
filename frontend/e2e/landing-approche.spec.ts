import { test, expect } from "@playwright/test"

test.describe("Landing — approche et leviers de valeur", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
  })

  test("hero pose la promesse d'une gestion financière plus éclairée", async ({ page }) => {
    const hero = page.locator("#hero")
    await expect(
      hero.getByRole("heading", {
        name: /Pour une gestion financière plus éclairée/,
      }),
    ).toBeVisible()
    await expect(hero.getByText(/Obtenez une vision claire de la performance/)).toBeVisible()
    await expect(hero.getByRole("button", { name: "PRENDRE RENDEZ-VOUS" })).toBeVisible()
    await expect(hero.getByRole("button", { name: "Découvrir nos services" })).toBeVisible()
  })

  test("le menu latéral suit les sections de l'accueil", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Objectif", exact: true }).locator("visible=true")).toBeVisible()
    await expect(page.getByRole("link", { name: "Services", exact: true }).locator("visible=true")).toBeVisible()
    await expect(page.getByRole("link", { name: "Approche", exact: true }).locator("visible=true")).toBeVisible()
    await expect(page.getByRole("link", { name: "Expertise", exact: true }).locator("visible=true")).toBeVisible()
  })

  test("la bande défilante suit la hero, puis Notre objectif", async ({ page }) => {
    const marquee = page.getByLabel("Insights — performance, trésorerie et valeur")
    await expect(marquee).toBeVisible()
    await expect(marquee.getByText("La croissance ne garantit pas la rentabilité").first()).toBeVisible()
    await expect(page.locator("#insights")).toHaveCount(0)

    const order = await page.evaluate(() => {
      const hero = document.getElementById("hero")
      const band = document.querySelector("[aria-label='Insights — performance, trésorerie et valeur']")
      const objectif = document.getElementById("notre-objectif")
      return [hero, band, objectif].map((el) => (el ? el.getBoundingClientRect().top + window.scrollY : null))
    })
    expect(order.every((value) => value !== null)).toBe(true)
    expect(order[0]!).toBeLessThan(order[1]!)
    expect(order[1]!).toBeLessThan(order[2]!)
  })

  test("la page d'accueil ne montre pas le diagnostic financier", async ({ page }) => {
    await expect(page.locator("#rapport-annuel")).toHaveCount(0)
  })

  test("Notre objectif précède les services, puis L'approche Modelisys", async ({ page }) => {
    const order = await page.evaluate(() => {
      const ids = ["notre-objectif", "ce-que-nous-faisons", "approche-modelisys"]
      return ids.map((id) => {
        const el = document.getElementById(id)
        if (!el) return null
        const rect = el.getBoundingClientRect()
        return { id, top: rect.top + window.scrollY }
      })
    })

    expect(order.every(Boolean)).toBe(true)
    for (let i = 0; i < order.length - 1; i++) {
      expect(order[i]!.top).toBeLessThanOrEqual(order[i + 1]!.top + 1)
    }
  })

  test("la page d'accueil ne contient plus la section Nos services", async ({ page }) => {
    await expect(page.locator("#nos-services")).toHaveCount(0)
    await expect(
      page.getByRole("heading", { name: "Analyste financier fractionnaire" }),
    ).toHaveCount(0)
  })

  test("section Notre objectif affiche les questions de dirigeants", async ({ page }) => {
    const section = page.locator("#notre-objectif")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByText("Vision financière")).toBeVisible()
    await expect(
      section.getByRole("heading", {
        name: "Au-delà des chiffres, comprendre ce qui fait progresser votre entreprise.",
      }),
    ).toBeVisible()
    await expect(section.getByText("Les états financiers racontent une partie de l’histoire.")).toBeVisible()
    await expect(section.getByRole("heading", { name: "Rentabilité et performance" })).toBeVisible()
    await expect(section.getByRole("heading", { name: "Liquidités et financement" })).toBeVisible()
    await expect(section.getByRole("heading", { name: "Valeur et décisions stratégiques" })).toBeVisible()
  })

  test("section L'approche Modelisys précède le Blog", async ({ page }) => {
    const approcheBox = await page.locator("#approche-modelisys").boundingBox()
    const blogBox = await page.locator("#blog-vedette").boundingBox()

    expect(approcheBox).not.toBeNull()
    expect(blogBox).not.toBeNull()
    expect(approcheBox!.y).toBeLessThan(blogBox!.y)
  })

  test("section des deux services remplace le pont de valeur", async ({ page }) => {
    const section = page.locator("#ce-que-nous-faisons")
    await section.scrollIntoViewIfNeeded()

    await expect(page.locator("#rendement")).toHaveCount(0)
    await expect(
      section.getByRole("heading", {
        name: "Deux expertises. Un objectif : améliorer la performance de votre entreprise.",
      }),
    ).toBeVisible()
    await expect(section.getByRole("heading", { name: "Accompagnement financier fractionnaire" })).toBeVisible()
    await expect(section.getByRole("heading", { name: "Solutions Excel sur mesure" })).toBeVisible()
    await expect(section.getByText("Rencontres périodiques avec la direction.")).toBeVisible()
    await expect(section.getByText(/1 M\$ à 100 M\$ de revenus/)).toBeVisible()
    await expect(section.getByRole("link", { name: "Découvrir l’accompagnement financier" })).toBeVisible()
    await expect(section.getByRole("link", { name: "Découvrir les solutions Excel" })).toBeVisible()
  })

  test("section L'approche Modelisys décrit le fonctionnement des deux services", async ({ page }) => {
    const section = page.locator("#approche-modelisys")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByText("L'approche Modelisys")).toBeVisible()
    await expect(
      section.getByRole("heading", { name: "Une approche structurée, adaptée à votre entreprise." }),
    ).toBeVisible()
    await expect(section.getByRole("heading", { name: "Comprendre" })).toBeVisible()
    await expect(section.getByRole("heading", { name: "Planifier" })).toBeVisible()
    await expect(section.getByRole("heading", { name: "Exécuter" })).toBeVisible()
    await expect(section.getByRole("heading", { name: "Diagnostiquer" })).toHaveCount(0)
    await expect(section.getByRole("heading", { name: "Piloter" })).toHaveCount(0)
    await expect(section.getByText(/réalisées indépendamment/)).toBeVisible()
    await expect(section.locator("#phase-diagnostic")).toHaveCount(0)
    await expect(section.locator("#approche-faq")).toHaveCount(0)
  })

  test("Découvrir nos services mène vers les deux expertises", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Découvrir nos services" })).toBeVisible()
    await page.evaluate(() => {
      document.getElementById("ce-que-nous-faisons")?.scrollIntoView({ block: "start" })
    })
    await expect(
      page.getByRole("heading", {
        name: "Deux expertises. Un objectif : améliorer la performance de votre entreprise.",
      }),
    ).toBeVisible()
  })
})
