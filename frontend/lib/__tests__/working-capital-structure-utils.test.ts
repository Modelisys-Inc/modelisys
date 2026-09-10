import { describe, it, expect } from "vitest"
import {
  resolveWorkingCapitalStructureAmount,
  collectWorkingCapitalFormulaRefCodes,
  collectWorkingCapitalIncludedOperands,
  collectWorkingCapitalIncludedOperandsForDisplay,
  resolveWorkingCapitalOperandAmount,
  workingCapitalRowRefCode,
  normalizeWorkingCapitalDisplayFormat,
  resolveWorkingCapitalDisplayFormat,
  workingCapitalStructureViewRows,
} from "../working-capital-structure-utils"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { normalizeLiaisonMode, formatLiaisonCellHint } from "../income-statement-structure-utils"

const periods: SeriesPeriod[] = [{ fiscalYear: 2026, fiscalMonth: 1, label: "Jan 2026" }]

const bsRows: SeriesRow[] = [
  {
    id: "ACT-CA",
    linkCode: "ACT-CA",
    label: "Actifs courants",
    amounts: { "2026-1": 100 },
    isBold: false,
    isSection: false,
    isResult: false,
    detailRows: [],
  },
  {
    id: "PAS-CL",
    linkCode: "PAS-CL",
    label: "Passifs courants",
    amounts: { "2026-1": 25 },
    isBold: false,
    isSection: false,
    isResult: false,
    detailRows: [],
  },
]

const isRows: SeriesRow[] = [
  {
    id: "REV",
    linkCode: "REV",
    label: "Revenus",
    amounts: { "2026-1": 50 },
    isBold: false,
    isSection: false,
    isResult: false,
    detailRows: [],
  },
]

describe("normalizeLiaisonMode product/quotient", () => {
  it("recognizes product and quotient aliases", () => {
    expect(normalizeLiaisonMode({ liaisonMode: "multiplication" })).toBe("product")
    expect(normalizeLiaisonMode({ liaisonMode: "division" })).toBe("quotient")
  })

  it("formats product and quotient hints", () => {
    expect(
      formatLiaisonCellHint({
        liaisonMode: "product",
        liaisonSumCodes: ["A", "B"],
      }),
    ).toBe("Π 2 codes")
    expect(
      formatLiaisonCellHint({
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["A"],
        liaisonDenominatorCodes: ["B", "C"],
      }),
    ).toBe("N1 ÷ D2")
  })
})

describe("working capital view rows (separators / spacers)", () => {
  it("keeps empty spacer rows and separatorAbove for hors-Paramètres", () => {
    const structure = [
      {
        label: "FDR",
        defineMapping: true,
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["ACT-CA"],
        liaisonDenominatorCodes: ["PAS-CL"],
      },
      { label: "", separatorAbove: true },
      { label: "FdRHC", defineMapping: true, liaisonMode: "na", separatorAbove: true },
    ]
    const view = workingCapitalStructureViewRows(structure)
    expect(view.map((r) => r.kind)).toEqual([
      "metric",
      "separator",
      "spacer",
      "separator",
      "metric",
    ])
  })
})

describe("working capital display format", () => {
  it("normalizes $ / Nombre / % / Jours aliases", () => {
    expect(normalizeWorkingCapitalDisplayFormat("$")).toBe("currency")
    expect(normalizeWorkingCapitalDisplayFormat("Nombre")).toBe("number")
    expect(normalizeWorkingCapitalDisplayFormat("%")).toBe("percent")
    expect(normalizeWorkingCapitalDisplayFormat("Jours")).toBe("days")
    expect(normalizeWorkingCapitalDisplayFormat("ratio")).toBe("number")
    expect(normalizeWorkingCapitalDisplayFormat(undefined)).toBeNull()
  })

  it("defaults to currency when unset", () => {
    expect(resolveWorkingCapitalDisplayFormat({ label: "FDR" })).toBe("currency")
    expect(resolveWorkingCapitalDisplayFormat({ displayFormat: "percent" })).toBe("percent")
  })
})

describe("working capital formula refs", () => {
  it("publishes formula and mapped input row labels as selectable refs", () => {
    const structure = [
      {
        label: "FDR",
        defineMapping: true,
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["ACT-CA"],
        liaisonDenominatorCodes: ["PAS-CL"],
      },
      { label: "FDR / Revenus", defineMapping: true, liaisonMode: "na" },
    ]
    expect(workingCapitalRowRefCode(structure[0]!)).toBe("FDR")
    expect(workingCapitalRowRefCode(structure[1]!)).toBe("FDR / Revenus")
    expect(collectWorkingCapitalFormulaRefCodes(structure).codes).toEqual(["FDR", "FDR / Revenus"])
    expect(collectWorkingCapitalFormulaRefCodes(structure, "FDR").codes).toEqual(["FDR / Revenus"])
  })

  it("resolves FDR / REV using the FDR formula result", () => {
    const fdr = {
      label: "FDR",
      defineMapping: true,
      liaisonMode: "difference",
      liaisonNumeratorCodes: ["ACT-CA"],
      liaisonDenominatorCodes: ["PAS-CL"],
    }
    const ratio = {
      label: "FDR / Revenus",
      defineMapping: true,
      liaisonMode: "quotient",
      liaisonNumeratorCodes: ["FDR"],
      liaisonDenominatorCodes: ["REV"],
    }
    const structure = [fdr, ratio]
    expect(
      resolveWorkingCapitalStructureAmount(fdr, bsRows, isRows, periods, periods, 0, structure),
    ).toBe(75)
    expect(
      resolveWorkingCapitalStructureAmount(ratio, bsRows, isRows, periods, periods, 0, structure),
    ).toBe(1.5)
  })

  it("applies liaisonFactor on quotient (e.g. DSO × 365)", () => {
    const days = {
      label: "Délai clients",
      defineMapping: true,
      liaisonMode: "quotient",
      liaisonNumeratorCodes: ["ACT-CA"],
      liaisonDenominatorCodes: ["REV"],
      liaisonFactor: 365,
    }
    // 100 / 50 * 365 = 730 (single-month REV ≈ TTM)
    expect(
      resolveWorkingCapitalStructureAmount(days, bsRows, isRows, periods, periods, 0),
    ).toBe(730)
  })

  it("uses trailing 12 months for income-statement codes (REV), not a single month", () => {
    const isPeriods12: SeriesPeriod[] = Array.from({ length: 14 }, (_, i) => {
      const month = (i % 12) + 1
      const year = 2025 + Math.floor(i / 12)
      return { fiscalYear: year, fiscalMonth: month, label: `${month}/${year}` }
    })
    // Last 3 BS months align with end of IS series
    const bsPeriods3 = isPeriods12.slice(-3)
    const revAmounts: Record<string, number> = {}
    for (const p of isPeriods12) {
      // 10 per month → TTM at end = 120
      revAmounts[`${p.fiscalYear}-${p.fiscalMonth}`] = 10
    }
    const isRows12: SeriesRow[] = [
      {
        id: "REV",
        linkCode: "REV",
        label: "Revenus",
        amounts: revAmounts,
        isBold: false,
        isSection: false,
        isResult: false,
        detailRows: [],
      },
    ]
    const clientsAmounts: Record<string, number> = {}
    for (const p of bsPeriods3) {
      clientsAmounts[`${p.fiscalYear}-${p.fiscalMonth}`] = 240
    }
    const bsRows3: SeriesRow[] = [
      {
        id: "ACT-CA",
        linkCode: "ACT-CA",
        label: "Clients",
        amounts: clientsAmounts,
        isBold: false,
        isSection: false,
        isResult: false,
        detailRows: [],
      },
    ]
    const ratio = {
      label: "Clients / REV",
      defineMapping: true,
      liaisonMode: "quotient",
      liaisonNumeratorCodes: ["ACT-CA"],
      liaisonDenominatorCodes: ["REV"],
    }
    // At last BS period: clients 240 / REV TTM 120 = 2
    expect(
      resolveWorkingCapitalStructureAmount(
        ratio,
        bsRows3,
        isRows12,
        bsPeriods3,
        isPeriods12,
        bsPeriods3.length - 1,
      ),
    ).toBe(2)
    // Mid BS period (index 1): still TTM of 12 months ending at that aligned IS month = 120
    expect(
      resolveWorkingCapitalStructureAmount(
        ratio,
        bsRows3,
        isRows12,
        bsPeriods3,
        isPeriods12,
        1,
      ),
    ).toBe(2)
  })

  it("breaks cyclic formula refs without throwing", () => {
    const a = {
      label: "A",
      defineMapping: true,
      liaisonMode: "sum",
      liaisonSumCodes: ["B"],
    }
    const b = {
      label: "B",
      defineMapping: true,
      liaisonMode: "sum",
      liaisonSumCodes: ["A"],
    }
    expect(
      resolveWorkingCapitalStructureAmount(a, bsRows, isRows, periods, periods, 0, [a, b]),
    ).toBe(0)
  })
})

describe("resolveWorkingCapitalStructureAmount product/quotient", () => {
  it("multiplies codes from liaisonSumCodes", () => {
    const amount = resolveWorkingCapitalStructureAmount(
      {
        label: "Ratio",
        defineMapping: true,
        liaisonMode: "product",
        liaisonSumCodes: ["ACT-CA", "PAS-CL"],
      },
      bsRows,
      isRows,
      periods,
      periods,
      0,
    )
    expect(amount).toBe(2500)
  })

  it("divides numerator by denominator", () => {
    const amount = resolveWorkingCapitalStructureAmount(
      {
        label: "Ratio",
        defineMapping: true,
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["ACT-CA"],
        liaisonDenominatorCodes: ["PAS-CL"],
      },
      bsRows,
      isRows,
      periods,
      periods,
      0,
    )
    expect(amount).toBe(4)
  })

  it("returns 0 when denominator sums to zero", () => {
    const amount = resolveWorkingCapitalStructureAmount(
      {
        label: "Ratio",
        defineMapping: true,
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["ACT-CA"],
        liaisonDenominatorCodes: ["MISSING"],
      },
      bsRows,
      isRows,
      periods,
      periods,
      0,
    )
    expect(amount).toBe(0)
  })

  it("can multiply a BS code by an IS code", () => {
    const amount = resolveWorkingCapitalStructureAmount(
      {
        label: "Ratio",
        defineMapping: true,
        liaisonMode: "product",
        liaisonSumCodes: ["ACT-CA", "REV"],
      },
      bsRows,
      isRows,
      periods,
      periods,
      0,
    )
    expect(amount).toBe(5000)
  })
})

describe("collectWorkingCapitalIncludedOperands", () => {
  it("returns empty when liaison is n/a or mapping off", () => {
    expect(
      collectWorkingCapitalIncludedOperands({
        label: "X",
        defineMapping: true,
        liaisonMode: "na",
      }),
    ).toEqual([])
    expect(
      collectWorkingCapitalIncludedOperands({
        label: "X",
        defineMapping: false,
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["A"],
        liaisonDenominatorCodes: ["B"],
      }),
    ).toEqual([])
  })

  it("lists difference and quotient operands with signs", () => {
    expect(
      collectWorkingCapitalIncludedOperands({
        label: "FDR",
        defineMapping: true,
        liaisonMode: "difference",
        liaisonNumeratorCodes: ["ACT"],
        liaisonDenominatorCodes: ["PAS"],
      }),
    ).toEqual([
      { code: "ACT", role: "numerator", sign: "+" },
      { code: "PAS", role: "denominator", sign: "−" },
    ])
    expect(
      collectWorkingCapitalIncludedOperands({
        label: "DSO",
        defineMapping: true,
        liaisonMode: "quotient",
        liaisonNumeratorCodes: ["ACT"],
        liaisonDenominatorCodes: ["REV"],
      }),
    ).toEqual([
      { code: "ACT", role: "numerator", sign: "" },
      { code: "REV", role: "denominator", sign: "÷" },
    ])
  })

  it("lists single and sum operands", () => {
    expect(
      collectWorkingCapitalIncludedOperands({
        label: "Actifs",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "ACT-CA",
      }),
    ).toEqual([{ code: "ACT-CA", role: "term", sign: "" }])
    expect(
      collectWorkingCapitalIncludedOperands({
        label: "Total",
        defineMapping: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["A", "B"],
      }),
    ).toEqual([
      { code: "A", role: "term", sign: "+" },
      { code: "B", role: "term", sign: "+" },
    ])
  })
})

describe("collectWorkingCapitalIncludedOperandsForDisplay", () => {
  const bsRows: SeriesRow[] = [
    {
      id: "ALT-B",
      linkCode: "ALT-B",
      label: "Immobilisations corporelles",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2025-8": 500_000 },
      detailRows: [],
    },
    {
      id: "ALT-B.1",
      linkCode: "ALT-B.1",
      label: "Terrains",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2025-8": 200_000 },
      detailRows: [],
    },
    {
      id: "ALT-B.2",
      linkCode: "ALT-B.2",
      label: "Bâtisses",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2025-8": 300_000 },
      detailRows: [],
    },
  ]

  it("expands a single parent link code into child series rows", () => {
    expect(
      collectWorkingCapitalIncludedOperandsForDisplay(
        {
          label: "Immobilisations corporelles",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "ALT-B",
        },
        { bsRows, isRows: [] },
      ),
    ).toEqual([
      { code: "ALT-B.1", role: "term", sign: "" },
      { code: "ALT-B.2", role: "term", sign: "" },
    ])
  })

  it("keeps the parent code when no child rows exist", () => {
    expect(
      collectWorkingCapitalIncludedOperandsForDisplay(
        {
          label: "Encaisse",
          defineMapping: true,
          liaisonMode: "single",
          linkCode: "ENC",
        },
        { bsRows, isRows: [] },
      ),
    ).toEqual([{ code: "ENC", role: "term", sign: "" }])
  })
})

describe("resolveWorkingCapitalOperandAmount child rollup", () => {
  const periods: SeriesPeriod[] = [{ fiscalYear: 2025, fiscalMonth: 8, label: "Août 2025" }]

  const bsRows: SeriesRow[] = [
    {
      id: "ALT-B",
      linkCode: "ALT-B",
      label: "Immobilisations corporelles",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2025-8": 0 },
      detailRows: [],
    },
    {
      id: "ALT-B.1",
      linkCode: "ALT-B.1",
      label: "Terrains",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2025-8": 200_000 },
      detailRows: [],
    },
    {
      id: "ALT-B.2",
      linkCode: "ALT-B.2",
      label: "Bâtisses",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: { "2025-8": 300_000 },
      detailRows: [],
    },
  ]

  it("sums child balances when the parent code balance is zero", () => {
    expect(
      resolveWorkingCapitalOperandAmount("ALT-B", bsRows, [], periods, periods, 0),
    ).toBe(500_000)
  })

  it("keeps the parent balance when it is already non-zero", () => {
    const rowsWithParentTotal = [
      { ...bsRows[0]!, amounts: { "2025-8": 480_000 } },
      ...bsRows.slice(1),
    ]
    expect(
      resolveWorkingCapitalOperandAmount("ALT-B", rowsWithParentTotal, [], periods, periods, 0),
    ).toBe(480_000)
  })

  it("resolves single-code structure row total from child series balances", () => {
    const structure = [
      {
        label: "Immobilisations corporelles",
        defineMapping: true,
        liaisonMode: "single",
        linkCode: "ALT-B",
      },
    ]
    expect(
      resolveWorkingCapitalStructureAmount(
        structure[0]!,
        bsRows,
        [],
        periods,
        periods,
        0,
        structure,
      ),
    ).toBe(500_000)
  })
})
