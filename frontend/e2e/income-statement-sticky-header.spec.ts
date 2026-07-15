import { test, expect, Page } from "@playwright/test"

test.setTimeout(60_000)

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
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          code: "REV-A.1",
          family: "REV",
          is_leaf: true,
          label: "Ventes",
          label_account: "Ventes",
          label_sub_account: "",
          parent_code: "REV-A",
          sort_order: 1,
          is_active: true,
        },
      ]),
    }),
  )
  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-chart-configs**`,
    (route) =>
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
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance?fiscal_year=2026`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_id: COMPANY_ID,
        fiscal_year: 2026,
        months_with_data: [7],
        accounts: [],
      }),
    }),
  )
}

async function mockIncomeStatement(page: Page) {
  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/income-statement`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Ventes",
              linkCode: "REV-A.1",
              defineMapping: true,
              showInDetail: true,
              showInSummary: true,
            },
          ],
        }),
      }),
  )

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement*`,
    (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "income-statement",
            fiscalYear: 2026,
            periods: [],
            rows: [],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "income-statement",
          fiscalYear: 2026,
          month: 7,
          rows: [
            {
              id: "REV-A.1",
              label: "Ventes",
              linkCode: "REV-A.1",
              current: 1000,
              prior: 800,
              isBold: false,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
            },
          ],
        }),
      })
    },
  )
}

test("Résultats Sommaire : en-tête Poste figé", async ({ page }) => {
  await setupAuth(page)
  await mockIncomeStatement(page)

  await page.goto(
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })

  const header = page.getByRole("columnheader", { name: "Poste" })
  await expect(header).toBeVisible({ timeout: 30000 })
  await expect(header).toHaveCSS("position", "sticky")
})

test("Résultats Détail : en-tête Compte figé", async ({ page }) => {
  await setupAuth(page)
  await mockIncomeStatement(page)

  await page.goto(
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const header = page.getByRole("columnheader", { name: "Compte" })
  await expect(header).toBeVisible({ timeout: 30000 })
  await expect(header).toHaveCSS("position", "sticky")
})
