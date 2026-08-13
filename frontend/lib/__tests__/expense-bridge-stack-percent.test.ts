import { describe, expect, it } from "vitest"
import {
  buildExpenseBridgeStackPercentSeries,
  toExpenseBridgeStackPercentPoint,
} from "@/lib/expense-bridge-stack-percent"

describe("expense-bridge-stack-percent", () => {
  it("répartit CV, CF et BAIIA en % du CA (total 100 %)", () => {
    const row = toExpenseBridgeStackPercentPoint({
      period: "2025",
      revenue: 1_000_000,
      variableCosts: 400_000,
      contributiveMargin: 600_000,
      fixedCosts: 220_000,
      operatingProfit: 380_000,
    })
    expect(row).not.toBeNull()
    expect(row!.variableCostsPct).toBeCloseTo(40, 5)
    expect(row!.fixedCostsPct).toBeCloseTo(22, 5)
    expect(row!.operatingProfitPct).toBeCloseTo(38, 5)
    expect(row!.variableCostsPct + row!.fixedCostsPct + row!.operatingProfitPct).toBeCloseTo(100, 5)
  })

  it("masque le segment BAIIA empilé lorsque le résultat est négatif", () => {
    const row = toExpenseBridgeStackPercentPoint({
      period: "2025",
      revenue: 1_000_000,
      variableCosts: 550_000,
      contributiveMargin: 450_000,
      fixedCosts: 500_000,
      operatingProfit: -50_000,
    })
    expect(row!.operatingProfitPct).toBeCloseTo(-5, 5)
    expect(row!.operatingProfitStackPct).toBe(0)
    expect(row!.variableCostsPct + row!.fixedCostsPct + row!.operatingProfitPct).toBeCloseTo(100, 5)
  })

  it("ignore les périodes sans revenus significatifs", () => {
    expect(
      toExpenseBridgeStackPercentPoint({
        period: "2025",
        revenue: 0,
        variableCosts: 0,
        contributiveMargin: 0,
        fixedCosts: 0,
        operatingProfit: 0,
      }),
    ).toBeNull()
    expect(
      buildExpenseBridgeStackPercentSeries([
        {
          period: "2025",
          revenue: 0,
          variableCosts: 0,
          contributiveMargin: 0,
          fixedCosts: 0,
          operatingProfit: 0,
        },
        {
          period: "2024",
          revenue: 800_000,
          variableCosts: 300_000,
          contributiveMargin: 500_000,
          fixedCosts: 200_000,
          operatingProfit: 300_000,
        },
      ]),
    ).toHaveLength(1)
  })
})
