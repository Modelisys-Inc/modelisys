import { describe, expect, it } from "vitest"
import { buildDivisionProfitabilityNarrative } from "@/lib/division-profitability-narrative"
import type { DivisionProfitabilitySlice } from "@/lib/division-profitability"

describe("buildDivisionProfitabilityNarrative", () => {
  it("explique une division rentable et une division déficitaire au niveau fixe", () => {
    const slices: DivisionProfitabilitySlice[] = [
      {
        divisionId: "d1",
        heading: "Division Est",
        metricLabel: "la division Division Est",
        points: [
          {
            period: "2025",
            revenue: 1_000_000,
            variableCosts: 400_000,
            contributiveMargin: 600_000,
            fixedCosts: 250_000,
            operatingProfit: 350_000,
          },
        ],
        mappingStatus: {
          variableCostAccountCount: 1,
          fixedCostAccountCount: 1,
          revenueConfigured: true,
        },
      },
      {
        divisionId: "d2",
        heading: "Division Ouest",
        metricLabel: "la division Division Ouest",
        points: [
          {
            period: "2025",
            revenue: 800_000,
            variableCosts: 300_000,
            contributiveMargin: 500_000,
            fixedCosts: 650_000,
            operatingProfit: -150_000,
          },
        ],
        mappingStatus: {
          variableCostAccountCount: 1,
          fixedCostAccountCount: 1,
          revenueConfigured: true,
        },
      },
    ]

    const result = buildDivisionProfitabilityNarrative(slices, "years")
    expect(result?.title).toBe("Lecture de la rentabilité par division")
    expect(result?.paragraphs[0]!.body).toMatch(/rentable/i)
    expect(result?.paragraphs[0]!.body).toContain("bénéfice d'exploitation")
    expect(result?.paragraphs[1]!.body).toMatch(/n'est pas rentable/i)
    expect(result?.paragraphs[1]!.body).toMatch(/structurel/i)
    expect(result?.paragraphs.some((p) => p.heading === "Synthèse comparative des divisions")).toBe(false)
  })
})
