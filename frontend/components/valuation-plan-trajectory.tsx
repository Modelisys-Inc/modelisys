"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowRight, Check, Circle, CircleDashed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  VALUATION_PLAN_PHASES,
  getValuationPlanStepStatus,
  normalizeCompletedPlanSteps,
  valuationPlanCompletedCount,
  valuationPlanOverallProgressPercent,
  type ValuationPlanPhase,
  type ValuationPlanPhaseId,
  type ValuationPlanStepStatus,
} from "@/lib/valuation-plan-phases"

const STATUS_CONFIG: Record<
  ValuationPlanStepStatus,
  { label: string; badgeClass: string; dotClass: string; cardClass: string }
> = {
  completed: {
    label: "Terminé",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dotClass: "bg-emerald-500 text-white",
    cardClass: "border-emerald-200/80 bg-emerald-50/30",
  },
  in_progress: {
    label: "En cours",
    badgeClass: "bg-[#E0742D]/10 text-[#c96526] ring-[#E0742D]/25",
    dotClass: "bg-[#E0742D] text-white ring-4 ring-[#E0742D]/20",
    cardClass: "border-[#E0742D]/35 bg-white shadow-md shadow-[#E0742D]/8 ring-1 ring-[#E0742D]/15",
  },
  pending: {
    label: "À faire",
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-500/15",
    dotClass: "bg-white text-slate-400 ring-2 ring-slate-200",
    cardClass: "border-slate-200/90 bg-slate-50/50",
  },
}

type ValuationPlanTrajectoryProps = {
  completedSteps?: readonly ValuationPlanPhaseId[]
  buildToolHref: (phase: ValuationPlanPhase) => string
  onMarkComplete?: (phaseId: ValuationPlanPhaseId) => void
  className?: string
}

function StepNodeIcon({ status }: { status: ValuationPlanStepStatus }) {
  if (status === "completed") {
    return <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
  }
  if (status === "in_progress") {
    return <Circle className="h-2.5 w-2.5 fill-current" aria-hidden />
  }
  return <CircleDashed className="h-4 w-4" aria-hidden />
}

export function ValuationPlanTrajectory({
  completedSteps = [],
  buildToolHref,
  onMarkComplete,
  className,
}: ValuationPlanTrajectoryProps) {
  const normalizedCompletedSteps = useMemo(
    () => normalizeCompletedPlanSteps(completedSteps),
    [completedSteps],
  )
  const completedCount = valuationPlanCompletedCount(normalizedCompletedSteps)
  const totalSteps = VALUATION_PLAN_PHASES.length
  const overallProgress = valuationPlanOverallProgressPercent(normalizedCompletedSteps)
  const allComplete = completedCount >= totalSteps

  return (
    <section className={cn("w-full", className)} aria-label="Plan de valorisation">
      <div className="w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <div className="border-b border-slate-200/90 bg-gradient-to-r from-white via-slate-50/80 to-white px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E0742D]">
                Plan de valorisation
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                Progression du parcours
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                {allComplete
                  ? "Toutes les étapes sont complétées."
                  : `${completedCount} sur ${totalSteps} étapes complétées — poursuivez là où vous vous êtes arrêté.`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                {overallProgress}
                <span className="text-lg font-medium text-slate-500">%</span>
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Avancement global</p>
            </div>
          </div>

          <div className="mt-5" data-testid="valuation-plan-progress-bar">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className="h-full rounded-full bg-[#E0742D] transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="hidden border-b border-slate-100 px-8 py-6 xl:block">
          <div className="relative">
            <div
              className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200"
              aria-hidden
            />
            <div
              className="absolute left-0 top-5 h-0.5 bg-[#E0742D] transition-all duration-500"
              style={{
                width: `${totalSteps > 1 ? (completedCount / (totalSteps - 1)) * 100 : 0}%`,
              }}
              aria-hidden
            />
            <ol
              className="relative grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6"
              data-testid="valuation-plan-phases"
            >
              {VALUATION_PLAN_PHASES.map((phase, index) => {
                const status = getValuationPlanStepStatus(phase.id, normalizedCompletedSteps)
                const config = STATUS_CONFIG[status]
                return (
                  <li
                    key={phase.id}
                    className="flex flex-col items-center text-center"
                    data-testid={`valuation-plan-phase-${phase.id}`}
                  >
                    <span
                      className={cn(
                        "relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-all",
                        config.dotClass,
                      )}
                    >
                      <StepNodeIcon status={status} />
                    </span>
                    <span className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Étape {index + 1}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-[#2A2F3A]">{phase.label}</span>
                    <span
                      className={cn(
                        "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                        config.badgeClass,
                      )}
                    >
                      {config.label}
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {VALUATION_PLAN_PHASES.map((phase, index) => {
            const status = getValuationPlanStepStatus(phase.id, normalizedCompletedSteps)
            const config = STATUS_CONFIG[status]
            const isInProgress = status === "in_progress"

            return (
              <article
                key={phase.id}
                className={cn(
                  "flex min-h-[220px] flex-col rounded-xl border p-5 transition-shadow",
                  config.cardClass,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold tabular-nums text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                      config.badgeClass,
                    )}
                  >
                    {config.label}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-semibold leading-snug text-[#2A2F3A]">{phase.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{phase.panelSubtitle}</p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    asChild
                    size="sm"
                    className={cn(
                      isInProgress
                        ? "bg-[#E0742D] text-white hover:bg-[#c96526]"
                        : "bg-[#2A2F3A] text-white hover:bg-[#1f242d]",
                    )}
                    data-testid={`valuation-plan-open-${phase.id}`}
                  >
                    <Link href={buildToolHref(phase)}>
                      {status === "completed" ? "Revoir" : status === "in_progress" ? "Continuer" : "Commencer"}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                  {onMarkComplete && isInProgress ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-300 text-slate-700"
                      onClick={() => onMarkComplete(phase.id)}
                      data-testid={`valuation-plan-complete-${phase.id}`}
                    >
                      Marquer terminé
                    </Button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
