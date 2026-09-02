import { describe, expect, it } from "vitest"
import {
  buildProFormaMonthlyProjectedLabels,
  distributeAnnualTaxPayments,
  expandProjectedAnnualTrendToMonthly,
  monthlyTaxExpenseFromBai,
  proFormaMonthlyProjectedColumnCount,
  recomputeProFormaMonthlyIsCascade,
  seasonalityFromAdjustmentMap,
  taxPaymentMonthWeights,
} from "@/lib/pro-forma-monthly-is"

describe("pro-forma-monthly-is", () => {
  it("builds 60 month labels for a 5-year horizon", () => {
    const labels = buildProFormaMonthlyProjectedLabels(2026, 5)
    expect(labels).toHaveLength(60)
    expect(labels[0]).toBe("janv. 2026")
    expect(labels[11]).toBe("déc. 2026")
    expect(labels[12]).toBe("janv. 2027")
    expect(labels[59]).toBe("déc. 2030")
    expect(proFormaMonthlyProjectedColumnCount(5)).toBe(60)
  })

  it("expands projected annual columns with seasonality and drops actual cols", () => {
    const peaked = [40, 10, 10, 5, 5, 5, 5, 5, 5, 5, 5, 0]
    const monthly = expandProjectedAnnualTrendToMonthly({
      annualTrend: [100_000, 50_000, 1_200_000, 1_200_000],
      forecastActualCols: 2,
      projectionYears: 2,
      seasonalityForConfigYear: () => peaked,
    })
    expect(monthly).toHaveLength(24)
    expect(monthly.slice(0, 12).reduce((a, b) => a + b, 0)).toBe(1_200_000)
    expect(monthly[0]).toBeGreaterThan(monthly[1]!)
  })

  it("reads seasonality from adjustment map with prior-year fallback", () => {
    const adj = {
      "REV.1-1": [{ seasonalityMonthPercents: Array(12).fill(100 / 12) }],
      "REV.1-2": [{ note: "no season" }],
    }
    const s2 = seasonalityFromAdjustmentMap(adj, "REV.1", 2)
    expect(s2).toHaveLength(12)
    expect(s2.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5)
  })

  it("computes monthly tax expense from BAI", () => {
    expect(monthlyTaxExpenseFromBai(100_000, 26)).toBe(26_000)
    expect(monthlyTaxExpenseFromBai(-10_000, 26)).toBe(0)
  })

  it("builds tax payment calendars by frequency", () => {
    expect(taxPaymentMonthWeights("monthly").every((w) => Math.abs(w - 1 / 12) < 1e-9)).toBe(true)
    expect(taxPaymentMonthWeights("annual")[11]).toBe(1)
    const q = distributeAnnualTaxPayments(100_000, "quarterly")
    expect(q.reduce((a, b) => a + b, 0)).toBe(100_000)
    expect(q[2]).toBeGreaterThan(0)
    expect(q[5]).toBeGreaterThan(0)
  })

  it("recomputes monthly cascade from revenus / cmv / charges", () => {
    const rows = recomputeProFormaMonthlyIsCascade(
      [
        { label: "Revenus", trendValues: [100, 200], current: 100, prior: 200 },
        { label: "Coût des produits vendus", trendValues: [40, 50], current: 40, prior: 50 },
        { label: "Bénéfice brut", trendValues: [0, 0], current: 0, prior: 0 },
        { label: "Total des charges", trendValues: [10, 20], current: 10, prior: 20 },
        { label: "Bénéfice avant impôts", trendValues: [0, 0], current: 0, prior: 0 },
        { label: "Impôts", trendValues: [0, 0], current: 0, prior: 0 },
        { label: "Bénéfice net", trendValues: [0, 0], current: 0, prior: 0 },
      ],
      26,
    )
    expect(rows.find((r) => r.label === "Bénéfice brut")?.trendValues).toEqual([60, 150])
    expect(rows.find((r) => r.label === "Bénéfice avant impôts")?.trendValues).toEqual([50, 130])
    expect(rows.find((r) => r.label === "Impôts")?.trendValues).toEqual([13, 34])
    expect(rows.find((r) => r.label === "Bénéfice net")?.trendValues).toEqual([37, 96])
  })

  it("monthly expand preserves annual totals across 12 months", () => {
    const flat = Array(12).fill(100 / 12)
    const monthly = expandProjectedAnnualTrendToMonthly({
      annualTrend: [0, 0, 1_200_000],
      forecastActualCols: 2,
      projectionYears: 1,
      seasonalityForConfigYear: () => flat,
    })
    expect(monthly).toHaveLength(12)
    expect(monthly.reduce((a, b) => a + b, 0)).toBe(1_200_000)
    expect(monthly.every((v) => v === 100_000)).toBe(true)
  })
})
