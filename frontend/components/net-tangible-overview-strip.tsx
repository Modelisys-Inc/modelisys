"use client"

import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/financial-utils"
import type { NetTangibleOverviewMetric } from "@/lib/net-tangible-overview"
import { cn } from "@/lib/utils"

type NetTangibleOverviewStripProps = {
  metrics: NetTangibleOverviewMetric[]
  className?: string
  /** `report` = synthèse CPA (tableau Indicateur | Montant). */
  variant?: "default" | "report"
}

/**
 * Synthèse VCA — variante `report` : panneau crème + tableau Indicateur | Montant.
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
          "w-full border-b border-[#E6D6C3]/45 bg-gradient-to-b from-[#222732]/[0.025] to-white",
          className,
        )}
      >
        <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-12">
          <div className="flex items-start gap-3">
            <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
                Sommaire de la conclusion
              </p>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">
                Synthèse de la valeur comptable, des ajustements et de l&apos;actif net tangible.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-6 py-1 sm:px-12">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-[#E6D6C3]/55 text-left">
                <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Indicateur
                </th>
                <th className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const display = metric.value == null ? "—" : formatCurrency(metric.value)
                return (
                  <tr
                    key={metric.id}
                    data-testid={`net-tangible-overview-${metric.id}`}
                    className="border-b border-slate-100 align-middle last:border-b-0"
                  >
                    <td className="py-3 pr-4">
                      <span className="inline-flex min-w-0 items-start gap-1.5">
                        <span className="text-sm font-medium text-[#222732]">
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
                    </td>
                    <td
                      className={cn(
                        "py-3 text-right font-mono text-sm tabular-nums text-[#222732]",
                        metric.value == null && "text-slate-400",
                      )}
                    >
                      {display}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
