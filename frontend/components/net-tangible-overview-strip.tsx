"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/financial-utils"
import type { NetTangibleOverviewMetric } from "@/lib/net-tangible-overview"
import { cn } from "@/lib/utils"

type NetTangibleOverviewStripProps = {
  metrics: NetTangibleOverviewMetric[]
  className?: string
  /** `report` = bandeau conclusion (aligné Multiplicateur / CMPC). */
  variant?: "default" | "report"
}

/**
 * Bandeau KPI VCA — typographie alignée sur la carte VCA.
 * Variante `report` : sommation sombre façon conclusion CMPC.
 */
export function NetTangibleOverviewStrip({
  metrics,
  className,
  variant = "default",
}: NetTangibleOverviewStripProps) {
  if (variant === "report") {
    return (
      <section
        data-testid="net-tangible-overview-strip"
        data-break-avoid
        className={cn(
          "mt-8 overflow-hidden rounded-xl border border-slate-200 bg-[#2A2F3A] text-white shadow-sm",
          className,
        )}
      >
        <div className="border-b border-white/15 px-5 py-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
            Sommaire de la conclusion
          </p>
          <p className="mt-2 max-w-3xl text-pretty text-sm leading-relaxed text-white/80">
            Synthèse de la valeur comptable, des ajustements et de l&apos;actif net tangible à la
            date de référence.
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-white/10 md:grid-cols-4 xl:grid-cols-7 xl:divide-y-0">
          {metrics.map((metric) => {
            const display = metric.value == null ? "—" : formatCurrency(metric.value)
            return (
              <div
                key={metric.id}
                data-testid={`net-tangible-overview-${metric.id}`}
                className="flex min-w-0 flex-col gap-1.5 px-3.5 py-3.5 text-left"
              >
                <span className="flex min-w-0 items-start justify-between gap-1.5">
                  <span className="min-w-0 text-[11px] font-medium uppercase tracking-wide text-white/55">
                    {metric.label}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        data-testid={`net-tangible-overview-hint-${metric.id}`}
                        className="mt-0.5 shrink-0 rounded-full text-white/45 outline-none transition-colors hover:text-[#E0742D] focus-visible:ring-2 focus-visible:ring-[#E0742D]/40"
                        aria-label={`Explication : ${metric.label}`}
                      >
                        <Info className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={6}
                      className="max-w-[280px] border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-md"
                    >
                      {metric.hint}
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="truncate font-mono text-sm font-semibold tabular-nums text-white">
                  {display}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div
      data-testid="net-tangible-overview-strip"
      className={cn(
        "grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-4 xl:grid-cols-7",
        className,
      )}
    >
      {metrics.map((metric) => {
        const display = metric.value == null ? "—" : formatCurrency(metric.value)

        return (
          <div
            key={metric.id}
            data-testid={`net-tangible-overview-${metric.id}`}
            className="flex min-w-0 flex-col gap-1.5 bg-white px-3.5 py-3.5 text-left"
          >
            <span className="flex min-w-0 items-start justify-between gap-1.5">
              <span className="min-w-0 text-sm font-semibold leading-tight tracking-tight text-[#2A2F3A]">
                {metric.label}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    data-testid={`net-tangible-overview-hint-${metric.id}`}
                    className="mt-0.5 shrink-0 rounded-full text-slate-400 outline-none transition-colors hover:text-[#E0742D] focus-visible:ring-2 focus-visible:ring-[#E0742D]/30"
                    aria-label={`Explication : ${metric.label}`}
                  >
                    <Info className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={6}
                  className="max-w-[280px] border border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-md"
                >
                  {metric.hint}
                </TooltipContent>
              </Tooltip>
            </span>
            <span className="truncate text-sm font-semibold tabular-nums text-[#2A2F3A]">
              {display}
            </span>
          </div>
        )
      })}
    </div>
  )
}
