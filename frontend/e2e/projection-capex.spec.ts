import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"

/** Poste | Code | Taux | N-1 | YTD | 1re année projetée | … */
const FIRST_PROJECTED_TD_INDEX = 5
const TAUX_TD_INDEX = 2

async function openCapexHypothesis(page: Page) {
  await page.goto(`/projections/capex?projectionId=${PROJECTION_ID}&companyId=${COMPANY_ID}`)
  await expect(page.getByRole("heading", { name: "Hypothèses Capex" })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.getByRole("heading", { name: /Estimation des Capex annuels/ })).toBeVisible({
    timeout: 15000,
  })
}

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

const MOCK_STANDARD_ALT_CODES = [
  {
    id: "slc-alt-b",
    code: "ALT-B",
    family: "ALT",
    parent_code: null,
    is_leaf: false,
    sort_order: 1,
    label_account: "Immobilisations corporelles",
    label_sub_account: null,
    label: "Immobilisations corporelles",
  },
  {
    id: "slc-alt-b-1",
    code: "ALT-B.1",
    family: "ALT",
    parent_code: "ALT-B",
    is_leaf: true,
    sort_order: 1,
    label_account: "Immobilisations corporelles",
    label_sub_account: "Terrains",
    label: "Terrains",
  },
  {
    id: "slc-alt-b-2",
    code: "ALT-B.2",
    family: "ALT",
    parent_code: "ALT-B",
    is_leaf: true,
    sort_order: 2,
    label_account: "Immobilisations corporelles",
    label_sub_account: "Bâtisses",
    label: "Bâtisses",
  },
  {
    id: "slc-alt-b-3",
    code: "ALT-B.3",
    family: "ALT",
    parent_code: "ALT-B",
    is_leaf: true,
    sort_order: 3,
    label_account: "Immobilisations corporelles",
    label_sub_account: "Équipement",
    label: "Équipement",
  },
  {
    id: "slc-alt-c",
    code: "ALT-C",
    family: "ALT",
    parent_code: null,
    is_leaf: true,
    sort_order: 2,
    label_account: "Biens loués - Location-acquisition",
    label_sub_account: null,
    label: "Biens loués - Location-acquisition",
  },
  {
    id: "slc-alt-d",
    code: "ALT-D",
    family: "ALT",
    parent_code: null,
    is_leaf: true,
    sort_order: 3,
    label_account: "Actifs incorporels",
    label_sub_account: null,
    label: "Actifs incorporels",
  },
]

const BALANCE_STRUCTURE_PARENTS_ONLY = [
  { label: "Actif", isSection: true },
  {
    label: "Immobilisations corporelles",
    linkCode: "ALT-B",
    annexLetter: "B",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Biens loués - Location-acquisition",
    linkCode: "ALT-C",
    annexLetter: "C",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Actifs incorporels",
    linkCode: "ALT-D",
    annexLetter: "D",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
]

const BALANCE_STRUCTURE = [
  { label: "Actif", isSection: true },
  { label: "Actif à long terme", isSection: true, indent: true },
  {
    label: "Immobilisations corporelles",
    linkCode: "ALT-B",
    annexLetter: "B",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Terrains",
    id: "detail-uuid-terrains",
    linkCode: "ALT-B.1",
    annexLetter: "B",
    detailOnly: true,
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Bâtisses",
    id: "detail-uuid-batisses",
    linkCode: "ALT-B.2",
    annexLetter: "B",
    detailOnly: true,
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Équipement",
    id: "detail-uuid-equipement",
    linkCode: "ALT-B.3",
    annexLetter: "B",
    detailOnly: true,
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Biens loués - Location-acquisition",
    id: "detail-uuid-biens-loues",
    linkCode: "ALT-C",
    annexLetter: "C",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Actifs incorporels",
    id: "detail-uuid-incorporels",
    linkCode: "ALT-D",
    annexLetter: "D",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Autres immobilisations",
    id: "detail-uuid-autres-immo",
    linkCode: "ALT-A",
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
]

async function setupAuth(page: Page) {
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
        body: JSON.stringify({ companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }] }),
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

  await page.route(`**/api/standard-link-codes/flat**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_STANDARD_ALT_CODES),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: BALANCE_STRUCTURE }),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )

  const periods = buildMonthlyPeriods(2023, 2028)
  const amount = (value: number) =>
    monthlyAmounts(2023, 2028, {
      2023: value,
      2024: value,
      2025: value,
      2026: value,
      2027: value,
      2028: 0,
    })

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
              id: "ALT-B",
              label: "Immobilisations corporelles",
              annexLetter: "B",
              hasLiaisonCode: true,
              amounts: amount(500_000),
              detailRows: [],
            },
            {
              id: "detail-uuid-terrains",
              label: "Terrains",
              annexLetter: "B",
              detailOnly: true,
              hasLiaisonCode: true,
              amounts: amount(200_000),
              detailRows: [],
            },
            {
              id: "detail-uuid-batisses",
              label: "Bâtisses",
              annexLetter: "B",
              detailOnly: true,
              hasLiaisonCode: true,
              amounts: amount(300_000),
              detailRows: [],
            },
            {
              id: "detail-uuid-equipement",
              label: "Équipement",
              annexLetter: "B",
              detailOnly: true,
              hasLiaisonCode: true,
              amounts: amount(150_000),
              detailRows: [],
            },
            {
              id: "detail-uuid-biens-loues",
              label: "Biens loués - Location-acquisition",
              annexLetter: "C",
              hasLiaisonCode: true,
              amounts: amount(120_000),
              detailRows: [],
            },
            {
              id: "detail-uuid-incorporels",
              label: "Actifs incorporels",
              annexLetter: "D",
              hasLiaisonCode: true,
              amounts: amount(80_000),
              detailRows: [],
            },
            {
              id: "detail-uuid-autres-immo",
              label: "Autres immobilisations",
              hasLiaisonCode: true,
              amounts: amount(40_000),
              detailRows: [],
            },
          ],
        }),
      }),
  )
}

test.describe("Projection capex estimation", () => {
  test("shows balance-sheet detail structure even without series amounts", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

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
            periods: [],
            rows: [],
          }),
        }),
    )

    await openCapexHypothesis(page)

    await expect(page.getByText("Immobilisations corporelles").first()).toBeVisible()
    await expect(page.getByText("Terrains").first()).toBeVisible()
    await expect(page.getByText("Bâtisses").first()).toBeVisible()
    await expect(page.getByTestId("capex-annex-subtotal-B")).toBeAttached()
    await expect(page.getByText("Autres immobilisations")).toHaveCount(0)
  })

  test("injects standard child codes under ALT-B when structure has only parent rows", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ structure: BALANCE_STRUCTURE_PARENTS_ONLY }),
      }),
    )

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
            periods: [],
            rows: [],
          }),
        }),
    )

    await openCapexHypothesis(page)

    await expect(page.getByText("Terrains").first()).toBeVisible()
    await expect(page.getByText("Bâtisses").first()).toBeVisible()
  })

  test("shows annex groups with subtotals like balance sheet detail", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await openCapexHypothesis(page)

    await expect(page.getByText("Immobilisations corporelles").first()).toBeVisible()
    await expect(page.getByText("Terrains").first()).toBeVisible()
    await expect(page.getByText("Bâtisses").first()).toBeVisible()
    await expect(page.getByTestId("capex-annex-subtotal-B")).toBeAttached()

    await expect(page.getByText("Biens loués - Location-acquisition").first()).toBeVisible()
    await expect(page.getByTestId("capex-annex-subtotal-C")).toBeAttached()

    await expect(page.getByText("Actifs incorporels").first()).toBeVisible()
    await expect(page.getByTestId("capex-annex-subtotal-D")).toBeAttached()

    await expect(page.getByText("Autres immobilisations")).toHaveCount(0)
    await expect(page.getByText(/Sous-total — Annexe/i)).toHaveCount(0)
  })

  test("opens inline hypothesis panel when clicking projected capex cell", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await openCapexHypothesis(page)

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await expect(terrainsRow).toBeVisible()
    const projectedCells = terrainsRow.locator("td").filter({ hasText: /\$|^\-$/ })
    await projectedCells.nth(2).click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Sommaire" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Ajustement" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Décaissement" })).toHaveCount(0)
    await expect(page.getByText("Mode de financement")).toBeVisible()
    await expect(page.getByText("Projet Capex")).toHaveCount(0)
    await expect(page.getByText("Mois de mise en service")).toHaveCount(0)
    await expect(page.getByText("Nom du projet")).toHaveCount(0)
    await expect(page.getByText("Comptant", { exact: true })).toBeVisible()
    await expect(page.getByText("Financement", { exact: true })).toBeVisible()
    await expect(page.getByText("Mixte", { exact: true })).toBeVisible()
    await expect(page.getByText("Type d'ajustement")).toBeVisible()
    await expect(page.getByRole("button", { name: "Enregistrer l'ajustement" })).toBeVisible()
  })

  test("does not auto-fill following year when only one projected year has an adjustment", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
      }
      if (route.request().method() === "PUT" || route.request().method() === "POST") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      }
      return route.continue()
    })

    await openCapexHypothesis(page)

    const reportTable = page.getByTestId("capex-forecast-table-report")
    await expect(reportTable).toBeVisible()
    await expect(reportTable).toHaveClass(/overflow-x-auto/)
    await expect(page.getByRole("columnheader", { name: "Poste" })).toBeVisible()

    const headerRow = page.locator("thead tr").first()
    await expect(headerRow.getByRole("columnheader", { name: "Code" })).toBeVisible()
    await expect(headerRow.getByRole("columnheader", { name: "Taux" })).toBeVisible()
    await expect(headerRow.getByRole("columnheader", { name: "2027" })).toBeVisible()
    await expect(headerRow.getByRole("columnheader", { name: "YTD 2028" })).toBeVisible()
    await expect(headerRow.getByRole("columnheader", { name: "2028", exact: true })).toBeVisible()
    await expect(headerRow.getByRole("columnheader", { name: "2032" })).toBeVisible()

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await expect(terrainsRow).toBeVisible()

    // Column layout: Poste | Code | Taux | N-1 | YTD | T | T+1 | …
    const firstProjectedYearCell = terrainsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)
    await firstProjectedYearCell.click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    const rollforward = page.getByTestId("capex-asset-rollforward-table")
    await expect(rollforward).toBeVisible()
    await expect(rollforward.getByText("Coût", { exact: true })).toBeVisible()
    await expect(rollforward.getByText("Amortissement cumulé", { exact: true })).toBeVisible()
    await expect(rollforward.getByText("Valeur comptable")).toBeVisible()

    await page.getByPlaceholder("0").fill("75000")
    await page.getByRole("button", { name: "Enregistrer l'ajustement" }).click()

    await expect(firstProjectedYearCell).toContainText("75")
    await expect(firstProjectedYearCell.getByTestId("capex-adjustment-marker")).toBeVisible()
    // Terrains : taux 0 % → la VNC se maintient les années suivantes sans nouvel ajout
    const nextYearCell = terrainsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX + 1)
    await expect(nextYearCell).toContainText("75")
    await expect(nextYearCell.getByTestId("capex-adjustment-marker")).toHaveCount(0)

    const viewAdjustments = page.getByTestId("capex-view-adjustments")
    const viewBook = page.getByTestId("capex-view-book")
    const viewDepreciation = page.getByTestId("capex-view-depreciation")
    await expect(viewAdjustments).toBeVisible()
    await viewAdjustments.click()
    await expect(firstProjectedYearCell).toContainText("75")
    await expect(nextYearCell).toHaveText("-")

    // Parents de catégorie : pas de montants ; totaux uniquement sur Sous-total (libellé masqué)
    const corpRow = page.locator("tr").filter({ hasText: "Immobilisations corporelles" }).first()
    await expect(corpRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("-")
    const annexSubtotalRow = page.getByTestId("capex-annex-subtotal-B").locator("xpath=ancestor::tr[1]")
    await expect(annexSubtotalRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toContainText("75")

    await viewDepreciation.click()
    await expect(corpRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("-")
    await expect(annexSubtotalRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("-")

    await viewBook.click()
    await expect(nextYearCell).toContainText("75")
    await expect(corpRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("-")
    await expect(annexSubtotalRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toContainText("75")
  })

  test("replicates capex adjustment to following years when checkbox is checked", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
      }
      if (route.request().method() === "PUT" || route.request().method() === "POST") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      }
      return route.continue()
    })

    await openCapexHypothesis(page)

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    const firstProjectedYearCell = terrainsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)
    await firstProjectedYearCell.click()

    await expect(page.getByLabel("Appliquer le même ajustement aux années suivantes")).toBeVisible()
    await page.getByPlaceholder("0").fill("50000")
    await page.getByLabel("Appliquer le même ajustement aux années suivantes").check()
    await page.getByRole("button", { name: "Enregistrer l'ajustement" }).click()

    await expect(firstProjectedYearCell).toContainText("50")
    await expect(firstProjectedYearCell.getByTestId("capex-adjustment-marker")).toBeVisible()
    // Ajouts répliqués → Coût cumulatif (taux Terrains 0 %) : 50k, 100k, 150k
    const year2Cell = terrainsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX + 1)
    const year3Cell = terrainsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX + 2)
    await expect(year2Cell).toContainText("100")
    await expect(year3Cell).toContainText("150")
    await expect(year2Cell.getByTestId("capex-adjustment-marker")).toBeVisible()
    await expect(year3Cell.getByTestId("capex-adjustment-marker")).toBeVisible()
  })

  test("shows disbursement calendar inside adjustment when amount is set", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
      }
      if (route.request().method() === "PUT" || route.request().method() === "POST") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      }
      return route.continue()
    })

    await openCapexHypothesis(page)

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await terrainsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    await page.getByPlaceholder("0").fill("100000")

    await expect(page.getByRole("heading", { name: "Calendrier de décaissement" })).toBeVisible()
    await expect(page.getByLabel("Calendrier de décaissement par mois")).toBeVisible()
    await expect(page.getByTestId("forecast-seasonality-zero-all")).toBeVisible()
    await page.getByTestId("forecast-seasonality-zero-all").click()
    await expect(page.getByText(/Total des pourcentages\s*:\s*0\s*%/i)).toBeVisible()
    await expect(page.getByRole("button", { name: "Enregistrer l'ajustement" })).toBeDisabled()
  })

  test("financed mode shows debt payments and hides disbursement calendar", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, async (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
      }
      if (route.request().method() === "PUT" || route.request().method() === "POST") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
      }
      return route.continue()
    })

    await openCapexHypothesis(page)

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await terrainsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
    await page.getByPlaceholder("0").fill("50000")
    await page.locator('label').filter({ hasText: /^Financement$/ }).click()

    await expect(page.getByText("Paramètres de la dette")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Capital et intérêt")).toBeVisible()
    await expect(page.getByText("Intérêts seulement", { exact: true })).toBeVisible()
    await expect(page.getByText("Intérêts seulement avec paiement résiduel")).toHaveCount(0)
    await expect(page.getByLabel("Moratoire", { exact: true })).toBeVisible()
    await expect(page.getByText("Type de moratoire")).toHaveCount(0)
    await page.getByLabel("Moratoire", { exact: true }).check()
    await expect(page.getByText("Durée du moratoire (mois)")).toBeVisible()
    await page.locator('label').filter({ hasText: /^Capital et intérêt$/ }).click()
    await expect(page.getByText("Type de moratoire")).toBeVisible()
    await expect(page.getByText(/Aucun paiement d.intérêts pendant/)).toBeVisible()
    await expect(page.getByText(/Aucun remboursement de capital pendant/)).toBeVisible()
    await expect(page.getByText(/Aucun paiement \(capital ni intérêts\)/)).toBeVisible()
    await expect(page.getByText("Décaissement total")).toHaveCount(0)
    await expect(page.getByText("Aucune mise de fonds")).toHaveCount(0)
    await expect(page.getByText(/Paiements de capital et d.intérêts/i)).toBeVisible()
    await expect(page.getByRole("heading", { name: "Calendrier de décaissement" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Enregistrer l'ajustement" })).toBeEnabled()
  })

  test("financed Capex syncs debt-forecast under PLT-C for ALT-B assets", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    const debtPuts: {
      config_type?: string
      data?: { loans?: Array<{ sourceLinkCode?: string; sourceType?: string; principal?: number }> }
    }[] = []

    await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, async (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ configs: [] }),
        })
      }
      if (method === "PUT" || method === "POST") {
        const body = route.request().postDataJSON() as (typeof debtPuts)[number]
        if (body?.config_type === "debt-forecast") debtPuts.push(body)
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: "fc-debt",
            config_type: body?.config_type ?? "debt-forecast",
            data: body?.data ?? {},
            ok: true,
          }),
        })
      }
      return route.continue()
    })

    await openCapexHypothesis(page)

    const equipementRow = page.locator("tr").filter({ hasText: "Équipement" }).first()
    await equipementRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
    await page.getByPlaceholder("0").fill("75000")
    await page.locator("label").filter({ hasText: /^Financement$/ }).click()
    await expect(page.getByText("Paramètres de la dette")).toBeVisible({ timeout: 10000 })
    await page.getByRole("button", { name: "Enregistrer l'ajustement" }).click()
    await expect(page.getByText("Hypothèse", { exact: true })).toHaveCount(0, { timeout: 15000 })

    await expect
      .poll(() =>
        debtPuts
          .flatMap((p) => p.data?.loans ?? [])
          .find((l) => l.sourceType === "capex" && l.sourceLinkCode === "PLT-C"),
      )
      .toBeTruthy()
    const loan = debtPuts
      .flatMap((p) => p.data?.loans ?? [])
      .find((l) => l.sourceType === "capex" && l.sourceLinkCode === "PLT-C")
    expect(loan?.principal).toBe(75000)
  })

  test("opens rate hypothesis panel when clicking taux column", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await openCapexHypothesis(page)

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await terrainsRow.locator("td").nth(TAUX_TD_INDEX).click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Taux" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Enregistrer le taux" })).toBeVisible()
  })

  test("allows selecting amortization IS code per Capex row", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await openCapexHypothesis(page)

    const batissesRow = page.locator("tr").filter({ hasText: "Bâtisses" }).first()
    await expect(batissesRow).toBeVisible()
    const codeTrigger = batissesRow.getByTestId(/capex-amort-code-/)
    await expect(codeTrigger).toBeVisible()
    await codeTrigger.click()
    await page.getByRole("option", { name: /ADM\.20/ }).click()
    await expect(codeTrigger).toContainText("ADM.20")
  })
})
