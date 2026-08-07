"use client"

import { Suspense } from "react"
import { CompanyReportPrintPageShell } from "@/components/diagnostic/diagnostic-report-print-page"

export default function PilotageReportRoutePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-600">
          Chargement…
        </div>
      }
    >
      <CompanyReportPrintPageShell moduleId="pilotage" />
    </Suspense>
  )
}
