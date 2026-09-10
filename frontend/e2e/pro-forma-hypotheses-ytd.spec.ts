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

function monthlyAmounts(
  fromYear: number,
  toYear: number,
  valueAt: (year: number, month: number) => number,
) {
  const amounts: Record<string, number> = {}
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      amounts[`${year}-${month}`] = valueAt(year, month)
    }
  }
  return amounts
}

const PERIODS = buildMonthlyPeriods(2024, 2026)
const FLOW_AMOUNTS = monthlyAmounts(2024, 2026, (year) =>
  year === 2025 ? 100 : year === 2026 ? 10 : 1,
)

async function setupHypothesisPage(page: Page, startMonth: number) {
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
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "fake-access-token", refresh_token: "fake-refresh-token" }),
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
          companies: [
            {
              id: COMPANY_ID,
              name: "Test Co",
              fiscal_year_end: "12-31",
              currency: "CAD",
              divisions: [],
            },
          ],
        }),
      })
    }
    return route.continue()
  })

  const projection = {
    id: PROJECTION_ID,
    name: startMonth === 12 ? "Scénario décembre 2026" : "Scénario mars 2026",
    projection_years: 5,
    projection_mode: "account",
    projection_horizon: "annual",
    start_year: 2026,
    start_month: startMonth,
    company_id: COMPANY_ID,
    division_id: null,
    sub_division_id: null,
    created_by_id: "u1",
    adjustments: [],
    loans: [],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  }

  await page.route(`**/api/companies/${COMPANY_ID}/projections**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ projections: [projection], ...projection }),
      })
    }
    return route.continue()
  })

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configs: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/notes**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ notes: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        structure: [
          {
            label: "Total Revenus",
            linkCode: "REV",
            defineMapping: true,
            showInDetail: true,
            posteNature: "revenus",
            isBold: true,
          },
          {
            label: "Immobilisations",
            linkCode: "ALT",
            defineMapping: true,
            showInDetail: true,
            isBold: true,
          },
        ],
      }),
    }),
  )

  const seriesPayload = (statementType: string, label: string, id: string) => ({
    companyId: COMPANY_ID,
    statementType,
    fiscalYear: 2026,
    periods: PERIODS,
    rows: [
      {
        id,
        label,
        isBold: true,
        isSection: false,
        isResult: false,
        hasLiaisonCode: true,
        amounts: FLOW_AMOUNTS,
        detailRows: [],
      },
    ],
  })

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/income-statement**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(seriesPayload("income-statement", "Total Revenus", "REV")),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: [] }),
    })
  })
  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(seriesPayload("balance-sheet", "Immobilisations", "ALT")),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: [] }),
    })
  })
}

async function openHypothesis(
  page: Page,
  moduleName: "Revenus" | "Dépenses" | "Capex",
  heading: string,
) {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
  await expect(page.getByRole("heading", { name: "Résultats projetés" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
  await page.getByRole("button", { name: moduleName, exact: true }).click()
  await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId("pro-forma-financial-impact-panel")).toBeVisible()
  await expect(page.getByTestId("pro-forma-impact-revenue")).toBeVisible()
  await expect(page.getByTestId("pro-forma-impact-endingCash")).toBeVisible()
  await expect(page.getByTestId("pro-forma-impact-year-select")).toBeVisible()
}

test.describe("Pro forma hypothesis N-1 and YTD", () => {
  test("Revenus shows N-1 then YTD when the reference is mid-year", async ({ page }) => {
    test.setTimeout(60_000)
    await setupHypothesisPage(page, 3)
    await openHypothesis(page, "Revenus", "Estimation des revenus annuels")

    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: /^2025$/ })).toBeVisible()
    await expect(headers.filter({ hasText: "YTD 2026" })).toBeVisible()
    await expect(headers.filter({ hasText: /^2026$/ })).toBeVisible()
    await expect(page.locator("table thead th.bg-slate-50")).toHaveCount(2)
  })

  test("Dépenses uses the same N-1 and YTD columns", async ({ page }) => {
    test.setTimeout(60_000)
    await setupHypothesisPage(page, 3)
    await openHypothesis(page, "Dépenses", "Estimation des dépenses annuelles")

    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: /^2025$/ })).toBeVisible()
    await expect(headers.filter({ hasText: "YTD 2026" })).toBeVisible()
    await expect(headers.filter({ hasText: /^2026$/ })).toBeVisible()
    await expect(page.locator("table thead th.bg-slate-50")).toHaveCount(2)
  })

  test("Capex uses the same N-1 and YTD columns", async ({ page }) => {
    test.setTimeout(60_000)
    await setupHypothesisPage(page, 3)
    await openHypothesis(page, "Capex", "Estimation des Capex annuels")

    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: /^2025$/ })).toBeVisible()
    await expect(headers.filter({ hasText: "YTD 2026" })).toBeVisible()
    await expect(headers.filter({ hasText: /^2026$/ })).toBeVisible()
    await expect(page.locator("table thead th.bg-slate-50")).toHaveCount(2)
  })

  test("skips the YTD stub at fiscal year-end on Revenus", async ({ page }) => {
    test.setTimeout(60_000)
    await setupHypothesisPage(page, 12)
    await openHypothesis(page, "Revenus", "Estimation des revenus annuels")

    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: /^2025$/ })).toBeVisible()
    await expect(headers.filter({ hasText: "YTD 2026" })).toHaveCount(0)
    await expect(headers.filter({ hasText: /^2026$/ })).toBeVisible()
    await expect(page.locator("table thead th.bg-slate-50")).toHaveCount(1)
  })
})
