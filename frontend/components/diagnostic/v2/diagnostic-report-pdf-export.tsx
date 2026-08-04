"use client"

import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildDiagnosticReportPrintUrl } from "@/lib/diagnostic-report-print"

interface DiagnosticReportViewButtonProps {
  diagnosticId: string
  companyId: string
  referenceYear: number
  referenceMonth: number
  variant?: "default" | "portal"
}

export function DiagnosticReportViewButton({
  diagnosticId,
  companyId,
  referenceYear,
  referenceMonth,
  variant = "default",
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
      variant={variant === "portal" ? "default" : "outline"}
      size={variant === "portal" ? "default" : "sm"}
      onClick={handleOpen}
      data-testid="diagnostic-view-report"
      className={
        variant === "portal"
          ? "h-10 shrink-0 bg-[#E0742D] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#c96526]"
          : "h-9 shrink-0 border-slate-200 bg-white text-xs font-medium text-[#2A2F3A] shadow-sm hover:bg-slate-50"
      }
    >
      <FileText
        className={
          variant === "portal"
            ? "mr-2 h-4 w-4 text-white"
            : "mr-1.5 h-3.5 w-3.5 text-[#E0742D]"
        }
        aria-hidden
      />
      Visualiser le Rapport
    </Button>
  )
}

/** @deprecated Utiliser DiagnosticReportViewButton */
export const DiagnosticReportPdfExportButton = DiagnosticReportViewButton
