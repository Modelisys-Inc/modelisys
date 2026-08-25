import { describe, expect, it } from "vitest"
import {
  computeProjectedNetIncomeYearTotals,
  findNetIncomeSeriesRow,
} from "../projected-net-income-year-totals"
import type { SeriesRow } from "../api"

describe("findNetIncomeSeriesRow", () => {
  it("finds the bénéfice net result row", () => {
    const rows = [
      { id: "1", label: "Revenus", isResult: false },
      { id: "2", label: "Bénéfice net", isResult: true },
    ] as SeriesRow[]
    expect(findNetIncomeSeriesRow(rows)?.id).toBe("2")
  })
})

describe("computeProjectedNetIncomeYearTotals", () => {
  it("keeps last actual on year 0 and computes BAI − tax on projected years", () => {
    const totals = computeProjectedNetIncomeYearTotals({
      projectionYears: 2,
      lastActualNetIncome: 100_000,
      projectedRevenueYearTotals: [1_000_000, 1_200_000, 1_500_000],
      projectedExpenseHypothesisYearTotals: [800_000, 900_000, 1_000_000],
      projectedAmortizationYearTotals: [0, 50_000, 50_000],
      projectedInterestYearTotals: [0, 10_000, 10_000],
      taxRate: 26,
    })
    // year 1: BAI = 1_200_000 - 900_000 - 50_000 - 10_000 = 240_000 ; tax = 62_400 ; NI = 177_600
    expect(totals[0]).toBe(100_000)
    expect(totals[1]).toBe(177_600)
    // year 2: BAI = 1_500_000 - 1_000_000 - 50_000 - 10_000 = 440_000 ; tax = 114_400 ; NI = 325_600
    expect(totals[2]).toBe(325_600)
  })

  it("does not tax a negative BAI", () => {
    const totals = computeProjectedNetIncomeYearTotals({
      projectionYears: 1,
      lastActualNetIncome: 80_000,
      projectedRevenueYearTotals: [0, 100_000],
      projectedExpenseHypothesisYearTotals: [0, 150_000],
      taxRate: 26,
    })
    expect(totals[1]).toBe(-50_000)
  })
})
