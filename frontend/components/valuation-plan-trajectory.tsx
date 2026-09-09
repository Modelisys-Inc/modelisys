"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Circle, CircleDashed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  VALUATION_PLAN_PHASES,
  getValuationPlanStepStatus,
  normalizeCompletedPlanSteps,
  resolveActiveValuationPlanPhaseId,
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
  const activePhaseId = resolveActiveValuationPlanPhaseId(normalizedCompletedSteps)

  const [selectedPhaseId, setSelectedPhaseId] = useState<ValuationPlanPhaseId>(activePhaseId)

  useEffect(() => {
    setSelectedPhaseId(activePhaseId)
  }, [activePhaseId])

  const selectedIndex = VALUATION_PLAN_PHASES.findIndex((phase) => phase.id === selectedPhaseId)
  const selectedPhase =
    selectedIndex >= 0 ? VALUATION_PLAN_PHASES[selectedIndex] : VALUATION_PLAN_PHASES[0]
  const selectedStatus = getValuationPlanStepStatus(selectedPhase.id, normalizedCompletedSteps)
  const selectedConfig = STATUS_CONFIG[selectedStatus]
  const isSelectedInProgress = selectedStatus === "in_progress"

  return (
    <section className={cn("w-full", className)} aria-label="Plan de valorisation">
      <div className="w-full overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]">
        <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
                  Plan de valorisation
                </p>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                  Progression du parcours
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {allComplete
                    ? "Toutes les étapes sont complétées."
                    : `${completedCount} sur ${totalSteps} étapes complétées — sélectionnez une étape pour en voir le détail.`}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-3xl font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                {overallProgress}
                <span className="text-lg font-medium text-slate-500">%</span>
              </p>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                Avancement global
              </p>
            </div>
          </div>

          <div className="mt-5" data-testid="valuation-plan-progress-bar">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E6D6C3]/40">
              <div
                className="h-full rounded-full bg-[#2A2F3A] transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-5 sm:px-6 xl:px-8">
          <div className="relative overflow-x-auto pb-1">
            <div className="relative min-w-[640px]">
              <div
                className="absolute left-[calc(100%/14)] right-[calc(100%/14)] top-5 h-px bg-slate-200"
                aria-hidden
              />
              <div
                className="absolute left-[calc(100%/14)] top-5 h-px bg-[#2A2F3A] transition-all duration-500"
                style={{
                  width:
                    totalSteps > 1
                      ? `calc((100% - 100%/7) * ${completedCount / (totalSteps - 1)})`
                      : "0%",
                }}
                aria-hidden
              />
              <ol
                className="relative grid grid-cols-7 gap-1"
                data-testid="valuation-plan-phases"
                role="listbox"
                aria-label="Étapes du plan"
              >
                {VALUATION_PLAN_PHASES.map((phase, index) => {
                  const status = getValuationPlanStepStatus(phase.id, normalizedCompletedSteps)
                  const config = STATUS_CONFIG[status]
                  const isSelected = phase.id === selectedPhase.id

                  return (
                    <li key={phase.id} className="min-w-0">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => setSelectedPhaseId(phase.id)}
                        data-testid={`valuation-plan-phase-${phase.id}`}
                        className={cn(
                          "group flex w-full flex-col items-center px-1 pb-3 pt-1 text-center",
                          "border-b-2 border-transparent transition-[border-color,color] duration-200",
                          "focus-visible:outline-none focus-visible:border-[#E6D6C3]",
                          isSelected
                            ? "border-[#E0742D]"
                            : "hover:border-slate-300",
                        )}
                      >
                        <span
                          className={cn(
                            "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-200",
                            config.dotClass,
                            "group-hover:scale-105",
                            isSelected && "scale-105",
                          )}
                        >
                          <StepNodeIcon status={status} />
                        </span>
                        <span
                          className={cn(
                            "mt-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                            isSelected ? "text-[#E0742D]" : "text-slate-400 group-hover:text-slate-500",
                          )}
                        >
                          Étape {index + 1}
                        </span>
                        <span
                          className={cn(
                            "mt-1 text-balance text-xs font-semibold leading-snug transition-colors sm:text-sm",
                            isSelected
                              ? "text-[#2A2F3A]"
                              : "text-slate-600 group-hover:text-[#2A2F3A]",
                          )}
                        >
                          {phase.label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6" data-testid="valuation-plan-phase-detail">
          <article className="flex flex-col border-t border-slate-200 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-semibold tabular-nums text-[#E0742D]">
                  {String(selectedIndex + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                    selectedConfig.badgeClass,
                  )}
                >
                  {selectedConfig.label}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-snug tracking-tight text-[#2A2F3A]">
                {selectedPhase.label}
              </h3>
              <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-slate-500">
                {selectedPhase.panelSubtitle}
              </p>
              {selectedPhase.items.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {selectedPhase.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-slate-600">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#E0742D]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="mt-5 flex shrink-0 flex-col gap-2 sm:mt-1 sm:items-end">
              <Button
                asChild
                className={cn(
                  "h-auto rounded-md px-5 py-3 text-xs font-semibold tracking-[0.08em]",
                  isSelectedInProgress
                    ? "bg-[#E6D6C3] text-[#1F2430] hover:bg-[#f0e6d8]"
                    : "bg-[#2A2F3A] text-[#E6D6C3] hover:bg-[#1F2430]",
                )}
                data-testid={`valuation-plan-open-${selectedPhase.id}`}
              >
                <Link href={buildToolHref(selectedPhase)}>
                  {selectedStatus === "completed"
                    ? "REVOIR"
                    : selectedStatus === "in_progress"
                      ? "CONTINUER"
                      : "COMMENCER"}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
              {onMarkComplete && isSelectedInProgress ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-1 py-2 text-xs font-semibold tracking-[0.08em] text-slate-600 hover:bg-transparent hover:text-[#2A2F3A]"
                  onClick={() => onMarkComplete(selectedPhase.id)}
                  data-testid={`valuation-plan-complete-${selectedPhase.id}`}
                >
                  MARQUER TERMINÉ
                  <span className="ml-2 inline-block h-px w-8 bg-[#E0742D]/90" aria-hidden />
                </Button>
              ) : null}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
