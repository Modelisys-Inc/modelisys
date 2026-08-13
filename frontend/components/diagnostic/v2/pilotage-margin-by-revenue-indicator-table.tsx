"use client"

import { Fragment, useState, type ReactNode } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"
import type { ContributiveMarginEvolutionDetailRow } from "@/lib/revenue-contributive-margin-evolution"
import { filterZeroContributiveMarginDetailRows } from "@/lib/revenue-contributive-margin-evolution"
import { formatGlAccountDisplayLabel } from "@/lib/gl-account-display-label"
import type {
  PilotageMarginIndicatorMetric,
  PilotageMarginIndicatorTable,
} from "@/lib/pilotage-margin-by-revenue-indicator"
import { cn } from "@/lib/utils"
import { SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS } from "@/lib/summary-performance-table-styles"

interface PilotageMarginByRevenueIndicatorTableProps {
  table: PilotageMarginIndicatorTable
  currency: string
  className?: string
  density?: "default" | "compact"
}

type IndicatorTableCellClasses = {
  headerCellClass: string
  headerValueClass: string
  labelCellClass: string
  valueCellClass: string
  detailValueCellClass: string
  detailLabelClass: (depth: number) => string
  wrapperClassName: string
}

function indicatorTableCellClasses(density: "default" | "compact"): IndicatorTableCellClasses {
  const compact = density === "compact"
  const headerCellClass = cn(
    "px-2 text-left font-semibold uppercase leading-tight tracking-[.08em] text-slate-400 first:pl-1 last:pr-1",
    compact ? "pb-1.5 text-[9px]" : "pb-2 text-[9.5px]",
  )
  const labelCellClass = cn(
    "px-2 text-left font-medium text-[#2A2F3A] first:pl-1",
    compact ? "py-[6px] text-[11px]" : "py-[9px] text-xs",
  )
  const valueCellClass = cn(
    "px-2 text-right font-mono font-medium tabular-nums text-slate-600 last:pr-1",
    compact ? "py-[6px] text-[11px]" : "py-[9px] text-[11.5px]",
  )
  const detailValueCellClass = cn(
    "px-2 text-right font-mono font-normal tabular-nums text-slate-500 last:pr-1",
    compact ? "py-[5px] text-[10.5px]" : "py-[7px] text-[11px]",
  )

  return {
    headerCellClass,
    headerValueClass: cn(headerCellClass, "text-right"),
    labelCellClass,
    valueCellClass,
    detailValueCellClass,
    detailLabelClass: (depth: number) => {
      const pad = depth <= 1 ? "pl-7" : depth === 2 ? "pl-12" : "pl-16"
      return cn(
        "px-2 text-left text-slate-500 first:pl-1",
        pad,
        depth === 1 && "font-medium text-slate-600",
        compact ? "py-[5px] text-[11px]" : "py-[7px] text-[11.5px]",
      )
    },
    wrapperClassName: compact ? "mt-3 w-full overflow-x-auto" : "mt-4 w-full overflow-x-auto",
  }
}

const GAP_COLUMN_CLASS = SUMMARY_TABLE_HIGHLIGHT_COLUMN_CLASS

function formatCell(
  value: number | null,
  format: "currency" | "percent",
  currency: string,
): string {
  if (value === null || !Number.isFinite(value)) return "—"
  return format === "currency" ? formatMoney(value, currency) : formatPercent(value)
}

function formatShareOfSourceRevenue(
  value: number | null,
  format: "currency" | "percent",
  sourceRevenue: number | null | undefined,
): string {
  if (format !== "currency") return "—"
  if (value === null || sourceRevenue === null || sourceRevenue === undefined) return "—"
  if (!Number.isFinite(value) || !Number.isFinite(sourceRevenue) || Math.abs(sourceRevenue) < 1e-6) {
    return "—"
  }
  return formatPercent((value / sourceRevenue) * 100)
}

function formatGap(
  value: number | null,
  format: "currency" | "percent",
  currency: string,
): string {
  if (value === null || !Number.isFinite(value)) return "—"
  if (format === "currency") {
    const sign = value > 0 ? "+" : ""
    return `${sign}${formatMoney(value, currency)}`
  }
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(1).replace(".", ",")} pt`
}

function gapColumnClass(): string {
  return GAP_COLUMN_CLASS
}

function formatDetailLabel(detail: ContributiveMarginEvolutionDetailRow): string {
  if (detail.displayKind === "link-code") {
    return detail.label.trim() === detail.id ? detail.id : `${detail.id} — ${detail.label}`
  }
  return formatGlAccountDisplayLabel(detail.id, detail.label)
}

function detailRowKey(metricId: string, path: string[]): string {
  return [metricId, ...path].join("/")
}

function ColumnValueCells({
  metric,
  table,
  currency,
  valueCellClassName,
}: {
  metric: PilotageMarginIndicatorMetric
  table: PilotageMarginIndicatorTable
  currency: string
  valueCellClassName: string
}) {
  return metric.values.map((value, index) => {
    const group = table.columnGroups[index]
    return (
      <Fragment key={`${group?.label ?? index}-${index}`}>
        <td className={valueCellClassName}>{formatCell(value, metric.format, currency)}</td>
        {group?.includeShare ? (
          <td className={valueCellClassName}>
            {formatShareOfSourceRevenue(
              value,
              metric.format,
              table.sourceRevenuesByColumn[index],
            )}
          </td>
        ) : null}
        {group?.includeGap ? (
          <td className={cn(valueCellClassName, gapColumnClass())}>
            {formatGap(metric.gaps[index], metric.format, currency)}
          </td>
        ) : null}
      </Fragment>
    )
  })
}

function DetailRows({
  details,
  metric,
  table,
  currency,
  metricId,
  path,
  depth,
  expandedRows,
  onToggle,
  cellClasses,
}: {
  details: ContributiveMarginEvolutionDetailRow[]
  metric: PilotageMarginIndicatorMetric
  table: PilotageMarginIndicatorTable
  currency: string
  metricId: string
  path: string[]
  depth: number
  expandedRows: Record<string, boolean>
  onToggle: (key: string) => void
  cellClasses: IndicatorTableCellClasses
}): ReactNode {
  const visibleDetails = filterZeroContributiveMarginDetailRows(details, table.columnGroups.length)

  return visibleDetails.map((detail) => {
    const rowPath = [...path, detail.id]
    const key = detailRowKey(metricId, rowPath)
    const visibleChildRows = detail.detailRows
      ? filterZeroContributiveMarginDetailRows(detail.detailRows, table.columnGroups.length)
      : undefined
    const canExpand = (visibleChildRows?.length ?? 0) > 0
    const expanded = expandedRows[key] === true

    return (
      <Fragment key={key}>
        <tr
          className={cn(
            "bg-slate-50/70",
            canExpand && "cursor-pointer hover:bg-slate-100/80",
          )}
          onClick={canExpand ? () => onToggle(key) : undefined}
          data-testid={`contributive-margin-${metric.id}-detail-${rowPath.join("-")}`}
          aria-expanded={canExpand ? expanded : undefined}
        >
          <td className={cellClasses.detailLabelClass(depth)}>
            <span className="inline-flex items-center gap-1.5">
              {canExpand ? (
                <span className="flex-shrink-0" aria-hidden>
                  {expanded ? (
                    <ChevronDown className="h-3 w-3 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-slate-500" />
                  )}
                </span>
              ) : null}
              <span>{formatDetailLabel(detail)}</span>
            </span>
          </td>
          <ColumnValueCells
            metric={{
              ...metric,
              values: detail.values,
              shares: detail.values.map((value, colIndex) => {
                const revenue = table.sourceRevenuesByColumn[colIndex]
                if (value === null || revenue === null || Math.abs(revenue) < 1e-6) return null
                return (value / revenue) * 100
              }),
              gaps: detail.values.map((value, colIndex) => {
                if (colIndex === 0) return null
                const ref = detail.values[0]
                if (ref === null || value === null) return null
                return ref - value
              }),
            }}
            table={table}
            currency={currency}
            valueCellClassName={cellClasses.detailValueCellClass}
          />
        </tr>
        {canExpand && expanded && visibleChildRows ? (
          <DetailRows
            details={visibleChildRows}
            metric={metric}
            table={table}
            currency={currency}
            metricId={metricId}
            path={rowPath}
            depth={depth + 1}
            expandedRows={expandedRows}
            onToggle={onToggle}
            cellClasses={cellClasses}
          />
        ) : null}
      </Fragment>
    )
  })
}

function MetricRows({
  metric,
  table,
  currency,
  expanded,
  onToggleExpand,
  expandedRows,
  onToggleDetailRow,
  cellClasses,
}: {
  metric: PilotageMarginIndicatorMetric
  table: PilotageMarginIndicatorTable
  currency: string
  expanded: boolean
  onToggleExpand?: () => void
  expandedRows: Record<string, boolean>
  onToggleDetailRow: (key: string) => void
  cellClasses: IndicatorTableCellClasses
}) {
  const visibleDetailRows = metric.detailRows
    ? filterZeroContributiveMarginDetailRows(metric.detailRows, table.columnGroups.length)
    : undefined
  const canExpand = (visibleDetailRows?.length ?? 0) > 0

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
        <td className={cellClasses.labelCellClass}>
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
        <ColumnValueCells
          metric={metric}
          table={table}
          currency={currency}
          valueCellClassName={cellClasses.valueCellClass}
        />
      </tr>
      {canExpand && expanded ? (
        <DetailRows
          details={visibleDetailRows!}
          metric={metric}
          table={table}
          currency={currency}
          metricId={metric.id}
          path={[]}
          depth={1}
          expandedRows={expandedRows}
          onToggle={onToggleDetailRow}
          cellClasses={cellClasses}
        />
      ) : null}
    </>
  )
}

export function PilotageMarginByRevenueIndicatorTable({
  table,
  currency,
  className,
  density = "default",
}: PilotageMarginByRevenueIndicatorTableProps) {
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({})
  const [expandedDetailRows, setExpandedDetailRows] = useState<Record<string, boolean>>({})
  const cellClasses = indicatorTableCellClasses(density)

  if (!table.columnGroups.length) return null

  const toggleMetric = (metricId: string) => {
    setExpandedMetrics((current) => ({ ...current, [metricId]: !current[metricId] }))
  }

  const toggleDetailRow = (key: string) => {
    setExpandedDetailRows((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div
      data-testid={`contributive-margin-evolution-${table.sourceId}`}
      className={cn(cellClasses.wrapperClassName, className)}
    >
      <table className="w-full min-w-[32rem] border-collapse">
        <thead>
          <tr>
            <th className={cellClasses.headerCellClass}>Indicateur</th>
            {table.columnGroups.map((group) => (
              <Fragment key={group.label}>
                <th className={cellClasses.headerValueClass}>{group.label}</th>
                {group.includeShare ? <th className={cellClasses.headerValueClass}>% CA</th> : null}
                {group.includeGap ? (
                  <th className={cn(cellClasses.headerValueClass, gapColumnClass())}>Écart</th>
                ) : null}
              </Fragment>
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
              expandedRows={expandedDetailRows}
              onToggleDetailRow={toggleDetailRow}
              cellClasses={cellClasses}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
