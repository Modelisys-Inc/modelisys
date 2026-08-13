import { describe, expect, it } from "vitest"
import {
  buildRevenueContributiveMarginRows,
  buildRevenueContributiveMarginTotals,
} from "@/lib/revenue-contributive-margin-table"
import type { RevenueSeriesNarrativeSlice } from "@/lib/income-performance-narrative"

function slice(
  heading: string,
  revenue: number,
  variableCost: number | undefined,
  mapped = true,
): RevenueSeriesNarrativeSlice {
  return {
    heading,
    metricLabel: heading.toLowerCase(),
    variableCostMapped: mapped,
    points: [
      {
        period: "2024",
        revenue,
        variableCost,
        grossProfit: variableCost !== undefined ? revenue - variableCost : undefined,
        grossMarginPercent:
          variableCost !== undefined && revenue !== 0 ? ((revenue - variableCost) / revenue) * 100 : undefined,
      },
      { period: "2020", revenue: revenue * 0.7 },
    ],
  }
}

describe("buildRevenueContributiveMarginRows", () => {
  it("calcule revenus, coûts, marge et parts", () => {
    const rows = buildRevenueContributiveMarginRows([
      slice("Produits", 1000, 400),
      slice("Services", 500, 200),
    ])

    expect(rows).toHaveLength(2)
    expect(rows[0]!.label).toBe("Produits")
    expect(rows[0]!.revenue).toBe(1000)
    expect(rows[0]!.variableCost).toBe(400)
    expect(rows[0]!.contributiveMargin).toBe(600)
    expect(rows[0]!.marginPct).toBeCloseTo(60)
    expect(rows[0]!.revenueSharePct).toBeCloseTo(66.67, 1)
    expect(rows[0]!.contributiveSharePct).toBeCloseTo(66.67, 1)
    expect(rows[1]!.contributiveSharePct).toBeCloseTo(33.33, 1)
  })

  it("trie par revenus décroissants", () => {
    const rows = buildRevenueContributiveMarginRows([
      slice("Petit", 100, 40),
      slice("Grand", 900, 300),
    ])
    expect(rows.map((r) => r.label)).toEqual(["Grand", "Petit"])
  })

  it("laisse les coûts à null si mapping absent", () => {
    const rows = buildRevenueContributiveMarginRows([slice("Produits", 1000, undefined, false)])
    expect(rows[0]!.variableCost).toBeNull()
    expect(rows[0]!.contributiveMargin).toBeNull()
    expect(rows[0]!.contributiveSharePct).toBeNull()
    expect(rows[0]!.mappingConfigured).toBe(false)
  })
})

describe("buildRevenueContributiveMarginTotals", () => {
  it("agrège les totaux quand tous les coûts sont connus", () => {
    const rows = buildRevenueContributiveMarginRows([
      slice("Produits", 1000, 400),
      slice("Services", 500, 200),
    ])
    const totals = buildRevenueContributiveMarginTotals(rows)
    expect(totals.revenue).toBe(1500)
    expect(totals.variableCost).toBe(600)
    expect(totals.contributiveMargin).toBe(900)
    expect(totals.marginPct).toBeCloseTo(60)
  })

  it("ne totalise pas les coûts si une source est non mappée", () => {
    const rows = buildRevenueContributiveMarginRows([
      slice("Produits", 1000, 400),
      slice("Services", 500, undefined, false),
    ])
    const totals = buildRevenueContributiveMarginTotals(rows)
    expect(totals.variableCost).toBe(400)
    expect(totals.contributiveMargin).toBe(600)
    expect(totals.marginPct).toBeCloseTo(60)
    expect(totals.contributiveSharePct).toBe(100)
  })

  it("affiche la part contributrice totale à 100 % quand la marge est quantifiée", () => {
    const rows = buildRevenueContributiveMarginRows([
      slice("Produits", 1000, 400),
      slice("Services", 500, 200),
    ])
    const totals = buildRevenueContributiveMarginTotals(rows)
    expect(totals.contributiveSharePct).toBe(100)
  })
})
