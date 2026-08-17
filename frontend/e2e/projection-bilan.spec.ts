import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const CURRENT_YEAR = new Date().getFullYear()

async function setupBilanPage(page: Page) {
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
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/notes**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notes: [] }) }),
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
        body: JSON.stringify({ id: "fc1", config_type: "balance-sheet-forecast", data: {} }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        structure: [
          { label: "Actif", isSection: true },
          {
            label: "Encaisse",
            linkCode: "ACT-A.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Clients",
            linkCode: "ACT-B.1",
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
          {
            label: "Terrains",
            linkCode: "ALT-B.1",
            annexLetter: "B",
            detailOnly: true,
            liaisonMode: "single",
            defineMapping: true,
            showInDetail: true,
          },
        ],
      }),
    }),
  )

  const periods = []
  for (let year = CURRENT_YEAR - 1; year <= CURRENT_YEAR + 5; year++) {
    for (let month = 1; month <= 12; month++) {
      periods.push({ fiscalYear: year, fiscalMonth: month, label: `${month}/${year}` })
    }
  }
  const amounts: Record<string, number> = {}
  for (const p of periods) {
    amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = 120000
  }

  await page.route(`**/financial-statements/balance-sheet/series**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "balance-sheet",
        fiscalYear: CURRENT_YEAR,
        periods,
        rows: [
          {
            id: "ACT-A.1",
            label: "Encaisse",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
          {
            id: "ACT-B.1",
            label: "Clients",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
        ],
      }),
    }),
  )
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow-detail`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        structure: [
          { label: "Variation de trésorerie", isBold: true, isResult: true },
          { label: "Trésorerie à la fin de l'exercice", isBold: true, isResult: true },
        ],
      }),
    }),
  )
  await page.route(`**/financial-statements/cash-flow-detail/series**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "cash-flow-detail",
        fiscalYear: CURRENT_YEAR,
        periods,
        rows: [
          {
            id: "var-treso",
            label: "Variation de trésorerie",
            hasLiaisonCode: true,
            amounts,
            detailRows: [],
          },
        ],
      }),
    }),
  )
}

test("bilan hypothesis shows the balance sheet and opens an adjustment panel", async ({ page }) => {
  await setupBilanPage(page)
  await page.goto("/projections/bilan")

  await expect(page.getByRole("heading", { name: /Estimation du Bilan annuel/ })).toBeVisible({
    timeout: 20000,
  })
  await expect(page.getByText("Encaisse").first()).toBeVisible({ timeout: 20000 })
  await expect(page.getByText("Terrains")).toHaveCount(0)
  await expect(page.getByText("Trésorerie à la fin").first()).toBeVisible()
  await expect(page.getByText("% du solde")).toHaveCount(0)

  const encaisseRow = page.locator("tr", { hasText: "Encaisse" }).first()
  await encaisseRow.locator("td").nth(2).click()
  await expect(page.getByRole("button", { name: /Enregistrer l'ajustement/ })).toHaveCount(0)

  const clientsRow = page.locator("tr", { hasText: "Clients" }).first()
  await clientsRow.locator("td").nth(2).click()

  await expect(page.getByRole("heading", { name: "Clients" })).toBeVisible()
  await expect(page.getByLabel("Montant ($)")).toBeVisible()
  await page.getByLabel("Montant ($)").fill("50000")
  await page.getByRole("button", { name: /Enregistrer l'ajustement/ }).click()
  await expect(page.getByText("50 000 $").first()).toBeVisible()
})
