"use client"

import { useParams } from "next/navigation"
import { CompanyReportRoutePage } from "@/components/diagnostic/company-report-route-page"

export default function DiagnosticReportRoutePage() {
  const params = useParams<{ diagnosticId: string }>()
  return <CompanyReportRoutePage moduleId="diagnostic" reportId={params.diagnosticId} />
}
