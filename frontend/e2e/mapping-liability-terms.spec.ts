import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

const PLT_LINK_CODES = [
  {
    code: "PLT-B",
    family: "PLT",
    parent_code: null,
    label: "Emprunts bancaires",
    label_account: null,
    label_sub_account: null,
    is_leaf: false,
    is_active: true,
    sort_order: 1,
    attached_link_codes: [],
  },
  {
    code: "PLT-B.1",
    family: "PLT",
    parent_code: "PLT-B",
    label: "Emprunt 1",
    label_account: null,
    label_sub_account: "Emprunt 1",
    is_leaf: true,
    is_active: true,
    sort_order: 1,
    attached_link_codes: [],
  },
]

async function setupMappingPage(page: Page) {
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
        user: {
          id: "u1",
          email: "admin@e.com",
          full_name: "Admin",
          is_active: true,
          is_superadmin: false,
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
  await page.route(`**/api/companies/${COMPANY_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: COMPANY_ID,
        name: "Test Co",
        fiscal_year_end: "12-31",
        currency: "CAD",
        divisions: [],
      }),
    }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }] }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/custom-link-codes**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PLT_LINK_CODES),
    }),
  )
  await page.route("**/api/companies/*/statement-structures/*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ structure: [] }) }),
  )
}

test("mapping account settings show liability term fields for PLT-B codes", async ({ page }) => {
  await setupMappingPage(page)

  await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [
            {
              id: "am1",
              account_number: "2500",
              description: "Emprunt bancaire",
              link_code: "PLT-B.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
          ],
          total: 1,
          limit: 1000,
          offset: 0,
          has_more: false,
        }),
      })
    }
  })

  await page.goto(`/settings/companies/${COMPANY_ID}/mapping`)
  await expect(page.getByText("2500")).toBeVisible()

  await page.getByRole("button", { name: "Paramètres du compte 2500" }).click()
  await expect(page.getByLabel("Durée restante du passif (années)")).toBeVisible()
  await expect(page.getByLabel("Taux d'intérêt (%)")).toBeVisible()
})

test("saving liability term fields sends values to the API", async ({ page }) => {
  await setupMappingPage(page)

  let putBody: unknown = null

  await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [
            {
              id: "am1",
              account_number: "2500",
              description: "Emprunt bancaire",
              link_code: "PLT-G.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
          ],
          total: 1,
          limit: 1000,
          offset: 0,
          has_more: false,
        }),
      })
    }
    if (route.request().method() === "PUT") {
      putBody = route.request().postDataJSON()
      const entries = putBody as Array<Record<string, unknown>>
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [
            {
              ...entries[0],
              id: "am1",
            },
          ],
        }),
      })
    }
    return route.continue()
  })

  await page.goto(`/settings/companies/${COMPANY_ID}/mapping`)
  await page.getByRole("button", { name: "Paramètres du compte 2500" }).click()

  await page.getByLabel("Durée restante du passif (années)").fill("8")
  await page.getByLabel("Taux d'intérêt (%)").fill("6.5")
  await page.getByRole("button", { name: "Enregistrer" }).click()

  await expect.poll(() => putBody).not.toBeNull()
  const entry = (putBody as Array<Record<string, unknown>>)[0]
  expect(entry.liability_remaining_years).toBe(8)
  expect(entry.liability_interest_rate).toBe(6.5)
})
