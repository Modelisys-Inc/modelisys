import { describe, expect, it } from "vitest"
import { formatReportSectionMeta } from "@/components/diagnostic/diagnostic-format"
import {
  buildDiagnosticReportPrintUrl,
  diagnosticReportPdfFilename,
  diagnosticReportSectionAnchorId,
} from "@/lib/diagnostic-report-print"
import {
  DIAGNOSTIC_PRINT_ANALYSES,
  DIAGNOSTIC_REPORT_CHAPTERS,
  reportAnalysisAnchorId,
  reportAnalysisDisplayTitle,
  reportAnalysisViewLabel,
} from "@/lib/diagnostic-report-chapters"

describe("formatReportSectionMeta", () => {
  it("formats the report section subtitle with reference date", () => {
    expect(formatReportSectionMeta("ManuFAC", 2026, 12, "CAD")).toBe(
      "ManuFAC · Diagnostic financier · 31 Décembre 2026 · CAD",
    )
  })

  it("utilise le libellé Rapport de performance pour le pilotage", () => {
    expect(formatReportSectionMeta("ManuFAC", 2026, 12, "CAD", "pilotage")).toBe(
      "ManuFAC · Rapport de performance · 31 Décembre 2026 · CAD",
    )
  })
})

describe("diagnosticReportPdfFilename", () => {
  it("builds a sanitized filename", () => {
    expect(
      diagnosticReportPdfFilename({
        companyName: "ManuFAC Croissance",
        referenceYear: 2026,
        referenceMonth: 7,
      }),
    ).toBe("Diagnostic-ManuFAC-Croissance-2026-07.pdf")
  })
})

describe("buildDiagnosticReportPrintUrl", () => {
  it("builds the report preview route with query params", () => {
    expect(
      buildDiagnosticReportPrintUrl({
        diagnosticId: "abc-123",
        companyId: "co-1",
        referenceYear: 2026,
        referenceMonth: 7,
      }),
    ).toBe("/modules/diagnostic/report?diagnosticId=abc-123&companyId=co-1&refYear=2026&refMonth=7")
  })
})

describe("diagnosticReportSectionAnchorId", () => {
  it("builds stable chapter anchors for TOC links", () => {
    expect(diagnosticReportSectionAnchorId("performance")).toBe("report-chapter-performance")
    expect(diagnosticReportSectionAnchorId("working-capital")).toBe(
      "report-chapter-working-capital",
    )
    expect(diagnosticReportSectionAnchorId("capex")).toBe("report-chapter-capex")
  })
})

describe("reportAnalysisAnchorId", () => {
  it("builds stable intro and chart anchors", () => {
    expect(reportAnalysisAnchorId("performance", "intro")).toBe("report-performance-intro")
    expect(reportAnalysisAnchorId("performance", "chart")).toBe("report-performance-chart")
    expect(reportAnalysisAnchorId("margin-by-revenue", "intro")).toBe("report-margin-by-revenue-intro")
  })
})

describe("reportAnalysisViewLabel", () => {
  it("uses analysis titles aligned with the report menu and table of contents", () => {
    expect(reportAnalysisViewLabel("revenue")).toBe("Analyse des revenus")
    expect(reportAnalysisViewLabel("margin-by-revenue")).toBe("Marge par revenus")
    expect(reportAnalysisViewLabel("expenses")).toBe("Analyse des dépenses")
    expect(reportAnalysisViewLabel("expenses-by-division")).toBe("Analyse des divisions")
  })
})

describe("reportAnalysisDisplayTitle", () => {
  it("matches the view label for printed analyses", () => {
    for (const analysis of DIAGNOSTIC_PRINT_ANALYSES) {
      expect(reportAnalysisDisplayTitle(analysis)).toBe(reportAnalysisViewLabel(analysis.viewId))
    }
  })
})

describe("DIAGNOSTIC_PRINT_ANALYSES", () => {
  it("defines an intro page for each printed analysis", () => {
    expect(DIAGNOSTIC_PRINT_ANALYSES.length).toBeGreaterThanOrEqual(8)
    for (const analysis of DIAGNOSTIC_PRINT_ANALYSES) {
      expect(analysis.intro.title.length).toBeGreaterThan(0)
      expect(analysis.intro.description.length).toBeGreaterThan(20)
    }
  })
})

describe("DIAGNOSTIC_REPORT_CHAPTERS", () => {
  it("covers performance through capex only (no valuation or cashflow)", () => {
    const ids = DIAGNOSTIC_REPORT_CHAPTERS.map((c) => c.id)
    expect(ids).toContain("performance")
    expect(ids).toContain("revenue")
    expect(ids).toContain("expenses")
    expect(ids).toContain("financial-position")
    expect(ids).toContain("working-capital")
    expect(ids).toContain("capex")
    expect(ids).not.toContain("executive-global")
    expect(ids).not.toContain("cashflow")
    expect(ids).not.toContain("valuation")
    expect(DIAGNOSTIC_REPORT_CHAPTERS.every((c) => !c.introPage)).toBe(true)
  })
})
