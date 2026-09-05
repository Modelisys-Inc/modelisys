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
  computeCharacteristicCashFlows,
  computeWorkingCapitalAdjustment,
  deriveCharacteristicCashFlowRange,
  DEFAULT_CHARACTERISTIC_CASH_FLOW,
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

  it("computes characteristic cash flows from BAIIA − tax − WC − maintenance capex", () => {
    const cf = computeCharacteristicCashFlows(800_000, 1_200_000, {
      taxRate: 25,
      workingCapitalLow: 50_000,
      workingCapitalHigh: 50_000,
      workingCapitalMid: 50_000,
      maintenanceCapexLow: 20_000,
      maintenanceCapexHigh: 40_000,
      maintenanceCapexMid: 30_000,
    })
    expect(cf.low.baiia).toBe(800_000)
    expect(cf.low.tax).toBe(200_000)
    expect(cf.low.afterTax).toBe(600_000)
    // afterTax − WC − capex = 600k − 50k − 20k
    expect(cf.low.characteristicCashFlow).toBe(530_000)
    expect(cf.high.maintenanceCapex).toBe(40_000)
    expect(cf.high.characteristicCashFlow).toBe(810_000)
    expect(cf.mid.baiia).toBe(1_000_000)
    expect(cf.mid.characteristicCashFlow).toBe(670_000)
    expect(DEFAULT_CHARACTERISTIC_CASH_FLOW.taxRate).toBe(26.5)
  })

  it("subtracts FDR adjustment from characteristic cash flow", () => {
    const cf = computeCharacteristicCashFlows(800_000, 800_000, {
      taxRate: 0,
      workingCapitalLow: 162_350,
      workingCapitalHigh: 162_350,
      workingCapitalMid: 162_350,
      maintenanceCapexLow: 0,
      maintenanceCapexHigh: 0,
      maintenanceCapexMid: 0,
    })
    expect(cf.low.workingCapital).toBe(162_350)
    expect(cf.low.characteristicCashFlow).toBe(800_000 - 162_350)
  })

  it("computes FDR adjustment as FDR% × (Revenus × croissance)", () => {
    const detail = computeWorkingCapitalAdjustment(1_000_000, 2, 15)
    // 1M × 2% = 20_000 ; 15% × 20_000 = 3_000
    expect(detail.fdrGrowthEstimate).toBe(20_000)
    expect(detail.adjustment).toBe(3_000)
  })

  it("derives characteristic cash flows from ebitda-multiple-config + FDR %", () => {
    const range = deriveCharacteristicCashFlowRange(
      {
        lowEBITDARange: 800_000,
        highEBITDARange: 1_200_000,
        lowRevenueRange: 1_000_000,
        highRevenueRange: 1_000_000,
        cashFlowTaxRate: 25,
        cashFlowEconomicGrowth: 2,
        cashFlowMaintenanceCapexLow: 20_000,
        cashFlowMaintenanceCapexHigh: 40_000,
      },
      15,
    )
    // WC = 1M × 2% × 15% = 3_000 ; mid capex = 30_000
    // low: 800k − 200k − 3k − 20k = 577k
    expect(range).not.toBeNull()
    expect(range!.low).toBe(577_000)
    expect(range!.high).toBe(1_200_000 * 0.75 - 3_000 - 40_000)
  })
})
