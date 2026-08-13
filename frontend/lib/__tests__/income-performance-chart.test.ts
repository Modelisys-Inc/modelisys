import { describe, expect, it } from "vitest"
import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"
import {
  buildIncomePerformanceChartFromBridge,
  INCOME_PERFORMANCE_SERIES_IDS,
  isFixedIncomePerformanceChart,
  resolveIncomePerformanceSeriesKeys,
} from "@/lib/income-performance-chart"
import type { BuiltSeriesMeta } from "@/lib/performance-chart-series"
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
      CONTRIBUTIVE_MARGIN_SERIES_LABEL,
      "BAIIA",
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

describe("resolveIncomePerformanceSeriesKeys", () => {
  it("résout les clés lorsque Revenus et BAIIA sont en courbes", () => {
    const meta: BuiltSeriesMeta[] = [
      {
        id: "rev",
        dataKey: "v_rev",
        kind: "line",
        label: "Revenus",
        color: "#3b82f6",
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
      {
        id: "cm",
        dataKey: "v_cm",
        kind: "line",
        label: CONTRIBUTIVE_MARGIN_SERIES_LABEL,
        color: "#f59e0b",
        yAxis: "right",
        valueFormat: "ratio",
        showOnChart: true,
        showInSidePanel: true,
      },
      {
        id: "op",
        dataKey: "v_op",
        kind: "line",
        label: "BAIIA",
        color: "#10b981",
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
    ]

    const keys = resolveIncomePerformanceSeriesKeys(meta)
    expect(keys).toEqual({ kRev: "v_rev", kEbita: "v_op", kMargin: "v_cm" })
  })
})
