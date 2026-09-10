import { describe, expect, it } from "vitest"
import {
  buildProFormaMonthlyProjectedLabels,
  expandConfigYearTotalsToMonthly,
  expandBilanHypothesisRowsToMonthly,
  interpolateProjectedAnnualTrendToMonthly,
  proFormaMonthlyProjectedColumnCount,
} from "@/lib/pro-forma-monthly-bs"

describe("pro-forma-monthly-bs", () => {
  it("builds 60 month labels for a 5-year horizon", () => {
    const labels = buildProFormaMonthlyProjectedLabels(2026, 5)
    expect(labels).toHaveLength(60)
    expect(labels[0]).toBe("janv. 2026")
    expect(labels[59]).toBe("déc. 2030")
    expect(proFormaMonthlyProjectedColumnCount(5)).toBe(60)
  })

  it("interpolates projected annual balances across months", () => {
    const monthly = interpolateProjectedAnnualTrendToMonthly([100_000, 200_000, 300_000], 1, 2)
    expect(monthly).toHaveLength(24)
    expect(monthly[11]).toBe(200_000)
    expect(monthly[23]).toBe(300_000)
    expect(monthly[0]).toBeGreaterThan(100_000)
    expect(monthly[0]).toBeLessThan(200_000)
  })

  it("expands config-year totals into 12 months per year", () => {
    const monthly = expandConfigYearTotalsToMonthly([0, 1_200_000, 1_200_000], 2)
    expect(monthly).toHaveLength(24)
    expect(monthly.reduce((a, b) => a + b, 0)).toBe(2_400_000)
  })

  it("expands bilan rows to monthly projected columns", () => {
    const rows = expandBilanHypothesisRowsToMonthly(
      [
        {
          label: "Placements",
          current: 0,
          prior: 0,
          rowId: "ACT-B",
          linkCode: "ACT-B",
          trendValues: [50_000, 100_000, 150_000],
        },
      ],
      {
        forecastActualCols: 1,
        projectionYears: 2,
        configYearCount: 3,
        bilanAdjustments: {},
        projectedRevenueMonthly: Array(24).fill(10_000),
        projectedCmvMonthly: Array(24).fill(4_000),
        periodNetIncomeMonthly: Array(24).fill(5_000),
        endingCashMonthly: Array(24).fill(80_000),
        periodTaxExpenseByDisplayYear: [0, 10_000, 12_000],
        periodTaxPaidByDisplayYear: [0, 10_000, 12_000],
        taxExigibleBaseTrends: { asset: [], liability: [] },
        capexAdjustments: {},
        capexDepreciationRates: {},
        capexDepreciationMethods: {},
        projectedRevenueYearTotals: [0, 120_000, 120_000],
        capexPeerRows: [],
        costByRowId: {},
        getAnnualDisplayAmount: (row, i) => row.trendValues?.[i] ?? 0,
      },
    )
    expect(rows[0]?.trendValues).toHaveLength(24)
    expect(rows[0]?.trendValues?.[11]).toBeGreaterThan(50_000)
    expect(rows[0]?.trendValues?.[23]).toBe(150_000)
  })
})
