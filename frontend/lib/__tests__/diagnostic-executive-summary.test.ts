import { describe, expect, it } from "vitest"
import { buildExecutiveSummary } from "@/lib/diagnostic-executive-summary"
import type { CompanyDiagnostic } from "@/lib/api"

function minimalDiagnostic(): CompanyDiagnostic {
  return {
    company_id: "c1",
    company_name: "Test Co",
    currency: "CAD",
    fiscal_year_end: "12-31",
    latest_fiscal_year: 2024,
    reference_period: {
      calendar_year: 2024,
      calendar_month: 12,
      fiscal_year: 2024,
      fiscal_month: 12,
    },
    summary: {
      latest_fiscal_year: 2024,
      lifecycle_stage: "croissance",
      revenue_cagr_5y: 10,
      latest_revenue: 1_000_000,
      latest_ebitda: 200_000,
      latest_net_income: 100_000,
      latest_gross_margin_pct: 40,
      latest_ebitda_margin_pct: 20,
      latest_net_margin_pct: 10,
      current_ratio: 1.5,
      quick_ratio: 1.1,
      debt_to_equity: 0.8,
      capex_latest: 50_000,
      capex_revenue_pct: 5,
      indicative_enterprise_value_mid: 800_000,
    },
    trends: [
      {
        fiscal_year: 2023,
        revenue: 900_000,
        gross_profit: 360_000,
        gross_margin_pct: 40,
        ebitda: 180_000,
        ebitda_margin_pct: 20,
        net_income: 90_000,
        net_margin_pct: 10,
        current_assets: 300_000,
        current_liabilities: 200_000,
        inventory: 50_000,
        total_assets: 500_000,
        total_liabilities: 250_000,
        equity: 250_000,
        depreciation: 20_000,
        capex: 40_000,
        current_ratio: 1.5,
        quick_ratio: 1.25,
        debt_to_equity: 1.0,
        asset_turnover: 1.8,
        interest_coverage: 5,
      },
      {
        fiscal_year: 2024,
        revenue: 1_000_000,
        gross_profit: 400_000,
        gross_margin_pct: 40,
        ebitda: 200_000,
        ebitda_margin_pct: 20,
        net_income: 100_000,
        net_margin_pct: 10,
        current_assets: 320_000,
        current_liabilities: 210_000,
        inventory: 55_000,
        total_assets: 520_000,
        total_liabilities: 260_000,
        equity: 260_000,
        depreciation: 22_000,
        capex: 50_000,
        current_ratio: 1.52,
        quick_ratio: 1.26,
        debt_to_equity: 1.0,
        asset_turnover: 1.92,
        interest_coverage: 5.5,
      },
    ],
    seasonality: [],
    divisions: [],
    products: [],
    division_products: [],
    valuation: {
      normalized_ebitda: 190_000,
      multiple_low: 3,
      multiple_high: 5,
      enterprise_value_low: 570_000,
      enterprise_value_high: 950_000,
      enterprise_value_mid: 760_000,
      book_equity: 260_000,
      rationale: [],
    },
    notes: [],
    generated_at: "2026-07-01T00:00:00Z",
  }
}

describe("buildExecutiveSummary", () => {
  it("produces intro, blocks for each report section and health score", () => {
    const model = buildExecutiveSummary(minimalDiagnostic())

    expect(model.headline).toBe("Sommaire exécutif")
    expect(model.introParagraphs.length).toBeGreaterThan(0)
    expect(model.blocks.some((b) => b.reportView === "performance")).toBe(true)
    expect(model.blocks.some((b) => b.reportView === "revenue")).toBe(true)
    expect(model.blocks.some((b) => b.scrollTargetId === "diag-valorisation")).toBe(true)
    expect(model.conclusionParagraph).toContain("Test Co")
    expect(model.blocks.find((b) => b.id === "performance")?.paragraphs.join(" ")).toMatch(
      /EBITDA|chiffre d'affaires/i,
    )
    expect(model.blocks.find((b) => b.id === "performance")?.paragraphs.join(" ")).not.toMatch(
      /Cette section|La vue|Ouvrez la section|dans la section|permettra d'identifier|À creuser/i,
    )
    expect(model.blocks.find((b) => b.id === "expenses")?.paragraphs.join(" ")).toMatch(
      /charges d'exploitation|EBITDA/i,
    )
  })
})
