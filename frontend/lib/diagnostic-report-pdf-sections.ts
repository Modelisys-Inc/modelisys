import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import { diagnosticReportViewLabel } from "@/lib/diagnostic-report-chapters"

export type DiagnosticReportPdfSection = {
  kind: "chart"
  view: DiagnosticReportView
  title: string
}

const CHART_VIEWS = [
  "performance",
  "revenue",
  "margin-by-revenue",
  "expenses",
  "expenses-by-division",
  "financial-position",
  "working-capital",
  "capex",
] as const satisfies readonly Exclude<DiagnosticReportView, "company-overview">[]

/** Sections du menu Rapport (Performance financière → Fonds de roulement). */
export const DIAGNOSTIC_REPORT_PDF_SECTIONS: DiagnosticReportPdfSection[] = CHART_VIEWS.map((view) => ({
  kind: "chart" as const,
  view,
  title: diagnosticReportViewLabel(view),
}))
