import { describe, it, expect } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  applyCapexCostDisplayMode,
  baiiaTtmAtBalancePeriod,
  buildCapexAlignedPeriodValues,
  buildCapexOperandDisplayValues,
  buildCapexRowDisplayValues,
  capexSeriesValueAt,
  capexOperandAmountAtPeriod,
  capexRatioPercent,
  collectOperatingCashFlowLinkCodes,
  isCapexAutoComputedRow,
  isCapexAutoRatioRow,
  isCapexBaiiaMetricRow,
  isCapexBaiiaRatioRow,
  isCapexHeadlineRow,
  isCapexNumeratorSourceRow,
  isCapexOperatingCashFlowMetricRow,
  isCapexRevenueRatioRow,
  isCapexOperatingCashFlowRatioRow,
  normalizeCapexAutoRatioRow,
  operatingCashFlowTtmAtBalancePeriod,
  pickCapexDisplayValues,
  readCapexCostDisplayMode,
  readRowCapexCostDisplayMode,
  resolveCapexStructureAmountAtPeriod,
  structureRowConfigUsesCapexCostCodes,
  structureRowShowsCapexCostDisplaySelector,
  priorPeriodIndexForCapexVariation,
  pickCapexDisplayIndices,
  sumCapexDisplaySeries,
} from "../capex-analysis-settings"

describe("capex analysis settings", () => {
  it("reads per-row cost display mode with legacy global fallback", () => {
    const structure = [
      { id: "row-1", label: "Immobilisations", linkCode: "ALT-B", capexCostDisplayMode: "variation" },
      { id: "__capex_settings__", hidden: true, capexCostDisplayMode: "actual" },
    ]
    expect(readRowCapexCostDisplayMode(structure[0]!, structure)).toBe("variation")
    expect(readRowCapexCostDisplayMode({ label: "Sans mode" }, structure)).toBe("actual")
    expect(readCapexCostDisplayMode(structure)).toBe("actual")
    expect(structureRowConfigUsesCapexCostCodes({ linkCode: "ALT-C" })).toBe(true)
    expect(structureRowConfigUsesCapexCostCodes({ linkCode: "REV" })).toBe(false)
  })

  it("shows Coût ALT selector when Code is enabled before liaison is configured", () => {
    expect(
      structureRowShowsCapexCostDisplaySelector({
        defineMapping: true,
        liaisonMode: "single",
      }),
    ).toBe(true)
    expect(
      structureRowShowsCapexCostDisplaySelector({
        defineMapping: true,
        linkCode: "REV",
        liaisonMode: "single",
      }),
    ).toBe(false)
  })

  it("shows Coût ALT for quotient rows with ALT numerator and hides for REV-only rows", () => {
    expect(
      structureRowShowsCapexCostDisplaySelector({
        defineMapping: true,
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["ALT-B", "ALT-C", "ALT-D"],
        liaisonDenominatorCodes: ["REV"],
      }),
    ).toBe(true)
    expect(
      structureRowConfigUsesCapexCostCodes({
        defineMapping: true,
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["ALT-B", "ALT-C", "ALT-D"],
        liaisonDenominatorCodes: ["REV"],
      }),
    ).toBe(true)
    expect(
      structureRowShowsCapexCostDisplaySelector({
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "REV",
      }),
    ).toBe(false)
  })

  it("computes operand variation as real N minus real N-1", () => {
    const actual = (code: string, index: number) => {
      if (code === "ALT-B.1") return [100, 150, 120][index] ?? 0
      return 0
    }
    expect(capexOperandAmountAtPeriod("ALT-B.1", 2, "variation", actual, 1)).toBe(-30)
    expect(capexOperandAmountAtPeriod("ALT-B.1", 2, "actual", actual)).toBe(120)
    expect(capexOperandAmountAtPeriod("REV", 2, "variation", actual, 1)).toBe(0)
  })

  it("uses prior year same month for variation in years view", () => {
    const periods = [
      { fiscalYear: 2025, fiscalMonth: 8, label: "Août 2025" },
      { fiscalYear: 2026, fiscalMonth: 8, label: "Août 2026" },
    ]
    const indices = pickCapexDisplayIndices(periods.length, "years", 2, periods, 8, 2026)
    expect(priorPeriodIndexForCapexVariation(indices, 1, indices[1]!, "years")).toBe(indices[0])
    const actual = (code: string, index: number) =>
      code === "ALT-B" ? [4_080_000, 4_320_000][index] ?? 0 : 0
    expect(
      buildCapexOperandDisplayValues(
        "ALT-B",
        "variation",
        "years",
        2,
        periods.length,
        actual,
        periods,
        8,
        2026,
      ),
    ).toEqual([0, 240_000])
  })

  it("sums operand variations for structure rows in variation mode", () => {
    const actual = (code: string, index: number) => {
      const series =
        code === "ALT-B.1"
          ? [100, 150, 120]
          : code === "ALT-B.2"
            ? [50, 60, 80]
            : [0, 0, 0]
      return series[index] ?? 0
    }
    const row = {
      label: "Immobilisations",
      defineMapping: true,
      liaisonMode: "sum",
      liaisonSumCodes: ["ALT-B.1", "ALT-B.2"],
      capexCostDisplayMode: "variation",
    }
    expect(
      resolveCapexStructureAmountAtPeriod(row, 2, "variation", actual, 1),
    ).toBe(-10)
  })

  it("computes Capex / Revenus as variation numerator over actual denominator", () => {
    const actual = (code: string, index: number) => {
      if (code === "ALT-B") return [1_000_000, 1_260_000][index] ?? 0
      if (code === "REV") return 14_349_511
      return 0
    }
    const row = {
      label: "Capex / Revenus",
      defineMapping: true,
      liaisonMode: "quotient",
      liaisonNumeratorCodes: ["ALT-B"],
      liaisonDenominatorCodes: ["REV"],
      capexCostDisplayMode: "variation",
    }
    const ratio = 260_000 / 14_349_511
    expect(resolveCapexStructureAmountAtPeriod(row, 1, "variation", actual, 0)).toBeCloseTo(
      ratio,
      10,
    )
  })

  it("builds row display from capex structure resolver not ratio delta", () => {
    const actual = (code: string, index: number) => {
      if (code === "ALT-B") return [1_000_000, 1_260_000, 1_200_000][index] ?? 0
      if (code === "REV") return 14_349_511
      return 0
    }
    const row = {
      label: "Capex / Revenus",
      defineMapping: true,
      liaisonMode: "quotient",
      liaisonNumeratorCodes: ["ALT-B"],
      liaisonDenominatorCodes: ["REV"],
      displayFormat: "percent",
      capexCostDisplayMode: "variation",
    }
    const resolveAtPeriod = (
      structureRow: Record<string, unknown>,
      periodIndex: number,
      priorPeriodIndex?: number,
    ) => {
      const raw =
        resolveCapexStructureAmountAtPeriod(
          structureRow,
          periodIndex,
          "variation",
          actual,
          priorPeriodIndex,
        ) ?? 0
      return raw * 100
    }
    const values = buildCapexRowDisplayValues(
      row,
      "variation",
      "current",
      0,
      3,
      actual,
      resolveAtPeriod,
      [
        { fiscalYear: 2026, fiscalMonth: 6, label: "Juin" },
        { fiscalYear: 2026, fiscalMonth: 7, label: "Juillet" },
        { fiscalYear: 2026, fiscalMonth: 8, label: "Août" },
      ],
      8,
      2026,
    )
    expect(values[0]).toBeCloseTo((-60_000 / 14_349_511) * 100, 2)
    expect(values[1]).toBeCloseTo((260_000 / 14_349_511) * 100, 2)
  })

  it("computes variation as N minus N-1 on series", () => {
    expect(applyCapexCostDisplayMode([100, 150, 120], "variation")).toEqual([0, 50, -30])
    const periods = [
      { fiscalYear: 2026, fiscalMonth: 6, label: "Juin 2026" },
      { fiscalYear: 2026, fiscalMonth: 7, label: "Juillet 2026" },
      { fiscalYear: 2026, fiscalMonth: 8, label: "Août 2026" },
    ]
    expect(pickCapexDisplayValues([100, 150, 120], "variation", "current", 0)).toEqual([
      -30, 50,
    ])
    expect(pickCapexDisplayIndices(periods.length, "years", 1, periods, 8, 2026)).toEqual([2])
  })

  it("identifies auto-computed Capex ratio rows and strips liaison", () => {
    expect(isCapexHeadlineRow({ label: "Capex" })).toBe(true)
    expect(isCapexHeadlineRow({ label: "Capex / BAIIA" })).toBe(false)
    expect(isCapexBaiiaRatioRow({ label: "Capex / BAIIA" })).toBe(true)
    expect(
      isCapexOperatingCashFlowRatioRow({
        label: "Capex / Flux de trésorerie - Exploitation",
      }),
    ).toBe(true)
    expect(
      isCapexOperatingCashFlowRatioRow({
        label: "Capex / Flux de trésorerie liés aux opérations",
      }),
    ).toBe(true)
    expect(isCapexAutoRatioRow({ label: "Capex / Revenus" })).toBe(false)
    expect(isCapexBaiiaMetricRow({ label: "BAIIA" })).toBe(true)
    expect(isCapexBaiiaMetricRow({ label: "Capex / BAIIA" })).toBe(false)
    expect(
      isCapexOperatingCashFlowMetricRow({
        label: "Flux de trésorerie - Exploitation",
      }),
    ).toBe(true)
    expect(
      isCapexOperatingCashFlowMetricRow({
        label: "Capex / Flux de trésorerie - Exploitation",
      }),
    ).toBe(false)
    expect(isCapexAutoComputedRow({ label: "BAIIA" })).toBe(true)
    expect(
      structureRowShowsCapexCostDisplaySelector({
        label: "Capex / BAIIA",
        defineMapping: true,
      }),
    ).toBe(false)

    const normalized = normalizeCapexAutoRatioRow({
      label: "Capex / BAIIA",
      defineMapping: true,
      liaisonMode: "na",
      displayFormat: "percent",
    })
    expect(normalized.defineMapping).toBe(false)
    expect(normalized.liaisonMode).toBeUndefined()
    expect(normalizeCapexAutoRatioRow({ label: "BAIIA" }).displayFormat).toBe("currency")
  })

  it("uses TTM BAIIA and Sommaire TEX for auto ratio denominators", () => {
    const periods: SeriesPeriod[] = [
      { fiscalYear: 2026, fiscalMonth: 6, label: "Juin 2026" },
      { fiscalYear: 2026, fiscalMonth: 7, label: "Juillet 2026" },
      { fiscalYear: 2026, fiscalMonth: 8, label: "Août 2026" },
    ]
    const baiiaRow: SeriesRow = {
      id: "baiia",
      label: "BAIIA",
      isBold: true,
      isSection: false,
      isResult: true,
      amounts: { "2026-6": 10, "2026-7": 20, "2026-8": 30 },
      detailRows: [],
    }
    expect(baiiaTtmAtBalancePeriod([baiiaRow], periods, periods, 2)).toBe(60)
    expect(capexRatioPercent(12, 60)).toBe(20)

    const cfStructure = [
      { label: "Trésorerie - Exploitation", isSection: true, isBold: true },
      { label: "Exploitation", linkCode: "TEX-A", showInSummary: true },
      { label: "Détail enfant", linkCode: "TEX-A.1", showInSummary: true },
      { label: "Investissement", linkCode: "TIN-A", showInSummary: true },
    ]
    expect(collectOperatingCashFlowLinkCodes(cfStructure, [])).toEqual(["TEX-A.1"])

    const texRow: SeriesRow = {
      id: "TEX-A.1",
      linkCode: "TEX-A.1",
      label: "Exploitation",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2026-6": 4, "2026-7": 5, "2026-8": 6 },
      detailRows: [],
    }
    expect(
      operatingCashFlowTtmAtBalancePeriod([texRow], periods, cfStructure, periods, 2),
    ).toBe(15)
    expect(capexRatioPercent(3, 15)).toBe(20)
  })

  it("aligns auto ratios on the same year snapshots as Capex / Revenus", () => {
    expect(
      isCapexNumeratorSourceRow({
        label: "Biens loués - Location acquisition",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "ALT-B",
        capexCostDisplayMode: "variation",
      }),
    ).toBe(true)
    expect(
      isCapexNumeratorSourceRow({
        label: "Immobilisations corporelles",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "ALT-B",
        capexCostDisplayMode: "actual",
      }),
    ).toBe(false)
    expect(isCapexNumeratorSourceRow({ label: "BAIIA" })).toBe(false)
    expect(isCapexRevenueRatioRow({ label: "Capex / Chiffre d'affaires" })).toBe(true)
    expect(
      isCapexNumeratorSourceRow({
        label: "Capex / Revenus",
        defineMapping: true,
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["ALT-B"],
        liaisonDenominatorCodes: ["REV"],
        displayFormat: "percent",
      }),
    ).toBe(false)

    const periods: SeriesPeriod[] = [
      { fiscalYear: 2024, fiscalMonth: 12, label: "Décembre 2024" },
      { fiscalYear: 2025, fiscalMonth: 12, label: "Décembre 2025" },
      { fiscalYear: 2026, fiscalMonth: 8, label: "Août 2026" },
    ]
    const alt = [1_000_000, 1_260_000, 1_200_000]
    const baiiaTtm = [10_000_000, 12_000_000, 14_349_511]
    const capexSeries = buildCapexAlignedPeriodValues(
      "years",
      3,
      periods.length,
      periods,
      8,
      2026,
      12,
      (periodIndex, displayIdx, indices) => {
        const priorIdx = priorPeriodIndexForCapexVariation(
          indices,
          displayIdx,
          periodIndex,
          "years",
        )
        const actual = alt[periodIndex] ?? 0
        if (priorIdx < 0) return 0
        return actual - (alt[priorIdx] ?? 0)
      },
    )
    const baiiaSeries = buildCapexAlignedPeriodValues(
      "years",
      3,
      periods.length,
      periods,
      8,
      2026,
      12,
      (periodIndex) => baiiaTtm[periodIndex] ?? 0,
    )
    expect(capexSeries).toEqual([0, 260_000, -60_000])
    expect(baiiaSeries).toEqual([10_000_000, 12_000_000, 14_349_511])
    expect(capexRatioPercent(capexSeries[1]!, baiiaSeries[1]!)).toBeCloseTo(
      (260_000 / 12_000_000) * 100,
      10,
    )
    expect(capexRatioPercent(capexSeries[2]!, baiiaSeries[2]!)).toBeCloseTo(
      (-60_000 / 14_349_511) * 100,
      10,
    )
    expect(sumCapexDisplaySeries([capexSeries, [1, 2, 3]])).toEqual([1, 260_002, -59_997])
    expect(capexSeriesValueAt(capexSeries, "years", false, 2)).toBe(-60_000)
  })
})
