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

test("Header : Outils financiers sans Scénarios ; Configuration avec 4 sous-pages", async ({
  page,
}) => {
  await setupAuth(page)
  await page.goto(`/dashboard?companyId=${COMPANY_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  })

  const toolsNav = page.getByTestId("financial-tools-nav")
  await expect(toolsNav.getByTestId("financial-tools-nav-trigger")).toBeVisible({ timeout: 60000 })
  await toolsNav.dispatchEvent("mouseenter")
  const toolsMenu = page.getByTestId("financial-tools-nav-menu")
  await expect(toolsMenu).toBeVisible({ timeout: 10000 })
  await expect(toolsMenu.getByRole("menuitem", { name: "Reporting financier" })).toBeVisible()
  await expect(toolsMenu.getByRole("menuitem", { name: "Scénarios" })).toHaveCount(0)

  const configNav = page.getByTestId("configuration-nav")
  await expect(configNav.getByTestId("configuration-nav-trigger")).toBeVisible()
  await configNav.dispatchEvent("mouseenter")
  const configMenu = page.getByTestId("configuration-nav-menu")
  await expect(configMenu).toBeVisible({ timeout: 10000 })
  for (const label of [
    "Information de base",
    "Mapping comptable",
    "Code de liaison",
    "Balance de vérification",
  ]) {
    await expect(configMenu.getByRole("menuitem", { name: label })).toBeVisible()
  }
})
