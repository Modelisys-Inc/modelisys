"use client"

import { useParams } from "next/navigation"
import { CompanyReportRoutePage } from "@/components/diagnostic/company-report-route-page"

export default function PilotageReportRoutePage() {
  const params = useParams<{ pilotageId: string }>()
  return <CompanyReportRoutePage moduleId="pilotage" reportId={params.pilotageId} />
}
