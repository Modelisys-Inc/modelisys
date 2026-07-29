"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import type {
  ContributiveMarginEvolutionDetailRow,
  ContributiveMarginEvolutionMetric,
  ContributiveMarginEvolutionTable,
} from "@/lib/revenue-contributive-margin-evolution"
import { formatGlAccountDisplayLabel } from "@/lib/gl-account-display-label"
import { cn } from "@/lib/utils"

interface RevenueContributiveMarginEvolutionTableProps {
  table: ContributiveMarginEvolutionTable
  currency: string
  className?: string
}

function formatCell(
  value: number | null,
  format: "currency" | "percent",
  currency: string,
): string {
  if (value === null || !Number.isFinite(value)) return "—"
  return format === "currency" ? formatMoney(value, currency) : formatPercent(value)
}

function formatDetailLabel(detail: ContributiveMarginEvolutionDetailRow): string {
  if (detail.displayKind === "link-code") {
    return detail.label.trim() === detail.id ? detail.id : `${detail.id} — ${detail.label}`
  }
  return formatGlAccountDisplayLabel(detail.id, detail.label)
}

const headerCellClass =
  "px-2 pb-2 text-left text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-slate-400 first:pl-1 last:pr-1"
const headerValueClass = cn(headerCellClass, "text-right")
const labelCellClass = "px-2 py-[9px] text-left text-xs font-medium text-[#2A2F3A] first:pl-1"
const valueCellClass =
  "px-2 py-[9px] text-right font-mono text-[11.5px] font-medium tabular-nums text-slate-600 last:pr-1"
const detailLabelCellClass = "px-2 py-[7px] pl-7 text-left text-[11.5px] text-slate-500 first:pl-1"
const detailValueCellClass =
  "px-2 py-[7px] text-right font-mono text-[11px] font-normal tabular-nums text-slate-500 last:pr-1"

function MetricRows({
  metric,
  table,
  currency,
  expanded,
  onToggleExpand,
}: {
  metric: ContributiveMarginEvolutionMetric
  table: ContributiveMarginEvolutionTable
  currency: string
  expanded: boolean
  onToggleExpand?: () => void
}) {
  const canExpand = (metric.detailRows?.length ?? 0) > 0

  return (
    <>
      <tr
        className={cn(
          "border-t border-slate-200/90",
          canExpand && "cursor-pointer hover:bg-slate-50/80",
        )}
        onClick={canExpand ? onToggleExpand : undefined}
        data-testid={canExpand ? `contributive-margin-${metric.id}-row` : undefined}
        aria-expanded={canExpand ? expanded : undefined}
      >
        <td className={labelCellClass}>
          <span className="inline-flex items-center gap-1.5">
            {canExpand ? (
              <span className="flex-shrink-0" aria-hidden>
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                )}
              </span>
            ) : null}
            <span>{metric.label}</span>
          </span>
        </td>
        {metric.values.map((value, index) => (
          <td key={`${metric.id}-${table.periods[index]}`} className={valueCellClass}>
            {formatCell(value, metric.format, currency)}
          </td>
        ))}
      </tr>
      {canExpand && expanded
        ? metric.detailRows!.map((detail) => (
            <tr
              key={`${metric.id}-${detail.id}`}
              className="bg-slate-50/70"
              data-testid={`contributive-margin-${metric.id}-detail-${detail.id}`}
            >
              <td className={detailLabelCellClass}>{formatDetailLabel(detail)}</td>
              {detail.values.map((value, index) => (
                <td
                  key={`${detail.id}-${table.periods[index]}`}
                  className={detailValueCellClass}
                >
                  {formatCell(value, metric.format, currency)}
                </td>
              ))}
            </tr>
          ))
        : null}
    </>
  )
}

export function RevenueContributiveMarginEvolutionTable({
  table,
  currency,
  className,
}: RevenueContributiveMarginEvolutionTableProps) {
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({})

  if (!table.periods.length) return null

  const toggleMetric = (metricId: string) => {
    setExpandedMetrics((current) => ({ ...current, [metricId]: !current[metricId] }))
  }

  return (
    <div
      data-testid={`contributive-margin-evolution-${table.sourceId}`}
      className={cn("mt-4 w-full overflow-x-auto", className)}
    >
      <table className="w-full min-w-[32rem] border-collapse">
        <thead>
          <tr>
            <th className={headerCellClass}>Indicateur</th>
            {table.periods.map((period) => (
              <th key={period} className={headerValueClass}>
                {period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.metrics.map((metric) => (
            <MetricRows
              key={metric.id}
              metric={metric}
              table={table}
              currency={currency}
              expanded={expandedMetrics[metric.id] === true}
              onToggleExpand={
                metric.detailRows?.length ? () => toggleMetric(metric.id) : undefined
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
