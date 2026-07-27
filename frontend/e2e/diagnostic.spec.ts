import { test, expect, Page } from "@playwright/test"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const DIVISION_OK = "d1111111-1111-1111-1111-111111111111"
const DIVISION_KO = "d2222222-2222-2222-2222-222222222222"
const URL = "/modules/diagnostic"

async function setupAuthAndCommonMocks(page: Page) {
  // Injecter le cookie de session + jetons avant tout script de page.
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "fake-access-token")
    localStorage.setItem("refresh_token", "fake-refresh-token")
  })
  await page.context().addCookies([
    {
      name: "has_session",
      value: "1",
      url: "http://localhost:3000",
    },
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
        organizations: [
          { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
        ],
      }),
    }),
  )
  await page.route("**/api/organizations", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { id: "o1", name: "Test Org", slug: "test-org", role: "admin" },
      ]),
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
}

function buildDiagnosticPayload(overrides: Record<string, unknown> = {}) {
  return {
    company_id: COMPANY_ID,
    company_name: "Aciers Beauport inc.",
    currency: "CAD",
    fiscal_year_end: "12-31",
    latest_fiscal_year: 2025,
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
  await page.route(`**/api/companies/${COMPANY_ID}/diagnostic`, (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    }),
  )
}

test.describe("Page Diagnostic", () => {
  test("rend l'en-tête, le badge de stade, les KPI et toutes les sections", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(page, buildDiagnosticPayload())

    await page.goto(URL)

    // En-tête : société + badge de stade de vie.
    await expect(
      page.getByRole("heading", { name: "Aciers Beauport inc." }),
    ).toBeVisible({ timeout: 15000 })
    const badge = page.getByTestId("lifecycle-badge")
    await expect(badge).toBeVisible()
    await expect(badge).toHaveText("Croissance")
    await expect(page.getByText(/Rapport généré le/)).toBeVisible()

    // Cartes KPI.
    const kpis = page.getByTestId("kpi-cards")
    await expect(kpis.getByText("Chiffre d'affaires", { exact: true })).toBeVisible()
    await expect(kpis.getByText("EBITDA", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Bénéfice net", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Ratio de liquidité", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Dette / Capitaux propres", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Capex", { exact: true })).toBeVisible()
    await expect(kpis.getByText("Valeur d'entreprise indicative", { exact: true })).toBeVisible()

    // Titres de toutes les sections.
    for (const heading of [
      "Tendances sur 5 ans",
      "Saisonnalité",
      "Rentabilité par division",
      "Revenus et marges par produits/services",
      "Ratios financiers (5 ans)",
      "Investissements (Capex)",
      "Valorisation indicative",
    ]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible()
    }

    // Liens « Voir l'analyse détaillée ».
    await expect(
      page.getByRole("link", { name: /Voir l'analyse détaillée/ }),
    ).toHaveCount(5)

    // Division non rentable surlignée en rouge + étiquette « Déficitaire ».
    const koRow = page.getByTestId(`division-row-${DIVISION_KO}`)
    await expect(koRow).toBeVisible()
    await expect(koRow).toHaveAttribute("data-profitable", "false")
    await expect(koRow).toHaveClass(/bg-red-50/)
    await expect(koRow.getByText("Déficitaire")).toBeVisible()

    // La division rentable n'est pas surlignée.
    const okRow = page.getByTestId(`division-row-${DIVISION_OK}`)
    await expect(okRow).toHaveAttribute("data-profitable", "true")
    await expect(okRow).not.toHaveClass(/bg-red-50/)

    // Lignes narratives (style mémo) sous les titres de section.
    await expect(page.getByText(/L'activité culmine en Avr/)).toBeVisible()
    await expect(
      page.getByText(/Chiffre d'affaires en croissance de 12,4 % par an/),
    ).toBeVisible()
    await expect(page.getByText(/La division Division Ouest est déficitaire/)).toBeVisible()

    // Valorisation : justification + note d'avertissement.
    await expect(
      page.getByText(/Multiple sectoriel pour la fabrication métallique/),
    ).toBeVisible()
    await expect(
      page.getByTestId("valuation-notes").getByText(/Valorisation indicative seulement/),
    ).toBeVisible()
  })

  test("état vide des produits lorsque products est vide", async ({ page }) => {
    await setupAuthAndCommonMocks(page)
    await mockDiagnostic(
      page,
      buildDiagnosticPayload({ products: [], division_products: [] }),
    )

    await page.goto(URL)

    await expect(
      page.getByRole("heading", { name: "Revenus et marges par produits/services" }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("products-empty-state")).toBeVisible()
    await expect(
      page.getByText(
        "Aucun produit/service mappé — associez des produits dans le mappage des comptes.",
      ),
    ).toBeVisible()
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

    await page.goto(URL)

    // Erreur affichée avec bouton Réessayer.
    await expect(page.getByTestId("diagnostic-error")).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Impossible de charger le diagnostic.")).toBeVisible()

    // Réessayer → le rapport se charge.
    await page.getByRole("button", { name: "Réessayer" }).click()
    await expect(
      page.getByRole("heading", { name: "Aciers Beauport inc." }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("diagnostic-error")).toHaveCount(0)
  })
})
