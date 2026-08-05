import { describe, expect, it } from "vitest"
import { buildDivisionProfitabilityNarrative } from "@/lib/division-profitability-narrative"
import { groupDivisionNarrativeBlocks } from "@/lib/income-performance-narrative"
import type { DivisionProfitabilitySlice } from "@/lib/division-profitability"

function divisionSlice(
  partial: Partial<DivisionProfitabilitySlice> & Pick<DivisionProfitabilitySlice, "divisionId" | "heading">,
): DivisionProfitabilitySlice {
  return {
    metricLabel: partial.metricLabel ?? `la division ${partial.heading}`,
    points: partial.points ?? [
      {
        period: "2025",
        revenue: 1_000_000,
        variableCosts: 400_000,
        contributiveMargin: 600_000,
        fixedCosts: 250_000,
        operatingProfit: 350_000,
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
    mappingStatus: partial.mappingStatus ?? {
      variableCostAccountCount: 1,
      fixedCostAccountCount: 1,
      revenueConfigured: true,
    },
    ...partial,
  }
}

describe("buildDivisionProfitabilityNarrative", () => {
  it("enchaîne titre, Revenus, Rentabilité et tableau par division", () => {
    const slices: DivisionProfitabilitySlice[] = [
      divisionSlice({ divisionId: "d1", heading: "Division Est" }),
      divisionSlice({
        divisionId: "d2",
        heading: "Division Ouest",
        points: [
          {
            period: "2025",
            revenue: 800_000,
            variableCosts: 300_000,
            contributiveMargin: 500_000,
            fixedCosts: 650_000,
            operatingProfit: -150_000,
          },
          {
            period: "2024",
            revenue: 700_000,
            variableCosts: 280_000,
            contributiveMargin: 420_000,
            fixedCosts: 600_000,
            operatingProfit: -180_000,
          },
        ],
      }),
    ]

    const result = buildDivisionProfitabilityNarrative(slices, "years")
    const blocks = groupDivisionNarrativeBlocks(result?.paragraphs ?? [])

    expect(result?.paragraphs).toHaveLength(4)
    expect(blocks).toHaveLength(2)
    expect(blocks?.[0]?.title).toBe("Division Est")
    expect(blocks?.[0]?.paragraphs.map((p) => p.subsection)).toEqual(["Revenus", "Rentabilité"])
    expect(blocks?.[0]?.paragraphs[0]?.divisionBlockId).toBe("d1")
    expect(blocks?.[0]?.paragraphs[0]?.heading).toBe("Rentabilité — Division Est")
    expect(blocks?.[0]?.paragraphs[0]?.showIndicatorTable).toBe(false)
    expect(blocks?.[0]?.paragraphs[1]?.showIndicatorTable).toBe(true)
    expect(blocks?.[1]?.title).toBe("Division Ouest")
    expect(result?.paragraphs.map((p) => p.divisionBlockId)).toEqual(["d1", "d1", "d2", "d2"])
  })

  it("conserve la logique textuelle Revenus et Rentabilité", () => {
    const result = buildDivisionProfitabilityNarrative(
      [
        divisionSlice({ divisionId: "d1", heading: "Division Est" }),
        divisionSlice({
          divisionId: "d2",
          heading: "Division Ouest",
          points: [
            {
              period: "2025",
              revenue: 500_000,
              variableCosts: 200_000,
              contributiveMargin: 300_000,
              fixedCosts: 150_000,
              operatingProfit: 150_000,
            },
            {
              period: "2024",
              revenue: 400_000,
              variableCosts: 160_000,
              contributiveMargin: 240_000,
              fixedCosts: 120_000,
              operatingProfit: 120_000,
            },
          ],
        }),
      ],
      "years",
    )

    expect(result?.paragraphs[0]?.body).toMatch(/TCAC/i)
    expect(result?.paragraphs[0]?.body).toContain("% du total")
    expect(result?.paragraphs[0]?.body).not.toMatch(/pts? de pondération/i)
    expect(result?.paragraphs[1]?.body).toMatch(/contribution marginale/i)
    expect(result?.paragraphs[1]?.body).not.toMatch(/bénéfice brut/i)
    expect(result?.paragraphs[1]?.body).toMatch(/BAIIA/i)
  })
})
