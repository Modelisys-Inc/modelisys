import { test, expect, Page } from "@playwright/test"

/**
 * Rendu visuel de la page Diagnostic avec des données riches et réalistes.
 *
 * Le test vérifie simplement que le rapport complet se rend (aucune exigence de
 * capture en CI). Pour produire une capture pleine page lors d'une revue
 * visuelle locale, définir DIAGNOSTIC_SHOT_PATH :
 *   DIAGNOSTIC_SHOT_PATH=/chemin/diagnostic.png pnpm exec playwright test e2e/diagnostic-visual.spec.ts
 */

const COMPANY_ID = "22222222-2222-2222-2222-222222222222"
const URL = `/modules/diagnostic?companyId=${COMPANY_ID}`

async function setupMocks(page: Page) {
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
  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "o1", name: "Test Org", slug: "test-org", role: "admin" }]),
    }),
  )
  await page.route("**/api/companies", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companies: [
          {
            id: COMPANY_ID,
            name: "Groupe Industriel Laurentien inc.",
            fiscal_year_end: "12-31",
            currency: "CAD",
            divisions: [],
            created_at: "2018-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    }),
  )

  // Saisonnalité marquée : pointe estivale (mai–août), creux hivernal.
  const monthLabels = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
    "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
  ]
  const shareByMonth = [4.2, 4.6, 6.5, 8.4, 11.8, 13.5, 13.9, 12.6, 9.2, 6.8, 4.9, 3.6]

  const payload = {
    company_id: COMPANY_ID,
    company_name: "Groupe Industriel Laurentien inc.",
    currency: "CAD",
    fiscal_year_end: "12-31",
    latest_fiscal_year: 2025,
    reference_period: {
      calendar_year: 2025,
      calendar_month: 12,
      fiscal_year: 2025,
      fiscal_month: 12,
    },
    summary: {
      latest_fiscal_year: 2025,
      lifecycle_stage: "croissance",
      revenue_cagr_5y: 11.2,
      latest_revenue: 18_450_000,
      latest_ebitda: 2_950_000,
      latest_net_income: 1_420_000,
      latest_gross_margin_pct: 37.4,
      latest_ebitda_margin_pct: 16.0,
      latest_net_margin_pct: 7.7,
      current_ratio: 1.92,
      quick_ratio: 1.15,
      debt_to_equity: 0.84,
      capex_latest: 940_000,
      capex_revenue_pct: 5.1,
      indicative_enterprise_value_mid: 14_750_000,
    },
    trends: [2021, 2022, 2023, 2024, 2025].map((year, i) => ({
      fiscal_year: year,
      revenue: 12_050_000 + i * 1_600_000,
      gross_profit: 4_300_000 + i * 640_000,
      gross_margin_pct: 35.7 + i * 0.42,
      ebitda: 1_700_000 + i * 312_000,
      ebitda_margin_pct: 14.1 + i * 0.48,
      net_income: 760_000 + i * 165_000,
      net_margin_pct: 6.3 + i * 0.35,
      current_assets: 4_450_000 + i * 380_000,
      current_liabilities: 2_600_000 + i * 130_000,
      inventory: 1_350_000 + i * 85_000,
      total_assets: 11_600_000 + i * 900_000,
      total_liabilities: 6_400_000 + i * 310_000,
      equity: 5_200_000 + i * 590_000,
      depreciation: 720_000 + i * 38_000,
      capex: 610_000 + i * 82_500,
      current_ratio: 1.71 + i * 0.052,
      quick_ratio: 0.98 + i * 0.042,
      debt_to_equity: 1.23 - i * 0.097,
      asset_turnover: 1.04 + i * 0.028,
      interest_coverage: 6.1 + i * 1.35,
    })),
    seasonality: monthLabels.map((label, i) => ({
      month_number: i + 1,
      month_label: label,
      average_revenue: Math.round(18_450_000 * (shareByMonth[i] / 100)),
      average_ebitda: Math.round(18_450_000 * (shareByMonth[i] / 100) * (0.1 + shareByMonth[i] / 100)),
      revenue_share_pct: shareByMonth[i],
      ebitda_margin_pct: 10 + shareByMonth[i] * 0.6,
    })),
    divisions: [
      {
        division_id: "d1",
        division_name: "Fabrication",
        revenue: 9_800_000,
        gross_profit: 3_950_000,
        gross_margin_pct: 40.3,
        ebitda: 1_960_000,
        ebitda_margin_pct: 20.0,
        net_income: 1_120_000,
        revenue_share_pct: 53.1,
        revenue_cagr_5y: 13.8,
        profitable: true,
      },
      {
        division_id: "d2",
        division_name: "Distribution",
        revenue: 6_200_000,
        gross_profit: 2_170_000,
        gross_margin_pct: 35.0,
        ebitda: 1_150_000,
        ebitda_margin_pct: 18.5,
        net_income: 610_000,
        revenue_share_pct: 33.6,
        revenue_cagr_5y: 9.4,
        profitable: true,
      },
      {
        division_id: "d3",
        division_name: "Services techniques",
        revenue: 2_450_000,
        gross_profit: 780_000,
        gross_margin_pct: 31.8,
        ebitda: -160_000,
        ebitda_margin_pct: -6.5,
        net_income: -310_000,
        revenue_share_pct: 13.3,
        revenue_cagr_5y: -2.1,
        profitable: false,
      },
    ],
    products: [
      {
        product_name: "Charpentes métalliques",
        revenue: 7_400_000,
        gross_profit: 3_030_000,
        gross_margin_pct: 40.9,
        ebitda: 1_540_000,
        ebitda_margin_pct: 20.8,
        revenue_share_pct: 40.1,
      },
      {
        product_name: "Composants usinés",
        revenue: 4_900_000,
        gross_profit: 1_810_000,
        gross_margin_pct: 36.9,
        ebitda: 890_000,
        ebitda_margin_pct: 18.2,
        revenue_share_pct: 26.6,
      },
      {
        product_name: "Distribution de pièces",
        revenue: 4_150_000,
        gross_profit: 1_340_000,
        gross_margin_pct: 32.3,
        ebitda: 620_000,
        ebitda_margin_pct: 14.9,
        revenue_share_pct: 22.5,
      },
      {
        product_name: "Entretien et réparation",
        revenue: 2_000_000,
        gross_profit: 720_000,
        gross_margin_pct: 36.0,
        ebitda: -100_000,
        ebitda_margin_pct: -5.0,
        revenue_share_pct: 10.8,
      },
    ],
    division_products: [
      {
        division_id: "d1",
        division_name: "Fabrication",
        product_name: "Charpentes métalliques",
        revenue: 7_400_000,
        gross_profit: 3_030_000,
        gross_margin_pct: 40.9,
        ebitda: 1_540_000,
        ebitda_margin_pct: 20.8,
      },
      {
        division_id: "d1",
        division_name: "Fabrication",
        product_name: "Composants usinés",
        revenue: 2_400_000,
        gross_profit: 920_000,
        gross_margin_pct: 38.3,
        ebitda: 420_000,
        ebitda_margin_pct: 17.5,
      },
      {
        division_id: "d2",
        division_name: "Distribution",
        product_name: "Distribution de pièces",
        revenue: 4_150_000,
        gross_profit: 1_340_000,
        gross_margin_pct: 32.3,
        ebitda: 620_000,
        ebitda_margin_pct: 14.9,
      },
      {
        division_id: "d3",
        division_name: "Services techniques",
        product_name: "Entretien et réparation",
        revenue: 2_000_000,
        gross_profit: 720_000,
        gross_margin_pct: 36.0,
        ebitda: -100_000,
        ebitda_margin_pct: -5.0,
      },
    ],
    valuation: {
      normalized_ebitda: 2_780_000,
      multiple_low: 4.5,
      multiple_high: 6.0,
      enterprise_value_low: 12_510_000,
      enterprise_value_high: 16_680_000,
      enterprise_value_mid: 14_750_000,
      book_equity: 7_560_000,
      rationale: [
        "EBITDA normalisé : moyenne pondérée des exercices 2023–2025, ajustée de la rémunération de la direction.",
        "Multiple sectoriel pour la fabrication métallique et la distribution industrielle (4,5×–6,0×).",
        "Prime de croissance appliquée compte tenu du TCAC de 11,2 % sur 5 ans.",
      ],
    },
    notes: [
      "Valorisation indicative seulement — ne constitue pas une évaluation formelle au sens des normes d'évaluation d'entreprise.",
    ],
    generated_at: "2026-07-26T12:00:00Z",
  }

  await page.route(`**/api/companies/${COMPANY_ID}/diagnostic`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  )

  await page.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs*`, (route) => {
    if (route.request().method() === "GET") {
      const url = new URL(route.request().url())
      const statementType = url.searchParams.get("statement_type") ?? "income-statement"
      const isRevenue = statementType === "diagnostic-revenue"
      const isExpenses = statementType === "diagnostic-expenses"
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          slots: [
            {
              chart_instance_id: "default",
              slot_index: 0,
              version: 1,
              config: isRevenue
                ? {
                    version: 2,
                    chartTitle: "Revenus",
                    series: [
                      {
                        id: "r",
                        kind: "bar",
                        label: "Revenus",
                        spec: { type: "single", code: "REV-001" },
                        yAxis: "left",
                        valueFormat: "currency",
                        showOnChart: true,
                        showInSidePanel: true,
                        color: "#3b82f6",
                      },
                    ],
                  }
                : isExpenses
                  ? {
                      version: 2,
                      chartTitle: "Dépenses",
                      series: [
                        {
                          id: "x",
                          kind: "bar",
                          label: "Dépenses",
                          spec: { type: "single", code: "EXP-001" },
                          yAxis: "left",
                          valueFormat: "currency",
                          showOnChart: true,
                          showInSidePanel: true,
                          color: "#ef4444",
                        },
                      ],
                    }
                : {
                    version: 2,
                    chartTitle: "Performance financière",
                    series: [
                      {
                        id: "r",
                        kind: "bar",
                        label: "Revenus",
                        spec: { type: "single", code: "REV-001" },
                        yAxis: "left",
                        valueFormat: "currency",
                        showOnChart: true,
                        showInSidePanel: true,
                        color: "#3b82f6",
                      },
                      {
                        id: "e",
                        kind: "bar",
                        label: "BAIIA",
                        spec: { type: "single", code: "EBIT-001" },
                        yAxis: "left",
                        valueFormat: "currency",
                        showOnChart: true,
                        showInSidePanel: true,
                        color: "#10b981",
                      },
                      {
                        id: "m",
                        kind: "line",
                        label: "Marge brute (%)",
                        spec: {
                          type: "derivedMargin",
                          revenueSeriesId: "r",
                          grossProfitFromSpec: { type: "single", code: "GP-001" },
                        },
                        yAxis: "right",
                        valueFormat: "ratio",
                        showOnChart: true,
                        showInSidePanel: true,
                        color: "#f59e0b",
                      },
                    ],
                  },
              updated_by_user_email: "u@e.com",
              updated_at: "2026-05-18T00:00:00Z",
            },
          ],
        }),
      })
    }
    return route.continue()
  })

  await page.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companyId: COMPANY_ID,
          statementType: "income-statement",
          fiscalYear: 2025,
          periods: [{ fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" }],
          rows: [
            {
              id: "REV-001",
              linkCode: "REV-001",
              label: "Revenus",
              isBold: false,
              isSection: false,
              isResult: false,
              amounts: { "2025-12": 18_450_000 },
              detailRows: [],
            },
          ],
        }),
      }),
  )
}

test.describe("Diagnostic — rendu visuel", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("le rapport complet se rend avec données riches", async ({ page }, testInfo) => {
    await setupMocks(page)
    await page.goto(URL)

    await expect(
      page.getByRole("heading", {
        name: /Diagnostic de Groupe Industriel Laurentien inc\. — 31 décembre/,
      }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Valorisation indicative" })).toBeVisible()

    // Trajectoire = carte Performance financière (Recharts).
    await expect(page.getByRole("heading", { name: "Performance financière" })).toBeVisible()
    await expect
      .poll(async () => page.locator("#diag-rapport .recharts-bar-rectangle").count(), {
        timeout: 15000,
      })
      .toBeGreaterThanOrEqual(1)
    await expect(page.locator("#diag-divisions svg circle")).toHaveCount(3)
    await expect
      .poll(async () => page.locator("#diag-profil svg polygon").count())
      .toBeGreaterThanOrEqual(2)
    // Laisser finir les animations de compteurs et de croissance des barres.
    await page.waitForTimeout(2000)

    const shotPath =
      process.env.DIAGNOSTIC_SHOT_PATH || testInfo.outputPath("diagnostic-full.png")
    await page.screenshot({ path: shotPath, fullPage: true })
  })
})
