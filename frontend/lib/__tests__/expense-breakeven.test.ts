import { describe, expect, it } from "vitest"
import { computeBreakevenAnalysis, projectBreakevenScenario } from "@/lib/expense-breakeven"

const BASE_POINT = {
  period: "2025",
  revenue: 1_000_000,
  variableCosts: 400_000,
  contributiveMargin: 600_000,
  fixedCosts: 220_000,
  operatingProfit: 380_000,
}

describe("computeBreakevenAnalysis", () => {
  it("calcule le seuil de rentabilité et la marge de sécurité", () => {
    const analysis = computeBreakevenAnalysis(BASE_POINT)

    expect(analysis).not.toBeNull()
    expect(analysis!.variableCostRatio).toBeCloseTo(0.4)
    expect(analysis!.contributionMarginRatio).toBeCloseTo(0.6)
    expect(analysis!.breakevenRevenue).toBeCloseTo(220_000 / 0.6)
    expect(analysis!.totalCosts).toBe(620_000)
    expect(analysis!.marginOfSafety).toBeCloseTo(1_000_000 - 220_000 / 0.6)
    expect(analysis!.isAboveBreakeven).toBe(true)
    expect(analysis!.chartPoints[0]).toMatchObject({ revenue: 0, totalCosts: 220_000 })
  })

  it("retourne null sans chiffre d'affaires", () => {
    expect(
      computeBreakevenAnalysis({
        period: "2025",
        revenue: 0,
        variableCosts: 0,
        contributiveMargin: 0,
        fixedCosts: 100_000,
        operatingProfit: -100_000,
      }),
    ).toBeNull()
  })

  it("signale un seuil non atteignable si la marge contributive est nulle", () => {
    const analysis = computeBreakevenAnalysis({
      period: "2025",
      revenue: 500_000,
      variableCosts: 500_000,
      contributiveMargin: 0,
      fixedCosts: 100_000,
      operatingProfit: -100_000,
    })

    expect(analysis!.breakevenRevenue).toBeNull()
    expect(analysis!.isAboveBreakeven).toBeNull()
  })
})

describe("projectBreakevenScenario", () => {
  it("projette les postes à un CA simulé", () => {
    const analysis = computeBreakevenAnalysis(BASE_POINT)!
    const scenario = projectBreakevenScenario(analysis, 800_000)

    expect(scenario.variableCosts).toBeCloseTo(320_000)
    expect(scenario.totalCosts).toBeCloseTo(540_000)
    expect(scenario.operatingProfit).toBeCloseTo(260_000)
    expect(scenario.contributiveMargin).toBeCloseTo(480_000)
    expect(scenario.isAboveBreakeven).toBe(true)
  })

  it("détecte le CA réel et le seuil de rentabilité", () => {
    const analysis = computeBreakevenAnalysis(BASE_POINT)!
    const actual = projectBreakevenScenario(analysis, analysis.revenue, { actualTolerance: 1 })
    const be = projectBreakevenScenario(analysis, analysis.breakevenRevenue!, { breakevenTolerance: 1 })

    expect(actual.badge).toBe("actual")
    expect(actual.isAtActualRevenue).toBe(true)
    expect(be.badge).toBe("breakeven")
    expect(be.isAtBreakeven).toBe(true)
    expect(be.operatingProfit).toBeCloseTo(0, 0)
  })
})
