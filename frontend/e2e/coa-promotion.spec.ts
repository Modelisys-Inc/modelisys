import { test, expect, Page } from "@playwright/test"

// Verifies the curated-promotion queue UI: candidates list, promote-as-new,
// link-to-existing (suggestion), and that acted rows leave the queue.
// All backend calls are mocked.

const CAND_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const CAND_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"

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
        body: JSON.stringify({ companies: [] }),
      })
    }
    return route.continue()
  })
}

test("curator can promote and link candidates, and rows leave the queue", async ({ page }) => {
  await setupAuth(page)

  await page.route("**/api/coa/promotion-candidates", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [
          {
            id: CAND_A,
            company_id: "c1",
            company_name: "Acme Inc",
            code: "EXP-Z1",
            family: "EXP",
            label: "Frais de redevances",
            account_type: "Charges",
            ft_category: "Opex",
            promotion_status: "pending",
            suggested_match: null,
          },
          {
            id: CAND_B,
            company_id: "c2",
            company_name: "Globex",
            code: "REV-Z1",
            family: "REV",
            label: "Revenus différés",
            account_type: "Produits",
            ft_category: null,
            promotion_status: "pending",
            suggested_match: { code: "REV-DEF", label: "Produits différés", family: "REV" },
          },
        ],
      }),
    }),
  )

  await page.route(`**/api/coa/promotion-candidates/${CAND_A}/promote`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_link_code_id: CAND_A,
        promoted_to_standard_code: "EXP-Z1",
        created_new_code: true,
      }),
    }),
  )
  await page.route(`**/api/coa/promotion-candidates/${CAND_B}/promote`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        company_link_code_id: CAND_B,
        promoted_to_standard_code: "REV-DEF",
        created_new_code: false,
      }),
    }),
  )

  await page.goto("/settings/coa-promotion")

  const queue = page.getByTestId("promotion-queue")
  await expect(queue.getByText("Acme Inc")).toBeVisible()
  await expect(queue.getByText("Globex")).toBeVisible()
  // The suggestion badge for candidate B is shown.
  await expect(queue.getByText("≈ REV-DEF")).toBeVisible()

  // Promote candidate A as a new global code → its row leaves the queue.
  await queue.getByRole("button", { name: "Promouvoir" }).first().click()
  await expect(queue.getByText("Acme Inc")).toHaveCount(0)

  // Link candidate B to the suggested existing code → its row leaves too.
  await queue.getByRole("button", { name: "Lier à REV-DEF" }).click()
  await expect(queue.getByText("Globex")).toHaveCount(0)

  // Queue is now empty.
  await expect(page.getByText("Aucun code personnalisé en attente de révision.", { exact: false })).toBeVisible()
})
