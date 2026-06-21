import { test, expect, Page } from "@playwright/test"

// Superadmin global chart-of-accounts admin: non-superadmins are blocked;
// superadmins can create and deprecate codes. Backend mocked.

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
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "admin" }]) }),
  )
}

const CODE = {
  id: "g1", code: "EXP-A", parent_code: null, family: "EXP",
  label_account: "Frais", label_sub_account: null, account_type: null, account_sub_type: null,
  variable_or_fixed: null, ft_category: null, ft_line_item: null, projections: null,
  is_leaf: true, sort_order: 1, is_active: true, label: "Frais",
}

test("non-superadmin is blocked from the global-code admin", async ({ page }) => {
  await baseAuth(page, false)
  await page.goto("/settings/standard-codes")
  await expect(page.getByText("Accès réservé")).toBeVisible()
  await expect(page.getByTestId("global-codes-table")).toHaveCount(0)
})

test("superadmin can create and deprecate a global code", async ({ page }) => {
  await baseAuth(page, true)

  const codes = [{ ...CODE }]
  await page.route(/\/api\/standard-link-codes\/flat(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(codes) }),
  )
  let created = false
  await page.route(/\/api\/standard-link-codes$/, (route) => {
    if (route.request().method() === "POST") {
      created = true
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ...CODE, id: "g2", code: "EXP-NEW", label_account: "Nouveau", label: "Nouveau" }),
      })
    }
    return route.continue()
  })
  await page.route(/\/api\/standard-link-codes\/EXP-A(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...CODE, is_active: false }),
    }),
  )

  await page.goto("/settings/standard-codes")

  const table = page.getByTestId("global-codes-table")
  await expect(table.getByText("EXP-A")).toBeVisible()

  // Create a new code.
  await page.getByLabel("Code").fill("EXP-NEW")
  await page.getByLabel("Famille").fill("EXP")
  await page.getByLabel("Libellé").fill("Nouveau")
  await page.getByRole("button", { name: "Ajouter" }).click()
  await expect.poll(() => created).toBe(true)
  await expect(table.getByText("EXP-NEW")).toBeVisible()

  // Deprecate the existing code → row flips to "Déprécié".
  await page.getByRole("button", { name: "Déprécier EXP-A" }).click()
  await expect(table.getByText("Déprécié")).toBeVisible()
})
