"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { DiagnosticReportPage } from "@/components/diagnostic/diagnostic-report-page"
import { getCompanyReport } from "@/lib/company-report-registry"
import {
  companyReportPortalPath,
  getCompanyReportModule,
  type CompanyReportModuleId,
} from "@/lib/company-report-module"
import { Button } from "@/components/ui/button"

export function CompanyReportRoutePage({
  moduleId,
  reportId,
}: {
  moduleId: CompanyReportModuleId
  reportId: string
}) {
  const module = getCompanyReportModule(moduleId)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [referenceYear, setReferenceYear] = useState<number | null>(null)
  const [referenceMonth, setReferenceMonth] = useState<number | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const record = getCompanyReport(moduleId, reportId)
    if (!record) {
      setReady(true)
      return
    }
    setCompanyId(record.companyId)
    setReferenceYear(record.referenceYear)
    setReferenceMonth(record.referenceMonth)
    setReady(true)
  }, [moduleId, reportId])

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
        <p className="text-sm text-slate-600">{module.notFoundMessage}</p>
        <Button asChild className="bg-[#E0742D] text-white hover:bg-[#c96526]">
          <Link href={companyReportPortalPath(module, companyId)}>{module.notFoundBackLabel}</Link>
        </Button>
      </div>
    )
  }

  return (
    <DiagnosticReportPage
      reportId={reportId}
      companyId={companyId}
      referenceYear={referenceYear}
      referenceMonth={referenceMonth}
      moduleId={moduleId}
    />
  )
}
