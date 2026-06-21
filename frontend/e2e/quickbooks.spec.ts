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

  test("Division/Sous-division columns visible, editable, and carried on commit", async ({ page }) => {
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
            class_location_tracking: { classes: true, locations: true },
            observed_pairs: [{ division: "East", sub_division: "Montreal" }],
            rows: [
              {
                qbo_account_id: "33",
                account_number: "4000",
                account_name: "Sales",
                qbo_account_type: "Income",
                qbo_account_sub_type: null,
                existing_link_code: null,
                monthly_amounts: { "3": { debit: 0, credit: 150 } },
                discovered_divisions: ["East"],
                discovered_sub_divisions: ["Montreal"],
                divisions: ["East"],
                sub_divisions: ["Montreal"],
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
              code: "revenus.ventes",
              label: "Ventes",
              statement_type: "income-statement",
              parent_id: "revenue",
              parent_label: "Revenus",
            },
          ]),
        }),
    )

    // Capture the commit request body so we can assert on tags.
    let committedBody: Record<string, unknown> | null = null
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/trial-balance/commit`,
      async (route) => {
        committedBody = JSON.parse(route.request().postData() ?? "{}")
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            months_imported: 1,
            accounts_imported: 1,
            mappings_created: 1,
            mappings_updated: 0,
          }),
        })
      },
    )

    await page.goto(URL)
    await page.getByRole("button", { name: /preview 1 month/i }).click()

    // Wait for the review table to appear by checking a column header.
    await expect(page.getByRole("columnheader", { name: "Division", exact: true })).toBeVisible({
      timeout: 15000,
    })

    // Division and Sous-division columns must be visible.
    await expect(page.getByRole("columnheader", { name: "Division", exact: true })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "Sous-division", exact: true })).toBeVisible()

    // The "East" chip must be present.
    await expect(page.getByRole("button", { name: "Remove East" })).toBeVisible()

    // Remove the "East" division tag.
    await page.getByRole("button", { name: "Remove East" }).click()
    await expect(page.getByRole("button", { name: "Remove East" })).toHaveCount(0)

    // Make the row committable: open the link code combobox and pick "revenus.ventes".
    await page.locator('button[role="combobox"]:has-text("Pick a link code")').click()
    await page.getByRole("option", { name: /ventes/i }).click()
    // The picker should now show the selected code.
    await expect(
      page.locator('button[role="combobox"]:has-text("revenus.ventes")'),
    ).toBeVisible()

    // Import button should now be enabled.
    await page.getByRole("button", { name: /^Import/i }).click()
    await expect(page.getByText(/trial balance imported/i)).toBeVisible()

    // The commit payload must carry the edited tags.
    await expect.poll(() => (committedBody as Record<string, unknown> | null)?.rows as unknown[] | undefined).toEqual([
      expect.objectContaining({ divisions: [], sub_divisions: ["Montreal"] }),
    ])
  })

  test("Division/Sous-division columns hidden when class_location_tracking is off", async ({ page }) => {
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
            class_location_tracking: { classes: false, locations: false },
            observed_pairs: [],
            rows: [
              {
                qbo_account_id: "1",
                account_number: "1000",
                account_name: "Cash",
                qbo_account_type: "Bank",
                qbo_account_sub_type: "Checking",
                existing_link_code: "actif.encaisse",
                monthly_amounts: { "3": { debit: 5000, credit: 0 } },
                discovered_divisions: [],
                discovered_sub_divisions: [],
                divisions: [],
                sub_divisions: [],
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

    await page.goto(URL)
    await page.getByRole("button", { name: /preview 1 month/i }).click()
    await expect(page.getByText("Cash")).toBeVisible()

    // Neither column should appear when tracking is off.
    await expect(page.getByRole("columnheader", { name: "Division", exact: true })).toHaveCount(0)
    await expect(page.getByRole("columnheader", { name: "Sous-division", exact: true })).toHaveCount(0)
  })

  test("pick an existing link code in the review table", async ({ page }) => {
    // Link codes are sourced from the shared chart (+ company overlay); the review
    // picker lets you assign one to a row. (Inline code-creation was removed in
    // favour of the dedicated Codes personnalisés panel.)
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

    // Available link codes for the picker (global + overlay), served by the QBO
    // link-codes endpoint.
    await page.route(
      `**/api/quickbooks/companies/${COMPANY_ID}/link-codes`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              code: "10-100",
              label: "Encaisse",
              statement_type: "balance_sheet",
              parent_id: "ACT",
              parent_label: "Actif à court terme",
            },
          ]),
        }),
    )

    await page.goto(URL)
    await page.getByRole("button", { name: /preview 1 month/i }).click()
    await expect(page.getByText("Cash")).toBeVisible()

    // Open the picker and select the existing code.
    await page.locator('button[role="combobox"]:has-text("Pick a link code")').click()
    await page.getByRole("option", { name: /10-100/i }).click()

    // The picker trigger now shows the selected code.
    await expect(
      page.locator('button[role="combobox"]:has-text("10-100")'),
    ).toBeVisible()
  })
})
