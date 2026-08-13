"use client"

import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import {
  buildRevenueContributiveMarginTotals,
  type RevenueContributiveMarginRow,
} from "@/lib/revenue-contributive-margin-table"
import { cn } from "@/lib/utils"
import { SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS } from "@/lib/summary-performance-table-styles"

interface RevenueContributiveMarginTableProps {
  rows: RevenueContributiveMarginRow[]
  currency: string
  className?: string
  title?: string
  description?: string
  footnote?: string
  rowColumnLabel?: string
  testId?: string
  /** Affiche la colonne TCAC (désactivée en Pilotage). */
  showCagrColumn?: boolean
}

export const REVENUE_CONTRIBUTIVE_MARGIN_TABLE_FOOTNOTE =
  "Le calcul de la contribution marginale repose sur les coûts variables directement rattachés à chaque source de revenus dans le mapping comptable. Certains coûts variables peuvent ne pas être attribués à une source précise ; ils sont alors exclus de cette analyse."

/** Fond gris sur toute la colonne Part contr. (aligné sur les colonnes Écart des tableaux indicateurs). */
const CONTRIBUTIVE_SHARE_COLUMN_CLASS = SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS

const headerCellClass =
  "px-2 pb-2 text-left text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-slate-400 first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6"
const headerValueClass = cn(headerCellClass, "text-right")
const labelCellClass = "px-2 py-[9px] text-left text-xs font-medium text-[#2A2F3A] first:pl-4 last:pr-4 sm:first:pl-6 sm:last:pr-6"
const valueCellClass =
  "px-2 py-[9px] text-right font-mono text-[11.5px] font-medium tabular-nums text-[#2A2F3A] last:pr-4 sm:last:pr-6"
const mutedValueCellClass = cn(valueCellClass, "text-slate-500")
const contributiveShareCellClass = cn(valueCellClass, CONTRIBUTIVE_SHARE_COLUMN_CLASS, "text-slate-800")
const contributiveShareHeaderClass = cn(headerValueClass, CONTRIBUTIVE_SHARE_COLUMN_CLASS, "text-slate-600")

function formatOptionalMoney(value: number | null, currency: string): string {
  if (value === null) return "—"
  return formatMoney(value, currency)
}

function formatOptionalPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—"
  return formatPercent(value)
}

export function RevenueContributiveMarginTable({
  rows,
  currency,
  className,
  title = "Marges contributives par source de revenus",
  description = "Revenus, coûts variables (mapping comptable) et contribution marginale à la date de référence. Les parts indiquent la pondération dans le chiffre d'affaires et dans la contribution totale.",
  footnote = REVENUE_CONTRIBUTIVE_MARGIN_TABLE_FOOTNOTE,
  rowColumnLabel = "Source",
  testId = "revenue-contributive-margin-table",
  showCagrColumn = true,
}: RevenueContributiveMarginTableProps) {
  if (!rows.length) return null

  const totals = buildRevenueContributiveMarginTotals(rows)

  return (
    <section data-testid={testId} className={cn("w-full", className)}>
      <div className="mb-4 px-4 sm:px-6">
        <h5 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          {title}
        </h5>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>

      <div className="w-full overflow-x-auto">
        <table className={cn("w-full border-collapse", showCagrColumn ? "min-w-[48rem]" : "min-w-[42rem]")}>
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[11%]" />
            <col className="w-[11%]" />
            <col className="w-[12%]" />
            <col className="w-[9%]" />
            <col className={cn("w-[9%]", CONTRIBUTIVE_SHARE_COLUMN_CLASS)} />
            <col className={cn(showCagrColumn ? "w-[10%]" : "w-[12%]")} />
            {showCagrColumn ? <col className="w-[9%]" /> : null}
          </colgroup>
          <thead>
            <tr>
              <th className={headerCellClass}>{rowColumnLabel}</th>
              <th className={headerValueClass}>Revenus</th>
              <th className={headerValueClass}>Coûts var.</th>
              <th className={headerValueClass}>Contr. marginale</th>
              <th className={headerValueClass}>Marge</th>
              <th className={contributiveShareHeaderClass}>Part contr.</th>
              <th className={headerValueClass}>Part CA</th>
              {showCagrColumn ? <th className={headerValueClass}>TCAC</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-testid={`contributive-margin-row-${row.id}`}
                className="border-t border-slate-200"
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
                    {!row.mappingConfigured && (
                      <span className="flex-none rounded-[5px] bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[.06em] text-slate-500">
                        Mapping
                      </span>
                    )}
                  </span>
                </td>
                <td className={valueCellClass}>{formatMoney(row.revenue, currency)}</td>
                <td className={mutedValueCellClass}>
                  {formatOptionalMoney(row.variableCost, currency)}
                </td>
                <td
                  className={valueCellClass}
                  style={{ color: (row.contributiveMargin ?? 0) < 0 ? "#dc2626" : "#2A2F3A" }}
                >
                  {formatOptionalMoney(row.contributiveMargin, currency)}
                </td>
                <td className={mutedValueCellClass}>{formatOptionalPercent(row.marginPct)}</td>
                <td className={contributiveShareCellClass}>
                  {formatOptionalPercent(row.contributiveSharePct)}
                </td>
                <td className={mutedValueCellClass}>{formatPercent(row.revenueSharePct)}</td>
                {showCagrColumn ? (
                  <td
                    className={cn(valueCellClass, "text-slate-500")}
                    style={{
                      color:
                        row.revenueCagrPct !== null && row.revenueCagrPct > 10 ? "#059669" : "#64748b",
                    }}
                  >
                    {formatOptionalPercent(row.revenueCagrPct)}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-300 font-semibold">
              <td className={cn(labelCellClass, "text-xs")}>Total</td>
              <td className={valueCellClass}>{formatMoney(totals.revenue, currency)}</td>
              <td className={valueCellClass}>{formatOptionalMoney(totals.variableCost, currency)}</td>
              <td className={valueCellClass}>
                {formatOptionalMoney(totals.contributiveMargin, currency)}
              </td>
              <td className={valueCellClass}>{formatOptionalPercent(totals.marginPct)}</td>
              <td className={contributiveShareCellClass}>
                {formatOptionalPercent(totals.contributiveSharePct)}
              </td>
              <td className={mutedValueCellClass}>{formatPercent(100)}</td>
              {showCagrColumn ? <td className={cn(valueCellClass, "text-slate-400")}>—</td> : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {footnote ? (
        <p
          data-testid="revenue-contributive-margin-table-footnote"
          className="mt-4 px-4 text-xs leading-relaxed text-slate-500 sm:px-6"
        >
          {footnote}
        </p>
      ) : null}
    </section>
  )
}
