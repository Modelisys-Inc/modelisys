import { test, expect, type Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

async function setupCmpcPage(page: Page) {
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
    if (route.request().method() === "GET" && !route.request().url().includes("/companies/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companies: [
            {
              id: COMPANY_ID,
              name: "ManuFAC",
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
  await page.route(`**/api/companies/${COMPANY_ID}/forecast-configs**`, async (route) => {
    const method = route.request().method()
    const url = route.request().url()
    if (method === "GET") {
      if (url.includes("ebitda-multiple-config")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            configs: [
              {
                id: "fc-ebitda",
                config_type: "ebitda-multiple-config",
                data: { lowEBITDARange: 800_000, highEBITDARange: 1_200_000 },
                company_id: COMPANY_ID,
              },
            ],
          }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ configs: [] }),
      })
    }
    if (method === "PUT" || method === "POST" || method === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "fc-cmpc",
          config_type: "cmpc-multiplicateur",
          data: body?.data ?? {},
          company_id: COMPANY_ID,
        }),
      })
    }
    return route.continue()
  })
}

test.describe("Multiplicateur CMPC", () => {
  test("affiche le rapport CMPC sous l’en-tête Multiplicateur", async ({ page }) => {
    await setupCmpcPage(page)
    await page.goto(
      `/evaluation/capitalisation?companyId=${COMPANY_ID}&refMonth=12&refYear=2026`,
    )

    await expect(page.getByRole("heading", { name: "Multiplicateur" })).toBeVisible()
    await expect(page.getByText("Entité")).toBeVisible()
    await expect(page.getByText("ManuFAC").first()).toBeVisible()
    await expect(page.getByTestId("multiplicateur-reference-date")).toContainText("décembre 2026")

    await expect(page.getByTestId("cmpc-report")).toBeVisible()
    await expect(page.getByTestId("cmpc-retained-rate")).toContainText("10.75")
    await expect(page.getByTestId("cmpc-risk-free-rate")).toBeVisible()
    await expect(page.getByTestId("cmpc-note-risk-free-rate")).toHaveValue(
      /Obligation du gouvernement/,
    )
  })

  test("permet d’éditer une note / source du coût des capitaux propres", async ({ page }) => {
    await setupCmpcPage(page)
    await page.goto(
      `/evaluation/capitalisation?companyId=${COMPANY_ID}&refMonth=12&refYear=2026`,
    )
    const note = page.getByTestId("cmpc-note-risk-free-rate")
    await note.fill("Banque du Canada — courbe 10 ans")
    await expect(note).toHaveValue("Banque du Canada — courbe 10 ans")
  })

  test("permet d’éditer une source du sommaire (section 5)", async ({ page }) => {
    await setupCmpcPage(page)
    await page.goto(
      `/evaluation/capitalisation?companyId=${COMPANY_ID}&refMonth=12&refYear=2026`,
    )
    const source = page.getByTestId("cmpc-source-riskFreeRate")
    await source.fill("Banque du Canada — courbe 10 ans (mise à jour).")
    await expect(source).toHaveValue("Banque du Canada — courbe 10 ans (mise à jour).")
  })

  test("recalcule le CMPC retenu quand on change le taux sans risque", async ({ page }) => {
    await setupCmpcPage(page)
    await page.goto(
      `/evaluation/capitalisation?companyId=${COMPANY_ID}&refMonth=12&refYear=2026`,
    )
    await expect(page.getByTestId("cmpc-retained-rate")).toContainText("10.75")

    const rf = page.getByTestId("cmpc-risk-free-rate")
    await rf.click()
    await rf.fill("4.3")
    await rf.blur()

    // ΔRf +1 → Ke +1 et Kd +1×(1−t) → WACC ≈ 11.66 → retenu 11.75
    await expect(page.getByTestId("cmpc-retained-rate")).toContainText("11.75")
  })

  test("affiche la capacité d’endettement à partir du BAIIA ajusté", async ({ page }) => {
    await setupCmpcPage(page)
    await page.goto(
      `/evaluation/capitalisation?companyId=${COMPANY_ID}&refMonth=12&refYear=2026`,
    )

    await expect(page.getByTestId("cmpc-debt-capacity")).toBeVisible()
    await expect(page.getByTestId("cmpc-baiia-retained")).toContainText("BAIIA ajusté")
    await expect(page.getByTestId("cmpc-debt-baiia-empirical")).toBeVisible()
    await expect(page.getByTestId("cmpc-debt-baiia-ai")).toBeVisible()
    await expect(page.getByTestId("cmpc-debt-baiia-comparables")).toBeVisible()
    await expect(page.getByTestId("cmpc-debt-capacity-sensitivity")).toBeVisible()
    // 3,00× × 1 000 000 $ moyen = 3 000 000 $
    await expect(page.getByTestId("cmpc-debt-capacity-sensitivity")).toContainText("3")
  })
})
