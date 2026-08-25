import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"

function buildMonthlyPeriods(fromYear: number, toYear: number) {
  const abbrevs = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"]
  const periods: { fiscalYear: number; fiscalMonth: number; label: string }[] = []
  for (let year = fromYear; year <= toYear; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({ fiscalYear: year, fiscalMonth: month, label: `${abbrevs[month - 1]} ${year}` })
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

const PERIODS = buildMonthlyPeriods(2023, 2026)

const STRUCTURE = [
  {
    label: "Revenus",
    linkCode: "REV",
    liaisonMode: "single",
    isBold: true,
    isSection: true,
    defineMapping: true,
    showInDetail: true,
    posteNature: "revenus",
    annexLetter: "A",
  },
  {
    id: "REV-A.1",
    label: "REV-A.1",
    linkCode: "REV-A.1",
    liaisonMode: "single",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "A",
  },
  {
    id: "REV-A.2",
    label: "REV-A.2",
    linkCode: "REV-A.2",
    liaisonMode: "single",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "A",
  },
  {
    label: "Coût des produits vendus",
    linkCode: "CMV",
    liaisonMode: "single",
    isBold: false,
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
    annexLetter: "B",
  },
  {
    id: "CMV.3",
    label: "Main-d'œuvre",
    linkCode: "CMV.3",
    liaisonMode: "single",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "B",
  },
  { label: "Bénéfice brut", isBold: true, isResult: true, formula: ["+REV", "-CMV"] },
  { label: "", isBold: false },
  { label: "Charges d'exploitation", isBold: true, isSection: true },
  {
    label: "Salaires",
    linkCode: "EXP.1",
    liaisonMode: "single",
    isBold: false,
    defineMapping: true,
    showInDetail: true,
    posteNature: "depenses",
    annexLetter: "C",
  },
  { label: "Total des charges", isBold: true, isResult: true, formula: ["+CMV", "+EXP.1"] },
  { label: "Bénéfice avant impôts", isBold: true, isResult: true },
  {
    label: "Impôts (26%)",
    linkCode: "IMP",
    liaisonMode: "single",
    isBold: false,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "F",
  },
  {
    id: "IMP.1",
    label: "Exigibles",
    linkCode: "IMP.1",
    liaisonMode: "single",
    detailOnly: true,
    defineMapping: true,
    showInDetail: true,
    annexLetter: "F",
  },
  { label: "Bénéfice net", isBold: true, isResult: true, isNetIncome: true },
  { label: "BAIIA", isBold: true, isResult: true, formula: ["+REV", "-CMV", "-EXP.1"] },
]

const SERIES_ROWS = [
  {
    id: "REV", label: "Revenus", linkCode: "REV",
    isBold: true, isSection: true, isResult: false,
    amounts: monthlyAmounts(2023, 2026, { 2023: 100, 2024: 120, 2025: 140, 2026: 15 }),
    detailRows: [],
  },
  {
    id: "REV-A.1", label: "REV-A.1", linkCode: "REV-A.1",
    isBold: false, isSection: false, isResult: false, detailOnly: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 60, 2024: 70, 2025: 80, 2026: 8 }),
    detailRows: [],
  },
  {
    id: "REV-A.2", label: "REV-A.2", linkCode: "REV-A.2",
    isBold: false, isSection: false, isResult: false, detailOnly: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 40, 2024: 50, 2025: 60, 2026: 7 }),
    detailRows: [],
  },
  {
    id: "CMV", label: "Coût des produits vendus", linkCode: "CMV",
    isBold: false, isSection: false, isResult: false,
    amounts: monthlyAmounts(2023, 2026, { 2023: 40, 2024: 50, 2025: 55, 2026: 6 }),
    detailRows: [],
  },
  {
    id: "CMV.2", label: "Achats", linkCode: "CMV.2",
    isBold: false, isSection: false, isResult: false, detailOnly: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 25, 2024: 30, 2025: 35, 2026: 4 }),
    detailRows: [],
  },
  {
    id: "CMV.3", label: "Main-d'œuvre", linkCode: "CMV.3",
    isBold: false, isSection: false, isResult: false, detailOnly: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 15, 2024: 20, 2025: 20, 2026: 2 }),
    detailRows: [],
  },
  {
    id: "gross-profit", label: "Bénéfice brut",
    isBold: true, isSection: false, isResult: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 60, 2024: 70, 2025: 85, 2026: 9 }),
    detailRows: [],
  },
  {
    id: "charges-exploitation", label: "Charges d'exploitation",
    isBold: true, isSection: true, isResult: false,
    amounts: monthlyAmounts(2023, 2026, {}),
    detailRows: [],
  },
  {
    id: "EXP.1", label: "Salaires", linkCode: "EXP.1",
    isBold: false, isSection: false, isResult: false,
    amounts: monthlyAmounts(2023, 2026, { 2023: 20, 2024: 25, 2025: 30, 2026: 3 }),
    detailRows: [],
  },
  {
    id: "total-charges", label: "Total des charges",
    isBold: true, isSection: false, isResult: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 60, 2024: 75, 2025: 85, 2026: 9 }),
    detailRows: [],
  },
  {
    id: "ebt", label: "Bénéfice avant impôts",
    isBold: true, isSection: false, isResult: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 40, 2024: 45, 2025: 55, 2026: 6 }),
    detailRows: [],
  },
  {
    id: "IMP", label: "Impôts (26%)", linkCode: "IMP",
    isBold: false, isSection: false, isResult: false,
    amounts: monthlyAmounts(2023, 2026, { 2023: 10, 2024: 12, 2025: 14, 2026: 1 }),
    detailRows: [],
  },
  {
    id: "IMP.1", label: "Exigibles", linkCode: "IMP.1",
    isBold: false, isSection: false, isResult: false, detailOnly: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 10, 2024: 12, 2025: 14, 2026: 1 }),
    detailRows: [],
  },
  {
    id: "net-income", label: "Bénéfice net",
    isBold: true, isSection: false, isResult: true, isNetIncome: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 30, 2024: 33, 2025: 41, 2026: 5 }),
    detailRows: [],
  },
  {
    id: "baiia", label: "BAIIA",
    isBold: true, isSection: false, isResult: true,
    amounts: monthlyAmounts(2023, 2026, { 2023: 40, 2024: 45, 2025: 55, 2026: 6 }),
    detailRows: [],
  },
]

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([{ name: "has_session", value: "1", url: "http://localhost:3000" }])

  await page.route("**/api/**", async (route) => {
    if (route.request().url().includes("/api/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    }
    return route.continue()
  })

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "a@e.com", full_name: "A", is_active: true, is_superadmin: false, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ access_token: "fake-access-token", refresh_token: "fake-refresh-token" }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "admin" }]),
    }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          companies: [{ id: COMPANY_ID, name: "Test Co", fiscal_year_end: "12-31", currency: "CAD", divisions: [] }],
        }),
      })
    }
    return route.continue()
  })

  const projection = {
    id: PROJECTION_ID, name: "Scénario test", projection_years: 5,
    projection_mode: "account", projection_horizon: "annual",
    start_year: 2026, start_month: 8,
    company_id: COMPANY_ID, division_id: null, sub_division_id: null,
    created_by_id: "u1", adjustments: [], loans: [],
    created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  }

  await page.route(`**/api/companies/${COMPANY_ID}/projections**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ projections: [projection], ...projection }),
      })
    }
    return route.continue()
  })

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    const url = route.request().url()
    if (url.includes("tax-forecast")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configs: [
            {
              id: "fc-tax",
              config_type: "tax-forecast",
              data: { taxRate: 20, taxPaymentFrequency: "annual" },
            },
          ],
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
              revenueAdjustments: {
                "REV-A.1-1": [{ id: "r1", type: "amount", value: 200 }],
                "REV-A.2-1": [{ id: "r2", type: "amount", value: 150 }],
              },
              expenseTypes: { "CMV.2": "variable", "CMV.3": "variable", "EXP.1": "variable" },
              variableRates: { "CMV.2": 20, "CMV.3": 20, "EXP.1": 10 },
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

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/**`, (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ structure: STRUCTURE }),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/income-statement**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID, statementType: "income-statement",
          fiscalYear: 2026, periods: PERIODS, rows: SERIES_ROWS,
        }),
      })
    }
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ rows: [] }),
    })
  })
}

test.describe("Pro forma Résultats Sommaire presentation", () => {
  test("matches income-statement summary layout: spacers present, detail codes hidden", async ({ page }) => {
    test.setTimeout(60_000)
    await setup(page)

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma", exact: true })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Résultats", exact: true }).click()
    await page.getByRole("button", { name: "Sommaire", exact: true }).click()

    await expect(page.locator("table tbody").first()).toBeVisible({ timeout: 15000 })

    const tbody = page.locator("table tbody").first()
    const rows = tbody.locator("tr")

    // Detail codes (REV-A.1, REV-A.2) must NOT appear
    await expect(tbody.getByText("REV-A.1")).toHaveCount(0)
    await expect(tbody.getByText("REV-A.2")).toHaveCount(0)

    // Summary labels must appear
    await expect(tbody.getByText("Revenus").first()).toBeVisible()
    await expect(tbody.getByText("Bénéfice brut").first()).toBeVisible()
    await expect(tbody.getByText("Charges d'exploitation").first()).toBeVisible()
    await expect(tbody.getByText("BAIIA").first()).toBeVisible()

    // There should be at least one spacer row (empty, short height) between
    // Bénéfice brut and Charges d'exploitation.
    // Wait for the structure to be fully applied (spacers appear after structure loads).
    await page.waitForTimeout(2000)

    const allRows = await rows.all()
    const labels: string[] = []
    for (const r of allRows) {
      labels.push(((await r.textContent()) ?? "").trim())
    }

    let grossProfitIdx = -1
    let chargesIdx = -1
    for (let i = 0; i < labels.length; i++) {
      if (/bénéfice brut/i.test(labels[i])) grossProfitIdx = i
      if (/charges d'exploitation/i.test(labels[i]) && grossProfitIdx >= 0) {
        chargesIdx = i
        break
      }
    }

    expect(grossProfitIdx).toBeGreaterThanOrEqual(0)
    expect(chargesIdx).toBeGreaterThan(grossProfitIdx + 1)
  })

  test("applies Hypothèses Revenus and Dépenses to projected years", async ({ page }) => {
    test.setTimeout(60_000)
    await setup(page)

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma", exact: true })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Résultats", exact: true }).click()
    await page.getByRole("button", { name: "Sommaire", exact: true }).click()

    const tbody = page.locator("table tbody").first()
    await expect(tbody).toBeVisible({ timeout: 15000 })

    // Première année projetée : Revenus = 350 ; CMV = 140 ; Brut = 210 ; Charges = 35
    // BAI = 175 ; Impôts 20% = 35 ; BN = 140
    const revenusRow = tbody.locator("tr").filter({ hasText: /^Revenus/ }).first()
    await expect(revenusRow).toBeVisible({ timeout: 15000 })
    await expect(revenusRow).toContainText(/350/)

    const cmvRow = tbody.locator("tr").filter({ hasText: /Coût des produits vendus/i }).first()
    await expect(cmvRow).toBeVisible()
    await expect(cmvRow).toContainText(/140/)

    const totalChargesRow = tbody.locator("tr").filter({ hasText: /Total des charges/i }).first()
    await expect(totalChargesRow).toBeVisible()
    await expect(totalChargesRow).toContainText(/35/)
    await expect(totalChargesRow).not.toContainText(/175/)

    const ebtRow = tbody.locator("tr").filter({ hasText: /Bénéfice avant impôts/i }).first()
    await expect(ebtRow).toContainText(/175/)

    const taxRow = tbody.locator("tr").filter({ hasText: /^Impôts/i }).first()
    await expect(taxRow).toContainText(/35/)
    await expect(page.getByTestId("pro-forma-impots-calc-hint")).toBeVisible()
    await page.getByTestId("pro-forma-impots-calc-hint").hover()
    await expect(page.getByText(/taux des Hypothèses Impôts/i)).toBeVisible()

    const netRow = tbody.locator("tr").filter({ hasText: /Bénéfice net/i }).first()
    await expect(netRow).toContainText(/140/)

    // BAIIA = REV 350 − total Hyp. Dépenses (CMV 140 + Salaires 35) = 175
    const baiiaRow = tbody.locator("tr").filter({ hasText: /^BAIIA/i }).first()
    await expect(baiiaRow).toContainText(/175/)
  })

  test("Détail applies Hypothèses Revenus and Dépenses to projected years", async ({ page }) => {
    test.setTimeout(60_000)
    await setup(page)

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma", exact: true })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Résultats", exact: true }).click()
    await page.getByRole("button", { name: "Détail", exact: true }).click()

    const tbody = page.locator("table tbody").first()
    await expect(tbody).toBeVisible({ timeout: 15000 })

    // Même structure d’annexes que États des résultats → Détail
    await expect(page.getByText(/Annexe A/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Sous-total — Annexe A/i)).toBeVisible()
    await expect(page.getByText(/Annexe B/i).first()).toBeVisible()
    await expect(page.getByText(/Sous-total — Annexe B/i)).toBeVisible()

    // Annexe Impôts (Exigibles) absente — calcul uniquement au Sommaire via Hypothèses Impôts
    await expect(page.getByText(/Annexe F/i)).toHaveCount(0)
    await expect(tbody.getByText(/Exigibles/i)).toHaveCount(0)

    await expect(tbody.locator("tr").filter({ hasText: /REV-A\.1/ })).toContainText(/200/)
    await expect(tbody.locator("tr").filter({ hasText: /REV-A\.2/ })).toContainText(/150/)
    await expect(tbody.locator("tr").filter({ hasText: /Achats/i })).toContainText(/70/)
    await expect(tbody.locator("tr").filter({ hasText: /Sous-total — Annexe B/i })).toContainText(/140/)
  })
})
