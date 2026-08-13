import { test, expect, Page } from "@playwright/test"
import { HORIZON_LABEL } from "@/lib/financial-statement-horizon-labels"

test.setTimeout(90_000)

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"

function buildPeriods(endMonth: number) {
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
  return [2, 1, 0].map((offset) => {
    const m = endMonth - offset
    return {
      fiscalYear: 2026,
      fiscalMonth: m,
      label: `${monthNames[m]} 2026`,
    }
  })
}

type CapexSeriesFixture = {
  periods: { fiscalYear: number; fiscalMonth: number; label: string }[]
  alt: Record<string, number>
  baiia: Record<string, number>
  tex: Record<string, number>
  rev?: Record<string, number>
}

async function setupCapexMocks(
  page: Page,
  structureOverride?: Record<string, unknown>[],
  seriesOverride?: CapexSeriesFixture,
) {
  let savedStructure: Record<string, unknown>[] = structureOverride ?? [
    {
      id: "alt-row",
      label: "Immobilisations corporelles",
      defineMapping: true,
      linkCode: "ALT-B",
      displayFormat: "currency",
      capexCostDisplayMode: "actual",
    },
  ]

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
    const statementType = url.pathname.split("/").slice(-2)[0]
    const monthParam = url.searchParams.get("month")
    const endMonth = monthParam ? parseInt(monthParam, 10) : 7
    const periods = seriesOverride?.periods ?? buildPeriods(endMonth)
    const amountsKey = (m: number) => `2026-${m}`
    const revAmounts = seriesOverride?.rev ?? {
      [amountsKey(endMonth - 2)]: 20000,
      [amountsKey(endMonth - 1)]: 21000,
      [amountsKey(endMonth)]: 22000,
    }
    const baiiaAmounts = seriesOverride?.baiia ?? {
      [amountsKey(endMonth - 2)]: 10000,
      [amountsKey(endMonth - 1)]: 10000,
      [amountsKey(endMonth)]: 10000,
    }
    const texAmounts = seriesOverride?.tex ?? {
      [amountsKey(endMonth - 2)]: 5000,
      [amountsKey(endMonth - 1)]: 5000,
      [amountsKey(endMonth)]: 5000,
    }
    const altAmounts = seriesOverride?.alt ?? {
      [amountsKey(endMonth - 2)]: 100000,
      [amountsKey(endMonth - 1)]: 150000,
      [amountsKey(endMonth)]: 120000,
    }

    if (statementType === "income-statement") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType,
          fiscalYear: 2026,
          periods,
          rows: [
            {
              id: "rev",
              linkCode: "REV",
              label: "Revenus",
              amounts: revAmounts,
              isBold: false,
              isSection: false,
              isResult: false,
              detailRows: [],
            },
            {
              id: "baiia",
              label: "BAIIA",
              amounts: baiiaAmounts,
              isBold: true,
              isSection: false,
              isResult: true,
              detailRows: [],
            },
          ],
        }),
      })
    }

    if (statementType === "cash-flow-detail") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType,
          fiscalYear: 2026,
          periods,
          rows: [
            {
              id: "TEX-A",
              linkCode: "TEX-A",
              label: "Flux de trésorerie - Exploitation",
              amounts: texAmounts,
              isBold: false,
              isSection: false,
              isResult: false,
              detailRows: [],
            },
          ],
        }),
      })
    }

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
            id: "alt-b",
            linkCode: "ALT-B",
            label: "Immobilisations corporelles",
            amounts: altAmounts,
            isBold: false,
            isSection: false,
            isResult: false,
            detailRows: [],
          },
        ],
      }),
    })
  })
  await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/capex**`, (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: null,
          company_id: COMPANY_ID,
          statement_type: "capex",
          structure: savedStructure,
        }),
      })
    }
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { structure?: Record<string, unknown>[] }
      if (Array.isArray(body.structure)) {
        savedStructure = body.structure
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "struct-1",
          company_id: COMPANY_ID,
          statement_type: "capex",
          structure: savedStructure,
        }),
      })
    }
    return route.continue()
  })
  await page.route(
    `**/api/companies/${COMPANY_ID}/statement-structures/cash-flow-detail**`,
    (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: null,
            company_id: COMPANY_ID,
            statement_type: "cash-flow-detail",
            structure: [
              {
                label: "Trésorerie - Exploitation",
                isBold: true,
                isSection: true,
              },
              {
                label: "Flux de trésorerie - Exploitation",
                linkCode: "TEX-A",
                showInSummary: true,
                defineMapping: true,
              },
            ],
          }),
        })
      }
      return route.continue()
    },
  )
  await page.route("**/api/standard-link-codes/flat**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "1",
          code: "ALT-B",
          family: "ALT",
          parent_code: null,
          label_account: "Immobilisations corporelles",
          label_sub_account: null,
          is_leaf: true,
          sort_order: 1,
        },
        {
          id: "2",
          code: "CMV",
          family: "CMV",
          parent_code: null,
          label_account: "Coût des marchandises vendues",
          label_sub_account: null,
          is_leaf: false,
          sort_order: 2,
        },
        {
          id: "3",
          code: "CMV.1",
          family: "CMV",
          parent_code: "CMV",
          label_account: "Coût des marchandises vendues",
          label_sub_account: "Achats",
          is_leaf: true,
          sort_order: 3,
        },
      ]),
    }),
  )
}

test.describe("Capex cost display mode", () => {
  test("switches between Réel and Variation in Paramètres", async ({ page }) => {
    await setupCapexMocks(page)
    await page.goto(
      `/analysis/capex?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
    )
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("row", { name: /Immobilisations corporelles/i })).toContainText(
      "120",
    )

    await page.getByRole("button", { name: "Paramètres" }).click()
    await expect(page.getByLabel("Affichage du coût ALT")).toBeVisible()
    await page.getByLabel("Affichage du coût ALT").click()
    await page.getByRole("option", { name: "Variation (N − N−1)" }).click()
    await page.getByRole("button", { name: /^Enregistrer$/ }).click()

    await expect(page.getByRole("row", { name: /Immobilisations corporelles/i })).toContainText(
      "-30",
    )
  })

  test("Paramètres : le picker de liaison propose les codes Compte de résultat (CMV.1)", async ({
    page,
  }) => {
    await setupCapexMocks(page)
    await page.goto(
      `/analysis/capex?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
    )
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Paramètres" }).click()
    await expect(page.getByLabel("Affichage du coût ALT")).toBeVisible()

    await page.getByRole("button", { name: "ALT-B", exact: true }).click()
    await page.getByRole("combobox").filter({ hasText: /ALT-B/ }).click()
    await expect(page.getByRole("option", { name: /CMV\.1 — Achats/ })).toBeVisible()
  })

  test("Sommaire Annuel 5 ans : table-fixed, thead = tbody (pas d’espace vide)", async ({
    page,
  }) => {
    await setupCapexMocks(page)
    await page.goto(
      `/analysis/capex?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
    )
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })

    await page.getByText("Horizon", { exact: true }).locator("..").getByRole("combobox").click()
    await page.getByRole("option", { name: HORIZON_LABEL.annuel5Ans }).click()

    const table = page.locator("[data-testid='capex-summary-table-scroll'] table")
    await expect(table).toHaveClass(/table-fixed/)
    const headerCount = await table.locator("thead tr").first().locator("th").count()
    const firstDataRow = table
      .locator("tbody tr")
      .filter({ hasText: /Immobilisations corporelles/i })
      .first()
    await expect(firstDataRow).toBeVisible()
    expect(await firstDataRow.locator("td").count()).toBe(headerCount)
    expect(headerCount).toBeGreaterThanOrEqual(3)
  })

  test("Sommaire Mensuel et 24 mois : colonnes min-w-max (lisibles, scroll horizontal)", async ({
    page,
  }) => {
    await setupCapexMocks(page)
    await page.goto(
      `/analysis/capex?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
    )
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })

    const table = page.locator("[data-testid='capex-summary-table-scroll'] table")
    const horizon = page.getByText("Horizon", { exact: true }).locator("..").getByRole("combobox")

    await horizon.click()
    await page.getByRole("option", { name: HORIZON_LABEL.mensuel }).click()
    await expect(table).toHaveClass(/min-w-max/)
    await expect(table).not.toHaveClass(/table-fixed/)

    await horizon.click()
    await page.getByRole("option", { name: "24 mois" }).click()
    await expect(table).toHaveClass(/min-w-max/)
    await expect(table).not.toHaveClass(/table-fixed/)
  })

  test("Sommaire calcule Capex / BAIIA et Capex / Exploitation automatiquement", async ({
    page,
  }) => {
    await setupCapexMocks(page, [
      {
        label: "Capex",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "ALT-B",
        displayFormat: "currency",
        capexCostDisplayMode: "variation",
      },
      { label: "BAIIA", displayFormat: "currency" },
      { label: "Flux de trésorerie - Exploitation", displayFormat: "currency" },
      { label: "Capex / BAIIA", displayFormat: "percent" },
      { label: "Capex / Flux de trésorerie - Exploitation", displayFormat: "percent" },
    ])
    await page.goto(
      `/analysis/capex?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`,
    )
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })

    // Variation ALT = 120k − 150k = −30k ; BAIIA TTM = 30k ; TEX TTM = 15k
    await expect(page.getByRole("row", { name: /^BAIIA\b/ })).toContainText(/30\s?000/)
    await expect(
      page.getByRole("row", { name: /^Flux de trésorerie - Exploitation/i }),
    ).toContainText(/15\s?000/)
    await expect(page.getByRole("row", { name: /^Capex \/ BAIIA/ })).toContainText("-100.0%")
    await expect(
      page.getByRole("row", { name: /Capex \/ Flux de trésorerie - Exploitation/i }),
    ).toContainText("-200.0%")

    await page.getByRole("button", { name: "Paramètres" }).click()
    await expect(page.getByText("REV − CV − CF").first()).toBeVisible()
    await expect(page.getByText("Capex / (REV − CV − CF)").first()).toBeVisible()
    await expect(page.getByText("Capex / Exploitation").first()).toBeVisible()
  })

  test("Mois actuel : Capex / BAIIA = Capex affiché / BAIIA, sans le stock ALT", async ({
    page,
  }) => {
    await setupCapexMocks(
      page,
      [
        {
          label: "Immobilisations corporelles",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "ALT-B",
          displayFormat: "currency",
          capexCostDisplayMode: "actual",
        },
        {
          label: "Biens loués - Location acquisition",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "ALT-B",
          displayFormat: "currency",
          capexCostDisplayMode: "variation",
        },
        { label: "BAIIA", displayFormat: "currency" },
        { label: "Capex / BAIIA", displayFormat: "percent" },
      ],
      {
        periods: buildPeriods(7),
        alt: { "2026-5": 4_660_000, "2026-6": 4_660_000, "2026-7": 4_660_000 },
        baiia: { "2026-5": 1_306_812, "2026-6": 1_306_812, "2026-7": 1_306_813 },
        rev: { "2026-5": 1_306_812, "2026-6": 1_306_812, "2026-7": 1_306_813 },
        tex: { "2026-5": 1_000, "2026-6": 1_000, "2026-7": 1_000 },
      },
    )
    await page.goto(`/analysis/capex?companyId=${COMPANY_ID}&refMonth=7&refYear=2026`)
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })

    await expect(page.getByRole("row", { name: /Biens loués/ })).toContainText("0")
    await expect(page.getByRole("row", { name: /^Capex \/ BAIIA/ })).toContainText("0.0%")
    await expect(page.getByRole("row", { name: /^Capex \/ BAIIA/ })).not.toContainText("119")
  })

  test("Annuel 5 ans : Capex / BAIIA suit le même principe que Capex / Revenus", async ({
    page,
  }) => {
    const yearPeriods = [
      { fiscalYear: 2024, fiscalMonth: 12, label: "Décembre 2024" },
      { fiscalYear: 2025, fiscalMonth: 12, label: "Décembre 2025" },
      { fiscalYear: 2026, fiscalMonth: 8, label: "Août 2026" },
    ]
    await setupCapexMocks(
      page,
      [
        {
          label: "Immobilisations corporelles",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "ALT-B",
          displayFormat: "currency",
          capexCostDisplayMode: "actual",
        },
        {
          label: "Biens loués - Location acquisition",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "ALT-B",
          displayFormat: "currency",
          capexCostDisplayMode: "variation",
        },
        {
          label: "Capex / Revenus",
          defineMapping: true,
          liaisonMode: "quotient",
          liaisonNumeratorCodes: ["ALT-B"],
          liaisonDenominatorCodes: ["REV"],
          displayFormat: "percent",
          capexCostDisplayMode: "variation",
        },
        { label: "BAIIA", displayFormat: "currency" },
        { label: "Capex / BAIIA", displayFormat: "percent" },
        {
          label: "Capex / Flux de trésorerie - Exploitation",
          displayFormat: "percent",
        },
      ],
      {
        periods: yearPeriods,
        alt: { "2024-12": 1_000_000, "2025-12": 1_260_000, "2026-8": 1_200_000 },
        // REV = BAIIA pour que Capex / Revenus == Capex / BAIIA (même TTM, même numérateur YoY).
        rev: { "2024-12": 100_000, "2025-12": 100_000, "2026-8": 100_000 },
        baiia: { "2024-12": 100_000, "2025-12": 100_000, "2026-8": 100_000 },
        tex: { "2024-12": 50_000, "2025-12": 50_000, "2026-8": 50_000 },
      },
    )
    await page.goto(`/analysis/capex?companyId=${COMPANY_ID}&refMonth=8&refYear=2026`)
    await page.getByRole("button", { name: "Sommaire" }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })

    await page.getByText("Horizon", { exact: true }).locator("..").getByRole("combobox").click()
    await page.getByRole("option", { name: HORIZON_LABEL.annuel5Ans }).click()

    // Variation annuelle ALT : 0 ; 260k ; −60k. TTM sparse : 100k / 200k / 300k → 130% et −20%.
    const revenusRatio = page.getByRole("row", { name: /^Capex \/ Revenus/ })
    const baiiaRatio = page.getByRole("row", { name: /^Capex \/ BAIIA/ })
    await expect(revenusRatio).toContainText("130.0%")
    await expect(revenusRatio).toContainText("-20.0%")
    await expect(baiiaRatio).toContainText("130.0%")
    await expect(baiiaRatio).toContainText("-20.0%")
    // Moyenne = moyenne des 3 années visibles (0 + 130 − 20) / 3, pas / 6 années vides.
    await expect(baiiaRatio.locator("td").nth(1)).toHaveText("36.7%")
  })
})
