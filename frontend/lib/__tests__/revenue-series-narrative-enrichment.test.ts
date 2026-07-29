import { describe, it, expect } from "vitest"
import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import type { RevenueSeriesNarrativeSlice } from "@/lib/income-performance-narrative"
import type { BuiltSeriesMeta } from "@/lib/performance-chart-series"
import type { StatementChartSeries } from "@/lib/statement-chart-config"
import {
  collectVariableCostAccountsForRevenueCodes,
  enrichRevenueSeriesForNarrative,
  extractLinkCodesFromMetricSpec,
  resolveRevenueTargetLinkCodes,
  revenueLinkMatchesChartCodes,
} from "@/lib/revenue-series-narrative-enrichment"

const REV_CHART: StandardLinkCode[] = [
  {
    code: "REV-A",
    family: "REV",
    parent_code: null,
    is_leaf: false,
    is_active: true,
    label_sub_account: "Produits",
    label_account: "Produits",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "REV-A.1",
    family: "REV",
    parent_code: "REV-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Charpentes",
    label_account: "Charpentes",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "REV-A.2",
    family: "REV",
    parent_code: "REV-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Composants",
    label_account: "Composants",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "REV-B.1",
    family: "REV",
    parent_code: "REV-B",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Services",
    label_account: "Services",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
]

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "account_number">): AccountMappingData {
  return {
    id: partial.id ?? partial.account_number,
    description: partial.description ?? "",
    link_code: partial.link_code ?? "CMV.1",
    summary_ef: null,
    detail_ef: null,
    divisions: null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: partial.variable_costs ?? true,
    fixed_costs: false,
    variable_cost_revenue_link_code: partial.variable_cost_revenue_link_code ?? null,
    liability_remaining_years: null,
    liability_interest_rate: null,
    product: null,
    customer: null,
    supplier: null,
    interco_company_id: null,
    ...partial,
  }
}

describe("revenue-series-narrative-enrichment", () => {
  it("extrait les codes de liaison d'une spec single", () => {
    expect(extractLinkCodesFromMetricSpec({ type: "single", code: "REV-A.1" })).toEqual(["REV-A.1"])
  })

  it("résout REV-A vers ses feuilles REV-A.1 et REV-A.2", () => {
    const targets = resolveRevenueTargetLinkCodes(["REV-A"], REV_CHART)
    expect([...targets].sort()).toEqual(["REV-A", "REV-A.1", "REV-A.2"])
  })

  it("associe les coûts feuilles au parent REV-A via le plan comptable", () => {
    expect(revenueLinkMatchesChartCodes(["REV-A"], "REV-A.1", REV_CHART)).toBe(true)
    expect(revenueLinkMatchesChartCodes(["REV-A"], "REV-A.2", REV_CHART)).toBe(true)
    expect(revenueLinkMatchesChartCodes(["REV-A.1"], "REV-A.2", REV_CHART)).toBe(false)
    expect(revenueLinkMatchesChartCodes(["REV-A.1"], "REV-A.1", REV_CHART)).toBe(true)
  })

  it("agrège les coûts variables de REV-A.1 et REV-A.2 pour une série REV-A", () => {
    const mappings = [
      mapping({ account_number: "5010", variable_cost_revenue_link_code: "REV-A.1" }),
      mapping({ account_number: "5020", variable_cost_revenue_link_code: "REV-A.2" }),
      mapping({ account_number: "5030", variable_cost_revenue_link_code: "REV-B.1" }),
    ]
    const { accountNumbers, matchedRevenueLinkCodes } = collectVariableCostAccountsForRevenueCodes(
      mappings,
      ["REV-A"],
      REV_CHART,
    )
    expect(accountNumbers.sort()).toEqual(["5010", "5020"])
    expect(matchedRevenueLinkCodes).toEqual(["REV-A.1", "REV-A.2"])
  })

  it("ne ramène que les coûts de la feuille ciblée pour une série REV-A.1", () => {
    const mappings = [
      mapping({ account_number: "5010", variable_cost_revenue_link_code: "REV-A.1" }),
      mapping({ account_number: "5020", variable_cost_revenue_link_code: "REV-A.2" }),
    ]
    const { accountNumbers, matchedRevenueLinkCodes } = collectVariableCostAccountsForRevenueCodes(
      mappings,
      ["REV-A.1"],
      REV_CHART,
    )
    expect(accountNumbers).toEqual(["5010"])
    expect(matchedRevenueLinkCodes).toEqual(["REV-A.1"])
  })

  it("enrichit les tranches avec les coûts variables par période", () => {
    const periods: SeriesPeriod[] = [
      { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
      { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
    ]
    const rows: SeriesRow[] = [
      {
        id: "cmv",
        label: "CMV",
        linkCode: "CMV",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: {},
        detailRows: [
          {
            id: "5010",
            label: "Matières",
            amounts: { "2024-12": 30_000, "2025-12": 40_000 },
          },
          {
            id: "5020",
            label: "MOD",
            amounts: { "2024-12": 10_000, "2025-12": 10_000 },
          },
        ],
      },
    ]
    const chartSeries: StatementChartSeries[] = [
      {
        id: "rev-a",
        kind: "bar",
        label: "Produits",
        spec: { type: "single", code: "REV-A" },
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
    ]
    const seriesMeta: BuiltSeriesMeta[] = [
      {
        id: "rev-a",
        dataKey: "v_rev_a",
        kind: "bar",
        label: "Produits",
        color: "#3b82f6",
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
    ]
    const slices: RevenueSeriesNarrativeSlice[] = [
      {
        heading: "Produits",
        metricLabel: "les produits",
        points: [
          { period: "2025", revenue: 100_000, grossProfit: 0, ebita: 0, grossMarginPercent: 0 },
          { period: "2024", revenue: 80_000, grossProfit: 0, ebita: 0, grossMarginPercent: 0 },
        ],
      },
    ]
    const mappings = [
      mapping({ account_number: "5010", variable_cost_revenue_link_code: "REV-A.1" }),
      mapping({ account_number: "5020", variable_cost_revenue_link_code: "REV-A.1" }),
    ]

    const enriched = enrichRevenueSeriesForNarrative({
      slices,
      seriesMeta,
      chartSeries,
      mappings,
      seriesRows: rows,
      periods,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      standardLinkCodes: REV_CHART,
    })

    expect(enriched[0]!.variableCostMapped).toBe(true)
    expect(enriched[0]!.matchedRevenueLinkCodes).toEqual(["REV-A.1"])
    expect(enriched[0]!.resolvedRevenueLinkCodes).toEqual(["REV-A", "REV-A.1", "REV-A.2"])
    expect(enriched[0]!.points[0]!.variableCost).toBe(50_000)
    expect(enriched[0]!.points[0]!.grossProfit).toBe(50_000)
    expect(enriched[0]!.points[0]!.grossMarginPercent).toBe(50)
  })
})
