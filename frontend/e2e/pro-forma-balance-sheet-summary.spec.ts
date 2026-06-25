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

async function setupAuth(page: Page, structure: Record<string, unknown>[] = []) {
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

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rows: [] }),
      }),
  )

  const periods = buildMonthlyPeriods(2023, 2028)

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2027,
          periods,
          rows: [
            {
              id: "section-actifs",
              label: "Actifs",
              isSection: true,
              amounts: monthlyAmounts(2023, 2028, {}),
              detailRows: [],
            },
            {
              id: "row-cash",
              label: "Encaisse",
              hasLiaisonCode: true,
              amounts: monthlyAmounts(2023, 2028, {
                2023: 100,
                2024: 200,
                2025: 300,
                2026: 400,
                2027: 500,
                2028: 0,
              }),
              detailRows: [],
            },
            {
              id: "row-total-actifs",
              label: "Total des actifs",
              isBold: true,
              hasLiaisonCode: true,
              amounts: monthlyAmounts(2023, 2028, {
                2023: 1000,
                2024: 1100,
                2025: 1200,
                2026: 1300,
                2027: 1400,
                2028: 0,
              }),
              detailRows: [],
            },
            {
              id: "section-passifs",
              label: "Passifs",
              isSection: true,
              amounts: monthlyAmounts(2023, 2028, {}),
              detailRows: [],
            },
            {
              id: "row-total-passifs",
              label: "Total passifs et capitaux propres",
              isBold: true,
              hasLiaisonCode: true,
              amounts: monthlyAmounts(2023, 2028, {
                2023: 1000,
                2024: 1100,
                2025: 1200,
                2026: 1300,
                2027: 1400,
                2028: 0,
              }),
              detailRows: [],
            },
          ],
        }),
      }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: [] }),
    }),
  )

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/cash-flow/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2027,
          periods,
          rows: [
            {
              id: "row-operating",
              label: "Flux d'exploitation",
              isBold: true,
              hasLiaisonCode: true,
              amounts: monthlyAmounts(2023, 2028, {
                2023: 100,
                2024: 200,
                2025: 300,
                2026: 400,
                2027: 500,
                2028: 0,
              }),
              detailRows: [],
            },
            {
              id: "row-net",
              label: "Variation de trésorerie",
              isBold: true,
              isResult: true,
              hasLiaisonCode: true,
              amounts: monthlyAmounts(2023, 2028, {
                2023: 1000,
                2024: 1100,
                2025: 1200,
                2026: 1300,
                2027: 1400,
                2028: 0,
              }),
              detailRows: [],
            },
          ],
        }),
      }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow-detail`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: [] }),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: [] }),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure }),
    }),
  )

  await page.route(`**/api/standard-link-codes/flat**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  )
}

async function openProFormaCashFlow(page: Page, section: "summary" | "detail") {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
  await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Trésorerie", exact: true }).click()
  if (section === "summary") {
    await page.getByRole("button", { name: "Sommaire", exact: true }).click()
  }
}

async function openProFormaBalanceSheet(
  page: Page,
  section: "summary" | "detail"
) {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
  await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Bilan", exact: true }).click()
  if (section === "summary") {
    await page.getByRole("button", { name: "Sommaire", exact: true }).click()
  }
}

test.describe("Pro forma balance sheet", () => {
  test("summary hides note icons and shades the first forecast year column", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await openProFormaBalanceSheet(page, "summary")

    await expect(page.getByText("Total des actifs").first()).toBeVisible({ timeout: 15000 })

    await expect(page.locator("table thead th").filter({ hasText: "2027" }).first()).toBeVisible()
    await expect(page.locator("table thead th").filter({ hasText: "2028" }).first()).toBeVisible()

    await expect(page.getByTitle(/analyse et les notes/i)).toHaveCount(0)

    const shadedCells = page.locator("table tbody td.bg-slate-50")
    await expect(shadedCells.first()).toBeVisible({ timeout: 10000 })
    const shadedCount = await shadedCells.count()
    expect(shadedCount).toBeGreaterThan(1)

    const firstYearHeader = page.locator("table thead th.bg-slate-50").first()
    await expect(firstYearHeader).toBeVisible()
  })

  test("detail hides note icons, shades the first forecast year column, and shows annex subtotals", async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await setupAuth(page, [
      {
        label: "Comptes clients",
        linkCode: "1100",
        liaisonMode: "single",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "1",
      },
      {
        label: "Clients — détail A",
        linkCode: "1101",
        liaisonMode: "single",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "1",
        detailOnly: true,
      },
    ])

    await openProFormaBalanceSheet(page, "detail")

    await expect(page.getByText(/Annexe 1/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Sous-total — Annexe 1/i)).toBeVisible({ timeout: 15000 })

    await expect(page.locator("table thead th").filter({ hasText: "2027" }).first()).toBeVisible()
    await expect(page.locator("table thead th").filter({ hasText: "2028" }).first()).toBeVisible()

    await expect(page.getByTitle(/analyse et les notes/i)).toHaveCount(0)

    const shadedCells = page.locator("table tbody td.bg-slate-50")
    await expect(shadedCells.first()).toBeVisible({ timeout: 10000 })
    expect(await shadedCells.count()).toBeGreaterThan(1)

    await expect(page.locator("table thead th.bg-slate-50").first()).toBeVisible()
  })
})

test.describe("Pro forma cash flow", () => {
  test("summary shades the first forecast year column with projection year headers", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await openProFormaCashFlow(page, "summary")

    await expect(page.getByText("Variation de trésorerie").first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator("table thead th").filter({ hasText: "2027" }).first()).toBeVisible()
    await expect(page.locator("table thead th").filter({ hasText: "2028" }).first()).toBeVisible()
    await expect(page.locator("table thead th.bg-slate-50").first()).toBeVisible()
    expect(await page.locator("table tbody td.bg-slate-50").count()).toBeGreaterThan(1)
  })

  test("detail shades the first forecast year column with projection year headers", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await openProFormaCashFlow(page, "detail")

    await expect(page.getByText("Variation de trésorerie").first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator("table thead th").filter({ hasText: "2027" }).first()).toBeVisible()
    await expect(page.locator("table thead th").filter({ hasText: "2028" }).first()).toBeVisible()
    await expect(page.locator("table thead th.bg-slate-50").first()).toBeVisible()
    expect(await page.locator("table tbody td.bg-slate-50").count()).toBeGreaterThan(1)
    await expect(page.getByText(/Les données affichées sont à titre informatif/i)).toBeVisible()
  })
})
