import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import { diagnosticReportViewLabel } from "@/lib/diagnostic-report-chapters"

export type DiagnosticReportPdfSection =
  | { kind: "executive-summary"; title: "Sommaire exécutif" }
  | { kind: "chart"; view: DiagnosticReportView; title: string }

const CHART_VIEWS = [
  "performance",
  "revenue",
  "margin-by-revenue",
  "expenses",
  "expenses-by-division",
  "financial-position",
  "working-capital",
  "capex",
] as const satisfies readonly Exclude<DiagnosticReportView, "sommaire" | "company-overview">[]

/** Sections du menu Rapport (Sommaire exécutif → Fonds de roulement). */
export const DIAGNOSTIC_REPORT_PDF_SECTIONS: DiagnosticReportPdfSection[] = [
  { kind: "executive-summary", title: "Sommaire exécutif" },
  ...CHART_VIEWS.map((view) => ({
    kind: "chart" as const,
    view,
    title: diagnosticReportViewLabel(view),
  })),
]
