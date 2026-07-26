import { test, expect, Page } from "@playwright/test"

test.setTimeout(90_000)

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
  await page.route(`**/api/companies/${COMPANY_ID}/budgets**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ budgets: [] }),
    }),
  )
  await page.route("**/api/companies/*/financial-statements/**/series**", (route) => {
    const url = new URL(route.request().url())
    const monthParam = url.searchParams.get("month")
    const endMonth = monthParam ? parseInt(monthParam, 10) : 12
    const monthNames = [
      "",
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ]
    const periods = [2, 1, 0].map((offset) => {
      const m = endMonth - offset
      return {
        fiscalYear: 2026,
        fiscalMonth: m,
        label: `${monthNames[m]} 2026`,
      }
    })
    const amountsKey = (m: number) => `2026-${m}`
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companyId: COMPANY_ID,
        statementType: "balance-sheet",
        fiscalYear: 2026,
        periods,
        rows: [
          {
            id: "ca",
            linkCode: "ACT",
            label: "Total actifs courants",
            amounts: {
              [amountsKey(endMonth - 2)]: 90000,
              [amountsKey(endMonth - 1)]: 95000,
              [amountsKey(endMonth)]: 100000,
            },
            isBold: true,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "cl",
            linkCode: "PCT",
            label: "Total passifs courants",
            amounts: {
              [amountsKey(endMonth - 2)]: 35000,
              [amountsKey(endMonth - 1)]: 38000,
              [amountsKey(endMonth)]: 40000,
            },
            isBold: true,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
          {
            id: "rev",
            linkCode: "REV",
            label: "Revenus",
            amounts: {
              [amountsKey(endMonth - 2)]: 20000,
              [amountsKey(endMonth - 1)]: 21000,
              [amountsKey(endMonth)]: 22000,
            },
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
        ],
      }),
    })
  })
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/working-capital**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "working-capital",
          structure: [
            {
              label: "FDR",
              defineMapping: true,
              liaisonMode: "difference",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["REV"],
              isBold: true,
            },
            { label: "", id: "spacer-1", separatorAbove: true },
            {
              label: "Sans liaison",
              defineMapping: true,
              liaisonMode: "na",
            },
            {
              label: "Délai clients",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 365,
              displayFormat: "days",
              separatorAbove: true,
            },
          ],
        }),
      })
    }
    if (route.request().method() === "PUT") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: route.request().postData() ?? "{}",
      })
    }
    return route.continue()
  })
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "1",
          code: "ACT",
          family: "ACT",
          parent_code: null,
          label_account: "Actifs",
          label_sub_account: null,
          is_leaf: false,
          sort_order: 1,
          is_active: true,
          attached_link_codes: [],
        },
        {
          id: "2",
          code: "REV",
          family: "REV",
          parent_code: null,
          label_account: "Revenus",
          label_sub_account: null,
          is_leaf: false,
          sort_order: 2,
          is_active: true,
          attached_link_codes: [],
        },
      ]),
    }),
  )
}

test.describe("Working capital IS-style chrome", () => {
  test("hero, frosted toolbar and section toggles match income-statement pattern", async ({
    page,
  }) => {
    await setupAuth(page)

    const seriesMonths: string[] = []
    page.on("request", (req) => {
      if (!req.url().includes("/financial-statements/") || !req.url().includes("/series")) return
      const month = new URL(req.url()).searchParams.get("month")
      if (month != null) seriesMonths.push(month)
    })

    // Date de référence = juillet 2026 → la série doit borner à ce mois (pas décembre).
    await page.goto(
      `/analysis/working-capital?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
    )

    await expect(
      page.locator("h2").filter({ hasText: /Analyse du fonds de roulement/i }),
    ).toBeVisible({ timeout: 15000 })

    await expect.poll(() => seriesMonths.some((m) => m === "7")).toBeTruthy()
    expect(seriesMonths.every((m) => m === "7")).toBeTruthy()

    await expect(page.getByRole("button", { name: /^Tableau de bord$/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Sommaire$/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /^Détail$/ })).toHaveCount(0)
    await expect(page.getByText("Entités", { exact: true })).toBeVisible()
    await expect(page.getByText("Horizon", { exact: true })).toBeVisible()
    await expect(page.getByText("Type", { exact: true })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /^Fonds de roulement$/ })).toHaveCount(0)
    await expect(page.getByRole("button", { name: /Conversion de l'encaisse/i })).toHaveCount(0)

    await page.getByRole("button", { name: /^Sommaire$/ }).click()
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Métrique", { exact: true })).toBeVisible()
    await expect(page.getByTestId("wc-summary-table-scroll")).toBeVisible()
    const metricHeader = page.locator("thead th").filter({ hasText: /^Métrique$/ })
    await expect(metricHeader).toHaveClass(/min-w-\[18rem\]|min-w-\[20rem\]/)
    await expect(page.locator("tbody")).toHaveClass(/border-slate-200/)

    await page.getByRole("button", { name: /^Paramètres$/ }).click()
    await expect(page.getByText(/Édition structure/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole("columnheader", { name: /^Liaison$/ })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: /^Format$/ })).toBeVisible()

    // FDR (difference) publishes its label as a selectable formula result.
    await expect(page.getByRole("button", { name: /N1 − D1/ })).toBeVisible()
    await expect(page.getByRole("button", { name: /N1 ÷ D1 ×365/ })).toBeVisible()

    // Format column: switch first row to Jours
    await page.getByLabel("Format d'affichage").first().click()
    await expect(page.getByRole("option", { name: /^Jours$/ })).toBeVisible()
    await page.getByRole("option", { name: /^Jours$/ }).click()
    await expect(page.getByLabel("Format d'affichage").first()).toContainText("Jours")

    await page.getByRole("button", { name: /N1 ÷ D1 ×365/ }).click()
    await expect(page.getByText(/Facteur \(ex\. 365/)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole("button", { name: /^×365$/ })).toBeVisible()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: /N1 − D1/ }).click()
    await expect(page.getByText("Type de liaison")).toBeVisible({ timeout: 5000 })
    await page.getByRole("combobox").filter({ hasText: /Soustraction|Code unique|Division/ }).click()
    await expect(page.getByRole("option", { name: /Multiplication/ })).toBeVisible()
    await expect(page.getByRole("option", { name: /Division/ })).toBeVisible()
    await page.keyboard.press("Escape")
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: /^Annuler$/ }).click()
    await expect(page.getByRole("button", { name: /^Paramètres$/ })).toBeVisible({ timeout: 10000 })

    // Hors Paramètres: espace vide, séparateurs, gras, format jours.
    // Vue Courant (défaut Sommaire) : date de référence puis période précédente.
    await expect(page.getByText("FDR", { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId("wc-structure-spacer")).toBeVisible()
    await expect(page.getByTestId("wc-spacer-average-cell")).toHaveClass(/from-slate-50/)
    await expect(page.getByTestId("wc-structure-separator")).toHaveCount(2)
    const fdrRow = page.locator("tbody tr").filter({ has: page.getByText("FDR", { exact: true }) })
    await expect(fdrRow.locator("td").first()).toHaveClass(/font-bold/)
    const daysCell = page
      .locator("tbody tr")
      .filter({ has: page.getByText("Délai clients", { exact: true }) })
      .locator("td")
      .nth(1)
    await expect(daysCell).toContainText(/jours/)

    const noLinkRow = page
      .locator("tbody tr")
      .filter({ has: page.getByText("Sans liaison", { exact: true }) })
    await expect(noLinkRow.locator("td").nth(1)).toHaveText(/^$/)
    await expect(noLinkRow.locator("td").nth(2)).toHaveText(/^$/)

    // Ouvrir/fermer : codes inclus dans la liaison FDR (ACT − REV).
    const fdrParent = page.locator("tbody tr").filter({ has: page.getByText("FDR", { exact: true }) }).first()
    await fdrParent.click()
    await expect(page.getByTestId("wc-operand-ACT")).toBeVisible()
    await expect(page.getByTestId("wc-operand-REV")).toBeVisible()
    await expect(page.getByTestId("wc-operand-ACT")).toContainText("ACT")
    await expect(page.getByTestId("wc-operand-REV")).toContainText("REV")
    await fdrParent.click()
    await expect(page.getByTestId("wc-operand-ACT")).toHaveCount(0)

    const headers = page.locator("thead th")
    await expect(headers.nth(2)).toHaveText("Juillet 2026")
    await expect(headers.nth(3)).toHaveText("Juin 2026")
    await expect(page.getByText("Décembre 2026")).toHaveCount(0)

    // Horizon mensuel (12 mois) : référence puis décroissant sur toutes les périodes.
    await page.getByText("Horizon", { exact: true }).locator("..").getByRole("combobox").click()
    await page.getByRole("option", { name: /Mensuel|12 mois/i }).click()
    await expect(headers.nth(2)).toHaveText("Juillet 2026")
    await expect(headers.nth(3)).toHaveText("Juin 2026")
    await expect(headers.nth(4)).toHaveText("Mai 2026")
    await expect(page.getByText("Décembre 2026")).toHaveCount(0)
  })
})
