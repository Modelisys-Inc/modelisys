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
/** Soldes distincts : N-1 = déc. 2025 (1 800), YTD = mars 2026 (250) — pas des cumuls. */
const ASSET_AMOUNTS = monthlyAmounts(2024, 2026, (year, month) => {
  if (year === 2025 && month === 12) return 1800
  if (year === 2026 && month === 3) return 250
  if (year === 2026 && month === 12) return 900
  return year === 2025 ? 1000 : 40
})

async function setupProFormaBalanceSheet(page: Page, startMonth: number) {
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
        structure: [{ label: "Total des actifs", linkCode: "ACT", liaisonMode: "single", isBold: true }],
      }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          periods: PERIODS,
          rows: [
            {
              id: "ACT",
              label: "Total des actifs",
              isBold: true,
              isSection: false,
              isResult: false,
              linkCode: "ACT",
              amounts: ASSET_AMOUNTS,
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
        rows: [{ id: "act", label: "Total des actifs", current: 0, prior: 0, isBold: true }],
      }),
    })
  })
}

async function openProFormaBilan(page: Page, section: "summary" | "detail") {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
  await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Bilan", exact: true }).click()
  if (section === "summary") {
    await page.getByRole("button", { name: "Sommaire", exact: true }).click()
  } else {
    await page.getByRole("button", { name: "Détail", exact: true }).click()
  }
}

test.describe("Pro forma Bilan N-1 and YTD", () => {
  test("summary shows closing N-1 then YTD snapshot when the reference is mid-year", async ({ page }) => {
    test.setTimeout(60_000)
    await setupProFormaBalanceSheet(page, 3)
    await openProFormaBilan(page, "summary")

    await expect(page.getByText("Total des actifs").first()).toBeVisible({ timeout: 15000 })
    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: /^2025$/ })).toBeVisible()
    await expect(headers.filter({ hasText: "YTD 2026" })).toBeVisible()
    await expect(headers.filter({ hasText: /^2026$/ })).toBeVisible()

    const assetsRow = page.locator("table tbody tr").filter({ hasText: "Total des actifs" }).first()
    const cells = assetsRow.locator("td")
    await expect(cells.nth(1)).toHaveText(/1[\s\u00a0]?800/)
    await expect(cells.nth(2)).toHaveText(/250/)

    await expect(page.locator("table thead th.bg-slate-50")).toHaveCount(2)
  })

  test("detail uses the same N-1 and YTD snapshots as summary", async ({ page }) => {
    test.setTimeout(60_000)
    await setupProFormaBalanceSheet(page, 3)
    await openProFormaBilan(page, "detail")

    await expect(page.getByText("Total des actifs").first()).toBeVisible({ timeout: 15000 })
    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: /^2025$/ })).toBeVisible()
    await expect(headers.filter({ hasText: "YTD 2026" })).toBeVisible()
    await expect(headers.filter({ hasText: /^2026$/ })).toBeVisible()

    const assetsRow = page.locator("table tbody tr").filter({ hasText: "Total des actifs" }).first()
    const cells = assetsRow.locator("td")
    await expect(cells.nth(1)).toHaveText(/1[\s\u00a0]?800/)
    await expect(cells.nth(2)).toHaveText(/250/)
  })

  test("omits the YTD stub when the reference date is the fiscal year-end", async ({ page }) => {
    test.setTimeout(60_000)
    await setupProFormaBalanceSheet(page, 12)
    await openProFormaBilan(page, "summary")

    await expect(page.getByText("Total des actifs").first()).toBeVisible({ timeout: 15000 })
    const headers = page.locator("table thead th")
    await expect(headers.filter({ hasText: /^2025$/ })).toBeVisible()
    await expect(headers.filter({ hasText: /^2026$/ })).toBeVisible()
    await expect(headers.filter({ hasText: "YTD 2026" })).toHaveCount(0)

    const assetsRow = page.locator("table tbody tr").filter({ hasText: "Total des actifs" }).first()
    await expect(assetsRow.locator("td").nth(1)).toHaveText(/1[\s\u00a0]?800/)

    await expect(page.locator("table thead th.bg-slate-50")).toHaveCount(1)
  })
})
