import { describe, expect, it } from "vitest"
import {
  computeProjectedNetIncomeYearTotals,
  computeProjectedTaxExpenseYearTotals,
  findNetIncomeSeriesRow,
  findTaxExpenseSeriesRow,
  lastCompletedFiscalYearTaxExpense,
} from "../projected-net-income-year-totals"
import type { SeriesPeriod, SeriesRow } from "../api"

describe("findNetIncomeSeriesRow", () => {
  it("finds the bénéfice net result row", () => {
    const rows = [
      { id: "1", label: "Revenus", isResult: false },
      { id: "2", label: "Bénéfice net", isResult: true },
    ] as SeriesRow[]
    expect(findNetIncomeSeriesRow(rows)?.id).toBe("2")
  })
})

describe("findTaxExpenseSeriesRow", () => {
  it("prefers parent IMP over IMP.1 leaf and skips bénéfice avant impôts", () => {
    const rows = [
      { id: "ebt", label: "Bénéfice avant impôts", isResult: true },
      { id: "IMP.1", label: "Exigibles", linkCode: "IMP.1", isResult: false },
      { id: "IMP", label: "Impôts", linkCode: "IMP", isResult: false },
      { id: "ni", label: "Bénéfice net", isResult: true },
    ] as SeriesRow[]
    expect(findTaxExpenseSeriesRow(rows)?.id).toBe("IMP")
  })
})

describe("lastCompletedFiscalYearTaxExpense", () => {
  it("uses N-1 complete fiscal year, not the current YTD year", () => {
    const periods = [
      { fiscalYear: 2025, fiscalMonth: 1, label: "Jan 2025" },
      { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
      { fiscalYear: 2026, fiscalMonth: 1, label: "Jan 2026" },
      { fiscalYear: 2026, fiscalMonth: 3, label: "Mar 2026" },
    ] as SeriesPeriod[]
    const row = {
      id: "IMP",
      label: "Impôts",
      linkCode: "IMP",
      amounts: {
        "2025-1": 100_000,
        "2025-12": 666_252,
        "2026-1": 50_000,
        "2026-3": 102_273,
      },
    } as SeriesRow
    // N-1 (2025) = 100_000 + 666_252 = 766_252 ; YTD 2026 = 152_273
    expect(lastCompletedFiscalYearTaxExpense(row, periods, 3, 2026, 12)).toBe(766_252)
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

  it("exposes matching tax expense totals for bilan tax rows", () => {
    const tax = computeProjectedTaxExpenseYearTotals({
      projectionYears: 2,
      lastActualNetIncome: 100_000,
      projectedRevenueYearTotals: [1_000_000, 1_200_000, 1_500_000],
      projectedExpenseHypothesisYearTotals: [800_000, 900_000, 1_000_000],
      projectedAmortizationYearTotals: [0, 50_000, 50_000],
      projectedInterestYearTotals: [0, 10_000, 10_000],
      taxRate: 26,
    })
    expect(tax[0]).toBe(0)
    expect(tax[1]).toBe(62_400)
    expect(tax[2]).toBe(114_400)
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
