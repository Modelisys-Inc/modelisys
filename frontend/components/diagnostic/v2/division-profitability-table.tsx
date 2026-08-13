"use client"

import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import {
  buildDivisionProfitabilityTotals,
  type DivisionProfitabilityRow,
} from "@/lib/division-profitability"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import { cn } from "@/lib/utils"
import { SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS } from "@/lib/summary-performance-table-styles"

interface DivisionProfitabilityTableProps {
  rows: DivisionProfitabilityRow[]
  currency: string
  className?: string
  footnote?: string
  /** Affiche la colonne TCAC (désactivée en Pilotage). */
  showCagrColumn?: boolean
}

export const DIVISION_PROFITABILITY_TABLE_FOOTNOTE = `Le calcul du ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} repose sur les coûts variables et les coûts fixes directement rattachés à chaque division dans le mapping comptable. Certains coûts variables et fixes peuvent ne pas être attribués à une division précise ; ils sont alors exclus de cette analyse.`

const headerCellClass =
  "px-2 pb-2 text-left text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-slate-400 first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6"
const headerValueClass = cn(headerCellClass, "text-right")
const labelCellClass =
  "px-2 py-[9px] text-left text-xs font-medium text-[#2A2F3A] first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6"
const valueCellClass =
  "px-2 py-[9px] text-right font-mono text-[11.5px] font-medium tabular-nums text-[#2A2F3A] last:pr-4 sm:last:pr-6"
const mutedValueCellClass = cn(valueCellClass, "text-slate-500")
const baiiaMarginCellClass = cn(valueCellClass, SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS, "text-slate-800")
const baiiaMarginHeaderClass = cn(headerValueClass, SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS, "text-slate-600")

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
  footnote = DIVISION_PROFITABILITY_TABLE_FOOTNOTE,
  showCagrColumn = true,
}: DivisionProfitabilityTableProps) {
  if (!rows.length) return null

  const totals = buildDivisionProfitabilityTotals(rows)

  return (
    <section data-testid="division-profitability-table" className={cn("w-full", className)}>
      <div className="mb-4 px-4 sm:px-6">
        <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Rentabilité par division
        </h5>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Pont de rentabilité par division (comptes affectés dans le mapping) : revenus, coûts
          variables, contribution marginale, coûts fixes et {EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} à la date de
          référence. Les divisions en déficit sont mises en évidence.
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <table className={cn("w-full border-collapse", showCagrColumn ? "min-w-[60rem]" : "min-w-[54rem]")}>
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[9%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[8%]" />
            <col className={cn("w-[7%]", SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS)} />
            <col className={cn(showCagrColumn ? "w-[7%]" : "w-[9%]")} />
            {showCagrColumn ? <col className="w-[6%]" /> : null}
          </colgroup>
          <thead>
            <tr>
              <th className={headerCellClass}>Division</th>
              <th className={headerValueClass}>Revenus</th>
              <th className={headerValueClass}>Coûts var.</th>
              <th className={headerValueClass}>Contr. marginale</th>
              <th className={headerValueClass}>Marge contrib.</th>
              <th className={headerValueClass}>Coûts fixes</th>
              <th className={headerValueClass}>{EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}</th>
              <th className={baiiaMarginHeaderClass}>Marge {EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}</th>
              <th className={headerValueClass}>Part CA</th>
              {showCagrColumn ? <th className={headerValueClass}>TCAC</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-testid={`division-profitability-row-${row.id}`}
                className={cn(
                  "border-t border-slate-200",
                  row.profitable ? "" : "bg-[rgba(241,106,92,.06)]",
                )}
              >
                <td className={labelCellClass}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 flex-none rounded-sm"
                      style={{ background: row.profitable ? "#34D399" : "#F16A5C" }}
                    />
                    <span
                      className="truncate font-medium"
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
                </td>
                <td className={valueCellClass}>{formatMoney(row.revenue, currency)}</td>
                <td className={mutedValueCellClass}>{formatOptionalMoney(row.variableCost, currency)}</td>
                <td
                  className={valueCellClass}
                  style={{ color: (row.contributiveMargin ?? 0) < 0 ? "#dc2626" : "#2A2F3A" }}
                >
                  {formatOptionalMoney(row.contributiveMargin, currency)}
                </td>
                <td className={mutedValueCellClass}>{formatOptionalPercent(row.contributiveMarginPct)}</td>
                <td className={mutedValueCellClass}>{formatOptionalMoney(row.fixedCost, currency)}</td>
                <td
                  className={valueCellClass}
                  style={{ color: (row.operatingProfit ?? 0) < 0 ? "#dc2626" : "#2A2F3A" }}
                >
                  {formatOptionalMoney(row.operatingProfit, currency)}
                </td>
                <td className={baiiaMarginCellClass}>{formatOptionalPercent(row.operatingMarginPct)}</td>
                <td className={mutedValueCellClass}>{formatPercent(row.revenueSharePct)}</td>
                {showCagrColumn ? (
                  <td className={mutedValueCellClass}>{formatOptionalPercent(row.revenueCagrPct)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 font-semibold">
              <td className={cn(labelCellClass, "text-xs")}>Total</td>
              <td className={valueCellClass}>{formatMoney(totals.revenue, currency)}</td>
              <td className={valueCellClass}>{formatOptionalMoney(totals.variableCost, currency)}</td>
              <td className={valueCellClass}>{formatOptionalMoney(totals.contributiveMargin, currency)}</td>
              <td className={valueCellClass}>{formatOptionalPercent(totals.contributiveMarginPct)}</td>
              <td className={valueCellClass}>{formatOptionalMoney(totals.fixedCost, currency)}</td>
              <td className={valueCellClass}>{formatOptionalMoney(totals.operatingProfit, currency)}</td>
              <td className={baiiaMarginCellClass}>{formatOptionalPercent(totals.operatingMarginPct)}</td>
              <td className={mutedValueCellClass}>{formatPercent(100)}</td>
              {showCagrColumn ? <td className={cn(valueCellClass, "text-slate-400")}>—</td> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {footnote ? (
        <p
          data-testid="division-profitability-table-footnote"
          className="mt-4 px-4 text-xs leading-relaxed text-slate-500 sm:px-6"
        >
          {footnote}
        </p>
      ) : null}
    </section>
  )
}
