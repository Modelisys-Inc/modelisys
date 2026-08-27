"use client"

import { useEffect, useState } from "react"
import { Activity, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/financial-utils"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"
import { useProFormaFinancialImpact } from "@/hooks/use-pro-forma-financial-impact"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import type { ProFormaImpactMetric } from "@/lib/pro-forma-financial-impact"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const IMPACT_PANEL_COLLAPSED_KEY = "modelisys:pro-forma-impact-panel-collapsed"

function formatImpactValue(metric: ProFormaImpactMetric): string {
  if (metric.value == null || !Number.isFinite(metric.value)) return "—"
  if (metric.isPercent) {
    if (Math.abs(metric.value) < 1e-9) return "—"
    return `${metric.value.toFixed(1)} %`
  }
  if (Math.abs(metric.value) < 1e-9) return "—"
  return formatCurrency(metric.value)
}

function formatSignedNumber(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : ""
  return `${sign}${Math.abs(value).toFixed(digits).replace(".", ",")}`
}

function formatYoyDelta(metric: ProFormaImpactMetric): string | null {
  if (metric.yoyDelta == null || !Number.isFinite(metric.yoyDelta)) return null
  if (Math.abs(metric.yoyDelta) < 1e-9) return null
  if (metric.isPercent) return `${formatSignedNumber(metric.yoyDelta)} pts`
  const sign = metric.yoyDelta > 0 ? "+" : metric.yoyDelta < 0 ? "−" : ""
  return `${sign}${formatCurrency(Math.abs(metric.yoyDelta))}`
}

function formatYoyPct(metric: ProFormaImpactMetric): string | null {
  if (metric.yoyPct == null || !Number.isFinite(metric.yoyPct)) return null
  if (Math.abs(metric.yoyPct) < 1e-9) return null
  return `${formatSignedNumber(metric.yoyPct)} %`
}

function readCollapsedPreference(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(IMPACT_PANEL_COLLAPSED_KEY) === "1"
  } catch {
    return false
  }
}

export function ProFormaFinancialImpactPanel(props: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  forecastBaseYear: number
  refMonth: number
  fiscalYearEndMonth?: number
  forecastActualLayout?: ForecastActualLayout
  className?: string
}) {
  const [collapsed, setCollapsed] = useState(() => readCollapsedPreference())
  const [selectedDisplayIndex, setSelectedDisplayIndex] = useState<number | null>(null)

  const setPanelCollapsed = (next: boolean) => {
    setCollapsed(next)
    try {
      window.localStorage.setItem(IMPACT_PANEL_COLLAPSED_KEY, next ? "1" : "0")
    } catch {
      /* ignore */
    }
  }

  const { metrics, yearLabel, projectedYearOptions, yoyComparisonLabel, loading } =
    useProFormaFinancialImpact({
      companyId: props.companyId,
      projectionId: props.projectionId,
      projectionYears: props.projectionYears,
      forecastBaseYear: props.forecastBaseYear,
      refMonth: props.refMonth,
      fiscalYearEndMonth: props.fiscalYearEndMonth,
      forecastActualLayout: props.forecastActualLayout,
      selectedDisplayIndex: selectedDisplayIndex ?? undefined,
      enabled: !!props.companyId && !!props.projectionId,
    })

  const defaultDisplayIndex = projectedYearOptions[0]?.displayIndex ?? null

  useEffect(() => {
    if (!projectedYearOptions.length) {
      setSelectedDisplayIndex(null)
      return
    }
    setSelectedDisplayIndex((current) => {
      if (current != null && projectedYearOptions.some((o) => o.displayIndex === current)) {
        return current
      }
      return projectedYearOptions[0]!.displayIndex
    })
  }, [projectedYearOptions])

  const activeDisplayIndex = selectedDisplayIndex ?? defaultDisplayIndex
  const selectValue =
    activeDisplayIndex != null ? String(activeDisplayIndex) : undefined

  const collapsedTab = (
    <button
      type="button"
      data-testid="pro-forma-financial-impact-panel-collapsed"
      aria-label="Afficher Impact financier"
      onClick={() => setPanelCollapsed(false)}
      className={cn(
        dashboardCardFrameStaticClass,
        "sticky top-4 flex w-11 shrink-0 flex-col items-center gap-2 self-start px-1.5 py-4 lg:w-12",
        props.className,
      )}
    >
      <div className={dashboardCardRingClass} aria-hidden />
      <Activity className="h-5 w-5 text-[#2A2F3A]" aria-hidden />
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide text-slate-600 [writing-mode:vertical-rl] rotate-180",
          dashboardCardAccentClass,
        )}
      >
        Impact
      </span>
      <ChevronLeft className="h-4 w-4 text-slate-500" aria-hidden />
    </button>
  )

  if (collapsed) return collapsedTab

  return (
    <aside
      data-testid="pro-forma-financial-impact-panel"
      className={cn(
        dashboardCardFrameStaticClass,
        "sticky top-4 flex w-full max-w-full flex-col lg:w-[22rem] lg:shrink-0",
        props.className,
      )}
    >
      <div className={dashboardCardRingClass} aria-hidden />
      <div className={cn("px-5 py-4", dashboardCardHeaderBarClass)}>
        <div className="flex items-start gap-3">
          <div className={dashboardCardHeaderIconBoxClass}>
            <Activity className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className={cn("text-base leading-tight", dashboardCardTitleClass)}>
                Impact financier
              </h3>
              <button
                type="button"
                data-testid="pro-forma-impact-panel-hide"
                aria-label="Masquer Impact financier"
                onClick={() => setPanelCollapsed(true)}
                className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn("text-xs", dashboardCardBodyMutedClass)}>Année projetée</span>
                {projectedYearOptions.length > 0 ? (
                  <Select
                    value={selectValue}
                    onValueChange={(value) => setSelectedDisplayIndex(Number(value))}
                  >
                    <SelectTrigger
                      data-testid="pro-forma-impact-year-select"
                      className="h-8 w-[6.5rem] border-slate-200 bg-white text-xs font-semibold text-slate-900 shadow-none"
                      aria-label="Année projetée pour l’impact financier"
                    >
                      <SelectValue placeholder={yearLabel || "—"} />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {projectedYearOptions.map((option) => (
                        <SelectItem
                          key={option.displayIndex}
                          value={String(option.displayIndex)}
                          className="text-xs"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn("text-xs font-semibold", dashboardCardAccentClass)}>
                    {yearLabel || "—"}
                  </span>
                )}
              </div>
              {yoyComparisonLabel ? (
                <p className={cn("text-[11px]", dashboardCardBodyMutedClass)}>
                  Variation vs{" "}
                  <span className="font-medium text-slate-600">{yoyComparisonLabel}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3">
        {loading && metrics.every((m) => m.value == null) ? (
          <p className={cn("py-6 text-center text-sm", dashboardCardBodyMutedClass)}>
            Calcul en cours…
          </p>
        ) : (
          <ul className="divide-y divide-slate-200/80">
            {metrics.map((metric) => {
              const yoyDelta = formatYoyDelta(metric)
              const yoyPct = formatYoyPct(metric)
              return (
                <li
                  key={metric.id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-1 last:pb-1"
                  data-testid={`pro-forma-impact-${metric.id}`}
                >
                  <span
                    className={cn(
                      "min-w-0 text-xs leading-snug text-slate-600",
                      metric.isPercent && "pl-2 text-slate-500",
                    )}
                  >
                    {metric.label}
                  </span>
                  <div className="shrink-0 text-right">
                    <span
                      className={cn(
                        "block tabular-nums text-sm font-semibold text-slate-900",
                        metric.isPercent && "font-medium text-slate-700",
                      )}
                    >
                      {formatImpactValue(metric)}
                    </span>
                    {yoyDelta || yoyPct ? (
                      <span
                        className="mt-0.5 block text-[10px] tabular-nums leading-snug text-slate-500"
                        data-testid={`pro-forma-impact-yoy-${metric.id}`}
                      >
                        {[yoyDelta, yoyPct].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className={cn("mt-3 border-t border-slate-100 pt-3 text-[11px] leading-relaxed", dashboardCardBodyMutedClass)}>
          Se met à jour après enregistrement d’une hypothèse (Revenus, Dépenses, Capex…).
        </p>
      </div>
    </aside>
  )
}
