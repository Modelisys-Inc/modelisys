"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { StatementStructureStudio } from "@/components/statement-structure-studio"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, aggregateToYears, findRow, reverseSeriesOrderForDisplay } from "@/lib/series-utils"
import { getStatementStructure } from "@/lib/api"
import {
  resolveWorkingCapitalStructureAmount,
  resolveWorkingCapitalOperandAmount,
  collectWorkingCapitalIncludedOperands,
  workingCapitalOperandDisplayLabel,
  workingCapitalStructureViewRows,
  normalizeWorkingCapitalDisplayFormat,
  resolveWorkingCapitalDisplayFormat,
  alignSeriesPeriodIndex,
  seriesTrailingTwelveMonthSum,
  WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS,
  type WorkingCapitalDisplayFormat,
  type WorkingCapitalIncludedOperand,
} from "@/lib/working-capital-structure-utils"
import { ChevronDown, ChevronRight, LayoutList, Settings, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
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

interface WorkingCapitalAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  fiscalYear?: number
  /** Mois calendaire (1–12) de la date de référence — borne la série (pas de mois futurs). */
  referenceMonth?: number
  structureVersion?: number
  showStructureSettings?: boolean
  onStructureSaved?: () => void
}

interface AnalysisData {
  currentAssets: number
  priorAssets: number
  currentLiabilities: number
  priorLiabilities: number
  currentRevenue: number
  priorRevenue: number
  currentCash: number
  priorCash: number
  trendValues?: Array<{
    assets: number
    liabilities: number
    revenue: number
    cash: number
  }>
}

type MetricFormat = "currency" | "percent" | "ratio" | "days"

function displayFormatToMetricFormat(format: WorkingCapitalDisplayFormat): MetricFormat {
  if (format === "number") return "ratio"
  return format
}

interface DisplayMetric {
  key: string
  label: string
  format: MetricFormat
  isBold?: boolean
  /** False si aucune liaison configurée dans Paramètres — montants masqués hors édition. */
  showAmounts: boolean
  valueAt: (isPrior: boolean, trendIndex?: number) => number
}

function normalizeMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function formatMetricValue(value: number, format: MetricFormat): string {
  if (format === "percent") return `${value.toFixed(1)}%`
  if (format === "ratio") return value.toFixed(2)
  if (format === "days") return `${value.toFixed(2)} jours`
  return formatCurrency(value)
}

export function WorkingCapitalAnalysis({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  fiscalYear,
  referenceMonth,
  structureVersion = 0,
  showStructureSettings = true,
  onStructureSaved,
}: WorkingCapitalAnalysisProps) {
  const resolvedYear = fiscalYear ?? new Date().getFullYear()
  const resolvedMonth = referenceMonth ?? new Date().getMonth() + 1
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12
  /** CDR : fenêtre affichée + 11 mois pour calculer le TTM à chaque date de référence. */
  const isMonthsNeeded = monthsNeeded + WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS
  const [structureEditMode, setStructureEditMode] = useState(false)
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

  const loading = bsLoading || isLoading
  const canInlineStructureEdit = showStructureSettings && !!companyId
  const isStructureStudio = structureEditMode && canInlineStructureEdit

  useEffect(() => {
    if (!companyId) {
      setStructure([])
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "working-capital")
      .then((res) => {
        if (!cancelled) setStructure(Array.isArray(res.structure) ? res.structure : [])
      })
      .catch(() => {
        if (!cancelled) setStructure([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, structureVersion])

  const data: AnalysisData = useMemo(() => {
    const empty: AnalysisData = {
      currentAssets: 0,
      priorAssets: 0,
      currentLiabilities: 0,
      priorLiabilities: 0,
      currentRevenue: 0,
      priorRevenue: 0,
      currentCash: 0,
      priorCash: 0,
      trendValues: undefined,
    }

    if (bsRows.length === 0 && isRows.length === 0) return empty

    const totalCurrentAssetsRow = findRow(bsRows, "total actifs courants")
    const totalCurrentLiabilitiesRow = findRow(bsRows, "total passifs courants")
    const totalRevenueRow = findRow(isRows, "total revenus") || findRow(isRows, "revenus")
    const cashRow = findRow(bsRows, "encaisse") || findRow(bsRows, "trésorerie") || findRow(bsRows, "cash")

    const assetsAmounts = totalCurrentAssetsRow ? getRowAmounts(totalCurrentAssetsRow, bsPeriods) : []
    const liabilitiesAmounts = totalCurrentLiabilitiesRow
      ? getRowAmounts(totalCurrentLiabilitiesRow, bsPeriods)
      : []
    const revenueMonthly = totalRevenueRow ? getRowAmounts(totalRevenueRow, isPeriods) : []
    const cashAmounts = cashRow ? getRowAmounts(cashRow, bsPeriods) : []

    /** Revenus = 12 derniers mois à chaque date de référence bilan. */
    const revenueTtmForBsPeriods = bsPeriods.map((_, bsIdx) => {
      const isIdx = alignSeriesPeriodIndex(isPeriods, bsPeriods, bsIdx)
      return seriesTrailingTwelveMonthSum(revenueMonthly, isIdx)
    })

    const isMultiPeriod = view === "12months" || view === "24months" || view === "years"

    if (isMultiPeriod) {
      let finalAssets: number[]
      let finalLiabilities: number[]
      let finalRevenue: number[]
      let finalCash: number[]

      if (view === "years") {
        finalAssets = aggregateToYears(assetsAmounts, bsPeriods).amounts
        finalLiabilities = aggregateToYears(liabilitiesAmounts, bsPeriods).amounts
        // TTM à la fin de chaque exercice (pas la somme des TTM mensuels).
        finalRevenue = aggregateToYears(revenueTtmForBsPeriods, bsPeriods, "last").amounts
        finalCash = aggregateToYears(cashAmounts, bsPeriods).amounts
      } else {
        finalAssets = assetsAmounts
        finalLiabilities = liabilitiesAmounts
        finalRevenue = revenueTtmForBsPeriods
        finalCash = cashAmounts
      }

      const len = Math.max(
        finalAssets.length,
        finalLiabilities.length,
        finalRevenue.length,
        finalCash.length,
      )
      const trendValues = Array.from({ length: len }, (_, i) => ({
        assets: finalAssets[i] || 0,
        liabilities: finalLiabilities[i] || 0,
        revenue: finalRevenue[i] || 0,
        cash: finalCash[i] || 0,
      }))

      const last = len - 1
      const prior = Math.max(0, last - 1)
      return {
        currentAssets: finalAssets[last] || 0,
        priorAssets: finalAssets[prior] || 0,
        currentLiabilities: finalLiabilities[last] || 0,
        priorLiabilities: finalLiabilities[prior] || 0,
        currentRevenue: finalRevenue[last] || 0,
        priorRevenue: finalRevenue[prior] || 0,
        currentCash: finalCash[last] || 0,
        priorCash: finalCash[prior] || 0,
        trendValues,
      }
    }

    const aLen = assetsAmounts.length
    const lLen = liabilitiesAmounts.length
    const rLen = revenueTtmForBsPeriods.length
    const cLen = cashAmounts.length
    return {
      currentAssets: aLen > 0 ? assetsAmounts[aLen - 1]! : 0,
      priorAssets: aLen > 1 ? assetsAmounts[aLen - 2]! : 0,
      currentLiabilities: lLen > 0 ? liabilitiesAmounts[lLen - 1]! : 0,
      priorLiabilities: lLen > 1 ? liabilitiesAmounts[lLen - 2]! : 0,
      currentRevenue: rLen > 0 ? revenueTtmForBsPeriods[rLen - 1]! : 0,
      priorRevenue: rLen > 1 ? revenueTtmForBsPeriods[rLen - 2]! : 0,
      currentCash: cLen > 0 ? cashAmounts[cLen - 1]! : 0,
      priorCash: cLen > 1 ? cashAmounts[cLen - 2]! : 0,
      trendValues: undefined,
    }
  }, [bsRows, isRows, bsPeriods, isPeriods, view])

  const calculateWorkingCapital = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const assets = data.trendValues[trendIndex]?.assets || 0
      const liabilities = data.trendValues[trendIndex]?.liabilities || 0
      return assets - liabilities
    }
    return (isPrior ? data.priorAssets : data.currentAssets) -
      (isPrior ? data.priorLiabilities : data.currentLiabilities)
  }

  const calculateWorkingCapitalExCash = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const t = data.trendValues[trendIndex]
      return (t?.assets || 0) - (t?.cash || 0) - (t?.liabilities || 0)
    }
    return (isPrior ? data.priorAssets : data.currentAssets) -
      (isPrior ? data.priorCash : data.currentCash) -
      (isPrior ? data.priorLiabilities : data.currentLiabilities)
  }

  const getRevenue = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.revenue || 0
    }
    return isPrior ? data.priorRevenue : data.currentRevenue
  }

  const getRevenuePercentage = (value: number, isPrior: boolean, trendIndex?: number): number => {
    const revenue = getRevenue(isPrior, trendIndex)
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

  const getCurrentAssets = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) return data.trendValues[trendIndex]?.assets || 0
    return isPrior ? data.priorAssets : data.currentAssets
  }

  const getCurrentLiabilities = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.liabilities || 0
    }
    return isPrior ? data.priorLiabilities : data.currentLiabilities
  }

  const calculateFDRRatio = (isPrior: boolean, trendIndex?: number): number => {
    const liabilities = getCurrentLiabilities(isPrior, trendIndex)
    if (liabilities === 0) return 0
    return getCurrentAssets(isPrior, trendIndex) / liabilities
  }

  const calculateFdRHCRatio = (isPrior: boolean, trendIndex?: number): number => {
    const assets = getCurrentAssets(isPrior, trendIndex)
    const cash =
      trendIndex !== undefined && data.trendValues
        ? data.trendValues[trendIndex]?.cash || 0
        : isPrior
          ? data.priorCash
          : data.currentCash
    const liabilities = getCurrentLiabilities(isPrior, trendIndex)
    if (liabilities === 0) return 0
    return (assets - cash) / liabilities
  }

  /** Index sur la série bilan (date de référence) ; le TTM Résultat s’aligne dessus. */
  const periodIndexFor = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined) {
      if (view === "years" && bsPeriods.length > 0) {
        const years = [...new Set(bsPeriods.map((p) => p.fiscalYear))].sort((a, b) => a - b)
        const fy = years[Math.max(0, Math.min(trendIndex, years.length - 1))]
        let lastIdx = 0
        for (let i = 0; i < bsPeriods.length; i++) {
          if (bsPeriods[i]!.fiscalYear === fy) lastIdx = i
        }
        return lastIdx
      }
      return Math.max(0, Math.min(trendIndex, Math.max(0, bsPeriods.length - 1)))
    }
    const len = Math.max(bsPeriods.length, 1)
    return isPrior ? Math.max(0, len - 2) : len - 1
  }

  const heuristicMetric = (label: string): Omit<DisplayMetric, "showAmounts"> | null => {
    const key = normalizeMetricLabel(label)
    if (key === "fdr") {
      return { key: "fdr", label, format: "currency", valueAt: calculateWorkingCapital }
    }
    if (key === "fdrhc") {
      return {
        key: "fdrhc",
        label,
        format: "currency",
        valueAt: calculateWorkingCapitalExCash,
      }
    }
    if (key === "fdr / revenus") {
      return {
        key: "fdr-rev",
        label,
        format: "percent",
        valueAt: (isPrior, trendIndex) =>
          getRevenuePercentage(calculateWorkingCapital(isPrior, trendIndex), isPrior, trendIndex),
      }
    }
    if (key === "fdrhc / revenus") {
      return {
        key: "fdrhc-rev",
        label,
        format: "percent",
        valueAt: (isPrior, trendIndex) =>
          getRevenuePercentage(
            calculateWorkingCapitalExCash(isPrior, trendIndex),
            isPrior,
            trendIndex,
          ),
      }
    }
    if (key === "ratio de fdr") {
      return { key: "ratio-fdr", label, format: "ratio", valueAt: calculateFDRRatio }
    }
    if (key === "ratio de fdrhc") {
      return { key: "ratio-fdrhc", label, format: "ratio", valueAt: calculateFdRHCRatio }
    }
    return null
  }

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
        isRows,
        bsPeriods,
        isPeriods,
        0,
        structure,
      )
      // Montants visibles uniquement si une liaison (code / formule) est configurée.
      if (structured !== null) {
        const displayFormat = explicitFormat ?? resolveWorkingCapitalDisplayFormat(row)
        const metricFormat = displayFormatToMetricFormat(displayFormat)
        return {
          key: `struct-${idx}`,
          label,
          isBold,
          showAmounts: true,
          format: metricFormat,
          valueAt: (isPrior: boolean, trendIndex?: number) => {
            const raw =
              resolveWorkingCapitalStructureAmount(
                row,
                bsRows,
                isRows,
                bsPeriods,
                isPeriods,
                periodIndexFor(isPrior, trendIndex),
                structure,
              ) ?? 0
            return displayFormat === "percent" ? raw * 100 : raw
          },
        }
      }
      const heuristic = heuristicMetric(label)
      return {
        key: heuristic?.key ?? `row-${idx}`,
        label,
        isBold,
        showAmounts: false,
        format: displayFormatToMetricFormat(explicitFormat ?? "currency"),
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
          operands: collectWorkingCapitalIncludedOperands(item.row),
        }
      })
    }

    const fallback = [
      { label: "FDR" },
      { label: "FdRHC" },
      { label: "FDR / Revenus" },
      { label: "FdRHC / Revenus" },
      { label: "Ratio de FDR" },
      { label: "Ratio de FdRHC" },
    ]
    return fallback.map((row, idx) => ({
      kind: "metric" as const,
      key: `fallback-${idx}`,
      metric: buildMetricFromRow(row, idx),
      structureRow: row,
      operands: collectWorkingCapitalIncludedOperands(row),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure, bsRows, isRows, bsPeriods, isPeriods, data, view])

  const toggleRow = (rowKey: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowKey)) next.delete(rowKey)
      else next.add(rowKey)
      return next
    })
  }

  const getPeriodColumnLabels = (): string[] => {
    if (bsPeriods.length > 0) {
      if (view === "current") {
        // Courant = date de référence, Passé = période précédente (libellés réels, décroissant).
        const last = bsPeriods[bsPeriods.length - 1]?.label ?? "Courant"
        const prior =
          bsPeriods.length > 1
            ? (bsPeriods[bsPeriods.length - 2]?.label ?? "Passé")
            : "Passé"
        return [last, prior]
      }
      const chronological =
        view === "years"
          ? aggregateToYears(
              bsPeriods.map(() => 0),
              bsPeriods,
            ).labels
          : bsPeriods.map((p) => p.label)
      return reverseSeriesOrderForDisplay(chronological)
    }
    if (view === "current") return ["Courant", "Passé"]
    if (view === "years") {
      const cy = new Date().getFullYear()
      return Array.from({ length: 6 }, (_, i) => `${cy - i}`)
    }
    const count = view === "24months" ? 24 : 12
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const labels: string[] = []
    const currentDate = new Date()
    for (let i = 0; i < count; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
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
    data.trendValues?.length ||
    (view === "24months" ? 24 : view === "years" ? 6 : view === "12months" ? 12 : 0)

  const tableColumnCount =
    2 + (view === "current" ? 2 : Math.max(trendCount, getPeriodColumnLabels().length, 1))

  /** Style montants : Détail CDR (slate-500) ; postes gras → libellé + montants en gras. */
  const metricColumnClass =
    "box-border w-[18rem] min-w-[18rem] max-w-[18rem] sm:w-[20rem] sm:min-w-[20rem] sm:max-w-[20rem]"
  const amountCellClass = (isBold?: boolean) =>
    cn(
      "whitespace-nowrap px-6 py-3 text-right text-sm",
      isBold ? "font-semibold font-bold text-slate-900" : "text-slate-500",
    )
  const amountTrendCellClass = (isBold?: boolean) =>
    cn(
      "min-w-[5.5rem] whitespace-nowrap px-4 py-3 text-right text-sm",
      isBold ? "font-semibold font-bold text-slate-900" : "text-slate-500",
    )
  const amountAverageCellClass = (isBold?: boolean) =>
    cn(
      "min-w-[7.5rem] whitespace-nowrap bg-gradient-to-b from-slate-50 to-slate-100/50 px-6 py-3 text-right text-sm",
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

  const renderMetricRow = (
    rowKey: string,
    metric: DisplayMetric,
    operands: WorkingCapitalIncludedOperand[],
  ) => {
    const chronologicalValues =
      view === "current"
        ? [metric.valueAt(false), metric.valueAt(true)]
        : Array.from({ length: trendCount }, (_, idx) => metric.valueAt(false, idx))
    // Multi-période : référence (plus récente) à gauche, puis décroissant.
    const values =
      view === "current"
        ? chronologicalValues
        : reverseSeriesOrderForDisplay(chronologicalValues)
    const average =
      chronologicalValues.length > 0
        ? chronologicalValues.reduce((sum, v) => sum + v, 0) / chronologicalValues.length
        : 0

    const formatCell = (value: number) =>
      metric.showAmounts ? formatMetricValue(value, metric.format) : ""

    const canExpand = operands.length > 0
    const isExpanded = expandedRows.has(rowKey)

    const operandChronologicalValues = (code: string): number[] => {
      if (view === "current") {
        return [
          resolveWorkingCapitalOperandAmount(
            code,
            bsRows,
            isRows,
            bsPeriods,
            isPeriods,
            periodIndexFor(false),
            structure,
          ),
          resolveWorkingCapitalOperandAmount(
            code,
            bsRows,
            isRows,
            bsPeriods,
            isPeriods,
            periodIndexFor(true),
            structure,
          ),
        ]
      }
      return Array.from({ length: trendCount }, (_, idx) =>
        resolveWorkingCapitalOperandAmount(
          code,
          bsRows,
          isRows,
          bsPeriods,
          isPeriods,
          periodIndexFor(false, idx),
          structure,
        ),
      )
    }

    return (
      <Fragment key={rowKey}>
        <tr
          className={cn(
            "group transition-colors hover:bg-[#E0742D]/[0.04]",
            canExpand && "cursor-pointer",
          )}
          onClick={canExpand ? () => toggleRow(rowKey) : undefined}
          data-testid={canExpand ? `wc-metric-expand-${rowKey}` : undefined}
          aria-expanded={canExpand ? isExpanded : undefined}
        >
          <td className={cn(metricLabelCellClass(metric.isBold), "group-hover:bg-[#FDF6F1]")}>
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
          <td className={cn(amountAverageCellClass(metric.isBold), "group-hover:from-[#FDF6F1] group-hover:to-[#FDF6F1]")}>
            {formatCell(average)}
          </td>
          {view === "current" ? (
            <>
              <td className={cn(amountCellClass(metric.isBold), "group-hover:bg-[#FDF6F1]")}>
                {formatCell(values[0] ?? 0)}
              </td>
              <td className={cn(amountCellClass(metric.isBold), "group-hover:bg-[#FDF6F1]")}>
                {formatCell(values[1] ?? 0)}
              </td>
            </>
          ) : (
            values.map((v, idx) => (
              <td
                key={idx}
                className={cn(amountTrendCellClass(metric.isBold), "group-hover:bg-[#FDF6F1]")}
              >
                {formatCell(v)}
              </td>
            ))
          )}
        </tr>
        {isExpanded &&
          operands.map((op) => {
            const chronological = operandChronologicalValues(op.code)
            const displayValues =
              view === "current"
                ? chronological
                : reverseSeriesOrderForDisplay(chronological)
            const opAverage =
              chronological.length > 0
                ? chronological.reduce((sum, v) => sum + v, 0) / chronological.length
                : 0
            const label = workingCapitalOperandDisplayLabel(
              op.code,
              bsRows,
              isRows,
              structure,
            )
            return (
              <tr
                key={`${rowKey}-${op.role}-${op.code}`}
                className="bg-slate-50/80"
                data-testid={`wc-operand-${op.code}`}
              >
                <td className={metricLabelCellClass(false, true)}>
                  <span className="inline-flex min-w-0 items-baseline gap-1.5">
                    {op.sign ? (
                      <span className="font-medium text-slate-400 tabular-nums">{op.sign}</span>
                    ) : null}
                    <span className="font-mono text-xs text-slate-500">{op.code}</span>
                    <span className="text-slate-400">—</span>
                    <span className="min-w-0 truncate">{label}</span>
                  </span>
                </td>
                <td className={amountAverageCellClass(false)}>
                  {formatCurrency(opAverage)}
                </td>
                {view === "current" ? (
                  <>
                    <td className={amountCellClass(false)}>
                      {formatCurrency(displayValues[0] ?? 0)}
                    </td>
                    <td className={amountCellClass(false)}>
                      {formatCurrency(displayValues[1] ?? 0)}
                    </td>
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
          })}
      </Fragment>
    )
  }

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
                  Analyse du fonds de roulement
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
                  Nombre, % ou Jours pour l’affichage hors Paramètres. Enregistrez pour appliquer.
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

      {isStructureStudio ? (
        <StatementStructureStudio
          embedded
          companyId={companyId!}
          statementType="working-capital"
          hideAnnexColumns
          onSaved={() => {
            onStructureSaved?.()
            setStructureEditMode(false)
          }}
          onClose={() => setStructureEditMode(false)}
        />
      ) : (
        <>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
            </div>
          )}

          {!companyId && !loading && (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              Sélectionnez une société
            </div>
          )}

          {!loading && companyId && (
              <div
                className="min-w-0 max-h-[min(72vh,56rem)] overflow-auto overscroll-contain bg-white"
                data-testid="wc-summary-table-scroll"
              >
                <table className="w-full min-w-max border-separate border-spacing-0">
                  <thead
                    className={cn(
                      "[&_th]:sticky [&_th]:top-0 [&_th]:z-20",
                      "[&_th]:border-b-2 [&_th]:border-slate-200",
                      "[&_th]:bg-gradient-to-b [&_th]:from-slate-50 [&_th]:to-slate-100/80",
                      "[&_th:first-child]:left-0 [&_th:first-child]:z-30",
                    )}
                  >
                    <tr>
                      <th
                        className={cn(
                          metricColumnClass,
                          "px-6 py-4 text-left text-sm font-semibold text-[#2A2F3A]",
                        )}
                      >
                        Métrique
                      </th>
                      <th
                        className={cn(
                          "min-w-[7.5rem] whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-[#2A2F3A]",
                          "bg-gradient-to-b from-slate-50 to-slate-100/50",
                        )}
                      >
                        Moyenne
                      </th>
                      {getPeriodColumnLabels().map((label, idx) => (
                        <th
                          key={idx}
                          className={cn(
                            "whitespace-nowrap text-right text-sm font-semibold text-[#2A2F3A]",
                            view === "current"
                              ? "min-w-[7.5rem] px-6 py-4"
                              : "min-w-[5.5rem] px-4 py-4",
                          )}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody
                    className={cn(
                      // Même motif que CDR / Bilan : bordures sur les td (border-separate).
                      "[&_td]:border-b [&_td]:border-slate-200",
                      "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10",
                    )}
                  >
                    {tableRows.map((item) => {
                      if (item.kind === "separator") {
                        return (
                          <tr key={item.key} aria-hidden data-testid="wc-structure-separator">
                            <td colSpan={tableColumnCount} className="border-0 p-0">
                              <div className="my-1 border-t-2 border-slate-700" />
                            </td>
                          </tr>
                        )
                      }
                      if (item.kind === "spacer") {
                        const periodColCount =
                          view === "current"
                            ? 2
                            : Math.max(trendCount, getPeriodColumnLabels().length, 1)
                        return (
                          <tr key={item.key} data-testid="wc-structure-spacer" className="h-2">
                            <td
                              className={cn(
                                metricColumnClass,
                                "sticky left-0 z-10 bg-white px-6 py-4 text-transparent select-none",
                              )}
                            >
                              {"\u00a0"}
                            </td>
                            <td
                              className={cn(
                                amountAverageCellClass(false),
                                "py-4 text-transparent select-none",
                              )}
                              data-testid="wc-spacer-average-cell"
                            >
                              {"\u00a0"}
                            </td>
                            {Array.from({ length: periodColCount }, (_, idx) => (
                              <td
                                key={idx}
                                className={cn(
                                  view === "current"
                                    ? amountCellClass(false)
                                    : amountTrendCellClass(false),
                                  "py-4 text-transparent select-none",
                                )}
                              >
                                {"\u00a0"}
                              </td>
                            ))}
                          </tr>
                        )
                      }
                      return renderMetricRow(item.key, item.metric, item.operands)
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}
    </div>
  )
}
