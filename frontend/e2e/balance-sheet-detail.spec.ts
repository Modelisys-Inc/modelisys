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
      body: JSON.stringify([]),
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
        months_with_data: [5],
        accounts: [
          {
            account_number: "1000",
            description: "Cash",
            monthly_amounts: { Mai: 100 },
          },
        ],
      }),
    }),
  )
}

test("Bilan Détail masque les postes à zéro selon l’horizon", async ({ page }) => {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Trésorerie",
              linkCode: "ACT-A",
              liaisonMode: "sum",
              liaisonSumCodes: ["ACT-A.1"],
              defineMapping: true,
              showInDetail: true,
              annexLetter: "A",
            },
            {
              label: "Encaisse",
              linkCode: "ACT-A.1",
              detailOnly: true,
              defineMapping: true,
              annexLetter: "A",
            },
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
          month: 5,
          rows: [
            {
              id: "ACT-A.1",
              label: "Trésorerie",
              current: 0,
              prior: 0,
              isBold: false,
              isSection: false,
              isResult: false,
            },
          ],
        }),
      })
    },
  )

  await page.goto(
    `/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  await expect(page.getByText(/Aucune donnée disponible/)).toBeVisible({ timeout: 30000 })
  await expect(page.getByText(/Annexe A —/)).toHaveCount(0)
  await expect(page.getByText("Encaisse")).toHaveCount(0)
})

test("Bilan Détail : expand GL dès 1 compte, montants non gras à l’ouverture", async ({
  page,
}) => {
  await setupAuth(page)

  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          code: "ACT-A.1",
          family: "ACT",
          is_leaf: true,
          label: "Encaisse",
          label_account: "Encaisse",
          label_sub_account: "",
          parent_code: "ACT-A",
          sort_order: 1,
          is_active: true,
        },
      ]),
    }),
  )

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Encaisse",
              linkCode: "ACT-A.1",
              defineMapping: true,
              showInDetail: true,
            },
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
          month: 5,
          rows: [
            {
              id: "ACT-A.1",
              label: "Encaisse",
              linkCode: "ACT-A.1",
              current: 500,
              prior: 400,
              isBold: true,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
              detailRows: [
                {
                  id: "1000",
                  label: "1000 — Cash",
                  current: 500,
                  prior: 400,
                  isBold: false,
                  isSection: false,
                  isResult: false,
                },
              ],
            },
          ],
        }),
      })
    },
  )

  await page.goto(
    `/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const encaisseRow = page.locator("tr", { hasText: "Encaisse" }).first()
  await expect(encaisseRow).toBeVisible({ timeout: 30000 })
  await expect(encaisseRow.locator("svg").first()).toBeVisible()

  const amountCell = encaisseRow.locator("td").nth(1)
  await expect(amountCell).toHaveClass(/font-bold/)

  await encaisseRow.click()
  await expect(page.getByText("1000 — Cash")).toBeVisible()
  await expect(amountCell).not.toHaveClass(/font-bold/)
})

test("Bilan Détail : en-tête Compte figé comme au Sommaire", async ({ page }) => {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Encaisse",
              linkCode: "ACT-A.1",
              defineMapping: true,
              showInDetail: true,
            },
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
          month: 5,
          rows: [
            {
              id: "ACT-A.1",
              label: "Encaisse",
              linkCode: "ACT-A.1",
              current: 500,
              prior: 400,
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

  await page.goto(
    `/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const header = page.getByRole("columnheader", { name: "Compte" })
  await expect(header).toBeVisible({ timeout: 30000 })
  await expect(header).toHaveCSS("position", "sticky")
})

test("Bilan Détail : séparateur toujours au-dessus du sous-total après expand GL", async ({
  page,
}) => {
  await setupAuth(page)

  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          code: "PCT-A.1",
          family: "PCT",
          is_leaf: true,
          label: "Taxes à la consommation",
          label_account: "Taxes à la consommation",
          label_sub_account: "",
          parent_code: "PCT-A",
          sort_order: 1,
          is_active: true,
        },
      ]),
    }),
  )

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Taxes à la consommation",
              linkCode: "PCT-A.1",
              defineMapping: true,
              showInDetail: true,
              annexLetter: "B",
              detailOnly: true,
            },
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
          month: 5,
          rows: [
            {
              id: "PCT-A.1",
              label: "Taxes à la consommation",
              linkCode: "PCT-A.1",
              current: 300,
              prior: 200,
              isBold: false,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
              annexLetter: "B",
              detailOnly: true,
              detailRows: [
                {
                  id: "2100",
                  label: "2100 — TPS",
                  current: 180,
                  prior: 120,
                  isBold: false,
                  isSection: false,
                  isResult: false,
                },
                {
                  id: "2110",
                  label: "2110 — TVQ",
                  current: 120,
                  prior: 80,
                  isBold: false,
                  isSection: false,
                  isResult: false,
                },
              ],
            },
          ],
        }),
      })
    },
  )

  await page.goto(
    `/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const taxesRow = page.locator("tr", { hasText: "Taxes à la consommation" }).first()
  await expect(taxesRow).toBeVisible({ timeout: 30000 })
  await taxesRow.click()
  await expect(page.getByText("2100 — TPS")).toBeVisible()
  await expect(page.getByText("2110 — TVQ")).toBeVisible()

  const separator = page.getByTestId("balance-sheet-detail-subtotal-separator")
  await expect(separator).toBeVisible()
  const tvq = page.locator("tr", { hasText: "2110 — TVQ" })
  const subtotal = page.locator("tr", { hasText: /Sous-total — Annexe B/ })
  await expect(subtotal).toBeVisible()

  // Ordre DOM : … TVQ → séparateur → sous-total
  await expect
    .poll(async () => {
      const sepBox = await separator.boundingBox()
      const tvqBox = await tvq.boundingBox()
      const subBox = await subtotal.boundingBox()
      if (!sepBox || !tvqBox || !subBox) return false
      return tvqBox.y < sepBox.y && sepBox.y <= subBox.y
    })
    .toBe(true)
})

test("Affichage n'offre plus % actif (Sommaire et Détail)", async ({ page }) => {
  test.setTimeout(180_000)
  await setupAuth(page)

  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet**`, (route) => {
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
        month: 5,
        period: "monthly",
        rows: [],
      }),
    })
  })
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: null,
        company_id: COMPANY_ID,
        statement_type: "balance-sheet",
        structure: [],
      }),
    }),
  )

  await page.goto(`/financial-statements/balance-sheet?companyId=${COMPANY_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  })

  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
  await page.getByLabel("Affichage").click()
  await expect(page.getByRole("option", { name: "Comparaison" })).toBeVisible()
  await expect(page.getByRole("option", { name: "Variation $" })).toBeVisible()
  await expect(page.getByRole("option", { name: "Variation %" })).toBeVisible()
  await expect(page.getByRole("option", { name: "% actif" })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await page.getByRole("button", { name: /^Détail$/ }).click()
  await page.getByLabel("Affichage").click()
  await expect(page.getByRole("option", { name: "Comparaison" })).toBeVisible()
  await expect(page.getByRole("option", { name: "Variation $" })).toBeVisible()
  await expect(page.getByRole("option", { name: "Variation %" })).toBeVisible()
  await expect(page.getByRole("option", { name: "% actif" })).toHaveCount(0)
})
