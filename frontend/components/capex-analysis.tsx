"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { StatementStructureStudio } from "@/components/statement-structure-studio"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, findRow, reverseSeriesOrderForDisplay } from "@/lib/series-utils"
import {
  findPeriodIndexForCalendarMonth,
  sliceAmountsAtReferenceMonthYears,
  yearLabelsFromReference,
  calendarYearSequenceFromReference,
} from "@/lib/series-reference-columns"
import { getStatementStructure } from "@/lib/api"
import {
  resolveWorkingCapitalStructureAmount,
  resolveWorkingCapitalOperandAmount,
  collectWorkingCapitalIncludedOperandsForDisplay,
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
import { CONTRIBUTIVE_MARGIN_AMOUNT_EPSILON } from "@/lib/revenue-contributive-margin-evolution"
import {
  buildCapexOperandDisplayValues,
  buildCapexRowDisplayValues,
  readRowCapexCostDisplayMode,
  resolveCapexStructureAmountAtPeriod,
  structureRowConfigUsesCapexCostCodes,
  structureRowUsesCapexCostCodes,
  operandUsesCapexCostDisplay,
  type CapexCostDisplayMode,
} from "@/lib/capex-analysis-settings"
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

interface CapexAnalysisProps {
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
  currentFixedAssets: number
  priorFixedAssets: number
  currentDepreciation: number
  priorDepreciation: number
  currentRevenue: number
  priorRevenue: number
  currentEbitda: number
  priorEbitda: number
  trendValues?: Array<{
    fixedAssets: number
    depreciation: number
    revenue: number
    ebitda: number
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

export function CapexAnalysis({
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
}: CapexAnalysisProps) {
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
    altAssetCostOnly: true,
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
    getStatementStructure(companyId, "capex")
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
      currentFixedAssets: 0,
      priorFixedAssets: 0,
      currentDepreciation: 0,
      priorDepreciation: 0,
      currentRevenue: 0,
      priorRevenue: 0,
      currentEbitda: 0,
      priorEbitda: 0,
      trendValues: undefined,
    }

    if (bsRows.length === 0 && isRows.length === 0) return empty

    const fixedAssetsRow =
      findRow(bsRows, "immobilisations corporelles") ||
      findRow(bsRows, "actifs corporels") ||
      findRow(bsRows, "fixed assets")
    const intangibleAssetsRow =
      findRow(bsRows, "immobilisations incorporelles") ||
      findRow(bsRows, "actifs incorporels") ||
      findRow(bsRows, "intangible assets")
    const totalRevenueRow = findRow(isRows, "total revenus") || findRow(isRows, "revenus")
    const ebitdaRow = findRow(isRows, "baiia") || findRow(isRows, "ebitda")
    const depreciationRow =
      findRow(isRows, "amortissement") ||
      findRow(isRows, "depreciation") ||
      findRow(isRows, "dotation aux amortissements")

    const fixedAmounts = fixedAssetsRow ? getRowAmounts(fixedAssetsRow, bsPeriods) : []
    const intangibleAmounts = intangibleAssetsRow ? getRowAmounts(intangibleAssetsRow, bsPeriods) : []
    const totalFixedAmounts = bsPeriods.map(
      (_, idx) => Math.abs(fixedAmounts[idx] || 0) + Math.abs(intangibleAmounts[idx] || 0),
    )
    const depreciationMonthly = depreciationRow ? getRowAmounts(depreciationRow, isPeriods) : []
    const revenueMonthly = totalRevenueRow ? getRowAmounts(totalRevenueRow, isPeriods) : []
    const ebitdaMonthly = ebitdaRow ? getRowAmounts(ebitdaRow, isPeriods) : []

    const depreciationForBsPeriods = bsPeriods.map((_, bsIdx) => {
      const isIdx = alignSeriesPeriodIndex(isPeriods, bsPeriods, bsIdx)
      return Math.abs(depreciationMonthly[isIdx] || 0)
    })
    const revenueTtmForBsPeriods = bsPeriods.map((_, bsIdx) => {
      const isIdx = alignSeriesPeriodIndex(isPeriods, bsPeriods, bsIdx)
      return seriesTrailingTwelveMonthSum(revenueMonthly, isIdx)
    })
    const ebitdaForBsPeriods = bsPeriods.map((_, bsIdx) => {
      const isIdx = alignSeriesPeriodIndex(isPeriods, bsPeriods, bsIdx)
      return Math.abs(ebitdaMonthly[isIdx] || 0)
    })

    const isMultiPeriod = view === "12months" || view === "24months" || view === "years"

    if (isMultiPeriod) {
      let finalFixed: number[]
      let finalDepreciation: number[]
      let finalRevenue: number[]
      let finalEbitda: number[]

      if (view === "years") {
        finalFixed = sliceAmountsAtReferenceMonthYears(
          totalFixedAmounts,
          bsPeriods,
          resolvedMonth,
          resolvedYear,
          6,
        )
        finalDepreciation = sliceAmountsAtReferenceMonthYears(
          depreciationForBsPeriods,
          bsPeriods,
          resolvedMonth,
          resolvedYear,
          6,
        )
        finalRevenue = sliceAmountsAtReferenceMonthYears(
          revenueTtmForBsPeriods,
          bsPeriods,
          resolvedMonth,
          resolvedYear,
          6,
        )
        finalEbitda = sliceAmountsAtReferenceMonthYears(
          ebitdaForBsPeriods,
          bsPeriods,
          resolvedMonth,
          resolvedYear,
          6,
        )
      } else {
        finalFixed = totalFixedAmounts
        finalDepreciation = depreciationForBsPeriods
        finalRevenue = revenueTtmForBsPeriods
        finalEbitda = ebitdaForBsPeriods
      }

      const len = Math.max(
        finalFixed.length,
        finalDepreciation.length,
        finalRevenue.length,
        finalEbitda.length,
      )
      const trendValues = Array.from({ length: len }, (_, i) => ({
        fixedAssets: finalFixed[i] || 0,
        depreciation: finalDepreciation[i] || 0,
        revenue: finalRevenue[i] || 0,
        ebitda: finalEbitda[i] || 0,
      }))

      const last = len - 1
      const prior = Math.max(0, last - 1)
      return {
        currentFixedAssets: finalFixed[last] || 0,
        priorFixedAssets: finalFixed[prior] || 0,
        currentDepreciation: finalDepreciation[last] || 0,
        priorDepreciation: finalDepreciation[prior] || 0,
        currentRevenue: finalRevenue[last] || 0,
        priorRevenue: finalRevenue[prior] || 0,
        currentEbitda: finalEbitda[last] || 0,
        priorEbitda: finalEbitda[prior] || 0,
        trendValues,
      }
    }

    const fLen = totalFixedAmounts.length
    const dLen = depreciationForBsPeriods.length
    const rLen = revenueTtmForBsPeriods.length
    const eLen = ebitdaForBsPeriods.length
    return {
      currentFixedAssets: fLen > 0 ? totalFixedAmounts[fLen - 1]! : 0,
      priorFixedAssets: fLen > 1 ? totalFixedAmounts[fLen - 2]! : 0,
      currentDepreciation: dLen > 0 ? depreciationForBsPeriods[dLen - 1]! : 0,
      priorDepreciation: dLen > 1 ? depreciationForBsPeriods[dLen - 2]! : 0,
      currentRevenue: rLen > 0 ? revenueTtmForBsPeriods[rLen - 1]! : 0,
      priorRevenue: rLen > 1 ? revenueTtmForBsPeriods[rLen - 2]! : 0,
      currentEbitda: eLen > 0 ? ebitdaForBsPeriods[eLen - 1]! : 0,
      priorEbitda: eLen > 1 ? ebitdaForBsPeriods[eLen - 2]! : 0,
      trendValues: undefined,
    }
  }, [bsRows, isRows, bsPeriods, isPeriods, view, resolvedMonth, resolvedYear])

  const calculateCapexHeuristic = (isPrior: boolean, trendIndex?: number): number => {
    const idx = periodIndexFor(isPrior, trendIndex)
    const current = getFixedAssetsAtPeriodIndex(idx)
    const prior = idx > 0 ? getFixedAssetsAtPeriodIndex(idx - 1) : 0
    return current - prior
  }

  const getFixedAssetsAtPeriodIndex = (idx: number): number => {
    if (data.trendValues && idx >= 0 && idx < data.trendValues.length) {
      return data.trendValues[idx]?.fixedAssets || 0
    }
    const fixedAssetsRow =
      findRow(bsRows, "immobilisations corporelles") ||
      findRow(bsRows, "actifs corporels") ||
      findRow(bsRows, "fixed assets")
    const intangibleAssetsRow =
      findRow(bsRows, "immobilisations incorporelles") ||
      findRow(bsRows, "actifs incorporels") ||
      findRow(bsRows, "intangible assets")
    const fixedAmounts = fixedAssetsRow ? getRowAmounts(fixedAssetsRow, bsPeriods) : []
    const intangibleAmounts = intangibleAssetsRow ? getRowAmounts(intangibleAssetsRow, bsPeriods) : []
    const fa = Math.abs(fixedAmounts[idx] || 0)
    const ia = Math.abs(intangibleAmounts[idx] || 0)
    return fa + ia
  }

  const getDepreciation = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.depreciation || 0
    }
    return isPrior ? data.priorDepreciation : data.currentDepreciation
  }

  const getRevenue = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.revenue || 0
    }
    return isPrior ? data.priorRevenue : data.currentRevenue
  }

  const getEbitda = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.ebitda || 0
    }
    return isPrior ? data.priorEbitda : data.currentEbitda
  }

  const getRevenuePercentage = (value: number, isPrior: boolean, trendIndex?: number): number => {
    const revenue = getRevenue(isPrior, trendIndex)
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

  const calculateOperatingCashFlow = (isPrior: boolean, trendIndex?: number): number => {
    return getEbitda(isPrior, trendIndex) - getDepreciation(isPrior, trendIndex)
  }

  /** Index sur la série bilan (date de référence) ; le TTM Résultat s’aligne dessus. */
  const periodIndexFor = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined) {
      if (view === "years" && bsPeriods.length > 0) {
        const yearsChronological = [...calendarYearSequenceFromReference(resolvedYear, 6)].reverse()
        const year = yearsChronological[Math.max(0, Math.min(trendIndex, yearsChronological.length - 1))]!
        const idx = findPeriodIndexForCalendarMonth(bsPeriods, resolvedMonth, year)
        return idx >= 0 ? idx : 0
      }
      return Math.max(0, Math.min(trendIndex, Math.max(0, bsPeriods.length - 1)))
    }
    const len = Math.max(bsPeriods.length, 1)
    return isPrior ? Math.max(0, len - 2) : len - 1
  }

  const trendCount =
    data.trendValues?.length ||
    (view === "24months" ? 24 : view === "years" ? 6 : view === "12months" ? 12 : 0)

  const operandDisplayContext = useMemo(
    () => ({ bsRows, isRows }),
    [bsRows, isRows],
  )

  const resolveStructureAmountAtPeriod = useCallback(
    (row: Record<string, unknown>, periodIndex: number): number => {
      const raw =
        resolveWorkingCapitalStructureAmount(
          row,
          bsRows,
          isRows,
          bsPeriods,
          isPeriods,
          periodIndex,
          structure,
        ) ?? 0
      const explicitFormat = normalizeWorkingCapitalDisplayFormat(row.displayFormat)
      const displayFormat = explicitFormat ?? resolveWorkingCapitalDisplayFormat(row)
      return displayFormat === "percent" ? raw * 100 : raw
    },
    [bsRows, isRows, bsPeriods, isPeriods, structure],
  )

  const applyRowDisplayFormat = useCallback(
    (row: Record<string, unknown>, raw: number): number => {
      const explicitFormat = normalizeWorkingCapitalDisplayFormat(row.displayFormat)
      const displayFormat = explicitFormat ?? resolveWorkingCapitalDisplayFormat(row)
      return displayFormat === "percent" ? raw * 100 : raw
    },
    [],
  )

  const resolveOperandAmountAtPeriod = useCallback(
    (code: string, periodIndex: number): number =>
      resolveWorkingCapitalOperandAmount(
        code,
        bsRows,
        isRows,
        bsPeriods,
        isPeriods,
        periodIndex,
        structure,
      ),
    [bsRows, isRows, bsPeriods, isPeriods, structure],
  )

  const resolveCapexStructureAmountForDisplay = useCallback(
    (
      row: Record<string, unknown>,
      periodIndex: number,
      priorPeriodIndex?: number,
    ): number => {
      if (!structureRowConfigUsesCapexCostCodes(row)) {
        return resolveStructureAmountAtPeriod(row, periodIndex)
      }
      const rowMode = readRowCapexCostDisplayMode(row, structure)
      const raw =
        resolveCapexStructureAmountAtPeriod(
          row,
          periodIndex,
          rowMode,
          resolveOperandAmountAtPeriod,
          priorPeriodIndex,
        ) ?? 0
      return applyRowDisplayFormat(row, raw)
    },
    [
      applyRowDisplayFormat,
      resolveOperandAmountAtPeriod,
      resolveStructureAmountAtPeriod,
      structure,
    ],
  )

  const buildRowDisplaySeries = useCallback(
    (row: Record<string, unknown>, mode: CapexCostDisplayMode): number[] =>
      buildCapexRowDisplayValues(
        row,
        mode,
        view,
        trendCount,
        bsPeriods.length,
        resolveOperandAmountAtPeriod,
        resolveCapexStructureAmountForDisplay,
        bsPeriods,
        resolvedMonth,
        resolvedYear,
      ),
    [
      bsPeriods,
      resolvedMonth,
      resolvedYear,
      resolveCapexStructureAmountForDisplay,
      resolveOperandAmountAtPeriod,
      trendCount,
      view,
    ],
  )

  const buildOperandDisplaySeries = useCallback(
    (code: string, mode: CapexCostDisplayMode): number[] =>
      buildCapexOperandDisplayValues(
        code,
        mode,
        view,
        trendCount,
        bsPeriods.length,
        resolveOperandAmountAtPeriod,
        bsPeriods,
        resolvedMonth,
        resolvedYear,
      ),
    [
      bsPeriods,
      resolvedMonth,
      resolvedYear,
      resolveOperandAmountAtPeriod,
      trendCount,
      view,
    ],
  )

  const heuristicMetric = (label: string): Omit<DisplayMetric, "showAmounts"> | null => {
    const key = normalizeMetricLabel(label)
    if (key === "capex") {
      return { key: "capex", label, format: "currency", valueAt: calculateCapexHeuristic }
    }
    if (key === "amortissement") {
      return { key: "depreciation", label, format: "currency", valueAt: getDepreciation }
    }
    if (key === "capex / revenus") {
      return {
        key: "capex-rev",
        label,
        format: "percent",
        valueAt: (isPrior, trendIndex) =>
          getRevenuePercentage(calculateCapexHeuristic(isPrior, trendIndex), isPrior, trendIndex),
      }
    }
    if (key === "capex / baiia") {
      return {
        key: "capex-ebitda",
        label,
        format: "percent",
        valueAt: (isPrior, trendIndex) => {
          const capex = calculateCapexHeuristic(isPrior, trendIndex)
          const ebitda = getEbitda(isPrior, trendIndex)
          return ebitda !== 0 ? (capex / ebitda) * 100 : 0
        },
      }
    }
    if (
      key === "capex / flux de tresorerie lies aux operations" ||
      key.includes("flux de tresorerie")
    ) {
      return {
        key: "capex-ocf",
        label,
        format: "percent",
        valueAt: (isPrior, trendIndex) => {
          const capex = calculateCapexHeuristic(isPrior, trendIndex)
          const ocf = calculateOperatingCashFlow(isPrior, trendIndex)
          return ocf !== 0 ? (capex / ocf) * 100 : 0
        },
      }
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
        const usesCapexCostMode = structureRowUsesCapexCostCodes(row, operandDisplayContext)
        const rowCostMode = readRowCapexCostDisplayMode(row, structure)
        return {
          key: `struct-${idx}`,
          label,
          isBold,
          showAmounts: true,
          format: metricFormat,
          valueAt: (isPrior: boolean, trendIndex?: number) => {
            if (usesCapexCostMode) {
              const series = buildRowDisplaySeries(row, rowCostMode)
              if (view === "current") {
                return isPrior ? (series[1] ?? 0) : (series[0] ?? 0)
              }
              return series[trendIndex ?? 0] ?? 0
            }
            const raw = resolveStructureAmountAtPeriod(
              row,
              periodIndexFor(isPrior, trendIndex),
            )
            return raw
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
          operands: collectWorkingCapitalIncludedOperandsForDisplay(
            item.row,
            operandDisplayContext,
          ),
        }
      })
    }

    const fallback = [
      { label: "Capex" },
      { label: "Amortissement" },
      { label: "Capex / Revenus" },
      { label: "Capex / BAIIA" },
      { label: "Capex / Flux de trésorerie liés aux opérations" },
    ]
    return fallback.map((row, idx) => ({
      kind: "metric" as const,
      key: `fallback-${idx}`,
      metric: buildMetricFromRow(row, idx),
      structureRow: row,
      operands: collectWorkingCapitalIncludedOperandsForDisplay(row, operandDisplayContext),
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    structure,
    bsRows,
    isRows,
    bsPeriods,
    isPeriods,
    data,
    view,
    operandDisplayContext,
    buildRowDisplaySeries,
    resolveStructureAmountAtPeriod,
  ])

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
          ? yearLabelsFromReference(resolvedYear, 6).reverse()
          : bsPeriods.map((p) => p.label)
      return reverseSeriesOrderForDisplay(chronological)
    }
    if (view === "current") return ["Courant", "Passé"]
    if (view === "years") {
      return yearLabelsFromReference(resolvedYear, 6)
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
    structureRow: Record<string, unknown>,
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

    const rowCostMode = readRowCapexCostDisplayMode(structureRow, structure)

    const operandHasReelBalance = (code: string): boolean =>
      bsPeriods.some(
        (_, periodIndex) =>
          Math.abs(resolveOperandAmountAtPeriod(code, periodIndex)) >
          CONTRIBUTIVE_MARGIN_AMOUNT_EPSILON,
      )

    const operandChronologicalValues = (op: WorkingCapitalIncludedOperand): number[] => {
      const mode = operandUsesCapexCostDisplay(op) ? rowCostMode : "actual"
      return buildOperandDisplaySeries(op.code, mode)
    }

    const visibleOperands = operands.filter((op) => operandHasReelBalance(op.code))

    const canExpand = visibleOperands.length > 0
    const isExpanded = expandedRows.has(rowKey)

    return (
      <Fragment key={rowKey}>
        <tr
          className={cn(
            "group transition-colors hover:bg-[#E0742D]/[0.04]",
            canExpand && "cursor-pointer",
          )}
          onClick={canExpand ? () => toggleRow(rowKey) : undefined}
          data-testid={canExpand ? `capex-metric-expand-${rowKey}` : undefined}
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
          visibleOperands.map((op) => {
            const chronological = operandChronologicalValues(op)
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
                data-testid={`capex-operand-${op.code}`}
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
                  Analyse des Capex
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
          statementType="capex"
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
                data-testid="capex-summary-table-scroll"
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
                          <tr key={item.key} aria-hidden data-testid="capex-structure-separator">
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
                          <tr key={item.key} data-testid="capex-structure-spacer" className="h-2">
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
                              data-testid="capex-spacer-average-cell"
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
                      return renderMetricRow(item.key, item.metric, item.operands, item.structureRow)
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
