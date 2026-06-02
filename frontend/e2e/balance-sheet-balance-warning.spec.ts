import { test, expect, Page } from "@playwright/test"

// Verifies the Bilan Sommaire shows a "not balanced" warning when
// Total des actifs ≠ Total passifs et capitaux propres, and hides it when they
// match. All backend calls are mocked; the card renders from series rows (the
// page defaults to a multi-period view).

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

/** Mock the balance-sheet data so its Sommaire card renders with the two total
 * rows carrying the given current values, then open the Sommaire section. */
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
  // The Sommaire card must be present before asserting the banner's absence.
  await expect(page.getByText("Total des actifs").first()).toBeVisible({
    timeout: 30000,
  })
  await expect(page.getByText(/n.?est pas équilibré/i)).toHaveCount(0)
})
