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
  { label: "", isSection: true },
  { label: "DÉPENSES", isSection: true },
  {
    label: "Salaires opérationnels",
    linkCode: "EXP.45",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "1",
  },
  {
    label: "Loyer (calculé ailleurs)",
    linkCode: "EXP.20",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "2",
  },
  {
    label: "Impôts sur le revenu",
    linkCode: "IMP",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "3",
  },
  {
    label: "CMV amortissement",
    linkCode: "CMV.11",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "4",
  },
  {
    label: "Intérêts bancaires",
    linkCode: "FIN.2",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "5",
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

  await page.route(`**/api/companies/${COMPANY_ID}/projections`, (route) =>
    route.fulfill({
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
    }),
  )

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
  const expenseAmount = (value: number) =>
    monthlyAmounts(2023, 2028, {
      2023: value,
      2024: value,
      2025: value,
      2026: value,
      2027: value,
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
              amounts: expenseAmount(500_000),
              detailRows: [],
            },
            { id: "spacer", label: "", isSection: true, amounts: monthlyAmounts(2023, 2028, {}), detailRows: [] },
            {
              id: "section-depenses",
              label: "DÉPENSES",
              isSection: true,
              amounts: monthlyAmounts(2023, 2028, {}),
              detailRows: [],
            },
            {
              id: "EXP.45",
              label: "Salaires opérationnels",
              hasLiaisonCode: true,
              amounts: expenseAmount(-100_000),
              detailRows: [],
            },
            {
              id: "EXP.20",
              label: "Loyer (calculé ailleurs)",
              hasLiaisonCode: true,
              amounts: expenseAmount(-50_000),
              detailRows: [],
            },
            {
              id: "IMP",
              label: "Impôts sur le revenu",
              hasLiaisonCode: true,
              amounts: expenseAmount(-30_000),
              detailRows: [],
            },
            {
              id: "CMV.11",
              label: "CMV amortissement",
              hasLiaisonCode: true,
              amounts: expenseAmount(-20_000),
              detailRows: [],
            },
            {
              id: "FIN.2",
              label: "Intérêts bancaires",
              hasLiaisonCode: true,
              amounts: expenseAmount(-10_000),
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

async function openProFormaExpenses(page: Page) {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
  await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
  await page.getByRole("button", { name: "Dépenses", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Estimation des dépenses annuelles" })).toBeVisible({
    timeout: 15000,
  })
}

test.describe("Projection expense estimation exclusions", () => {
  test("hides computed link codes from annual expense estimation", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)
    await openProFormaExpenses(page)

    await expect(page.getByText("Salaires opérationnels").first()).toBeVisible({ timeout: 15000 })

    await expect(page.getByText("Loyer (calculé ailleurs)")).toHaveCount(0)
    await expect(page.getByText("Impôts sur le revenu")).toHaveCount(0)
    await expect(page.getByText("CMV amortissement")).toHaveCount(0)
    await expect(page.getByText("Intérêts bancaires")).toHaveCount(0)
  })
})
