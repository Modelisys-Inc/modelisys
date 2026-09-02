"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanTrajectory } from "@/components/valuation-plan-trajectory"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/hooks/use-companies"
import type { ValuationPlanPhase } from "@/lib/valuation-plan-phases"
import {
  getValuation,
  markValuationPlanStepComplete,
  touchValuation,
  valuationToolPath,
  type ValuationRecord,
} from "@/lib/valuation-registry"

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
]

export default function ValuationDashboardPage() {
  const router = useRouter()
  const params = useParams<{ valuationId: string }>()
  const searchParams = useSearchParams()
  const { companies } = useCompanies()
  const valuationId = params.valuationId

  const [valuation, setValuation] = useState<ValuationRecord | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const record = getValuation(valuationId)
    if (!record) {
      router.replace("/evaluation")
      return
    }
    const touched = touchValuation(valuationId) ?? record
    setValuation(touched)
    setReady(true)
  }, [valuationId, router])

  const companyName = useMemo(() => {
    if (!valuation) return ""
    return companies.find((c) => c.id === valuation.companyId)?.name || valuation.companyName
  }, [companies, valuation])

  const hubHref = useMemo(() => {
    const companyId = searchParams.get("companyId") || valuation?.companyId
    return companyId ? `/evaluation?companyId=${companyId}` : "/evaluation"
  }, [searchParams, valuation?.companyId])

  const buildToolHref = useCallback(
    (phase: ValuationPlanPhase) => {
      if (!valuation) return phase.href
      return valuationToolPath(valuation, phase.href)
    },
    [valuation],
  )

  const handleMarkComplete = useCallback(
    (phaseId: Parameters<typeof markValuationPlanStepComplete>[1]) => {
      const updated = markValuationPlanStepComplete(valuationId, phaseId)
      if (updated) setValuation(updated)
    },
    [valuationId],
  )

  if (!ready || !valuation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
        <DashboardHeader title="Modelisys" />
        <main className="w-full px-6 py-16 text-sm text-slate-600">Chargement…</main>
      </div>
    )
  }

  const monthLabel = MONTH_LABELS[valuation.referenceMonth - 1] ?? String(valuation.referenceMonth)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-40">
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
          <div className="mb-8 flex items-start gap-3">
            <div className="w-2" />
            <div className="flex-1">
              <Button
                asChild
                variant="ghost"
                className="mb-4 -ml-3 h-9 px-3 text-[#C9B8A5]/90 hover:bg-white/5 hover:text-[#E6D6C3]"
              >
                <Link href={hubHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  Retour aux valorisations
                </Link>
              </Button>

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]">
                Tableau de bord
              </p>
              <h1
                className="mb-2 text-4xl font-semibold tracking-tight text-[#E6D6C3]"
                data-testid="valuation-dashboard-title"
              >
                {valuation.title}
              </h1>
              <p className="mb-6 max-w-4xl text-base text-[#C9B8A5]/90">
                Parcourez le plan de valorisation pour {companyName} — référence {monthLabel}{" "}
                {valuation.referenceYear}. Complétez chaque étape pour avancer dans le parcours.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-white/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1920px] px-6 py-8">
        <div className="relative -mt-28">
          <ValuationPlanTrajectory
            completedSteps={valuation.completedPlanSteps}
            buildToolHref={buildToolHref}
            onMarkComplete={handleMarkComplete}
          />
        </div>
      </main>
    </div>
  )
}
