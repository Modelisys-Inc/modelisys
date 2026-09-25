"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { ProFormaFinancialImpactPanel } from "@/components/pro-forma-financial-impact-panel"
import {
  ExpenseHypothesisReport,
  type ExpenseHypothesisOverviewMetric,
} from "@/components/projections/expense-hypothesis-report"
import { useCompanies } from "@/hooks/use-companies"
import { useProjectedExpenseHypothesisYearTotals } from "@/hooks/use-projected-expense-hypothesis-year-totals"
import { getProjection, listProjections, type ProjectionData } from "@/lib/api"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import { projectionPlanBackHref } from "@/lib/projection-plan-registry"

const MONTH_NAMES_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

export default function ExpenseHypothesisPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { companies } = useCompanies()
  const [heroVisible, setHeroVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const planBackHref = projectionPlanBackHref(searchParams)

  const projectionId = searchParams.get("projectionId")
  const companyIdFromUrl = searchParams.get("companyId")

  const [projection, setProjection] = useState<ProjectionData | null>(null)
  const [ready, setReady] = useState(false)

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

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const load = async () => {
      if (!projectionId) {
        router.replace("/projections")
        return
      }
      try {
        if (companyIdFromUrl) {
          const record = await getProjection(companyIdFromUrl, projectionId)
          if (cancelled) return
          setProjection(record)
          setReady(true)
          return
        }
        for (const company of companies) {
          const list = await listProjections(company.id)
          const found = list.find((p) => p.id === projectionId)
          if (found) {
            if (cancelled) return
            setProjection(found)
            setReady(true)
            return
          }
        }
        if (!cancelled) router.replace("/projections")
      } catch {
        if (!cancelled) router.replace("/projections")
      }
    }

    if (companies.length === 0 && !companyIdFromUrl) return
    void load()
    return () => {
      cancelled = true
    }
  }, [projectionId, companies, router, companyIdFromUrl])

  const companyId = projection?.company_id ?? companyIdFromUrl
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "—"
  const fiscalYearEndMonth = parseFiscalYearEndMonth(
    companies.find((c) => c.id === companyId)?.fiscalYearEnd ?? "12-31",
  )

  const startMonth = projection?.start_month ?? new Date().getMonth() + 1
  const startYear = projection?.start_year ?? new Date().getFullYear()
  const projectionYears = (projection?.projection_years as 3 | 4 | 5) || 5
  const projectionMode = (projection?.projection_mode as "gl" | "account") || "account"

  const referenceLabel = useMemo(
    () => `${MONTH_NAMES_FR[startMonth - 1] ?? startMonth} ${startYear}`,
    [startMonth, startYear],
  )

  const { totals: expenseTotals } = useProjectedExpenseHypothesisYearTotals({
    companyId,
    projectionId: projection?.id,
    projectionYears,
    fiscalYear: startYear,
    divisionId: projection?.division_id,
    subDivisionId: projection?.sub_division_id,
    enabled: ready && !!companyId && !!projection,
    forecastActualLayout: "nMinusOne-and-ytd",
    refMonth: startMonth,
    fiscalYearEndMonth,
  })

  const overviewMetrics = useMemo((): ExpenseHypothesisOverviewMetric[] => {
    const reference = expenseTotals?.[0] ?? null
    const firstProjected = expenseTotals?.[1] ?? null
    return [
      {
        id: "reference",
        label: `Dépenses de référence (${startYear - 1})`,
        value: reference,
      },
      {
        id: "first-projected",
        label: `Dépenses projetées ${startYear}`,
        value: firstProjected,
      },
      {
        id: "year-2",
        label: `Dépenses projetées ${startYear + 1}`,
        value: expenseTotals?.[2] ?? null,
      },
    ]
  }, [expenseTotals, startYear])

  if (!ready || !projection) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <main className="w-full px-5 py-16 text-sm text-slate-600 sm:px-10">
          Chargement…
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <section ref={heroRef} className="relative overflow-hidden pb-40 pt-16 sm:pb-44 sm:pt-20">
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
          <div className="absolute right-[-5%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1a1f2a] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          <div
            className={`max-w-xl lg:max-w-[34rem] xl:max-w-[38rem] transition-all duration-1000 ${
              heroVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <Link
              href={planBackHref}
              data-testid="projection-plan-back-button"
              className="group inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              <ArrowLeft
                className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
              RETOUR AUX ÉTAPES
            </Link>

            <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70 sm:mt-8">
              Plan de projection
            </p>

            <h1 className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]">
              Hypothèses Dépenses
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Définissez le type (variable / fixe), la saisonnalité et les ajustements des dépenses
              projetées pour {companyName}.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#C9B8A5]/70">
              <div className="whitespace-nowrap">
                <span className="text-[#C9B8A5]/45">Entité</span>{" "}
                <span className="font-medium text-[#E6D6C3]/90">{companyName}</span>
              </div>
              <div className="hidden h-4 w-px bg-[#E6D6C3]/15 md:block" />
              <div className="whitespace-nowrap" data-testid="expense-hypothesis-reference-date">
                <span className="text-[#C9B8A5]/45">Date de référence</span>{" "}
                <span className="font-medium text-[#E6D6C3]/90">{referenceLabel}</span>
              </div>
              <div className="hidden h-4 w-px bg-[#E6D6C3]/15 md:block" />
              <div className="whitespace-nowrap">
                <span className="text-[#C9B8A5]/45">Scénario</span>{" "}
                <span className="font-medium text-[#E6D6C3]/90">{projection.name}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="relative -mt-32 mb-12 min-w-0">
        <div className="mx-auto flex max-w-[1920px] flex-col gap-6 px-5 sm:px-10 lg:flex-row lg:items-start lg:px-12 xl:px-16 2xl:px-20">
          <div className="min-w-0 flex-1">
            <ExpenseHypothesisReport
              companyName={companyName}
              referenceLabel={referenceLabel}
              projectionName={projection.name}
              overviewMetrics={overviewMetrics}
              companyId={companyId}
              divisionId={projection.division_id}
              subDivisionId={projection.sub_division_id}
              companies={companies}
              projectionYears={projectionYears}
              projectionMode={projectionMode}
              projectionId={projection.id}
              forecastBaseYear={startYear}
              referenceMonth={startMonth}
            />
          </div>
          <ProFormaFinancialImpactPanel
            companyId={companyId}
            projectionId={projection.id}
            projectionYears={projectionYears}
            forecastBaseYear={startYear}
            refMonth={startMonth}
            fiscalYearEndMonth={fiscalYearEndMonth}
            forecastActualLayout="nMinusOne-and-ytd"
          />
        </div>
      </main>
    </div>
  )
}
