import { test, expect, Page } from "@playwright/test"

// Verifies the tenant-local custom link-code flow on the "Code de liaison" page:
// a user creates a company-private code and sees it appear in the custom-codes
// table. All backend calls are mocked.

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
  // Global standard chart — minimal so the page renders.
  await page.route(/\/api\/standard-link-codes(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          family: "EXP",
          account_type: "Charges",
          codes: [
            {
              id: "g1",
              code: "EXP-A.1",
              parent_code: "EXP-A",
              family: "EXP",
              label_account: "Frais",
              label_sub_account: "Loyer",
              account_type: "Charges",
              account_sub_type: null,
              variable_or_fixed: "Fixe",
              ft_category: null,
              ft_line_item: null,
              projections: null,
              is_leaf: true,
              sort_order: 1,
              label: "Loyer",
            },
          ],
        },
      ]),
    }),
  )
}

test("create a tenant-local custom link code and see it listed", async ({ page }) => {
  await setupAuth(page)

  // Stateful overlay store: starts empty, grows on POST.
  const custom: Record<string, unknown>[] = []

  await page.route(
    new RegExp(`/api/companies/${COMPANY_ID}/custom-link-codes(/[^?]+)?(\\?.*)?$`),
    (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(custom),
        })
      }
      if (method === "POST") {
        const created = {
          id: "c1",
          company_id: COMPANY_ID,
          code: "EXP-Z1",
          parent_code: null,
          family: "EXP",
          label_account: "Frais de redevances spéciales",
          label_sub_account: null,
          account_type: null,
          account_sub_type: null,
          variable_or_fixed: null,
          ft_category: null,
          ft_line_item: null,
          projections: null,
          is_leaf: true,
          sort_order: 0,
          promoted_to_standard_code: null,
          created_at: "2026-06-20T00:00:00Z",
          updated_at: "2026-06-20T00:00:00Z",
          label: "Frais de redevances spéciales",
          is_custom: true,
        }
        custom.push(created)
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        })
      }
      return route.continue()
    },
  )

  await page.goto(`/settings/companies/${COMPANY_ID}/link-codes`)

  // The custom-codes panel is present.
  await expect(page.getByRole("heading", { name: "Codes personnalisés" })).toBeVisible()

  // Fill the label and create.
  await page
    .getByLabel("Libellé du code personnalisé")
    .fill("Frais de redevances spéciales")
  await page.getByRole("button", { name: "Créer un code" }).click()

  // The new code appears in the custom-codes table.
  const tbody = page.getByTestId("custom-codes-tbody")
  await expect(tbody.getByText("EXP-Z1")).toBeVisible()
  await expect(tbody.getByText("Frais de redevances spéciales")).toBeVisible()
})
