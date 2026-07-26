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
        months_with_data: [5],
        accounts: [],
      }),
    }),
  )
}

test("Résultats Détail : chevrons Ouvrir/Fermer comme Bilan Détail", async ({ page }) => {
  await setupAuth(page)

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
          month: 5,
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
              detailRows: [
                {
                  id: "4000",
                  label: "4000 — Ventes produit",
                  current: 1000,
                  prior: 800,
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
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const ventesRow = page.locator("tr", { hasText: "Ventes" }).first()
  await expect(ventesRow).toBeVisible({ timeout: 30000 })
  await expect(ventesRow.locator("svg").first()).toBeVisible()
  await expect(page.getByText("4000 — Ventes produit")).toHaveCount(0)

  await ventesRow.click()
  await expect(page.getByText("4000 — Ventes produit")).toBeVisible()
  // Pas de n° GL affiché deux fois (colonne n° + libellé déjà préfixé)
  await expect(page.getByText(/^4000\s+4000/)).toHaveCount(0)
  const amountCell = ventesRow.locator("td").nth(1)
  await expect(amountCell).not.toHaveClass(/font-bold/)
})

test("Résultats Détail : poste REV en somme + dégras à l’ouverture", async ({ page }) => {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/income-statement`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Revenus",
              linkCode: "REV-A",
              liaisonMode: "sum",
              liaisonSumCodes: ["REV-A.1", "REV-A.2"],
              defineMapping: true,
              showInDetail: true,
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
          month: 5,
          rows: [
            {
              id: "REV-A",
              label: "Revenus",
              linkCode: "REV-A",
              current: 1500,
              prior: 1200,
              isBold: true,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
              detailRows: [
                {
                  id: "4000",
                  label: "4000 — Ventes A",
                  current: 1000,
                  prior: 800,
                  isBold: false,
                  isSection: false,
                  isResult: false,
                },
                {
                  id: "4010",
                  label: "4010 — Ventes B",
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
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const revenusRow = page.locator("tr", { hasText: "Revenus" }).first()
  await expect(revenusRow).toBeVisible({ timeout: 30000 })
  await expect(revenusRow.locator("svg").first()).toBeVisible()

  const amountCell = revenusRow.locator("td").nth(1)
  await expect(amountCell).toHaveClass(/font-bold/)

  await revenusRow.click()
  await expect(page.getByText("4000 — Ventes A")).toBeVisible()
  await expect(page.getByText("4010 — Ventes B")).toBeVisible()
  await expect(amountCell).not.toHaveClass(/font-bold/)
})

test("Résultats Détail : pas d’expansion sur titre d’annexe", async ({ page }) => {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/income-statement`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Revenus annexés",
              linkCode: "REV-A",
              liaisonMode: "sum",
              liaisonSumCodes: ["REV-A.1"],
              defineMapping: true,
              showInDetail: true,
              annexLetter: "A",
            },
            {
              label: "Ventes détail",
              linkCode: "REV-A.1",
              detailOnly: true,
              defineMapping: true,
              showInDetail: true,
              annexLetter: "A",
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
          month: 5,
          rows: [
            {
              id: "REV-A",
              label: "Revenus annexés",
              linkCode: "REV-A",
              current: 1000,
              prior: 800,
              isBold: true,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
              annexLetter: "A",
              detailRows: [
                {
                  id: "4000",
                  label: "4000 — Ventes",
                  current: 1000,
                  prior: 800,
                  isBold: false,
                  isSection: false,
                  isResult: false,
                },
              ],
            },
            {
              id: "REV-A.1",
              label: "Ventes détail",
              linkCode: "REV-A.1",
              current: 1000,
              prior: 800,
              isBold: false,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
              annexLetter: "A",
              detailOnly: true,
              detailRows: [
                {
                  id: "4000",
                  label: "4000 — Ventes",
                  current: 1000,
                  prior: 800,
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
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const annexTitle = page.locator("tr", { hasText: /Annexe A/ }).first()
  await expect(annexTitle).toBeVisible({ timeout: 30000 })
  await expect(annexTitle.locator("svg.lucide-chevron-right, svg.lucide-chevron-down")).toHaveCount(0)

  const detailLine = page.locator("tr", { hasText: "Ventes détail" }).first()
  await expect(detailLine).toBeVisible()
  await expect(detailLine.locator("svg").first()).toBeVisible()
})

test("Résultats Détail : séparateur toujours au-dessus du sous-total après expand GL", async ({
  page,
}) => {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/income-statement`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Revenus annexés",
              linkCode: "REV-A",
              liaisonMode: "sum",
              liaisonSumCodes: ["REV-A.1"],
              defineMapping: true,
              showInDetail: true,
              annexLetter: "A",
            },
            {
              label: "Ventes avant sous-total",
              linkCode: "REV-A.1",
              detailOnly: true,
              defineMapping: true,
              showInDetail: true,
              annexLetter: "A",
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
          month: 5,
          rows: [
            {
              id: "REV-A",
              label: "Revenus annexés",
              linkCode: "REV-A",
              current: 300,
              prior: 200,
              isBold: true,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
              annexLetter: "A",
            },
            {
              id: "REV-A.1",
              label: "Ventes avant sous-total",
              linkCode: "REV-A.1",
              current: 300,
              prior: 200,
              isBold: false,
              isSection: false,
              isResult: false,
              hasLiaisonCode: true,
              annexLetter: "A",
              detailOnly: true,
              detailRows: [
                {
                  id: "4000",
                  label: "4000 — Ventes GL",
                  current: 180,
                  prior: 120,
                  isBold: false,
                  isSection: false,
                  isResult: false,
                },
                {
                  id: "4010",
                  label: "4010 — Autres ventes GL",
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
    `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=5&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

  const ventesRow = page.locator("tr", { hasText: "Ventes avant sous-total" }).first()
  await expect(ventesRow).toBeVisible({ timeout: 30000 })
  await ventesRow.click()
  await expect(page.getByText("4000 — Ventes GL")).toBeVisible()
  await expect(page.getByText("4010 — Autres ventes GL")).toBeVisible()

  const separator = page.getByTestId("income-statement-detail-subtotal-separator")
  await expect(separator).toBeVisible()
  // Même style que Bilan Détail : border-t-2 slate-900 sur la cellule (table border-separate)
  await expect(separator.locator("td")).toHaveClass(/border-t-2/)
  await expect(separator.locator("td")).toHaveClass(/border-t-slate-900/)
  const lastGl = page.locator("tr", { hasText: "4010 — Autres ventes GL" })
  const subtotal = page.locator("tr", { hasText: /Sous-total — Annexe A/ })
  await expect(subtotal).toBeVisible()

  await expect
    .poll(async () => {
      const sepBox = await separator.boundingBox()
      const glBox = await lastGl.boundingBox()
      const subBox = await subtotal.boundingBox()
      if (!sepBox || !glBox || !subBox) return false
      return glBox.y < sepBox.y && sepBox.y <= subBox.y
    })
    .toBe(true)
})
