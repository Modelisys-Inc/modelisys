import { describe, expect, it } from "vitest"
import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"
import {
  buildIncomePerformanceChartFromBridge,
  INCOME_PERFORMANCE_SERIES_IDS,
  isFixedIncomePerformanceChart,
} from "@/lib/income-performance-chart"
import { CONTRIBUTIVE_MARGIN_SERIES_LABEL } from "@/lib/statement-chart-config"

function bridge(points: ExpenseContributionBridgeResult["points"]): ExpenseContributionBridgeResult {
  return {
    points,
    mappingStatus: {
      variableCostAccountCount: 1,
      fixedCostAccountCount: 1,
      revenueConfigured: true,
    },
  }
}

describe("isFixedIncomePerformanceChart", () => {
  it("cible uniquement la carte Performance financière", () => {
    expect(isFixedIncomePerformanceChart("income-statement", "income-statement", "full")).toBe(true)
    expect(isFixedIncomePerformanceChart("income-statement", "income-statement", "revenue-only")).toBe(
      false,
    )
    expect(isFixedIncomePerformanceChart("diagnostic-revenue", "diagnostic-revenue", "revenue-only")).toBe(
      false,
    )
  })
})

describe("buildIncomePerformanceChartFromBridge", () => {
  it("aligne Revenus, BAIIA et contribution marginale sur le pont Dépenses", () => {
    const built = buildIncomePerformanceChartFromBridge(
      bridge([
        {
          period: "2025",
          revenue: 1_000_000,
          variableCosts: 400_000,
          contributiveMargin: 600_000,
          fixedCosts: 220_000,
          operatingProfit: 380_000,
        },
      ]),
    )

    expect(built).not.toBeNull()
    expect(built!.series.map((s) => s.label)).toEqual([
      "Revenus",
      "BAIIA",
      CONTRIBUTIVE_MARGIN_SERIES_LABEL,
    ])

    const revKey = built!.series.find((s) => s.id === INCOME_PERFORMANCE_SERIES_IDS.revenue)!.dataKey
    const opKey = built!.series.find((s) => s.id === INCOME_PERFORMANCE_SERIES_IDS.operatingProfit)!
      .dataKey
    const cmKey = built!.series.find((s) => s.id === INCOME_PERFORMANCE_SERIES_IDS.contributiveMargin)!
      .dataKey
    const point = built!.points[0] as Record<string, number>

    expect(point[revKey]).toBe(1_000_000)
    expect(point[opKey]).toBe(380_000)
    expect(point[cmKey]).toBeCloseTo(60, 1)
  })
})
