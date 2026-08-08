import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const DIAGNOSTIC_ID = "diag1111-1111-1111-1111-111111111111"
const DIVISION_OK = "d1111111-1111-1111-1111-111111111111"
const DIVISION_KO = "d2222222-2222-2222-2222-222222222222"
const DIAGNOSTIC_REGISTRY_KEY = "modelisys-diagnostic-registry"
const PILOTAGE_ID = "pilot1111-1111-1111-1111-111111111111"
const PILOTAGE_REGISTRY_KEY = "modelisys-pilotage-registry"
const DIAGNOSTIC_PAGE_URL = `/modules/diagnostic/${DIAGNOSTIC_ID}?companyId=${COMPANY_ID}`
const DIAGNOSTIC_PORTAL_URL = `/modules/diagnostic?companyId=${COMPANY_ID}`
const PILOTAGE_REPORT_URL = `/modules/pilotage/report?pilotageId=${PILOTAGE_ID}&companyId=${COMPANY_ID}`

const INCOME_BRIDGE_MAPPINGS = [
  {
    id: "m1",
    account_number: "5010",
    description: "Matières",
    link_code: "CMV.1",
    summary_ef: null,
    detail_ef: null,
    divisions: null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: true,
    fixed_costs: false,
    variable_cost_revenue_link_code: "REV-001",
    liability_remaining_years: null,
    liability_interest_rate: null,
    product: null,
    customer: null,
    supplier: null,
    interco_company_id: null,
  },
  {
    id: "m2",
    account_number: "6010",
    description: "Salaires admin",
    link_code: "ADM.1",
    summary_ef: null,
    detail_ef: null,
    divisions: null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: false,
    fixed_costs: true,
    variable_cost_revenue_link_code: null,
    liability_remaining_years: null,
    liability_interest_rate: null,
    product: null,
    customer: null,
    supplier: null,
    interco_company_id: null,
  },
]

const INCOME_BRIDGE_REV_LINK_CODE = {
  code: "REV-001",
  family: "REV",
  parent_code: null,
  is_leaf: true,
  is_active: true,
  label_sub_account: "Revenus",
  label_account: "Revenus",
  ft_category: null,
  account_type: null,
  coa_version: 1,
  deprecated_at: null,
}

const INCOME_BRIDGE_SERIES_PAYLOAD = {
  companyId: COMPANY_ID,
  statementType: "income-statement",
  fiscalYear: 2025,
  periods: [
    { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
    { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
  ],
  rows: [
    {
      id: "REV-001",
      linkCode: "REV-001",
      label: "Revenus",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2024-12": 4_000_000, "2025-12": 5_200_000 },
      detailRows: [],
    },
    {
      id: "cmv",
      linkCode: "CMV",
      label: "CMV",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: {},
      detailRows: [
        {
          id: "5010",
          label: "Matières",
          amounts: { "2024-12": 1_500_000, "2025-12": 1_800_000 },
        },
      ],
    },
    {
      id: "adm",
      linkCode: "ADM",
      label: "Admin",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: {},
      detailRows: [
        {
          id: "6010",
          label: "Salaires admin",
          amounts: { "2024-12": 900_000, "2025-12": 1_000_000 },
        },
      ],
    },
  ],
}

async function mockIncomePerformanceBridgeRoutes(context: Page["context"]) {
  await context.route(`**/api/companies/${COMPANY_ID}/account-mappings`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mappings: INCOME_BRIDGE_MAPPINGS }),
    }),
  )
  await context.route("**/api/standard-link-codes/flat*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([INCOME_BRIDGE_REV_LINK_CODE]),
    }),
  )
}

async function setupAuthAndCommonMocks(page: Page, registry?: { key: string; record: Record<string, unknown> }) {
  const context = page.context()
  const registryConfig = registry ?? {
    key: DIAGNOSTIC_REGISTRY_KEY,
    record: {
      id: DIAGNOSTIC_ID,
      companyId: COMPANY_ID,
      companyName: "Aciers Beauport inc.",
      title: "Aciers Beauport inc. — test",
      referenceYear: 2025,
      referenceMonth: 12,
      createdAt: "2026-05-18T00:00:00.000Z",
      lastOpenedAt: "2026-05-18T00:00:00.000Z",
    },
  }
  // Injecter le cookie de session + jetons avant tout script de page.
  await page.addInitScript(
    ({ key, record }) => {
      localStorage.setItem("access_token", "fake-access-token")
      localStorage.setItem("refresh_token", "fake-refresh-token")
      localStorage.setItem(key, JSON.stringify([record]))
    },
    registryConfig,
  )
  await page.context().addCookies([
    {
      name: "has_session",
      value: "1",
      url: "http://localhost:3000",
    },
  ])

  await context.route("**/api/auth/me", (route) =>
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
        organizations: [
          { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
        ],
      }),
    }),
  )
  await context.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
      ]),
    }),
  )
  await context.route("**/api/companies", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        companies: [
          {
            id: COMPANY_ID,
            name: "Aciers Beauport inc.",
            fiscal_year_end: "12-31",
            currency: "CAD",
            divisions: [],
            created_at: "2020-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    }),
  )

  await mockIncomePerformanceBridgeRoutes(context)

  await context.route(`**/api/companies/${COMPANY_ID}/statement-chart-configs*`, (route) => {
    if (route.request().method() === "GET") {
      const url = new URL(route.request().url())
      const statementType = url.searchParams.get("statement_type") ?? "income-statement"
      const marginConfig = {
        version: 2,
        chartTitle: "Marge par Revenus",
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
      }
      const revenueConfig = {
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
      const expensesConfig = {
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
      const performanceConfig = {
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
            id: "m",
            kind: "line",
            label: "Contribution marginale (%)",
            spec: {
              type: "derivedContributiveMargin",
              revenueSeriesId: "r",
            },
            yAxis: "right",
            valueFormat: "ratio",
            showOnChart: true,
            showInSidePanel: true,
            color: "#f59e0b",
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
        ],
      }
      const balanceSheetConfig = {
        version: 2,
        chartTitle: "Bilan",
        series: [
          {
            id: "bs-a",
            kind: "bar",
            label: "Actifs",
            spec: { type: "single", code: "ACT-A" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#3b82f6",
          },
        ],
      }
      const financialPositionConfig = {
        version: 2,
        chartTitle: "Situation financière",
        series: [
          {
            id: "fp-act",
            kind: "bar",
            label: "Actif court terme",
            spec: { type: "single", code: "ACT" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#3b82f6",
            stackGroup: "fp-assets",
          },
          {
            id: "fp-alt",
            kind: "bar",
            label: "Actif long terme",
            spec: { type: "single", code: "ALT" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#10b981",
            stackGroup: "fp-assets",
          },
          {
            id: "fp-pct",
            kind: "bar",
            label: "Passif court terme",
            spec: { type: "single", code: "PCT" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#f59e0b",
            stackGroup: "fp-liabilities",
          },
          {
            id: "fp-plt",
            kind: "bar",
            label: "Passif long terme",
            spec: { type: "single", code: "PLT" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#8b5cf6",
            stackGroup: "fp-liabilities",
          },
          {
            id: "fp-cap",
            kind: "bar",
            label: "Capitaux propres",
            spec: { type: "single", code: "CAP" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#06b6d4",
            stackGroup: "fp-liabilities",
          },
        ],
      }
      const workingCapitalConfig = {
        version: 2,
        chartTitle: "Fonds de roulement",
        series: [
          {
            id: "wc-fdr",
            kind: "bar",
            label: "Fonds de roulement",
            spec: { type: "single", code: "" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#3b82f6",
            stackGroup: "wc-fdr",
          },
          {
            id: "wc-fdrhc",
            kind: "bar",
            label: "Fonds de roulement hors caisse",
            spec: { type: "single", code: "" },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
            color: "#10b981",
            stackGroup: "wc-fdr",
          },
          {
            id: "wc-dso",
            kind: "bar",
            label: "DSO",
            spec: { type: "single", code: "" },
            yAxis: "left",
            valueFormat: "ratio",
            showOnChart: true,
            showInSidePanel: true,
            color: "#f59e0b",
            stackGroup: "wc-cycle",
          },
          {
            id: "wc-dio",
            kind: "bar",
            label: "DIO",
            spec: { type: "single", code: "" },
            yAxis: "left",
            valueFormat: "ratio",
            showOnChart: true,
            showInSidePanel: true,
            color: "#8b5cf6",
            stackGroup: "wc-cycle",
          },
          {
            id: "wc-dpo",
            kind: "bar",
            label: "DPO",
            spec: { type: "single", code: "" },
            yAxis: "left",
            valueFormat: "ratio",
            showOnChart: true,
            showInSidePanel: true,
            color: "#06b6d4",
            stackGroup: "wc-cycle",
          },
          {
            id: "wc-ccc",
            kind: "line",
            label: "CCC",
            spec: { type: "single", code: "" },
            yAxis: "left",
            valueFormat: "ratio",
            showOnChart: true,
            showInSidePanel: true,
            color: "#ec4899",
            stackGroup: "wc-cycle",
          },
        ],
      }
      const config =
        statementType === "diagnostic-revenue"
          ? revenueConfig
          : statementType === "diagnostic-margin-by-revenue"
            ? marginConfig
            : statementType === "diagnostic-expenses"
              ? expensesConfig
              : statementType === "diagnostic-financial-position"
                ? financialPositionConfig
              : statementType === "diagnostic-working-capital"
                ? workingCapitalConfig
              : statementType === "balance-sheet"
                ? balanceSheetConfig
                : performanceConfig
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          slots: [
            {
              chart_instance_id: "default",
              slot_index: 0,
              version: 1,
              config,
              updated_by_user_email: "u@e.com",
              updated_at: "2026-05-18T00:00:00Z",
            },
          ],
        }),
      })
    }
    return route.continue()
  })

  await context.route(
    `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(INCOME_BRIDGE_SERIES_PAYLOAD),
      }),
  )
}

function buildDiagnosticPayload(overrides: Record<string, unknown> = {}) {
  return {
    company_id: COMPANY_ID,
    company_name: "Aciers Beauport inc.",
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
      revenue_cagr_5y: 12.4,
      latest_revenue: 5_200_000,
      latest_ebitda: 780_000,
      latest_net_income: 410_000,
      latest_gross_margin_pct: 38.2,
      latest_ebitda_margin_pct: 15.0,
      latest_net_margin_pct: 7.9,
      current_ratio: 1.85,
      quick_ratio: 1.1,
      debt_to_equity: 0.9,
      capex_latest: 220_000,
      capex_revenue_pct: 4.2,
      indicative_enterprise_value_mid: 3_900_000,
    },
    trends: [2021, 2022, 2023, 2024, 2025].map((year, i) => ({
      fiscal_year: year,
      revenue: 3_000_000 + i * 550_000,
      gross_profit: 1_100_000 + i * 220_000,
      gross_margin_pct: 36 + i * 0.5,
      ebitda: 420_000 + i * 90_000,
      ebitda_margin_pct: 13 + i * 0.5,
      net_income: 200_000 + i * 52_000,
      net_margin_pct: 6.5 + i * 0.35,
      current_assets: 1_200_000 + i * 100_000,
      current_liabilities: 700_000 + i * 40_000,
      inventory: 350_000 + i * 20_000,
      total_assets: 3_500_000 + i * 250_000,
      total_liabilities: 1_900_000 + i * 90_000,
      equity: 1_600_000 + i * 160_000,
      depreciation: 180_000 + i * 10_000,
      capex: 150_000 + i * 17_500,
      current_ratio: 1.6 + i * 0.06,
      quick_ratio: 0.9 + i * 0.05,
      debt_to_equity: 1.2 - i * 0.075,
      asset_turnover: 0.86 + i * 0.05,
      interest_coverage: 5.5 + i * 1.2,
    })),
    seasonality: [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Juin",
      "Juil",
      "Août",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ].map((label, i) => ({
      month_number: i + 1,
      month_label: label,
      average_revenue: 300_000 + (i % 4) * 60_000,
      average_ebitda: 45_000 + (i % 4) * 9_000,
      revenue_share_pct: 6 + (i % 4) * 1.2,
      ebitda_margin_pct: 14 + (i % 4) * 0.8,
    })),
    divisions: [
      {
        division_id: DIVISION_OK,
        division_name: "Division Est",
        revenue: 3_600_000,
        gross_profit: 1_450_000,
        gross_margin_pct: 40.3,
        ebitda: 620_000,
        ebitda_margin_pct: 17.2,
        net_income: 380_000,
        revenue_share_pct: 69.2,
        revenue_cagr_5y: 14.1,
        profitable: true,
      },
      {
        division_id: DIVISION_KO,
        division_name: "Division Ouest",
        revenue: 1_600_000,
        gross_profit: 420_000,
        gross_margin_pct: 26.3,
        ebitda: 160_000,
        ebitda_margin_pct: 10.0,
        net_income: -75_000,
        revenue_share_pct: 30.8,
        revenue_cagr_5y: 3.4,
        profitable: false,
      },
    ],
    products: [
      {
        product_name: "Acier structural",
        revenue: 3_100_000,
        gross_profit: 1_240_000,
        gross_margin_pct: 40.0,
        ebitda: 520_000,
        ebitda_margin_pct: 16.8,
        revenue_share_pct: 59.6,
      },
      {
        product_name: "Services d'installation",
        revenue: 2_100_000,
        gross_profit: 630_000,
        gross_margin_pct: 30.0,
        ebitda: 260_000,
        ebitda_margin_pct: 12.4,
        revenue_share_pct: 40.4,
      },
    ],
    division_products: [
      {
        division_id: DIVISION_OK,
        division_name: "Division Est",
        product_name: "Acier structural",
        revenue: 2_400_000,
        gross_profit: 980_000,
        gross_margin_pct: 40.8,
        ebitda: 420_000,
        ebitda_margin_pct: 17.5,
      },
    ],
    valuation: {
      normalized_ebitda: 750_000,
      multiple_low: 4.0,
      multiple_high: 6.0,
      enterprise_value_low: 3_000_000,
      enterprise_value_high: 4_500_000,
      enterprise_value_mid: 3_900_000,
      book_equity: 2_240_000,
      rationale: [
        "EBITDA normalisé sur la base des 3 derniers exercices.",
        "Multiple sectoriel pour la fabrication métallique (4×–6×).",
      ],
    },
    notes: [
      "Valorisation indicative seulement — ne constitue pas une évaluation formelle.",
    ],
    generated_at: "2026-07-26T12:00:00Z",
    ...overrides,
  }
}

async function mockDiagnostic(page: Page, payload: unknown, status = 200) {
  await mockIncomePerformanceBridgeRoutes(page.context())
  await page.context().route(`**/api/companies/${COMPANY_ID}/diagnostic**`, (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  )
}

test.describe("Page Diagnostic", () => {
  test("portail : liste et création de diagnostic", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PORTAL_URL)

    await expect(page.getByRole("heading", { name: "Diagnostic", exact: true })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText("Mes diagnostics")).toBeVisible()
    await expect(page.getByRole("button", { name: "Nouveau diagnostic" })).toBeVisible()
    await expect(page.getByText("Aciers Beauport inc. — test")).toBeVisible()
    await page.getByRole("button", { name: "Ouvrir le diagnostic" }).click()
    await expect(page).toHaveURL(new RegExp(`/modules/diagnostic/${DIAGNOSTIC_ID}\\?companyId=${COMPANY_ID}`))
    await expect(page.getByRole("heading", { name: /Diagnostic de Aciers Beauport inc\./ })).toBeVisible()
  })

  test("rend le héros, les KPI et toutes les sections", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await expect(
      page.getByRole("heading", { name: /Diagnostic de Aciers Beauport inc\. — 31 décembre 2025/ }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/Mise à jour : 26 juillet 2026/)).toBeVisible()

    // Performance financière affichée par défaut.
    await expect(page.getByText("Lecture de la performance")).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("diagnostic-executive-summary")).toHaveCount(0)
    await expect(page.getByTestId("diagnostic-view-report")).toBeVisible()
    await expect(page.getByTestId("diagnostic-view-report")).toHaveText(/Visualiser le Rapport/)

    const [reportPage] = await Promise.all([
      page.context().waitForEvent("page"),
      page.getByTestId("diagnostic-view-report").click(),
    ])
    await expect(reportPage).toHaveURL(
      new RegExp(
        `/modules/diagnostic/report\\?.*diagnosticId=${DIAGNOSTIC_ID}.*companyId=${COMPANY_ID}`,
      ),
    )
    await reportPage.waitForLoadState("domcontentloaded")
    await expect(reportPage.getByTestId("diagnostic-report-print-toolbar")).toBeVisible({
      timeout: 15000,
    })
    await expect(reportPage.getByText(/Mode.*Éditoire/)).not.toBeVisible()
    await expect(reportPage.getByTestId("diagnostic-report-print-button")).toHaveText(
      /Imprimer en PDF/,
    )
    await expect(reportPage.getByTestId("diagnostic-report-print")).toBeVisible({
      timeout: 15000,
    })
    await expect(reportPage.getByTestId("diagnostic-report-cover")).toBeVisible()
    await expect(reportPage.getByText("Indice de santé")).not.toBeVisible()
    await expect(reportPage.getByTestId("diagnostic-report-mandate-scope")).toBeVisible()
    await expect(reportPage.getByTestId("diagnostic-report-toc")).toBeVisible()
    await expect(reportPage.getByTestId("diagnostic-report-toc-link-company-overview")).toBeVisible()
    await reportPage.getByTestId("diagnostic-report-toc-link-company-overview").click()
    await expect(reportPage.locator("#report-company-overview-intro")).toBeVisible()
    await expect(reportPage.getByTestId("report-analysis-intro-company-overview")).toBeVisible()
    await expect(reportPage.getByTestId("diagnostic-report-section-report-company-overview-general")).toBeVisible()
    await expect(reportPage.getByTestId("diagnostic-report-toc-link-performance")).toBeVisible()
    await reportPage.getByTestId("diagnostic-report-toc-link-performance").click()
    await expect(reportPage.locator("#report-performance-intro")).toBeVisible()
    await expect(reportPage.getByTestId("report-analysis-intro-performance")).toBeVisible()
    await expect(reportPage.getByTestId("report-chart-page-performance")).toBeVisible()
    await reportPage.close()

    await page.getByRole("button", { name: "Performance financière", exact: true }).click()

    // Trajectoire = carte Performance financière (même config que le tableau de bord IS).
    await expect(page.getByRole("heading", { name: "Performance financière" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Annuel - 5 ans" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(page.getByRole("button", { name: "Mensuel" })).toHaveAttribute("aria-pressed", "false")
    await expect(page.getByRole("button", { name: "Paramètres" })).toHaveCount(0)
    await expect(page.getByText("Contribution marginale (%)", { exact: true })).toBeVisible()

    // Bandeau KPI (7 cartes cliquables avec sparkline).
    const kpis = page.getByTestId("kpi-cards")
    await expect(kpis.getByText("Chiffre d'affaires", { exact: true })).toBeVisible()
    await expect(kpis.getByText("EBITDA", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Bénéfice net", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Marge brute", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Dette / capitaux propres", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Ratio de liquidité", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Valeur d'entreprise", { exact: true })).toBeVisible()
  })

  test("vue Revenus : remplace la carte Performance financière", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Performance financière", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Performance financière" })).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole("button", { name: "Analyse des revenus", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Analyse des revenus", exact: true })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Performance financière" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Annuel - 5 ans" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Paramètres" })).toBeVisible()
    await expect(page.getByText("Lecture de la performance")).toBeVisible()
  })

  test("vue Marge par Revenus : remplace la carte du rapport", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Marge par revenus", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Marge par revenus", exact: true })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole("button", { name: "Annuel - 5 ans" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Paramètres" })).toBeVisible()
    await expect(page.getByTestId("contributive-margin-report")).toBeVisible()
    await expect(page.getByTestId("revenue-contributive-margin-table")).toBeVisible()
    await expect(page.getByText("Marges contributives par source de revenus")).toBeVisible()
    await expect(page.getByText("Lecture de la contribution marginale par revenus")).toBeVisible()
  })

  test("vue Dépenses : pont de rentabilité CV / CF", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [
            {
              id: "m1",
              account_number: "5010",
              description: "Matières",
              link_code: "CMV.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: true,
              fixed_costs: false,
              variable_cost_revenue_link_code: "REV-001",
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
            {
              id: "m2",
              account_number: "6010",
              description: "Salaires admin",
              link_code: "ADM.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: true,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
          ],
        }),
      }),
    )
    await page.route("**/api/standard-link-codes/flat*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            code: "REV-001",
            family: "REV",
            parent_code: null,
            is_leaf: true,
            is_active: true,
            label_sub_account: "Revenus",
            label_account: "Revenus",
            ft_category: null,
            account_type: null,
            coa_version: 1,
            deprecated_at: null,
          },
        ]),
      }),
    )
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
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "REV-001",
                linkCode: "REV-001",
                label: "Revenus",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: { "2024-12": 4_000_000, "2025-12": 5_200_000 },
                detailRows: [],
              },
              {
                id: "cmv",
                linkCode: "CMV",
                label: "CMV",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {},
                detailRows: [
                  {
                    id: "5010",
                    label: "Matières",
                    amounts: { "2024-12": 1_500_000, "2025-12": 1_800_000 },
                  },
                ],
              },
              {
                id: "adm",
                linkCode: "ADM",
                label: "Admin",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {},
                detailRows: [
                  {
                    id: "6010",
                    label: "Salaires admin",
                    amounts: { "2024-12": 900_000, "2025-12": 1_000_000 },
                  },
                ],
              },
            ],
          }),
        }),
    )
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Analyse de rentabilité", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Analyse de rentabilité", exact: true })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole("button", { name: "Annuel - 5 ans" })).toBeVisible()
    await expect(page.getByTestId("expense-contribution-bridge-report")).toBeVisible()
    await expect(page.getByTestId("expense-contribution-bridge-chart")).toBeVisible()
    const bridgeChart = page.getByTestId("expense-contribution-bridge-chart")
    const chartBox = await bridgeChart.locator(".recharts-responsive-container").first().boundingBox()
    expect(chartBox?.height ?? 0).toBeGreaterThan(100)
    await expect(page.getByText("Pont de rentabilité")).toBeVisible()
    await expect(page.getByText("Lecture des dépenses")).toBeVisible()
    await expect(page.getByText("Contribution marginale", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Coûts fixes", { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId("expense-breakeven-chart")).toBeVisible()
    await expect(page.getByTestId("breakeven-chart-legend")).toBeVisible()
    await expect(page.getByTestId("breakeven-chart-legend").getByText("Revenus")).toBeVisible()
    await expect(page.getByTestId("breakeven-chart-legend").getByText("Coûts totaux")).toBeVisible()
    await expect(page.getByText("Seuil de rentabilité").first()).toBeVisible()
    await expect(page.getByText("Survol interactif")).toBeVisible()
    await expect(page.getByTestId("breakeven-methodology-note")).toBeVisible()
    await expect(page.getByTestId("contributive-margin-evolution-expense-variable-costs")).toBeVisible()
    await expect(page.getByTestId("contributive-margin-evolution-expense-fixed-costs")).toBeVisible()
  })

  test("vue Divisions : marges contributives par division", async ({ page }) => {
    const DIV_EST = "d1111111-1111-1111-1111-111111111111"
    const DIV_OUEST = "d2222222-2222-2222-2222-222222222222"

    await setupAuthAndCommonMocks(page)
    await page.route("**/api/companies", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companies: [
            {
              id: COMPANY_ID,
              name: "Aciers Beauport inc.",
              fiscal_year_end: "12-31",
              currency: "CAD",
              divisions: [
                { id: DIV_EST, name: "Division Est", sub_divisions: [] },
                { id: DIV_OUEST, name: "Division Ouest", sub_divisions: [] },
              ],
              created_at: "2020-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        }),
      }),
    )
    await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [
            {
              id: "m1",
              account_number: "5010",
              description: "Matières Est",
              link_code: "CMV.1",
              summary_ef: null,
              detail_ef: null,
              divisions: "Division Est",
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: true,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
            {
              id: "m2",
              account_number: "6010",
              description: "Salaires Est",
              link_code: "ADM.1",
              summary_ef: null,
              detail_ef: null,
              divisions: "Division Est",
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: true,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
          ],
        }),
      }),
    )
    await page.route("**/api/standard-link-codes/flat*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            code: "REV-001",
            family: "REV",
            parent_code: null,
            is_leaf: true,
            is_active: true,
            label_sub_account: "Revenus",
            label_account: "Revenus",
            ft_category: null,
            account_type: null,
            coa_version: 1,
            deprecated_at: null,
          },
        ]),
      }),
    )
    await page.route(
      `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
      (route) => {
        const url = new URL(route.request().url())
        const divisionId = url.searchParams.get("division_id")
        const revenue =
          divisionId === DIV_EST ? 5_200_000 : divisionId === DIV_OUEST ? 1_800_000 : 7_000_000
        const variableCost =
          divisionId === DIV_EST ? 1_800_000 : divisionId === DIV_OUEST ? 900_000 : 2_700_000
        const fixedCost =
          divisionId === DIV_EST ? 1_000_000 : divisionId === DIV_OUEST ? 1_100_000 : 2_100_000
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "income-statement",
            fiscalYear: 2025,
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "REV-001",
                linkCode: "REV-001",
                label: "Revenus",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {
                  "2024-12": Math.round(revenue * 0.85),
                  "2025-12": revenue,
                },
                detailRows: [],
              },
              {
                id: "cmv",
                linkCode: "CMV",
                label: "CMV",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {},
                detailRows: [
                  {
                    id: "5010",
                    label: "Matières",
                    amounts: {
                      "2024-12": Math.round(variableCost * 0.9),
                      "2025-12": variableCost,
                    },
                  },
                ],
              },
              {
                id: "adm",
                linkCode: "ADM",
                label: "Admin",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {},
                detailRows: [
                  {
                    id: "6010",
                    label: "Salaires",
                    amounts: {
                      "2024-12": Math.round(fixedCost * 0.95),
                      "2025-12": fixedCost,
                    },
                  },
                ],
              },
            ],
          }),
        })
      },
    )
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Rentabilité par division", exact: true }).click()

    await expect(page.getByRole("heading", { name: "Rentabilité par division", exact: true })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByTestId("division-contributive-margin-report")).toBeVisible()
    await expect(page.getByTestId("division-profitability-table")).toBeVisible()
    await expect(
      page.getByTestId("division-profitability-table").getByRole("heading", {
        name: "Rentabilité par division",
      }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Lecture de la performance" })).toBeVisible()
    await expect(page.getByTestId("division-profitability-table").getByText("BAIIA", { exact: true }).first()).toBeVisible()
  })

  test("vue Situation financière : bilan consolidé société", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/balance-sheet`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            { label: "Actif à court terme", isSection: true, linkCode: "ACT" },
            { label: "Actif à long terme", isSection: true, linkCode: "ALT" },
            { label: "Passif à court terme", isSection: true, linkCode: "PCT" },
            { label: "Passif à long terme", isSection: true, linkCode: "PLT" },
            { label: "Capitaux propres", isSection: true, linkCode: "CAP" },
          ],
        }),
      }),
    )
    await page.route("**/api/standard-link-codes/flat*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { code: "ACT-A", family: "ACT", parent_code: "ACT", is_leaf: false, is_active: true, label_sub_account: null, label_account: "Trésorerie", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "ACT-A.1", family: "ACT", parent_code: "ACT-A", is_leaf: true, is_active: true, label_sub_account: "Encaisse", label_account: "Trésorerie", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "ALT-A", family: "ALT", parent_code: "ALT", is_leaf: false, is_active: true, label_sub_account: null, label_account: "Immobilisations", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "ALT-A.1", family: "ALT", parent_code: "ALT-A", is_leaf: true, is_active: true, label_sub_account: "Immobilisations", label_account: "Immobilisations", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "PCT-A", family: "PCT", parent_code: "PCT", is_leaf: false, is_active: true, label_sub_account: null, label_account: "Fournisseurs", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "PCT-A.1", family: "PCT", parent_code: "PCT-A", is_leaf: true, is_active: true, label_sub_account: "Fournisseurs", label_account: "Fournisseurs", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "CAP-A", family: "CAP", parent_code: "CAP", is_leaf: false, is_active: true, label_sub_account: null, label_account: "Capital", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "CAP-A.1", family: "CAP", parent_code: "CAP-A", is_leaf: true, is_active: true, label_sub_account: "Capital", label_account: "Capital", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "CAP-C", family: "CAP", parent_code: "CAP", is_leaf: false, is_active: true, label_sub_account: null, label_account: "Résultat", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
          { code: "CAP-C.1", family: "CAP", parent_code: "CAP-C", is_leaf: true, is_active: true, label_sub_account: "Bénéfices non répartis", label_account: "Résultat", ft_category: null, account_type: null, coa_version: 1, deprecated_at: null },
        ]),
      }),
    )
    await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [
            {
              id: "bs-m1",
              account_number: "1000",
              description: "Encaisse",
              link_code: "ACT-A.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
            {
              id: "bs-m2",
              account_number: "1500",
              description: "Immobilisations",
              link_code: "ALT-A.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
            {
              id: "bs-m3",
              account_number: "2000",
              description: "Fournisseurs",
              link_code: "PCT-A.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
            {
              id: "bs-m4",
              account_number: "3000",
              description: "Capital",
              link_code: "CAP-A.1",
              summary_ef: null,
              detail_ef: null,
              divisions: null,
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
          ],
        }),
      }),
    )
    await page.route(
      `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet/series*`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2025,
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "ACT",
                linkCode: "ACT",
                label: "Actif à court terme",
                isBold: false,
                isSection: true,
                isResult: false,
                amounts: { "2024-12": 108_000, "2025-12": 120_000 },
                detailRows: [
                  { id: "1000", label: "Encaisse", amounts: { "2024-12": 108_000, "2025-12": 120_000 } },
                ],
              },
              {
                id: "ALT",
                linkCode: "ALT",
                label: "Actif à long terme",
                isBold: false,
                isSection: true,
                isResult: false,
                amounts: { "2024-12": 252_000, "2025-12": 280_000 },
                detailRows: [
                  { id: "1500", label: "Immobilisations", amounts: { "2024-12": 252_000, "2025-12": 280_000 } },
                ],
              },
              {
                id: "PCT",
                linkCode: "PCT",
                label: "Passif à court terme",
                isBold: false,
                isSection: true,
                isResult: false,
                amounts: { "2024-12": 72_000, "2025-12": 80_000 },
                detailRows: [
                  { id: "2000", label: "Fournisseurs", amounts: { "2024-12": 72_000, "2025-12": 80_000 } },
                ],
              },
              {
                id: "PLT",
                linkCode: "PLT",
                label: "Passif à long terme",
                isBold: false,
                isSection: true,
                isResult: false,
                amounts: { "2024-12": 0, "2025-12": 0 },
                detailRows: [],
              },
              {
                id: "CAP",
                linkCode: "CAP",
                label: "Capitaux propres",
                isBold: false,
                isSection: true,
                isResult: false,
                amounts: { "2024-12": 288_000, "2025-12": 320_000 },
                detailRows: [
                  { id: "3000", label: "Capital", amounts: { "2024-12": 260_000, "2025-12": 290_000 } },
                  { id: "CAP-C.1", label: "Bénéfices non répartis", amounts: { "2024-12": 28_000, "2025-12": 30_000 } },
                ],
              },
            ],
          }),
        }),
    )
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Situation financière", exact: true }).click()

    await expect(page.getByTestId("financial-position-report")).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByTestId("financial-position-chart")).toBeVisible()
    await expect(page.getByTestId("financial-position-chart-assets")).toBeVisible()
    await expect(page.getByTestId("financial-position-chart-liabilities")).toBeVisible()
    await expect(page.getByTestId("financial-position-chart-assets-settings")).toBeVisible()
    await expect(page.getByTestId("financial-position-chart-liabilities-settings")).toBeVisible()
    await page.getByTestId("financial-position-chart-assets-settings").click()
    await expect(page.getByRole("heading", { name: "Paramètres — Actif" })).toBeVisible()
    await page.getByRole("button", { name: "Fermer" }).click()
    await expect(page.getByText("Actif court terme").first()).toBeVisible()
    await expect(page.getByText("Capitaux propres").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "Lecture de la situation financière" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Situation financière" }).nth(1)).toBeVisible()
    await expect(page.getByText("Actif à court terme", { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId("contributive-margin-evolution-ACT")).toBeVisible()
    await page.getByTestId("contributive-margin-act-row").click()
    await expect(page.getByText("ACT-A — Trésorerie")).toBeVisible()
    await page.getByText("ACT-A — Trésorerie").click()
    await expect(page.getByText("ACT-A.1 — Encaisse")).toBeVisible()
    await page.getByText("ACT-A.1 — Encaisse").click()
    await expect(page.getByText("1000 — Encaisse")).toBeVisible()
    await expect(page.getByTestId("contributive-margin-evolution-CAP")).toBeVisible()
    await expect(page.getByRole("button", { name: "Mensuel" })).toBeVisible()
    await page.getByRole("button", { name: "Mensuel" }).click()
    await expect(page.getByTestId("financial-position-chart")).toBeVisible()
  })

  test("vue Aperçu de l'entreprise : champs éditables", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Aperçu de l'entreprise", exact: true }).click()
    await expect(page.getByTestId("company-overview-section")).toBeVisible({ timeout: 15000 })

    const sectorInput = page.getByTestId("company-overview-general-sector")
    await sectorInput.fill("Fabrication de composantes métalliques")
    await expect(sectorInput).toHaveValue("Fabrication de composantes métalliques")
    await expect(page.getByTestId("company-overview-main-activities")).toBeVisible()
  })

  test("vue Fonds de roulement : tableau Analyse du fonds de roulement", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/working-capital`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "FDR",
              defineMapping: true,
              liaisonMode: "difference",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["PCT"],
              displayFormat: "currency",
            },
            {
              label: "FdRHC",
              defineMapping: true,
              liaisonMode: "difference",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["PCT"],
              displayFormat: "currency",
            },
            {
              label: "DSO",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 365,
              displayFormat: "days",
            },
            {
              label: "DIO",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 365,
              displayFormat: "days",
            },
            {
              label: "DPO",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["PCT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 365,
              displayFormat: "days",
            },
            {
              label: "CCC",
              defineMapping: true,
              liaisonMode: "na",
              displayFormat: "days",
            },
            {
              label: "Comptes clients en % des revenus",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 100,
              displayFormat: "percent",
            },
            {
              label: "Stocks en % des revenus",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["ACT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 100,
              displayFormat: "percent",
            },
            {
              label: "Créditeurs en % des revenus",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["PCT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 100,
              displayFormat: "percent",
            },
            {
              label: "Créditeurs en % des dépenses",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["PCT"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 100,
              displayFormat: "percent",
            },
          ],
        }),
      }),
    )
    await page.route(
      `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet/series*`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2025,
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "ACT",
                linkCode: "ACT",
                label: "Actif à court terme",
                isBold: false,
                isSection: true,
                isResult: false,
                amounts: { "2024-12": 108_000, "2025-12": 120_000 },
                detailRows: [],
              },
              {
                id: "PCT",
                linkCode: "PCT",
                label: "Passif à court terme",
                isBold: false,
                isSection: true,
                isResult: false,
                amounts: { "2024-12": 72_000, "2025-12": 80_000 },
                detailRows: [],
              },
            ],
          }),
        }),
    )
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
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "REV",
                linkCode: "REV",
                label: "Revenus",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: { "2024-12": 4_800_000, "2025-12": 5_200_000 },
                detailRows: [],
              },
            ],
          }),
        }),
    )
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Fonds de roulement", exact: true }).click()

    const wcNav = page.getByRole("button", { name: "Fonds de roulement", exact: true })
    await expect(wcNav).toHaveAttribute("aria-current", "true")

    await expect(page.getByTestId("working-capital-report")).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("working-capital-report").locator("h2")).toHaveText("Fonds de roulement")
    await expect(page.getByText("Structure fonds de roulement (bilan + TTM résultat)")).toBeVisible()
    await expect(page.getByTestId("wc-summary-table-scroll")).toBeVisible()
    await expect(page.getByText("FDR", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("DSO", { exact: true }).first()).toBeVisible()
    await expect(
      page.getByTestId("working-capital-report").getByRole("link", { name: /Voir l'analyse détaillée/i }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Lecture du fonds de roulement" })).toBeVisible()
    await expect(page.getByText("FDR / Revenus").first()).toBeVisible()
    await expect(page.getByText("Délai de collection des clients").first()).toBeVisible()
    await expect(page.getByText("Comptes clients en % des revenus").first()).toBeVisible()
    await expect(page.getByTestId("working-capital-narrative")).toBeVisible()
    await expect(page.getByTestId("working-capital-narrative-settings")).toBeVisible()
  })

  test("vue Capex : tableau Analyse des Capex", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await page.route(`**/api/companies/${COMPANY_ID}/statement-structures/capex`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          structure: [
            {
              label: "Investissements",
              defineMapping: true,
              linkCode: "ALT-B",
              displayFormat: "currency",
            },
            {
              label: "Capex / Revenus",
              defineMapping: true,
              liaisonMode: "quotient",
              liaisonNumeratorCodes: ["ALT-B"],
              liaisonDenominatorCodes: ["REV"],
              liaisonFactor: 100,
              displayFormat: "percent",
            },
          ],
        }),
      }),
    )
    await page.route(
      `**/api/companies/${COMPANY_ID}/financial-statements/balance-sheet/series*`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "balance-sheet",
            fiscalYear: 2025,
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "ALT-B",
                linkCode: "ALT-B",
                label: "Immobilisations corporelles",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: { "2024-12": 900_000, "2025-12": 1_100_000 },
                detailRows: [],
              },
            ],
          }),
        }),
    )
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
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "REV",
                linkCode: "REV",
                label: "Revenus",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: { "2024-12": 4_800_000, "2025-12": 5_200_000 },
                detailRows: [],
              },
            ],
          }),
        }),
    )
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByRole("button", { name: "Capex", exact: true }).click()

    const capexNav = page.getByRole("button", { name: "Capex", exact: true })
    await expect(capexNav).toHaveAttribute("aria-current", "true")

    await expect(page.getByTestId("capex-report")).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("capex-report").locator("h2")).toHaveText("Capex")
    await expect(page.getByText("Structure investissements (bilan + CDR)")).toBeVisible()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible()
    await expect(page.getByText("Investissements", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Capex / Revenus", { exact: true }).first()).toBeVisible()
    await expect(
      page.getByTestId("capex-report").getByRole("link", { name: /Voir l'analyse détaillée/i }),
    ).toBeVisible()
    await expect(page.getByRole("heading", { name: "Lecture des Capex" })).toBeVisible()
    await expect(page.getByTestId("capex-narrative")).toBeVisible()
    await expect(page.getByTestId("capex-narrative-settings")).toBeVisible()

    await page.getByRole("button", { name: "Mensuel", exact: true }).click()
    await expect(page.getByTestId("capex-summary-table-scroll")).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("button", { name: "Mensuel", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  test("tiroir de détail : ouverture depuis une carte KPI, fermeture par Échap", async ({
    page,
  }) => {
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(DIAGNOSTIC_PAGE_URL)

    await page.getByTestId("kpi-cards").getByText("EBITDA", { exact: true }).click()
    await expect(page.getByRole("dialog", { name: "EBITDA" })).toBeVisible({ timeout: 15000 })
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog", { name: "EBITDA" })).toHaveCount(0)
  })

  test("état d'erreur avec bouton Réessayer, puis rechargement réussi", async ({ page }) => {
    await setupAuthAndCommonMocks(page)

    let calls = 0
    await page.route(`**/api/companies/${COMPANY_ID}/diagnostic`, (route) => {
      calls += 1
      if (calls === 1) {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Erreur interne" }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(buildDiagnosticPayload()),
        })
      }
    })

    await page.goto(DIAGNOSTIC_PAGE_URL)

    // Erreur affichée avec bouton Réessayer.
    await expect(page.getByTestId("diagnostic-error")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Impossible de charger le diagnostic.")).toBeVisible()

    // Réessayer → le rapport se charge.
    await page.getByRole("button", { name: "Réessayer" }).click()
    await expect(
      page.getByRole("heading", { name: /Diagnostic de Aciers Beauport inc\./ }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("diagnostic-error")).toHaveCount(0)
  })
})

test.describe("Rapport Pilotage", () => {
  test("aperçu : Rapport de performance avec fond clair à cadrillage", async ({ page }) => {
    await setupAuthAndCommonMocks(page, {
      key: PILOTAGE_REGISTRY_KEY,
      record: {
        id: PILOTAGE_ID,
        companyId: COMPANY_ID,
        companyName: "Aciers Beauport inc.",
        title: "Aciers Beauport inc. — pilotage",
        referenceYear: 2025,
        referenceMonth: 12,
        createdAt: "2026-05-18T00:00:00.000Z",
        lastOpenedAt: "2026-05-18T00:00:00.000Z",
      },
    })
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(PILOTAGE_REPORT_URL)

    const cover = page.getByTestId("diagnostic-report-cover")
    await expect(cover).toBeVisible({ timeout: 15000 })
    await expect(cover).toHaveClass(/print-sheet-light-grid/)
    await expect(cover.getByText("Rapport de performance", { exact: true })).toBeVisible()
    await expect(
      cover.getByText(/Rapport de pilotage structuré autour de la performance actuelle/),
    ).toBeVisible()
    await expect(cover.getByText("Rapport de diagnostic financier")).toHaveCount(0)

    const performanceIntro = page.getByTestId("report-analysis-intro-performance")
    await expect(performanceIntro).toBeVisible()
    await expect(performanceIntro).toHaveClass(/print-sheet-light-grid/)

    await expect(page.getByTestId("diagnostic-report-toc-link-company-overview")).toHaveCount(0)
    await expect(page.getByTestId("diagnostic-report-toc-link-financial-position")).toHaveCount(0)
    await expect(page.getByTestId("diagnostic-report-toc-link-working-capital")).toBeVisible()
    await expect(page.getByTestId("diagnostic-report-mandate-scope")).toContainText(
      /rapport de performance préparé pour Aciers Beauport inc\./,
    )
  })

  test("Performance financière : commentaires par section (Revenus, CM, BAIIA)", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuthAndCommonMocks(page, {
      key: PILOTAGE_REGISTRY_KEY,
      record: {
        id: PILOTAGE_ID,
        companyId: COMPANY_ID,
        companyName: "Aciers Beauport inc.",
        title: "Aciers Beauport inc. — pilotage",
        referenceYear: 2025,
        referenceMonth: 12,
        createdAt: "2026-05-18T00:00:00.000Z",
        lastOpenedAt: "2026-05-18T00:00:00.000Z",
      },
    })
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(`/modules/pilotage/${PILOTAGE_ID}?companyId=${COMPANY_ID}`)

    await expect(page.getByText("Lecture de la performance")).toBeVisible({ timeout: 15000 })
    const revenueComment = page.getByTestId("pilotage-section-comment-pilotage-revenue")
    await expect(revenueComment).toBeVisible()
    await revenueComment.getByLabel("Commentaires").fill("Précision sur la hausse des revenus.")

    await page.reload()
    await expect(page.getByText("Lecture de la performance")).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("pilotage-section-comment-pilotage-revenue").getByLabel("Commentaires")).toHaveValue(
      "Précision sur la hausse des revenus.",
    )
    await expect(page.getByTestId("pilotage-section-comment-pilotage-contributive-margin")).toBeVisible()
    await expect(page.getByTestId("pilotage-section-comment-pilotage-ebita")).toBeVisible()
  })

  test("rapport imprimé : commentaires Performance financière visibles", async ({ page }) => {
    test.setTimeout(120_000)
    const commentText = "Note de pilotage visible dans le rapport imprimé."

    await setupAuthAndCommonMocks(page, {
      key: PILOTAGE_REGISTRY_KEY,
      record: {
        id: PILOTAGE_ID,
        companyId: COMPANY_ID,
        companyName: "Aciers Beauport inc.",
        title: "Aciers Beauport inc. — pilotage",
        referenceYear: 2025,
        referenceMonth: 12,
        createdAt: "2026-05-18T00:00:00.000Z",
        lastOpenedAt: "2026-05-18T00:00:00.000Z",
      },
    })
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(`/modules/pilotage/${PILOTAGE_ID}?companyId=${COMPANY_ID}`)
    await expect(page.getByText("Lecture de la performance")).toBeVisible({ timeout: 15000 })
    await page
      .getByTestId("pilotage-section-comment-pilotage-revenue")
      .getByLabel("Commentaires")
      .fill(commentText)

    await page.goto(PILOTAGE_REPORT_URL)
    await expect(page.getByTestId("diagnostic-report-print")).toBeVisible({ timeout: 15000 })

    const lecturePage = page.getByTestId("report-lecture-page-performance")
    await expect(lecturePage).toBeVisible({ timeout: 15000 })
    await expect(lecturePage.getByTestId("pilotage-section-comment-pilotage-revenue")).toBeVisible()
    await expect(
      lecturePage.getByTestId("pilotage-section-comment-pilotage-revenue").getByRole("heading", {
        name: "Commentaires",
      }),
    ).toBeVisible()
    await expect(lecturePage.getByText(commentText)).toBeVisible()
  })

  test("Analyse de rentabilité : commentaire uniquement sous Performance actuelle", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuthAndCommonMocks(page, {
      key: PILOTAGE_REGISTRY_KEY,
      record: {
        id: PILOTAGE_ID,
        companyId: COMPANY_ID,
        companyName: "Aciers Beauport inc.",
        title: "Aciers Beauport inc. — pilotage",
        referenceYear: 2025,
        referenceMonth: 12,
        createdAt: "2026-05-18T00:00:00.000Z",
        lastOpenedAt: "2026-05-18T00:00:00.000Z",
      },
    })
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(`/modules/pilotage/${PILOTAGE_ID}?companyId=${COMPANY_ID}`)
    await expect(page.getByText("Lecture de la performance")).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Analyse de rentabilité", exact: true }).click()
    await expect(page.getByTestId("expense-contribution-bridge-report")).toBeVisible({ timeout: 15000 })

    const expenseComment = page.getByTestId("pilotage-section-comment-pilotage-margin-and-baiia")
    await expect(expenseComment).toHaveCount(1)
    await expenseComment.getByLabel("Commentaires").fill("Note sur la rentabilité globale.")
    await expect(expenseComment.getByLabel("Commentaires")).toHaveValue("Note sur la rentabilité globale.")
  })

  test("Rentabilité par division : commentaire uniquement sous Performance actuelle", async ({ page }) => {
    test.setTimeout(90_000)
    await setupAuthAndCommonMocks(page, {
      key: PILOTAGE_REGISTRY_KEY,
      record: {
        id: PILOTAGE_ID,
        companyId: COMPANY_ID,
        companyName: "Aciers Beauport inc.",
        title: "Aciers Beauport inc. — pilotage",
        referenceYear: 2025,
        referenceMonth: 12,
        createdAt: "2026-05-18T00:00:00.000Z",
        lastOpenedAt: "2026-05-18T00:00:00.000Z",
      },
    })
    await page.route("**/api/companies", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          companies: [
            {
              id: COMPANY_ID,
              name: "Aciers Beauport inc.",
              fiscal_year_end: "12-31",
              currency: "CAD",
              divisions: [
                { id: DIVISION_OK, name: "Division Est", sub_divisions: [] },
                { id: DIVISION_KO, name: "Division Ouest", sub_divisions: [] },
              ],
              created_at: "2020-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        }),
      }),
    )
    await page.route(`**/api/companies/${COMPANY_ID}/account-mappings`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mappings: [
            {
              id: "m1",
              account_number: "5010",
              description: "Matières Est",
              link_code: "CMV.1",
              summary_ef: null,
              detail_ef: null,
              divisions: "Division Est",
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: true,
              fixed_costs: false,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
            {
              id: "m2",
              account_number: "6010",
              description: "Salaires Est",
              link_code: "ADM.1",
              summary_ef: null,
              detail_ef: null,
              divisions: "Division Est",
              sub_divisions: null,
              fdrhc: false,
              interests: false,
              amortization: false,
              variable_costs: false,
              fixed_costs: true,
              variable_cost_revenue_link_code: null,
              liability_remaining_years: null,
              liability_interest_rate: null,
              product: null,
              customer: null,
              supplier: null,
              interco_company_id: null,
            },
          ],
        }),
      }),
    )
    await page.route(
      `**/api/companies/${COMPANY_ID}/financial-statements/income-statement/series*`,
      (route) => {
        const url = new URL(route.request().url())
        const divisionId = url.searchParams.get("division_id")
        const revenue =
          divisionId === DIVISION_OK ? 5_200_000 : divisionId === DIVISION_KO ? 1_800_000 : 7_000_000
        const variableCost =
          divisionId === DIVISION_OK ? 1_800_000 : divisionId === DIVISION_KO ? 900_000 : 2_700_000
        const fixedCost =
          divisionId === DIVISION_OK ? 1_000_000 : divisionId === DIVISION_KO ? 1_100_000 : 2_100_000
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            companyId: COMPANY_ID,
            statementType: "income-statement",
            fiscalYear: 2025,
            periods: [
              { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
              { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
            ],
            rows: [
              {
                id: "REV-001",
                linkCode: "REV-001",
                label: "Revenus",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {
                  "2024-12": Math.round(revenue * 0.85),
                  "2025-12": revenue,
                },
                detailRows: [],
              },
              {
                id: "cmv",
                linkCode: "CMV",
                label: "CMV",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {},
                detailRows: [
                  {
                    id: "5010",
                    label: "Matières",
                    amounts: {
                      "2024-12": Math.round(variableCost * 0.9),
                      "2025-12": variableCost,
                    },
                  },
                ],
              },
              {
                id: "adm",
                linkCode: "ADM",
                label: "Admin",
                isBold: false,
                isSection: false,
                isResult: false,
                amounts: {},
                detailRows: [
                  {
                    id: "6010",
                    label: "Salaires",
                    amounts: {
                      "2024-12": Math.round(fixedCost * 0.95),
                      "2025-12": fixedCost,
                    },
                  },
                ],
              },
            ],
          }),
        })
      },
    )
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(`/modules/pilotage/${PILOTAGE_ID}?companyId=${COMPANY_ID}`)
    await expect(page.getByText("Lecture de la performance")).toBeVisible({ timeout: 15000 })
    await page.getByRole("button", { name: "Rentabilité par division", exact: true }).click()
    await expect(page.getByTestId("division-contributive-margin-report")).toBeVisible({ timeout: 15000 })

    const divisionComment = page.getByTestId(`pilotage-section-comment-division-profitability:${DIVISION_OK}`)
    await expect(divisionComment).toHaveCount(1)
    await divisionComment.getByLabel("Commentaires").fill("Note Division Est.")
    await expect(divisionComment.getByLabel("Commentaires")).toHaveValue("Note Division Est.")
  })
})
