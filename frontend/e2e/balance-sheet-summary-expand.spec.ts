import { test, expect, Page } from "@playwright/test"

test.setTimeout(120_000)

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
        accounts: [
          {
            account_number: "1000",
            description: "Caisse",
            monthly_amounts: { Juillet: 100 },
          },
        ],
      }),
    })
  })
}

test("Sommaire Bilan : annexe → codes enfants ; sans annexe → GL", async ({ page }) => {
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
              label: "Actifs",
              isSection: true,
              isBold: true,
              showInDetail: false,
            },
            {
              label: "Comptes clients",
              linkCode: "ACT-A",
              liaisonMode: "single",
              defineMapping: true,
              showInDetail: true,
              annexLetter: "A",
            },
            {
              label: "Clients courants",
              linkCode: "ACT-A.1",
              detailOnly: true,
              defineMapping: true,
              annexLetter: "A",
              showInDetail: true,
            },
            {
              label: "Clients douteux",
              linkCode: "ACT-A.2",
              detailOnly: true,
              defineMapping: true,
              annexLetter: "A",
              showInDetail: true,
            },
            {
              label: "Clients retenus",
              linkCode: "ACT-A.3",
              detailOnly: true,
              defineMapping: true,
              annexLetter: "A",
              showInDetail: true,
            },
            {
              label: "Encaisse",
              linkCode: "ACT-B",
              liaisonMode: "single",
              defineMapping: true,
              showInDetail: false,
            },
            {
              label: "Actifs sommés",
              liaisonMode: "sum",
              liaisonSumCodes: ["ACT-A", "ACT-B"],
              defineMapping: true,
              showInDetail: false,
            },
            {
              label: "Total actif",
              isResult: true,
              isBold: true,
              formula: ["+ACT-A", "+ACT-B"],
              showInDetail: false,
            },
            {
              label: "Total passifs et capitaux propres",
              isResult: true,
              isBold: true,
              formula: ["+ACT-A", "+ACT-B"],
              showInDetail: false,
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
          month: 7,
          rows: [
            {
              id: "ACT-A",
              label: "Comptes clients",
              current: 1000,
              prior: 900,
              isBold: false,
              isSection: false,
              isResult: false,
              showInDetail: true,
              annexLetter: "A",
              detailRows: [
                { id: "1200", label: "1200 Clients GL", current: 700, prior: 600 },
                { id: "1210", label: "1210 Douteux GL", current: 300, prior: 300 },
              ],
              hasLiaisonCode: true,
            },
            {
              id: "ACT-A.1",
              label: "Clients courants",
              current: 700,
              prior: 600,
              isBold: false,
              isSection: false,
              isResult: false,
              detailOnly: true,
              annexLetter: "A",
              showInDetail: true,
              detailRows: [],
              hasLiaisonCode: true,
            },
            {
              id: "ACT-A.2",
              label: "Clients douteux",
              current: 0,
              prior: 0,
              isBold: false,
              isSection: false,
              isResult: false,
              detailOnly: true,
              annexLetter: "A",
              showInDetail: true,
              detailRows: [],
              hasLiaisonCode: true,
            },
            {
              id: "ACT-A.3",
              label: "Clients retenus",
              current: 300,
              prior: 300,
              isBold: false,
              isSection: false,
              isResult: false,
              detailOnly: true,
              annexLetter: "A",
              showInDetail: true,
              detailRows: [],
              hasLiaisonCode: true,
            },
            {
              id: "ACT-B",
              label: "Encaisse",
              current: 500,
              prior: 400,
              isBold: false,
              isSection: false,
              isResult: false,
              showInDetail: false,
              detailRows: [
                { id: "1000", label: "1000 Caisse", current: 300, prior: 250 },
                { id: "1010", label: "1010 Banque", current: 200, prior: 150 },
                { id: "1020", label: "1020 Compte à 0", current: 0, prior: 0 },
              ],
              hasLiaisonCode: true,
            },
            {
              id: "sum-assets",
              label: "Actifs sommés",
              current: 1500,
              prior: 1300,
              isBold: true,
              isSection: false,
              isResult: false,
              showInDetail: false,
              detailRows: [
                { id: "8888", label: "8888 Ne doit pas s'ouvrir (formule)", current: 1500, prior: 1300 },
              ],
              hasLiaisonCode: true,
            },
            {
              id: "total-assets",
              label: "Total actif",
              current: 1500,
              prior: 1300,
              isBold: true,
              isSection: false,
              isResult: true,
              // GLs présents volontairement : les sous-totaux ne doivent pas s’ouvrir
              detailRows: [
                { id: "9999", label: "9999 Ne doit pas s'ouvrir", current: 1500, prior: 1300 },
              ],
              hasLiaisonCode: true,
            },
            {
              id: "total-le",
              label: "Total passifs et capitaux propres",
              current: 1500,
              prior: 1300,
              isBold: true,
              isSection: false,
              isResult: true,
              detailRows: [],
              hasLiaisonCode: true,
            },
          ],
        }),
      })
    },
  )

  await page.goto(
    `/financial-statements/balance-sheet?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
  )
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })

  const annexParent = page.getByTestId("balance-sheet-summary-expand-annex").first()
  await expect(annexParent).toBeVisible({ timeout: 30000 })
  await annexParent.click()
  await expect(page.getByTestId("balance-sheet-summary-annex-child")).toHaveCount(2)
  await expect(page.getByText("ACT-A.1")).toBeVisible()
  await expect(page.getByText("ACT-A.3")).toBeVisible()
  await expect(page.getByText("ACT-A.2")).toHaveCount(0)
  await expect(page.getByText("1200 Clients GL")).toHaveCount(0)

  const glParent = page.getByTestId("balance-sheet-summary-expand-gl").first()
  await expect(glParent).toBeVisible()
  await glParent.click()
  await expect(page.getByTestId("balance-sheet-summary-gl-child")).toHaveCount(2)
  await expect(page.getByText("1000 Caisse")).toBeVisible()
  await expect(page.getByText("1010 Banque")).toBeVisible()
  await expect(page.getByText("1020 Compte à 0")).toHaveCount(0)

  // Sous-totaux / totaux : pas de chevron même s’il y a des detailRows
  const totalActif = page.locator("tr", { hasText: "Total actif" }).first()
  await expect(totalActif).toBeVisible()
  await expect(totalActif.getByTestId("balance-sheet-summary-expand-gl")).toHaveCount(0)
  await expect(totalActif.getByTestId("balance-sheet-summary-expand-annex")).toHaveCount(0)
  await totalActif.click()
  await expect(page.getByText("9999 Ne doit pas s'ouvrir")).toHaveCount(0)

  // Liaison formule (Addition) : jamais ouvrable
  const formulaRow = page.locator("tr", { hasText: "Actifs sommés" }).first()
  await expect(formulaRow).toBeVisible()
  await expect(formulaRow.getByTestId("balance-sheet-summary-expand-gl")).toHaveCount(0)
  await expect(formulaRow.getByTestId("balance-sheet-summary-expand-annex")).toHaveCount(0)
  await formulaRow.click()
  await expect(page.getByText("8888 Ne doit pas s'ouvrir (formule)")).toHaveCount(0)
})
