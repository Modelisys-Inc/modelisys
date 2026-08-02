import { describe, it, expect } from "vitest"
import {
  applyCapexCostDisplayMode,
  buildCapexOperandDisplayValues,
  capexOperandAmountAtPeriod,
  pickCapexDisplayValues,
  readCapexCostDisplayMode,
  readRowCapexCostDisplayMode,
  resolveCapexStructureAmountAtPeriod,
  structureRowConfigUsesCapexCostCodes,
  priorPeriodIndexForCapexVariation,
  pickCapexDisplayIndices,
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
    }
    expect(
      resolveCapexStructureAmountAtPeriod(row, 2, "variation", actual, 1),
    ).toBe(-10)
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
})
