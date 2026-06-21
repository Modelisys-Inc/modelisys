import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

const CASH_FLOW_DEFAULT = [
  { label: "flux de trésorerie liés à l'exploitation", isBold: true, isSection: true },
  { label: "flux de trésorerie liés aux activités d'investissement", isBold: true, isSection: true },
  { label: "flux de trésorerie liés aux activités de financement", isBold: true, isSection: true },
  { label: "variation nette de la trésorerie", isBold: true, isResult: true },
]

const CASH_FLOW_LINK_CODES = [
  {
    id: "tex-1",
    code: "TEX-EXP",
    parent_code: null,
    family: "TEX",
    label_account: null,
    label_sub_account: "Exploitation agrégée",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: ["REV-A.1"],
    ft_line_item: null,
    projections: null,
    is_leaf: false,
    sort_order: 1,
    label: "Exploitation agrégée",
  },
  {
    id: "tin-1",
    code: "TIN-INV",
    parent_code: null,
    family: "TIN",
    label_account: null,
    label_sub_account: "Investissement agrégé",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: ["ACT-A.1"],
    ft_line_item: null,
    projections: null,
    is_leaf: false,
    sort_order: 1,
    label: "Investissement agrégé",
  },
  {
    id: "tfi-1",
    code: "TFI-FIN",
    parent_code: null,
    family: "TFI",
    label_account: null,
    label_sub_account: "Financement agrégé",
    account_type: null,
    account_sub_type: null,
    variable_or_fixed: null,
    ft_category: null,
    attached_link_codes: ["PCT-A.1"],
    ft_line_item: null,
    projections: null,
    is_leaf: false,
    sort_order: 1,
    label: "Financement agrégé",
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
        user: { id: "u1", email: "u@e.com", full_name: "Test", is_active: true, created_at: "2026-01-01T00:00:00Z" },
        organizations: [{ id: "o1", name: "Org", slug: "org", role: "admin" }],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: "o1", name: "Org", slug: "org", role: "admin" }]) }),
  )
  await page.route(/\/api\/companies(\?.*)?$/, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ companies: [{ id: COMPANY_ID, name: "Test Co", divisions: [] }] }) })
    }
    return route.continue()
  })
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ budgets: [] }) }),
  )
  // Chart config slots — needed by the dashboard section that mounts first.
  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs*`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [] }) })
    }
    return route.continue()
  })
  // Series endpoint — needed when Sommaire is in a multi-period view (12months).
  await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow/series*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
    }),
  )
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CASH_FLOW_LINK_CODES),
    }),
  )
}

test.describe("Trésorerie structure editor", () => {
  test("Sommaire exposes Paramètres, opens the studio, and saves", async ({ page }) => {
    await setupAuth(page)

    let putCalled = false
    let savedPayload: unknown = null
    const cashFlowUrls: string[] = []
    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) => {
      cashFlowUrls.push(route.request().url())
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          month: 12,
          period: "monthly",
          rows: [],
        }),
      })
    })
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow*`, (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: null, company_id: COMPANY_ID, statement_type: "cash-flow", structure: CASH_FLOW_DEFAULT }) })
      }
      if (method === "PUT") {
        putCalled = true
        savedPayload = JSON.parse(route.request().postData() ?? "{}")
        return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)

    // Go to Sommaire and open the editor.
    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
    await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

    // The studio shows the default rows as editable inputs.
    // Verify the studio toolbar is rendered (confirms edit mode is active).
    await expect(page.getByRole("button", { name: /Ajouter un poste/i })).toBeVisible({ timeout: 10000 })
    // Verify the default rows actually rendered as editable inputs (would fail
    // if the studio opened but rendered zero rows / ignored the GET payload).
    await expect(page.locator('input[value*="investissement" i]').first()).toBeVisible({ timeout: 5000 })
    await page.locator('input[value*="investissement" i]').first().fill("flux investissement")

    // Save.
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()
    await expect.poll(() => putCalled, { timeout: 10000 }).toBe(true)
    expect(JSON.stringify(savedPayload)).toContain("flux investissement")
    await expect.poll(
      () => cashFlowUrls.some((url) => url.includes("_sr=1")),
      { timeout: 10000 },
    ).toBe(true)

    // Editor closes (Paramètres trigger returns).
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible({ timeout: 10000 })
  })

  test("Sommaire Paramètres — espace, séparation et modification de poste", async ({ page }) => {
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          month: 12,
          period: "monthly",
          rows: [],
        }),
      })
    })
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow*`, (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: null, company_id: COMPANY_ID, statement_type: "cash-flow", structure: CASH_FLOW_DEFAULT }),
        })
      }
      if (method === "PUT") {
        return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
    await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

    // Ajouter un espace via la modale (comme Bilan Sommaire).
    await page.getByRole("button", { name: /Ajouter un espace/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: /Insérer l'espace/i }).click()
    await expect(page.getByText(/Ligne vide — renommez ou supprimez/i)).toBeVisible()

    // Cocher « Séparation » sur le premier poste → trait visuel au-dessus.
    const sepCheckbox = page.getByRole("checkbox", { name: /Séparation : trait au-dessus/i }).first()
    await sepCheckbox.click()
    await expect(page.locator("tr[aria-hidden] td.border-t-slate-600").first()).toBeVisible()

    // Modifier la présentation d’un poste (crayon).
    await page.getByRole("button", { name: /Modifier le poste \(niveau, gras\)/i }).first().click()
    await expect(page.getByRole("dialog")).toContainText(/Modifier le poste/i)
    await page.getByRole("radio", { name: /Poste principal/i }).click()
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("Sommaire liaison code unique offers Trésorerie family codes only", async ({ page }) => {
    await setupAuth(page)

    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          month: 12,
          period: "monthly",
          rows: [],
        }),
      })
    })
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow*`, (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: null, company_id: COMPANY_ID, statement_type: "cash-flow", structure: CASH_FLOW_DEFAULT }),
        })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
    await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

    await page.getByRole("checkbox", { name: /Code : liaison et lettre modifiables/i }).nth(1).click()
    await page.locator("button").filter({ has: page.locator("svg.lucide-link2") }).first().click()
    await page.getByRole("combobox").filter({ hasText: /Sélectionner ou créer/i }).click()

    await expect(page.getByRole("option", { name: /TEX-EXP/ })).toBeVisible()
    await expect(page.getByRole("option", { name: /TIN-INV/ })).toBeVisible()
    await expect(page.getByRole("option", { name: /TFI-FIN/ })).toBeVisible()
    await expect(page.getByRole("option", { name: /\bREV\b/ })).toHaveCount(0)
    await expect(page.getByRole("option", { name: /\bACT\b/ })).toHaveCount(0)
  })

  test("Détail exposes Paramètres with presentation studio (sans Annexe/Lettre)", async ({ page }) => {
    await setupAuth(page)

    let putCalled = false
    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          month: 12,
          period: "monthly",
          rows: [],
        }),
      })
    })
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow-detail*`, (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: null,
            company_id: COMPANY_ID,
            statement_type: "cash-flow-detail",
            structure: CASH_FLOW_DEFAULT,
          }),
        })
      }
      if (method === "PUT") {
        putCalled = true
        return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })
    await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

    await expect(page.getByRole("button", { name: /Ajouter un poste/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText("Annexe", { exact: true })).toHaveCount(0)
    await expect(page.getByText("Lettre", { exact: true })).toHaveCount(0)

    await page.locator('input[value*="investissement" i]').first().fill("flux investissement détail")
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()
    await expect.poll(() => putCalled, { timeout: 10000 }).toBe(true)
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible({ timeout: 10000 })
  })

  test("Détail hors Paramètres reflète espaces et libellés de la structure", async ({ page }) => {
    await setupAuth(page)

    const customStructure = [
      { id: "s1", label: "Trésorerie - Exploitation", isBold: true, isSection: true },
      { id: "spacer-1", label: "" },
      { id: "s2", label: "flux investissement détail", linkCode: "TIN-INV", defineMapping: true },
    ]

    await page.route(`**/api/companies/${COMPANY_ID}/financial-statements/cash-flow*`, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ companyId: COMPANY_ID, statementType: "cash-flow", fiscalYear: 2026, periods: [], rows: [] }),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "cash-flow",
          fiscalYear: 2026,
          month: 12,
          period: "monthly",
          rows: [
            {
              id: "TIN-INV",
              linkCode: "TIN-INV",
              label: "ancien libellé investissement",
              current: 1000,
              prior: 900,
              isBold: true,
              hasLiaisonCode: true,
            },
          ],
        }),
      })
    })
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/cash-flow-detail*`, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: null,
            company_id: COMPANY_ID,
            statement_type: "cash-flow-detail",
            structure: customStructure,
          }),
        })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("Trésorerie - Exploitation", { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(table.getByText("flux investissement détail", { exact: true })).toBeVisible()
    await expect(table.getByText("ancien libellé investissement")).toHaveCount(0)

    const spacerRow = table.locator("tbody tr.h-2")
    await expect(spacerRow).toHaveCount(1)
  })
})
