import type { CompanyReportModuleId } from "@/lib/company-report-module"
import { getCompanyReportModule } from "@/lib/company-report-module"
import type { DiagnosticReportPdfSection } from "@/lib/diagnostic-report-pdf-sections"

function sanitizeFilenameSegment(name: string): string {
  return name.replace(/[^\w\u00C0-\u024f.-]+/g, "-").replace(/-+/g, "-")
}

export function companyReportPdfFilename(
  moduleId: CompanyReportModuleId,
  params: {
    companyName: string
    referenceYear: number
    referenceMonth: number
  },
): string {
  const module = getCompanyReportModule(moduleId)
  const base = sanitizeFilenameSegment(params.companyName) || module.id
  const month = String(params.referenceMonth).padStart(2, "0")
  return `${module.pdfFilenamePrefix}-${base}-${params.referenceYear}-${month}.pdf`
}

/** @deprecated Utiliser companyReportPdfFilename */
export function diagnosticReportPdfFilename(params: {
  companyName: string
  referenceYear: number
  referenceMonth: number
}): string {
  return companyReportPdfFilename("diagnostic", params)
}

export function buildCompanyReportPrintUrl(
  moduleId: CompanyReportModuleId,
  params: {
    reportId: string
    companyId: string
    referenceYear: number
    referenceMonth: number
  },
): string {
  const module = getCompanyReportModule(moduleId)
  const qs = new URLSearchParams({
    [module.reportIdParam]: params.reportId,
    companyId: params.companyId,
    refYear: String(params.referenceYear),
    refMonth: String(params.referenceMonth),
  })
  return `${module.basePath}/report?${qs}`
}

/** @deprecated Utiliser buildCompanyReportPrintUrl */
export function buildDiagnosticReportPrintUrl(params: {
  diagnosticId: string
  companyId: string
  referenceYear: number
  referenceMonth: number
}): string {
  return buildCompanyReportPrintUrl("diagnostic", {
    reportId: params.diagnosticId,
    companyId: params.companyId,
    referenceYear: params.referenceYear,
    referenceMonth: params.referenceMonth,
  })
}

export function diagnosticReportSectionKey(section: DiagnosticReportPdfSection): string {
  return section.view
}

export function diagnosticReportSectionAnchorId(sectionKey: string): string {
  if (sectionKey.startsWith("report-chapter-")) return sectionKey
  const legacyMap: Record<string, string> = {
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
