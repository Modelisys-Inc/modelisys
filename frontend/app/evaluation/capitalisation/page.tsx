"use client"

import { useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanBackButton } from "@/components/valuation-plan-back-button"
import {
  dashboardCardAccentBarClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"
import { cn } from "@/lib/utils"

export default function ValuationCapitalisationPage() {
  const searchParams = useSearchParams()
  const refMonth = searchParams.get("refMonth")
  const refYear = searchParams.get("refYear")
  const referenceLabel =
    refMonth && refYear ? `Référence ${refMonth}/${refYear}` : "Date de référence de la valorisation"

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
              <h1 className="text-4xl font-semibold tracking-tight text-[#E6D6C3]">Capitalisation</h1>
              <p className="mb-6 mt-2 max-w-4xl text-base text-[#C9B8A5]/90">
                Estimez la valeur de l&apos;entreprise en capitalisant les revenus ou bénéfices normalisés.{" "}
                {referenceLabel}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-24 mb-12">
        <div className="mx-auto max-w-[1920px] px-6">
          <div className={cn(dashboardCardFrameStaticClass)}>
            <div className={dashboardCardRingClass} />
            <div className={cn(dashboardCardHeaderBarClass, "px-8 py-8")}>
              <div className="flex items-start gap-4">
                <div className={cn("h-12 w-1 shrink-0", dashboardCardAccentBarClass)} />
                <div>
                  <h2 className={cn(dashboardCardTitleClass, "text-2xl")}>Méthode de capitalisation</h2>
                  <p className={cn(dashboardCardBodyMutedClass, "mt-2 max-w-2xl text-sm leading-relaxed")}>
                    Cette étape sera bientôt disponible. Utilisez le plan de valorisation pour poursuivre avec le
                    multiplicateur ou l&apos;actualisation des flux.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
