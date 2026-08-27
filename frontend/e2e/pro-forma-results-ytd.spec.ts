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
const REVENUE_AMOUNTS = monthlyAmounts(2024, 2026, { 2024: 1, 2025: 100, 2026: 10 })

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
    name: "Scénario mars 2026",
    projection_years: 5,
    projection_mode: "account",
    projection_horizon: "annual",
    start_year: 2026,
    start_month: 3,
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
    const method = route.request().method()
    if (method === "GET") {
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
        structure: [{ label: "Revenus", linkCode: "REV", liaisonMode: "single", isBold: true }],
      }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/income-statement**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "income-statement",
          fiscalYear: 2026,
          periods: PERIODS,
          rows: [
            {
              id: "REV",
              label: "Revenus",
              isBold: true,
              isSection: false,
              isResult: false,
              linkCode: "REV",
              amounts: REVENUE_AMOUNTS,
              detailRows: [],
            },
          ],
        }),
      })
    }
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
  await expect(page.getByRole("heading", { name: "Résultats projetés" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Résultats", exact: true }).click()
  if (section === "summary") {
    await page.getByRole("button", { name: "Sommaire", exact: true }).click()
  } else {
    await page.getByRole("button", { name: "Détail", exact: true }).click()
  }
}

function expectNMinusOneAndYtdHeaders(page: Page) {
  const headers = page.locator("table thead th")
  return Promise.all([
    expect(headers.filter({ hasText: /^2025$/ })).toBeVisible(),
    expect(headers.filter({ hasText: "YTD 2026" })).toBeVisible(),
    expect(headers.filter({ hasText: /^2026$/ })).toBeVisible(),
    expect(headers.filter({ hasText: /^2027$/ })).toBeVisible(),
  ])
}

test.describe("Pro forma Résultats N-1 and YTD", () => {
  test("summary shows full prior year then YTD of the reference date", async ({ page }) => {
    test.setTimeout(60_000)
    await setupProFormaIncomeStatement(page)
    await openProFormaResults(page, "summary")

    await expect(page.getByText("Revenus").first()).toBeVisible({ timeout: 15000 })
    await expectNMinusOneAndYtdHeaders(page)

    const revenueRow = page.locator("table tbody tr").filter({ hasText: "Revenus" }).first()
    await expect(revenueRow).toBeVisible()
    const cells = revenueRow.locator("td")
    await expect(cells.nth(1)).toHaveText(/1[\s\u00a0]?200/)
    await expect(cells.nth(2)).toHaveText(/30/)

    const shadedHeaders = page.locator("table thead th.bg-slate-50")
    await expect(shadedHeaders).toHaveCount(2)
  })

  test("detail uses the same N-1 and YTD columns as summary", async ({ page }) => {
    test.setTimeout(60_000)
    await setupProFormaIncomeStatement(page)
    await openProFormaResults(page, "detail")

    await expect(page.getByText("Revenus").first()).toBeVisible({ timeout: 15000 })
    await expectNMinusOneAndYtdHeaders(page)

    const revenueRow = page.locator("table tbody tr").filter({ hasText: "Revenus" }).first()
    const cells = revenueRow.locator("td")
    await expect(cells.nth(1)).toHaveText(/1[\s\u00a0]?200/)
    await expect(cells.nth(2)).toHaveText(/30/)
  })
})
