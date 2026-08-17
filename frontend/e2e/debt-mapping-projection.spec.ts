import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const CURRENT_YEAR = new Date().getFullYear()

async function setupDebtPage(page: Page) {
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

  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companies: [
            {
              id: COMPANY_ID,
              name: "Test Co",
              fiscal_year_end: "12-31",
              currency: "CAD",
              divisions: [],
            },
          ],
        }),
      })
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
            id: "m1",
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
            liability_remaining_years: 5,
            liability_interest_rate: 4.5,
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
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configs: [] }),
      })
    }
    if (route.request().method() === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "fc1", config_type: "debt-forecast", data: {} }),
      })
    }
    return route.continue()
  })

  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance**`, (route) => {
    if (route.request().method() !== "GET") return route.continue()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_id: COMPANY_ID,
        fiscal_year: CURRENT_YEAR,
        months_with_data: [12],
        accounts: [
          {
            account_number: "2500",
            description: "Emprunt bancaire",
            monthly_amounts: { Décembre: -750000 },
          },
        ],
      }),
    })
  })
}

test("debt hypothesis imports PLT mapping with balance, rate and duration", async ({ page }) => {
  await setupDebtPage(page)
  await page.goto("/projections/debt")

  const loanButton = page.getByRole("button", { name: /2500 — Emprunt bancaire/ })
  await expect(loanButton).toBeVisible({ timeout: 15000 })
  await expect(page.getByText("4.5%")).toBeVisible()
  await expect(page.getByText(/Décembre \d{4}/)).toBeVisible()

  await loanButton.click()
  await expect(page.getByRole("heading", { name: /2500 — Emprunt bancaire/ })).toBeVisible()
  await expect(page.getByLabel("Taux (%)")).toHaveValue("4.5")
  await expect(page.getByLabel("Durée (mois)")).toHaveValue("60")
  await expect(page.getByText("Capital et intérêt")).toBeVisible()
})
