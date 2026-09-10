import { describe, expect, it } from "vitest"
import { buildValuationPreviewSummary } from "@/lib/valuation-preview-summary"

describe("buildValuationPreviewSummary", () => {
  it("assembles KPIs from risks + forecast configs without series", () => {
    const summary = buildValuationPreviewSummary("co-1", {
      risks: [
        {
          id: "1",
          company_id: "co-1",
          risk_id: "r1",
          category: "ops",
          name: "Concentration clients",
          description: null,
          impact: null,
          recommendation: null,
          level: "high",
          note: null,
          created_at: "",
          updated_at: "",
        },
        {
          id: "2",
          company_id: "co-1",
          risk_id: "r2",
          category: "ops",
          name: "Risque moyen",
          description: null,
          impact: null,
          recommendation: null,
          level: "medium",
          note: null,
          created_at: "",
          updated_at: "",
        },
      ],
      ebitdaConfigData: {
        lowEBITDARange: 800_000,
        highEBITDARange: 1_000_000,
        lowRevenueRange: 4_000_000,
        highRevenueRange: 5_000_000,
        characteristicCashFlowLow: 500_000,
        characteristicCashFlowHigh: 700_000,
        cashFlowEconomicGrowth: 2,
      },
      cmpcConfigData: {
        inputs: {
          riskFreeRate: 3,
          beta: 1,
          equityRiskPremium: 5,
          sizePremium: 2,
          specificRiskPremium: 1,
          creditSpread: 2,
          taxRate: 26,
          equityWeightPct: 70,
          debtWeightPct: 30,
        },
      },
      vcaFdrData: {
        acn: 2_000_000,
        vca: 2_400_000,
        pctOfRevenue: 12,
      },
    })

    expect(summary.highRiskNames).toEqual(["Concentration clients"])
    expect(summary.vca).toBe(2_400_000)
    expect(summary.acn).toBe(2_000_000)
    expect(summary.revenueRepresentativeMid).toBe(4_500_000)
    expect(summary.baiiaAdjustedMid).toBe(900_000)
    expect(summary.cashFlowMid).toBe(600_000)
    expect(summary.multipleRetained).not.toBeNull()
    expect(summary.enterpriseValueMid).not.toBeNull()
    expect(summary.goodwillMid).toBeCloseTo(
      (summary.enterpriseValueMid as number) - 2_000_000,
      0,
    )
  })

  it("uses computedVca when persisted vca is absent", () => {
    const summary = buildValuationPreviewSummary("co-1", {
      risks: [],
      ebitdaConfigData: null,
      cmpcConfigData: null,
      vcaFdrData: { acn: 1_000_000 },
      computedVca: 1_500_000,
    })
    expect(summary.vca).toBe(1_500_000)
    expect(summary.acn).toBe(1_000_000)
  })

  it("returns nulls when configs are missing", () => {
    const summary = buildValuationPreviewSummary("co-1", {
      risks: [],
      ebitdaConfigData: null,
      cmpcConfigData: null,
      vcaFdrData: null,
    })
    expect(summary.highRiskNames).toEqual([])
    expect(summary.vca).toBeNull()
    expect(summary.acn).toBeNull()
    expect(summary.revenueRepresentativeMid).toBeNull()
    expect(summary.baiiaAdjustedMid).toBeNull()
    expect(summary.cashFlowMid).toBeNull()
    expect(summary.multipleRetained).toBeNull()
    expect(summary.enterpriseValueMid).toBeNull()
    expect(summary.goodwillMid).toBeNull()
  })
})
