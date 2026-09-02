import { test, expect, Page } from "@playwright/test"

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
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budgets: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ slots: [] }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ rows: [], periods: [], structure: [], mappings: [], accounts: [] }),
      })
    }
    return route.continue()
  })
}

test("Header : menu Rapport avec Diagnostic et Pilotage", async ({ page }) => {
  test.setTimeout(120000)
  await setupAuth(page)
  await page.goto(`/dashboard?companyId=${COMPANY_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  })

  await expect(page.getByTestId("financial-tools-nav").getByTestId("financial-tools-nav-trigger")).toBeVisible({
    timeout: 60000,
  })

  const reportNav = page.getByTestId("report-nav")
  await expect(reportNav.getByTestId("report-nav-trigger")).toBeVisible()
  await expect(page.getByRole("link", { name: "Planification" })).toHaveCount(0)
  await expect(page.getByRole("navigation").getByRole("link", { name: "Diagnostic", exact: true })).toHaveCount(0)
  await expect(page.getByRole("navigation").getByRole("link", { name: "Pilotage", exact: true })).toHaveCount(0)

  await reportNav.hover()
  const reportMenu = page.getByTestId("report-nav-menu")
  await expect(reportMenu).toBeVisible({ timeout: 10000 })
  await expect(reportMenu.getByRole("menuitem", { name: "Diagnostic" })).toBeVisible()
  await expect(reportMenu.getByRole("menuitem", { name: "Pilotage" })).toBeVisible()
  await expect(reportMenu.getByRole("menuitem", { name: "Planification" })).toHaveCount(0)
})
