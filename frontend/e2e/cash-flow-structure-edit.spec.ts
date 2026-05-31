import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

const CASH_FLOW_DEFAULT = [
  { label: "flux de trésorerie liés à l'exploitation", isBold: true, isSection: true, defineMapping: true, linkCode: "CF-OPER", showInDetail: true, annexLetter: "A" },
  { label: "flux de trésorerie liés aux activités d'investissement", isBold: true, isSection: true },
  { label: "flux de trésorerie liés aux activités de financement", isBold: true, isSection: true },
  { label: "variation nette de la trésorerie", isBold: true, isResult: true },
]

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
        user: { id: "u1", email: "u@e.com", full_name: "Test", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "admin" }]) }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }] }) })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ budgets: [] }) }),
  )
  // Chart config slots — needed by the dashboard section that mounts first.
  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs*`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [] }) })
    }
    return route.continue()
  })
  // Series endpoint — needed when Sommaire is in a multi-period view (12months).
  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow/series*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
    }),
  )
}

test.describe("Trésorerie structure editor", () => {
  test("Sommaire exposes Paramètres, opens the studio, and saves", async ({ page }) => {
    await setupAuth(page)

    let putCalled = false
    let savedPayload: unknown = null
    const cashFlowUrls: string[] = []
    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) => {
      cashFlowUrls.push(route.request().url())
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          month: 12,
          period: "monthly",
          rows: [],
        }),
      })
    })
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow*`, (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: null, company_id: COMPANY_ID, statement_type: "cash-flow", structure: CASH_FLOW_DEFAULT }) })
      }
      if (method === "PUT") {
        putCalled = true
        savedPayload = JSON.parse(route.request().postData() ?? "{}")
        return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)

    // Go to Sommaire and open the editor.
    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
    await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

    // The studio shows the default rows as editable inputs.
    // Verify the studio toolbar is rendered (confirms edit mode is active).
    await expect(page.getByRole("button", { name: /Ajouter un poste/i })).toBeVisible({ timeout: 10000 })
    // Verify the default rows actually rendered as editable inputs (would fail
    // if the studio opened but rendered zero rows / ignored the GET payload).
    await expect(page.locator('input[value*="exploitation" i]').first()).toBeVisible({ timeout: 5000 })
    await page.locator('input[value*="exploitation" i]').first().fill("flux opérationnels")

    // Save.
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()
    await expect.poll(() => putCalled, { timeout: 10000 }).toBe(true)
    expect(JSON.stringify(savedPayload)).toContain("flux opérationnels")
    await expect.poll(
      () => cashFlowUrls.some((url) => url.includes("_sr=1")),
      { timeout: 10000 },
    ).toBe(true)

    // Editor closes (Paramètres trigger returns).
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible({ timeout: 10000 })
  })
})
