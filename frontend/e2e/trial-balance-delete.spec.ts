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

  await page.route(`**/api/companies/${COMPANY_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: COMPANY_ID,
        name: "Test Co",
        fiscal_year_end: "12-31",
        currency: "CAD",
      }),
    }),
  )
}

test.describe("Trial balance bulk delete", () => {
  test("suppression de plusieurs mois via months= query param", async ({ page }) => {
    await setupAuth(page)

    const deleteUrls: string[] = []
    await page.route(`**/api/companies/${COMPANY_ID}/trial-balance**`, (route) => {
      const url = route.request().url()
      const method = route.request().method()

      if (method === "GET" && url.includes("/fiscal-years")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([2024]),
        })
      }

      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            company_id: COMPANY_ID,
            fiscal_year: 2024,
            months_with_data: [1, 2, 3],
            accounts: [
              {
                account_number: "1000",
                description: "Cash",
                monthly_amounts: {
                  Janvier: 100,
                  Février: 200,
                  Mars: 300,
                  Avril: 0,
                  Mai: 0,
                  Juin: 0,
                  Juillet: 0,
                  Août: 0,
                  Septembre: 0,
                  Octobre: 0,
                  Novembre: 0,
                  Décembre: 0,
                },
              },
            ],
          }),
        })
      }

      if (method === "DELETE") {
        deleteUrls.push(url)
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            company_id: COMPANY_ID,
            fiscal_year: 2024,
            months_with_data: [2],
            accounts: [
              {
                account_number: "1000",
                description: "Cash",
                monthly_amounts: {
                  Janvier: 0,
                  Février: 200,
                  Mars: 0,
                  Avril: 0,
                  Mai: 0,
                  Juin: 0,
                  Juillet: 0,
                  Août: 0,
                  Septembre: 0,
                  Octobre: 0,
                  Novembre: 0,
                  Décembre: 0,
                },
              },
            ],
          }),
        })
      }

      return route.continue()
    })

    await page.goto(`/settings/companies/${COMPANY_ID}/trial-balance`)

    await page.getByRole("button", { name: "Supprimer" }).click()
    await expect(page.getByRole("heading", { name: "Supprimer des périodes" })).toBeVisible()

    await page.getByRole("checkbox", { name: "Janvier" }).click()
    await page.getByRole("checkbox", { name: "Mars" }).click()
    await page.getByRole("button", { name: "Continuer" }).click()
    await page.getByRole("button", { name: "Supprimer définitivement" }).click()

    await expect.poll(() => deleteUrls.length).toBe(1)
    const deleted = new URL(deleteUrls[0]!)
    expect(deleted.searchParams.get("fiscal_year")).toBe("2024")
    expect(deleted.searchParams.get("months")).toBe("1,3")
  })
})
