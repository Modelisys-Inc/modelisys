import { test, expect, Page } from "@playwright/test"

// A viewer (read-only role) sees the mapping page without edit controls:
// no "Importer Excel" button, no per-row edit/delete actions. Backend mocked.

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupViewer(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([{ name: "has_session", value: "1", url: "http://localhost:3000" }])

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "u1", email: "viewer@e.com", full_name: "View Only", is_active: true, is_superadmin: false, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "viewer" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "viewer" }]) }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: COMPANY_ID, name: "Test Co", fiscal_year_end: "12-31", currency: "CAD", divisions: [] }),
    }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }] }) })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mappings: [
          {
            id: "am1", account_number: "1000", description: "Cash", link_code: null,
            summary_ef: null, detail_ef: null, divisions: null, sub_divisions: null,
            fdrhc: false, interests: false, amortization: false, variable_costs: false,
            fixed_costs: false, product: null, customer: null, supplier: null, interco_company_id: null,
          },
        ],
        total: 1, limit: 1000, offset: 0, has_more: false,
      }),
    }),
  )
  await page.route("**/api/companies/*/statement-structures/*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ structure: [] }) }),
  )
}

test("viewer sees the mapping page read-only", async ({ page }) => {
  await setupViewer(page)
  await page.goto(`/settings/companies/${COMPANY_ID}/mapping`)

  // Data is visible...
  await expect(page.getByText("1000")).toBeVisible()
  // ...but no edit controls.
  await expect(page.getByRole("button", { name: "Importer Excel" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Modifier le code de liaison pour 1000" })).toHaveCount(0)
})
