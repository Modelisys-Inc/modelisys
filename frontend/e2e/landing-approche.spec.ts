import { test, expect } from "@playwright/test"

test.describe("Landing — approche et leviers de valeur", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
  })

  test("hero affiche la composition de valeur et les leviers", async ({ page }) => {
    const hero = page.locator("#hero")
    await expect(
      hero.getByRole("heading", {
        name: "Firme de gestion et de création de valeur pour les PME",
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

  test("section Rendement précède Notre objectif, puis Nos services, puis L'approche Modelisys", async ({
    page,
  }) => {
    const rendementBox = await page.locator("#rendement").boundingBox()
    const objectifBox = await page.locator("#notre-objectif").boundingBox()
    const servicesBox = await page.locator("#nos-services").boundingBox()
    const approcheBox = await page.locator("#approche-modelisys").boundingBox()

    expect(rendementBox).not.toBeNull()
    expect(objectifBox).not.toBeNull()
    expect(servicesBox).not.toBeNull()
    expect(approcheBox).not.toBeNull()
    expect(rendementBox!.y).toBeLessThan(objectifBox!.y)
    expect(objectifBox!.y).toBeLessThan(servicesBox!.y)
    expect(servicesBox!.y).toBeLessThan(approcheBox!.y)
  })

  test("section Nos services présente Mandats, Accompagnement, Licence et Développement", async ({
    page,
  }) => {
    const section = page.locator("#nos-services")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByText("Nos services", { exact: true })).toBeVisible()
    await expect(
      section.getByRole("heading", { name: "Le bon niveau d'intervention, au bon moment" }),
    ).toBeVisible()
    await expect(section.getByText("Aperçu — Mise en place")).toHaveCount(0)
    await expect(section.getByRole("button", { name: /Mandats ponctuels/ }).first()).toBeVisible()
    await expect(
      section.getByRole("button", { name: /Accompagnement financier/ }).first(),
    ).toBeVisible()
    await expect(section.getByRole("button", { name: /Licence/ }).first()).toBeVisible()
    await expect(section.getByRole("button", { name: /Développement/ }).first()).toBeVisible()
    await expect(section.getByText("Une question précise. Une analyse solide.")).toBeVisible()
    await expect(section.getByText("Un partenaire financier à temps partiel")).toBeVisible()
    await expect(section.getByText("Le moteur Excel Modelisys", { exact: true })).toBeVisible()
    await expect(
      section.getByText("Votre réalité ne correspond pas à un modèle standard ?"),
    ).toBeVisible()
    await expect(section.getByRole("tab")).toHaveCount(0)
    await expect(
      section.getByRole("link", { name: "Découvrir" }).nth(0),
    ).toHaveAttribute("href", "/services/mandats-ponctuels")
    await expect(
      section.getByRole("link", { name: "Découvrir" }).nth(1),
    ).toHaveAttribute("href", "/services/accompagnement-financier")
    await expect(
      section.getByRole("link", { name: "Découvrir" }).nth(2),
    ).toHaveAttribute("href", "/services/licences")
    await expect(
      section.getByRole("link", { name: "Découvrir" }).nth(3),
    ).toHaveAttribute("href", "/services/developpement-sur-mesure")
    await expect(
      section.getByRole("heading", { name: "Une approche qui s'adapte à votre entreprise" }),
    ).toHaveCount(0)
    await expect(section.getByRole("link", { name: /VOIR LE DÉTAIL DES SERVICES/i })).toHaveCount(0)
  })

  test("section Notre objectif affiche les questions de dirigeants", async ({ page }) => {
    const section = page.locator("#notre-objectif")
    await section.scrollIntoViewIfNeeded()

    await expect(section.getByText("Notre objectif")).toBeVisible()
    await expect(
      section.getByRole("heading", {
        name: "Transformer les chiffres en décisions qui créent de la valeur",
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

    await section.getByRole("tab", { name: "Projeté" }).click()
    await expect(section.getByText("Rendement projeté · 3 prochains ans")).toBeVisible()
    await expect(section.getByText("Valeur projetée").first()).toBeVisible()
    await expect(section.getByText(/ce que ça vous a rapporté/)).toBeVisible()
    await expect(section.getByText("+134 %", { exact: true }).first()).toBeVisible()
    await expect(section.getByText("+32,8 %").first()).toBeVisible()
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
  })

  test("EN SAVOIR PLUS fait défiler vers la section approche", async ({ page }) => {
    await page.getByRole("button", { name: "EN SAVOIR PLUS" }).click()
    const section = page.locator("#approche-modelisys")
    await expect(section).toBeInViewport()
    await expect(section.locator("#phase-diagnostic")).toContainText("Comprendre")
  })
})
