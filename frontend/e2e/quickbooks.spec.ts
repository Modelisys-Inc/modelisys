import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const URL = `/settings/companies/${COMPANY_ID}/quickbooks`

async function setupAuthAndCommonMocks(page: Page) {
  // Inject session cookie + tokens before any page script runs.
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    {
      name: "has_session",
      value: "1",
      url: "http://localhost:3000",
    },
  ])

  // Mock the auth context's bootstrap calls.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "u1",
          email: "u@e.com",
          full_name: "Test User",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [
          { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
        ],
      }),
    }),
  )
  // Some pages refetch organizations independently — mock just in case.
  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
      ]),
    }),
  )
}

test.describe("QuickBooks page", () => {
  test("not connected → connect button is visible", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/connection`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "not_connected" }),
        }),
    )

    await page.goto(URL)
    await expect(
      page.getByRole("button", { name: /connect quickbooks/i }),
    ).toBeVisible({ timeout: 15000 })
  })

  test("connected → preview → commit happy path", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/connection`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: "connected",
            realm_id: "12345",
            connected_at: "2026-04-14T00:00:00Z",
          }),
        }),
    )
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/preview`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            fiscal_year: 2026,
            month: 3,
            currency: "CAD",
            fetched_at: "2026-04-14T00:00:00Z",
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                debit: 5000,
                credit: 0,
                proposed_link_code: "actif.encaisse",
                confidence: "high",
                existing_link_code: null,
              },
              {
                qbo_account_id: "42",
                account_number: "4000",
                account_name: "Sales",
                qbo_account_type: "Income",
                qbo_account_sub_type: "SalesOfProductIncome",
                debit: 0,
                credit: 5000,
                proposed_link_code: "revenus.ventes",
                confidence: "high",
                existing_link_code: null,
              },
            ],
          }),
        }),
    )
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/link-codes`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { code: "actif.encaisse", label: "Encaisse", mapping_type: "bilan" },
            { code: "revenus.ventes", label: "Ventes", mapping_type: "resultats" },
          ]),
        }),
    )
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/commit`,
      (route) =>
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            accounts_imported: 2,
            mappings_created: 2,
            mappings_updated: 0,
          }),
        }),
    )

    await page.goto(URL)
    await expect(page.getByText(/Realm ID: 12345/)).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: /preview trial balance/i }).click()
    await expect(page.getByText("Cash")).toBeVisible()
    await expect(page.getByText("Sales")).toBeVisible()
    await page.getByRole("button", { name: /import trial balance/i }).click()
    await expect(page.getByText(/trial balance imported/i)).toBeVisible()
  })

  test("conflict → overwrite modal → retry succeeds", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/connection`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "connected", realm_id: "12345" }),
        }),
    )
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/preview`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            fiscal_year: 2026,
            month: 3,
            currency: "CAD",
            fetched_at: "2026-04-14T00:00:00Z",
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                debit: 5000,
                credit: 0,
                proposed_link_code: "actif.encaisse",
                confidence: "high",
                existing_link_code: null,
              },
            ],
          }),
        }),
    )
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/link-codes`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        }),
    )
    let commitCalls = 0
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/commit`,
      (route) => {
        commitCalls += 1
        if (commitCalls === 1) {
          route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ detail: "already exists" }),
          })
        } else {
          route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              accounts_imported: 1,
              mappings_created: 1,
              mappings_updated: 0,
            }),
          })
        }
      },
    )

    await page.goto(URL)
    await page.getByRole("button", { name: /preview trial balance/i }).click()
    await page.getByRole("button", { name: /import trial balance/i }).click()
    await expect(page.getByText(/already exists/i)).toBeVisible()
    await page.getByRole("button", { name: /^overwrite$/i }).click()
    await expect(page.getByText(/trial balance imported/i)).toBeVisible()
  })

  test("revoked status shows reconnect banner", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/connection`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ status: "revoked", realm_id: "12345" }),
        }),
    )

    await page.goto(URL)
    await expect(page.getByText(/reconnect required/i)).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByRole("button", { name: /reconnect quickbooks/i }),
    ).toBeVisible()
  })
})
