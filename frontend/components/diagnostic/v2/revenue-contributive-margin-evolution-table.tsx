"use client"

import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
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

const headerCellClass =
  "px-2 pb-2 text-left text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-slate-400 first:pl-1 last:pr-1"
const headerValueClass = cn(headerCellClass, "text-right")
const labelCellClass = "px-2 py-[9px] text-left text-xs font-medium text-[#2A2F3A] first:pl-1"
const valueCellClass =
  "px-2 py-[9px] text-right font-mono text-[11.5px] font-medium tabular-nums text-slate-600 last:pr-1"

export function RevenueContributiveMarginEvolutionTable({
  table,
  currency,
  className,
}: RevenueContributiveMarginEvolutionTableProps) {
  if (!table.periods.length) return null

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
            <tr key={metric.id} className="border-t border-slate-200/90">
              <td className={labelCellClass}>{metric.label}</td>
              {metric.values.map((value, index) => (
                <td key={`${metric.id}-${table.periods[index]}`} className={valueCellClass}>
                  {formatCell(value, metric.format, currency)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
