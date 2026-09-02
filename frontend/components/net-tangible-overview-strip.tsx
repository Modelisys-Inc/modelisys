"use client"

import { formatMoney } from "@/components/diagnostic/diagnostic-format"
import { useCountUp } from "@/components/diagnostic/v2/use-count-up"
import type { NetTangibleOverviewMetric } from "@/lib/net-tangible-overview"
import { cn } from "@/lib/utils"

type NetTangibleOverviewStripProps = {
  metrics: NetTangibleOverviewMetric[]
  currency?: string
  className?: string
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map(
      (v, i) =>
        `${(i * (72 / (values.length - 1))).toFixed(1)},${(22 - ((v - min) / range) * 20).toFixed(1)}`,
    )
    .join(" ")

  return (
    <svg viewBox="0 0 72 24" preserveAspectRatio="none" className="h-[22px] w-[72px] flex-none opacity-90">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Bandeau KPI VCA — même coquille visuelle que Pilotage (`DiagnosticKpiStrip`) :
 * grille pleine largeur, label, montant, tendance + sparkline, hint.
 */
export function NetTangibleOverviewStrip({
  metrics,
  currency = "CAD",
  className,
}: NetTangibleOverviewStripProps) {
  const t = useCountUp(900)

  return (
    <div
      data-testid="net-tangible-overview-strip"
      className={cn(
        "grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 md:grid-cols-4 xl:grid-cols-7",
        className,
      )}
    >
      {metrics.map((metric) => {
        const display =
          metric.value == null ? "—" : formatMoney(metric.value * t, currency)

        return (
          <div
            key={metric.id}
            data-testid={`net-tangible-overview-${metric.id}`}
            className="flex min-w-0 flex-col gap-1.5 bg-white px-3.5 pb-[11px] pt-[13px] text-left"
          >
            <span className="text-[9.5px] font-semibold uppercase leading-tight tracking-[.1em] text-slate-400">
              {metric.label}
            </span>
            <span className="truncate font-mono text-[19px] font-semibold leading-tight tracking-[-.02em] text-[#2A2F3A] tabular-nums">
              {display}
            </span>
            <span className="flex items-end justify-between gap-2">
              <span className="text-[10.5px] font-medium leading-tight text-slate-400">—</span>
              <Sparkline values={[]} color="#34D399" />
            </span>
            <span className="text-[10px] leading-tight text-slate-400">{metric.hint}</span>
          </div>
        )
      })}
    </div>
  )
}
