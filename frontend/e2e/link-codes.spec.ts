import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const URL = `/settings/companies/${COMPANY_ID}/link-codes`

const MOCK_CODES = [
  {
    id: "c-parent",
    code: "REV-A",
    parent_code: null,
    family: "REV",
    label_account: "Revenus",
    label_sub_account: "Revenus opérationnels",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: [],
    ft_line_item: null,
    projections: null,
    is_leaf: false,
    sort_order: 1,
    label: "Revenus opérationnels",
  },
  {
    id: "c1",
    code: "REV-A.1",
    parent_code: "REV-A",
    family: "REV",
    label_account: "Revenus",
    label_sub_account: "Ventes produits",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: [],
    ft_line_item: null,
    projections: null,
    is_leaf: true,
    sort_order: 2,
    label: "Ventes produits",
  },
  {
    id: "c-tail",
    code: "REV-Z",
    parent_code: null,
    family: "REV",
    label_account: null,
    label_sub_account: "Autre revenu",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: [],
    ft_line_item: null,
    projections: null,
    is_leaf: true,
    sort_order: 10,
    label: "Autre revenu",
  },
  {
    id: "cap-c",
    code: "CAP-C",
    parent_code: null,
    family: "CAP",
    label_account: "Capitaux propres",
    label_sub_account: "Groupe CAP-C",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: [],
    ft_line_item: null,
    projections: null,
    is_leaf: false,
    sort_order: 1,
    label: "Groupe CAP-C",
  },
  {
    id: "cap-c-1",
    code: "CAP-C.1",
    parent_code: "CAP-C",
    family: "CAP",
    label_account: "Capitaux propres",
    label_sub_account: "Bénéfice net",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: [],
    ft_line_item: null,
    projections: null,
    is_leaf: true,
    sort_order: 2,
    label: "Bénéfice net",
  },
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
        user: {
          id: "u1",
          email: "u@e.com",
          full_name: "Test",
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
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
        body: JSON.stringify({
          companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }],
        }),
      })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: COMPANY_ID, name: "Test Co", divisions: [] }),
      })
    }
    return route.continue()
  })
}

function sortHierarchically(codes: typeof MOCK_CODES) {
  const byCode = new Map(codes.map((c) => [c.code, c]))
  const children = new Map<string | null, typeof MOCK_CODES>()
  for (const c of codes) {
    const parent = c.parent_code && byCode.has(c.parent_code) ? c.parent_code : null
    const list = children.get(parent) ?? []
    list.push(c)
    children.set(parent, list)
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order)
  }
  const result: typeof MOCK_CODES = []
  const walk = (parent: string | null) => {
    for (const child of children.get(parent) ?? []) {
      result.push(child)
      walk(child.code)
    }
  }
  walk(null)
  return result
}

test.describe("Link codes page", () => {
  test.beforeEach(async ({ page }) => {
    let codes = [...MOCK_CODES]

    await setupAuth(page)

    await page.route("**/api/standard-link-codes**", async (route) => {
      const req = route.request()
      const method = req.method()
      const url = req.url()

      if (method === "GET" && !url.includes("/flat") && !url.match(/\/api\/standard-link-codes\/[^/?]+$/)) {
        const families = [...new Set(codes.map((c) => c.family))]
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            families.map((family) => ({
              family,
              account_type: family === "REV" ? "Revenus" : family === "CAP" ? "Capitaux propres" : family,
              codes: sortHierarchically(codes.filter((c) => c.family === family)),
            })),
          ),
        })
      }

      if (method === "GET" && url.includes("/flat")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(codes),
        })
      }

      if (method === "POST") {
        const body = req.postDataJSON()
        const parent = body.parent_code
          ? codes.find((c) => c.code === body.parent_code)
          : null
        const subtreeMax = parent
          ? Math.max(
              parent.sort_order,
              ...codes
                .filter((c) => c.parent_code === parent.code)
                .map((c) => c.sort_order),
            )
          : Math.max(0, ...codes.filter((c) => !c.parent_code).map((c) => c.sort_order))
        const sort_order = parent ? subtreeMax + 1 : subtreeMax + 1
        if (parent) {
          codes = codes.map((c) =>
            c.sort_order >= sort_order ? { ...c, sort_order: c.sort_order + 1 } : c,
          )
        }
        const created = {
          id: "c-new",
          code: body.code,
          parent_code: body.parent_code ?? null,
          family: body.family,
          label_account: body.label_account ?? null,
          label_sub_account: body.label_sub_account ?? null,
          account_type: null,
          account_sub_type: null,
          variable_or_fixed: null,
          ft_category: null,
          attached_link_codes: body.attached_link_codes ?? [],
          ft_line_item: null,
          projections: null,
          is_leaf: body.is_leaf ?? (body.family === "TEX" || body.family === "TIN" || body.family === "TFI" ? false : true),
          sort_order,
          label: body.label_sub_account ?? body.label_account ?? body.code,
        }
        codes = [...codes, created]
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(created),
        })
      }

      if (method === "PATCH") {
        const code = decodeURIComponent(url.split("/").pop()!.split("?")[0])
        const body = req.postDataJSON()
        codes = codes.map((c) =>
          c.code === code
            ? {
                ...c,
                label_sub_account: body.label_sub_account ?? c.label_sub_account,
                ft_category:
                  body.ft_category !== undefined ? body.ft_category : c.ft_category,
                is_leaf: body.is_leaf !== undefined ? body.is_leaf : c.is_leaf,
              }
            : c,
        )
        const updated = codes.find((c) => c.code === code)!
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(updated),
        })
      }

      if (method === "DELETE") {
        const code = decodeURIComponent(url.split("/").pop()!.split("?")[0])
        const hasChildren = codes.some((c) => c.parent_code === code)
        if (hasChildren) {
          return route.fulfill({
            status: 422,
            contentType: "application/json",
            body: JSON.stringify({
              detail: {
                message: "Impossible de supprimer un code qui possède des sous-codes",
              },
            }),
          })
        }
        codes = codes.filter((c) => c.code !== code)
        return route.fulfill({ status: 204, body: "" })
      }

      return route.continue()
    })
  })

  test("shows create button and opens dialog", async ({ page }) => {
    await page.goto(URL)
    await expect(page.getByRole("heading", { name: "Codes de liaison" })).toBeVisible()
    await page.getByRole("button", { name: "Nouveau code de liaison" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Nouveau code de liaison" })).toBeVisible()
  })

  test("can create a child code under its parent", async ({ page }) => {
    await page.goto(URL)
    await page.getByRole("button", { name: "Nouveau code de liaison" }).click()
    await page.getByLabel("Code *").fill("REV-A.2")
    await page.getByLabel("Libellé *").fill("Nouveau poste")
    await page.getByRole("combobox", { name: "Code parent" }).click()
    await expect(page.getByRole("option", { name: /REV-A\.1/ })).toHaveCount(0)
    await page.getByRole("option", { name: /REV-A —/ }).click()
    await page.getByRole("button", { name: "Créer le code" }).click()
    await expect(page.locator("tbody").getByText("REV-A.2", { exact: true })).toBeVisible()
    await expect(page.locator("tbody").getByText("Nouveau poste")).toBeVisible()

    const rows = page.locator("tbody tr")
    const texts = await rows.allTextContents()
    const revAIdx = texts.findIndex((t) => t.includes("REV-A") && !t.includes("REV-A."))
    const revA2Idx = texts.findIndex((t) => t.includes("REV-A.2"))
    const revZIdx = texts.findIndex((t) => t.includes("REV-Z"))
    expect(revAIdx).toBeGreaterThanOrEqual(0)
    expect(revA2Idx).toBeGreaterThan(revAIdx)
    expect(revZIdx).toBeGreaterThan(revA2Idx)
  })

  test("can edit an existing link code", async ({ page }) => {
    await page.goto(URL)
    await expect(page.getByText("REV-A.1")).toBeVisible()
    await page.locator("tr", { hasText: "REV-A.1" }).getByRole("button", { name: "Modifier" }).click()
    await expect(page.getByText("Modifier le code")).toBeVisible()
    const labelInput = page.getByLabel("Libellé *")
    await labelInput.fill("Ventes mises à jour")
    await page.getByRole("button", { name: "Enregistrer" }).click()
    await expect(page.getByText("Ventes mises à jour")).toBeVisible()
  })

  test("can delete a link code with warning confirmation", async ({ page }) => {
    await page.goto(URL)
    await page.locator("tr", { hasText: "REV-Z" }).getByRole("button", { name: "Modifier" }).click()
    await page.getByRole("button", { name: "Supprimer" }).click()
    await expect(page.getByRole("alertdialog")).toBeVisible()
    await expect(page.getByText("Cette action est irréversible")).toBeVisible()
    await page.getByRole("button", { name: "Supprimer définitivement" }).click()
    await expect(page.locator("tbody").getByText("REV-Z")).toHaveCount(0)
  })

  test("cannot delete a parent code with children", async ({ page }) => {
    await page.goto(URL)
    await page.locator("tr", { hasText: "REV-A" }).filter({ hasNotText: "REV-A." }).getByRole("button", { name: "Modifier" }).click()
    await expect(page.getByText("Ce code possède")).toBeVisible()
    await expect(page.getByRole("button", { name: "Supprimer" })).toBeDisabled()
  })

  test("does not show treasury section on bilan or income statement codes", async ({ page }) => {
    await page.goto(URL)
    await page.locator("tr", { hasText: "REV-A.1" }).getByRole("button", { name: "Modifier" }).click()
    await expect(page.getByLabel("Section Trésorerie")).toHaveCount(0)
    await page.getByRole("button", { name: "Annuler" }).click()

    await page.locator("tr", { hasText: "CAP-C.1" }).getByRole("button", { name: "Modifier" }).click()
    await expect(page.getByLabel("Section Trésorerie")).toHaveCount(0)
  })

  test("can create a TEX code with attached bilan/cdr codes", async ({ page }) => {
    await page.goto(URL)
    await page.getByRole("button", { name: "Nouveau code de liaison" }).click()
    await page.getByLabel("Famille *").click()
    await page.getByRole("option", { name: /TEX — Trésorerie/ }).click()
    await page.getByLabel("Code *").fill("TEX-TEST")
    await page.getByLabel("Libellé *").fill("Poste exploitation test")
    await page.getByRole("checkbox", { name: /REV-A\.1/ }).click()
    await page.getByRole("button", { name: "Créer le code" }).click()
    await expect(page.locator("tbody").getByText("TEX-TEST", { exact: true })).toBeVisible()
    await expect(page.locator("tbody").getByText("REV-A.1")).toBeVisible()
  })

  test("shows computed badge for CAP-C.1 net income", async ({ page }) => {
    await page.goto(URL)
    await expect(page.locator("tr", { hasText: "CAP-C.1" }).getByText("Calculé")).toBeVisible()
    await page.locator("tr", { hasText: "CAP-C.1" }).getByRole("button", { name: "Modifier" }).click()
    await expect(page.getByRole("dialog").getByText(/Ce code est calculé automatiquement/)).toBeVisible()
  })
})
