import { describe, expect, it } from "vitest"
import { buildDivisionProfitabilityEvolutionTable } from "@/lib/division-profitability-evolution"
import type { DivisionProfitabilitySlice } from "@/lib/division-profitability"
import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "account_number">): AccountMappingData {
  return {
    id: partial.id ?? partial.account_number,
    description: partial.description ?? "",
    link_code: partial.link_code ?? "CMV-A.1",
    summary_ef: null,
    detail_ef: null,
    divisions: partial.divisions ?? "Division Est",
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: partial.variable_costs ?? false,
    fixed_costs: partial.fixed_costs ?? false,
    variable_cost_revenue_link_code: null,
    liability_remaining_years: null,
    liability_interest_rate: null,
    product: null,
    customer: null,
    supplier: null,
    interco_company_id: null,
    ...partial,
  }
}

describe("buildDivisionProfitabilityEvolutionTable", () => {
  const periods: SeriesPeriod[] = [
    { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
    { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
  ]

  const rows: SeriesRow[] = [
    {
      id: "rev",
      label: "Revenus",
      linkCode: "REV-A.1",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2024-12": 800_000, "2025-12": 1_000_000 },
      detailRows: [],
    },
    {
      id: "cmv",
      label: "CMV",
      linkCode: "CMV",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: {},
      detailRows: [
        { id: "5010", label: "Matières", amounts: { "2024-12": 300_000, "2025-12": 400_000 } },
      ],
    },
    {
      id: "adm",
      label: "Admin",
      linkCode: "ADM",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: {},
      detailRows: [
        { id: "6010", label: "Salaires", amounts: { "2024-12": 200_000, "2025-12": 250_000 } },
      ],
    },
  ]

  const slice: DivisionProfitabilitySlice = {
    divisionId: "d-est",
    heading: "Division Est",
    metricLabel: "la division Division Est",
    points: [
      {
        period: "2025",
        revenue: 1_000_000,
        variableCosts: 400_000,
        contributiveMargin: 600_000,
        fixedCosts: 250_000,
        operatingProfit: 350_000,
      },
      {
        period: "2024",
        revenue: 800_000,
        variableCosts: 300_000,
        contributiveMargin: 500_000,
        fixedCosts: 200_000,
        operatingProfit: 300_000,
      },
    ],
    mappingStatus: {
      variableCostAccountCount: 1,
      fixedCostAccountCount: 1,
      revenueConfigured: true,
    },
  }

  it("expose les revenus de la division pour les colonnes % CA intercalées", () => {
    const table = buildDivisionProfitabilityEvolutionTable({
      slice,
      allSlices: [slice],
      bundle: { divisionId: "d-est", rows, periods },
      mappings: [
        mapping({ account_number: "5010", variable_costs: true }),
        mapping({ account_number: "6010", fixed_costs: true }),
      ],
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })

    expect(table?.sourceRevenuesByPeriod).toEqual([1_000_000, 800_000])
    expect(table?.metrics).toHaveLength(6)
    expect(table?.metrics.find((m) => m.id === "operating-profit")?.label).toBe("BAIIA")
    expect(table?.metrics.find((m) => m.id === "contributive-margin-pct")).toBeUndefined()
    expect(table?.metrics.find((m) => m.id === "operating-margin-pct")).toBeUndefined()
  })
})
