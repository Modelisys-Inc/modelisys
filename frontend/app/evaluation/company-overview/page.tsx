"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import { DiagnosticCompanyOverviewSection } from "@/components/diagnostic/v2/diagnostic-company-overview-section"
import { useCompanies } from "@/hooks/use-companies"

export default function ValuationCompanyOverviewPage() {
  const searchParams = useSearchParams()
  const { companies } = useCompanies()

  const companyIdFromUrl = searchParams.get("companyId")
  const valuationId = searchParams.get("valuationId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null
  const companyId = lockedCompanyId || companies[0]?.id || null
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "Entreprise"
  const overviewScopeId = valuationId ?? companyId ?? "valuation-company-overview"

  const subtitle = useMemo(() => {
    const rm = searchParams.get("refMonth")
    const ry = searchParams.get("refYear")
    if (rm && ry) {
      return `Documentez le profil qualitatif de ${companyName} pour la valorisation (référence ${rm}/${ry}).`
    }
    return `Documentez le profil qualitatif de ${companyName} pour cadrer la valorisation.`
  }, [companyName, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-32">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6">
          <div className="mb-4 flex items-start">
            <div className="w-2 shrink-0" />
            <div className="flex-1">
              <ValuationPlanBackButton />
              <h1 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">
                Aperçu de l&apos;entreprise
              </h1>
              <p className="mb-6 mt-2 max-w-4xl text-base text-[#C9B8A5]/90">{subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-24 mb-12">
        <div className="mx-auto max-w-[1920px] px-6">
          <DiagnosticCompanyOverviewSection
            diagnosticId={overviewScopeId}
            companyName={companyName}
          />
        </div>
      </div>
    </div>
  )
}
