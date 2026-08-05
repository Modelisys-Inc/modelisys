import { test, expect, Page } from "@playwright/test"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

// L'état des flux affiche une ligne Validation : Trésorerie à la fin calculée
// moins celle du bilan. Elle doit valoir 0 $ ; sinon un poste de bilan n'est
// rattaché à aucune section et l'utilisateur doit le voir immédiatement.

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

function isCashFlowSummaryUrl(url: string): boolean {
  return (
    url.includes(`/companies/${COMPANY_ID}/financial-statements/cash-flow`) &&
    !url.includes("cash-flow-detail") &&
    !url.includes("/series")
  )
}

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
          full_name: "Test",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
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
          companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }],
        }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budgets: [] }),
    }),
  )
  await page.route("**/api/companies/*/statement-structures/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ structure: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ slots: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance/fiscal-years`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([2026]),
    }),
  )
  // Vue « Mensuel » (multi-périodes) : non testée ici, mais elle doit répondre.
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/cash-flow/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          periods: [],
          rows: [],
        }),
      }),
  )
}

/**
 * Trésorerie 1 000 → 800 au bilan, avec une variation nette de `netChange`.
 * L'écart de validation vaut donc (1 000 + netChange) − 800.
 */
function cashFlowRows(netChange: number) {
  const closingComputed = 1000 + netChange
  return [
    {
      id: "TEX-WC",
      label: "Variation des éléments hors caisse",
      linkCode: "TEX-WC",
      current: netChange,
      prior: 0,
      variation: 0,
      variationAmount: netChange,
      isBold: false,
      isSection: false,
      isResult: false,
      hasLiaisonCode: true,
      detailRows: [],
    },
    {
      id: "cf-net-change",
      label: "Variation nette de la trésorerie",
      current: netChange,
      prior: 0,
      variation: 0,
      variationAmount: netChange,
      isBold: true,
      isSection: false,
      isResult: true,
      hasLiaisonCode: false,
      hasComputedAmount: true,
      detailRows: [],
    },
    {
      id: "cf-cash-opening",
      label: "Trésorerie au début de l'exercice",
      current: 1000,
      prior: 0,
      variation: 0,
      variationAmount: 1000,
      isBold: false,
      isSection: false,
      isResult: false,
      hasLiaisonCode: false,
      hasComputedAmount: true,
      cashFlowRole: "openingCash",
      detailRows: [],
    },
    {
      id: "cf-cash-closing",
      label: "Trésorerie à la fin de l'exercice",
      current: closingComputed,
      prior: 0,
      variation: 0,
      variationAmount: closingComputed,
      isBold: true,
      isSection: false,
      isResult: true,
      hasLiaisonCode: false,
      hasComputedAmount: true,
      detailRows: [],
    },
    {
      id: "cf-validation",
      label: "Validation",
      current: closingComputed - 800,
      prior: 0,
      variation: 0,
      variationAmount: closingComputed - 800,
      isBold: true,
      isSection: false,
      isResult: true,
      hasLiaisonCode: false,
      hasComputedAmount: true,
      isValidation: true,
      detailRows: [],
    },
  ]
}

async function openCashFlowSommaire(page: Page, netChange: number) {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`,
    (route) => {
      if (!isCashFlowSummaryUrl(route.request().url())) return route.continue()
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          month: 12,
          period: "annual",
          rows: cashFlowRows(netChange),
        }),
      })
    },
  )

  // Sans date de référence, la page ne demande aucun état : la balance est mockée,
  // pas importée, donc on fixe le mois directement dans l'URL.
  await page.goto(
    `/financial-statements/cash-flow?companyId=${COMPANY_ID}&refMonth=12&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })

  // Le Sommaire s'ouvre sur « Mensuel », qui lit l'endpoint séries. On bascule sur
  // « Mois actuel » pour afficher les colonnes courant / comparatif.
  await page.getByRole("combobox").first().click()
  await page.getByRole("option", { name: HORIZON_LABEL.moisActuel }).click()

  await expect(page.getByText("Trésorerie à la fin de l'exercice").first()).toBeVisible({
    timeout: 30000,
  })
}

test("l'état des flux affiche une Validation à 0 $ quand il balance", async ({ page }) => {
  // 1 000 − 200 = 800, exactement la trésorerie du bilan.
  await openCashFlowSommaire(page, -200)

  const validation = page.getByTestId("cash-flow-validation-row")
  await expect(validation).toBeVisible({ timeout: 30000 })
  await expect(validation.getByText("Validation", { exact: true })).toBeVisible()
  await expect(validation.getByTitle(/balance avec l.encaisse du bilan/i)).toBeVisible()
  await expect(page.getByTestId("cash-flow-imbalance-alert")).toHaveCount(0)
})

test("l'état des flux signale l'écart quand un poste de bilan n'est pas rattaché", async ({
  page,
}) => {
  // 1 000 − 50 = 950 alors que le bilan dit 800 : 150 $ de trésorerie inexpliqués.
  await openCashFlowSommaire(page, -50)

  const validation = page.getByTestId("cash-flow-validation-row")
  await expect(validation).toBeVisible({ timeout: 30000 })
  await expect(validation.getByTitle(/ne balance pas/i)).toBeVisible()

  const alert = page.getByTestId("cash-flow-imbalance-alert")
  await expect(alert).toBeVisible()
  await expect(alert).toContainText(/ne balance pas/i)
})

test("le bas de l'état affiche ses montants malgré l'absence de code de liaison", async ({
  page,
}) => {
  await openCashFlowSommaire(page, -200)

  // Ces lignes sont calculées par formule : sans le marqueur hasComputedAmount,
  // le sommaire les rendrait en blanc sur blanc.
  await expect(page.getByText("Trésorerie au début de l'exercice")).toBeVisible()
  await expect(page.getByTestId("cash-flow-validation-row")).toContainText("0")
})
