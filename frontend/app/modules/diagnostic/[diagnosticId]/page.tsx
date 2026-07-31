"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { DiagnosticReportPage } from "@/components/diagnostic/diagnostic-report-page"
import { getDiagnostic } from "@/lib/diagnostic-registry"
import { Button } from "@/components/ui/button"

export default function DiagnosticReportRoutePage() {
  const params = useParams<{ diagnosticId: string }>()
  const diagnosticId = params.diagnosticId
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [referenceYear, setReferenceYear] = useState<number | null>(null)
  const [referenceMonth, setReferenceMonth] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const record = getDiagnostic(diagnosticId)
    if (!record) {
      setReady(true)
      return
    }
    setCompanyId(record.companyId)
    setReferenceYear(record.referenceYear)
    setReferenceMonth(record.referenceMonth)
    setReady(true)
  }, [diagnosticId])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Chargement…
      </div>
    )
  }

  if (!companyId || referenceYear == null || referenceMonth == null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <p className="text-sm text-slate-600">Ce diagnostic est introuvable ou a été supprimé.</p>
        <Button asChild className="bg-[#E0742D] text-white hover:bg-[#c96526]">
          <Link href="/modules/diagnostic">Retour aux diagnostics</Link>
        </Button>
      </div>
    )
  }

  return (
    <DiagnosticReportPage
      diagnosticId={diagnosticId}
      companyId={companyId}
      referenceYear={referenceYear}
      referenceMonth={referenceMonth}
    />
  )
}
