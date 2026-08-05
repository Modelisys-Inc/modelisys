"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DiagnosticSkeleton } from "@/components/diagnostic/diagnostic-skeleton"
import { DiagnosticReportPrintView } from "@/components/diagnostic/diagnostic-report-print-view"
import { useCompanies } from "@/hooks/use-companies"
import { useCompanyDiagnostic } from "@/hooks/use-company-diagnostic"
import { getDiagnostic } from "@/lib/diagnostic-registry"
import { diagnosticReportPdfFilename } from "@/lib/diagnostic-report-print"
import "@/components/diagnostic/diagnostic-report-print.css"

export function DiagnosticReportPrintPageContent({
  diagnosticId,
}: {
  diagnosticId: string
}) {
  const searchParams = useSearchParams()

  const [companyId, setCompanyId] = useState<string | null>(null)
  const [referenceYear, setReferenceYear] = useState<number | null>(null)
  const [referenceMonth, setReferenceMonth] = useState<number | null>(null)
  const [resolved, setResolved] = useState(false)

  useEffect(() => {
    document.documentElement.classList.add("report-print-landscape")
    return () => document.documentElement.classList.remove("report-print-landscape")
  }, [])

  useEffect(() => {
    const record = getDiagnostic(diagnosticId)
    const qCompany = searchParams.get("companyId")
    const qYear = searchParams.get("refYear")
    const qMonth = searchParams.get("refMonth")

    if (record) {
      setCompanyId(record.companyId)
      setReferenceYear(record.referenceYear)
      setReferenceMonth(record.referenceMonth)
    } else if (qCompany && qYear && qMonth) {
      setCompanyId(qCompany)
      setReferenceYear(Number(qYear))
      setReferenceMonth(Number(qMonth))
    }
    setResolved(true)
  }, [diagnosticId, searchParams])

  const { companies } = useCompanies()
  const { data, loading, error } = useCompanyDiagnostic(
    companyId,
    referenceYear != null && referenceMonth != null
      ? { referenceYear, referenceMonth }
      : null,
  )

  useEffect(() => {
    if (!data) return
    const suggested = diagnosticReportPdfFilename({
      companyName: data.company_name,
      referenceYear: data.reference_period.calendar_year,
      referenceMonth: data.reference_period.calendar_month,
    })
    document.title = suggested.replace(/\.pdf$/i, "")
  }, [data])

  if (!diagnosticId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-sm text-slate-600">Identifiant de diagnostic manquant.</p>
        <Button asChild className="bg-[#E0742D] text-white hover:bg-[#c96526]">
          <Link href="/modules/diagnostic">Retour aux diagnostics</Link>
        </Button>
      </div>
    )
  }

  if (!resolved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-600">
        Chargement…
      </div>
    )
  }

  if (!companyId || referenceYear == null || referenceMonth == null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="text-sm text-slate-600">Ce rapport est introuvable ou a été supprimé.</p>
        <Button asChild className="bg-[#E0742D] text-white hover:bg-[#c96526]">
          <Link href="/modules/diagnostic">Retour aux diagnostics</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header
        data-testid="diagnostic-report-print-toolbar"
        className="diagnostic-report-print-toolbar sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-sm"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#2A2F3A]">Aperçu du rapport diagnostic</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Format <span className="font-medium">A4 paysage</span> — utilisez{" "}
              <span className="font-medium">Imprimer en PDF</span> puis « Enregistrer au format PDF ».
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!data || loading}
              onClick={() => window.print()}
              data-testid="diagnostic-report-print-button"
              className="bg-[#E0742D] text-white hover:bg-[#c96526]"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Imprimer en PDF
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.close()}>
              Fermer
            </Button>
          </div>
        </div>
      </header>

      <main className="diagnostic-report-print-preview">
        {loading ? <DiagnosticSkeleton /> : null}
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}
        {data && !loading && !error ? (
          <DiagnosticReportPrintView
            diagnostic={data}
            companyId={companyId}
            companies={companies}
            diagnosticId={diagnosticId}
          />
        ) : null}
      </main>
    </div>
  )
}

export function DiagnosticReportPrintPageShell({
  diagnosticId,
}: {
  diagnosticId: string
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-600">
          Chargement…
        </div>
      }
    >
      <DiagnosticReportPrintPageContent diagnosticId={diagnosticId} />
    </Suspense>
  )
}
