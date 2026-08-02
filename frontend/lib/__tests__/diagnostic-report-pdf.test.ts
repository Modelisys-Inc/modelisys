import { describe, expect, it } from "vitest"
import {
  buildDiagnosticReportPrintUrl,
  diagnosticReportPdfFilename,
  diagnosticReportSectionAnchorId,
} from "@/lib/diagnostic-report-print"
import { DIAGNOSTIC_REPORT_CHAPTERS } from "@/lib/diagnostic-report-chapters"

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
    expect(diagnosticReportSectionAnchorId("executive-summary")).toBe(
      "report-chapter-executive-global",
    )
    expect(diagnosticReportSectionAnchorId("working-capital")).toBe(
      "report-chapter-working-capital",
    )
    expect(diagnosticReportSectionAnchorId("valorisation")).toBe("report-chapter-valuation")
  })
})

describe("DIAGNOSTIC_REPORT_CHAPTERS", () => {
  it("covers major consulting chapters including capex, cashflow and valuation", () => {
    const ids = DIAGNOSTIC_REPORT_CHAPTERS.map((c) => c.id)
    expect(ids).toContain("executive-global")
    expect(ids).toContain("performance")
    expect(ids).toContain("revenue")
    expect(ids).toContain("expenses")
    expect(ids).toContain("financial-position")
    expect(ids).toContain("working-capital")
    expect(ids).toContain("capex")
    expect(ids).toContain("cashflow")
    expect(ids).toContain("valuation")
    expect(DIAGNOSTIC_REPORT_CHAPTERS.filter((c) => c.introPage).length).toBeGreaterThanOrEqual(8)
  })
})
