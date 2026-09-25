import { test, expect } from "@playwright/test"

test.describe("Page Services", () => {
  test("affiche les quatre piliers", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/services", { waitUntil: "domcontentloaded", timeout: 90000 })

    await expect(
      page.getByRole("heading", {
        name: /Des services financiers conçus pour comprendre votre entreprise/,
      }),
    ).toBeVisible({ timeout: 30000 })

    await expect(page.getByRole("link", { name: "Mandats ponctuels" }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: "Accompagnement financier" }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: "Licence" }).first()).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Développement sur mesure" }).first(),
    ).toBeVisible()

    await expect(page.locator("#services-mandats")).toContainText("Diagnostic")
    await expect(page.locator("#services-mandats")).toContainText("Valorisation")
    await expect(page.locator("#services-accompagnement")).toContainText(
      "partenaire financier à temps partiel",
    )
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

  test("page Mandats ponctuels : trois lignes et un cas par ligne", async ({ page }) => {
    await page.goto("/services/mandats-ponctuels", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    })
    await expect(
      page.getByRole("heading", { name: /Une question précise\. Une analyse solide/i }),
    ).toBeVisible({ timeout: 30000 })

    const nav = page.getByRole("navigation", { name: "Lignes de mandats ponctuels" })
    await expect(nav.getByRole("tab", { name: "Diagnostic" })).toBeVisible()
    await expect(nav.getByRole("tab", { name: "Projections" })).toBeVisible()
    await expect(nav.getByRole("tab", { name: "Valorisation" })).toBeVisible()
    await expect(nav.getByRole("tab", { name: "Accompagnement" })).toHaveCount(0)

    for (const id of ["diagnostic", "projections", "valorisation"]) {
      const section = page.locator(`#conseils-${id}`)
      await expect(section).toBeVisible()
      await expect(section.getByText(new RegExp(`Cas · `, "i")).first()).toBeVisible()
      await expect(section.getByText("Situation", { exact: true })).toBeVisible()
      await expect(section.getByText("Intervention", { exact: true })).toBeVisible()
      await expect(section.getByText("Résultat", { exact: true })).toBeVisible()
    }

    await expect(page.locator("#conseils-diagnostic")).toContainText("Cas · Diagnostic")
    await expect(page.locator("#conseils-projections")).toContainText("Cas · Projections")
    await expect(page.locator("#conseils-valorisation")).toContainText("Cas · Valorisation")
    await expect(page.locator("#conseils-valorisation")).toContainText("Exemples")
    await expect(page.locator("#conseils-valorisation")).toContainText(
      "Établir une valeur à des fins de gestion",
    )
    await expect(page.locator("#conseils-valorisation")).toContainText(
      "Analyse des principaux risques du modèle d’affaires",
    )
    await expect(page.locator("#conseils-valorisation")).toContainText("Projection de la valeur")
    await expect(page.locator("#conseils-valorisation")).toContainText("Rendement cible")

    await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveCount(0)

    const others = page.getByRole("region", { name: "Autres services" })
    await expect(others).toBeVisible()
    await expect(others.getByRole("link", { name: /Accompagnement financier/ })).toBeVisible()
    await expect(others.getByRole("link", { name: /Le moteur Excel Modelisys/ })).toBeVisible()
    await expect(
      others.getByRole("link", { name: /Votre réalité ne correspond pas à un modèle standard/ }),
    ).toBeVisible()
  })

  test("page Accompagnement financier", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/services/accompagnement-financier", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    })
    await expect(
      page.getByRole("heading", { name: /partenaire financier à temps partiel/i }),
    ).toBeVisible({ timeout: 30000 })
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
    await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveCount(0)
  })

  test("sous-pages Licence et Développement", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/services/licences", { waitUntil: "domcontentloaded", timeout: 90000 })
    await expect(page.getByRole("heading", { name: /moteur Excel Modelisys/i })).toBeVisible({
      timeout: 30000,
    })
    const licenceTabs = page.getByRole("tablist", { name: "Cas — Licence" })
    await expect(licenceTabs).toHaveAttribute("data-ready", "true", { timeout: 15000 })
    await expect(licenceTabs.getByRole("tab", { name: "Multi-entités" })).toBeVisible()
    await expect(licenceTabs.getByRole("tab", { name: "Autonomie" })).toBeVisible()
    await expect(licenceTabs.getByRole("tab", { name: "Valorisation" })).toBeVisible()
    await expect(page.getByText("Groupe de 6 entités")).toBeVisible()

    await page.getByTestId("licence-cas-autonomie").click()
    await expect(page.getByRole("heading", { name: /rythme mensuel/i })).toBeVisible()

    await page.getByTestId("licence-cas-valorisation").click()
    await expect(page.getByRole("heading", { name: /Relier le moteur à la valeur/i })).toBeVisible()
    await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveCount(0)

    await page.goto("/services/developpement-sur-mesure", {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    })
    await expect(page.getByRole("heading", { name: /modèle standard/i })).toBeVisible({
      timeout: 30000,
    })
    await expect(page.getByText("Quand le sur-mesure s’impose")).toBeVisible()
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
    await expect(page.getByRole("link", { name: "Services", exact: true })).toHaveCount(0)
  })

  test("le menu Nos services mène à /services", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    await page.locator("nav").locator("a[href='/services']").first().click()
    await expect(page).toHaveURL(/\/services/, { timeout: 15000 })
  })

  test("le menu Nos services propose les quatre offres", async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90000 })
    const nav = page.locator("nav").first()
    await nav.getByRole("link", { name: "Nos services", exact: true }).hover()
    await expect(nav.getByRole("link", { name: "Mandats ponctuels" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Accompagnement financier" })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Licence", exact: true })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Développement sur mesure" })).toBeVisible()
    await nav.getByRole("link", { name: "Mandats ponctuels" }).click()
    await expect(page).toHaveURL(/\/services\/mandats-ponctuels/, { timeout: 15000 })
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
