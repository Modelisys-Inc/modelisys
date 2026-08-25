import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1
/** Colonne 0 = libellé ; N-1 (+ YTD si mois ≠ déc.) puis 1re année projetée. */
const FIRST_PROJECTED_TD_INDEX = CURRENT_MONTH === 12 ? 2 : 3

async function setupBilanPage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([{ name: "has_session", value: "1", url: "http://localhost:3000" }])

  // Filet en premier : Playwright matche du plus récent au plus ancien,
  // donc les routes spécifiques enregistrées après priment.
  await page.route("**/api/**", async (route) => {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    })
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
  await page.route("**/api/companies", (route) => {
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
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/notes**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notes: [] }) }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    const url = route.request().url()
    if (route.request().method() === "GET") {
      if (url.includes("income-statement-detail")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            configs: [
              {
                id: "rev1",
                config_type: "income-statement-detail",
                data: {
                  revenueValues: {
                    "REV-1": 1_200_000,
                    "REV-2": 2_400_000,
                  },
                },
              },
            ],
          }),
        })
      }
      if (url.includes("capex-forecast")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            configs: [
              {
                id: "capex1",
                config_type: "capex-forecast",
                data: {
                  depreciationRates: {
                    "ALT-C.1": 0,
                    "detail-terrains-row": 0,
                  },
                  capexAdjustments: {
                    "ALT-C.1-1": [
                      {
                        id: "cx1",
                        rowId: "ALT-C.1",
                        yearIndex: 1,
                        type: "amount",
                        value: 80_000,
                        linkCode: "ALT-C.1",
                      },
                    ],
                    "ALT-C.1-2": [
                      {
                        id: "cx2",
                        rowId: "ALT-C.1",
                        yearIndex: 2,
                        type: "amount",
                        value: 90_000,
                        linkCode: "ALT-C.1",
                      },
                    ],
                    "detail-terrains-row-1": [
                      {
                        id: "cx-t",
                        rowId: "detail-terrains-row",
                        yearIndex: 1,
                        type: "amount",
                        value: 400_000,
                        linkCode: "ALT-B.1",
                      },
                    ],
                  },
                },
              },
            ],
          }),
        })
      }
      if (url.includes("debt-forecast")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            configs: [
              {
                id: "debt1",
                config_type: "debt-forecast",
                data: {
                  loans: [
                    {
                      id: "loan-plt-c",
                      name: "Dette LT",
                      principal: 300_000,
                      interestRate: 0,
                      remainingPayments: 36,
                      startMonth: 0,
                      repaymentMode: "interest_only",
                      sourceType: "mapping",
                      sourceLinkCode: "PLT-C.1",
                      hypothesisDefined: true,
                    },
                  ],
                },
              },
            ],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configs: [] }),
      })
    }
    if (route.request().method() === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "fc1", config_type: "balance-sheet-forecast", data: {} }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/income-statement`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        structure: [
          {
            label: "Revenus",
            linkCode: "REV",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
            posteNature: "revenus",
          },
        ],
      }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        structure: [
          { label: "Actif", isSection: true, isBold: true },
          { label: "Actif court terme", isSection: true, isBold: true, indent: true },
          {
            label: "Encaisse",
            linkCode: "ACT-A.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Comptes clients",
            linkCode: "ACT-C.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Stocks",
            linkCode: "ACT-F.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Placement temporaire",
            id: "uuid-placements-row",
            linkCode: "ACT-B.1",
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
            label: "Équipement",
            linkCode: "ALT-C.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Immobilisations corporelles",
            linkCode: "ALT-B",
            liaisonMode: "sum",
            liaisonSumCodes: ["ALT-B.1", "ALT-B.2"],
            defineMapping: true,
            showInDetail: true,
            isBold: true,
          },
          {
            label: "Terrains",
            linkCode: "ALT-B.1",
            id: "detail-terrains-row",
            annexLetter: "B",
            detailOnly: true,
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Créditeurs",
            linkCode: "PCT-C.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Créditeurs - Apparentés",
            linkCode: "PCT-D.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Découvert bancaire",
            linkCode: "PCT-A.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Portion court terme - Dette long terme",
            linkCode: "PCT-H.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Dette à long terme",
            linkCode: "PLT-C.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Bénéfices non répartis",
            linkCode: "CAP-C",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Actif d'impôts exigibles",
            linkCode: "ACT-H.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Passif d'impôts exigibles",
            linkCode: "PCT-FF.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Produits reportés",
            linkCode: "PCT-PD.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Total de l'actif",
            isBold: true,
            isResult: true,
            liaisonMode: "sum",
            liaisonSumCodes: [
              "ACT-A",
              "ACT-B",
              "ACT-C",
              "ACT-F",
              "ALT-B",
              "ALT-C",
            ],
          },
        ],
      }),
    }),
  )

  const periods = []
  for (let year = CURRENT_YEAR - 2; year <= CURRENT_YEAR + 5; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({ fiscalYear: year, fiscalMonth: month, label: `${month}/${year}` })
    }
  }
  const amounts: Record<string, number> = {}
  for (const p of periods) {
    amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = 120000
  }

  await page.route(`**/financial-statements/balance-sheet/series**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "balance-sheet",
        fiscalYear: CURRENT_YEAR,
        periods,
        rows: [
          {
            id: "ACT-A.1",
            label: "Encaisse",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "ACT-C.1",
            label: "Comptes clients",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "ACT-F.1",
            label: "Stocks",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "uuid-placements-row",
            label: "Placement temporaire",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "ALT-C.1",
            label: "Équipement",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "ALT-B",
            label: "Immobilisations corporelles",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "detail-terrains-row",
            label: "Terrains",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "PCT-C.1",
            label: "Créditeurs",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "PCT-D.1",
            label: "Créditeurs - Apparentés",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "PCT-A.1",
            label: "Découvert bancaire",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "PCT-H.1",
            label: "Portion court terme - Dette long terme",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "PLT-C.1",
            label: "Dette à long terme",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "CAP-C",
            label: "Bénéfices non répartis",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "ACT-H.1",
            label: "Actif d'impôts exigibles",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "PCT-FF.1",
            label: "Passif d'impôts exigibles",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "PCT-PD.1",
            label: "Produits reportés",
            hasLiaisonCode: true,
            amounts,
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
      body: JSON.stringify({
        structure: [
          { label: "Variation de trésorerie", isBold: true, isResult: true },
          { label: "Trésorerie à la fin de l'exercice", isBold: true, isResult: true },
        ],
      }),
    }),
  )
  await page.route(`**/financial-statements/cash-flow-detail/series**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "cash-flow-detail",
        fiscalYear: CURRENT_YEAR,
        periods,
        rows: [
          {
            id: "var-treso",
            label: "Variation de trésorerie",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
        ],
      }),
    }),
  )

  const revenueAmounts: Record<string, number> = {}
  const cmvAmounts: Record<string, number> = {}
  const netIncomeAmounts: Record<string, number> = {}
  for (const p of periods) {
    revenueAmounts[`${p.fiscalYear}-${p.fiscalMonth}`] = 100000
    cmvAmounts[`${p.fiscalYear}-${p.fiscalMonth}`] = 100000
    netIncomeAmounts[`${p.fiscalYear}-${p.fiscalMonth}`] = 20000
  }

  await page.route(`**/financial-statements/income-statement/series**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "income-statement",
        fiscalYear: CURRENT_YEAR,
        periods,
        rows: [
          {
            id: "REV",
            label: "Revenus",
            hasLiaisonCode: true,
            amounts: revenueAmounts,
            detailRows: [],
          },
          {
            id: "CMV",
            label: "Coût des produits vendus",
            hasLiaisonCode: true,
            amounts: cmvAmounts,
            detailRows: [],
          },
          {
            id: "NI",
            label: "Bénéfice net",
            isResult: true,
            hasLiaisonCode: true,
            amounts: netIncomeAmounts,
            detailRows: [],
          },
        ],
      }),
    }),
  )
}

test("bilan hypothesis shows the balance sheet and opens an adjustment panel", async ({ page }) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByRole("heading", { name: /Estimation du Bilan annuel/ })).toBeVisible({
    timeout: 20000,
  })
  await expect(page.getByText("Encaisse").first()).toBeVisible({ timeout: 20000 })
  await expect(page.getByText("Terrains")).toHaveCount(0)
  await expect(page.getByText("Trésorerie à la fin").first()).toBeVisible()
  await expect(page.getByText("Hypothèse Capex").first()).toBeVisible()
  // Sous-totaux (Total de l'actif, …) : pas de mention Trésorerie / Capex / Financement
  const totalActifLabel = page.locator("tr", { hasText: "Total de l'actif" }).first()
  await expect(totalActifLabel.getByText("Trésorerie à la fin")).toHaveCount(0)
  await expect(totalActifLabel.getByText("Hypothèse Capex")).toHaveCount(0)
  await expect(page.getByText("% du solde")).toHaveCount(0)

  const actifRow = page.locator("tr", { hasText: /^Actif$/ }).first()
  await expect(actifRow).toBeVisible()
  await actifRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)
  await expect(actifRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("")

  const encaisseRow = page.locator("tr", { hasText: "Encaisse" }).first()
  await encaisseRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)

  const decouvertRow = page.locator("tr", { hasText: "Découvert bancaire" }).first()
  await expect(decouvertRow.getByText("Trésorerie à la fin")).toBeVisible()
  await decouvertRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)

  const detteLtRow = page.locator("tr", { hasText: "Dette à long terme" }).first()
  await expect(detteLtRow.getByText("Hypothèse Financement")).toBeVisible()
  await detteLtRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)
  await expect(detteLtRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText(/300\s000/)

  const portionCtRow = page.locator("tr", { hasText: "Portion court terme - Dette long terme" }).first()
  await expect(portionCtRow.getByText("Hypothèse Financement")).toBeVisible()
  // Intérêts seulement à 0 % → pas de P+I sur les 12 prochains mois
  await expect(portionCtRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("")

  // Terrains (detailOnly) masqué ; parent ALT-B = VNC ouverture 120k + ajout 400k (taux 0)
  await expect(page.getByText("Terrains")).toHaveCount(0)
  const immoRow = page.locator("tr", { hasText: "Immobilisations corporelles" }).first()
  await expect(immoRow.getByText("Hypothèse Capex")).toBeVisible()
  await immoRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)
  await expect(immoRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText(/520\s000/)

  const equipementRow = page.locator("tr", { hasText: "Équipement" }).first()
  await equipementRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)
  await expect(equipementRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText(/200\s000/)

  const placementsRow = page.locator("tr", { hasText: "Placement temporaire" }).first()
  await placementsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Placement temporaire" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Montant ($)" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "% des revenus" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Délai de collection des clients" })).toHaveCount(0)
  await expect(page.getByLabel("Montant ($)")).toBeVisible()
  await page.getByLabel("Montant ($)").fill("50000")
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  await expect(page.getByText("50 000 $").first()).toBeVisible()

  // Total de l'actif = liaison sum ACT+ALT
  // N-1 / YTD : 120k × 6 postes (encaisse, clients, stocks, placement, équipement, immo) = 720k
  // Projeté : encaisse 120k + placement 50k + équipement 200k + immo 520k + clients 0 + stocks 0 = 890k
  const totalActif = page.locator("tr", { hasText: "Total de l'actif" }).first()
  await expect(totalActif).toBeVisible()
  await totalActif.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)
  await expect(totalActif.locator("td").nth(1)).toHaveText(/720\s000/)
  await expect(totalActif.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText(/890\s000/)
})

test("other ACT posts can be driven as a percent of revenue", async ({ page }) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByText("Placement temporaire").first()).toBeVisible({ timeout: 20000 })

  const placementsRow = page.locator("tr", { hasText: "Placement temporaire" }).first()
  await placementsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Placement temporaire" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Délai de collection des clients" })).toHaveCount(0)
  await page.getByRole("tab", { name: "% des revenus" }).click()
  await expect(page.getByText("Exercices réels")).toBeVisible()
  await expect(page.getByTestId("bilan-act-projected-amount")).toBeVisible()

  const priorYear = CURRENT_YEAR - 2
  const lastActualYear = CURRENT_YEAR - 1
  await expect(page.getByTestId(`act-history-revenuePercent-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`act-history-revenuePercent-${lastActualYear}`)).toContainText("10")

  await page.getByRole("spinbutton", { name: "% des revenus" }).fill("20")
  await page.getByTestId("bilan-adj-recurring").click()
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  const amounts = page.locator("tr", { hasText: "Placement temporaire" }).first()
  await expect(amounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText(/240\s000/)
  await expect(amounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX + 1)).toHaveText(/480\s000/)
})

test("stocks hypotheses show inventory rotation delay and revenue percent for the last two years", async ({
  page,
}) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByText("Stocks").first()).toBeVisible({ timeout: 20000 })

  const stocksRow = page.locator("tr", { hasText: "Stocks" }).first()
  await stocksRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Stocks" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Délai de rotation des stocks" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Stocks en % des revenus" })).toBeVisible()
  await expect(page.getByText("Exercices réels")).toBeVisible()
  await expect(page.getByText("Stocks projetés")).toBeVisible()
  await expect(page.getByLabel("Montant ($)")).toHaveCount(0)

  const priorYear = CURRENT_YEAR - 2
  const lastActualYear = CURRENT_YEAR - 1
  await expect(page.getByTestId(`stocks-history-inventoryDays-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`stocks-history-inventoryDays-${lastActualYear}`)).toContainText("36,5")
  await expect(page.getByTestId(`stocks-history-revenuePercent-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`stocks-history-revenuePercent-${lastActualYear}`)).toContainText("10")

  await page.getByLabel("Délai de rotation (jours)").fill("73")
  await page.getByTestId("bilan-adj-recurring").click()
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  // Sans hyp. Dépenses CMV → CMV projeté = 0 $ → stocks projetés vides (pas de chiffre inventé)
  const stocksAmounts = page.locator("tr", { hasText: "Stocks" }).first()
  await expect(stocksAmounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("")
  await expect(stocksAmounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX + 1)).toHaveText("")
})

test("comptes clients hypotheses show collection delay and revenue percent for the last two years", async ({
  page,
}) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByText("Comptes clients").first()).toBeVisible({ timeout: 20000 })

  const clientsRow = page.locator("tr", { hasText: "Comptes clients" }).first()
  await clientsRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Comptes clients" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Délai de collection des clients" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "% des revenus" })).toBeVisible()
  await expect(page.getByText("Exercices réels")).toBeVisible()
  await expect(page.getByText("Comptes clients projetés")).toBeVisible()
  await expect(page.getByLabel("Montant ($)")).toHaveCount(0)

  const priorYear = CURRENT_YEAR - 2
  const lastActualYear = CURRENT_YEAR - 1
  await expect(page.getByTestId(`cc-history-collectionDays-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`cc-history-collectionDays-${lastActualYear}`)).toContainText("36,5")
  await expect(page.getByTestId(`cc-history-revenuePercent-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`cc-history-revenuePercent-${lastActualYear}`)).toContainText("10")

  await page.getByLabel("Délai de collection (jours)").fill("73")
  await page.getByTestId("bilan-adj-recurring").click()
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  const clientsAmounts = page.locator("tr", { hasText: "Comptes clients" }).first()
  await expect(clientsAmounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText(/240\s000/)
  await expect(clientsAmounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX + 1)).toHaveText(/480\s000/)
})

test("crediteurs hypotheses show payment delay and revenue percent for the last two years", async ({
  page,
}) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByText("Créditeurs").first()).toBeVisible({ timeout: 20000 })

  const crediteursRow = page.locator("tr", { hasText: "Créditeurs" }).first()
  await crediteursRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Créditeurs" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Délai de paiement des créditeurs" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "% des revenus" })).toBeVisible()
  await expect(page.getByText("Exercices réels")).toBeVisible()
  await expect(page.getByText("Créditeurs projetés")).toBeVisible()
  await expect(page.getByLabel("Montant ($)")).toHaveCount(0)

  const priorYear = CURRENT_YEAR - 2
  const lastActualYear = CURRENT_YEAR - 1
  await expect(page.getByTestId(`crediteurs-history-paymentDays-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`crediteurs-history-paymentDays-${lastActualYear}`)).toContainText(
    "36,5",
  )
  await expect(page.getByTestId(`crediteurs-history-revenuePercent-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`crediteurs-history-revenuePercent-${lastActualYear}`)).toContainText(
    "10",
  )

  await expect(page.getByTestId("bilan-crediteurs-projected-amount")).toBeVisible()
  await page.getByRole("spinbutton").fill("73")
  await page.getByTestId("bilan-adj-recurring").click()
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  // Sans hyp. Dépenses CMV → CMV projeté = 0 $ → créditeurs projetés vides (pas de chiffre inventé)
  const amounts = page.locator("tr", { hasText: "Créditeurs" }).first()
  await expect(amounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("")
  await expect(amounts.locator("td").nth(FIRST_PROJECTED_TD_INDEX + 1)).toHaveText("")
})

test("crediteurs apparentes hypotheses mirror crediteurs payment delay drivers", async ({ page }) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByText("Créditeurs - Apparentés").first()).toBeVisible({ timeout: 20000 })

  const row = page.locator("tr", { hasText: "Créditeurs - Apparentés" }).first()
  await row.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Créditeurs - Apparentés" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Délai de paiement des créditeurs" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "% des revenus" })).toBeVisible()
  await expect(page.getByText("Exercices réels")).toBeVisible()
  await expect(page.getByText("Créditeurs projetés")).toBeVisible()

  const priorYear = CURRENT_YEAR - 2
  const lastActualYear = CURRENT_YEAR - 1
  await expect(page.getByTestId(`crediteurs-history-paymentDays-${priorYear}`)).toBeVisible()
  await expect(page.getByTestId(`crediteurs-history-paymentDays-${lastActualYear}`)).toContainText(
    "36,5",
  )

  await page.getByRole("spinbutton").fill("73")
  await page.getByTestId("bilan-adj-recurring").click()
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  // Sans hyp. Dépenses CMV → 0 $
  await expect(row.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText("")
})

test("retained earnings shows period earnings read-only and editable dividends", async ({ page }) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByText("Bénéfices non répartis").first()).toBeVisible({ timeout: 20000 })

  const reRow = page.locator("tr", { hasText: "Bénéfices non répartis" }).first()
  await reRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Bénéfices non répartis" })).toBeVisible()
  await expect(page.getByText("Exercices réels")).toBeVisible()
  await expect(page.getByRole("rowheader", { name: "Bénéfice de la période" })).toBeVisible()
  await expect(page.getByTestId("bilan-re-period-earnings")).toBeVisible()
  await expect(page.getByTestId("bilan-re-dividends")).toBeVisible()
  await expect(page.getByLabel("Montant ($)")).toHaveCount(0)

  await page.getByTestId("bilan-re-dividends").fill("25000")
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  await expect(page.getByRole("heading", { name: "Bénéfices non répartis" })).toHaveCount(0)
})

test("tax balance sheet rows show Hypothèse Impôts and are not adjustable", async ({ page }) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  const taxAssetRow = page.locator("tr", { hasText: "Actif d'impôts exigibles" }).first()
  await expect(taxAssetRow).toBeVisible({ timeout: 20000 })
  await expect(taxAssetRow.getByText("Hypothèse Impôts")).toBeVisible()
  await taxAssetRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)

  const taxLiabRow = page.locator("tr", { hasText: "Passif d'impôts exigibles" }).first()
  await expect(taxLiabRow.getByText("Hypothèse Impôts")).toBeVisible()
  await taxLiabRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)
})

test("produits reportés can be driven as a percent of revenue", async ({ page }) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  const pdRow = page.locator("tr", { hasText: "Produits reportés" }).first()
  await expect(pdRow).toBeVisible({ timeout: 20000 })
  await pdRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX).click()

  await expect(page.getByRole("heading", { name: "Produits reportés" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "Montant ($)" })).toBeVisible()
  await expect(page.getByRole("tab", { name: "% des revenus" })).toBeVisible()

  await page.getByRole("tab", { name: "% des revenus" }).click()
  await expect(page.getByText("Exercices réels")).toBeVisible()
  await expect(page.getByTestId("bilan-act-projected-amount")).toBeVisible()

  await page.getByRole("spinbutton", { name: "% des revenus" }).fill("15")
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  await expect(pdRow.locator("td").nth(FIRST_PROJECTED_TD_INDEX)).toHaveText(/180\s000/)
})
