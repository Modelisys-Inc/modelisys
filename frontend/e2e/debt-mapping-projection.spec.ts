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

test("debt hypothesis imports PLT mapping and flags undefined rate and duration", async ({ page }) => {
  await setupDebtPage(page)
  await page.goto("/projections/debt")

  const loanButton = page.getByRole("button", { name: /2500 — Emprunt bancaire/ })
  await expect(loanButton).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId("debt-incomplete-hypotheses")).toBeVisible()
  await expect(page.getByTestId("debt-group-PLT-B")).toBeVisible()
  await expect(page.getByText("PLT-B — Billet à payer")).toBeVisible()
  await expect(page.getByTestId("debt-group-PLT-G")).toHaveCount(0)
  await expect(page.getByText("À définir").first()).toBeVisible()
  await expect(page.getByText(/Décembre \d{4}/)).toBeVisible()

  await loanButton.click()
  await expect(page.getByRole("heading", { name: /2500 — Emprunt bancaire/ })).toBeVisible()
  await page.getByLabel("Taux (%)").fill("4.5")
  await page.getByLabel("Durée (mois)").fill("60")
  await page.getByRole("button", { name: "Enregistrer" }).click()

  await expect(page.getByTestId("debt-incomplete-hypotheses")).toHaveCount(0)
  await expect(page.getByText("4.5%")).toBeVisible()
  await expect(page.getByText("À définir")).toHaveCount(0)
})

test("debt section subtotals sum only loans in that PLT group", async ({ page }) => {
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
            id: "m-d",
            account_number: "2800",
            description: "Location-acquisition",
            link_code: "PLT-D.1",
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
          {
            id: "m-c",
            account_number: "2700",
            description: "Dette LT",
            link_code: "PLT-C.1",
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
        total: 2,
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
            account_number: "2800",
            description: "Location-acquisition",
            monthly_amounts: { Décembre: -26164 },
          },
          {
            account_number: "2700",
            description: "Dette LT",
            monthly_amounts: { Décembre: -1000000 },
          },
        ],
      }),
    })
  })

  await page.goto("/projections/debt")
  await expect(page.getByTestId("debt-group-PLT-D")).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId("debt-group-PLT-C")).toBeVisible()

  const pltDSubtotal = page.locator("tr", { hasText: "Sous-total — Obligations de location-acquisition" }).first()
  await expect(pltDSubtotal).toBeVisible()
  await expect(pltDSubtotal.locator("td").nth(2)).toHaveText(/26\s164/)

  const grandTotal = page.getByRole("row", { name: /^Total / }).first()
  await expect(grandTotal.locator("td").nth(2)).toHaveText(/1\s026\s164/)
})

test("Capex-sourced loans are read-only in Hypothèses Financement", async ({ page }) => {
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
      body: JSON.stringify({ mappings: [], total: 0, limit: 1000, offset: 0, has_more: false }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/trial-balance**`, (route) => {
    if (route.request().method() !== "GET") return route.continue()
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_id: COMPANY_ID,
        fiscal_year: CURRENT_YEAR,
        months_with_data: [12],
        accounts: [],
      }),
    })
  })
  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configs: [
            {
              id: "fc-debt",
              config_type: "debt-forecast",
              data: {
                loans: [
                  {
                    id: "capex-loan-1",
                    name: "Équipement financé",
                    principal: 75000,
                    interestRate: 5,
                    remainingPayments: 60,
                    startMonth: 0,
                    repaymentMode: "interest_only",
                    sourceType: "capex",
                    sourceCapexKey: "detail-uuid-equipement-1:adj1",
                    sourceLinkCode: "PLT-C",
                    hypothesisDefined: true,
                  },
                ],
              },
            },
          ],
        }),
      })
    }
    return route.continue()
  })

  await page.goto("/projections/debt")
  await expect(page.getByTestId("debt-group-PLT-C")).toBeVisible({ timeout: 15000 })
  await expect(page.getByText("Équipement financé")).toBeVisible()
  await expect(page.getByText("Hypothèse Capex")).toBeVisible()
  await expect(page.getByRole("button", { name: /Équipement financé/ })).toHaveCount(0)

  await page.getByText("Équipement financé").click()
  await expect(page.getByRole("button", { name: "Enregistrer" })).toHaveCount(0)
  await expect(page.getByLabel("Nom de l'emprunt")).toHaveCount(0)
})
