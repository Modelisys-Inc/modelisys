import { test, expect, Page } from "@playwright/test"

// Verifies the Bilan Sommaire shows a "not balanced" warning when
// Total des actifs ≠ Total passifs et capitaux propres, and the Validation
// row (Total actif − Total passifs et capitaux propres) above Actifs.

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
      body: JSON.stringify([
        { id: "o1", name: "Org", slug: "org", role: "admin" },
      ]),
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
  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-chart-configs**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slots: [] }),
      }),
  )
}

/** Mock the balance-sheet data so its Sommaire card renders with Actifs + totals. */
async function openBilanSommaire(page: Page, assets: number, liabEquity: number) {
  await setupAuth(page)

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [
            { label: "Actifs", current: 0, prior: 0, isSection: true },
            { label: "Total des actifs", current: assets, prior: assets },
            {
              label: "Total passifs et capitaux propres",
              current: liabEquity,
              prior: liabEquity,
            },
          ],
        }),
      }),
  )
  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "balance-sheet",
          fiscalYear: 2026,
          periods: [{ fiscalYear: 2026, fiscalMonth: 5, label: "Mai 2026" }],
          rows: [
            {
              id: "act",
              label: "Actifs",
              amounts: { "2026-5": 0 },
              detailRows: [],
              isSection: true,
            },
            {
              id: "a",
              label: "Total des actifs",
              amounts: { "2026-5": assets },
              detailRows: [],
            },
            {
              id: "le",
              label: "Total passifs et capitaux propres",
              amounts: { "2026-5": liabEquity },
              detailRows: [],
            },
          ],
        }),
      }),
  )

  await page.goto(`/financial-statements/balance-sheet?companyId=${COMPANY_ID}`)
  await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
}

async function switchToMensuelHorizon(page: Page) {
  await page.getByRole("combobox").first().click()
  await page.getByRole("option", { name: "Mensuel" }).click()
  await expect(page.getByText("Total des actifs").first()).toBeVisible({
    timeout: 30000,
  })
}

test("Bilan Sommaire warns when assets ≠ liabilities + equity", async ({
  page,
}) => {
  await openBilanSommaire(page, 1000, 980)
  await expect(page.getByText(/n.?est pas équilibré/i)).toBeVisible({
    timeout: 30000,
  })
})

test("Bilan Sommaire shows no warning when balanced", async ({ page }) => {
  await openBilanSommaire(page, 1000, 1000)
  await expect(page.getByText("Total des actifs").first()).toBeVisible({
    timeout: 30000,
  })
  await expect(page.getByText(/n.?est pas équilibré/i)).toHaveCount(0)
})

test("Bilan Sommaire shows Validation row above Actifs with $0 when balanced", async ({
  page,
}) => {
  await openBilanSommaire(page, 1000, 1000)
  const validation = page.getByTestId("balance-sheet-validation-row")
  await expect(validation).toBeVisible({ timeout: 30000 })
  await expect(validation.getByText("Validation", { exact: true })).toBeVisible()
  await expect(page.getByText("Actifs").first()).toBeVisible()
  await expect(validation.getByTitle("Bilan équilibré").first()).toBeVisible()
})

test("Bilan Sommaire Validation shows écart when unbalanced", async ({
  page,
}) => {
  await openBilanSommaire(page, 1000, 980)
  const validation = page.getByTestId("balance-sheet-validation-row")
  await expect(validation).toBeVisible({ timeout: 30000 })
  await expect(validation.getByTitle(/ne balance pas/i).first()).toBeVisible()
})

test("Bilan Sommaire Validation appears per column in Mensuel view", async ({
  page,
}) => {
  await openBilanSommaire(page, 1000, 1000)
  await switchToMensuelHorizon(page)
  const validation = page.getByTestId("balance-sheet-validation-row")
  await expect(validation).toBeVisible({ timeout: 30000 })
  await expect(validation.getByTitle("Bilan équilibré").first()).toBeVisible()
})
