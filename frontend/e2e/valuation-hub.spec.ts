import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupEvaluationHub(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
    localStorage.removeItem("modelisys-valuation-registry")
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
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin", feature_flags: {} }],
      }),
    }),
  )
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "fake-access-token", refresh_token: "fake-refresh-token" }),
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
              name: "Demo Co",
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
}

test.describe("Valorisation hub", () => {
  test("creates a valuation with name, month and year", async ({ page }) => {
    await setupEvaluationHub(page)
    await page.goto(`/evaluation?companyId=${COMPANY_ID}`)

    await expect(page.getByRole("heading", { name: "Valorisation", exact: true })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText("Aucune valorisation créée")).toBeVisible()

    await page.getByTestId("new-valuation-button").click()
    await expect(page.getByTestId("new-valuation-dialog")).toBeVisible()

    await page.getByTestId("new-valuation-name").fill("Valorisation test 2026")
    await page.getByTestId("new-valuation-month").click()
    await page.getByRole("option", { name: "Mars" }).click()
    await page.getByTestId("new-valuation-year").click()
    await page.getByRole("option", { name: "2026" }).click()

    await expect(page.getByTestId("new-valuation-submit")).toBeEnabled({ timeout: 10000 })
    await page.getByTestId("new-valuation-submit").click()

    await expect(page).toHaveURL(/\/evaluation\/[0-9a-f-]+/, { timeout: 15000 })
    await expect(page.getByTestId("valuation-dashboard-title")).toHaveText("Valorisation test 2026")
    await expect(page.getByText("Plan de valorisation")).toBeVisible()
    await expect(page.getByTestId("valuation-plan-progress-bar")).toBeVisible()
    await expect(page).toHaveURL(/refMonth=3/)
    await expect(page).toHaveURL(/refYear=2026/)
    await expect(page).toHaveURL(new RegExp(`companyId=${COMPANY_ID}`))
  })
})
