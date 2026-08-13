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
          full_name: "Test User",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
        organizations: [{ id: "o1", name: "Test Org", slug: "test-org", role: "admin" }],
      }),
    }),
  )

  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "o1", name: "Test Org", slug: "test-org", role: "admin" }]),
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

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement`,
    (route) => {
      if (route.request().url().includes("/series")) return route.continue()
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          rows: [
            {
              id: "revenue",
              label: "revenus",
              current: 10000,
              prior: 9000,
              isBold: true,
              isSection: false,
              isResult: false,
            },
          ],
        }),
      })
    },
  )
}

test.describe("Income statement series reference month", () => {
  test("sommaire 12 mois transmet month=refMonth à l’API séries", async ({ page }) => {
    await setupAuth(page)

    const seriesRequests: string[] = []
    await page.route(
      `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
      (route) => {
        seriesRequests.push(route.request().url())
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "income-statement",
            fiscalYear: 2026,
            periods: [
              { fiscalYear: 2025, fiscalMonth: 2, label: "Fév 2025" },
              { fiscalYear: 2026, fiscalMonth: 1, label: "Jan 2026" },
            ],
            rows: [
              {
                id: "revenue",
                label: "revenus",
                isBold: true,
                amounts: { "2025-2": 5000, "2026-1": 12000 },
              },
            ],
          }),
        })
      },
    )

    await page.goto(
      `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=1&refYear=2026`,
    )

    await page.getByRole("button", { name: "Sommaire" }).click()
    await page.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "Mensuel" }).click()

    await expect.poll(() => seriesRequests.length, { timeout: 10000 }).toBeGreaterThan(0)

    const withMonth = seriesRequests.find((url) => {
      const u = new URL(url)
      return u.searchParams.get("month") === "1" && u.searchParams.get("fiscal_year") === "2026"
    })
    expect(withMonth).toBeTruthy()
  })

  test("sommaire Mensuel n’affiche pas les codes liaison chart-only hors Paramètres", async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ slots: [] }),
      }),
    )
    await page.route(`**/api/companies/${COMPANY_ID}/trial-balance/fiscal-years`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([2026]),
      }),
    )
    await page.route(`**/api/standard-link-codes/flat**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
    )

    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/income-statement**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "income-statement",
          structure: [
            { id: "baiia", label: "BAIIA", isResult: true, isBold: true, formula: "EBIT+AMO" },
            { id: "rev", label: "Revenus", linkCode: "REV", defineMapping: true, isBold: true },
          ],
        }),
      }),
    )

    await page.route(
      `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "income-statement",
            fiscalYear: 2026,
            periods: Array.from({ length: 12 }, (_, i) => ({
              fiscalYear: 2026,
              fiscalMonth: i + 1,
              label: `M${i + 1}`,
            })),
            rows: [
              {
                id: "baiia",
                label: "BAIIA",
                isBold: true,
                isResult: true,
                amounts: Object.fromEntries(
                  Array.from({ length: 12 }, (_, i) => [`2026-${i + 1}`, 1000 + i]),
                ),
              },
              {
                id: "rev",
                label: "Revenus",
                linkCode: "REV",
                isBold: true,
                hasLiaisonCode: true,
                amounts: Object.fromEntries(
                  Array.from({ length: 12 }, (_, i) => [`2026-${i + 1}`, 500 + i]),
                ),
              },
              {
                id: "REV-A.1",
                label: "REV-A.1",
                linkCode: "REV-A.1",
                hasLiaisonCode: true,
                amounts: Object.fromEntries(
                  Array.from({ length: 12 }, (_, i) => [`2026-${i + 1}`, 100 + i]),
                ),
              },
              {
                id: "REV-A.2",
                label: "REV-A.2",
                linkCode: "REV-A.2",
                hasLiaisonCode: true,
                amounts: Object.fromEntries(
                  Array.from({ length: 12 }, (_, i) => [`2026-${i + 1}`, 50 + i]),
                ),
              },
            ],
          }),
        }),
    )

    await page.goto(
      `/financial-statements/income-statement?companyId=${COMPANY_ID}&refMonth=8&refYear=2026`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    )

    // Première visite Sommaire = Mois actuel ; basculer explicitement en Mensuel (12 mois).
    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 30000 })
    await expect(page.getByRole("heading", { name: /^Sommaire$/ })).toBeVisible({ timeout: 30000 })
    await page.getByRole("combobox").filter({ hasText: /Mois actuel|Mensuel|Trimestriel|Annuel|YTD|DDM/i }).first().click()
    await page.getByRole("option", { name: "Mensuel" }).click()
    await expect(page.getByText(/Mensuel/i).first()).toBeVisible()

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("BAIIA", { exact: true }).first()).toBeVisible({ timeout: 30000 })
    await expect(table.getByText("Revenus", { exact: true }).first()).toBeVisible()
    await expect(table.getByText("REV-A.1", { exact: true })).toHaveCount(0)
    await expect(table.getByText("REV-A.2", { exact: true })).toHaveCount(0)
  })
})
