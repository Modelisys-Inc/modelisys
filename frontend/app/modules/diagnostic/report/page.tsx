"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { DiagnosticReportPrintPageShell } from "@/components/diagnostic/diagnostic-report-print-page"

function DiagnosticReportRoutePageInner() {
  const searchParams = useSearchParams()
  const diagnosticId = searchParams.get("diagnosticId") ?? ""
  return <DiagnosticReportPrintPageShell reportId={diagnosticId} moduleId="diagnostic" />
}

/**
 * Route stable : /modules/diagnostic/report?diagnosticId=…
 */
export default function DiagnosticReportRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-600">
          Chargement…
        </div>
      }
    >
      <DiagnosticReportRoutePageInner />
    </Suspense>
  )
}
