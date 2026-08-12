import { test, expect, Page } from "@playwright/test"

/**
 * BAIIA en Paramètres Sommaire : pas de Code / formule Liaison —
 * affichage « REV − CV − CF » (calcul serveur automatique).
 */

test.setTimeout(360_000)

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

function isIncomeStatementUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return (
    path.includes(`/companies/${COMPANY_ID}/financial-statements/income-statement`) &&
    !path.includes("/series")
  )
}

function isIncomeStatementSeriesUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/financial-statements/income-statement/series`)
}

function isIncomeStatementStructureUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/statement-structures/income-statement`)
}

async function setupAuth(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    { name: "has_session", value: "1", url: "http://localhost:3000" },
  ])
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1",
          email: "u@e.com",
          full_name: "Test",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "admin" }]),
    }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }],
        }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budgets: [] }),
    }),
  )
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configs: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ slots: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance/fiscal-years`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([2026]),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance?fiscal_year=2026`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_id: COMPANY_ID,
        fiscal_year: 2026,
        months_with_data: [1, 8],
        accounts: [
          {
            account_number: "4000",
            description: "Sales",
            monthly_amounts: { Janvier: 1_000_000, Août: 1_000_000 },
          },
        ],
      }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/account-mappings**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mappings: [] }),
    }),
  )
}

test("Paramètres Sommaire : BAIIA sans Code, Liaison = REV − CV − CF", async ({ page }) => {
  await setupAuth(page)

  const structure = [
    {
      label: "Bénéfice net",
      isBold: true,
      isNetIncome: true,
      defineMapping: true,
      formula: "NI - D7",
      liaisonMode: "difference",
    },
    {
      label: "BAIIA",
      isBold: true,
      isEBITA: true,
      defineMapping: true,
      formula: "NI - D9",
      liaisonMode: "difference",
      annexLetter: "A",
      showInDetail: true,
    },
  ]

  await page.route(isIncomeStatementStructureUrl, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ structure }),
      })
    }
    return route.continue()
  })

  await page.route(isIncomeStatementSeriesUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "income-statement",
        fiscalYear: 2026,
        periods: [{ fiscalYear: 2026, fiscalMonth: 8, label: "Aoû 2026" }],
        rows: [
          { id: "ni", label: "Bénéfice net", amounts: { "2026-8": 100 }, detailRows: [] },
          { id: "baiia", label: "BAIIA", amounts: { "2026-8": 200 }, detailRows: [] },
        ],
      }),
    }),
  )

  await page.route(isIncomeStatementUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rows: [
          { label: "Bénéfice net", current: 100, prior: 90 },
          { label: "BAIIA", current: 200, prior: 180 },
        ],
      }),
    }),
  )

  await page.goto(
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=8&refYear=2026`,
    { waitUntil: "domcontentloaded", timeout: 300000 },
  )

  await expect(page.getByRole("button", { name: /^Sommaire$/ })).toBeVisible({ timeout: 120000 })
  await page.getByRole("button", { name: /^Sommaire$/ }).click()
  // Affichage n’existe que hors tableau de bord — confirme le basculement de section.
  await expect(page.getByText("Affichage", { exact: true })).toBeVisible({ timeout: 60000 })
  await expect(
    page.getByRole("combobox").filter({ hasText: /Mois actuel/i }).first(),
  ).toBeVisible({ timeout: 30000 })

  // Paramètres n’apparaît qu’après le chargement des données (pas pendant le skeleton).
  const parametres = page.getByRole("button", { name: /^Paramètres$/ })
  await expect(parametres).toBeVisible({ timeout: 180000 })
  await parametres.click()

  await expect(page.getByText("Édition structure")).toBeVisible({ timeout: 60000 })

  const baiiaRow = page.locator("tr").filter({ hasText: "BAIIA" }).first()
  await expect(baiiaRow).toBeVisible()
  await expect(baiiaRow.getByText("REV − CV − CF")).toBeVisible()
  await expect(baiiaRow.getByText("NI - D9")).toHaveCount(0)
  await expect(
    baiiaRow.getByRole("checkbox", { name: /Code désactivé pour BAIIA/i }),
  ).toBeDisabled()
  await expect(
    baiiaRow.getByRole("checkbox", { name: /Code désactivé pour BAIIA/i }),
  ).not.toBeChecked()
})

test("Sommaire : BAIIA mensuel et YTD affichés tels que renvoyés par l’API (sans inflation)", async ({
  page,
}) => {
  await setupAuth(page)

  const structure = [
    {
      label: "revenus",
      isBold: true,
      isSection: true,
      linkCode: "REV",
      defineMapping: true,
    },
    { label: "BAIIA", isBold: true, isEBITA: true },
  ]

  await page.route(isIncomeStatementStructureUrl, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ structure }),
      })
    }
    return route.continue()
  })

  await page.route(isIncomeStatementSeriesUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "income-statement",
        fiscalYear: 2026,
        periods: [
          { fiscalYear: 2026, fiscalMonth: 1, label: "Jan 2026" },
          { fiscalYear: 2026, fiscalMonth: 8, label: "Aoû 2026" },
        ],
        rows: [
          {
            id: "rev",
            label: "revenus",
            linkCode: "REV",
            amounts: { "2026-1": -1_000_000, "2026-8": -1_000_000 },
            detailRows: [],
          },
          {
            id: "baiia",
            label: "BAIIA",
            amounts: { "2026-1": 500_000, "2026-8": 400_000 },
            detailRows: [],
          },
        ],
      }),
    }),
  )

  await page.route(isIncomeStatementUrl, (route) => {
    const url = new URL(route.request().url())
    const period = url.searchParams.get("period") || "monthly"
    const isYtd = period === "ytd"
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rows: [
          {
            label: "revenus",
            linkCode: "REV",
            current: isYtd ? -2_900_000 : -1_000_000,
            prior: isYtd ? -2_500_000 : -900_000,
          },
          {
            label: "BAIIA",
            current: isYtd ? 1_350_000 : 400_000,
            prior: isYtd ? 1_200_000 : 350_000,
          },
        ],
      }),
    })
  })

  await page.goto(
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=8&refYear=2026`,
    { waitUntil: "domcontentloaded", timeout: 300000 },
  )

  await expect(page.getByRole("button", { name: /^Sommaire$/ })).toBeVisible({ timeout: 120000 })
  await page.getByRole("button", { name: /^Sommaire$/ }).click()
  await expect(page.getByText("Affichage", { exact: true })).toBeVisible({ timeout: 60000 })

  const money = (n: number) =>
    new RegExp(String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "[\\s\\u00a0\\u202f]?"))

  const revenusRow = page.locator("tr").filter({ hasText: /^revenus/i }).first()
  const baiiaRow = page.locator("tr").filter({ hasText: /^BAIIA/ }).first()
  await expect(baiiaRow).toBeVisible({ timeout: 180000 })
  await expect(revenusRow).toBeVisible()
  await expect(revenusRow).toContainText(money(1_000_000))
  await expect(baiiaRow).toContainText(money(400_000))
  // Garde-fou : BAIIA ne doit pas afficher un multiple des revenus (~2,4 M$ / 3 M$).
  await expect(baiiaRow).not.toContainText(money(2_400_000))
  await expect(baiiaRow).not.toContainText(money(3_000_000))

  const horizonTrigger = page
    .getByRole("combobox")
    .filter({ hasText: /Mois actuel|Mensuel|Trimestriel|Annuel|YTD|DDM/i })
    .first()
  await horizonTrigger.click()
  await page.getByRole("option", { name: /^YTD$/ }).click()

  await expect(revenusRow).toContainText(money(2_900_000), { timeout: 60000 })
  await expect(baiiaRow).toContainText(money(1_350_000))
  await expect(baiiaRow).not.toContainText(money(2_400_000))
})
