import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"

const FRENCH_MONTH_ABBREVS = [
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
        label: `${FRENCH_MONTH_ABBREVS[month - 1]} ${year}`,
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
    id: "CMV.1",
    label: "Stocks au début",
    linkCode: "CMV.1",
    liaisonMode: "single",
    detailOnly: true,
    hidden: true,
    defineMapping: false,
    showInDetail: false,
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
  {
    label: "Perte (gain) sur cession d'immobilisations",
    linkCode: "AUT.3",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "E",
  },
]

async function setupAuth(
  page: Page,
  projectionMode: "gl" | "account" = "gl",
  forecastConfigData: Record<string, unknown> | null = null,
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
            projection_mode: projectionMode,
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

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    if (route.request().method() === "GET" && forecastConfigData) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configs: [
            {
              id: "cfg1",
              config_type: "income-statement-detail",
              data: forecastConfigData,
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
    if (route.request().method() === "GET") {
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
        id: "cfg1",
        config_type: "income-statement-detail",
        data: forecastConfigData ?? {},
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
              id: "REV",
              label: "Revenus",
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
              id: "cmv",
              label: "Coûts des produits vendus",
              hasLiaisonCode: true,
              annexLetter: "B",
              amounts: expenseAmount(-80_000),
              detailRows: [],
            },
            {
              id: "CMV.2",
              label: "Achats",
              hasLiaisonCode: true,
              amounts: expenseAmount(-80_000),
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
    await expect(page.getByText("Perte (gain) sur cession d'immobilisations")).toHaveCount(0)
  })

  test("lists Annexe B detail posts even when sub-lines have no annexLetter", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)
    await openProFormaExpenses(page)

    await expect(page.getByText("Achats").first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Sous-total — Annexe B/i)).toBeVisible()
    await expect(page.getByText("Stocks au début")).toHaveCount(0)
  })

  test("greys reference year fully and blanks annex title amounts / % CA", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)
    await openProFormaExpenses(page)

    await expect(page.getByText(/Sous-total — Annexe B/i)).toBeVisible({ timeout: 15000 })

    const annexTitleRow = page.locator("tr", { hasText: /Annexe B/ }).filter({ hasNotText: /Sous-total/ }).first()
    await expect(annexTitleRow).toBeVisible()
    const annexPctCells = annexTitleRow.getByTestId("expense-year-pct-ca")
    expect(await annexPctCells.count()).toBeGreaterThanOrEqual(1)
    for (let i = 0; i < (await annexPctCells.count()); i++) {
      await expect(annexPctCells.nth(i)).toHaveText(/^\s*$/)
    }
    const firstYearAmount = annexTitleRow.locator("td.min-w-\\[8rem\\]").first()
    await expect(firstYearAmount).toHaveText(/^\s*$/)

    const subtotalRow = page.locator("tr", { hasText: /Sous-total — Annexe B/i }).first()
    const subtotalRefAmount = subtotalRow.locator("td.min-w-\\[8rem\\].bg-slate-50").first()
    await expect(subtotalRefAmount).toBeVisible()
    await expect(subtotalRefAmount).toHaveClass(/text-slate-400/)
    await expect(subtotalRefAmount).not.toHaveClass(/text-slate-900/)

    const refYearHeader = page.locator("table thead th.bg-slate-50").first()
    await expect(refYearHeader).toHaveClass(/text-slate-400/)
  })

  test("shows % CA beside each year and hides the % des revenus toggle", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)
    await openProFormaExpenses(page)

    await expect(page.getByText("Achats").first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: "% des revenus" })).toHaveCount(0)
    const pctHeaders = page.getByTestId("expense-year-pct-ca-header")
    await expect(pctHeaders.first()).toBeVisible()
    expect(await pctHeaders.count()).toBeGreaterThanOrEqual(2)
    await expect(page.getByTestId("expense-year-group-start").first()).toBeVisible()
    expect(await page.getByTestId("expense-year-group-start").count()).toBeGreaterThanOrEqual(1)

    const achatsRow = page.locator("tr", { hasText: "Achats" }).first()
    await expect(achatsRow.getByTestId("expense-year-pct-ca").first()).toHaveText(/\d+\.\d+%/)
  })

  test("hides Sommaire and Décaissement; seasonality shows monthly Dépenses amounts", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page, "account")
    await openProFormaExpenses(page)

    const achatsRow = page.locator("tr", { hasText: "Achats" }).first()
    await expect(achatsRow).toBeVisible({ timeout: 15000 })
    await achatsRow.locator("td").nth(5).click()

    await expect(page.getByRole("tab", { name: "Ajustement" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Saisonnalité" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Sommaire" })).toHaveCount(0)
    await expect(page.getByRole("tab", { name: "Décaissement" })).toHaveCount(0)

    await page.getByRole("tab", { name: "Saisonnalité" }).click()
    await expect(page.getByTestId("forecast-seasonality-amount-row")).toContainText("Dépenses")
    await expect(page.getByText("Sommaire des dépenses mensuellement")).toHaveCount(0)
  })

  test("seasonality has no pre-revenue option or revenue-post picker", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page, "account")
    await openProFormaExpenses(page)

    const achatsRow = page.locator("tr", { hasText: "Achats" }).first()
    await expect(achatsRow).toBeVisible({ timeout: 15000 })
    await achatsRow.locator("td").nth(5).click()

    await page.getByRole("tab", { name: "Saisonnalité" }).click()
    await expect(
      page.getByText(/suit les revenus totaux projetés/)
    ).toBeVisible()
    await expect(page.getByText("Dépenses effectuées avant la réalisation des revenus")).toHaveCount(0)
    await expect(page.getByText("Variation en fonction des revenus")).toHaveCount(0)
    await expect(page.getByText("Total revenus (estimation globale)")).toHaveCount(0)
    await expect(page.getByTestId("forecast-seasonality-amount-row")).toContainText("Dépenses")
  })

  test("variable expense seasonality defaults to total revenue seasonality", async ({ page }) => {
    test.setTimeout(60_000)
    const peakedSeasonality = [28, 8, 8, 8, 8, 8, 6, 6, 6, 6, 4, 4]
    await setupAuth(page, "account", {
      expenseTypes: { "CMV.2": "variable" },
      variableRates: { "CMV.2": 40 },
      revenueAdjustments: {
        "REV-1": [
          {
            id: "rev-hyp-1",
            type: "amount",
            value: 600_000,
            note: "",
            seasonalityMonthPercents: peakedSeasonality,
          },
        ],
      },
      expenseAdjustments: {},
      revenueValues: {},
    })
    await openProFormaExpenses(page)

    const achatsRow = page.locator("tr", { hasText: "Achats" }).first()
    await expect(achatsRow).toBeVisible({ timeout: 15000 })
    await expect(achatsRow.getByText("Variable", { exact: true })).toBeVisible()
    await achatsRow.locator("td").nth(5).click()

    await page.getByRole("tab", { name: "Saisonnalité" }).click()
    const january = page.getByLabel("Pourcentage pour Janvier")
    await expect(january).toBeVisible()
    await expect.poll(async () => Number(await january.inputValue())).toBe(28)
    await expect(page.getByTestId("forecast-seasonality-legend")).toContainText("Revenus totaux")
  })

  test("variable expense amount adjustment shows month distribution and hides recurring", async ({
    page,
  }) => {
    test.setTimeout(60_000)
    await setupAuth(page, "account", {
      expenseTypes: { "CMV.2": "variable" },
      variableRates: { "CMV.2": 0.3 },
      expenseAdjustments: {},
      revenueAdjustments: {},
      revenueValues: {},
    })
    await openProFormaExpenses(page)

    const achatsRow = page.locator("tr", { hasText: "Achats" }).first()
    await expect(achatsRow).toBeVisible({ timeout: 15000 })
    await achatsRow.locator("td").nth(5).click()

    await page.getByRole("tab", { name: "Ajustement" }).click()
    await expect(page.getByText("Type d'ajustement")).toBeVisible()
    // Montant ($) is the default for a new adjustment
    await expect(page.getByTestId("expense-amount-month-distribution")).toBeVisible()
    await expect(page.getByText("Répartition de l'ajustement par mois")).toBeVisible()
    await expect(page.getByText("Récurrence")).toHaveCount(0)
    await expect(page.getByRole("option", { name: "Récurrent" })).toHaveCount(0)

    await page.getByTestId("forecast-seasonality-zero-all").click()
    const januaryAdj = page.getByLabel("Pourcentage pour Janvier")
    await expect.poll(async () => Number(await januaryAdj.inputValue())).toBe(0)
    await januaryAdj.fill("100")
    await expect.poll(async () => Number(await januaryAdj.inputValue())).toBe(100)
    await expect(page.getByText(/Total des pourcentages : 100/)).toBeVisible()

    // Switch to % des revenus → Récurrence + mois
    await page.getByRole("combobox").filter({ hasText: "Montant ($)" }).click()
    await page.getByRole("option", { name: "Pourcentage des revenus (%)" }).click()
    await expect(page.getByTestId("expense-amount-month-distribution")).toHaveCount(0)
    await expect(page.getByText("Récurrence")).toBeVisible()
    await expect(page.getByTestId("variable-pct-active-months")).toBeVisible()

    await page.getByRole("combobox").filter({ hasText: "Non récurrent" }).click()
    await page.getByRole("option", { name: "Récurrent", exact: true }).click()
    await expect(page.getByTestId("variable-pct-active-months")).toHaveCount(0)
    await expect(page.getByTestId("variable-pct-start-month")).toBeVisible()
    await expect(page.getByText(/Mois de début/)).toBeVisible()
  })

  test("variable expense can combine percentage and amount adjustments", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuth(page, "account", {
      expenseTypes: { "CMV.2": "variable" },
      variableRates: { "CMV.2": 10 },
      expenseAdjustments: {
        "CMV.2-1": [
          {
            id: "adj-pct",
            rowId: "CMV.2",
            yearIndex: 1,
            type: "percentage",
            percentage: 12,
            isRecurring: true,
            startMonth: 0,
            note: "Hausse taux",
          },
          {
            id: "adj-amt",
            rowId: "CMV.2",
            yearIndex: 1,
            type: "amount",
            amount: 50_000,
            isRecurring: false,
            amountMonthPercents: [0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0, 0],
            note: "Voiture",
          },
        ],
      },
      revenueAdjustments: {},
      revenueValues: {},
    })
    await openProFormaExpenses(page)

    const achatsRow = page.locator("tr", { hasText: "Achats" }).first()
    await expect(achatsRow).toBeVisible({ timeout: 15000 })
    await achatsRow.locator("td").nth(5).click()

    await page.getByRole("tab", { name: "Ajustement" }).click()
    const existing = page.getByText("Ajustements existants").locator("..")
    await expect(existing.getByText("Hausse taux")).toBeVisible()
    await expect(existing.getByText("Voiture")).toBeVisible()
    await expect(existing.getByText("12.0%")).toBeVisible()
    await expect(existing.getByText(/50[\s\u00a0]?000/)).toBeVisible()

    await page.getByRole("tab", { name: "Saisonnalité" }).click()
    await expect(page.getByTestId("forecast-seasonality-legend")).toContainText("Sans ajustement")
    await expect(page.getByTestId("forecast-seasonality-legend")).toContainText("Avec ajustement")
    await expect(page.getByTestId("forecast-seasonality-amount-row")).toContainText("Dépenses")
    await expect(page.getByTestId("forecast-seasonality-adjustment-row")).toContainText("Ajustement")
    await expect(page.getByTestId("forecast-seasonality-with-adjustment-row")).toContainText(
      "Dépenses avec ajustement"
    )
    // Octobre = 50k$ + effet du % (12 % vs 10 %) sur le CA du mois
    await expect(page.getByTestId("forecast-seasonality-adjustment-row")).toContainText(
      /60[\s\u00a0]?080/
    )
  })

  test("variable expense percentage adjustment by months impacts seasonality", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuth(page, "account", {
      expenseTypes: { "CMV.2": "variable" },
      variableRates: { "CMV.2": 10 },
      expenseAdjustments: {
        "CMV.2-1": [
          {
            id: "adj-pct-q4",
            rowId: "CMV.2",
            yearIndex: 1,
            type: "percentage",
            percentage: 20,
            isRecurring: false,
            activeMonths: [
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              false,
              true,
              true,
              true,
            ],
            note: "Hausse fin d'année",
          },
        ],
      },
      revenueAdjustments: {},
      revenueValues: {},
    })
    await openProFormaExpenses(page)

    const achatsRow = page.locator("tr", { hasText: "Achats" }).first()
    await expect(achatsRow).toBeVisible({ timeout: 15000 })
    await achatsRow.locator("td").nth(5).click()

    await page.getByRole("tab", { name: "Saisonnalité" }).click()
    await expect(page.getByTestId("forecast-seasonality-legend")).toContainText("Sans ajustement")
    await expect(page.getByTestId("forecast-seasonality-legend")).toContainText("Avec ajustement")
    await expect(page.getByTestId("forecast-seasonality-amount-row")).toContainText("Dépenses")
    await expect(page.getByTestId("forecast-seasonality-adjustment-row")).toContainText("Ajustement")
    await expect(page.getByTestId("forecast-seasonality-with-adjustment-row")).toContainText(
      "Dépenses avec ajustement"
    )
    // Oct–Déc : écart positif (taux 20 % vs 10 %) ; Jan devrait être ~0 d'ajustement %
    const adjRow = page.getByTestId("forecast-seasonality-adjustment-row")
    await expect(adjRow).toBeVisible()
  })
})
