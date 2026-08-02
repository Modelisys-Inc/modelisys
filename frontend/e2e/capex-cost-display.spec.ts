import { test, expect, Page } from "@playwright/test"

test.setTimeout(90_000)

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

function buildPeriods(endMonth: number) {
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
  return [2, 1, 0].map((offset) => {
    const m = endMonth - offset
    return {
      fiscalYear: 2026,
      fiscalMonth: m,
      label: `${monthNames[m]} 2026`,
    }
  })
}

async function setupCapexMocks(page: Page) {
  let savedStructure: Record<string, unknown>[] = [
    {
      id: "alt-row",
      label: "Immobilisations corporelles",
      defineMapping: true,
      linkCode: "ALT-B",
      displayFormat: "currency",
      capexCostDisplayMode: "actual",
    },
  ]

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
  await page.route("**/api/companies/*/financial-statements/**/series**", (route) => {
    const url = new URL(route.request().url())
    const statementType = url.pathname.split("/").slice(-2)[0]
    const monthParam = url.searchParams.get("month")
    const endMonth = monthParam ? parseInt(monthParam, 10) : 7
    const periods = buildPeriods(endMonth)
    const amountsKey = (m: number) => `2026-${m}`

    if (statementType === "income-statement") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType,
          fiscalYear: 2026,
          periods,
          rows: [
            {
              id: "rev",
              linkCode: "REV",
              label: "Revenus",
              amounts: {
                [amountsKey(endMonth - 2)]: 20000,
                [amountsKey(endMonth - 1)]: 21000,
                [amountsKey(endMonth)]: 22000,
              },
              isBold: false,
              isSection: false,
              isResult: false,
              detailRows: [],
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
        periods,
        rows: [
          {
            id: "alt-b",
            linkCode: "ALT-B",
            label: "Immobilisations corporelles",
            amounts: {
              [amountsKey(endMonth - 2)]: 100000,
              [amountsKey(endMonth - 1)]: 150000,
              [amountsKey(endMonth)]: 120000,
            },
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
        ],
      }),
    })
  })
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/capex**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "capex",
          structure: savedStructure,
        }),
      })
    }
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { structure?: Record<string, unknown>[] }
      if (Array.isArray(body.structure)) {
        savedStructure = body.structure
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "struct-1",
          company_id: COMPANY_ID,
          statement_type: "capex",
          structure: savedStructure,
        }),
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
          code: "ALT-B",
          family: "ALT",
          parent_code: null,
          label_account: "Immobilisations corporelles",
          label_sub_account: null,
          is_leaf: true,
          sort_order: 1,
        },
      ]),
    }),
  )
}

test.describe("Capex cost display mode", () => {
  test("switches between Réel and Variation in Paramètres", async ({ page }) => {
    await setupCapexMocks(page)
    await page.goto(
      `/analysis/capex?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
    )
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("row", { name: /Immobilisations corporelles/i })).toContainText(
      "120",
    )

    await page.getByRole("button", { name: "Paramètres" }).click()
    await expect(page.getByLabel("Affichage du coût ALT")).toBeVisible()
    await page.getByLabel("Affichage du coût ALT").click()
    await page.getByRole("option", { name: "Variation (N − N−1)" }).click()
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()

    await expect(page.getByRole("row", { name: /Immobilisations corporelles/i })).toContainText(
      "-30",
    )
  })
})
