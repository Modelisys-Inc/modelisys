import { test, expect, Page } from "@playwright/test"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

function isBalanceSheetUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/financial-statements/balance-sheet`)
}

function isCashFlowSummaryUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return (
    path.includes(`/companies/${COMPANY_ID}/financial-statements/cash-flow`) &&
    !path.includes("cash-flow-detail")
  )
}

function isCashFlowDetailUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/financial-statements/cash-flow-detail`)
}

function isCashFlowDetailStructureUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/statement-structures/cash-flow-detail`)
}

const BS_STRUCTURE = [
  {
    id: "act",
    label: "Actifs",
    linkCode: "ACT",
    defineMapping: true,
    isBold: true,
    showInSummary: true,
  },
]

const CF_STRUCTURE = [
  {
    id: "tex-exp-row",
    label: "Flux de trésorerie - Exploitation",
    linkCode: "TEX-EXP",
    liaisonMode: "single",
    defineMapping: true,
    showInSummary: true,
    isBold: true,
  },
]

function seriesPeriods() {
  const labels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
  const periods: Array<{ fiscalYear: number; fiscalMonth: number; label: string }> = []
  for (let year = 2022; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${labels[month - 1]} ${year}`,
      })
    }
  }
  return periods
}

function amountsFromPeriods() {
  const amounts: Record<string, number> = {}
  for (const p of seriesPeriods()) amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = p.fiscalMonth
  return amounts
}

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
        user: { id: "u1", email: "u@e.com", full_name: "Test", is_active: true, created_at: "2026-01-01T00:00:00Z" },
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
          companies: [
            {
              id: COMPANY_ID,
              name: "Test Co",
              fiscal_year_end: "12-31",
              divisions: [],
            },
          ],
        }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ budgets: [] }) }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs*`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [] }) })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance/fiscal-years`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([2026]) }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance**`, (route) => {
    if (route.request().url().includes("fiscal-years")) return route.fallback()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_id: COMPANY_ID,
        fiscal_year: 2026,
        months_with_data: [8],
        accounts: [{ account_number: "1000", description: "Caisse", monthly_amounts: { Août: 1000 } }],
      }),
    })
  })
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )
}

async function setupBalanceSheet(page: Page) {
  const periods = seriesPeriods()
  const amounts = amountsFromPeriods()
  await page.route(isBalanceSheetUrl, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          periods,
          rows: [
            {
              id: "act",
              label: "Actifs",
              linkCode: "ACT",
              isBold: true,
              hasLiaisonCode: true,
              amounts,
            },
          ],
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "balance-sheet",
        fiscalYear: 2026,
        month: 8,
        rows: [{ id: "act", label: "Actifs", current: 8, prior: 8, isBold: true, hasLiaisonCode: true }],
      }),
    })
  })
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "s1",
        company_id: COMPANY_ID,
        statement_type: "balance-sheet",
        structure: BS_STRUCTURE,
      }),
    }),
  )
}

async function setupCashFlow(page: Page) {
  const periods = seriesPeriods()
  const amounts = amountsFromPeriods()
  const series = {
    periods,
    rows: [
      {
        id: "tex-exp-row",
        label: "Flux de trésorerie - Exploitation",
        linkCode: "TEX-EXP",
        isBold: true,
        isSection: false,
        isResult: false,
        hasLiaisonCode: true,
        amounts,
        detailRows: [],
      },
    ],
  }
  await page.route(isCashFlowSummaryUrl, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ statementType: "cash-flow", ...series }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "cash-flow",
        fiscalYear: 2026,
        month: 8,
        rows: [
          {
            id: "tex-exp-row",
            label: "Flux de trésorerie - Exploitation",
            current: 36,
            prior: 78,
            isBold: true,
            hasLiaisonCode: true,
          },
        ],
      }),
    })
  })
  await page.route(isCashFlowDetailUrl, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ statementType: "cash-flow-detail", ...series }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "cash-flow-detail",
        fiscalYear: 2026,
        month: 8,
        rows: [
          {
            id: "tex-exp-row",
            label: "Flux de trésorerie - Exploitation",
            current: 36,
            prior: 78,
            isBold: true,
            hasLiaisonCode: true,
          },
        ],
      }),
    })
  })
  await page.route(isCashFlowDetailStructureUrl, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "d1",
          company_id: COMPANY_ID,
          statement_type: "cash-flow-detail",
          structure: CF_STRUCTURE,
        }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ statementType: "balance-sheet", periods, rows: [] }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ statementType: "balance-sheet", fiscalYear: 2026, month: 8, rows: [] }),
    })
  })
}

async function openSummaryAndSelectAnnual(page: Page, rowLabel: string) {
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 30000 })
  const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
  try {
    await expect(table.getByText(rowLabel)).toBeVisible({ timeout: 15000 })
  } catch {
    await page.getByRole("button", { name: /^Sommaire$/ }).click()
    await expect(table.getByText(rowLabel)).toBeVisible({ timeout: 30000 })
  }
  await page
    .getByRole("combobox")
    .filter({ hasText: /Mois actuel|Mensuel|Trimestriel|Annuel|YTD|DDM/i })
    .first()
    .click()
  await page.getByRole("option", { name: HORIZON_LABEL.annuel5Ans }).click()
  await expect(page.getByRole("combobox").filter({ hasText: HORIZON_LABEL.courant }).first()).toBeVisible()
  return table
}

test.describe("Bilan / Trésorerie Courant / Exercice", () => {
  test.setTimeout(120_000)

  test("Bilan Sommaire Annuel 5 ans : Courant = Aoû chaque année, Exercice = Aoû puis Déc", async ({
    page,
  }) => {
    await setupAuth(page)
    await setupBalanceSheet(page)
    await page.goto(`/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=8&refYear=2026`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    })
    const table = await openSummaryAndSelectAnnual(page, "Actifs")
    await expect(table.getByRole("columnheader", { name: "Aoû 2026" })).toBeVisible({ timeout: 30000 })
    await expect(table.getByRole("columnheader", { name: "Aoû 2025" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Déc 2025" })).toHaveCount(0)

    await page.getByRole("combobox").filter({ hasText: HORIZON_LABEL.courant }).first().click()
    await page.getByRole("option", { name: HORIZON_LABEL.exercice }).click()

    await expect(table.getByRole("columnheader", { name: "Aoû 2026" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Déc 2025" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Aoû 2025" })).toHaveCount(0)
  })

  test("Trésorerie Sommaire Annuel 5 ans : Courant = Aoû chaque année, Exercice = Aoû puis Déc", async ({
    page,
  }) => {
    await setupAuth(page)
    await setupCashFlow(page)
    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}&refMonth=8&refYear=2026`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    })
    const table = await openSummaryAndSelectAnnual(page, "Flux de trésorerie - Exploitation")
    await expect(table.getByRole("columnheader", { name: "Aoû 2026" })).toBeVisible({ timeout: 30000 })
    await expect(table.getByRole("columnheader", { name: "Aoû 2025" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Déc 2025" })).toHaveCount(0)

    await page.getByRole("combobox").filter({ hasText: HORIZON_LABEL.courant }).first().click()
    await page.getByRole("option", { name: HORIZON_LABEL.exercice }).click()

    await expect(table.getByRole("columnheader", { name: "Aoû 2026" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Déc 2025" })).toBeVisible()
    await expect(table.getByRole("columnheader", { name: "Aoû 2025" })).toHaveCount(0)
  })
})
