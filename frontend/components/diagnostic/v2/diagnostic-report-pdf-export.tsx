"use client"

import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildDiagnosticReportPrintUrl } from "@/lib/diagnostic-report-print"

interface DiagnosticReportViewButtonProps {
  diagnosticId: string
  companyId: string
  referenceYear: number
  referenceMonth: number
}

export function DiagnosticReportViewButton({
  diagnosticId,
  companyId,
  referenceYear,
  referenceMonth,
}: DiagnosticReportViewButtonProps) {
  const handleOpen = () => {
    const url = buildDiagnosticReportPrintUrl({
      diagnosticId,
      companyId,
      referenceYear,
      referenceMonth,
    })
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleOpen}
      data-testid="diagnostic-view-report"
      className="h-9 shrink-0 border-slate-200 bg-white text-xs font-medium text-[#2A2F3A] shadow-sm hover:bg-slate-50"
    >
      <FileText className="mr-1.5 h-3.5 w-3.5 text-[#E0742D]" aria-hidden />
      Visualiser le Rapport
    </Button>
  )
}

/** @deprecated Utiliser DiagnosticReportViewButton */
export const DiagnosticReportPdfExportButton = DiagnosticReportViewButton
