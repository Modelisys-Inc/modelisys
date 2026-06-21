import { test, expect, Page } from "@playwright/test"

// Superadmin client management: non-superadmins are blocked; superadmins can
// create clients and toggle feature flags. Backend mocked.

async function baseAuth(page: Page, isSuperadmin: boolean) {
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
        user: { id: "u1", email: "u@e.com", full_name: "U", is_active: true, is_superadmin: isSuperadmin, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin", feature_flags: {} }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "admin" }]) }),
  )
}

const REGISTRY = [
  { key: "quickbooks", label: "Intégration QuickBooks", default: true },
  { key: "projections", label: "Projections", default: true },
]

test("non-superadmin is blocked from client management", async ({ page }) => {
  await baseAuth(page, false)
  await page.goto("/settings/clients")
  await expect(page.getByText("Accès réservé")).toBeVisible()
})

test("superadmin creates a client and toggles a feature flag", async ({ page }) => {
  await baseAuth(page, true)

  const orgs: Record<string, unknown>[] = [
    { id: "c1", name: "Existing Co", slug: "existing-co", member_count: 2, company_count: 1, feature_flags: { quickbooks: true, projections: true }, created_at: "2026-01-01T00:00:00Z" },
  ]

  await page.route("**/api/admin/feature-flags", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REGISTRY) }),
  )
  await page.route("**/api/admin/organizations", (route) => {
    if (route.request().method() === "POST") {
      const created = { id: "c2", name: "Acme", slug: "acme", member_count: 1, company_count: 0, feature_flags: { quickbooks: true, projections: true }, created_at: "2026-02-01T00:00:00Z" }
      orgs.unshift(created)
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) })
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ organizations: orgs }) })
  })
  let patched: unknown = null
  await page.route("**/api/admin/organizations/c1/feature-flags", async (route) => {
    patched = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...orgs[orgs.length - 1], feature_flags: { quickbooks: false, projections: true } }),
    })
  })

  await page.goto("/settings/clients")

  const list = page.getByTestId("clients-list")
  await expect(list.getByRole("heading", { name: "Existing Co" })).toBeVisible()

  // Create a client.
  await page.getByLabel("Nom du client").fill("Acme")
  await page.getByLabel("Courriel de l'administrateur").fill("admin@acme.com")
  await page.getByRole("button", { name: "Créer" }).click()
  await expect(list.getByRole("heading", { name: "Acme" })).toBeVisible()

  // Toggle the QuickBooks flag off for the existing client.
  await page.getByLabel("Intégration QuickBooks pour Existing Co").click()
  await expect.poll(() => patched).toEqual({ flags: { quickbooks: false, projections: true } })
})
