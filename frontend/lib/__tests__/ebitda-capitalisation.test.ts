import { describe, expect, it } from "vitest"
import {
  buildEbitdaColumnSpecs,
  buildEbitdaSynthesisAverages,
  computeAdjustedYears,
  computeAverageNFiscalYears,
  computeWeightedAverageEBITDA,
  createDefaultEbitdaYears,
  filterPopulatedEbitdaColumns,
  getTotalAdjustmentsForColumn,
  getTotalAdjustmentsForYear,
  isEbitdaColumnPopulated,
  isReferenceAtFiscalYearEnd,
  migrateAdjustmentAmountKeys,
  seedEbitdaRangeFromAverage,
} from "@/lib/ebitda-capitalisation"

describe("ebitda-capitalisation columns", () => {
  it("builds PEC + TTM + 5 complete years when reference is mid-year", () => {
    const specs = buildEbitdaColumnSpecs(8, 2026, 12, 5)
    expect(specs.map((s) => s.label)).toEqual([
      "PEC",
      "TTM",
      "Déc 2025",
      "Déc 2024",
      "Déc 2023",
      "Déc 2022",
      "Déc 2021",
    ])
    expect(specs.map((s) => s.id)).toEqual([
      "pec",
      "ttm",
      "fy-2025",
      "fy-2024",
      "fy-2023",
      "fy-2022",
      "fy-2021",
    ])
  })

  it("builds 5 fiscal years when reference is fiscal year end", () => {
    expect(isReferenceAtFiscalYearEnd(12, 12)).toBe(true)
    const specs = buildEbitdaColumnSpecs(12, 2026, 12, 5)
    expect(specs.map((s) => s.label)).toEqual([
      "Déc 2026",
      "Déc 2025",
      "Déc 2024",
      "Déc 2023",
      "Déc 2022",
    ])
  })

  it("applies adjustments to BAIIA by column id", () => {
    const years = createDefaultEbitdaYears(2025).map((y) => ({
      ...y,
      ebitda: 100_000,
      adjustedEBITDA: 100_000,
    }))
    const adjustments = [
      {
        id: "a1",
        name: "Non récurrent",
        target: "ebitda" as const,
        amounts: { "fy-2025": 10_000, "fy-2024": -5_000 },
      },
    ]
    expect(getTotalAdjustmentsForColumn(adjustments, "fy-2025")).toBe(10_000)
    expect(getTotalAdjustmentsForYear(adjustments, 2025)).toBe(10_000)
    const adjusted = computeAdjustedYears(years, adjustments)
    expect(adjusted.find((y) => y.id === "fy-2025")?.adjustedEBITDA).toBe(110_000)
    expect(adjusted.find((y) => y.id === "fy-2024")?.adjustedEBITDA).toBe(95_000)
  })

  it("applies revenue adjustments to revenus and BAIIA", () => {
    const years = createDefaultEbitdaYears(2025).map((y) => ({
      ...y,
      revenue: 500_000,
      adjustedRevenue: 500_000,
      ebitda: 100_000,
      adjustedEBITDA: 100_000,
    }))
    const adjustments = [
      {
        id: "r1",
        name: "Revenus non récurrents",
        target: "revenue" as const,
        amounts: { "fy-2025": -20_000 },
      },
      {
        id: "e1",
        name: "Charge non récurrente",
        target: "ebitda" as const,
        amounts: { "fy-2025": 5_000 },
      },
    ]
    expect(getTotalAdjustmentsForColumn(adjustments, "fy-2025", "revenue")).toBe(-20_000)
    expect(getTotalAdjustmentsForColumn(adjustments, "fy-2025", "ebitda")).toBe(5_000)
    expect(getTotalAdjustmentsForColumn(adjustments, "fy-2025")).toBe(-15_000)
    const adjusted = computeAdjustedYears(years, adjustments)
    const col = adjusted.find((y) => y.id === "fy-2025")
    expect(col?.adjustedRevenue).toBe(480_000)
    expect(col?.adjustedEBITDA).toBe(85_000)
  })

  it("computes weighted and fiscal averages", () => {
    const years = [
      {
        id: "pec",
        kind: "pec" as const,
        label: "PEC",
        month: 8,
        year: 2026,
        ebitda: 50,
        revenue: 0,
        adjustedEBITDA: 50,
        weight: 0,
        isRepresentative: false,
      },
      {
        id: "ttm",
        kind: "ttm" as const,
        label: "TTM",
        month: 8,
        year: 2026,
        ebitda: 90,
        revenue: 0,
        adjustedEBITDA: 90,
        weight: 0.4,
        isRepresentative: true,
      },
      {
        id: "fy-2025",
        kind: "fiscal" as const,
        label: "Déc 2025",
        month: 12,
        year: 2025,
        ebitda: 100,
        revenue: 0,
        adjustedEBITDA: 100,
        weight: 0.6,
        isRepresentative: true,
      },
      {
        id: "fy-2024",
        kind: "fiscal" as const,
        label: "Déc 2024",
        month: 12,
        year: 2024,
        ebitda: 80,
        revenue: 0,
        adjustedEBITDA: 80,
        weight: 0,
        isRepresentative: false,
      },
      {
        id: "fy-2023",
        kind: "fiscal" as const,
        label: "Déc 2023",
        month: 12,
        year: 2023,
        ebitda: 70,
        revenue: 0,
        adjustedEBITDA: 70,
        weight: 0,
        isRepresentative: false,
      },
    ]
    expect(computeWeightedAverageEBITDA(years)).toBe(96)
    expect(computeAverageNFiscalYears(years, 3)).toBeCloseTo((100 + 80 + 70) / 3)
    expect(computeAverageNFiscalYears(years, 4)).toBeNull()
    expect(computeAverageNFiscalYears(years, 5)).toBeNull()
    expect(buildEbitdaSynthesisAverages(years).map((r) => r.id)).toEqual([
      "avg-3y",
      "avg-2y",
      "last-fy",
    ])
  })

  it("hides empty columns and excludes them from averages", () => {
    const years = [
      {
        id: "pec",
        kind: "pec" as const,
        label: "PEC",
        month: 8,
        year: 2026,
        ebitda: 0,
        revenue: 0,
        adjustedEBITDA: 0,
        weight: 0.3,
        isRepresentative: true,
      },
      {
        id: "ttm",
        kind: "ttm" as const,
        label: "TTM",
        month: 8,
        year: 2026,
        ebitda: 90,
        revenue: 900,
        adjustedEBITDA: 90,
        weight: 0.4,
        isRepresentative: true,
      },
      {
        id: "fy-2025",
        kind: "fiscal" as const,
        label: "Déc 2025",
        month: 12,
        year: 2025,
        ebitda: 100,
        revenue: 1000,
        adjustedEBITDA: 100,
        weight: 0.6,
        isRepresentative: true,
      },
      {
        id: "fy-2024",
        kind: "fiscal" as const,
        label: "Déc 2024",
        month: 12,
        year: 2024,
        ebitda: 0,
        revenue: 0,
        adjustedEBITDA: 0,
        weight: 0,
        isRepresentative: false,
      },
      {
        id: "fy-2023",
        kind: "fiscal" as const,
        label: "Déc 2023",
        month: 12,
        year: 2023,
        ebitda: 0,
        revenue: 0,
        adjustedEBITDA: 0,
        weight: 0,
        isRepresentative: false,
      },
      {
        id: "fy-2022",
        kind: "fiscal" as const,
        label: "Déc 2022",
        month: 12,
        year: 2022,
        ebitda: 70,
        revenue: 700,
        adjustedEBITDA: 70,
        weight: 0,
        isRepresentative: false,
      },
    ]
    const visible = filterPopulatedEbitdaColumns(years)
    expect(visible.map((c) => c.id)).toEqual(["ttm", "fy-2025", "fy-2022"])
    // Only 2 peuplés → moyennes 5/4/3 masquées ; 2 ans + dernier ok
    expect(computeAverageNFiscalYears(years, 5)).toBeNull()
    expect(computeAverageNFiscalYears(years, 3)).toBeNull()
    expect(computeAverageNFiscalYears(years, 2)).toBeCloseTo((100 + 70) / 2)
    expect(buildEbitdaSynthesisAverages(years).map((r) => [r.id, r.ebitda, r.revenue])).toEqual([
      ["avg-2y", (100 + 70) / 2, (1000 + 700) / 2],
      ["last-fy", 100, 1000],
    ])
    // Empty PEC with weight ignored in weighted average
    expect(computeWeightedAverageEBITDA(years)).toBeCloseTo((90 * 0.4 + 100 * 0.6) / 1.0)
  })

  it("keeps an empty BAIIA column when an adjustment creates a figure", () => {
    expect(
      isEbitdaColumnPopulated({
        revenue: 0,
        ebitda: 0,
        adjustedRevenue: 0,
        adjustedEBITDA: 12_000,
      }),
    ).toBe(true)
  })

  it("keeps a zero-BAIIA year when revenue is present", () => {
    expect(
      isEbitdaColumnPopulated({
        revenue: 500_000,
        ebitda: 0,
        adjustedRevenue: 500_000,
        adjustedEBITDA: 0,
      }),
    ).toBe(true)
  })

  it("migrates legacy year amount keys", () => {
    expect(migrateAdjustmentAmountKeys({ "2025": 10, pec: 5 })).toEqual({
      "fy-2025": 10,
      pec: 5,
    })
  })

  it("seeds EBITDA range ±10%", () => {
    const range = seedEbitdaRangeFromAverage(100)
    expect(range.low).toBe(90)
    expect(range.high).toBeCloseTo(110)
  })
})
