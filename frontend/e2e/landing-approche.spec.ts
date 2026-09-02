import { test, expect } from "@playwright/test"

test.describe("Landing — approche et leviers de valeur", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("hero affiche la carte des leviers de création de valeur", async ({ page }) => {
    const hero = page.locator("#hero")
    await expect(hero.getByText("Leviers de création de valeur")).toBeVisible()
    await expect(
      hero.getByText("La valeur de votre entreprise n'est pas qu'un chiffre."),
    ).toBeVisible()
    await expect(
      hero.getByText("Chaque décision financière a un impact sur la valeur."),
    ).toBeVisible()
    await expect(hero.getByRole("button", { name: /Croissance — levier de valeur/ })).toBeVisible()
    await expect(hero.getByRole("button", { name: /Risque — levier de valeur/ })).toBeVisible()
    await expect(hero.getByText("Croissance", { exact: true }).first()).toBeVisible()
    await expect(hero.getByText("Levier actif")).toBeVisible()
    await expect(hero.getByText("Améliore la valeur")).toBeVisible()
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

  test("section Pour qui précède le Blog", async ({ page }) => {
    const pourQuiBox = await page.locator("#pour-qui").boundingBox()
    const blogBox = await page.locator("#blog-vedette").boundingBox()

    expect(pourQuiBox).not.toBeNull()
    expect(blogBox).not.toBeNull()
    expect(pourQuiBox!.y).toBeLessThan(blogBox!.y)
  })

  test("section Rendement affiche le rendement actionnaire", async ({ page }) => {
    const section = page.locator("#rendement")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByRole("heading", { name: "Mesurez le rendement de votre entreprise" })).toBeVisible()
    await expect(
      section.getByText("Une entreprise n'est pas seulement une source de revenus.", { exact: true }),
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
    await expect(
      section.getByText(/Modelisys mesure le rendement généré par votre entreprise, année après année/),
    ).toBeVisible()
    await expect(section.getByText("+134 %", { exact: true }).first()).toBeVisible()
    await expect(section.getByText("+32,8 %").first()).toBeVisible()
  })

  test("section L'approche Modelisys contient les trois phases", async ({ page }) => {
    const section = page.locator("#approche-modelisys")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByText("L'approche Modelisys")).toBeVisible()
    await expect(section.getByRole("heading", { name: "Trois phases pour piloter la valeur de votre entreprise" })).toBeVisible()
    await expect(section.getByText("Phase 1 — Diagnostic")).toBeVisible()
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

  test("EN SAVOIR PLUS fait défiler vers la section approche", async ({ page }) => {
    await page.getByRole("button", { name: "EN SAVOIR PLUS" }).click()
    const section = page.locator("#approche-modelisys")
    await expect(section).toBeInViewport()
    await expect(section.getByText("Phase 1 — Diagnostic")).toBeVisible()
  })
})
