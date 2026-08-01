import { describe, expect, it } from "vitest"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { buildWorkingCapitalDiagnosticResult } from "@/lib/working-capital-diagnostic"
import { buildWorkingCapitalDiagnosticNarrative } from "@/lib/working-capital-diagnostic-narrative"
import { buildWorkingCapitalDiagnosticBreakdownTables } from "@/lib/working-capital-diagnostic-breakdown"

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

describe("buildWorkingCapitalDiagnosticNarrative", () => {
  it("returns lecture du fonds de roulement title", () => {
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
    const narrative = buildWorkingCapitalDiagnosticNarrative(result!, "years")
    expect(narrative?.title).toBe("Lecture du fonds de roulement")
    expect(narrative?.paragraphs.some((p) => p.heading === "Fonds de roulement")).toBe(true)
  })
})

describe("buildWorkingCapitalDiagnosticBreakdownTables", () => {
  it("builds indicator tables keyed by metric heading", () => {
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
    const tables = buildWorkingCapitalDiagnosticBreakdownTables({
      result: result!,
      bsRows,
      isRows,
      bsPeriods: periods,
      isPeriods: periods,
      structure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    expect(tables?.has("Fonds de roulement")).toBe(true)
    expect(tables?.get("Fonds de roulement")?.metrics[0]?.detailRows?.length).toBeGreaterThan(0)
  })
})
