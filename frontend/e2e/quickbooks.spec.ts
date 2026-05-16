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
            months: [3],
            currency: "CAD",
            fetched_at: "2026-04-14T00:00:00Z",
            existing_months: [],
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                existing_link_code: "actif.encaisse",
                monthly_amounts: { "3": { debit: 5000, credit: 0 } },
              },
              {
                qbo_account_id: "42",
                account_number: "4000",
                account_name: "Sales",
                qbo_account_type: "Income",
                qbo_account_sub_type: "SalesOfProductIncome",
                existing_link_code: "revenus.ventes",
                monthly_amounts: { "3": { debit: 0, credit: 5000 } },
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
            {
              code: "actif.encaisse",
              label: "Encaisse",
              statement_type: "balance-sheet",
              parent_id: "actifs-courants",
              parent_label: "Actifs courants",
            },
            {
              code: "revenus.ventes",
              label: "Ventes",
              statement_type: "income-statement",
              parent_id: "revenue",
              parent_label: "Revenus",
            },
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
            months_imported: 1,
            accounts_imported: 2,
            mappings_created: 2,
            mappings_updated: 0,
          }),
        }),
    )

    await page.goto(URL)
    await expect(page.getByText(/Realm ID: 12345/)).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: /preview 1 month/i }).click()
    await expect(page.getByText("Cash")).toBeVisible()
    await expect(page.getByText("Sales", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: /import 1 month/i }).click()
    await expect(page.getByText(/trial balance imported/i)).toBeVisible()
  })

  test("multi-month range → preview shows per-month columns → commit", async ({ page }) => {
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
            months: [1, 2, 3],
            currency: "CAD",
            fetched_at: "2026-04-14T00:00:00Z",
            existing_months: [],
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                existing_link_code: "actif.encaisse",
                monthly_amounts: {
                  "1": { debit: 5000, credit: 0 },
                  "2": { debit: 5500, credit: 0 },
                  "3": { debit: 6000, credit: 0 },
                },
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
            {
              code: "actif.encaisse",
              label: "Encaisse",
              statement_type: "balance-sheet",
              parent_id: "actifs-courants",
              parent_label: "Actifs courants",
            },
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
            months_imported: 3,
            accounts_imported: 1,
            mappings_created: 0,
            mappings_updated: 0,
          }),
        }),
    )

    await page.goto(URL)
    await page.getByLabel(/start month/i).fill("1")
    await page.getByLabel(/end month/i).fill("3")
    await page.getByRole("button", { name: /preview 3 months/i }).click()
    await expect(page.getByRole("columnheader", { name: "Jan" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Feb" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Mar" })).toBeVisible()
    await page.getByRole("button", { name: /import 3 months/i }).click()
    await expect(page.getByText(/trial balance imported/i)).toBeVisible()
  })

  test("existing months are flagged in the review header", async ({ page }) => {
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
            months: [1, 2, 3],
            currency: "CAD",
            fetched_at: "2026-04-14T00:00:00Z",
            existing_months: [1, 2],
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                existing_link_code: "actif.encaisse",
                monthly_amounts: {
                  "3": { debit: 6000, credit: 0 },
                },
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

    await page.goto(URL)
    await page.getByLabel(/start month/i).fill("1")
    await page.getByLabel(/end month/i).fill("3")
    await page.getByRole("button", { name: /preview 3 months/i }).click()
    await expect(page.getByText(/2 of these months are already imported/i)).toBeVisible()
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
            months: [3],
            currency: "CAD",
            fetched_at: "2026-04-14T00:00:00Z",
            existing_months: [3],
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                existing_link_code: "actif.encaisse",
                monthly_amounts: { "3": { debit: 5000, credit: 0 } },
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
            {
              code: "actif.encaisse",
              label: "Encaisse",
              statement_type: "balance-sheet",
              parent_id: "actifs-courants",
              parent_label: "Actifs courants",
            },
            {
              code: "revenus.ventes",
              label: "Ventes",
              statement_type: "income-statement",
              parent_id: "revenue",
              parent_label: "Revenus",
            },
          ]),
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
              months_imported: 1,
              accounts_imported: 1,
              mappings_created: 1,
              mappings_updated: 0,
            }),
          })
        }
      },
    )

    await page.goto(URL)
    await page.getByRole("button", { name: /preview 1 month/i }).click()
    await page.getByRole("button", { name: /import 1 month/i }).click()
    await expect(page.getByText(/already has a trial balance/i)).toBeVisible()
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

  test("create new link code from review table", async ({ page }) => {
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
            months: [3],
            currency: "CAD",
            fetched_at: "2026-04-14T00:00:00Z",
            existing_months: [],
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                existing_link_code: null,
                monthly_amounts: { "3": { debit: 5000, credit: 0 } },
              },
            ],
          }),
        }),
    )

    // Initial link-codes list: empty. After POST: one entry.
    // Use a boolean (not a call counter) so React StrictMode double-invocations
    // don't prematurely populate the list before the code is actually created.
    let codeCreated = false
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/link-codes`,
      (route) => {
        if (route.request().method() === "POST") {
          codeCreated = true
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              code: "10-100",
              label: "Cash",
              statement_type: "balance-sheet",
              parent_id: "actifs-courants",
              parent_label: "Actifs courants",
            }),
          })
        }
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            codeCreated
              ? [
                  {
                    code: "10-100",
                    label: "Cash",
                    statement_type: "balance-sheet",
                    parent_id: "actifs-courants",
                    parent_label: "Actifs courants",
                  },
                ]
              : [],
          ),
        })
      },
    )

    // Statement structure for the dialog parent selector.
    // Mock both statement types to prevent real backend calls.
    await page.route(
      `**/api/companies/${COMPANY_ID}/statement-structures/income-statement`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ structure: [] }),
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
                id: "actifs-courants",
                label: "Actifs courants",
                isSection: true,
                children: [],
              },
            ],
          }),
        }),
    )

    await page.goto(URL)
    await page.getByRole("button", { name: /preview 1 month/i }).click()
    // Wait for the review table to appear.
    await expect(page.getByText("Cash")).toBeVisible()

    // Open the picker (the button has role="combobox" but accessible name comes from
    // text content, which is not used by Playwright's getByRole name filter for
    // composite widget roles; use a CSS attribute+text selector instead).
    await page.locator('button[role="combobox"]:has-text("Pick a link code")').click()
    // Click the "Create new link code…" item.
    await page.getByRole("option", { name: /create new link code/i }).click()

    // The create dialog opens. Default statement type is "income-statement";
    // switch to balance-sheet so the parent dropdown loads our mock structure.
    await page.getByLabel(/^statement$/i).click()
    await page.getByRole("option", { name: /balance sheet/i }).click()

    // Wait for the parent section dropdown to become enabled (balance-sheet structure loaded).
    await expect(page.getByLabel(/^parent section$/i)).toBeEnabled()

    // Fill the link code and submit. Label defaults to "Cash" (the row's account_name).
    await page.getByLabel(/^link code$/i).fill("10-100")
    await page.getByRole("button", { name: /^create$/i }).click()

    // The picker trigger should now show the new code.
    await expect(
      page.locator('button[role="combobox"]:has-text("10-100")'),
    ).toBeVisible()
  })
})
