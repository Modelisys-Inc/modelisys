import { describe, expect, it } from "vitest"
import {
  buildPilotageMarginByRevenueIndicatorTables,
  pilotageMarginIndicatorTableKey,
} from "@/lib/pilotage-margin-by-revenue-indicator"
import { buildPilotageMarginByRevenueNarrative } from "@/lib/income-performance-narrative"
import type { RevenueSeriesNarrativeSlice } from "@/lib/income-performance-narrative"

function monthPoint(month: number, year: number, revenue: number, variableCost: number) {
  const abbrevs = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"] as const
  return {
    period: `${abbrevs[month - 1]} ${year}`,
    revenue,
    grossProfit: revenue - variableCost,
    ebita: 0,
    grossMarginPercent: revenue > 0 ? ((revenue - variableCost) / revenue) * 100 : 0,
    variableCost,
  }
}

function buildSlice(heading: string, months: Array<{ month: number; year: number; revenue: number; cost: number }>) {
  return {
    heading,
    metricLabel: `les ${heading.toLowerCase()}`,
    variableCostMapped: true,
    points: months.map((m) => monthPoint(m.month, m.year, m.revenue, m.cost)),
  } satisfies RevenueSeriesNarrativeSlice
}

describe("buildPilotageMarginByRevenueIndicatorTables", () => {
  const months = Array.from({ length: 24 }, (_, index) => {
    const month = 8 - (index % 12)
    const year = month <= 0 ? 2025 - Math.floor((index - 8) / 12) : 2026 - Math.floor(index / 12)
    const normalizedMonth = month <= 0 ? month + 12 : month
    return {
      month: normalizedMonth,
      year: normalizedMonth > 8 && index >= 12 ? year - 1 : year,
      revenue: 200_000 - index * 2_000,
      cost: 80_000 - index * 500,
    }
  })

  const slice = buildSlice("Électroniques", months)

  it("construit les tableaux Performance actuelle, YTD et TTM", () => {
    const tables = buildPilotageMarginByRevenueIndicatorTables([slice], "12-31")
    const heading = "Marge contributive — Électroniques"

    const current = tables.get(pilotageMarginIndicatorTableKey(heading, "Performance actuelle"))
    expect(current?.columnGroups.map((g) => g.label)).toEqual([
      "Aoû 2026",
      expect.stringMatching(/Aoû 2025/),
      expect.stringMatching(/Jul 2026/),
    ])
    expect(current?.columnGroups[1]?.includeGap).toBe(true)
    expect(current?.columnGroups[2]?.includeGap).toBe(true)
    expect(current?.metrics.map((m) => m.id)).toEqual([
      "revenue",
      "variable-cost",
      "contributive-margin",
    ])
    expect(current?.metrics[0]?.gaps[1]).toBe(
      (current?.metrics[0]?.values[0] ?? 0) - (current?.metrics[0]?.values[1] ?? 0),
    )

    const ytd = tables.get(
      pilotageMarginIndicatorTableKey(heading, "Performance de l'exercice (YTD)"),
    )
    expect(ytd?.columnGroups.map((g) => g.label)).toEqual(["YTD 2026", "YTD 2025"])
    expect(ytd?.columnGroups[1]?.includeGap).toBe(true)

    const ttm = tables.get(
      pilotageMarginIndicatorTableKey(heading, "Tendance des 12 derniers mois"),
    )
    expect(ttm?.columnGroups.map((g) => g.label)).toEqual(["TTM 12 mois", "TTM 12 mois préc."])
  })
})

describe("buildPilotageMarginByRevenueNarrative", () => {
  it("émet 3 sous-sections par source avec tableaux indicateurs", () => {
    const slice = buildSlice("Électroniques", [
      { month: 8, year: 2026, revenue: 200_000, cost: 80_000 },
      { month: 7, year: 2026, revenue: 190_000, cost: 78_000 },
      ...Array.from({ length: 22 }, (_, i) => ({
        month: ((8 - i - 2 + 12) % 12) + 1,
        year: 2026 - Math.floor((i + 2) / 12),
        revenue: 180_000,
        cost: 75_000,
      })),
    ])

    const result = buildPilotageMarginByRevenueNarrative([slice], "12-31")
    expect(result?.paragraphs).toHaveLength(3)
    expect(result?.paragraphs.map((p) => p.subsection)).toEqual([
      "Performance actuelle",
      "Performance de l'exercice (YTD)",
      "Tendance des 12 derniers mois",
    ])
    expect(result?.paragraphs.every((p) => p.showIndicatorTable === true)).toBe(true)
    expect(result?.paragraphs[0]?.heading).toBe("Marge contributive — Électroniques")
  })
})
