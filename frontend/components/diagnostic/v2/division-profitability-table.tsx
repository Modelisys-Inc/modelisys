"use client"

import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import {
  buildDivisionProfitabilityTotals,
  type DivisionProfitabilityRow,
} from "@/lib/division-profitability"
import { cn } from "@/lib/utils"

interface DivisionProfitabilityTableProps {
  rows: DivisionProfitabilityRow[]
  currency: string
  className?: string
}

function formatOptionalMoney(value: number | null, currency: string): string {
  if (value === null) return "—"
  return formatMoney(value, currency)
}

function formatOptionalPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  return formatPercent(value)
}

export function DivisionProfitabilityTable({
  rows,
  currency,
  className,
}: DivisionProfitabilityTableProps) {
  if (!rows.length) return null

  const totals = buildDivisionProfitabilityTotals(rows)
  const gridCols =
    "grid grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)_minmax(0,.75fr)_minmax(0,.85fr)_minmax(0,.65fr)_minmax(0,.75fr)_minmax(0,.8fr)_minmax(0,.65fr)_minmax(0,.6fr)_minmax(0,.55fr)]"

  return (
    <section data-testid="division-profitability-table" className={cn("w-full", className)}>
      <div className="mb-4 px-4 sm:px-6">
        <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Rentabilité par division
        </h5>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Pont de rentabilité par division (comptes affectés dans le mapping) : revenus, coûts
          variables, contribution marginale, coûts fixes et bénéfice d'exploitation à la date de
          référence. Les divisions en déficit sont mises en évidence.
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[960px]">
          <div
            className={cn(
              gridCols,
              "w-full px-4 pb-2 text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-slate-400 sm:px-6",
            )}
          >
            <span>Division</span>
            <span className="text-right">Revenus</span>
            <span className="text-right">Coûts var.</span>
            <span className="text-right">Contr. marginale</span>
            <span className="text-right">Marge contrib.</span>
            <span className="text-right">Coûts fixes</span>
            <span className="text-right">Bén. expl.</span>
            <span className="text-right">Marge expl.</span>
            <span className="text-right">Part CA</span>
            <span className="text-right">TCAC</span>
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              data-testid={`division-profitability-row-${row.id}`}
              className={cn(
                gridCols,
                "w-full items-center border-t border-slate-200 px-4 py-[9px] sm:px-6",
                row.profitable ? "" : "bg-[rgba(241,106,92,.06)]",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="h-2 w-2 flex-none rounded-sm"
                  style={{ background: row.profitable ? "#34D399" : "#F16A5C" }}
                />
                <span
                  className="truncate text-xs font-medium"
                  style={{ color: row.profitable ? "#2A2F3A" : "#dc2626" }}
                >
                  {row.label}
                </span>
                {(!row.variableCostMapped || !row.fixedCostMapped) && (
                  <span className="flex-none rounded-[5px] bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-slate-500">
                    Mapping
                  </span>
                )}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-[#2A2F3A] tabular-nums">
                {formatMoney(row.revenue, currency)}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
                {formatOptionalMoney(row.variableCost, currency)}
              </span>
              <span
                className="text-right font-mono text-[11.5px] font-medium tabular-nums"
                style={{ color: (row.contributiveMargin ?? 0) < 0 ? "#dc2626" : "#2A2F3A" }}
              >
                {formatOptionalMoney(row.contributiveMargin, currency)}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
                {formatOptionalPercent(row.contributiveMarginPct)}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
                {formatOptionalMoney(row.fixedCost, currency)}
              </span>
              <span
                className="text-right font-mono text-[11.5px] font-medium tabular-nums"
                style={{ color: (row.operatingProfit ?? 0) < 0 ? "#dc2626" : "#2A2F3A" }}
              >
                {formatOptionalMoney(row.operatingProfit, currency)}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
                {formatOptionalPercent(row.operatingMarginPct)}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
                {formatPercent(row.revenueSharePct)}
              </span>
              <span className="text-right font-mono text-[11.5px] font-medium text-slate-500 tabular-nums">
                {formatOptionalPercent(row.revenueCagrPct)}
              </span>
            </div>
          ))}

          <div
            className={cn(
              gridCols,
              "w-full items-center border-t border-slate-300 px-4 py-[9px] font-semibold sm:px-6",
            )}
          >
            <span className="text-xs text-[#2A2F3A]">Total</span>
            <span className="text-right font-mono text-[11.5px] text-[#2A2F3A] tabular-nums">
              {formatMoney(totals.revenue, currency)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-[#2A2F3A] tabular-nums">
              {formatOptionalMoney(totals.variableCost, currency)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-[#2A2F3A] tabular-nums">
              {formatOptionalMoney(totals.contributiveMargin, currency)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-[#2A2F3A] tabular-nums">
              {formatOptionalPercent(totals.contributiveMarginPct)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-[#2A2F3A] tabular-nums">
              {formatOptionalMoney(totals.fixedCost, currency)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-[#2A2F3A] tabular-nums">
              {formatOptionalMoney(totals.operatingProfit, currency)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-[#2A2F3A] tabular-nums">
              {formatOptionalPercent(totals.operatingMarginPct)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-slate-500 tabular-nums">
              {formatPercent(100)}
            </span>
            <span className="text-right font-mono text-[11.5px] text-slate-400 tabular-nums">—</span>
          </div>
        </div>
      </div>
    </section>
  )
}
