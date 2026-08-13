"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, LayoutList, Settings, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Company } from "@/components/entity-selector"
import { StatementStructureStudio } from "@/components/statement-structure-studio"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getStatementStructure } from "@/lib/api"
import { formatCurrency } from "@/lib/financial-utils"
import {
  calendarYearSequenceFromReference,
  findPeriodIndexForCalendarMonth,
} from "@/lib/series-reference-columns"
import { reverseSeriesOrderForDisplay } from "@/lib/series-utils"
import {
  capexYearCalendarMonth,
  capexYearLabelsChronological,
  parseFiscalYearEndMonth,
} from "@/lib/capex-year-reference"
import {
  alignSeriesPeriodIndex,
  collectWorkingCapitalIncludedOperandsForDisplay,
  normalizeWorkingCapitalDisplayFormat,
  resolveWorkingCapitalDisplayFormat,
  resolveWorkingCapitalOperandAmount,
  resolveWorkingCapitalStructureAmount,
  workingCapitalOperandDisplayLabel,
  workingCapitalStructureViewRows,
  WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS,
  type WorkingCapitalDisplayFormat,
  type WorkingCapitalIncludedOperand,
} from "@/lib/working-capital-structure-utils"
import {
  averageDisplayedHorizonValues,
  emptyHorizonColumnMask,
  pickHorizonColumns,
} from "@/lib/horizon-column-visibility"
import { CONTRIBUTIVE_MARGIN_AMOUNT_EPSILON } from "@/lib/revenue-contributive-margin-evolution"
import { IndicatorAnalysisTableColGroup } from "@/components/indicator-analysis-table-colgroup"
import {
  computeRatios,
  findFallbackRatioRow,
  type RatioDisplayView,
} from "@/lib/financial-ratios"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

export { computeRatios } from "@/lib/financial-ratios"
export type { RatioDataPoint } from "@/lib/financial-ratios"

type MetricFormat = "currency" | "percent" | "ratio" | "days"

function displayFormatToMetricFormat(format: WorkingCapitalDisplayFormat): MetricFormat {
  if (format === "number") return "ratio"
  return format
}

function formatMetricValue(value: number, format: MetricFormat): string {
  if (format === "percent") return `${value.toFixed(1)}%`
  if (format === "ratio") return `${value.toFixed(2)}x`
  if (format === "days") return `${value.toFixed(2)} jours`
  return formatCurrency(value)
}

interface DisplayMetric {
  key: string
  label: string
  format: MetricFormat
  isBold?: boolean
  showAmounts: boolean
  valueAt: (isPrior: boolean, trendIndex?: number) => number
}

interface FinancialRatiosProps {
  view: RatioDisplayView
  period?: "monthly" | "quarterly" | "annual"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  fiscalYear?: number
  referenceMonth?: number
  structureVersion?: number
  showStructureSettings?: boolean
  onStructureSaved?: () => void
}

export function FinancialRatios({
  view,
  period = "monthly",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  fiscalYear,
  referenceMonth,
  structureVersion = 0,
  showStructureSettings = false,
  onStructureSaved,
}: FinancialRatiosProps) {
  const resolvedYear = fiscalYear ?? new Date().getFullYear()
  const resolvedMonth = referenceMonth ?? new Date().getMonth() + 1
  const fiscalYearEndMonth = parseFiscalYearEndMonth(
    companies.find((c) => c.id === companyId)?.fiscalYearEnd ?? "12-31",
  )
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12
  const isMonthsNeeded = monthsNeeded + WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS

  const [structureEditMode, setStructureEditMode] = useState(false)
  const [localStructureVersion, setLocalStructureVersion] = useState(0)
  const [structure, setStructure] = useState<Record<string, unknown>[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const { rows: bsRows, periods: bsPeriods, loading: bsLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: resolvedYear,
    month: resolvedMonth,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const { rows: isRows, periods: isPeriods, loading: isLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: resolvedYear,
    month: resolvedMonth,
    months: isMonthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const { rows: cfRows, periods: cfPeriods, loading: cfLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow-detail",
    fiscalYear: resolvedYear,
    month: resolvedMonth,
    months: isMonthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const loading = bsLoading || isLoading || cfLoading
  const lookupIsRows = useMemo(() => [...isRows, ...cfRows], [isRows, cfRows])
  const lookupIsPeriods = isPeriods.length >= cfPeriods.length ? isPeriods : cfPeriods
  const canInlineStructureEdit = showStructureSettings && !!companyId
  const isStructureStudio = structureEditMode && canInlineStructureEdit

  useEffect(() => {
    if (!companyId) {
      setStructure([])
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "ratios")
      .then((res) => {
        if (!cancelled) setStructure(Array.isArray(res.structure) ? res.structure : [])
      })
      .catch(() => {
        if (!cancelled) setStructure([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, structureVersion, localStructureVersion])

  const ratioData = useMemo(() => {
    if (isPeriods.length === 0) return []
    return computeRatios(isRows, bsRows, isPeriods)
  }, [isRows, bsRows, isPeriods])

  const periodIndexFor = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined) {
      if (view === "years" && bsPeriods.length > 0) {
        const yearsChronological = [...calendarYearSequenceFromReference(resolvedYear, 6)].reverse()
        const year =
          yearsChronological[Math.max(0, Math.min(trendIndex, yearsChronological.length - 1))]!
        const month = capexYearCalendarMonth(
          year,
          resolvedMonth,
          resolvedYear,
          fiscalYearEndMonth,
        )
        return findPeriodIndexForCalendarMonth(bsPeriods, month, year)
      }
      return Math.max(0, Math.min(trendIndex, Math.max(0, bsPeriods.length - 1)))
    }
    const len = Math.max(bsPeriods.length, 1)
    return isPrior ? Math.max(0, len - 2) : len - 1
  }

  const operandDisplayContext = useMemo(
    () => ({ bsRows, isRows: lookupIsRows }),
    [bsRows, lookupIsRows],
  )

  const tableRows: Array<
    | { kind: "separator"; key: string }
    | { kind: "spacer"; key: string }
    | {
        kind: "metric"
        key: string
        metric: DisplayMetric
        structureRow: Record<string, unknown>
        operands: WorkingCapitalIncludedOperand[]
      }
  > = useMemo(() => {
    const buildMetricFromRow = (
      row: Record<string, unknown>,
      idx: number,
    ): DisplayMetric => {
      const label = String(row.label || `Métrique ${idx + 1}`)
      const isBold = row.isBold === true
      const explicitFormat = normalizeWorkingCapitalDisplayFormat(row.displayFormat)
      const structured = resolveWorkingCapitalStructureAmount(
        row,
        bsRows,
        lookupIsRows,
        bsPeriods,
        lookupIsPeriods,
        0,
        structure,
      )
      if (structured !== null) {
        const displayFormat = explicitFormat ?? resolveWorkingCapitalDisplayFormat(row)
        return {
          key: `struct-${idx}`,
          label,
          isBold,
          showAmounts: true,
          format: displayFormatToMetricFormat(displayFormat),
          valueAt: (isPrior: boolean, trendIndex?: number) => {
            const periodIndex = periodIndexFor(isPrior, trendIndex)
            if (periodIndex < 0) return 0
            const raw =
              resolveWorkingCapitalStructureAmount(
                row,
                bsRows,
                lookupIsRows,
                bsPeriods,
                lookupIsPeriods,
                periodIndex,
                structure,
              ) ?? 0
            return displayFormat === "percent" ? raw * 100 : raw
          },
        }
      }
      const fallback = findFallbackRatioRow(label)
      if (fallback) {
        const format: MetricFormat =
          explicitFormat != null
            ? displayFormatToMetricFormat(explicitFormat)
            : fallback.format === "percentage"
              ? "percent"
              : "ratio"
        return {
          key: fallback.key,
          label,
          isBold,
          showAmounts: true,
          format,
          valueAt: (isPrior: boolean, trendIndex?: number) => {
            const periodIndex = periodIndexFor(isPrior, trendIndex)
            if (periodIndex < 0) return 0
            const isIdx = alignSeriesPeriodIndex(isPeriods, bsPeriods, periodIndex)
            const point = ratioData[isIdx]
            const value = point?.[fallback.key]
            return value ?? 0
          },
        }
      }
      return {
        key: `row-${idx}`,
        label,
        isBold,
        showAmounts: false,
        format: displayFormatToMetricFormat(explicitFormat ?? "number"),
        valueAt: () => 0,
      }
    }

    const viewRows = workingCapitalStructureViewRows(structure)
    if (viewRows.length > 0) {
      return viewRows.map((item) => {
        if (item.kind === "separator" || item.kind === "spacer") return item
        return {
          kind: "metric" as const,
          key: item.key,
          metric: buildMetricFromRow(item.row, item.index),
          structureRow: item.row,
          operands: collectWorkingCapitalIncludedOperandsForDisplay(
            item.row,
            operandDisplayContext,
          ),
        }
      })
    }

    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, bsRows, lookupIsRows, bsPeriods, lookupIsPeriods, ratioData, view])

  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowKey)) next.delete(rowKey)
      else next.add(rowKey)
      return next
    })
  }

  const yearColumnLabelsChronological = () =>
    capexYearLabelsChronological(resolvedMonth, resolvedYear, fiscalYearEndMonth, 6)

  const getPeriodColumnLabels = (): string[] => {
    if (view === "years") return reverseSeriesOrderForDisplay(yearColumnLabelsChronological())
    if (bsPeriods.length > 0) {
      if (view === "current") {
        const last = bsPeriods[bsPeriods.length - 1]?.label ?? "Courant"
        const prior =
          bsPeriods.length > 1 ? (bsPeriods[bsPeriods.length - 2]?.label ?? "Passé") : "Passé"
        return [last, prior]
      }
      const monthlyWindow = view === "24months" ? 24 : view === "12months" ? 12 : bsPeriods.length
      return reverseSeriesOrderForDisplay(bsPeriods.slice(-monthlyWindow).map((p) => p.label))
    }
    if (view === "current") return ["Courant", "Passé"]
    return []
  }

  const getHorizonText = (): string => {
    if (view === "current" && period === "monthly") return "Courant"
    if (view === "current" && period === "quarterly") return "Trimestriel"
    if (view === "current" && period === "annual") return "Annuel"
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "5 ans"
    return "Courant"
  }

  const trendCount =
    view === "24months" ? 24 : view === "years" ? 6 : view === "12months" ? 12 : 0

  const annualYearsColumnMask = useMemo(() => {
    if (view !== "years" || bsPeriods.length === 0) return null
    const chronologicalLabels = yearColumnLabelsChronological()
    const displayLabels = reverseSeriesOrderForDisplay(chronologicalLabels)
    const metricRows = tableRows
      .filter((item): item is Extract<typeof item, { kind: "metric" }> => item.kind === "metric")
      .filter((item) => item.metric.showAmounts)
      .map((item) => {
        const chronologicalValues = Array.from({ length: trendCount }, (_, idx) =>
          item.metric.valueAt(false, idx),
        )
        return reverseSeriesOrderForDisplay(chronologicalValues)
      })
    if (!metricRows.length || !displayLabels.length) return null
    return emptyHorizonColumnMask(displayLabels.length, metricRows)
  }, [view, tableRows, trendCount, bsPeriods, resolvedMonth, resolvedYear, fiscalYearEndMonth])

  const filterAnnualDisplayColumns = <T,>(items: T[]): T[] => {
    if (view !== "years" || !annualYearsColumnMask) return items
    return pickHorizonColumns(items, annualYearsColumnMask)
  }

  const visiblePeriodLabels = filterAnnualDisplayColumns(getPeriodColumnLabels())
  const visiblePeriodCount = view === "current" ? 2 : Math.max(visiblePeriodLabels.length, 1)
  const isDenseMonthHorizon = view === "12months" || view === "24months"
  const fillTableWidth = !isDenseMonthHorizon && view === "years"

  const metricColumnClass =
    "box-border w-[18rem] min-w-[18rem] max-w-[18rem] sm:w-[20rem] sm:min-w-[20rem] sm:max-w-[20rem]"
  const amountCellClass = (isBold?: boolean) =>
    cn(
      "whitespace-nowrap px-6 py-3 text-right text-sm tabular-nums",
      isBold ? "font-semibold font-bold text-slate-900" : "text-slate-500",
    )
  const amountTrendCellClass = (isBold?: boolean) =>
    cn(
      "whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums",
      isDenseMonthHorizon ? "min-w-[8.75rem]" : "min-w-[5.5rem]",
      isBold ? "font-semibold font-bold text-slate-900" : "text-slate-500",
    )
  const amountAverageCellClass = (isBold?: boolean) =>
    cn(
      "min-w-[7.5rem] whitespace-nowrap bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3 text-right text-sm tabular-nums",
      isBold ? "font-semibold font-bold text-slate-900" : "text-slate-500",
    )
  const metricLabelCellClass = (isBold?: boolean, isChild?: boolean) =>
    cn(
      metricColumnClass,
      "sticky left-0 z-10",
      isChild
        ? "bg-slate-50 py-2.5 pl-14 pr-6 text-sm text-slate-600"
        : cn("bg-white px-6 py-3 text-slate-900", isBold && "font-bold"),
    )
  const tableHeaderClass = "px-6 py-4 text-sm font-semibold text-[#2A2F3A]"
  const tableHeaderAverageClass = cn(
    tableHeaderClass,
    "min-w-[7.5rem] text-right bg-gradient-to-b from-slate-50 to-slate-100/50",
  )
  const tableHeaderPeriodClass = cn(
    tableHeaderClass,
    "text-right",
    view === "current" ? "min-w-[7.5rem]" : isDenseMonthHorizon ? "min-w-[8.75rem] px-4" : "min-w-[5.5rem] px-4",
  )
  const rowHoverClass = "hover:bg-[#E0742D]/[0.04]"
  const rowHoverCellClass = "group-hover:bg-[#FDF6F1]"
  const averageRowHoverCellClass = "group-hover:from-[#FDF6F1] group-hover:to-[#FDF6F1]"

  const renderMetricRow = (
    rowKey: string,
    metric: DisplayMetric,
    operands: WorkingCapitalIncludedOperand[],
  ) => {
    const chronologicalValues =
      view === "current"
        ? [metric.valueAt(false), metric.valueAt(true)]
        : Array.from({ length: trendCount }, (_, idx) => metric.valueAt(false, idx))
    const values =
      view === "current"
        ? chronologicalValues
        : filterAnnualDisplayColumns(reverseSeriesOrderForDisplay(chronologicalValues))
    const displayedForAverage = metric.showAmounts
      ? values.filter((value) => Number.isFinite(value))
      : []
    const average =
      displayedForAverage.length > 0 ? averageDisplayedHorizonValues(displayedForAverage) : null

    const formatCell = (value: number) =>
      metric.showAmounts ? formatMetricValue(value, metric.format) : ""

    const operandAmountAt = (code: string, periodIndex: number): number => {
      if (periodIndex < 0) return 0
      return resolveWorkingCapitalOperandAmount(
        code,
        bsRows,
        lookupIsRows,
        bsPeriods,
        lookupIsPeriods,
        periodIndex,
        structure,
      )
    }

    const operandChronologicalValues = (code: string): number[] => {
      if (view === "current") {
        return [
          operandAmountAt(code, periodIndexFor(false)),
          operandAmountAt(code, periodIndexFor(true)),
        ]
      }
      return Array.from({ length: trendCount }, (_, idx) =>
        operandAmountAt(code, periodIndexFor(false, idx)),
      )
    }

    const visibleOperands = operands.filter((op) =>
      operandChronologicalValues(op.code).some(
        (value) => Math.abs(value) > CONTRIBUTIVE_MARGIN_AMOUNT_EPSILON,
      ),
    )
    const canExpand = visibleOperands.length > 0
    const isExpanded = expandedRows.has(rowKey)

    return (
      <Fragment key={rowKey}>
        <tr
          className={cn("group transition-colors", rowHoverClass, canExpand && "cursor-pointer")}
          onClick={canExpand ? () => toggleRow(rowKey) : undefined}
        >
          <td className={cn(metricLabelCellClass(metric.isBold), rowHoverCellClass)}>
            <div className="flex items-center gap-2">
              {canExpand ? (
                <span className="flex-shrink-0" aria-hidden>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  )}
                </span>
              ) : (
                <span className="inline-block w-4 flex-shrink-0" aria-hidden />
              )}
              <span className="min-w-0 truncate">{metric.label}</span>
            </div>
          </td>
          <td className={cn(amountAverageCellClass(metric.isBold), averageRowHoverCellClass)}>
            {average == null ? "" : formatMetricValue(average, metric.format)}
          </td>
          {view === "current" ? (
            <>
              <td className={cn(amountCellClass(metric.isBold), rowHoverCellClass)}>
                {formatCell(values[0] ?? 0)}
              </td>
              <td className={cn(amountCellClass(metric.isBold), rowHoverCellClass)}>
                {formatCell(values[1] ?? 0)}
              </td>
            </>
          ) : (
            values.map((value, idx) => (
              <td key={idx} className={cn(amountTrendCellClass(metric.isBold), rowHoverCellClass)}>
                {formatCell(value)}
              </td>
            ))
          )}
        </tr>
        {isExpanded
          ? visibleOperands.map((op) => {
              const chronological = operandChronologicalValues(op.code)
              const displayValues = filterAnnualDisplayColumns(
                view === "current" ? chronological : reverseSeriesOrderForDisplay(chronological),
              )
              const opAverage =
                displayValues.length > 0 ? averageDisplayedHorizonValues(displayValues) : 0
              const label = workingCapitalOperandDisplayLabel(
                op.code,
                bsRows,
                lookupIsRows,
                structure,
              )
              return (
                <tr
                  key={`${rowKey}-${op.role}-${op.code}`}
                  className="bg-slate-50/80"
                  data-testid={`ratios-operand-${op.code}`}
                >
                  <td className={metricLabelCellClass(false, true)}>
                    <span className="inline-flex min-w-0 items-baseline gap-1.5">
                      {op.sign ? (
                        <span className="font-medium tabular-nums text-slate-400">{op.sign}</span>
                      ) : null}
                      <span className="font-mono text-xs text-slate-500">{op.code}</span>
                      <span className="text-slate-400">—</span>
                      <span className="min-w-0 truncate">{label}</span>
                    </span>
                  </td>
                  <td className={amountAverageCellClass(false)}>{formatCurrency(opAverage)}</td>
                  {view === "current" ? (
                    <>
                      <td className={amountCellClass(false)}>{formatCurrency(displayValues[0] ?? 0)}</td>
                      <td className={amountCellClass(false)}>{formatCurrency(displayValues[1] ?? 0)}</td>
                    </>
                  ) : (
                    displayValues.map((v, idx) => (
                      <td key={idx} className={amountTrendCellClass(false)}>
                        {formatCurrency(v)}
                      </td>
                    ))
                  )}
                </tr>
              )
            })
          : null}
      </Fragment>
    )
  }

  const analysisBody = isStructureStudio ? (
    <StatementStructureStudio
      embedded
      companyId={companyId!}
      statementType="ratios"
      hideAnnexColumns
      onSaved={() => {
        setLocalStructureVersion((v) => v + 1)
        onStructureSaved?.()
        setStructureEditMode(false)
      }}
      onClose={() => setStructureEditMode(false)}
    />
  ) : loading ? (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
    </div>
  ) : !companyId ? (
    <div className="flex items-center justify-center py-12 text-sm text-slate-500">
      Sélectionnez une société
    </div>
  ) : tableRows.length === 0 ? (
    <div className="flex items-center justify-center py-12 text-sm text-slate-500">
      Aucune donnée disponible
    </div>
  ) : (
    <div
      className="max-h-[min(72vh,56rem)] min-w-0 w-full overflow-auto overscroll-contain bg-white"
      data-testid="ratios-summary-table-scroll"
    >
      <table
        className={cn(
          "w-full border-separate border-spacing-0",
          fillTableWidth ? "table-fixed" : "min-w-max",
        )}
      >
        {fillTableWidth ? (
          <IndicatorAnalysisTableColGroup periodCount={visiblePeriodCount} />
        ) : null}
        <thead
          className={cn(
            "[&_th]:sticky [&_th]:top-0 [&_th]:z-20",
            "[&_th]:border-b-2 [&_th]:border-slate-200 [&_th]:bg-gradient-to-b [&_th]:from-slate-50 [&_th]:to-slate-100/80 [&_th:first-child]:left-0 [&_th:first-child]:z-30",
          )}
        >
          <tr>
            <th className={cn(metricColumnClass, tableHeaderClass, "text-left")}>Métrique</th>
            <th className={tableHeaderAverageClass}>Moyenne</th>
            {visiblePeriodLabels.map((label, idx) => (
              <th key={idx} className={tableHeaderPeriodClass}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-slate-200 [&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10">
          {tableRows.map((item) => {
            if (item.kind === "separator") {
              return (
                <tr key={item.key} data-testid="ratios-structure-separator">
                  <td
                    colSpan={2 + visiblePeriodCount}
                    className="border-0 p-0 align-top leading-none border-t border-t-slate-600"
                  />
                </tr>
              )
            }
            if (item.kind === "spacer") {
              return (
                <tr key={item.key} data-testid="ratios-structure-spacer">
                  <td className={metricLabelCellClass(false)} />
                  <td className={amountAverageCellClass(false)} data-testid="ratios-spacer-average-cell" />
                  {Array.from({ length: visiblePeriodCount }, (_, idx) => (
                    <td
                      key={idx}
                      className={view === "current" ? amountCellClass(false) : amountTrendCellClass(false)}
                    />
                  ))}
                </tr>
              )
            }
            return renderMetricRow(item.key, item.metric, item.operands)
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className={cn("mb-6", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={dashboardCardHeaderIconBoxClass}>
              <LayoutList className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h3 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>
                  Analyse des ratios
                </h3>
                {isStructureStudio && (
                  <Badge
                    variant="secondary"
                    className="border border-slate-200 bg-slate-100 font-medium text-[#2A2F3A] shadow-none"
                  >
                    <Sparkles className="h-3 w-3 text-[#E0742D]" />
                    Édition structure
                  </Badge>
                )}
              </div>
              {isStructureStudio ? (
                <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                  Ajustez les libellés. <span className="font-medium text-[#2A2F3A]">Code</span> active
                  la colonne liaison ;{" "}
                  <span className="font-medium text-[#2A2F3A]">Liaison</span> définit un code unique ou
                  une formule ; <span className="font-medium text-[#2A2F3A]">Format</span> choisit $,
                  Nombre, % ou Jours pour l’affichage hors Paramètres. Tous les codes de liaison
                  (y compris CMV.1) sont sélectionnables. Enregistrez pour appliquer.
                </p>
              ) : (
                <div className={cn("flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                  <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                  <span className="text-slate-400">•</span>
                  {companyId ? (
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                    </span>
                  ) : (
                    <span className="truncate">Toutes les sociétés</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {canInlineStructureEdit && !structureEditMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={dashboardCardStructureSettingsButtonClass}
              onClick={() => setStructureEditMode(true)}
            >
              <Settings className={cn("h-4 w-4", dashboardCardAccentClass)} />
              Paramètres
            </Button>
          )}
        </div>
      </div>

      {analysisBody}
    </div>
  )
}
