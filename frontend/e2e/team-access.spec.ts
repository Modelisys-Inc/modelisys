import { test, expect, Page } from "@playwright/test"

// Verifies the admin team-management access dialog: an admin opens a member's
// "Accès" dialog, grants a specific company, and saves (PATCH all_companies +
// PUT companies). All backend calls are mocked.

const ORG = "o1"
const MEMBER = "m1"

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
        user: { id: "u1", email: "admin@e.com", full_name: "Admin A", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: ORG, name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: ORG, name: "Org", slug: "org", role: "admin" }]) }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ companies: [{ id: "c1", name: "Acme Inc", divisions: [] }] }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/organizations/${ORG}/members`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        members: [
          {
            id: MEMBER,
            email: "mary@e.com",
            full_name: "Mary M",
            role: "member",
            all_companies: false,
            company_ids: [],
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    }),
  )
}

test("admin grants a member access to a specific company", async ({ page }) => {
  await setupAuth(page)

  let putBody: unknown = null
  await page.route(`**/api/organizations/${ORG}/members/${MEMBER}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: MEMBER, email: "mary@e.com", full_name: "Mary M", role: "member", all_companies: false, company_ids: [], created_at: "2026-01-01T00:00:00Z" }),
    }),
  )
  await page.route(`**/api/organizations/${ORG}/members/${MEMBER}/companies`, async (route) => {
    putBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: MEMBER, email: "mary@e.com", full_name: "Mary M", role: "member", all_companies: false, company_ids: ["c1"], created_at: "2026-01-01T00:00:00Z" }),
    })
  })

  await page.goto("/settings/users")

  await expect(page.getByText("Mary M")).toBeVisible()

  // Open the access dialog for the member.
  await page.getByRole("button", { name: "Gérer l'accès de Mary M" }).click()

  // Grant the specific company and save.
  const list = page.getByTestId("company-grant-list")
  await expect(list).toBeVisible()
  await list.getByLabel("Acme Inc").check()
  await page.getByRole("button", { name: "Enregistrer" }).click()

  // The PUT carried the selected company.
  await expect.poll(() => putBody).toEqual({ company_ids: ["c1"] })
})
