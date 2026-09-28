import { test, expect } from "@playwright/test"

test.describe("Page Services", () => {
  test("affiche les trois piliers", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/services", { waitUntil: "domcontentloaded", timeout: 90000 })

    await expect(
      page.getByRole("heading", {
        name: /Des services financiers conçus pour comprendre votre entreprise/,
      }),
    ).toBeVisible({ timeout: 30000 })

    await expect(page.getByRole("link", { name: "Mandats ponctuels" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Accompagnement financier" }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: "Licence Modelisys" }).first()).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Développement sur mesure" }).first(),
    ).toBeVisible()

    await expect(page.locator("#services-accompagnement")).toContainText(
      "accompagnement financier innovant",
    )
    await expect(page.locator("#services-accompagnement")).toContainText(
      "optimisation du rendement",
    )
    await expect(page.getByText(/relais senior/i)).toHaveCount(0)
    await expect(page.locator("#services-licence")).toContainText("Le moteur Excel Modelisys")
    await expect(page.locator("#services-licence")).toContainText("Groupe de 6 entités")
    await expect(page.locator("#services-developpement")).toContainText("Adapter")
    await expect(page.locator("#services-developpement")).toContainText(
      "Automatisation d’un processus financier existant",
    )

    await expect(
      page.getByRole("heading", { name: "Une intervention adaptée à votre situation" }),
    ).toBeVisible()
  })

  test("page Accompagnement financier", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/services/accompagnement-financier", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    })
    await expect(
      page.getByRole("heading", { name: /accompagnement financier innovant/i }),
    ).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/optimisation du rendement/i)).toBeVisible()
    await expect(page.getByText(/relais senior/i)).toHaveCount(0)
    await expect(page.locator("#accompagnement-tenue")).toContainText("Tenue de livres")
    await expect(page.locator("#accompagnement-controle")).toContainText("Contrôle financier")
    await expect(page.locator("#accompagnement-performance")).toContainText(
      "Revue de la performance",
    )
    await expect(page.locator("#accompagnement-projections")).toContainText(
      "Projections financières",
    )
    await expect(page.locator("#accompagnement-valorisation")).toContainText("Valorisation")
    const cases = page.getByRole("region", { name: "Cas — Accompagnement" })
    const caseTabs = page.getByRole("tablist", { name: "Cas d’accompagnement" })
    await expect(caseTabs).toHaveAttribute("data-ready", "true", { timeout: 15000 })
    await expect(caseTabs.getByRole("tab", { name: "Tenue de livres" })).toBeVisible()
    await expect(caseTabs.getByRole("tab", { name: "Performance" })).toBeVisible()
    await expect(caseTabs.getByRole("tab", { name: "Projections" })).toBeVisible()
    await expect(caseTabs.getByRole("tab", { name: "Valorisation" })).toBeVisible()
    await expect(cases.getByText("Cas · Accompagnement")).toHaveCount(1)
    await expect(page.getByText(/livres à l.heure/)).toBeVisible()

    await page.getByTestId("accompagnement-cas-projections").click()
    await expect(page.getByTestId("accompagnement-cas-projections")).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(
      cases.getByRole("heading", { name: /corriger avant la crise de cash/i }),
    ).toBeVisible()

    await page.getByTestId("accompagnement-cas-valorisation").click()
    await expect(page.getByTestId("accompagnement-cas-valorisation")).toHaveAttribute(
      "aria-selected",
      "true",
    )
    await expect(
      cases.getByRole("heading", { name: /écart mensuel au rendement cible/i }),
    ).toBeVisible()
    const faq = page.getByTestId("services-faq")
    await expect(faq.getByText("Questions fréquentes")).toBeVisible()
    await expect(faq.getByRole("button")).toHaveCount(6)
    await faq.getByRole("button", { name: /accompagnement financier est-il innovant/i }).click()
    await expect(faq.getByText(/augmenter la valeur de l.entreprise/i)).toBeVisible()
    await expect(
      faq.getByRole("button", { name: /Quels sont les livrables/i }),
    ).toBeVisible()
    await faq.getByRole("button", { name: /Quels sont les livrables/i }).click()
    await expect(faq.getByText(/rapports de performance/i)).toBeVisible()
    await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveCount(0)
  })

  test("sous-pages Licence et Développement", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/services/licences", { waitUntil: "domcontentloaded", timeout: 90000 })
    await expect(page.getByRole("heading", { name: /moteur Excel Modelisys/i })).toBeVisible({
      timeout: 30000,
    })
    const licenceTabs = page.getByRole("tablist", { name: "Cas — Licence Modelisys" })
    await expect(licenceTabs).toHaveAttribute("data-ready", "true", { timeout: 15000 })
    await expect(licenceTabs.getByRole("tab", { name: "Multi-entités" })).toBeVisible()
    await expect(licenceTabs.getByRole("tab", { name: "Autonomie" })).toBeVisible()
    await expect(licenceTabs.getByRole("tab", { name: "Valorisation" })).toBeVisible()
    await expect(page.getByText("Groupe de 6 entités")).toBeVisible()

    await page.getByTestId("licence-cas-autonomie").click()
    await expect(page.getByRole("heading", { name: /rythme mensuel/i })).toBeVisible()

    await page.getByTestId("licence-cas-valorisation").click()
    await expect(page.getByRole("heading", { name: /Relier le moteur à la valeur/i })).toBeVisible()
    const licenceFaq = page.getByTestId("services-faq")
    await expect(licenceFaq.getByText("Questions fréquentes")).toBeVisible()
    await expect(licenceFaq.getByRole("button")).toHaveCount(6)
    await licenceFaq.getByRole("button", { name: /Qu.est-ce que la licence Modelisys/i }).click()
    await expect(licenceFaq.getByText(/moteur Excel configuré/i)).toBeVisible()
    await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveCount(0)

    await page.goto("/services/developpement-sur-mesure", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    })
    await expect(page.getByRole("heading", { name: /modèle standard/i })).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByText("Quand le sur-mesure s’impose")).toBeVisible()
    await expect(page.getByText("Exemples de développements")).toHaveCount(0)
    await expect(page.getByText("Développement d’un tableau de bord")).toBeVisible()
    await expect(page.getByText("Développement d’un processus de coût de revient")).toBeVisible()
    await expect(
      page.getByText("Développement d’un outil de simulation et de scénarios"),
    ).toBeVisible()
    await expect(page.getByText("Idéal pour")).toBeVisible()
    await expect(page.getByText(/licence pose le moteur/i)).toBeVisible()
    await expect(page.getByText("Adapter", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Développer", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Étendre", { exact: true }).first()).toBeVisible()
    const devTabs = page.getByRole("tablist", { name: "Cas — Développement sur mesure" })
    await expect(devTabs).toHaveAttribute("data-ready", "true", { timeout: 15000 })
    await expect(page.getByText("Automatisation d’un processus financier existant")).toBeVisible()
    await page.getByTestId("developpement-cas-analyse").click()
    await expect(page.getByRole("heading", { name: /analyse spécifique/i })).toBeVisible()
    const devFaq = page.getByTestId("services-faq")
    await expect(devFaq.getByText("Questions fréquentes")).toBeVisible()
    await expect(devFaq.getByRole("button")).toHaveCount(6)
    await devFaq.getByRole("button", { name: /tableau de bord/i }).click()
    await expect(devFaq.getByText(/indicateurs, leviers/i)).toBeVisible()
    await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveCount(0)
  })

  test("le menu Nos services mène à /services", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    await page.locator("nav").locator("a[href='/services']").first().click()
    await expect(page).toHaveURL(/\/services/, { timeout: 15000 })
  })

  test("le menu Nos services propose les trois offres", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const nav = page.locator("nav").first()
    await nav.getByRole("link", { name: "Nos services", exact: true }).hover()
    await expect(nav.getByRole("link", { name: "Mandats ponctuels" })).toHaveCount(0)
    await expect(nav.getByRole("link", { name: "Accompagnement financier" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Licence Modelisys", exact: true })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Développement sur mesure" })).toBeVisible()
    await nav.getByRole("link", { name: "Accompagnement financier" }).click()
    await expect(page).toHaveURL(/\/services\/accompagnement-financier/, { timeout: 15000 })
  })

  test("le footer liste les trois offres sous Nos services", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const footer = page.locator("footer")
    await expect(footer.getByRole("heading", { name: "Nos services" })).toBeVisible({
      timeout: 30000,
    })
    await expect(footer.getByRole("heading", { name: "Parcours" })).toHaveCount(0)
    await expect(footer.getByRole("link", { name: "Nos services", exact: true })).toHaveCount(0)
    await expect(footer.getByRole("link", { name: "Accompagnement financier" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Licence Modelisys", exact: true })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Développement sur mesure" })).toBeVisible()
    await expect(footer.getByRole("link", { name: "Accompagnement financier" })).toHaveAttribute(
      "href",
      "/services/accompagnement-financier",
    )
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
