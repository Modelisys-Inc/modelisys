import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { buildWorkingCapitalDiagnosticResult } from "@/lib/working-capital-diagnostic"
import { buildWorkingCapitalDiagnosticNarrative } from "@/lib/working-capital-diagnostic-narrative"
import { buildWorkingCapitalCompositionResult } from "@/lib/working-capital-composition"
import { buildWorkingCapitalCompositionBreakdownTables } from "@/lib/working-capital-composition-breakdown"
import { buildWorkingCapitalDiagnosticBreakdownTables } from "@/lib/working-capital-diagnostic-breakdown"
import { metricHeading } from "@/lib/working-capital-diagnostic"

const periods: SeriesPeriod[] = [
  { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
  { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
]

const bsRows: SeriesRow[] = [
  {
    id: "ACT",
    linkCode: "ACT",
    label: "Actif à court terme",
    amounts: { "2024-12": 100_000, "2025-12": 120_000 },
    isBold: false,
    isSection: true,
    isResult: false,
    detailRows: [],
  },
  {
    id: "PCT",
    linkCode: "PCT",
    label: "Passif à court terme",
    amounts: { "2024-12": 25_000, "2025-12": 30_000 },
    isBold: false,
    isSection: true,
    isResult: false,
    detailRows: [],
  },
]

const isRows: SeriesRow[] = [
  {
    id: "REV",
    linkCode: "REV",
    label: "Revenus",
    amounts: { "2024-12": 400_000, "2025-12": 500_000 },
    isBold: false,
    isSection: false,
    isResult: false,
    detailRows: [],
  },
]

const structure = [
  {
    label: "FDR",
    defineMapping: true,
    liaisonMode: "difference",
    liaisonNumeratorCodes: ["ACT"],
    liaisonDenominatorCodes: ["PCT"],
    displayFormat: "currency",
  },
  {
    label: "FdRHC",
    defineMapping: true,
    liaisonMode: "difference",
    liaisonNumeratorCodes: ["ACT"],
    liaisonDenominatorCodes: ["PCT"],
    displayFormat: "currency",
  },
  {
    label: "DSO",
    defineMapping: true,
    liaisonMode: "quotient",
    liaisonNumeratorCodes: ["ACT"],
    liaisonDenominatorCodes: ["REV"],
    liaisonFactor: 365,
    displayFormat: "days",
  },
  {
    label: "Rotation des stocks",
    defineMapping: true,
    liaisonMode: "quotient",
    liaisonNumeratorCodes: ["ACT"],
    liaisonDenominatorCodes: ["REV"],
    liaisonFactor: 365,
    displayFormat: "days",
  },
  {
    label: "DPO",
    defineMapping: true,
    liaisonMode: "quotient",
    liaisonNumeratorCodes: ["PCT"],
    liaisonDenominatorCodes: ["REV"],
    liaisonFactor: 365,
    displayFormat: "days",
  },
  {
    label: "CCC",
    defineMapping: true,
    liaisonMode: "difference",
    liaisonNumeratorCodes: ["DSO", "Rotation des stocks"],
    liaisonDenominatorCodes: ["DPO"],
    displayFormat: "days",
  },
]

const compositionStructure = [
  ...structure.slice(0, 2),
  {
    label: "Comptes clients en % des revenus",
    defineMapping: true,
    liaisonMode: "quotient",
    liaisonNumeratorCodes: ["ACT"],
    liaisonDenominatorCodes: ["REV"],
    liaisonFactor: 100,
    displayFormat: "percent",
  },
  {
    label: "Stocks en % des revenus",
    defineMapping: true,
    liaisonMode: "quotient",
    liaisonNumeratorCodes: ["ACT"],
    liaisonDenominatorCodes: ["REV"],
    liaisonFactor: 100,
    displayFormat: "percent",
  },
  {
    label: "Créditeurs en % des revenus",
    defineMapping: true,
    liaisonMode: "quotient",
    liaisonNumeratorCodes: ["PCT"],
    liaisonDenominatorCodes: ["REV"],
    liaisonFactor: 100,
    displayFormat: "percent",
  },
  {
    label: "Créditeurs en % des dépenses",
    defineMapping: true,
    liaisonMode: "quotient",
    liaisonNumeratorCodes: ["PCT"],
    liaisonDenominatorCodes: ["REV"],
    liaisonFactor: 100,
    displayFormat: "percent",
  },
]

describe("buildWorkingCapitalDiagnosticResult", () => {
  it("builds FDR and cycle metrics from WC structure", () => {
    const result = buildWorkingCapitalDiagnosticResult({
      bsRows,
      bsPeriods: periods,
      isRows,
      isPeriods: periods,
      structure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })

    expect(result?.points).toHaveLength(5)
    expect(result?.points[0]?.period).toBe("2025")
    expect(result?.points[0]?.fdr).toBe(90_000)
    expect(result?.points[0]?.dso).toBeGreaterThan(0)
    expect(result?.points[0]?.ccc).toBeDefined()
  })

  it("uses ACT/PCT link codes for FDR when structure rows are in mode na", () => {
    const naStructure = [
      { label: "FDR", defineMapping: true, liaisonMode: "na", displayFormat: "currency" },
    ]
    const actPctBsRows: SeriesRow[] = [
      {
        id: "ACT",
        linkCode: "ACT",
        label: "Actif CT",
        amounts: { "2025-12": 120_000 },
        isBold: false,
        isSection: false,
        isResult: false,
        detailRows: [],
      },
      {
        id: "PCT",
        linkCode: "PCT",
        label: "Passif CT",
        amounts: { "2025-12": 30_000 },
        isBold: false,
        isSection: false,
        isResult: false,
        detailRows: [],
      },
    ]
    const result = buildWorkingCapitalDiagnosticResult({
      bsRows: actPctBsRows,
      bsPeriods: [{ fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" }],
      isRows: [],
      isPeriods: [],
      structure: naStructure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    expect(result?.points[0]?.fdr).toBe(90_000)
  })
})

describe("buildWorkingCapitalDiagnosticResult with long structure labels", () => {
  const longLabelStructure = structure.map((row) => ({
    ...row,
    label:
      row.label === "DSO"
        ? "DSO — Délai de recouvrement clients"
        : row.label === "DIO"
          ? "DIO — Rotation des stocks"
          : row.label === "DPO"
            ? "DPO — Délai de paiement fournisseurs"
            : row.label === "CCC"
              ? "CCC — Cycle de conversion de trésorerie"
              : row.label,
  }))

  it("resolves DSO/DIO/DPO/CCC when labels include descriptive suffixes", () => {
    const result = buildWorkingCapitalDiagnosticResult({
      bsRows,
      bsPeriods: periods,
      isRows,
      isPeriods: periods,
      structure: longLabelStructure.map((row) =>
        row.label === "CCC — Cycle de conversion de trésorerie"
          ? { ...row, liaisonMode: "na" }
          : row,
      ),
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })

    expect(result?.points[0]?.dso).toBeGreaterThan(0)
    expect(result?.points[0]?.dio).toBeGreaterThan(0)
    expect(result?.points[0]?.dpo).toBeGreaterThan(0)
    expect(Math.abs(result?.points[0]?.ccc ?? 0)).toBeGreaterThan(0)
  })
})

describe("buildWorkingCapitalCompositionResult", () => {
  it("builds composition ratios from structure", () => {
    const result = buildWorkingCapitalCompositionResult({
      bsRows,
      bsPeriods: periods,
      isRows,
      isPeriods: periods,
      structure: compositionStructure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })

    expect(result?.configuredMetrics).toContain("arRevPct")
    expect(result?.points[0]?.arRevPct).toBeGreaterThan(0)
  })
})

describe("buildWorkingCapitalDiagnosticNarrative", () => {
  it("returns evolution-focused lecture for FDR, cycle metrics and revenue share ratios", () => {
    const fdrResult = buildWorkingCapitalDiagnosticResult({
      bsRows,
      bsPeriods: periods,
      isRows,
      isPeriods: periods,
      structure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const compositionResult = buildWorkingCapitalCompositionResult({
      bsRows,
      bsPeriods: periods,
      isRows,
      isPeriods: periods,
      structure: compositionStructure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const narrative = buildWorkingCapitalDiagnosticNarrative({
      fdrResult: fdrResult!,
      compositionResult,
      view: "years",
      bsRows,
      isRows,
      bsPeriods: periods,
      isPeriods: periods,
      structure: compositionStructure,
      refMonth: 12,
      refYear: 2025,
    })
    expect(narrative?.title).toBe("Lecture du fonds de roulement")
    expect(narrative?.subtitle).toContain("cinq exercices")
    expect(narrative?.paragraphs.some((p) => p.heading === "FDR / Revenus")).toBe(true)
    expect(narrative?.paragraphs.some((p) => p.heading === "Délai de collection des clients")).toBe(
      true,
    )
    expect(narrative?.paragraphs.some((p) => p.heading === "Structure en % des revenus")).toBe(true)
    expect(narrative?.paragraphs.some((p) => p.heading === "Comptes clients en % des revenus")).toBe(
      true,
    )
    expect(narrative?.paragraphs.every((p) => p.section === "working-capital")).toBe(true)
    expect(narrative?.paragraphs.some((p) => p.statsLine?.includes("Moyenne"))).toBe(true)
  })
})

describe("buildWorkingCapitalCompositionBreakdownTables", () => {
  it("builds evolution tables keyed by composition metric heading", () => {
    const compositionResult = buildWorkingCapitalCompositionResult({
      bsRows,
      bsPeriods: periods,
      isRows,
      isPeriods: periods,
      structure: compositionStructure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const tables = buildWorkingCapitalCompositionBreakdownTables({
      result: compositionResult!,
      bsRows,
      isRows,
      bsPeriods: periods,
      isPeriods: periods,
      structure: compositionStructure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    expect(tables?.has("Comptes clients en % des revenus")).toBe(true)
    expect(
      tables?.get("Comptes clients en % des revenus")?.metrics[0]?.detailRows?.length,
    ).toBeGreaterThan(0)
  })

  it("masque les opérandes entièrement à zéro dans le détail", () => {
    const structureWithZeroOperand = [
      {
        label: "FDR",
        defineMapping: true,
        liaisonMode: "sum",
        liaisonSumCodes: ["ACT", "ALT"],
        displayFormat: "currency",
      },
      ...structure.slice(1),
    ]
    const bsWithAlt: SeriesRow[] = [
      ...bsRows,
      {
        id: "ALT",
        linkCode: "ALT",
        label: "Actif long terme",
        amounts: { "2024-12": 0, "2025-12": 0 },
        isBold: false,
        isSection: true,
        isResult: false,
        detailRows: [],
      },
    ]
    const diagnosticResult = buildWorkingCapitalDiagnosticResult({
      bsRows: bsWithAlt,
      bsPeriods: periods,
      isRows,
      isPeriods: periods,
      structure: structureWithZeroOperand,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    expect(diagnosticResult).not.toBeNull()

    const tables = buildWorkingCapitalDiagnosticBreakdownTables({
      result: diagnosticResult!,
      bsRows: bsWithAlt,
      isRows,
      bsPeriods: periods,
      isPeriods: periods,
      structure: structureWithZeroOperand,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const fdrTable = tables?.get(metricHeading("fdr"))
    const operandIds = fdrTable?.metrics[0]?.detailRows?.map((row) => row.id) ?? []
    expect(operandIds).toContain("fdr-ACT")
    expect(operandIds).not.toContain("fdr-ALT")
  })
})
