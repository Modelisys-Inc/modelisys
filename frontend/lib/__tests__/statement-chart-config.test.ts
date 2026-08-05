import { describe, expect, it } from "vitest"
import {
  CONTRIBUTIVE_MARGIN_SERIES_LABEL,
  ensureIncomeStatementPerformanceConfig,
  type StatementChartConfig,
} from "@/lib/statement-chart-config"

function performanceConfig(
  series: StatementChartConfig["series"],
): StatementChartConfig {
  return { version: 2, chartTitle: "Performance financière", series }
}

describe("ensureIncomeStatementPerformanceConfig", () => {
  it("convertit Marge brute (derivedMargin) en contribution marginale fixe", () => {
    const config = performanceConfig([
      {
        id: "rev",
        kind: "bar",
        label: "Revenus",
        spec: { type: "single", code: "REV" },
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
      {
        id: "margin",
        kind: "line",
        label: "Marge brute (%)",
        spec: {
          type: "derivedMargin",
          revenueSeriesId: "rev",
          grossProfitFromSpec: { type: "single", code: "BP" },
        },
        yAxis: "right",
        valueFormat: "ratio",
        showOnChart: true,
        showInSidePanel: true,
      },
    ])

    const ensured = ensureIncomeStatementPerformanceConfig(config, "income-statement")
    const margin = ensured.series.find((s) => s.id === "margin")
    expect(margin?.label).toBe(CONTRIBUTIVE_MARGIN_SERIES_LABEL)
    expect(margin?.spec).toEqual({ type: "derivedContributiveMargin", revenueSeriesId: "rev" })
  })

  it("n'altère pas les configs des autres relevés", () => {
    const config = performanceConfig([
      {
        id: "rev",
        kind: "bar",
        label: "Revenus",
        spec: { type: "single", code: "REV" },
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
    ])
    expect(ensureIncomeStatementPerformanceConfig(config, "balance-sheet")).toBe(config)
  })

  it("injecte la courbe si elle est absente", () => {
    const config = performanceConfig([
      {
        id: "rev",
        kind: "bar",
        label: "Revenus",
        spec: { type: "single", code: "REV" },
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
      {
        id: "baiia",
        kind: "bar",
        label: "BAIIA",
        spec: { type: "single", code: "BAIIA" },
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
      },
    ])

    const ensured = ensureIncomeStatementPerformanceConfig(config, "income-statement")
    expect(ensured.series).toHaveLength(3)
    expect(ensured.series[2]?.spec.type).toBe("derivedContributiveMargin")
    expect(ensured.series[2]?.label).toBe(CONTRIBUTIVE_MARGIN_SERIES_LABEL)
  })
})
