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
    linkCode: "ALT-B.1",
    annexLetter: "B",
    detailOnly: true,
    liaisonMode: "single",
    defineMapping: true,
    showInDetail: true,
  },
  {
    label: "Bâtisses",
    linkCode: "ALT-B.2",
    annexLetter: "B",
    detailOnly: true,
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
  {
    label: "Autres immobilisations",
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
              id: "ALT-B.1",
              label: "Terrains",
              annexLetter: "B",
              detailOnly: true,
              hasLiaisonCode: true,
              amounts: amount(200_000),
              detailRows: [],
            },
            {
              id: "ALT-B.2",
              label: "Bâtisses",
              annexLetter: "B",
              detailOnly: true,
              hasLiaisonCode: true,
              amounts: amount(300_000),
              detailRows: [],
            },
            {
              id: "ALT-C",
              label: "Biens loués - Location-acquisition",
              annexLetter: "C",
              hasLiaisonCode: true,
              amounts: amount(120_000),
              detailRows: [],
            },
            {
              id: "ALT-D",
              label: "Actifs incorporels",
              annexLetter: "D",
              hasLiaisonCode: true,
              amounts: amount(80_000),
              detailRows: [],
            },
            {
              id: "ALT-A",
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

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    await expect(page.getByText("Immobilisations corporelles").first()).toBeVisible()
    await expect(page.getByText("Terrains").first()).toBeVisible()
    await expect(page.getByText("Bâtisses").first()).toBeVisible()
    await expect(page.getByText(/Sous-total — Annexe B/i)).toBeVisible()
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

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    await expect(page.getByText("Terrains").first()).toBeVisible()
    await expect(page.getByText("Bâtisses").first()).toBeVisible()
  })

  test("shows annex groups with subtotals like balance sheet detail", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    await expect(page.getByText("Immobilisations corporelles").first()).toBeVisible()
    await expect(page.getByText("Terrains").first()).toBeVisible()
    await expect(page.getByText("Bâtisses").first()).toBeVisible()
    await expect(page.getByText(/Sous-total — Annexe B/i)).toBeVisible()

    await expect(page.getByText("Biens loués - Location-acquisition").first()).toBeVisible()
    await expect(page.getByText(/Sous-total — Annexe C/i)).toBeVisible()

    await expect(page.getByText("Actifs incorporels").first()).toBeVisible()
    await expect(page.getByText(/Sous-total — Annexe D/i)).toBeVisible()

    await expect(page.getByText("Autres immobilisations")).toHaveCount(0)
  })

  test("opens inline hypothesis panel when clicking projected capex cell", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await expect(terrainsRow).toBeVisible()
    const projectedCells = terrainsRow.locator("td").filter({ hasText: /\$|^\-$/ })
    await projectedCells.nth(2).click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Sommaire" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Ajustement" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Décaissement" })).toBeVisible()
    await page.getByRole("tab", { name: "Décaissement" }).click()
    await expect(page.getByText("Mode de financement")).toBeVisible()
    await expect(page.getByText("Comptant")).toBeVisible()
    await expect(page.getByText("Financement")).toBeVisible()
    await expect(page.getByText("Mixte")).toBeVisible()
    await expect(page.getByRole("button", { name: "Enregistrer le financement" })).toBeVisible()
    await page.getByRole("tab", { name: "Ajustement" }).click()
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

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await expect(terrainsRow).toBeVisible()

    // Column layout: Compte | Taux | année référence | T | T+1 | …
    const firstProjectedYearCell = terrainsRow.locator("td").nth(3)
    await firstProjectedYearCell.click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    await page.locator('input[type="number"]').first().fill("75000")
    await page.getByRole("button", { name: "Enregistrer l'ajustement" }).click()

    await expect(firstProjectedYearCell).toContainText("75")
    await expect(terrainsRow.locator("td").nth(4)).toHaveText("-")
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

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    const firstProjectedYearCell = terrainsRow.locator("td").nth(3)
    await firstProjectedYearCell.click()

    await expect(page.getByLabel("Appliquer le même ajustement aux années suivantes")).toBeVisible()
    await page.locator('input[type="number"]').first().fill("50000")
    await page.getByLabel("Appliquer le même ajustement aux années suivantes").check()
    await page.getByRole("button", { name: "Enregistrer l'ajustement" }).click()

    await expect(firstProjectedYearCell).toContainText("50")
    await expect(terrainsRow.locator("td").nth(4)).toContainText("50")
    await expect(terrainsRow.locator("td").nth(5)).toContainText("50")
  })

  test("shows disbursement calendar on decaissement tab when adjustment amount is set", async ({ page }) => {
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

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await terrainsRow.locator("td").nth(3).click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    await page.locator('input[type="number"]').first().fill("100000")
    await page.getByRole("button", { name: "Enregistrer l'ajustement" }).click()

    await terrainsRow.locator("td").nth(3).click()
    await page.getByRole("tab", { name: "Décaissement" }).click()

    await expect(page.getByText("Calendrier de décaissement")).toBeVisible()
    await expect(page.getByLabel("Calendrier de décaissement par mois")).toBeVisible()
    await expect(page.getByRole("button", { name: "Enregistrer le financement" })).toBeEnabled()
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

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await terrainsRow.locator("td").nth(3).click()
    await page.locator('input[type="number"]').first().fill("50000")
    await page.getByRole("button", { name: "Enregistrer l'ajustement" }).click()

    await terrainsRow.locator("td").nth(3).click()
    await page.getByRole("tab", { name: "Décaissement" }).click()
    await page.locator('input[name="capex-financing-mode"]').nth(1).click()

    await expect(page.getByText("Paramètres de la dette")).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Capital et intérêt")).toBeVisible()
    await expect(page.getByText("Décaissement total")).toHaveCount(0)
    await expect(page.getByText("Aucune mise de fonds")).toHaveCount(0)
    await expect(page.getByText(/Paiements de capital et d.intérêts/i)).toBeVisible()
    await expect(page.getByText("Calendrier de décaissement")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Enregistrer le financement" })).toBeEnabled()
  })

  test("opens rate hypothesis panel when clicking taux column", async ({ page }) => {
    test.setTimeout(60_000)
    await setupAuth(page)

    await page.goto(`/projections/pro-forma?projectionId=${PROJECTION_ID}`)
    await expect(page.getByRole("heading", { name: "Pro Forma" })).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Hypothèses", exact: true }).click()
    await page.getByRole("button", { name: "Capex", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Estimation des Capex annuels" })).toBeVisible({
      timeout: 15000,
    })

    const terrainsRow = page.locator("tr").filter({ hasText: "Terrains" }).first()
    await terrainsRow.locator("td").nth(1).click()

    await expect(page.getByText("Hypothèse", { exact: true })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Taux" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Enregistrer le taux" })).toBeVisible()
  })
})
