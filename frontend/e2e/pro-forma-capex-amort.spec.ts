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
    label: "Frais d'administration",
    linkCode: "ADM",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "D",
  },
  {
    id: "ADM.20",
    label: "Amortissement - Immobilisations corporelles",
    linkCode: "ADM.20",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "D",
  },
  {
    id: "ADM.21",
    label: "Amortissement - Actifs incorporels",
    linkCode: "ADM.21",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "D",
  },
]

const BS_STRUCTURE = [
  { label: "Actif", isSection: true },
  {
    id: "ALT-B",
    label: "Immobilisations corporelles",
    linkCode: "ALT-B",
    defineMapping: true,
    showInDetail: true,
  },
  {
    id: "ALT-B.2",
    label: "Bâtisses",
    linkCode: "ALT-B.2",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
  },
  {
    id: "ALT-D",
    label: "Actifs incorporels",
    linkCode: "ALT-D",
    defineMapping: true,
    showInDetail: true,
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
    name: "Scénario amort Capex",
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
    if (url.includes("capex-forecast")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configs: [
            {
              id: "fc-capex",
              config_type: "capex-forecast",
              data: {
                capexAdjustments: {},
                depreciationRates: { "ALT-B.2": 10, "ALT-D": 10 },
                depreciationMethods: { "ALT-B.2": "linear", "ALT-D": "linear" },
                amortizationLinkCodes: { "ALT-B.2": "ADM.20", "ALT-D": "ADM.21" },
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
      body: JSON.stringify({ structure: BS_STRUCTURE }),
    }),
  )

  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "slc-alt-b",
          code: "ALT-B",
          family: "ALT",
          parent_code: null,
          is_leaf: false,
          label: "Immobilisations corporelles",
        },
        {
          id: "slc-alt-b-2",
          code: "ALT-B.2",
          family: "ALT",
          parent_code: "ALT-B",
          is_leaf: true,
          label: "Bâtisses",
        },
        {
          id: "slc-alt-d",
          code: "ALT-D",
          family: "ALT",
          parent_code: null,
          is_leaf: true,
          label: "Actifs incorporels",
        },
      ]),
    }),
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
            {
              id: "REV",
              label: "Revenus",
              amounts: amt(1000),
              detailRows: [],
            },
            {
              id: "REV-A.1",
              label: "Ventes",
              amounts: amt(1000),
              detailRows: [],
            },
            {
              id: "ADM",
              label: "Frais d'administration",
              amounts: amt(0),
              detailRows: [],
            },
            {
              id: "ADM.20",
              label: "Amortissement - Immobilisations corporelles",
              amounts: amt(5_000),
              detailRows: [],
            },
            {
              id: "ADM.21",
              label: "Amortissement - Actifs incorporels",
              amounts: amt(1_000),
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
        rows: [
          {
            id: "ALT-B",
            label: "Immobilisations corporelles",
            amounts: amt(100_000),
            detailRows: [],
          },
          {
            id: "ALT-B.2",
            label: "Bâtisses",
            amounts: amt(100_000),
            detailRows: [],
          },
          {
            id: "ALT-D",
            label: "Actifs incorporels",
            amounts: amt(40_000),
            detailRows: [],
          },
        ],
      }),
    }),
  )
}

test.describe("Pro Forma Capex amortization bridge", () => {
  test("Detail shows Capex period depreciation on ADM.20 / ADM.21", async ({ page }) => {
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

    const corpRow = page.locator("tr").filter({ hasText: "Amortissement - Immobilisations corporelles" }).first()
    await expect(corpRow).toBeVisible({ timeout: 15000 })
    // N-1 | YTD | 2026(projeté) — 10 % × 100 000 $ = 10 000 $
    await expect(corpRow).toContainText(/10[\s\u00a0]?000/)

    const intangRow = page.locator("tr").filter({ hasText: "Amortissement - Actifs incorporels" }).first()
    await expect(intangRow).toBeVisible()
    // 10 % × 40 000 $ = 4 000 $
    await expect(intangRow).toContainText(/4[\s\u00a0]?000/)
  })
})
