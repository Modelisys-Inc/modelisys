import { test, expect, Page } from "@playwright/test"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

/** Summary cash-flow FS (excludes cash-flow-detail). */
function isCashFlowSummaryUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/financial-statements/cash-flow`) && !path.includes("cash-flow-detail")
}

function isCashFlowDetailUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/financial-statements/cash-flow-detail`)
}

function isCashFlowSummaryStructureUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/statement-structures/cash-flow`) && !path.includes("cash-flow-detail")
}

function isCashFlowDetailStructureUrl(url: URL | string): boolean {
  const path = typeof url === "string" ? url : url.href
  return path.includes(`/companies/${COMPANY_ID}/statement-structures/cash-flow-detail`)
}

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

function emptyCashFlowResponse(statementType: "cash-flow" | "cash-flow-detail" = "cash-flow") {
  return {
    companyId: COMPANY_ID,
    statementType,
    fiscalYear: 2026,
    month: 12,
    period: "monthly",
    rows: [] as unknown[],
  }
}

function emptySeriesResponse(statementType: "cash-flow" | "cash-flow-detail" = "cash-flow") {
  return {
    companyId: COMPANY_ID,
    statementType,
    fiscalYear: 2026,
    periods: [] as unknown[],
    rows: [] as unknown[],
  }
}

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
  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs*`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ slots: [] }) })
    }
    return route.continue()
  })
  await page.route(isCashFlowSummaryUrl, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptySeriesResponse("cash-flow")),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emptyCashFlowResponse("cash-flow")),
    })
  })
  await page.route(isCashFlowDetailUrl, (route) => {
    if (route.request().url().includes("/series")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptySeriesResponse("cash-flow-detail")),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(emptyCashFlowResponse("cash-flow-detail")),
    })
  })
  await page.route(isCashFlowDetailStructureUrl, (route) => {
    if (route.request().method() === "GET") {
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
    return route.continue()
  })
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(CASH_FLOW_LINK_CODES),
    }),
  )
}

test.describe("Trésorerie structure editor", () => {
  test.setTimeout(60_000)

  test("Sommaire exposes Paramètres, opens the studio, and saves", async ({ page }) => {
    await setupAuth(page)

    let putCalled = false
    let savedPayload: unknown = null
    const cashFlowUrls: string[] = []
    await page.route(isCashFlowSummaryUrl, (route) => {
      cashFlowUrls.push(route.request().url())
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptySeriesResponse("cash-flow")),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyCashFlowResponse("cash-flow")),
      })
    })
    await page.route(isCashFlowSummaryStructureUrl, (route) => {
      const method = route.request().method()
      if (method === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: null, company_id: COMPANY_ID, statement_type: "cash-flow", structure: CASH_FLOW_DEFAULT }),
        })
      }
      if (method === "PUT") {
        putCalled = true
        savedPayload = JSON.parse(route.request().postData() ?? "{}")
        return route.fulfill({ status: 200, contentType: "application/json", body: route.request().postData() ?? "{}" })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)

    await page.getByRole("button", { name: /^Sommaire$/ }).click({ timeout: 15000 })
    await page.getByRole("button", { name: /^Paramètres$/ }).click({ timeout: 15000 })

    await expect(page.getByRole("button", { name: /Ajouter un poste/i })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('input[value*="investissement" i]').first()).toBeVisible({ timeout: 5000 })
    await page.locator('input[value*="investissement" i]').first().fill("flux investissement")

    await page.getByRole("button", { name: /^Enregistrer$/ }).click()
    await expect.poll(() => putCalled, { timeout: 10000 }).toBe(true)
    expect(JSON.stringify(savedPayload)).toContain("flux investissement")
    await expect.poll(
      () => cashFlowUrls.some((url) => url.includes("_sr=1")),
      { timeout: 10000 },
    ).toBe(true)

    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible({ timeout: 10000 })
  })

  test("Sommaire Paramètres — espace, séparation et modification de poste", async ({ page }) => {
    await setupAuth(page)

    await page.route(isCashFlowSummaryStructureUrl, (route) => {
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

    await page.getByRole("button", { name: /Ajouter un espace/i }).click()
    await expect(page.getByRole("dialog")).toBeVisible()
    await page.getByRole("button", { name: /Insérer l'espace/i }).click()
    await expect(page.getByText(/Ligne vide — renommez ou supprimez/i)).toBeVisible()

    const sepCheckbox = page.getByRole("checkbox", { name: /Séparation : trait au-dessus/i }).first()
    await sepCheckbox.click()
    await expect(page.locator("tr[aria-hidden] td.border-t-slate-600").first()).toBeVisible()

    await page.getByRole("button", { name: /Modifier le poste \(niveau, gras\)/i }).first().click()
    await expect(page.getByRole("dialog")).toContainText(/Modifier le poste/i)
    await page.getByRole("radio", { name: /Poste principal/i }).click()
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()
    await expect(page.getByRole("dialog")).toHaveCount(0)
  })

  test("Sommaire liaison code unique offers Trésorerie family codes only", async ({ page }) => {
    await setupAuth(page)

    await page.route(isCashFlowSummaryStructureUrl, (route) => {
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
    await page.route(isCashFlowDetailStructureUrl, (route) => {
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
    await expect(page.getByRole("table").getByText("Calcul", { exact: true })).toBeVisible()
    await expect(page.getByRole("table").getByText("Réel / Coût", { exact: true })).toBeVisible()

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

    await page.route(isCashFlowDetailUrl, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptySeriesResponse("cash-flow-detail")),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...emptyCashFlowResponse("cash-flow-detail"),
          rows: [
            {
              id: "s2",
              linkCode: "TIN-INV",
              label: "ancien libellé investissement",
              current: 1000,
              prior: 900,
              isBold: false,
              hasLiaisonCode: true,
            },
          ],
        }),
      })
    })
    await page.route(isCashFlowDetailStructureUrl, (route) => {
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
    // Dashboard force "Mensuel" (12 mois) ; basculer sur Mois actuel pour le mode comparaison.
    await page.getByRole("combobox").filter({ hasText: /Mensuel|Mois actuel/i }).first().click()
    await page.getByRole("option", { name: HORIZON_LABEL.moisActuel }).click()

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("Trésorerie - Exploitation", { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(table.getByText("flux investissement détail", { exact: true })).toBeVisible()
    await expect(table.getByText("ancien libellé investissement")).toHaveCount(0)
    await expect(table.getByText(/1[\s\u00a0\u202f]?000/)).toBeVisible()

    const spacerRow = table.locator("tbody tr.h-2")
    await expect(spacerRow).toHaveCount(1)
  })

  test("Détail masque les postes liaison à zéro sans chiffres", async ({ page }) => {
    await setupAuth(page)

    const detailStructure = [
      { id: "sec", label: "Trésorerie - Exploitation", isBold: true, isSection: true },
      { id: "zero", label: "ligne sans montant", linkCode: "TEX-ZERO", defineMapping: true },
      { id: "active", label: "ligne avec montant", linkCode: "TEX-ACT", defineMapping: true },
    ]

    await page.route(isCashFlowDetailUrl, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptySeriesResponse("cash-flow-detail")),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...emptyCashFlowResponse("cash-flow-detail"),
          rows: [
            {
              id: "zero",
              linkCode: "TEX-ZERO",
              label: "ligne sans montant",
              current: 0,
              prior: 0,
              hasLiaisonCode: true,
            },
            {
              id: "active",
              linkCode: "TEX-ACT",
              label: "ligne avec montant",
              current: 500,
              prior: 400,
              hasLiaisonCode: true,
            },
          ],
        }),
      })
    })
    await page.route(isCashFlowDetailStructureUrl, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: null,
            company_id: COMPANY_ID,
            statement_type: "cash-flow-detail",
            structure: detailStructure,
          }),
        })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })
    await page.getByRole("combobox").filter({ hasText: /Mensuel|Mois actuel/i }).first().click()
    await page.getByRole("option", { name: HORIZON_LABEL.moisActuel }).click()

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("Trésorerie - Exploitation", { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(table.getByText("ligne avec montant", { exact: true })).toBeVisible()
    await expect(table.getByText("ligne sans montant")).toHaveCount(0)
    await expect(table.getByText(/500/)).toBeVisible()
  })

  test("Détail affiche la somme des codes de liaison attachés (comme Bilan/CDR)", async ({ page }) => {
    await setupAuth(page)

    const detailStructure = [
      {
        id: "tex-row",
        label: "flux exploitation détail",
        linkCode: "TEX-CF-1",
        liaisonMode: "single",
        defineMapping: true,
      },
    ]

    await page.route(isCashFlowDetailUrl, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptySeriesResponse("cash-flow-detail")),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...emptyCashFlowResponse("cash-flow-detail"),
          rows: [
            {
              id: "tex-row",
              linkCode: "TEX-CF-1",
              label: "flux exploitation détail",
              current: 150,
              prior: 100,
              isBold: false,
              hasLiaisonCode: true,
              detailRows: [
                { id: "4100", label: "Revenue A", current: 100, prior: 60 },
                { id: "4101", label: "Revenue B", current: 50, prior: 40 },
              ],
            },
          ],
        }),
      })
    })
    await page.route(isCashFlowDetailStructureUrl, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: null,
            company_id: COMPANY_ID,
            statement_type: "cash-flow-detail",
            structure: detailStructure,
          }),
        })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })
    await page.getByRole("combobox").filter({ hasText: /Mensuel|Mois actuel/i }).first().click()
    await page.getByRole("option", { name: HORIZON_LABEL.moisActuel }).click()

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("flux exploitation détail", { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(table.getByText(/150/)).toBeVisible()
    // GL accounts are collapsed by default (postes Paramètres only).
    await expect(table.getByText("Revenue A")).toHaveCount(0)
    await expect(table.getByText("Revenue B")).toHaveCount(0)

    await table.getByTestId("cash-flow-detail-expandable-row").click()
    await expect(table.getByTestId("cash-flow-detail-gl-account")).toHaveCount(2)
    await expect(table.getByText("Revenue A")).toBeVisible()
    await expect(table.getByText("Revenue B")).toBeVisible()

    await table.getByTestId("cash-flow-detail-expandable-row").click()
    await expect(table.getByText("Revenue A")).toHaveCount(0)
  })

  test("Détail — ligne formule Paramètres n’est pas ouvrable", async ({ page }) => {
    await setupAuth(page)

    const detailStructure = [
      {
        id: "formula-row",
        label: "variation nette formule",
        formula: ["+tex-row", "-tin-row"],
        isResult: true,
        isBold: true,
      },
      {
        id: "tex-row",
        label: "flux exploitation détail",
        linkCode: "TEX-CF-1",
        liaisonMode: "single",
        defineMapping: true,
      },
    ]

    await page.route(isCashFlowDetailUrl, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptySeriesResponse("cash-flow-detail")),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...emptyCashFlowResponse("cash-flow-detail"),
          rows: [
            {
              id: "formula-row",
              label: "variation nette formule",
              current: 50,
              prior: 40,
              isBold: true,
              isResult: true,
              hasLiaisonCode: false,
              detailRows: [
                { id: "4100", label: "Should not show", current: 50, prior: 40 },
              ],
            },
            {
              id: "tex-row",
              linkCode: "TEX-CF-1",
              label: "flux exploitation détail",
              current: 150,
              prior: 100,
              isBold: false,
              hasLiaisonCode: true,
              detailRows: [
                { id: "4100", label: "Revenue A", current: 100, prior: 60 },
              ],
            },
          ],
        }),
      })
    })
    await page.route(isCashFlowDetailStructureUrl, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: null,
            company_id: COMPANY_ID,
            statement_type: "cash-flow-detail",
            structure: detailStructure,
          }),
        })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })
    await page.getByRole("combobox").filter({ hasText: /Mensuel|Mois actuel/i }).first().click()
    await page.getByRole("option", { name: HORIZON_LABEL.moisActuel }).click()

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    await expect(table.getByText("variation nette formule", { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(table.getByText("Should not show")).toHaveCount(0)

    // La ligne formule n’a pas de chevron / testid expandable.
    const formulaRow = table.locator("tr", { hasText: "variation nette formule" }).first()
    await expect(formulaRow.getByTestId("cash-flow-detail-expandable-row")).toHaveCount(0)
    await expect(table.getByTestId("cash-flow-detail-expandable-row")).toHaveCount(1)
  })

  test("Détail TEX-A.1 mois courant affiche le bénéfice net du mois (non cumulé)", async ({ page }) => {
    // Mois courant → NI du mois seulement (ex. −6000), pas le YTD CAP-C.1 (−18000).
    const monthlyNetIncome = -6000
    await setupAuth(page)

    const detailStructure = [
      {
        id: "tex-a1",
        label: "bénéfice net",
        linkCode: "TEX-A.1",
        liaisonMode: "single",
        defineMapping: true,
      },
    ]

    await page.route(isCashFlowDetailUrl, (route) => {
      if (route.request().url().includes("/series")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(emptySeriesResponse("cash-flow-detail")),
        })
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...emptyCashFlowResponse("cash-flow-detail"),
          rows: [
            {
              id: "tex-a1",
              linkCode: "TEX-A.1",
              label: "bénéfice net",
              current: monthlyNetIncome,
              prior: 0,
              isBold: false,
              hasLiaisonCode: true,
            },
          ],
        }),
      })
    })
    await page.route(isCashFlowDetailStructureUrl, (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: null,
            company_id: COMPANY_ID,
            statement_type: "cash-flow-detail",
            structure: detailStructure,
          }),
        })
      }
      return route.continue()
    })

    await page.goto(`/financial-statements/cash-flow?companyId=${COMPANY_ID}`)
    await page.getByRole("button", { name: /^Détail$/ }).click({ timeout: 15000 })
    await page.getByRole("combobox").filter({ hasText: /Mensuel|Mois actuel/i }).first().click()
    await page.getByRole("option", { name: HORIZON_LABEL.moisActuel }).click()

    const table = page.locator("table").filter({ has: page.getByRole("columnheader", { name: "Poste" }) })
    const row = table.locator("tr", { hasText: "bénéfice net" }).first()
    await expect(row).toBeVisible({ timeout: 15000 })
    await expect(row).toContainText("6")
    await expect(row).toContainText("000")
    await expect(row).not.toContainText("18")
  })
})
