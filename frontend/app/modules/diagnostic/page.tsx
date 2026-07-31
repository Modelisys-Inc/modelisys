"use client"

import { useSearchParams } from "next/navigation"
import { DiagnosticPortalPage } from "@/components/diagnostic/diagnostic-portal-page"
import { useCompanies } from "@/hooks/use-companies"

/**
 * Portail Diagnostic : liste / création des diagnostics pour la société courante (`?companyId=`).
 * Même principe que `/projections?companyId=…`.
 */
export default function DiagnosticModulePortalPage() {
  const searchParams = useSearchParams()
  const companyIdFromUrl = searchParams.get("companyId")
  const { companies } = useCompanies()

  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null

  return <DiagnosticPortalPage lockedCompanyId={lockedCompanyId} />
}
