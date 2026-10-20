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

  test("le menu Ressources mène aux quiz", async ({ page }) => {
    await page.goto("/")
    const nav = page.locator("nav").first()
    await nav.getByRole("link", { name: "Ressources", exact: true }).hover()
    await expect(nav.getByRole("link", { name: "Blog", exact: true })).toBeVisible()
    await expect(nav.getByRole("link", { name: "Quiz", exact: true })).toBeVisible()

    await page.goto("/ressources")
    await expect(
      page.getByRole("heading", { name: /Tester vos connaissances en finance corporative/i }),
    ).toBeVisible()
    await page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: "Lecture de la valeur" }) })
      .getByRole("link", { name: "COMMENCER" })
      .click()
    await expect(page).toHaveURL(/\/ressources\/lecture-de-la-valeur$/)

    const answers = [
      "Dans les décisions prises chaque mois",
      "Oui : la croissance, le fonds de roulement et les investissements consomment de la trésorerie",
      "Des stocks et des comptes clients qui grossissent plus vite que le financement des fournisseurs",
      "Non : il faut voir la marge, la trésorerie et le risque qui accompagnent cet écart",
      "Parce que les leviers se découvrent trop tard pour encore changer la trajectoire",
    ]
    for (const [index, answer] of answers.entries()) {
      await page.getByRole("radio", { name: answer }).click()
      const nextLabel = index === answers.length - 1 ? "VOIR MON SCORE" : "SUIVANT"
      await page.getByRole("button", { name: nextLabel }).click()
    }
    await expect(page.getByTestId("quiz-score")).toHaveText("5 sur 5")
    await expect(page.getByRole("heading", { name: "Lecture déjà nette" })).toBeVisible()
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
      page.getByRole("heading", { name: /Notre vision/i }),
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
