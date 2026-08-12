import { test, expect, Page } from "@playwright/test"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"
import { PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

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

const DETAIL_STRUCTURE = [
  {
    id: "tex-exp-row",
    label: "Flux de trésorerie - Exploitation",
    linkCode: "TEX-EXP",
    liaisonMode: "single",
    defineMapping: true,
    showInSummary: true,
    isBold: true,
  },
  {
    id: "tin-inv-row",
    label: "Flux de trésorerie - Investissement",
    linkCode: "TIN-INV",
    liaisonMode: "single",
    defineMapping: true,
    showInSummary: true,
    isBold: true,
  },
]

function buildMultiYearSeries() {
  const monthLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
  const periods: Array<{ fiscalYear: number; fiscalMonth: number; label: string }> = []
  const texAmounts: Record<string, number> = {}
  const tinAmounts: Record<string, number> = {}
  for (let year = 2021; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({
        fiscalYear: year,
        fiscalMonth: month,
        label: `${monthLabels[month - 1]} ${year}`,
      })
      texAmounts[`${year}-${month}`] = 1000 + year + month
      tinAmounts[`${year}-${month}`] = -(500 + year + month)
    }
  }
  return {
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
        amounts: texAmounts,
        detailRows: [],
      },
      {
        id: "tin-inv-row",
        label: "Flux de trésorerie - Investissement",
        linkCode: "TIN-INV",
        isBold: true,
        isSection: false,
        isResult: false,
        hasLiaisonCode: true,
        amounts: tinAmounts,
        detailRows: [],
      },
    ],
  }
}

async function setupAuth(page: Page) {
  const pageErrors: string[] = []
  page.on("pageerror", (err) => pageErrors.push(String(err)))
  ;(page as Page & { __pageErrors?: string[] }).__pageErrors = pageErrors

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
        body: JSON.stringify({ companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }] }),
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

  const series = buildMultiYearSeries()

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
        period: "monthly",
        rows: series.rows.map((r) => ({
          id: r.id,
          label: r.label,
          linkCode: r.linkCode,
          current: 1250,
          prior: 1000,
          isBold: true,
          isSection: false,
          isResult: false,
          hasLiaisonCode: true,
          detailRows: [],
        })),
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
        period: "monthly",
        rows: series.rows.map((r) => ({
          id: r.id,
          label: r.label,
          linkCode: r.linkCode,
          current: 1250,
          prior: 1000,
          isBold: true,
          isSection: false,
          isResult: false,
          hasLiaisonCode: true,
          detailRows: [],
        })),
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
          structure: DETAIL_STRUCTURE,
        }),
      })
    }
    return route.continue()
  })

  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ statementType: "balance-sheet", periods: series.periods, rows: [] }),
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
        rows: [],
      }),
    })
  })
}

test.describe("Trésorerie Annuel - 5 ans colonnes", () => {
  test.setTimeout(120_000)

  test(`Sommaire : exactement ${PERFORMANCE_CHART_YEAR_COUNT} colonnes année, thead=tbody`, async ({
    page,
  }) => {
    await setupAuth(page)
    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    })
    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("Flux de trésorerie - Exploitation")).toBeVisible({ timeout: 30000 })

    const errors = (page as Page & { __pageErrors?: string[] }).__pageErrors ?? []
    expect(errors, `pageerrors: ${errors.join(" | ")}`).toEqual([])

    await page
      .getByRole("combobox")
      .filter({ hasText: /Mois actuel|Mensuel|Trimestriel|Annuel|YTD|DDM/i })
      .first()
      .click()
    await page.getByRole("option", { name: HORIZON_LABEL.annuel5Ans }).click()
    await expect(page.getByText(HORIZON_LABEL.annuel5Ans).first()).toBeVisible()

    const yearHeaders = table.locator("thead th").filter({ hasText: /^Aoû 20\d{2}$|^Août 20\d{2}$/ })
    await expect(yearHeaders).toHaveCount(PERFORMANCE_CHART_YEAR_COUNT)

    const headerCount = await table.locator("thead tr").first().locator("th").count()
    const firstDataRow = table
      .locator("tbody tr")
      .filter({ hasText: "Flux de trésorerie - Exploitation" })
      .first()
    const cellCount = await firstDataRow.locator("td").count()
    expect(cellCount).toBe(headerCount)
    expect(headerCount).toBe(1 + PERFORMANCE_CHART_YEAR_COUNT)
    await expect(table).toHaveClass(/table-fixed/)
  })

  test(`Détail : exactement ${PERFORMANCE_CHART_YEAR_COUNT} colonnes année, thead=tbody`, async ({
    page,
  }) => {
    await setupAuth(page)
    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`, {
      waitUntil: "domcontentloaded",
      timeout: 120_000,
    })
    await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("Flux de trésorerie - Exploitation")).toBeVisible({ timeout: 30000 })

    await page
      .getByRole("combobox")
      .filter({ hasText: /Mois actuel|Mensuel|Trimestriel|Annuel|YTD|DDM/i })
      .first()
      .click()
    await page.getByRole("option", { name: HORIZON_LABEL.annuel5Ans }).click()

    const yearHeaders = table.locator("thead th").filter({ hasText: /^Aoû 20\d{2}$|^Août 20\d{2}$/ })
    await expect(yearHeaders).toHaveCount(PERFORMANCE_CHART_YEAR_COUNT)

    const headerCount = await table.locator("thead tr").first().locator("th").count()
    const firstDataRow = table
      .locator("tbody tr")
      .filter({ hasText: "Flux de trésorerie - Exploitation" })
      .first()
    expect(await firstDataRow.locator("td").count()).toBe(headerCount)
    expect(headerCount).toBe(1 + PERFORMANCE_CHART_YEAR_COUNT)
    await expect(table).toHaveClass(/table-fixed/)
  })
})
