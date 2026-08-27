import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"

function buildMonthlyPeriods(fromYear: number, toYear: number) {
  const periods: { fiscalYear: number; fiscalMonth: number; label: string }[] = []
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({ fiscalYear: year, fiscalMonth: month, label: `${month}/${year}` })
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

const PERIODS = buildMonthlyPeriods(2023, 2028)

const IS_STRUCTURE = [
  { label: "Revenus", linkCode: "REV", isBold: true, isSection: true, defineMapping: true, showInDetail: true, posteNature: "revenus", annexLetter: "A" },
  { id: "REV-A.1", label: "Ventes", linkCode: "REV-A.1", detailOnly: true, defineMapping: true, showInDetail: true, annexLetter: "A" },
  { label: "Charges d'exploitation", isBold: true, isSection: true },
  {
    label: "Frais financiers",
    linkCode: "FIN",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "D",
  },
  {
    id: "FIN.3",
    label: "Intérêts sur la dette à long terme",
    linkCode: "FIN.3",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "D",
  },
  {
    id: "FIN.4",
    label: "Intérêts sur les contrats de location-acquisition",
    linkCode: "FIN.4",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "D",
  },
]

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([{ name: "has_session", value: "1", url: "http://localhost:3000" }])

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "a@e.com", full_name: "A", is_active: true, is_superadmin: false, created_at: "2026-01-01T00:00:00Z" },
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
          companies: [{ id: COMPANY_ID, name: "Test Co", fiscal_year_end: "12-31", currency: "CAD", divisions: [] }],
        }),
      })
    }
    return route.continue()
  })

  const projection = {
    id: PROJECTION_ID,
    name: "Scénario intérêts dette",
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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
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

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    const url = route.request().url()
    if (url.includes("debt-forecast")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configs: [
            {
              id: "fc-debt",
              config_type: "debt-forecast",
              data: {
                loans: [
                  {
                    id: "loan-plt-c",
                    name: "Dette LT",
                    principal: 100_000,
                    interestRate: 12,
                    remainingPayments: 24,
                    startMonth: 0,
                    repaymentMode: "interest_only",
                    sourceType: "mapping",
                    sourceLinkCode: "PLT-C",
                    hypothesisDefined: true,
                  },
                  {
                    id: "loan-plt-d",
                    name: "Location",
                    principal: 50_000,
                    interestRate: 12,
                    remainingPayments: 24,
                    startMonth: 0,
                    repaymentMode: "interest_only",
                    sourceType: "mapping",
                    sourceLinkCode: "PLT-D",
                    hypothesisDefined: true,
                  },
                ],
              },
            },
          ],
        }),
      })
    }
    if (url.includes("tax-forecast")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configs: [{ id: "fc-tax", config_type: "tax-forecast", data: { taxRate: 26 } }],
        }),
      })
    }
    if (url.includes("capex-forecast")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configs: [] }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        configs: [
          {
            id: "fc-is",
            config_type: "income-statement-detail",
            data: {
              revenueValues: {},
              revenueAdjustments: {},
              expenseTypes: {},
              variableRates: {},
              inflationRate: 2,
              specificInflationRates: {},
              expenseAdjustments: {},
            },
          },
        ],
      }),
    })
  })

  await page.route(`**/api/companies/${COMPANY_ID}/notes**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notes: [] }) }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/income-statement`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: IS_STRUCTURE }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: [] }),
    }),
  )
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )

  const amt = (v: number) =>
    monthlyAmounts(2023, 2028, { 2023: v, 2024: v, 2025: v, 2026: v, 2027: v, 2028: v })

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
            { id: "REV", label: "Revenus", amounts: amt(1000), detailRows: [] },
            { id: "REV-A.1", label: "Ventes", amounts: amt(1000), detailRows: [] },
            { id: "FIN", label: "Frais financiers", amounts: amt(0), detailRows: [] },
            {
              id: "FIN.3",
              label: "Intérêts sur la dette à long terme",
              amounts: amt(1_000),
              detailRows: [],
            },
            {
              id: "FIN.4",
              label: "Intérêts sur les contrats de location-acquisition",
              amounts: amt(500),
              detailRows: [],
            },
          ],
        }),
      })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rows: [] }) })
  })

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet/series*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "balance-sheet",
        fiscalYear: 2026,
        periods: PERIODS,
        rows: [],
      }),
    }),
  )
}

test.describe("Pro Forma debt interest bridge", () => {
  test("Detail shows PLT-C/PLT-D interest on FIN.3 / FIN.4", async ({ page }) => {
    test.setTimeout(90_000)
    await setup(page)

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
    await expect(page.getByRole("heading", { name: "Résultats projetés", exact: true })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole("button", { name: "Résultats", exact: true }).click()
    await page.getByRole("button", { name: "Détail", exact: true }).click()

    await expect(page.getByRole("heading", { name: "États des résultats pro forma" })).toBeVisible({
      timeout: 15000,
    })

    const fin3 = page.locator("tr").filter({ hasText: "Intérêts sur la dette à long terme" }).first()
    await expect(fin3).toBeVisible({ timeout: 15000 })
    // Interest-only 12% × 100 000 $ = 12 000 $
    await expect(fin3).toContainText(/12[\s\u00a0]?000/)

    const fin4 = page
      .locator("tr")
      .filter({ hasText: "Intérêts sur les contrats de location-acquisition" })
      .first()
    await expect(fin4).toBeVisible()
    // Interest-only 12% × 50 000 $ = 6 000 $
    await expect(fin4).toContainText(/6[\s\u00a0]?000/)
  })
})
