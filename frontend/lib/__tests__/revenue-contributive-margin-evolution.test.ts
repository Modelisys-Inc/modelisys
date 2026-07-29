import { describe, expect, it } from "vitest"
import {
  buildRevenueContributiveMarginEvolutionTable,
  buildRevenueContributiveMarginEvolutionTables,
} from "@/lib/revenue-contributive-margin-evolution"
import type { RevenueSeriesNarrativeSlice } from "@/lib/income-performance-narrative"

function slice(
  heading: string,
  points: RevenueSeriesNarrativeSlice["points"],
): RevenueSeriesNarrativeSlice {
  return {
    heading,
    metricLabel: heading.toLowerCase(),
    variableCostMapped: true,
    points,
  }
}

describe("buildRevenueContributiveMarginEvolutionTable", () => {
  it("transpose les indicateurs en lignes et les années en colonnes chronologiques", () => {
    const electroniques = slice("Électroniques", [
      { period: "2025", revenue: 1200, variableCost: 500 },
      { period: "2024", revenue: 1000, variableCost: 450 },
      { period: "2023", revenue: 900, variableCost: 400 },
    ])
    const mecaniques = slice("Mécaniques", [
      { period: "2025", revenue: 800, variableCost: 300 },
      { period: "2024", revenue: 700, variableCost: 280 },
      { period: "2023", revenue: 600, variableCost: 250 },
    ])

    const table = buildRevenueContributiveMarginEvolutionTable(
      electroniques,
      [electroniques, mecaniques],
      0,
      "years",
    )

    expect(table?.periods).toEqual(["2025", "2024", "2023"])
    expect(table?.metrics.find((m) => m.id === "revenue")?.values).toEqual([1200, 1000, 900])
    expect(table?.metrics.find((m) => m.id === "contributive-margin")?.values).toEqual([700, 550, 500])
    expect(table?.metrics.find((m) => m.id === "margin-pct")?.values[0]).toBeCloseTo((700 / 1200) * 100)
    expect(table?.metrics.find((m) => m.id === "margin-pct")?.values[1]).toBeCloseTo(55)
    expect(table?.metrics.find((m) => m.id === "margin-pct")?.values[2]).toBeCloseTo((500 / 900) * 100)
    expect(table?.metrics.find((m) => m.id === "revenue-share")?.values).toEqual([
      60,
      (1000 / 1700) * 100,
      60,
    ])
  })

  it("expose la ventilation des coûts variables par compte GL", () => {
    const electroniques = slice("Électroniques", [
      { period: "2025", revenue: 1200, variableCost: 500 },
      { period: "2024", revenue: 1000, variableCost: 450 },
    ])
    electroniques.variableCostAccounts = [
      {
        accountNumber: "5010",
        label: "Matières",
        amounts: [300, 280],
      },
      {
        accountNumber: "5020",
        label: "Main-d'œuvre directe",
        amounts: [200, 170],
      },
    ]

    const table = buildRevenueContributiveMarginEvolutionTable(
      electroniques,
      [electroniques],
      0,
      "years",
    )
    const variableCost = table?.metrics.find((m) => m.id === "variable-cost")

    expect(variableCost?.detailRows).toHaveLength(2)
    expect(variableCost?.detailRows?.[0]).toMatchObject({
      id: "5010",
      label: "Matières",
      values: [300, 280],
    })
    expect(variableCost?.detailRows?.[1]?.values).toEqual([200, 170])
  })

  it("expose la ventilation des revenus par sous-code REV", () => {
    const electroniques = slice("Électroniques", [
      { period: "2025", revenue: 1200, variableCost: 500 },
      { period: "2024", revenue: 1000, variableCost: 450 },
    ])
    electroniques.revenueComponents = [
      {
        id: "REV-A.1",
        label: "Charpentes",
        kind: "link-code",
        amounts: [700, 600],
      },
      {
        id: "REV-A.2",
        label: "Composants",
        kind: "link-code",
        amounts: [500, 400],
      },
    ]

    const table = buildRevenueContributiveMarginEvolutionTable(
      electroniques,
      [electroniques],
      0,
      "years",
    )
    const revenue = table?.metrics.find((m) => m.id === "revenue")

    expect(revenue?.detailRows).toHaveLength(2)
    expect(revenue?.detailRows?.[0]).toMatchObject({
      id: "REV-A.1",
      displayKind: "link-code",
      values: [700, 600],
    })
  })

  it("limite l'horizon mensuel aux 12 derniers mois", () => {
    const points = Array.from({ length: 24 }, (_, index) => ({
      period: `M${index + 1}`,
      revenue: 100 + index,
      variableCost: 40 + index,
    }))
    const source = slice("Services", points)
    const table = buildRevenueContributiveMarginEvolutionTable(source, [source], 0, "24months")

    expect(table?.periods).toHaveLength(12)
    expect(table?.periods[0]).toBe("M1")
    expect(table?.periods[11]).toBe("M12")
  })
})

describe("buildRevenueContributiveMarginEvolutionTables", () => {
  it("indexe les tableaux par titre de paragraphe narratif", () => {
    const electroniques = slice("Électroniques", [
      { period: "2025", revenue: 1000, variableCost: 400 },
    ])
    const tables = buildRevenueContributiveMarginEvolutionTables([electroniques], "years")
    expect(tables.has("Marge contributive — Électroniques")).toBe(true)
  })
})
