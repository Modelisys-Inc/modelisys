import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"

export type DiagnosticReportPdfSection =
  | { kind: "executive-summary"; title: "Sommaire exécutif" }
  | { kind: "chart"; view: DiagnosticReportView; title: string }

/** Sections du menu Rapport (Sommaire exécutif → Fonds de roulement). */
export const DIAGNOSTIC_REPORT_PDF_SECTIONS: DiagnosticReportPdfSection[] = [
  { kind: "executive-summary", title: "Sommaire exécutif" },
  { kind: "chart", view: "performance", title: "Performance financière" },
  { kind: "chart", view: "revenue", title: "Revenus" },
  { kind: "chart", view: "margin-by-revenue", title: "Marge par Revenus" },
  { kind: "chart", view: "expenses", title: "Dépenses" },
  { kind: "chart", view: "expenses-by-division", title: "Divisions" },
  { kind: "chart", view: "financial-position", title: "Situation financière" },
  { kind: "chart", view: "working-capital", title: "Fonds de roulement" },
  { kind: "chart", view: "capex", title: "Capex" },
]
