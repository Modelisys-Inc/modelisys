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
  it("keeps last actual on year 0 and scales by revenue margin on projected years", () => {
    const totals = computeProjectedNetIncomeYearTotals({
      projectionYears: 2,
      lastActualNetIncome: 100_000,
      lastActualRevenue: 1_000_000,
      projectedRevenueYearTotals: [1_000_000, 1_200_000, 1_500_000],
    })
    expect(totals[0]).toBe(100_000)
    expect(totals[1]).toBe(120_000)
    expect(totals[2]).toBe(150_000)
  })

  it("falls back to last actual NI when revenue is missing", () => {
    const totals = computeProjectedNetIncomeYearTotals({
      projectionYears: 1,
      lastActualNetIncome: 80_000,
      lastActualRevenue: 0,
      projectedRevenueYearTotals: null,
    })
    expect(totals).toEqual([80_000, 80_000])
  })
})
