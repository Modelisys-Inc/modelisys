import { test, expect } from "@playwright/test"

test.describe("Landing — approche et leviers de valeur", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("hero affiche la composition de valeur et les leviers", async ({ page }) => {
    const hero = page.locator("#hero")
    await expect(
      hero.getByRole("heading", {
        name: "La plateforme de gestion et de création de valeur pour les PME",
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

  test("section Rendement précède L'approche Modelisys", async ({ page }) => {
    const rendementBox = await page.locator("#rendement").boundingBox()
    const approcheBox = await page.locator("#approche-modelisys").boundingBox()

    expect(rendementBox).not.toBeNull()
    expect(approcheBox).not.toBeNull()
    expect(rendementBox!.y).toBeLessThan(approcheBox!.y)
  })

  test("section Fonctionnalités précède le Blog", async ({ page }) => {
    const featuresBox = await page.locator("#problem-solution").boundingBox()
    const blogBox = await page.locator("#blog-vedette").boundingBox()

    expect(featuresBox).not.toBeNull()
    expect(blogBox).not.toBeNull()
    expect(featuresBox!.y).toBeLessThan(blogBox!.y)
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

    await section.getByRole("tab", { name: "Projeté" }).click()
    await expect(section.getByText("Rendement projeté · 3 prochains ans")).toBeVisible()
    await expect(section.getByText("Valeur projetée")).toBeVisible()
    await expect(section.getByText(/ce que ça vous a rapporté/)).toBeVisible()
    await expect(section.getByText("+134 %", { exact: true }).first()).toBeVisible()
    await expect(section.getByText("+32,8 %").first()).toBeVisible()
  })

  test("section L'approche Modelisys contient les trois phases", async ({ page }) => {
    const section = page.locator("#approche-modelisys")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByText("L'approche Modelisys")).toBeVisible()
    await expect(
      section.getByRole("heading", { name: "Trois phases pour piloter la valeur de votre entreprise" }),
    ).toBeVisible()
    await expect(
      section.getByText(/Du diagnostic au suivi du réel/, { exact: false }),
    ).toBeVisible()
    await expect(section.locator("#phase-diagnostic")).toContainText("01")
    await expect(section.locator("#phase-diagnostic")).toContainText("Diagnostic")
    await expect(section.getByText("Ce que ça fait").first()).toBeVisible()
    await expect(section.getByText("Pourquoi c'est important").first()).toBeVisible()
    await expect(section.getByRole("button", { name: /01.*Diagnostic/ })).toBeVisible()
    await expect(section.locator("#phase-planification")).toBeAttached()
    await expect(section.locator("#phase-pilotage")).toBeAttached()
  })

  test("la section approche précède Fonctionnalités", async ({ page }) => {
    const approcheBox = await page.locator("#approche-modelisys").boundingBox()
    const featuresBox = await page.locator("#problem-solution").boundingBox()

    expect(approcheBox).not.toBeNull()
    expect(featuresBox).not.toBeNull()
    expect(approcheBox!.y).toBeLessThan(featuresBox!.y)
  })

  test("menu Fonctionnalités scroll vers la catégorie choisie", async ({ page }) => {
    await page.locator("#problem-solution").scrollIntoViewIfNeeded()
    const nav = page.getByRole("navigation", { name: "Catégories de fonctionnalités" })
    await nav.getByRole("tab", { name: "Reporting" }).click()

    await expect(page).toHaveURL(/#feature-reporting/)
    const reporting = page.locator("#feature-reporting")
    await expect(reporting).toBeInViewport()
    await expect(nav.getByRole("tab", { name: "Reporting" })).toHaveAttribute(
      "aria-selected",
      "true",
    )
  })

  test("lien header Fonctionnalités > Analyse scroll vers la section Analyse", async ({
    page,
  }) => {
    await page.goto("/#feature-analyse")
    const analyse = page.locator("#feature-analyse")
    await expect(analyse).toBeInViewport({ timeout: 10000 })
    await expect(page).toHaveURL(/#feature-analyse/)
  })

  test("EN SAVOIR PLUS fait défiler vers la section approche", async ({ page }) => {
    await page.getByRole("button", { name: "EN SAVOIR PLUS" }).click()
    const section = page.locator("#approche-modelisys")
    await expect(section).toBeInViewport()
    await expect(section.locator("#phase-diagnostic")).toContainText("Diagnostic")
  })
})
