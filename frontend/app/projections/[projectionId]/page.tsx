"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Check, CircleDashed } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { ProjectionPlanTrajectory } from "@/components/projection-plan-trajectory"
import { Button } from "@/components/ui/button"
import { useCompanies } from "@/hooks/use-companies"
import { getProjection, listProjections, type ProjectionData } from "@/lib/api"
import {
  PROJECTION_PLAN_PHASES,
  PROJECTION_PLAN_SHELL_TABS,
  getProjectionPlanStepStatus,
  projectionPlanOverallProgressPercent,
  type ProjectionPlanPhase,
  type ProjectionPlanPhaseId,
  type ProjectionPlanShellTab,
} from "@/lib/projection-plan-phases"
import {
  getProjectionPlanCompletedSteps,
  markProjectionPlanStepComplete,
  projectionDashboardPath,
  projectionStatementPath,
  projectionToolPath,
} from "@/lib/projection-plan-registry"
import { cn } from "@/lib/utils"

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

function parseTab(raw: string | null): ProjectionPlanShellTab {
  if (
    raw === "resultats" ||
    raw === "bilan" ||
    raw === "tresorerie" ||
    raw === "sommaire"
  ) {
    return raw
  }
  return "parcours"
}

export default function ProjectionPlanDashboardPage() {
  const router = useRouter()
  const params = useParams<{ projectionId: string }>()
  const searchParams = useSearchParams()
  const { companies } = useCompanies()
  const projectionId = params.projectionId
  const tab = parseTab(searchParams.get("tab"))

  const [projection, setProjection] = useState<ProjectionData | null>(null)
  const [completedSteps, setCompletedSteps] = useState<ProjectionPlanPhaseId[]>([])
  const [ready, setReady] = useState(false)
  const [heroVisible, setHeroVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    setReady(false)

    const load = async () => {
      const companyIdHint = searchParams.get("companyId")
      try {
        if (companyIdHint) {
          const record = await getProjection(companyIdHint, projectionId)
          if (cancelled) return
          setProjection(record)
          setCompletedSteps(getProjectionPlanCompletedSteps(projectionId))
          setReady(true)
          return
        }
        for (const company of companies) {
          const list = await listProjections(company.id)
          const found = list.find((p) => p.id === projectionId)
          if (found) {
            if (cancelled) return
            setProjection(found)
            setCompletedSteps(getProjectionPlanCompletedSteps(projectionId))
            setReady(true)
            return
          }
        }
        if (!cancelled) router.replace("/projections")
      } catch {
        if (!cancelled) router.replace("/projections")
      }
    }

    if (companies.length === 0 && !searchParams.get("companyId")) return
    void load()
    return () => {
      cancelled = true
    }
  }, [projectionId, companies, router, searchParams])

  useEffect(() => {
    if (!ready) return
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
    if (!projection) return ""
    return companies.find((c) => c.id === projection.company_id)?.name || "Entreprise"
  }, [companies, projection])

  const hubHref = useMemo(() => {
    const companyId = searchParams.get("companyId") || projection?.company_id
    return companyId ? `/projections?companyId=${companyId}` : "/projections"
  }, [searchParams, projection?.company_id])

  const buildToolHref = useCallback(
    (phase: ProjectionPlanPhase) => {
      if (!projection) return "/projections/pro-forma"
      return projectionToolPath(projection.id, projection.company_id, phase)
    },
    [projection],
  )

  const handleMarkComplete = useCallback(
    (phaseId: ProjectionPlanPhaseId) => {
      const next = markProjectionPlanStepComplete(projectionId, phaseId)
      setCompletedSteps(next)
    },
    [projectionId],
  )

  const setTab = (next: ProjectionPlanShellTab) => {
    if (!projection) return
    if (next === "resultats") {
      router.push(projectionStatementPath(projection.id, projection.company_id, "income-statement"))
      return
    }
    if (next === "bilan") {
      router.push(projectionStatementPath(projection.id, projection.company_id, "balance-sheet"))
      return
    }
    if (next === "tresorerie") {
      router.push(projectionStatementPath(projection.id, projection.company_id, "cash-flow"))
      return
    }
    router.push(projectionDashboardPath(projection.id, projection.company_id, next))
  }

  if (!ready || !projection) {
    return (
      <div className="min-h-screen bg-slate-50">
        <DashboardHeader title="Modelisys" />
        <main className="w-full px-5 py-16 text-sm text-slate-600 sm:px-10">Chargement…</main>
      </div>
    )
  }

  const monthLabel =
    projection.start_month != null
      ? (MONTH_LABELS[projection.start_month - 1] ?? String(projection.start_month))
      : null
  const overallProgress = projectionPlanOverallProgressPercent(completedSteps)

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
            className={`max-w-3xl transition-all duration-1000 ${
              heroVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <Link
              href={hubHref}
              className="group inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden />
              RETOUR AUX PROJECTIONS
            </Link>

            <p className="mt-7 text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70 sm:mt-8">
              Tableau de bord
            </p>

            <h1
              className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]"
              data-testid="projection-dashboard-title"
            >
              {projection.name}
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Parcourez les hypothèses pour {companyName}
              {monthLabel && projection.start_year
                ? ` — référence ${monthLabel} ${projection.start_year}`
                : ""}
              . Complétez chaque étape pour avancer dans le parcours.
            </p>

            <nav
              className="mt-10 flex flex-wrap items-end gap-1 sm:mt-12"
              aria-label="Navigation projection"
              data-testid="projection-plan-shell-nav"
            >
              {PROJECTION_PLAN_SHELL_TABS.map((item) => {
                const isActive = tab === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    data-testid={`projection-plan-tab-${item.id}`}
                    className={cn(
                      "relative -mx-0.5 inline-block rounded-md px-3 py-1.5 pb-3 text-sm transition-colors",
                      isActive
                        ? "font-medium text-[#E6D6C3]"
                        : "font-normal text-[#C9B8A5]/85 hover:bg-white/5 hover:text-[#E6D6C3]",
                    )}
                  >
                    {item.label}
                    {isActive ? (
                      <div className="absolute bottom-0 left-0 right-0 z-10 h-0.5 bg-[#E0742D]" />
                    ) : null}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </section>

      <main className="relative -mt-32 mb-12">
        <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          {tab === "parcours" ? (
            <ProjectionPlanTrajectory
              completedSteps={completedSteps}
              buildToolHref={buildToolHref}
              onMarkComplete={handleMarkComplete}
            />
          ) : (
            <section
              className="overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]"
              data-testid="projection-plan-sommaire"
            >
              <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-8">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
                      Sommaire
                    </p>
                    <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#2A2F3A]">
                      Vue d&apos;ensemble de la projection
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      Avancement des hypothèses et accès rapide aux états pro forma.
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[1fr_1.2fr]">
                <div className="rounded-lg border border-[#E6D6C3]/50 bg-[#222732]/[0.02] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                    Avancement
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-[#2A2F3A]">
                    {overallProgress}
                    <span className="text-lg font-medium text-slate-500">%</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {completedSteps.length} / {PROJECTION_PLAN_PHASES.length} hypothèses
                    complétées
                  </p>
                  <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between gap-3">
                      <dt>Entreprise</dt>
                      <dd className="font-medium text-[#2A2F3A]">{companyName}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Horizon</dt>
                      <dd className="font-medium text-[#2A2F3A]">
                        {projection.projection_years} ans
                      </dd>
                    </div>
                    {monthLabel && projection.start_year ? (
                      <div className="flex justify-between gap-3">
                        <dt>Date de référence</dt>
                        <dd className="font-medium text-[#2A2F3A]">
                          {monthLabel} {projection.start_year}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                <div>
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                    Étapes
                  </p>
                  <ul className="space-y-2">
                    {PROJECTION_PLAN_PHASES.map((phase, index) => {
                      const status = getProjectionPlanStepStatus(phase.id, completedSteps)
                      return (
                        <li
                          key={phase.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {status === "completed" ? (
                              <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                            ) : (
                              <CircleDashed
                                className="h-4 w-4 shrink-0 text-slate-400"
                                aria-hidden
                              />
                            )}
                            <span className="truncate text-sm font-medium text-[#2A2F3A]">
                              <span className="mr-2 font-mono text-xs text-[#E0742D]">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              {phase.label}
                            </span>
                          </div>
                          <Button asChild size="sm" variant="ghost" className="shrink-0 text-slate-600">
                            <Link href={buildToolHref(phase)}>Ouvrir</Link>
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
