import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const PROJECTION_ID = "22222222-2222-2222-2222-222222222222"

async function setupProjectionsPage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([{ name: "has_session", value: "1", url: "http://localhost:3000" }])

  await page.route("**/api/**", async (route) => {
    const url = route.request().url()
    if (url.includes("/api/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      })
    }
    return route.continue()
  })

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
  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "fake-access-token", refresh_token: "fake-refresh-token" }),
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
          companies: [{ id: COMPANY_ID, name: "Test Co", fiscal_year_end: "12-31", currency: "CAD", divisions: [] }],
        }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/projections**`, async (route) => {
    const method = route.request().method()
    if (method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ projections: [] }),
      })
    }
    if (method === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: PROJECTION_ID,
          name: body.name,
          projection_years: body.projection_years ?? 5,
          projection_mode: body.projection_mode ?? "account",
          projection_horizon: body.projection_horizon ?? "annual",
          start_year: body.start_year ?? null,
          start_month: body.start_month ?? null,
          company_id: COMPANY_ID,
          division_id: body.division_id ?? null,
          sub_division_id: body.sub_division_id ?? null,
          created_by_id: "u1",
          adjustments: [],
          loans: [],
          created_at: "2026-08-18T00:00:00Z",
          updated_at: "2026-08-18T00:00:00Z",
        }),
      })
    }
    return route.continue()
  })
}

test("new scenario dialog has no entity or horizon picker, and sends month+year reference", async ({ page }) => {
  await setupProjectionsPage(page)
  await page.goto(`/projections?companyId=${COMPANY_ID}`)

  await expect(page.getByRole("heading", { name: "Projections", exact: true })).toBeVisible({ timeout: 15000 })
  await page.getByRole("button", { name: "Nouveau scénario" }).first().click()

  const dialog = page.getByTestId("new-scenario-dialog")
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText("Entité", { exact: true })).toHaveCount(0)
  await expect(dialog.getByText("Période", { exact: true })).toHaveCount(0)
  await expect(dialog.getByText("Mensuel", { exact: true })).toHaveCount(0)
  await expect(dialog.getByRole("combobox", { name: "Période" })).toHaveCount(0)
  await expect(dialog.getByText("Mois de référence")).toBeVisible()
  await expect(dialog.getByText("Année de référence")).toBeVisible()

  await dialog.getByTestId("new-scenario-name").fill("Scénario e2e")
  await dialog.getByTestId("new-scenario-start-month").click()
  await page.getByRole("option", { name: "Mars" }).click()
  await dialog.getByTestId("new-scenario-start-year").click()
  await page.getByRole("option", { name: "2027" }).click()

  const createRequest = page.waitForRequest(
    (req) =>
      req.method() === "POST" &&
      req.url().includes(`/api/companies/${COMPANY_ID}/projections`) &&
      !req.url().includes("/projections/"),
  )
  await dialog.getByTestId("new-scenario-submit").click()
  const request = await createRequest
  const payload = request.postDataJSON() as Record<string, unknown>

  expect(payload.name).toBe("Scénario e2e")
  expect(payload.projection_horizon).toBe("annual")
  expect(payload.start_month).toBe(3)
  expect(payload.start_year).toBe(2027)
  expect(payload.division_id).toBeNull()
  expect(payload.sub_division_id).toBeNull()

  await expect(page).toHaveURL(new RegExp(`projectionId=${PROJECTION_ID}`), { timeout: 10000 })
})
