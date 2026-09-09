"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { ValuationPlanTrajectory } from "@/components/valuation-plan-trajectory"
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
  const [heroVisible, setHeroVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeroVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => {
      if (heroRef.current) observer.unobserve(heroRef.current)
    }
  }, [ready])

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
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <main className="w-full px-5 py-16 text-sm text-slate-600 sm:px-10">Chargement…</main>
      </div>
    )
  }

  const monthLabel = MONTH_LABELS[valuation.referenceMonth - 1] ?? String(valuation.referenceMonth)

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <section ref={heroRef} className="relative overflow-hidden pb-40 pt-16 sm:pt-20 sm:pb-44">
        <div className="pointer-events-none absolute inset-0 bg-[#222732]">
          <div
            className="absolute inset-0 opacity-[0.4]"
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
                linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
            }}
          />
          <div className="absolute -top-32 left-[-10%] h-[34rem] w-[34rem] rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
          <div className="absolute top-1/3 right-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1a1f2a] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          <div
            className={`max-w-xl lg:max-w-[34rem] xl:max-w-[38rem] transition-all duration-1000 ${
              heroVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <Link
              href={hubHref}
              className="group inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden />
              RETOUR AUX VALORISATIONS
            </Link>

            <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70 sm:mt-8">
              Tableau de bord
            </p>

            <h1
              className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]"
              data-testid="valuation-dashboard-title"
            >
              {valuation.title}
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Parcourez le plan de valorisation pour {companyName} — référence {monthLabel}{" "}
              {valuation.referenceYear}. Complétez chaque étape pour avancer dans le parcours.
            </p>
          </div>
        </div>
      </section>

      <main className="relative -mt-32 mb-12">
        <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
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
