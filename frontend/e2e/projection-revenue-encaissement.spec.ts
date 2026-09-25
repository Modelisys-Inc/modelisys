import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"

function buildMonthlyPeriods(fromYear: number, toYear: number) {
  const periods: { fiscalYear: number; fiscalMonth: number; label: string }[] = []
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${month}/${year}`,
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

const INCOME_STRUCTURE = [
  { label: "REVENUS", isSection: true },
  {
    label: "Total Revenus",
    linkCode: "REV.1",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "revenus",
  },
]

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
          full_name: "Test User",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Test Org", slug: "test-org", role: "admin" }],
      }),
    }),
  )

  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "o1", name: "Test Org", slug: "test-org", role: "admin" }]),
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

  await page.route(`**/api/companies/${COMPANY_ID}/projections**`, async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method === "GET" && url.includes(`/projections/${PROJECTION_ID}`)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: PROJECTION_ID,
          name: "Test projection",
          projection_years: 5,
          projection_mode: "gl",
          projection_horizon: "annual",
          start_year: 2028,
          start_month: 1,
          company_id: COMPANY_ID,
          division_id: null,
          sub_division_id: null,
          created_by_id: "u1",
          adjustments: [],
          loans: [],
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        }),
      })
    }
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          projections: [
            {
              id: PROJECTION_ID,
              name: "Test projection",
              projection_years: 5,
              projection_mode: "gl",
              projection_horizon: "annual",
              start_year: 2028,
              start_month: 1,
              company_id: COMPANY_ID,
              division_id: null,
              sub_division_id: null,
              created_by_id: "u1",
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        }),
      })
    }
    return route.continue()
  })

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/income-statement`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: INCOME_STRUCTURE }),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  )

  await page.route(`**/api/standard-link-codes/flat**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  )

  const periods = buildMonthlyPeriods(2023, 2028)
  const revenueAmount = monthlyAmounts(2023, 2028, {
    2023: 500_000,
    2024: 500_000,
    2025: 500_000,
    2026: 500_000,
    2027: 500_000,
    2028: 0,
  })

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "income-statement",
          fiscalYear: 2027,
          periods,
          rows: [
            {
              id: "section-revenus",
              label: "REVENUS",
              isSection: true,
              amounts: monthlyAmounts(2023, 2028, {}),
              detailRows: [],
            },
            {
              id: "REV.1",
              label: "Total Revenus",
              hasLiaisonCode: true,
              amounts: revenueAmount,
              detailRows: [],
            },
          ],
        }),
      }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/income-statement*`, (route) => {
    if (route.request().url().includes("/series")) return route.continue()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: [] }),
    })
  })
}

async function openProFormaRevenueHypotheses(page: Page) {
  await page.goto(`/projections/revenue?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`, {
    timeout: 120_000,
  })
  await expect(page.getByRole("heading", { name: "Hypothèses Revenus" })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByRole("heading", { name: /Estimation des revenus annuels/ })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByText("Chargement des données...")).toHaveCount(0, { timeout: 30000 })
}

test.describe("Projection revenue collection hypotheses", () => {
  test("hides sommaire and encaissement tabs and shows monthly revenue amounts in Saisonnalité", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)
    await openProFormaRevenueHypotheses(page)

    const row = page.locator("tr", { hasText: "Total Revenus" }).first()
    await expect(row).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("revenue-year-pct-ca-header").first()).toBeVisible()
    await expect(page.getByTestId("revenue-year-group-start").first()).toBeVisible()
    await expect(row.getByTestId("revenue-year-pct-ca").first()).toBeVisible()
    // Compte | N-1 | % CA | YTD | % CA | 1re année projetée | …
    await row.locator("td").nth(5).click()

    await expect(page.getByRole("tab", { name: "Croissance" })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("tab", { name: "Saisonnalité" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Sommaire" })).toHaveCount(0)
    await expect(page.getByRole("tab", { name: "Encaissement" })).toHaveCount(0)

    await page.getByRole("tab", { name: "Saisonnalité" }).click()
    const amountRow = page.getByTestId("forecast-seasonality-amount-row")
    await expect(amountRow).toBeVisible()
    await expect(amountRow).toContainText("Revenus")
    await expect(page.getByText("Encaissements")).toHaveCount(0)
    await expect(page.getByText("Comptes clients")).toHaveCount(0)
    await expect(page.getByText(/\d[\d\s]*j\b/)).toHaveCount(0)

    await page.getByRole("button", { name: /Enregistrer/ }).click()
    await expect(page.getByTestId("hypothesis-save-ack")).toHaveText(/Modifications enregistrées/)
  })
})
