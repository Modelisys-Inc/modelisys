import { test, expect, Page } from "@playwright/test"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

test.setTimeout(90_000)

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

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
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budgets: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/ratios**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "ratios",
          structure: [
            { label: "Liquidité", isBold: true, defineMapping: false },
            {
              label: "Ratio de liquidité générale",
              defineMapping: true,
              liaisonMode: "na",
              displayFormat: "number",
            },
            {
              label: "Ratio de liquidité immédiate",
              defineMapping: true,
              liaisonMode: "na",
              displayFormat: "number",
            },
            {
              label: "Ratio ACT",
              defineMapping: true,
              liaisonMode: "single",
              linkCode: "ACT",
              displayFormat: "number",
            },
          ],
        }),
      })
    }
    if (route.request().method() === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: route.request().postData() ?? "{}",
      })
    }
    return route.continue()
  })
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "1",
          code: "ACT",
          family: "ACT",
          parent_code: null,
          label_account: "Actifs courants",
          label_sub_account: null,
          is_leaf: false,
          sort_order: 1,
          is_active: true,
          attached_link_codes: [],
        },
        {
          id: "2",
          code: "CMV",
          family: "CMV",
          parent_code: null,
          label_account: "Coût des marchandises vendues",
          label_sub_account: null,
          is_leaf: false,
          sort_order: 2,
          is_active: true,
          attached_link_codes: [],
        },
        {
          id: "3",
          code: "CMV.1",
          family: "CMV",
          parent_code: "CMV",
          label_account: "Coût des marchandises vendues",
          label_sub_account: "Achats",
          is_leaf: true,
          sort_order: 3,
          is_active: true,
          attached_link_codes: [],
        },
        {
          id: "4",
          code: "TEX-A",
          family: "TEX",
          parent_code: null,
          label_account: "Exploitation",
          label_sub_account: null,
          is_leaf: true,
          sort_order: 4,
          is_active: true,
          attached_link_codes: [],
        },
      ]),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/custom-link-codes**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  )
  await page.route("**/api/companies/*/financial-statements/**/series**", (route) => {
    const url = new URL(route.request().url())
    const monthParam = url.searchParams.get("month")
    const endMonth = monthParam ? parseInt(monthParam, 10) : 12
    const isIncome = url.pathname.includes("income-statement")
    const isCashFlow = url.pathname.includes("cash-flow")
    const monthNames = [
      "",
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ]
    const periods = [2, 1, 0].map((offset) => {
      const m = endMonth - offset
      return {
        fiscalYear: 2026,
        fiscalMonth: m,
        label: `${monthNames[m]} 2026`,
      }
    })
    const amountsKey = (m: number) => `2026-${m}`
    const amounts = (values: [number, number, number]) => ({
      [amountsKey(endMonth - 2)]: values[0],
      [amountsKey(endMonth - 1)]: values[1],
      [amountsKey(endMonth)]: values[2],
    })
    const rows = isCashFlow
      ? []
      : isIncome
      ? [
          {
            id: "rev",
            linkCode: "REV",
            label: "Revenus",
            amounts: amounts([20000, 21000, 22000]),
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "gp",
            label: "Bénéfice brut",
            amounts: amounts([8000, 8400, 8800]),
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "ni",
            label: "Bénéfice net",
            amounts: amounts([2000, 2100, 2200]),
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "ebitda",
            label: "BAIIA",
            amounts: amounts([4000, 4200, 4400]),
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "int",
            label: "Charges financières",
            amounts: amounts([200, 200, 200]),
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
        ]
      : [
          {
            id: "ca",
            linkCode: "ACT",
            label: "Actif courant",
            amounts: amounts([90000, 95000, 100000]),
            isBold: true,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "cl",
            linkCode: "PCT",
            label: "Passif courant",
            amounts: amounts([35000, 38000, 40000]),
            isBold: true,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "inv",
            label: "Stocks",
            amounts: amounts([9000, 9500, 10000]),
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "tl",
            label: "Total du passif",
            amounts: amounts([50000, 55000, 60000]),
            isBold: true,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "eq",
            label: "Capitaux propres",
            amounts: amounts([100000, 110000, 120000]),
            isBold: true,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
        ]

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: isIncome
          ? "income-statement"
          : isCashFlow
            ? "cash-flow-detail"
            : "balance-sheet",
        fiscalYear: 2026,
        periods,
        rows,
      }),
    })
  })
}

test.describe("Ratios financiers — chrome Capex / FDR", () => {
  test("hero, Tableau de bord / Sommaire, date de référence et Moyenne", async ({ page }) => {
    await setupAuth(page)

    const seriesMonths: string[] = []
    page.on("request", (req) => {
      if (!req.url().includes("/financial-statements/") || !req.url().includes("/series")) return
      const month = new URL(req.url()).searchParams.get("month")
      if (month != null) seriesMonths.push(month)
    })

    await page.goto(`/analysis/ratios?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`)

    await expect(page.locator("h2").filter({ hasText: /Ratios financiers/i })).toBeVisible({
      timeout: 15000,
    })

    await expect.poll(() => seriesMonths.some((m) => m === "7")).toBeTruthy()
    expect(seriesMonths.every((m) => m === "7")).toBeTruthy()

    await expect(page.getByText("Date de référence")).toBeVisible()
    await expect(page.getByRole("button", { name: /^Tableau de bord$/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Sommaire$/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Détail$/ })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toHaveCount(0)
    await expect(page.getByText("Entités", { exact: true })).toBeVisible()
    await expect(page.getByText("Horizon", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: /^Sommaire$/ }).click()
    await expect(page.getByTestId("ratios-summary-table-scroll")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Métrique", { exact: true })).toBeVisible()
    await expect(page.getByText("Moyenne", { exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible()

    const headers = page.locator("[data-testid='ratios-summary-table-scroll'] thead th")
    await expect(headers.nth(2)).toHaveText("Juillet 2026")
    await expect(headers.nth(3)).toHaveText("Juin 2026")
    await expect(page.getByText("Décembre 2026")).toHaveCount(0)

    const currentRatioRow = page
      .locator("tbody tr")
      .filter({ hasText: "Ratio de liquidité générale" })
    await expect(currentRatioRow.locator("td").nth(2)).toContainText("2.50x")
    await expect(currentRatioRow.locator("td").nth(3)).toContainText("2.50x")

    await page.getByText("Horizon", { exact: true }).locator("..").getByRole("combobox").click()
    await page.getByRole("option", { name: /Mensuel|12 mois/i }).click()
    await expect(headers.nth(2)).toHaveText("Juillet 2026")
    await expect(headers.nth(3)).toHaveText("Juin 2026")
    await expect(headers.nth(4)).toHaveText("Mai 2026")
  })

  test("Sommaire Annuel 5 ans : table-fixed, entêtes mois+année", async ({ page }) => {
    await setupAuth(page)
    await page.goto(`/analysis/ratios?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`)
    await expect(page.locator("h2").filter({ hasText: /Ratios financiers/i })).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole("button", { name: /^Sommaire$/ }).click()
    await expect(page.getByText("Métrique", { exact: true })).toBeVisible({ timeout: 15000 })

    await page.getByText("Horizon", { exact: true }).locator("..").getByRole("combobox").click()
    await page.getByRole("option", { name: HORIZON_LABEL.annuel5Ans }).click()

    const table = page.locator("[data-testid='ratios-summary-table-scroll'] table")
    await expect(table).toHaveClass(/table-fixed/)
    const headers = table.locator("thead tr").first().locator("th")
    const headerCount = await headers.count()
    const firstDataRow = table.locator("tbody tr").filter({ hasText: "Ratio de liquidité générale" })
    await expect(firstDataRow).toBeVisible()
    expect(await firstDataRow.locator("td").count()).toBe(headerCount)
    expect(headerCount).toBeGreaterThanOrEqual(3)
    await expect(headers.nth(2)).toHaveText("Jul 2026")
    await expect(headers.filter({ hasText: /^20\d{2}$/ })).toHaveCount(0)
  })

  test("Paramètres : picker de liaison avec tous les codes (CMV.1)", async ({ page }) => {
    await setupAuth(page)
    await page.goto(`/analysis/ratios?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`)
    await page.getByRole("button", { name: /^Sommaire$/ }).click()
    await expect(page.getByTestId("ratios-summary-table-scroll")).toBeVisible({ timeout: 15000 })

    await page.getByRole("button", { name: /^Paramètres$/ }).click()
    await expect(page.getByText(/Édition structure/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("columnheader", { name: /^Liaison$/ })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /^Format$/ })).toBeVisible()

    await page.getByRole("button", { name: "ACT", exact: true }).click()
    await page.getByRole("combobox").filter({ hasText: /ACT/ }).click()
    await expect(page.getByRole("option", { name: /CMV\.1 — Achats/ })).toBeVisible()
  })
})
