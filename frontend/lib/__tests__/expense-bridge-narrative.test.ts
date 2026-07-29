import { describe, expect, it } from "vitest"
import { buildExpensesBridgeNarrative } from "@/lib/expense-bridge-narrative"
import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"

function bridge(overrides: Partial<ExpenseContributionBridgeResult> = {}): ExpenseContributionBridgeResult {
  return {
    points: [
      {
        period: "2025",
        revenue: 1_000_000,
        variableCosts: 400_000,
        contributiveMargin: 600_000,
        fixedCosts: 220_000,
        operatingProfit: 380_000,
      },
      {
        period: "2024",
        revenue: 800_000,
        variableCosts: 300_000,
        contributiveMargin: 500_000,
        fixedCosts: 200_000,
        operatingProfit: 300_000,
      },
    ],
    mappingStatus: {
      variableCostAccountCount: 3,
      fixedCostAccountCount: 2,
      revenueConfigured: true,
    },
    ...overrides,
  }
}

describe("buildExpensesBridgeNarrative", () => {
  it("produit la section Lecture des dépenses avec CV et CF", () => {
    const result = buildExpensesBridgeNarrative(bridge(), "years")
    expect(result.title).toBe("Lecture des dépenses")
    expect(result.paragraphs).toHaveLength(2)
    expect(result.paragraphs[0]!.heading).toBe("Coûts variables")
    expect(result.paragraphs[1]!.heading).toBe("Coûts fixes")
    expect(result.paragraphs[0]!.body).toContain("40,0 %")
    expect(result.paragraphs[1]!.body).toContain("bénéfice d'exploitation")
  })

  it("signale l'absence de mapping CV ou CF", () => {
    const noCv = buildExpensesBridgeNarrative(
      bridge({ mappingStatus: { variableCostAccountCount: 0, fixedCostAccountCount: 2, revenueConfigured: true } }),
      "years",
    )
    expect(noCv.paragraphs[0]!.body).toContain("Aucun compte")

    const noCf = buildExpensesBridgeNarrative(
      bridge({ mappingStatus: { variableCostAccountCount: 1, fixedCostAccountCount: 0, revenueConfigured: true } }),
      "years",
    )
    expect(noCf.paragraphs[1]!.body).toContain("Aucun compte")
  })
})
