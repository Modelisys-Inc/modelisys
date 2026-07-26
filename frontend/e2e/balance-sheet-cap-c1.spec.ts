import { test, expect, Page } from "@playwright/test"

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
          id: "cap-c",
          code: "CAP-C",
          parent_code: null,
          family: "CAP",
          label_sub_account: "Bénéfices non répartis",
          is_leaf: false,
          sort_order: 1,
        },
        {
          id: "cap-c-1",
          code: "CAP-C.1",
          parent_code: "CAP-C",
          family: "CAP",
          label_sub_account: "Bénéfice net",
          is_leaf: true,
          sort_order: 2,
        },
        {
          id: "cap-c-2",
          code: "CAP-C.2",
          parent_code: "CAP-C",
          family: "CAP",
          label_sub_account: "Dividendes",
          is_leaf: true,
          sort_order: 3,
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
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance**`, (route) => {
    if (route.request().url().includes("fiscal-years")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([2026]),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_id: COMPANY_ID,
        fiscal_year: 2026,
        months_with_data: [7],
        accounts: [],
      }),
    })
  })
}

test("Sommaire : CAP-C.1 sous expansion CAP-C, pas de ligne Bénéfice net plate", async ({
  page,
}) => {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            { label: "Capitaux propres", isSection: true, isBold: true },
            {
              label: "Bénéfices non répartis",
              linkCode: "CAP-C",
              showInDetail: true,
              annexLetter: "C",
              defineMapping: true,
            },
            {
              label: "Bénéfice net",
              linkCode: "CAP-C.1",
              detailOnly: true,
              annexLetter: "C",
              defineMapping: false,
              isComputedNetIncome: true,
              showInDetail: true,
              liaisonMode: "difference",
              liaisonNumeratorCodes: ["REV-A.1"],
              liaisonDenominatorCodes: ["EXP-A.1"],
            },
            {
              label: "Dividendes",
              linkCode: "CAP-C.2",
              detailOnly: true,
              annexLetter: "C",
              defineMapping: true,
              showInDetail: true,
            },
            // Flat CAP-C.1 (ensure) — must stay hidden on Sommaire
            {
              label: "Bénéfice net calculé",
              linkCode: "CAP-C.1",
              defineMapping: false,
              isComputedNetIncome: true,
              showInDetail: true,
              indent: true,
              liaisonMode: "difference",
              liaisonNumeratorCodes: ["REV-A.1"],
              liaisonDenominatorCodes: ["EXP-A.1"],
            },
            { label: "Total passifs et capitaux propres", isResult: true, isBold: true },
          ],
        }),
      }),
  )

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet*`,
    (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
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
          statementType: "balance-sheet",
          fiscalYear: 2026,
          month: 7,
          rows: [
            {
              id: "CAP-C",
              label: "Bénéfices non répartis",
              linkCode: "CAP-C",
              current: 1500,
              prior: 1000,
              hasLiaisonCode: true,
              showInDetail: true,
              annexLetter: "C",
            },
            {
              id: "CAP-C.1",
              label: "Bénéfice net",
              linkCode: "CAP-C.1",
              current: 1200,
              prior: 800,
              detailOnly: true,
              annexLetter: "C",
              hasLiaisonCode: true,
              showInDetail: true,
            },
            {
              id: "CAP-C.2",
              label: "Dividendes",
              linkCode: "CAP-C.2",
              current: 300,
              prior: 200,
              detailOnly: true,
              annexLetter: "C",
              hasLiaisonCode: true,
              showInDetail: true,
            },
            {
              id: "total",
              label: "Total passifs et capitaux propres",
              current: 1500,
              prior: 1000,
              isResult: true,
            },
          ],
        }),
      })
    },
  )

  await page.goto(
    `/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
  )

  const sommaire = page.getByRole("button", { name: /Sommaire/i }).or(
    page.getByRole("tab", { name: /Sommaire/i }),
  )
  if (await sommaire.first().isVisible().catch(() => false)) {
    await sommaire.first().click()
  }

  await expect(page.getByText("Bénéfices non répartis").first()).toBeVisible({
    timeout: 30_000,
  })
  // Pas de ligne plate autonome
  await expect(page.getByText("Bénéfice net calculé")).toHaveCount(0)

  const capRow = page.locator("tr", { hasText: "Bénéfices non répartis" }).first()
  await capRow.click()

  const annexChild = page.getByTestId("balance-sheet-summary-annex-child").filter({
    hasText: "CAP-C.1",
  })
  await expect(annexChild).toBeVisible({ timeout: 15_000 })
  await expect(annexChild.getByText("Bénéfice net")).toBeVisible()
})

test("Sommaire GL : expansion CAP-C inclut Bénéfice net (CAP-C.1) pour égaler le total", async ({
  page,
}) => {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            { label: "Capitaux propres", isSection: true, isBold: true },
            {
              label: "Bénéfices non répartis",
              linkCode: "CAP-C",
              defineMapping: true,
              liaisonMode: "single",
              showInDetail: false,
            },
            {
              label: "Bénéfice net",
              linkCode: "CAP-C.1",
              detailOnly: true,
              isComputedNetIncome: true,
              defineMapping: false,
            },
          ],
        }),
      }),
  )

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`,
    (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
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
          statementType: "balance-sheet",
          fiscalYear: 2026,
          month: 7,
          rows: [
            {
              id: "CAP-C",
              label: "Bénéfices non répartis",
              linkCode: "CAP-C",
              current: 1500,
              prior: 1000,
              hasLiaisonCode: true,
              showInDetail: false,
              detailRows: [
                { id: "3100", label: "BNR début", current: 300, prior: 200 },
              ],
            },
            {
              id: "CAP-C.1",
              label: "Bénéfice net",
              linkCode: "CAP-C.1",
              current: 1200,
              prior: 800,
              detailOnly: true,
              hasLiaisonCode: false,
            },
          ],
        }),
      })
    },
  )

  await page.goto(
    `/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
  )

  const sommaire = page.getByRole("button", { name: /Sommaire/i }).or(
    page.getByRole("tab", { name: /Sommaire/i }),
  )
  if (await sommaire.first().isVisible().catch(() => false)) {
    await sommaire.first().click()
  }

  await expect(page.getByText("Bénéfices non répartis").first()).toBeVisible({
    timeout: 30_000,
  })

  const capRow = page.locator("tr", { hasText: "Bénéfices non répartis" }).first()
  await capRow.click()

  const glNi = page.getByTestId("balance-sheet-summary-gl-child").filter({
    hasText: "CAP-C.1",
  })
  await expect(glNi).toBeVisible({ timeout: 15_000 })
  await expect(glNi.getByText("Bénéfice net")).toBeVisible()
  await expect(page.getByTestId("balance-sheet-summary-gl-child").filter({ hasText: "3100" })).toBeVisible()
})
