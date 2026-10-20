import { test, expect } from "@playwright/test"

test.describe("Landing — approche et leviers de valeur", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
  })

  test("hero affiche la composition de valeur et les leviers", async ({ page }) => {
    const hero = page.locator("#hero")
    await expect(
      hero.getByRole("heading", {
        name: "Gestion de la performance et création de valeur pour les PME",
      }),
    ).toBeVisible()
    await expect(hero.getByText("Valeur d'entreprise")).toBeVisible()
    await expect(hero.getByText("8,4")).toBeVisible()
    await expect(hero.getByRole("button", { name: "Croissance" })).toBeVisible()
    await expect(hero.getByRole("button", { name: "Risque" })).toBeVisible()
    await expect(
      hero.getByText("La croissance crée de la valeur seulement si le BAIIA suit."),
    ).toBeVisible()
  })

  test("bande Insights met en avant les leviers de valeur", async ({ page }) => {
    const marquee = page.getByLabel("Insights — leviers de création de valeur")
    await expect(marquee).toBeVisible()
    await expect(
      marquee.getByText("Combien vaut votre entreprise ? Et comment augmenter sa valeur ?").first(),
    ).toBeVisible()
    await expect(marquee.getByText(/Risque — multiple 4,5×/)).toBeVisible()
  })

  test("section Rendement précède Notre objectif, puis L'approche Modelisys", async ({ page }) => {
    const order = await page.evaluate(() => {
      const ids = ["rendement", "notre-objectif", "approche-modelisys"]
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

    await expect(section.getByText("Notre objectif")).toBeVisible()
    await expect(
      section.getByRole("heading", {
        name: "Vous aider à comprendre et à augmenter la valeur de votre entreprise",
      }),
    ).toBeVisible()
    await expect(
      section.getByText("Comprendre ce qui crée ou détruit de la valeur."),
    ).toBeVisible()
    await expect(section.getByLabel("Exemples de questions financières")).toBeVisible()
    await expect(section.getByText("Ce que les dirigeants nous demandent")).toBeVisible()
    await expect(section.getByText("Combien vaut mon entreprise ?").first()).toBeVisible()
    await expect(section.getByText("Lecture Modelisys")).toBeVisible()
    await expect(section.getByRole("button", { name: "Découvrir notre approche" })).toBeVisible()
  })

  test("section L'approche Modelisys précède le Blog", async ({ page }) => {
    const approcheBox = await page.locator("#approche-modelisys").boundingBox()
    const blogBox = await page.locator("#blog-vedette").boundingBox()

    expect(approcheBox).not.toBeNull()
    expect(blogBox).not.toBeNull()
    expect(approcheBox!.y).toBeLessThan(blogBox!.y)
  })

  test("section Rendement affiche le rendement actionnaire", async ({ page }) => {
    const section = page.locator("#rendement")
    await section.scrollIntoViewIfNeeded()

    await expect(
      section.getByRole("heading", { name: "Ce que l'entreprise vous rapporte vraiment" }),
    ).toBeVisible()
    await expect(
      section.getByText("En tant qu'actionnaire, votre rendement combine deux mouvements", {
        exact: false,
      }),
    ).toBeVisible()
    await expect(section.getByRole("heading", { name: "D'où vient votre rendement" })).toBeVisible()
    await expect(section.getByRole("tab", { name: "Réalisé" })).toBeVisible()
    await expect(section.getByRole("tab", { name: "Projeté" })).toBeVisible()
    await expect(section.getByText("Rendement réalisé · 3 derniers ans")).toBeVisible()
    await expect(section.getByText("Valeur il y a 3 ans")).toBeVisible()
    await expect(section.getByText("Croissance des revenus")).toBeVisible()
    await expect(section.getByText("Valeur aujourd'hui")).toBeVisible()
    await expect(section.getByText("+134 %", { exact: true }).first()).toBeVisible()
  })

  test("section L'approche Modelisys contient les trois phases", async ({ page }) => {
    const section = page.locator("#approche-modelisys")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByText("L'approche Modelisys")).toBeVisible()
    await expect(
      section.getByRole("heading", { name: "Comprendre → Planifier → Exécuter" }),
    ).toBeVisible()
    await expect(
      section.getByText(/Voici comment nous procédons/, { exact: false }),
    ).toBeVisible()
    await expect(section.locator("#phase-diagnostic")).toContainText("01")
    await expect(section.locator("#phase-diagnostic")).toContainText("Comprendre")
    await expect(section.getByText("Comment nous procédons").first()).toBeVisible()
    await expect(section.getByText("Pourquoi c'est important").first()).toBeVisible()
    await expect(section.getByRole("button", { name: /01.*Comprendre/ })).toBeVisible()
    await expect(section.locator("#phase-planification")).toBeAttached()
    await expect(section.locator("#phase-pilotage")).toBeAttached()
    await expect(section.getByText("Accompagnement financier fractionnaire")).toBeVisible()
    await expect(section.getByText(/sans embauche à temps plein/)).toBeVisible()

    const faq = section.locator("#approche-faq")
    await faq.scrollIntoViewIfNeeded()
    await expect(faq.getByText("Questions fréquentes")).toBeVisible()
    const question = faq.getByRole("button", {
      name: "Qu’est-ce qu’un accompagnement financier fractionnaire ?",
    })
    await question.click()
    await expect(faq.getByText(/comprendre, planifier, puis exécuter/)).toBeVisible()
  })

  test("EN SAVOIR PLUS mène vers l'approche Modelisys", async ({ page }) => {
    await expect(page.getByRole("button", { name: "EN SAVOIR PLUS" })).toBeVisible()
    await page.evaluate(() => {
      const el =
        document.getElementById("approche-modelisys-start") ??
        document.getElementById("approche-modelisys")
      el?.scrollIntoView({ block: "start" })
    })
    await expect(page.locator("#phase-diagnostic")).toContainText("Comprendre")
  })
})
