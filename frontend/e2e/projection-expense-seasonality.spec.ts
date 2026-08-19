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

function seasonalExpenseAmounts(fromYear: number, toYear: number) {
  const amounts: Record<string, number> = {}
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      if (year === 2024) {
        amounts[`${year}-${month}`] = month === 1 ? -300 : -100
      } else if (year === 2025) {
        amounts[`${year}-${month}`] = -100
      } else {
        amounts[`${year}-${month}`] = year < 2026 ? -100 : 0
      }
    }
  }
  return amounts
}

const INCOME_STRUCTURE = [
  { label: "REVENUS", isSection: true },
  {
    label: "Revenus",
    linkCode: "REV",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "revenus",
  },
  { label: "", isSection: true },
  { label: "DÉPENSES", isSection: true },
  {
    id: "cmv",
    label: "Coûts des produits vendus",
    linkCode: "CMV",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "B",
  },
  {
    id: "CMV.2",
    label: "Achats",
    linkCode: "CMV.2",
    liaisonMode: "single",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "",
  },
]

async function setupAuth(
  page: Page,
  expenseAmounts: Record<string, number> = seasonalExpenseAmounts(2023, 2026),
  forecastExtra: Record<string, unknown> = {},
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
            projection_mode: "account",
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

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configs: [
            {
              id: "cfg1",
              config_type: "income-statement-detail",
              data: {
                expenseTypes: { "CMV.2": "fixe" },
                variableRates: {},
                inflationRate: 2,
                revenueValues: {},
                expenseAdjustments: {},
                revenueAdjustments: {},
                ...forecastExtra,
              },
              company_id: COMPANY_ID,
              division_id: null,
              sub_division_id: null,
              projection_id: PROJECTION_ID,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "cfg1",
        config_type: "income-statement-detail",
        data: {},
        company_id: COMPANY_ID,
        division_id: null,
        sub_division_id: null,
        projection_id: PROJECTION_ID,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }),
    })
  })

  await page.route(`**/api/standard-link-codes/flat**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  )

  const periods = buildMonthlyPeriods(2023, 2026)
  const flatRevenue: Record<string, number> = {}
  for (let year = 2023; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      flatRevenue[`${year}-${month}`] = year < 2026 ? 500_000 : 0
    }
  }

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
              id: "REV",
              label: "Revenus",
              hasLiaisonCode: true,
              amounts: flatRevenue,
              detailRows: [],
            },
            {
              id: "section-depenses",
              label: "DÉPENSES",
              isSection: true,
              amounts: {},
              detailRows: [],
            },
            {
              id: "cmv",
              label: "Coûts des produits vendus",
              hasLiaisonCode: true,
              annexLetter: "B",
              amounts: expenseAmounts,
              detailRows: [],
            },
            {
              id: "CMV.2",
              label: "Achats",
              hasLiaisonCode: true,
              amounts: expenseAmounts,
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

async function openFixedExpenseSeasonality(page: Page, yearIndex: number) {
  await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
  await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
  await expect(page.getByRole("button", { name: "Dépenses", exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.getByRole("button", { name: "Dépenses", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Estimation des dépenses annuelles" })).toBeVisible({
    timeout: 15000,
  })
  const row = page.locator("tr", { hasText: "Achats" }).first()
  await expect(row).toBeVisible({ timeout: 15000 })
  await expect(row.getByText("Fixe", { exact: true })).toBeVisible({ timeout: 15000 })
  // Compte, Type, Taux, then year/% CA pairs ; N-1 inséré en tête (start_month ≠ clôture).
  await row.locator("td").nth(3 + (yearIndex + 1) * 2).click()
  await page.getByRole("tab", { name: "Saisonnalité" }).click()
}

test.describe("Projection fixed expense seasonality actual years", () => {
  test("shows 2024, 2025 overlays, Dépenses amounts and average preset", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuth(page)
    await openFixedExpenseSeasonality(page, 1)

    await expect(page.getByRole("tab", { name: "Sommaire" })).toHaveCount(0)
    await expect(page.getByTestId("forecast-seasonality-amount-row")).toContainText("Dépenses")

    const legend = page.getByTestId("forecast-seasonality-legend")
    await expect(legend).toBeVisible()
    await expect(legend.getByText("2024", { exact: true })).toBeVisible()
    await expect(legend.getByText("2025", { exact: true })).toBeVisible()
    await expect(legend.getByText("Dépense", { exact: true })).toBeVisible()

    const january = page.getByLabel("Pourcentage pour Janvier")
    await expect(january).toBeVisible()
    await expect.poll(async () => Number(await january.inputValue())).toBeGreaterThan(10)

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

  test("fixed expense amount adjustment shows month distribution and impacts seasonality", async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await setupAuth(page, seasonalExpenseAmounts(2023, 2026), {
      expenseAdjustments: {
        "CMV.2-1": [
          {
            id: "adj-fixe-oct",
            rowId: "CMV.2",
            yearIndex: 1,
            type: "amount",
            amount: 50_000,
            isRecurring: false,
            amountMonthPercents: [0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0],
            note: "Prime octobre",
          },
        ],
      },
    })
    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Dépenses", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Estimation des dépenses annuelles" })).toBeVisible({
      timeout: 15000,
    })

    const row = page.locator("tr", { hasText: "Achats" }).first()
    await expect(row.getByText("Fixe", { exact: true })).toBeVisible({ timeout: 15000 })
    await row.locator("td").nth(5).click()

    await page.getByRole("tab", { name: "Ajustement" }).click()
    await expect(page.getByText("Prime octobre")).toBeVisible()
    await expect(page.getByTestId("expense-amount-month-distribution")).toBeVisible()
    await expect(page.getByText("Récurrence")).toBeVisible()
    await expect(page.getByTestId("forecast-seasonality-zero-all")).toBeVisible()

    await page.getByRole("combobox").filter({ hasText: "Non récurrent" }).click()
    await page.getByRole("option", { name: "Récurrent", exact: true }).click()
    await expect(page.getByTestId("expense-amount-month-distribution")).toHaveCount(0)
    await expect(page.getByTestId("fixed-amount-start-month")).toBeVisible()
    await expect(page.getByText(/Mois de début/)).toBeVisible()

    await page.getByRole("tab", { name: "Saisonnalité" }).click()
    await expect(page.getByTestId("forecast-seasonality-legend")).toContainText("Sans ajustement")
    await expect(page.getByTestId("forecast-seasonality-legend")).toContainText("Avec ajustement")
    await expect(page.getByTestId("forecast-seasonality-amount-row")).toContainText("Dépenses")
    await expect(page.getByTestId("forecast-seasonality-adjustment-row")).toContainText("Ajustement")
    await expect(page.getByTestId("forecast-seasonality-with-adjustment-row")).toContainText(
      "Dépenses avec ajustement"
    )
    await expect(page.getByTestId("forecast-seasonality-adjustment-row")).toContainText(
      /50[\s\u00a0]?000/
    )
  })

  test("fixed expense inflation shows month pickers for non-recurring and start month for recurring", async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await setupAuth(page)
    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Dépenses", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Estimation des dépenses annuelles" })).toBeVisible({
      timeout: 15000,
    })

    const row = page.locator("tr", { hasText: "Achats" }).first()
    await expect(row.getByText("Fixe", { exact: true })).toBeVisible({ timeout: 15000 })
    await row.locator("td").nth(5).click()

    await page.getByRole("tab", { name: "Ajustement" }).click()
    await page.getByRole("combobox").filter({ hasText: "Montant ($)" }).click()
    await page.getByRole("option", { name: "Taux d'inflation (%)" }).click()
    await expect(page.getByText("Récurrence")).toBeVisible()
    await expect(page.getByTestId("fixed-inflation-active-months")).toBeVisible()

    await page.getByRole("combobox").filter({ hasText: "Non récurrent" }).click()
    await page.getByRole("option", { name: "Récurrent", exact: true }).click()
    await expect(page.getByTestId("fixed-inflation-active-months")).toHaveCount(0)
    await expect(page.getByTestId("fixed-inflation-start-month")).toBeVisible()
    await expect(page.getByText(/Mois de début/)).toBeVisible()
  })
})
