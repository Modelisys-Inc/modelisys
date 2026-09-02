import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"
const ABBREVS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const

function buildMonthlyPeriods(fromYear: number, toYear: number) {
  const periods: { fiscalYear: number; fiscalMonth: number; label: string }[] = []
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${ABBREVS[month - 1]} ${year}`,
      })
    }
  }
  return periods
}

function monthlyAmounts(fromYear: number, toYear: number, yearValues: Record<number, number>) {
  const amounts: Record<string, number> = {}
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      amounts[`${year}-${month}`] = yearValues[year] ?? 0
    }
  }
  return amounts
}

const PERIODS = buildMonthlyPeriods(2024, 2026)
const REVENUE_AMOUNTS = monthlyAmounts(2024, 2026, { 2024: 100, 2025: 100, 2026: 10 })

const STRUCTURE = [
  {
    label: "Revenus",
    linkCode: "REV",
    liaisonMode: "single",
    isBold: true,
    isSection: true,
    defineMapping: true,
    showInDetail: true,
    posteNature: "revenus",
    annexLetter: "A",
  },
  {
    id: "REV-A.1",
    label: "REV-A.1",
    linkCode: "REV-A.1",
    liaisonMode: "single",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "A",
  },
]

async function setupProFormaIncomeStatement(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([{ name: "has_session", value: "1", url: "http://localhost:3000" }])

  await page.route("**/api/**", async (route) => {
    const url = route.request().url()
    if (url.includes("/api/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      })
    }
    return route.continue()
  })

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1",
          email: "admin@e.com",
          full_name: "Admin",
          is_active: true,
          is_superadmin: false,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )

  await page.route("**/api/companies**", (route) => {
    if (route.request().method() !== "GET") return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: COMPANY_ID,
          name: "Co",
          organization_id: "o1",
          fiscal_year_end: "12-31",
          currency: "CAD",
          is_cumulative_tb: true,
        },
      ]),
    })
  })

  await page.route(`**/api/companies/${COMPANY_ID}/projections**`, (route) => {
    if (route.request().method() !== "GET") return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: PROJECTION_ID,
          company_id: COMPANY_ID,
          name: "PF monthly",
          projection_years: 5,
          projection_mode: "gl",
          projection_horizon: "annual",
          start_year: 2026,
          start_month: 3,
          division_id: null,
          sub_division_id: null,
        },
      ]),
    })
  })

  await page.route(`**/api/companies/${COMPANY_ID}/projections/${PROJECTION_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: PROJECTION_ID,
        company_id: COMPANY_ID,
        name: "PF monthly",
        projection_years: 5,
        projection_mode: "gl",
        projection_horizon: "annual",
        start_year: 2026,
        start_month: 3,
        division_id: null,
        sub_division_id: null,
      }),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        income_statement: STRUCTURE,
        balance_sheet: [],
        cash_flow: [],
      }),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/series**`, (route) => {
    const u = new URL(route.request().url())
    const statementType = u.searchParams.get("statement_type") || "income_statement"
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        statement_type: statementType,
        periods: PERIODS,
        rows: [
          {
            id: "rev",
            label: "Revenus",
            linkCode: "REV",
            isBold: true,
            isSection: false,
            amounts: REVENUE_AMOUNTS,
          },
        ],
      }),
    })
  })

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements**`, (route) => {
    if (route.request().url().includes("/series")) return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        rows: [{ id: "rev", label: "Revenus", current: 0, prior: 0, isBold: true }],
      }),
    })
  })
}

async function openProFormaResults(page: Page, section: "summary" | "detail") {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
  await expect(page.getByRole("heading", { name: "Résultats projetés" })).toBeVisible({
    timeout: 15000,
  })
  await page.getByRole("button", { name: "Résultats", exact: true }).click()
  if (section === "summary") {
    await page.getByRole("button", { name: "Sommaire", exact: true }).click()
  } else {
    await page.getByRole("button", { name: "Détail", exact: true }).click()
  }
}

test.describe("Pro forma Résultats vue mensuelle", () => {
  test("summary Mensuel shows 60 projected month headers", async ({ page }) => {
    test.setTimeout(60_000)
    await setupProFormaIncomeStatement(page)
    await openProFormaResults(page, "summary")

    const horizon = page.getByTestId("pro-forma-results-column-horizon")
    await expect(horizon).toBeVisible({ timeout: 15000 })
    await horizon.getByRole("button", { name: "Mensuel", exact: true }).click()

    await expect(page.getByText("Revenus").first()).toBeVisible({ timeout: 15000 })
    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: "janv. 2026" })).toBeVisible()
    await expect(headers.filter({ hasText: "déc. 2030" })).toBeVisible()
    // Compte + 60 mois (pas N-1 / YTD en vue mensuelle)
    await expect(headers).toHaveCount(61)
  })

  test("detail Mensuel shows the same 60 month headers", async ({ page }) => {
    test.setTimeout(60_000)
    await setupProFormaIncomeStatement(page)
    await openProFormaResults(page, "detail")

    const horizon = page.getByTestId("pro-forma-results-column-horizon")
    await horizon.getByRole("button", { name: "Mensuel", exact: true }).click()

    await expect(page.getByText("Revenus").first()).toBeVisible({ timeout: 15000 })
    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: "janv. 2026" })).toBeVisible()
    await expect(headers.filter({ hasText: "déc. 2030" })).toBeVisible()
    await expect(headers).toHaveCount(61)
  })
})
