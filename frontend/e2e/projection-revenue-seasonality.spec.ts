import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"

const FR_MONTH = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]

function buildMonthlyPeriods(fromYear: number, toYear: number) {
  const periods: { fiscalYear: number; fiscalMonth: number; label: string }[] = []
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${FR_MONTH[month - 1]} ${year}`,
      })
    }
  }
  return periods
}

function seasonalRevenueAmounts(fromYear: number, toYear: number) {
  const amounts: Record<string, number> = {}
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2024) {
        amounts[`${year}-${month}`] = month === 1 ? 300 : 100
      } else if (year === 2025) {
        amounts[`${year}-${month}`] = 100
      } else {
        amounts[`${year}-${month}`] = 0
      }
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

async function setupAuth(
  page: Page,
  revenueAmount: Record<string, number> = seasonalRevenueAmounts(2023, 2026),
) {
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
          companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [], fiscal_year_end: "12-31" }],
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
            start_year: 2026,
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

  const periods = buildMonthlyPeriods(2023, 2026)

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "income-statement",
          fiscalYear: 2025,
          periods,
          rows: [
            {
              id: "section-revenus",
              label: "REVENUS",
              isSection: true,
              amounts: {},
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

async function openRevenueSeasonality(page: Page, yearIndex: number) {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
  await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
  await expect(page.getByRole("button", { name: "Revenus", exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.getByRole("button", { name: "Revenus", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Estimation des revenus annuels" })).toBeVisible({
    timeout: 15000,
  })
  const row = page.locator("tr", { hasText: "Total Revenus" }).first()
  await expect(row).toBeVisible({ timeout: 15000 })
  await row.locator("td").nth(1 + yearIndex * 2).click()
  await page.getByRole("tab", { name: "Saisonnalité" }).click()
}

test.describe("Projection revenue seasonality actual years", () => {
  test("shows 2024, 2025 and projection legend with average default", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuth(page)
    await openRevenueSeasonality(page, 1)

    const legend = page.getByTestId("forecast-seasonality-legend")
    await expect(legend).toBeVisible()
    await expect(legend.getByText("2024", { exact: true })).toBeVisible()
    await expect(legend.getByText("2025", { exact: true })).toBeVisible()
    await expect(legend.getByText("Projection", { exact: true })).toBeVisible()

    const january = page.getByLabel("Pourcentage pour Janvier")
    await expect(january).toBeVisible()
    await expect.poll(async () => Number(await january.inputValue())).toBeGreaterThan(10)
    await expect(page.getByTestId("forecast-seasonality-amount-row")).toContainText("Revenus")

    const applyPreset = page.getByTestId("apply-seasonality-preset")
    await expect(applyPreset).toHaveText(/Saisonnalité moyenne/)

    await applyPreset.click()
    await page.getByRole("menuitemradio", { name: "Saisonnalité 2024" }).click()
    await expect(page.getByRole("menuitemradio", { name: "Saisonnalité 2024" })).toHaveCount(0)
    await expect.poll(async () => Number(await january.inputValue())).toBeGreaterThan(15)
    await expect(applyPreset).toHaveText(/Saisonnalité 2024/)

    await applyPreset.click()
    await page.getByRole("menuitemradio", { name: "Saisonnalité 2025" }).click()
    await expect(page.getByRole("menuitemradio", { name: "Saisonnalité 2025" })).toHaveCount(0)
    await expect.poll(async () => Number(await january.inputValue())).toBeLessThan(12)
    await expect(applyPreset).toHaveText(/Saisonnalité 2025/)

    await applyPreset.click()
    await page.getByRole("menuitemradio", { name: "Saisonnalité moyenne (2024/2025)" }).click()
    await expect.poll(async () => Number(await january.inputValue())).toBeGreaterThan(10)
    await expect(applyPreset).toHaveText(/Saisonnalité moyenne/)
  })

  test("keeps 2024 and 2025 overlays when editing a later projection year", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)
    await openRevenueSeasonality(page, 2)

    const legend = page.getByTestId("forecast-seasonality-legend")
    await expect(legend.getByText("2024", { exact: true })).toBeVisible()
    await expect(legend.getByText("2025", { exact: true })).toBeVisible()
    await expect(legend.getByText("Projection", { exact: true })).toBeVisible()
  })

  test("keeps average selectable when it matches a single actual year", async ({ page }) => {
    test.setTimeout(90_000)
    const amounts: Record<string, number> = {}
    for (let year = 2023; year <= 2026; year++) {
      for (let month = 1; month <= 12; month++) {
        amounts[`${year}-${month}`] = year === 2025 ? (month === 1 ? 300 : 100) : 0
      }
    }
    await setupAuth(page, amounts)
    await openRevenueSeasonality(page, 1)

    const applyPreset = page.getByTestId("apply-seasonality-preset")
    await expect(applyPreset).toHaveText(/Saisonnalité moyenne/)

    await applyPreset.click()
    await page.getByRole("menuitemradio", { name: "Saisonnalité 2025" }).click()
    await expect(page.getByRole("menuitemradio", { name: "Saisonnalité 2025" })).toHaveCount(0)
    await expect(applyPreset).toHaveText(/Saisonnalité 2025/)

    await applyPreset.click()
    await page.getByRole("menuitemradio", { name: /Saisonnalité moyenne/ }).click()
    await expect(applyPreset).toHaveText(/Saisonnalité moyenne/)
  })
})
