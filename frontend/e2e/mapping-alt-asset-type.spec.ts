import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

const ALT_LINK_CODES = [
  {
    code: "ALT-B",
    family: "ALT",
    parent_code: null,
    label: "Immobilisations corporelles",
    label_account: null,
    label_sub_account: null,
    is_leaf: false,
    is_active: true,
    sort_order: 1,
    attached_link_codes: [],
  },
  {
    code: "ALT-B.1",
    family: "ALT",
    parent_code: "ALT-B",
    label: "Machinerie",
    label_account: null,
    label_sub_account: "Machinerie",
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
      body: JSON.stringify(ALT_LINK_CODES),
    }),
  )
  await page.route("**/api/companies/*/statement-structures/*", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ structure: [] }) }),
  )
}

const baseMapping = {
  id: "am1",
  account_number: "1500",
  description: "Machinerie",
  link_code: "ALT-B.1",
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
  alt_asset_cost: false,
  alt_accumulated_amortization: false,
  liability_remaining_years: null,
  liability_interest_rate: null,
  product: null,
  customer: null,
  supplier: null,
  interco_company_id: null,
}

test("mapping account settings show alt asset type options for ALT-B codes", async ({ page }) => {
  await setupMappingPage(page)

  await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [baseMapping],
          total: 1,
          limit: 1000,
          offset: 0,
          has_more: false,
        }),
      })
    }
  })

  await page.goto(`/settings/companies/${COMPANY_ID}/mapping`)
  await expect(page.getByText("1500")).toBeVisible()
  await expect(page.getByText("À définir")).toBeVisible()

  await page.getByRole("button", { name: "Paramètres du compte 1500" }).click()
  await expect(page.getByText("Immobilisation (ALT-B / C / D)")).toBeVisible()
  await expect(page.getByLabel("Coût")).toBeVisible()
  await expect(page.getByLabel("Amortissement cumulé")).toBeVisible()
})

test("saving alt asset type fields sends values to the API", async ({ page }) => {
  await setupMappingPage(page)

  let putBody: unknown = null

  await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, async (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [baseMapping],
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
          mappings: entries.map((entry) => ({
            ...baseMapping,
            ...entry,
            id: baseMapping.id,
          })),
        }),
      })
    }
  })

  await page.goto(`/settings/companies/${COMPANY_ID}/mapping`)
  await page.getByRole("button", { name: "Paramètres du compte 1500" }).click()
  await page.getByLabel("Coût").click()
  await page.getByRole("button", { name: "Enregistrer" }).click()

  await expect.poll(() => putBody).not.toBeNull()
  expect(putBody).toEqual([
    expect.objectContaining({
      account_number: "1500",
      link_code: "ALT-B.1",
      alt_asset_cost: true,
      alt_accumulated_amortization: false,
    }),
  ])
  await expect(
    page.locator("tr").filter({ hasText: "1500" }).getByText("Coût", { exact: true }),
  ).toBeVisible()
})
