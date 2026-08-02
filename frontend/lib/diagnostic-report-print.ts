import type { DiagnosticReportPdfSection } from "@/lib/diagnostic-report-pdf-sections"

function sanitizeFilenameSegment(name: string): string {
  return name.replace(/[^\w\u00C0-\u024f.-]+/g, "-").replace(/-+/g, "-")
}

export function diagnosticReportPdfFilename(params: {
  companyName: string
  referenceYear: number
  referenceMonth: number
}): string {
  const base = sanitizeFilenameSegment(params.companyName) || "diagnostic"
  const month = String(params.referenceMonth).padStart(2, "0")
  return `Diagnostic-${base}-${params.referenceYear}-${month}.pdf`
}

export function buildDiagnosticReportPrintUrl(params: {
  diagnosticId: string
  companyId: string
  referenceYear: number
  referenceMonth: number
}): string {
  const qs = new URLSearchParams({
    diagnosticId: params.diagnosticId,
    companyId: params.companyId,
    refYear: String(params.referenceYear),
    refMonth: String(params.referenceMonth),
  })
  return `/modules/diagnostic/report?${qs}`
}

export function diagnosticReportSectionKey(section: DiagnosticReportPdfSection): string {
  return section.kind === "executive-summary" ? "executive-summary" : section.view
}

export function diagnosticReportSectionAnchorId(sectionKey: string): string {
  if (sectionKey.startsWith("report-chapter-")) return sectionKey
  const legacyMap: Record<string, string> = {
    "executive-summary": "executive-global",
    performance: "performance",
    revenue: "revenue",
    "margin-by-revenue": "revenue",
    expenses: "expenses",
    "expenses-by-division": "expenses",
    "financial-position": "financial-position",
    "working-capital": "working-capital",
    valorisation: "valuation",
    valuation: "valuation",
    capex: "capex",
    cashflow: "cashflow",
  }
  const chapterId = legacyMap[sectionKey] ?? sectionKey
  return `report-chapter-${chapterId}`
}
