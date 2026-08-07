"use client"

import { useSearchParams } from "next/navigation"
import { CompanyReportPortalPage } from "@/components/diagnostic/diagnostic-portal-page"
import { useCompanies } from "@/hooks/use-companies"

export default function PilotageModulePortalPage() {
  const searchParams = useSearchParams()
  const companyIdFromUrl = searchParams.get("companyId")
  const { companies } = useCompanies()

  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null

  return <CompanyReportPortalPage lockedCompanyId={lockedCompanyId} moduleId="pilotage" />
}
