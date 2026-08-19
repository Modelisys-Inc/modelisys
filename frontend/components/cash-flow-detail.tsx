"use client"

import { useState, useEffect, useMemo, Fragment } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import type { FinancialStatementDetailRow, FinancialStatementRow, SeriesDetailRow, SeriesRow } from "@/lib/api"
import { getFinancialStatementSeries, getStatementStructure, type FinancialStatementSeriesParams } from "@/lib/api"
import { useFinancialStatement } from "@/hooks/use-financial-statement"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import {
  aggregateToYears,
  getPeriodLabels,
  getRowAmounts,
  reverseSeriesOrderForDisplay,
  slicePeriodsForMonthlyDisplay,
} from "@/lib/series-utils"
import { buildAmountsByCalendarMonth } from "@/lib/series-reference-columns"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import {
  forecastActualColumnCount,
  forecastActualSnapshotDates,
  forecastCashFlowYearTrend,
  forecastDisplayYearCount,
  forecastTrendFromActualPrefix,
  forecastYearLabelsForLayout,
  resolveForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import {
  cashFlowQuarterSnapshotTrendForBasis,
  cashFlowYearSnapshotTrendForBasis,
  statementQuarterLabelsForBasis,
  statementYearLabelsForBasis,
  STATEMENT_QUARTER_COUNT,
  type StatementPeriodBasis,
} from "@/lib/income-statement-period-basis"
import { PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"
import {
  applyCashFlowCalcToPoint,
  applyCashFlowCalcToTrend,
  applyCashFlowActualYearTTMToRow,
  buildCashFlowCalcModeByCode,
  buildCashFlowTinDisplayModeByCode,
  detailRowToOperandSnapshot,
  isCashFlowFormulaAggregationRow,
  mapMonthlyTrendRowsToComparisonAmounts,
  mapMonthlyTrendRowsToPastMonthComparisonAmounts,
  findTrendIndexForCalendarMonth,
  readRowCashFlowCalcMode,
  readRowCashFlowTinDisplayMode,
  reconcileCashFlowSectionTotalsFromStructure,
  reconcileDetailRowTotalsFromGlAccounts,
  resolveCashFlowFormulaPointAmountFromProcessed,
  resolveCashFlowFormulaTrendValuesFromProcessed,
  shouldReconcileCashFlowDetailRowFromGlAccounts,
  structureUsesCashFlowTinCostMode,
  type CashFlowCalcMode,
  type CashFlowCalcTrendContext,
  type CashFlowDetailTrendView,
  type CashFlowOperandSnapshot,
  type CashFlowTinDisplayMode,
} from "@/lib/cash-flow-detail-settings"
import {
  applyCashFlowFixedTreasuryRows,
  buildBeginningCashTrendForView,
  buildEndingBookTrendForView,
  buildNetCashByPeriodKey,
  cashFlowTreasuryValidationEcart,
  cashFlowTreasuryValidationTrendEcarts,
  comparisonAnchorMonth,
  isCashFlowEndingCashStructureRow,
  isCashFlowFixedTreasuryStructureRow,
  isCashFlowTreasuryBalanced,
  netCashFromBalanceSheetPointRows,
  priorCalendarMonth,
  structureHasFixedTreasuryRows,
  type CashFlowTreasuryContext,
} from "@/lib/cash-flow-treasury-rows"
import { filterCashFlowDetailRowsWithStructureForHorizon } from "@/lib/cash-flow-horizon-filter"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"
import {
  calendarQuarterFromMonth,
  formatCalendarMonthYear,
  formatPriorCalendarMonth,
  formatQuarterShortLabel,
  formatSameMonthPriorYear,
  priorCalendarQuarter,
} from "@/lib/financial-period-labels"
import type { IncomeStatementHorizonView } from "@/lib/income-statement-horizon-visibility"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight, ListTree, Settings, Sparkles, AlertTriangle } from "lucide-react"
import { StatementStructureStudio } from "@/components/statement-structure-studio"
import { CashFlowSummaryStructureStudio } from "@/components/cash-flow-summary-structure-studio"
import {
  detailLineLabelForDisplay,
  findStatementApiRowForStructureRow,
  findStructureRowForStatementLine,
  indentForSummaryRow,
  isCashFlowSummaryOnlySpacer,
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isTruthySeparatorAbove,
  listStructureRowsForCashFlowSummaryPresentation,
  listStructureRowsForPresentationDisplay,
  normalizeLiaisonMode,
  resolveCashFlowSummaryRowPresentation,
} from "@/lib/income-statement-structure-utils"
import { structureRowHasFormulaLiaison } from "@/lib/balance-sheet-summary-expand"
import {
  dashboardCardBodyMutedClass,
  dashboardCardAccentClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardStructureSettingsButtonClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface CashFlowDetailProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  columnMode?: "variations" | "comparison"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  title?: string
  /** detail = rapport complet ; summary = uniquement les lignes Annexe du Détail. */
  variant?: "detail" | "summary"
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
  fiscalYear?: number
  rows?: FinancialStatementRow[]
  loading?: boolean
  showCashFlowStructureSettings?: boolean
  structureVersion?: number
  onCashFlowStructureSaved?: () => void
  refMonth?: number
  refYear?: number
  showDetailStructureSettings?: boolean
  detailStructureVersion?: number
  onDetailStructureSaved?: () => void
  /** Bouton Paramètres sur le variant Sommaire (présentation seule). */
  showSummaryStructureSettings?: boolean
  onSummaryStructureSaved?: () => void
  projectionYears?: 3 | 4 | 5
  forecastBaseYear?: number
  forecastUseSeriesActuals?: boolean
  forecastActualLayout?: ForecastActualLayout
  /** Annuel / trimestriel : Courant (TTM / T3M) ou Exercice (YTD / QTD). */
  periodBasis?: StatementPeriodBasis
}

interface GlAccount {
  accountNumber: string
  accountName: string
  amount: number
  priorAmount?: number
  trendValues?: number[]
  amountByCalendarMonth?: Map<string, number>
}

interface DetailRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  separatorAbove?: boolean
  annexLetter?: string
  rowId?: string
  hasLiaisonCode?: boolean
  // For trend views (12months, quarters, years)
  trendValues?: number[]
  /** Comptes GL sous-jacents — visibles uniquement à l'expansion. */
  balanceAccounts?: GlAccount[]
}

type CashFlowCalcContext = CashFlowCalcTrendContext

function snapshotFromApiRow(
  row: FinancialStatementRow | undefined,
  trendValues?: number[],
  amountByCalendarMonth?: Map<string, number>,
): CashFlowOperandSnapshot {
  return {
    current: row?.current ?? (trendValues ? trendValues[0] || 0 : 0),
    prior: row?.prior ?? (trendValues && trendValues.length >= 2 ? trendValues[1] || 0 : 0),
    trendValues,
    amountByCalendarMonth,
  }
}

function applyCashFlowCalcModeToDetailRow(
  row: DetailRow,
  mode: CashFlowCalcMode,
  calcContext?: CashFlowCalcContext,
  amountByCalendarMonth?: Map<string, number>,
): DetailRow {
  if (!row.hasLiaisonCode || row.isSection) return row

  // Réel : TTM (annuel) / somme du trimestre (trimestriel) ; autres horizons = montants série inchangés.
  if (mode === "actual") {
    if (calcContext) {
      return applyCashFlowActualYearTTMToRow(row, calcContext, amountByCalendarMonth)
    }
    return row
  }

  const balanceAccounts = row.balanceAccounts?.map((account) => {
    const accountPoint = applyCashFlowCalcToPoint(account.amount, account.priorAmount ?? 0, mode)
    const accountTrend =
      account.trendValues && calcContext
        ? applyCashFlowCalcToTrend(
            account.trendValues,
            calcContext.trendLabels,
            mode,
            account.amountByCalendarMonth,
            calcContext.trendView,
            calcContext.comparisonAnchor,
            calcContext.fiscalYearEndMonth,
            calcContext.periodBasis,
            calcContext.forecastRefMonth,
          )
        : account.trendValues
    return {
      ...account,
      amount: accountPoint.current,
      priorAmount: accountPoint.prior,
      trendValues: accountTrend,
    }
  })

  if (balanceAccounts?.length && shouldReconcileCashFlowDetailRowFromGlAccounts(mode)) {
    return reconcileDetailRowTotalsFromGlAccounts({
      ...row,
      balanceAccounts,
    })
  }

  const point = applyCashFlowCalcToPoint(row.current, row.prior, mode)
  const trendValues =
    row.trendValues && calcContext
      ? applyCashFlowCalcToTrend(
          row.trendValues,
          calcContext.trendLabels,
          mode,
          amountByCalendarMonth,
          calcContext.trendView,
          calcContext.comparisonAnchor,
          calcContext.fiscalYearEndMonth,
          calcContext.periodBasis,
          calcContext.forecastRefMonth,
        )
      : row.trendValues

  return {
    ...row,
    current: point.current,
    prior: point.prior,
    trendValues,
  }
}

export function CashFlowDetail({
  period,
  view,
  columnMode = "variations",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  title = "Détail",
  variant = "detail",
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
  refMonth,
  refYear,
  fiscalYear,
  rows: backendRows = [],
  loading = false,
  showCashFlowStructureSettings = false,
  structureVersion = 0,
  onCashFlowStructureSaved,
  showDetailStructureSettings,
  detailStructureVersion = 0,
  onDetailStructureSaved,
  showSummaryStructureSettings = false,
  onSummaryStructureSaved,
  projectionYears = 5,
  forecastBaseYear,
  forecastUseSeriesActuals = false,
  forecastActualLayout = "single-prior-year",
  periodBasis = "current",
}: CashFlowDetailProps) {
  const isForecastSection = title?.endsWith("pro forma") ?? false
  const effectiveRefMonth = refMonth ?? new Date().getMonth() + 1
  const effectiveRefYear = refYear ?? fiscalYear ?? new Date().getFullYear()
  const fiscalYearEndMonth = parseFiscalYearEndMonth(
    companies.find((c) => c.id === companyId)?.fiscalYearEnd ?? "12-31",
  )
  const forecastActualLayoutEffective = resolveForecastActualLayout(
    forecastActualLayout,
    effectiveRefMonth,
    fiscalYearEndMonth,
  )
  const forecastActualCols = forecastActualColumnCount(forecastActualLayoutEffective)
  const forecastYearColumnCount = forecastDisplayYearCount(
    projectionYears,
    forecastActualLayoutEffective,
  )
  const isForecastHistoricalColumn = (idx: number) => isForecastSection && idx < forecastActualCols

  const effectiveShowStructureSettings = showDetailStructureSettings ?? showCashFlowStructureSettings
  const effectiveStructureVersion = detailStructureVersion || structureVersion
  const handleStructureSaved = onDetailStructureSaved ?? onCashFlowStructureSaved
  const handleSummaryStructureSaved = onSummaryStructureSaved ?? handleStructureSaved
  const [statementStructure, setStatementStructure] = useState<Record<string, unknown>[] | null>(null)
  const [structureLoading, setStructureLoading] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const presentationStructureRows = useMemo(
    () => (statementStructure?.length ? listStructureRowsForPresentationDisplay(statementStructure) : []),
    [statementStructure],
  )
  const summaryPresentationStructureRows = useMemo(
    () =>
      statementStructure?.length
        ? listStructureRowsForCashFlowSummaryPresentation(statementStructure)
        : [],
    [statementStructure],
  )
  const isSummaryVariant = variant === "summary"

  const toggleRow = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  useEffect(() => {
    if (!companyId) {
      setStatementStructure(null)
      setStructureLoading(false)
      return
    }
    let cancelled = false
    setStructureLoading(true)
    getStatementStructure(companyId, "cash-flow-detail")
      .then((data) => {
        if (!cancelled) setStatementStructure(data.structure as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setStatementStructure(null)
      })
      .finally(() => {
        if (!cancelled) setStructureLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, effectiveStructureVersion])

  // Point-in-time amounts from cash-flow-detail (same liaison rules as summary)
  const apiPeriod = view === "ytd" ? "ytd" : view === "ddm" ? "annual" : period
  const detailFetchParams = useMemo(
    () => ({
      fiscal_year: fiscalYear || effectiveRefYear,
      month: effectiveRefMonth,
      period: apiPeriod,
      comparison_type: comparisonType,
      budget_id: comparisonType === "budget" && selectedBudgetId ? selectedBudgetId : undefined,
      division_id: divisionId || undefined,
      sub_division_id: subDivisionId || undefined,
      structure_rev: effectiveStructureVersion,
    }),
    [
      fiscalYear,
      effectiveRefYear,
      effectiveRefMonth,
      apiPeriod,
      comparisonType,
      selectedBudgetId,
      divisionId,
      subDivisionId,
      effectiveStructureVersion,
    ]
  )
  const detailCostFetchParams = useMemo(
    () => ({
      ...detailFetchParams,
      alt_asset_cost_only: true as const,
    }),
    [detailFetchParams],
  )
  const needsTinCostData = useMemo(
    () => (statementStructure ? structureUsesCashFlowTinCostMode(statementStructure) : false),
    [statementStructure],
  )
  const hasFixedTreasuryRows = useMemo(
    () => (statementStructure ? structureHasFixedTreasuryRows(statementStructure) : false),
    [statementStructure],
  )
  const treasuryBeginningRef = useMemo(
    () => priorCalendarMonth(effectiveRefYear, effectiveRefMonth),
    [effectiveRefYear, effectiveRefMonth],
  )
  const treasuryBeginningPriorRef = useMemo(() => {
    const anchor = comparisonAnchorMonth(effectiveRefYear, effectiveRefMonth, comparisonType)
    return priorCalendarMonth(anchor.year, anchor.month)
  }, [effectiveRefYear, effectiveRefMonth, comparisonType])
  const treasuryEndingBookPriorRef = useMemo(
    () => comparisonAnchorMonth(effectiveRefYear, effectiveRefMonth, comparisonType),
    [effectiveRefYear, effectiveRefMonth, comparisonType],
  )
  const bsTreasuryFetchParams = useMemo(
    () => ({
      period: "monthly" as const,
      comparison_type: comparisonType,
      budget_id: comparisonType === "budget" && selectedBudgetId ? selectedBudgetId : undefined,
      division_id: divisionId || undefined,
      sub_division_id: subDivisionId || undefined,
      structure_rev: effectiveStructureVersion,
    }),
    [
      comparisonType,
      selectedBudgetId,
      divisionId,
      subDivisionId,
      effectiveStructureVersion,
    ],
  )
  const { rows: detailComputedRows, loading: detailComputedLoading } = useFinancialStatement(
    companyId || null,
    "cash-flow-detail",
    detailFetchParams,
  )
  const { rows: detailCostComputedRows, loading: detailCostComputedLoading } = useFinancialStatement(
    companyId || null,
    "cash-flow-detail",
    detailCostFetchParams,
    needsTinCostData,
  )
  const amountRows = companyId ? detailComputedRows : backendRows
  const costAmountRows = needsTinCostData ? detailCostComputedRows : undefined

  // Series data for multi-period views (cash-flow-detail structure)
  const isTrendHorizon = view === "12months" || view === "quarters" || view === "years"
  const isMonthlySeriesHorizon = view === "comparison" && period === "monthly"
  const needsSeriesData = isTrendHorizon || isMonthlySeriesHorizon
  const isMultiPeriod = isTrendHorizon
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "years" ? 72 : view === "quarters" ? 18 : 12
  const seriesFetchMonths =
    isMonthlySeriesHorizon && comparisonType === "pastMonth"
      ? monthsNeeded + 2
      : view === "12months" || isMonthlySeriesHorizon
        ? monthsNeeded + 1
        : monthsNeeded

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow-detail",
    fiscalYear: currentYear,
    month: effectiveRefMonth,
    months: seriesFetchMonths,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: needsSeriesData && (!isForecastSection || forecastUseSeriesActuals),
    structureVersion: effectiveStructureVersion,
  })

  const displayPeriods = useMemo(
    () =>
      view === "12months" || isMonthlySeriesHorizon
        ? slicePeriodsForMonthlyDisplay(periods, monthsNeeded)
        : periods,
    [periods, view, monthsNeeded, isMonthlySeriesHorizon],
  )

  /** Inclut le mois N−1 année (et son mois précédent) pour la colonne « mois passé ». */
  const seriesPeriodsForBuild = useMemo(() => {
    if (isMonthlySeriesHorizon && comparisonType === "pastMonth") {
      return periods.length > 0 ? periods : displayPeriods
    }
    return displayPeriods
  }, [isMonthlySeriesHorizon, comparisonType, periods, displayPeriods])

  const { rows: costSeriesRows, loading: costSeriesLoading } = useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "cash-flow-detail",
      fiscalYear: currentYear,
      month: effectiveRefMonth,
      months: seriesFetchMonths,
      divisionId: divisionId || null,
      subDivisionId: subDivisionId || null,
      enabled:
        needsTinCostData &&
        needsSeriesData &&
        (!isForecastSection || forecastUseSeriesActuals),
      altAssetCostOnly: true,
      structureVersion: effectiveStructureVersion,
    })

  const treasuryUsesSeries =
    isMultiPeriod ||
    (isMonthlySeriesHorizon && (comparisonType === "lastMonth" || comparisonType === "pastMonth"))
  const treasuryBsPointEnabled =
    !!companyId && hasFixedTreasuryRows && !treasuryUsesSeries
  const { rows: bsBeginningRows, loading: bsBeginningLoading } = useFinancialStatement(
    companyId || null,
    "balance-sheet",
    {
      fiscal_year: treasuryBeginningRef.year,
      month: treasuryBeginningRef.month,
      ...bsTreasuryFetchParams,
    },
    treasuryBsPointEnabled,
  )
  const { rows: bsBeginningPriorRows, loading: bsBeginningPriorLoading } = useFinancialStatement(
    companyId || null,
    "balance-sheet",
    {
      fiscal_year: treasuryBeginningPriorRef.year,
      month: treasuryBeginningPriorRef.month,
      ...bsTreasuryFetchParams,
    },
    treasuryBsPointEnabled,
  )
  const { rows: bsEndingBookRows, loading: bsEndingBookLoading } = useFinancialStatement(
    companyId || null,
    "balance-sheet",
    {
      fiscal_year: effectiveRefYear,
      month: effectiveRefMonth,
      ...bsTreasuryFetchParams,
    },
    treasuryBsPointEnabled,
  )
  const { rows: bsEndingBookPriorRows, loading: bsEndingBookPriorLoading } = useFinancialStatement(
    companyId || null,
    "balance-sheet",
    {
      fiscal_year: treasuryEndingBookPriorRef.year,
      month: treasuryEndingBookPriorRef.month,
      ...bsTreasuryFetchParams,
    },
    treasuryBsPointEnabled,
  )
  const bsSeriesMonths =
    isMonthlySeriesHorizon && comparisonType === "pastMonth" ? seriesFetchMonths : monthsNeeded + 1
  const { rows: bsSeriesRows, loading: bsSeriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    month: effectiveRefMonth,
    months: bsSeriesMonths,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: treasuryUsesSeries && hasFixedTreasuryRows && !!companyId,
    structureVersion: effectiveStructureVersion,
  })

  const treasuryContext = useMemo((): CashFlowTreasuryContext | undefined => {
    if (!hasFixedTreasuryRows) return undefined
    if (treasuryUsesSeries) {
      if (!bsSeriesRows.length || !seriesPeriodsForBuild.length) return undefined
      const netByPeriod = buildNetCashByPeriodKey(bsSeriesRows)
      const seriesView = isMonthlySeriesHorizon ? ("12months" as const) : view
      const referenceMonthYear =
        view === "years"
          ? isForecastSection && forecastUseSeriesActuals
            ? {
                refMonth: effectiveRefMonth,
                refYear: effectiveRefYear,
                columnDates: forecastActualSnapshotDates(
                  forecastActualLayoutEffective,
                  effectiveRefMonth,
                  effectiveRefYear,
                  fiscalYearEndMonth,
                ),
                periodBasis: "fiscal" as const,
                fiscalYearEndMonth,
              }
            : {
                refMonth: effectiveRefMonth,
                refYear: effectiveRefYear,
                count: PERFORMANCE_CHART_YEAR_COUNT,
                periodBasis,
                fiscalYearEndMonth,
              }
          : undefined
      const referenceQuarterMonth =
        view === "quarters"
          ? {
              refMonth: effectiveRefMonth,
              refYear: effectiveRefYear,
              count: STATEMENT_QUARTER_COUNT,
              fiscalYearEndMonth,
              periodBasis,
            }
          : undefined
      const treasuryPeriods =
        view === "years" || view === "quarters" ? periods : seriesPeriodsForBuild
      const beginningTrendRaw = buildBeginningCashTrendForView(
        netByPeriod,
        treasuryPeriods,
        seriesView,
        referenceMonthYear,
        referenceQuarterMonth,
      )
      const endingBookTrendRaw = buildEndingBookTrendForView(
        netByPeriod,
        treasuryPeriods,
        seriesView,
        referenceMonthYear,
        referenceQuarterMonth,
      )
      const beginningTrend =
        isForecastSection && view === "years"
          ? forecastTrendFromActualPrefix(
              beginningTrendRaw.slice(0, forecastActualCols),
              projectionYears,
            )
          : beginningTrendRaw
      const endingBookTrend =
        isForecastSection && view === "years"
          ? forecastTrendFromActualPrefix(
              endingBookTrendRaw.slice(0, forecastActualCols),
              projectionYears,
            )
          : endingBookTrendRaw
      if (isMonthlySeriesHorizon) {
        const trendLabels = reverseSeriesOrderForDisplay(getPeriodLabels(seriesPeriodsForBuild))
        const priorAt =
          comparisonType === "pastMonth"
            ? findTrendIndexForCalendarMonth(
                trendLabels,
                effectiveRefMonth,
                effectiveRefYear - 1,
              )
            : 1
        const priorIndex = priorAt >= 0 ? priorAt : 1
        return {
          beginning: {
            current: beginningTrend[0] ?? 0,
            prior: beginningTrend[priorIndex] ?? 0,
          },
          endingBook: {
            current: endingBookTrend[0] ?? 0,
            prior: endingBookTrend[priorIndex] ?? 0,
          },
          beginningTrend,
          endingBookTrend,
        }
      }
      return { beginningTrend, endingBookTrend }
    }
    if (
      treasuryBsPointEnabled &&
      (bsBeginningLoading ||
        bsBeginningPriorLoading ||
        bsEndingBookLoading ||
        bsEndingBookPriorLoading)
    ) {
      return undefined
    }
    const current = netCashFromBalanceSheetPointRows(bsBeginningRows, "current")
    const prior = bsBeginningPriorRows.length
      ? netCashFromBalanceSheetPointRows(bsBeginningPriorRows, "current")
      : netCashFromBalanceSheetPointRows(bsBeginningRows, "prior")
    const endingBookCurrent = netCashFromBalanceSheetPointRows(bsEndingBookRows, "current")
    const endingBookPrior = bsEndingBookPriorRows.length
      ? netCashFromBalanceSheetPointRows(bsEndingBookPriorRows, "current")
      : netCashFromBalanceSheetPointRows(bsEndingBookRows, "prior")
    return {
      beginning: { current, prior },
      endingBook: { current: endingBookCurrent, prior: endingBookPrior },
    }
  }, [
    hasFixedTreasuryRows,
    treasuryUsesSeries,
    isMonthlySeriesHorizon,
    bsBeginningRows,
    bsBeginningPriorRows,
    bsBeginningLoading,
    bsBeginningPriorLoading,
    bsEndingBookRows,
    bsEndingBookPriorRows,
    bsEndingBookLoading,
    bsEndingBookPriorLoading,
    bsSeriesRows,
    periods,
    displayPeriods,
    seriesPeriodsForBuild,
    treasuryBsPointEnabled,
    view,
    comparisonType,
    effectiveRefMonth,
    effectiveRefYear,
    fiscalYearEndMonth,
    periodBasis,
    isForecastSection,
    forecastUseSeriesActuals,
    forecastActualLayoutEffective,
    forecastActualCols,
    projectionYears,
  ])

  const treasuryLoading =
    hasFixedTreasuryRows &&
    (treasuryUsesSeries
      ? bsSeriesLoading
      : bsBeginningLoading ||
        bsBeginningPriorLoading ||
        bsEndingBookLoading ||
        bsEndingBookPriorLoading)

  const amountsLoading = companyId
    ? detailComputedLoading ||
      (needsTinCostData && detailCostComputedLoading) ||
      (needsSeriesData &&
        (seriesLoading || (needsTinCostData && costSeriesLoading))) ||
      treasuryLoading
    : loading

  const structureRowToDetailRow = (
    sr: Record<string, unknown>,
    row: FinancialStatementRow | undefined,
    trendValues?: number[],
    seriesDetailRows?: SeriesDetailRow[],
    calcContext?: CashFlowCalcContext,
    amountByCalendarMonth?: Map<string, number>,
    calcModeByCode?: Map<string, CashFlowCalcMode>,
    resolveOperand?: (code: string) => CashFlowOperandSnapshot | undefined,
    skipFormulaAggregation = false,
  ): DetailRow => {
    if (isStructureRowEmptyLabel(sr)) {
      return {
        label: "",
        current: 0,
        prior: 0,
        isBold: false,
        isSubtotal: false,
        isSection: false,
        separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
        rowId: String(sr.id ?? ""),
        hasLiaisonCode: false,
      }
    }
    const label = detailLineLabelForDisplay(sr, row?.label ?? "")
    const isBold = typeof sr.isBold === "boolean" ? sr.isBold : !!row?.isBold
    const isSection = typeof sr.isSection === "boolean" ? sr.isSection : !!row?.isSection
    const isResult = typeof sr.isResult === "boolean" ? sr.isResult : !!row?.isResult
    const hasLiaisonCode =
      row?.hasLiaisonCode ??
      (isCashFlowFixedTreasuryStructureRow(sr) || isCodeMappingEnabled(sr))

    let balanceAccounts: GlAccount[] | undefined
    // Formules Paramètres (formula / addition / soustraction) : pas d’expansion GL.
    if (!structureRowHasFormulaLiaison(sr)) {
      if (seriesDetailRows?.length) {
        balanceAccounts = seriesDetailRowsToGlAccounts(seriesDetailRows)
      } else if (row?.detailRows?.length) {
        balanceAccounts = pointInTimeDetailRowsToGlAccounts(row.detailRows)
      }
    }

    const baseRow: DetailRow = {
      label,
      current: row?.current ?? (trendValues ? trendValues[0] || 0 : 0),
      prior: row?.prior ?? (trendValues && trendValues.length >= 2 ? trendValues[1] || 0 : 0),
      indent: indentForSummaryRow({
        isBold: !!isBold,
        isSection: !!isSection,
        isResult: !!isResult,
        indent: typeof sr.indent === "boolean" ? sr.indent : row?.indent,
      }),
      isBold,
      isSubtotal: isResult,
      isSection,
      separatorAbove: isTruthySeparatorAbove(sr.separatorAbove ?? row?.separatorAbove),
      annexLetter: row?.annexLetter,
      rowId: row?.id ?? String(sr.id ?? sr.linkCode ?? ""),
      hasLiaisonCode,
      trendValues: isSection ? undefined : trendValues,
      balanceAccounts,
    }

    if (
      !skipFormulaAggregation &&
      isCashFlowFormulaAggregationRow(sr) &&
      resolveOperand
    ) {
      const formulaPoint = resolveCashFlowFormulaPointAmountFromProcessed(sr, resolveOperand)
      baseRow.current = formulaPoint.current
      baseRow.prior = formulaPoint.prior
      if (calcContext) {
        baseRow.trendValues = resolveCashFlowFormulaTrendValuesFromProcessed(
          sr,
          resolveOperand,
          calcContext,
        )
      }
      return baseRow
    }

    if (isCashFlowFormulaAggregationRow(sr)) {
      return baseRow
    }

    if (isCashFlowFixedTreasuryStructureRow(sr)) {
      return baseRow
    }

    return applyCashFlowCalcModeToDetailRow(
      baseRow,
      readRowCashFlowCalcMode(sr),
      calcContext,
      amountByCalendarMonth,
    )
  }

  const pointInTimeDetailRowsToGlAccounts = (
    detailRows: FinancialStatementDetailRow[]
  ): GlAccount[] =>
    detailRows.map((dr) => ({
      accountNumber: dr.id,
      accountName: dr.label,
      amount: dr.current ?? 0,
      priorAmount: dr.prior ?? 0,
    }))

  const seriesDetailRowsToGlAccounts = (detailRows: SeriesDetailRow[]): GlAccount[] =>
    detailRows.map((dr) => {
      const pseudoRow: SeriesRow = {
        id: dr.id,
        label: dr.label,
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: dr.amounts,
        detailRows: [],
      }
      const rawAmounts = seriesPeriodsForBuild.map((p) => dr.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
      let values: number[]
      if (view === "quarters") {
        values = cashFlowQuarterSnapshotTrendForBasis(
          pseudoRow,
          periods,
          effectiveRefMonth,
          effectiveRefYear,
          periodBasis,
          fiscalYearEndMonth,
          STATEMENT_QUARTER_COUNT,
        )
      } else if (view === "years") {
        if (isForecastSection && forecastUseSeriesActuals) {
          values = forecastCashFlowYearTrend(
            forecastActualLayoutEffective,
            pseudoRow,
            periods,
            effectiveRefMonth,
            effectiveRefYear,
            fiscalYearEndMonth,
            projectionYears,
            forecastBaseYear ?? effectiveRefYear,
          )
        } else {
          values = cashFlowYearSnapshotTrendForBasis(
            pseudoRow,
            periods,
            effectiveRefMonth,
            effectiveRefYear,
            periodBasis,
            fiscalYearEndMonth,
            PERFORMANCE_CHART_YEAR_COUNT,
          )
        }
      } else {
        values = reverseSeriesOrderForDisplay(rawAmounts)
      }
      return {
        accountNumber: dr.id,
        accountName: dr.label,
        amount: values[0] || 0,
        priorAmount: values.length >= 2 ? values[1] || 0 : 0,
        trendValues: values,
        amountByCalendarMonth: buildAmountsByCalendarMonth(pseudoRow, periods),
      }
    })

  const resolveCashFlowCalcContext = (): CashFlowCalcContext | undefined => {
    const monthlyTrend =
      view === "12months" || isMonthlySeriesHorizon
        ? ("12months" as const)
        : view === "quarters" || view === "years"
          ? view
          : undefined
    if (!monthlyTrend) return undefined

    let trendLabels: string[] = []
    if (monthlyTrend === "12months") {
      if (seriesPeriodsForBuild.length > 0) {
        trendLabels = reverseSeriesOrderForDisplay(getPeriodLabels(seriesPeriodsForBuild))
      }
    } else if (monthlyTrend === "quarters") {
      trendLabels = statementQuarterLabelsForBasis(
        effectiveRefMonth,
        effectiveRefYear,
        periodBasis,
        fiscalYearEndMonth,
        STATEMENT_QUARTER_COUNT,
      )
    } else if (isForecastSection) {
      trendLabels = forecastYearLabelsForLayout(
        forecastActualLayoutEffective,
        forecastBaseYear ?? effectiveRefYear ?? new Date().getFullYear(),
        projectionYears,
        effectiveRefMonth,
        effectiveRefYear,
        fiscalYearEndMonth,
      )
    } else if (displayPeriods.length > 0 && seriesRows.length > 0) {
      trendLabels = statementYearLabelsForBasis(
        effectiveRefMonth,
        effectiveRefYear,
        periodBasis,
        fiscalYearEndMonth,
        PERFORMANCE_CHART_YEAR_COUNT,
      )
    }

    if (!trendLabels.length) return undefined
    return {
      trendView: monthlyTrend,
      trendLabels,
      fiscalYearEndMonth,
      periodBasis,
      forecastRefMonth: isForecastSection ? effectiveRefMonth : undefined,
    }
  }

  const mapRowsFromDetailStructure = (
    apiRows: FinancialStatementRow[],
    trendByRowId?: Map<string, number[]>,
    seriesByRowId?: Map<string, SeriesRow>,
    calcContext?: CashFlowCalcContext,
    costApiRows?: FinancialStatementRow[],
    costTrendByRowId?: Map<string, number[]>,
    costSeriesByRowId?: Map<string, SeriesRow>,
  ): DetailRow[] => {
    if (!statementStructure?.length) return []
    const displayRows = listStructureRowsForPresentationDisplay(statementStructure)
    const calcModeByCode = buildCashFlowCalcModeByCode(statementStructure)
    const tinDisplayModeByCode = buildCashFlowTinDisplayModeByCode(statementStructure)

    const pickTinApiRow = (
      sr: Record<string, unknown>,
      rows: FinancialStatementRow[],
      usedIndices: Set<number>,
      usedNestedIds: Set<string>,
    ): FinancialStatementRow | undefined => {
      const code = String(sr.linkCode ?? "").trim()
      const tinMode: CashFlowTinDisplayMode = tinDisplayModeByCode.get(code) ?? "actual"
      if (tinMode === "cost" && costApiRows?.length) {
        return findStatementApiRowForStructureRow(sr, costApiRows, usedIndices, usedNestedIds)
      }
      return findStatementApiRowForStructureRow(sr, rows, usedIndices, usedNestedIds)
    }

    const pickTinTrendValues = (
      row: FinancialStatementRow | undefined,
      tinMode: CashFlowTinDisplayMode,
    ): number[] | undefined => {
      if (!row?.id) return undefined
      if (tinMode === "cost" && costTrendByRowId) return costTrendByRowId.get(row.id)
      return trendByRowId?.get(row.id)
    }

    const pickTinSeriesRow = (
      row: FinancialStatementRow | undefined,
      tinMode: CashFlowTinDisplayMode,
    ): SeriesRow | undefined => {
      if (!row?.id) return undefined
      if (tinMode === "cost" && costSeriesByRowId) return costSeriesByRowId.get(row.id)
      return seriesByRowId?.get(row.id)
    }

    const buildLeafDetailRow = (
      sr: Record<string, unknown>,
      usedIndices: Set<number>,
      usedNestedIds: Set<string>,
    ): DetailRow => {
      const code = String(sr.linkCode ?? "").trim()
      const tinMode: CashFlowTinDisplayMode =
        tinDisplayModeByCode.get(code) ?? readRowCashFlowTinDisplayMode(sr)
      const row = pickTinApiRow(sr, apiRows, usedIndices, usedNestedIds)
      const trendValues = pickTinTrendValues(row, tinMode)
      const seriesRow = pickTinSeriesRow(row, tinMode)
      return structureRowToDetailRow(
        sr,
        row,
        trendValues,
        seriesRow?.detailRows,
        calcContext,
        seriesRow && periods.length ? buildAmountsByCalendarMonth(seriesRow, periods) : undefined,
        calcModeByCode,
        undefined,
        true,
      )
    }

    const usedIndices = new Set<number>()
    const usedNestedIds = new Set<string>()
    const leafRows: DetailRow[] = []

    for (const sr of displayRows) {
      if (isCashFlowFixedTreasuryStructureRow(sr)) {
        leafRows.push({
          label: detailLineLabelForDisplay(sr, ""),
          current: 0,
          prior: 0,
          isBold: typeof sr.isBold === "boolean" ? sr.isBold : false,
          isSubtotal: sr.isResult === true,
          isSection: sr.isSection === true,
          separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
          rowId: String(sr.id ?? sr.linkCode ?? ""),
          hasLiaisonCode: true,
        })
        continue
      }
      if (isCashFlowFormulaAggregationRow(sr)) {
        leafRows.push({
          label: detailLineLabelForDisplay(sr, ""),
          current: 0,
          prior: 0,
          isBold: typeof sr.isBold === "boolean" ? sr.isBold : false,
          isSubtotal: sr.isResult === true,
          isSection: sr.isSection === true,
          separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
          rowId: String(sr.id ?? sr.linkCode ?? ""),
          hasLiaisonCode: isCodeMappingEnabled(sr),
        })
        continue
      }
      const detailRow = buildLeafDetailRow(sr, usedIndices, usedNestedIds)
      leafRows.push(detailRow)
    }

    const reconciledRows = reconcileCashFlowSectionTotalsFromStructure(leafRows, displayRows)

    const processedByCode = new Map<string, DetailRow>()
    for (let i = 0; i < displayRows.length; i++) {
      const sr = displayRows[i]!
      const code = String(sr.linkCode ?? "").trim()
      if (code && normalizeLiaisonMode(sr) === "single" && isCodeMappingEnabled(sr)) {
        processedByCode.set(code, reconciledRows[i]!)
      }
    }

    const buildOperandForLinkCode = (code: string): CashFlowOperandSnapshot | undefined => {
      const fromStructure = processedByCode.get(code)
      if (fromStructure) return detailRowToOperandSnapshot(fromStructure)

      const structureMatch = displayRows.find(
        (sr) =>
          normalizeLiaisonMode(sr) === "single" &&
          isCodeMappingEnabled(sr) &&
          String(sr.linkCode ?? "").trim() === code,
      )
      const operandRow = buildLeafDetailRow(
        structureMatch ?? {
          linkCode: code,
          liaisonMode: "single",
          defineMapping: true,
          label: code,
        },
        new Set<number>(),
        new Set<string>(),
      )
      return detailRowToOperandSnapshot(operandRow)
    }

    const resolveProcessedOperand = (code: string): CashFlowOperandSnapshot | undefined =>
      buildOperandForLinkCode(code)

    return applyCashFlowFixedTreasuryRows(
      displayRows.map((sr, index) => {
        if (!isCashFlowFormulaAggregationRow(sr)) return reconciledRows[index]!
        const shell = reconciledRows[index]!
        const formulaPoint = resolveCashFlowFormulaPointAmountFromProcessed(sr, resolveProcessedOperand)
        const trendValues = calcContext
          ? resolveCashFlowFormulaTrendValuesFromProcessed(sr, resolveProcessedOperand, calcContext)
          : shell.trendValues
        return {
          ...shell,
          separatorAbove: isTruthySeparatorAbove(sr.separatorAbove),
          current: formulaPoint.current,
          prior: formulaPoint.prior,
          trendValues,
        }
      }),
      displayRows,
      treasuryContext,
    )
  }

  const buildSeriesTrendValues = (row: SeriesRow, rawAmounts: ReturnType<typeof getRowAmounts>): number[] => {
    if (view === "quarters") {
      return cashFlowQuarterSnapshotTrendForBasis(
        row,
        periods,
        effectiveRefMonth,
        effectiveRefYear,
        periodBasis,
        fiscalYearEndMonth,
        STATEMENT_QUARTER_COUNT,
      )
    }
    if (view === "years") {
      if (isForecastSection && forecastUseSeriesActuals) {
        return forecastCashFlowYearTrend(
          forecastActualLayoutEffective,
          row,
          periods,
          effectiveRefMonth,
          effectiveRefYear,
          fiscalYearEndMonth,
          projectionYears,
          forecastBaseYear ?? effectiveRefYear,
        )
      }
      return cashFlowYearSnapshotTrendForBasis(
        row,
        periods,
        effectiveRefMonth,
        effectiveRefYear,
        periodBasis,
        fiscalYearEndMonth,
        PERFORMANCE_CHART_YEAR_COUNT,
      )
    }
    return reverseSeriesOrderForDisplay(rawAmounts)
  }

  // Map backend FinancialStatementRow[] to internal DetailRow[]
  const mapBackendRows = (apiRows: FinancialStatementRow[]): DetailRow[] => {
    if (statementStructure?.length) {
      return mapRowsFromDetailStructure(apiRows)
    }
    return apiRows.map((row) => ({
      label: row.label,
      current: row.current ?? 0,
      prior: row.prior ?? 0,
      indent: !row.isBold && !row.isSection && !row.isResult,
      isBold: row.isBold,
      isSubtotal: row.isResult,
      isSection: row.isSection,
      separatorAbove: isTruthySeparatorAbove(row.separatorAbove),
      annexLetter: row.annexLetter,
      rowId: row.id,
      hasLiaisonCode: row.hasLiaisonCode,
      balanceAccounts: row.detailRows?.length
        ? pointInTimeDetailRowsToGlAccounts(row.detailRows)
        : undefined,
    }))
  }

  const buildSeriesMaps = (rows: SeriesRow[]) => {
    const trendByRowId = new Map<string, number[]>()
    const seriesByRowId = new Map<string, SeriesRow>()
    for (const row of rows) {
      const rawAmounts = getRowAmounts(row, seriesPeriodsForBuild)
      if (row.id) {
        trendByRowId.set(row.id, buildSeriesTrendValues(row, rawAmounts))
        seriesByRowId.set(row.id, row)
      }
    }
    return { trendByRowId, seriesByRowId }
  }

  // Build multi-period rows from series API data
  const buildSeriesDetailRows = (): DetailRow[] => {
    const calcContext = resolveCashFlowCalcContext()
    if (statementStructure?.length) {
      if (!seriesRows.length || !seriesPeriodsForBuild.length) {
        return mapRowsFromDetailStructure([], undefined, undefined, calcContext)
      }
      const { trendByRowId, seriesByRowId } = buildSeriesMaps(seriesRows)
      const costMaps =
        needsTinCostData && costSeriesRows.length
          ? buildSeriesMaps(costSeriesRows)
          : undefined
      return mapRowsFromDetailStructure(
        seriesRows as unknown as FinancialStatementRow[],
        trendByRowId,
        seriesByRowId,
        calcContext,
        needsTinCostData ? (costSeriesRows as unknown as FinancialStatementRow[]) : undefined,
        costMaps?.trendByRowId,
        costMaps?.seriesByRowId,
      )
    }

    if (!seriesRows.length || !seriesPeriodsForBuild.length) return []

    return seriesRows.map((row) => {
      const rawAmounts = getRowAmounts(row, seriesPeriodsForBuild)
      const values = buildSeriesTrendValues(row, rawAmounts)
      return {
        label: row.label,
        current: values[0] || 0,
        prior: values.length >= 2 ? values[1] || 0 : 0,
        indent: !row.isBold && !row.isSection && !row.isResult,
        isBold: row.isBold,
        isSubtotal: row.isResult,
        isSection: row.isSection,
        separatorAbove: isTruthySeparatorAbove((row as { separatorAbove?: unknown }).separatorAbove),
        annexLetter: row.annexLetter,
        rowId: row.id,
        hasLiaisonCode: row.hasLiaisonCode,
        trendValues: row.isSection ? undefined : values,
        balanceAccounts: row.detailRows?.length
          ? seriesDetailRowsToGlAccounts(row.detailRows)
          : undefined,
      }
    })
  }

  const getMultiPeriodData = (): DetailRow[] => buildSeriesDetailRows()

  const getMonthlyComparisonDetailData = (): DetailRow[] => {
    if (comparisonType === "budget") {
      if (statementStructure?.length) {
        return mapRowsFromDetailStructure(amountRows, undefined, undefined, undefined, costAmountRows)
      }
      return amountRows.length > 0 ? mapBackendRows(amountRows) : []
    }

    if (!seriesRows.length || !displayPeriods.length) {
      if (statementStructure?.length) {
        return mapRowsFromDetailStructure(amountRows, undefined, undefined, undefined, costAmountRows)
      }
      return amountRows.length > 0 ? mapBackendRows(amountRows) : []
    }

    if (comparisonType === "lastMonth") {
      return mapMonthlyTrendRowsToComparisonAmounts(buildSeriesDetailRows())
    }

    const calcContext = resolveCashFlowCalcContext()
    const trendLabels = calcContext?.trendLabels ?? []
    return mapMonthlyTrendRowsToPastMonthComparisonAmounts(
      buildSeriesDetailRows(),
      effectiveRefMonth,
      effectiveRefYear,
      trendLabels,
    )
  }

  const getDetailData = (): DetailRow[] => {
    if (isMultiPeriod) {
      return getMultiPeriodData()
    }
    if (isMonthlySeriesHorizon) {
      return getMonthlyComparisonDetailData()
    }
    if (statementStructure?.length) {
      return mapRowsFromDetailStructure(
        amountRows,
        undefined,
        undefined,
        resolveCashFlowCalcContext(),
        costAmountRows,
      )
    }
    if (amountRows.length > 0) {
      return mapBackendRows(amountRows)
    }
    return []
  }

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string): string => {
    if (!str) return str
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  const rawDetailData = getDetailData()
  const detailDataForVariant = useMemo(() => {
    if (!isSummaryVariant || !statementStructure?.length) return rawDetailData
    return summaryPresentationStructureRows
      .map((sr) => {
        const pres = resolveCashFlowSummaryRowPresentation(sr)
        if (isCashFlowSummaryOnlySpacer(sr) || isStructureRowEmptyLabel(sr)) {
          return {
            label: "",
            current: 0,
            prior: 0,
            isBold: false,
            indent: false,
            isSubtotal: false,
            isSection: false,
            separatorAbove: pres.separatorAbove,
            rowId: String(sr.id ?? ""),
            hasLiaisonCode: false,
          } satisfies DetailRow
        }
        const id = String(sr.id ?? "")
        const label = detailLineLabelForDisplay(sr, String(sr.label ?? ""))
        const found =
          rawDetailData.find((r) => (id && r.rowId === id) || r.label === label) ?? null
        if (!found) return null
        return {
          ...found,
          isBold: pres.isBold,
          indent: pres.indent,
          separatorAbove: pres.separatorAbove,
        } satisfies DetailRow
      })
      .filter((r): r is DetailRow => r != null)
  }, [isSummaryVariant, statementStructure, summaryPresentationStructureRows, rawDetailData])

  const horizonView = view as IncomeStatementHorizonView

  // Determine what we're comparing
  const isCompanyComparison = columnMode === "comparison" && !companyId && !isForecastSection
  const isDivisionComparison = columnMode === "comparison" && companyId && !divisionId && !isForecastSection
  const isSubDivisionComparison =
    columnMode === "comparison" && companyId && divisionId && !subDivisionId && !isForecastSection
  const isComparisonMode = isCompanyComparison || isDivisionComparison || isSubDivisionComparison
  
  // Get entities to compare
  let entitiesToCompare: Array<{ id: string; name: string }> = []
  if (isCompanyComparison) {
    entitiesToCompare = companies.map((c) => ({ id: c.id, name: c.name }))
  } else if (isDivisionComparison) {
    const selectedCompany = companies.find((c) => c.id === companyId)
    entitiesToCompare = selectedCompany?.divisions.map((d) => ({ id: d.id, name: d.name })) || []
  } else if (isSubDivisionComparison) {
    const selectedCompany = companies.find((c) => c.id === companyId)
    const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
    entitiesToCompare = selectedDivision?.subDivisions.map((sd) => ({ id: sd.id, name: sd.name })) || []
  }
  
  // Fetch real data for each entity in comparison mode
  const [entityDataMap, setEntityDataMap] = useState<Record<string, DetailRow[]>>({})
  const [entityDataLoading, setEntityDataLoading] = useState(false)

  useEffect(() => {
    if (!isComparisonMode) {
      setEntityDataMap(prev => Object.keys(prev).length === 0 ? prev : {})
      return
    }

    // Compute entities inside the effect to avoid unstable dependency
    let entities: Array<{ id: string; name: string }> = []
    if (isCompanyComparison) {
      entities = companies.map((c) => ({ id: c.id, name: c.name }))
    } else if (isDivisionComparison) {
      const sc = companies.find((c) => c.id === companyId)
      entities = sc?.divisions.map((d) => ({ id: d.id, name: d.name })) || []
    } else if (isSubDivisionComparison) {
      const sc = companies.find((c) => c.id === companyId)
      const sd = sc?.divisions.find((d) => d.id === divisionId)
      entities = sd?.subDivisions.map((s) => ({ id: s.id, name: s.name })) || []
    }

    if (entities.length === 0) {
      setEntityDataMap(prev => Object.keys(prev).length === 0 ? prev : {})
      return
    }

    let cancelled = false
    setEntityDataLoading(true)

    const fetchEntityData = async () => {
      const results: Record<string, DetailRow[]> = {}

      for (const entity of entities) {
        try {
          const params: FinancialStatementSeriesParams = {
            fiscal_year: currentYear,
            months: 12,
          }
          let entityCompanyId = companyId || ""

          if (isCompanyComparison) {
            entityCompanyId = entity.id
          } else if (isDivisionComparison) {
            params.division_id = entity.id
          } else if (isSubDivisionComparison) {
            params.sub_division_id = entity.id
          }

          if (!entityCompanyId) continue

          const response = await getFinancialStatementSeries(
            entityCompanyId,
            "cash-flow-detail",
            params
          )

          if (!cancelled && response.rows) {
            const mapped: DetailRow[] = response.rows.map((row) => {
              const amounts = Object.entries(row.amounts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, v]) => v)
              const lastAmount = amounts[amounts.length - 1] || 0
              const priorAmount = amounts.length >= 2 ? amounts[amounts.length - 2] || 0 : 0
              return {
                label: row.label,
                current: lastAmount,
                prior: priorAmount,
                indent: !row.isBold && !row.isSection && !row.isResult,
                isBold: row.isBold,
                isSubtotal: row.isResult,
                isSection: row.isSection,
              }
            })
            results[entity.id] = mapped
          }
        } catch (err) {
          console.error(`Error fetching data for entity ${entity.name}:`, err)
        }
      }

      if (!cancelled) {
        setEntityDataMap(results)
        setEntityDataLoading(false)
      }
    }

    fetchEntityData()
    return () => { cancelled = true }
  }, [isComparisonMode, companies, companyId, divisionId, isCompanyComparison, isDivisionComparison, isSubDivisionComparison, currentYear])

  // Helper function to get comparison label
  const getComparisonLabel = (): string => {
    if (view !== "comparison" && view !== "ytd" && view !== "ddm") return "Passé"
    if (comparisonType === "lastMonth") {
      if (view === "ytd") return "YTD dernier"
      if (view === "ddm") return "DDM dernier"
      if (period === "monthly") return formatPriorCalendarMonth(effectiveRefMonth, effectiveRefYear)
      if (period === "quarterly") {
        const q = calendarQuarterFromMonth(effectiveRefMonth)
        const pq = priorCalendarQuarter(q, effectiveRefYear)
        return formatQuarterShortLabel(pq.quarter, pq.year)
      }
      return "Année dernière"
    }
    if (comparisonType === "pastMonth") {
      if (view === "ytd") return "YTD passé"
      if (view === "ddm") return "DDM passé"
      if (period === "monthly") return formatSameMonthPriorYear(effectiveRefMonth, effectiveRefYear)
      if (period === "quarterly") {
        const q = calendarQuarterFromMonth(effectiveRefMonth)
        return formatQuarterShortLabel(q, effectiveRefYear - 1)
      }
      return "Année passée"
    }
    if (comparisonType === "budget") {
      if (selectedBudgetName) {
        if (view === "ytd") return `Budget ${selectedBudgetName} (YTD)`
        if (view === "ddm") return `Budget ${selectedBudgetName} (DDM)`
        return `Budget ${selectedBudgetName}`
      }
      if (view === "ytd") return "YTD budgeté"
      if (view === "ddm") return "DDM budgeté"
      if (period === "monthly") return "Mois budgeté"
      if (period === "quarterly") return "Trimestre budgeté"
      return "Année budgetée"
    }
    return "Passé"
  }

  const getCurrentColumnLabel = (): string => {
    if ((view === "comparison" || view === "ddm") && period === "monthly") {
      return formatCalendarMonthYear(effectiveRefMonth, effectiveRefYear)
    }
    if ((view === "comparison" || view === "ddm") && period === "quarterly") {
      const q = calendarQuarterFromMonth(effectiveRefMonth)
      return formatQuarterShortLabel(q, effectiveRefYear)
    }
    if ((view === "comparison" || view === "ddm") && period === "annual") {
      return String(effectiveRefYear)
    }
    return "Courant"
  }

  // Helper function to generate month labels from series data or fallback
  const getMonthLabels = (): string[] => {
    if (displayPeriods.length > 0) return reverseSeriesOrderForDisplay(getPeriodLabels(displayPeriods))
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const cd = new Date()
    const labels: string[] = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(cd.getFullYear(), cd.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return reverseSeriesOrderForDisplay(labels)
  }

  // Helper function to generate quarter labels from series data or fallback
  const getQuarterLabels = (): string[] => {
    return statementQuarterLabelsForBasis(
      effectiveRefMonth,
      effectiveRefYear,
      periodBasis,
      fiscalYearEndMonth,
      STATEMENT_QUARTER_COUNT,
    )
  }

  // Helper function to generate year labels from series data or fallback
  const getYearLabels = (): string[] => {
    if (isForecastSection) {
      return forecastYearLabelsForLayout(
        forecastActualLayoutEffective,
        forecastBaseYear ?? effectiveRefYear ?? new Date().getFullYear(),
        projectionYears,
        effectiveRefMonth,
        effectiveRefYear,
        fiscalYearEndMonth,
      )
    }
    return statementYearLabelsForBasis(
      effectiveRefMonth,
      effectiveRefYear,
      periodBasis,
      fiscalYearEndMonth,
      PERFORMANCE_CHART_YEAR_COUNT,
    )
  }


  const getHorizonText = (): string => getHorizonModeLabel(view, period)

  const [structureEditMode, setStructureEditMode] = useState(false)
  const canInlineStructureEdit =
    !!companyId &&
    !isComparisonMode &&
    (isSummaryVariant
      ? showSummaryStructureSettings
      : effectiveShowStructureSettings)
  const isStructureStudio = structureEditMode && canInlineStructureEdit && !!companyId

  const { data, visiblePresentationStructureRows } = useMemo(() => {
    const sourceRows = isSummaryVariant ? detailDataForVariant : rawDetailData
    const sourcePresentation = isSummaryVariant
      ? summaryPresentationStructureRows
      : presentationStructureRows
    if (isStructureStudio || isForecastSection || !statementStructure?.length) {
      return {
        data: sourceRows,
        visiblePresentationStructureRows: sourcePresentation,
      }
    }
    if (isSummaryVariant) {
      return {
        data: sourceRows,
        visiblePresentationStructureRows: sourcePresentation,
      }
    }
    const filtered = filterCashFlowDetailRowsWithStructureForHorizon(
      sourceRows,
      sourcePresentation,
      horizonView,
    )
    return {
      data: filtered.rows,
      visiblePresentationStructureRows: filtered.presentationStructure,
    }
  }, [
    rawDetailData,
    detailDataForVariant,
    presentationStructureRows,
    summaryPresentationStructureRows,
    statementStructure,
    horizonView,
    isStructureStudio,
    isForecastSection,
    isSummaryVariant,
  ])

  const endingCashRowIndex = useMemo(
    () => visiblePresentationStructureRows.findIndex(isCashFlowEndingCashStructureRow),
    [visiblePresentationStructureRows],
  )

  const treasuryValidation = useMemo(() => {
    if (!hasFixedTreasuryRows || endingCashRowIndex < 0) return null
    const endingRow = data[endingCashRowIndex]
    if (!endingRow) return null

    if (isMultiPeriod) {
      const trendEcarts = cashFlowTreasuryValidationTrendEcarts(
        endingRow.trendValues,
        treasuryContext?.endingBookTrend,
      )
      if (!trendEcarts.length) return null
      return { current: null as number | null, prior: null as number | null, trendEcarts }
    }

    const book = treasuryContext?.endingBook
    if (!book) return null
    return {
      current: cashFlowTreasuryValidationEcart(endingRow.current, book.current),
      prior: cashFlowTreasuryValidationEcart(endingRow.prior, book.prior),
      trendEcarts: [] as number[],
    }
  }, [
    hasFixedTreasuryRows,
    endingCashRowIndex,
    data,
    isMultiPeriod,
    treasuryContext,
  ])

  const showTreasuryValidation = hasFixedTreasuryRows && treasuryValidation != null
  const showTreasuryMismatch =
    showTreasuryValidation &&
    treasuryValidation.current != null &&
    !isCashFlowTreasuryBalanced(treasuryValidation.current)

  const renderCardHeader = () => (
    <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className={dashboardCardHeaderIconBoxClass}>
            <ListTree className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{title}</h2>
              {isStructureStudio && (
                <Badge
                  variant="secondary"
                  className="border border-slate-200 bg-slate-100 font-medium text-[#2A2F3A] shadow-none"
                >
                  <Sparkles className="h-3 w-3 text-[#E0742D]" />
                  Édition structure</Badge>
              )}
            </div>
            {isStructureStudio ? (
              <p className={cn("text-sm leading-relaxed", dashboardCardBodyMutedClass)}>
                {isSummaryVariant ? (
                  <>
                    Ajustez l’espacement, la séparation et le gras des annexes. Ces réglages
                    s’appliquent <span className="font-medium text-[#2A2F3A]">uniquement au Sommaire</span>.
                    Les postes Annexe se cochent dans{" "}
                    <span className="font-medium text-[#2A2F3A]">Détail → Paramètres</span>.
                  </>
                ) : (
                  <>
                    Ajustez les libellés. <span className="font-medium text-[#2A2F3A]">Masquer</span> retire la ligne du détail. <span className="font-medium text-[#2A2F3A]">Code</span> active la colonne liaison ; <span className="font-medium text-[#2A2F3A]">Liaison</span> définit le code ou la formule ; <span className="font-medium text-[#2A2F3A]">Calcul</span> choisit Réel ou une variation N − N−1. Enregistrez pour appliquer partout.
                  </>
                )}
              </p>
            ) : (
              <div className={cn("flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
                <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
                <span className="text-slate-400">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span>
                      {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                        "Division"}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies
                        .find((c) => c.id === companyId)
                        ?.divisions.find((d) => d.id === divisionId)
                        ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                    </span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span className={cn("font-semibold", dashboardCardAccentClass)}>
                      {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                        "Division"}
                    </span>
                  </>
                ) : companyId ? (
                  <span className={cn("font-semibold", dashboardCardAccentClass)}>
                    {companies.find((c) => c.id === companyId)?.name || "Société"}
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
  )
  let detailTableColumnCount = 2
  if (view === "current") detailTableColumnCount = 2
  else if (view === "comparison" || view === "ddm" || view === "ytd") {
    if (isComparisonMode) detailTableColumnCount = 1 + entitiesToCompare.length
    else if (columnMode === "variations") detailTableColumnCount = 5
    else detailTableColumnCount = 3
  } else if (view === "12months") detailTableColumnCount = 1 + getMonthLabels().length
  else if (view === "quarters") detailTableColumnCount = 1 + getQuarterLabels().length
  else if (view === "years") detailTableColumnCount = 1 + getYearLabels().length

  if (
    amountsLoading ||
    structureLoading ||
    (isMultiPeriod &&
      (seriesLoading ||
        (needsTinCostData && costSeriesLoading) ||
        treasuryLoading)) ||
    entityDataLoading
  ) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative w-full min-w-0">
          {renderCardHeader()}
          <div className="relative px-8 py-16 text-center">
            <div className="animate-pulse space-y-4">
              <div className="mx-auto h-4 w-1/3 rounded bg-slate-200" />
              <div className="mx-auto h-4 w-2/3 rounded bg-slate-200" />
              <div className="mx-auto h-4 w-1/2 rounded bg-slate-200" />
            </div>
            <p className={cn("mt-4 text-sm", dashboardCardBodyMutedClass)}>Chargement des données...</p>
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0 && !isStructureStudio) {
    return (
      <div className={cn("w-full", dashboardCardFrameStaticClass)}>
        <div className={dashboardCardRingClass} aria-hidden />
        <div className="relative w-full min-w-0">
          {renderCardHeader()}
          <div className="px-8 py-16 text-center">
            <p className={cn("text-sm", dashboardCardBodyMutedClass)}>
              {isSummaryVariant ? (
                <>
                  Aucune ligne en annexe. Dans <span className="font-medium text-[#2A2F3A]">Détail → Paramètres</span>,
                  cochez <span className="font-medium text-[#2A2F3A]">Annexe</span> sur les postes à afficher ici
                  (même calcul que le Détail).
                </>
              ) : (
                <>
                  Aucune donnée disponible. Ouvrez{" "}
                  <span className="font-medium text-[#2A2F3A]">Paramètres</span> pour configurer la structure du
                  détail, ou importez une balance de vérification.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderValidationEcartCell = (ecart: number | null | undefined, key?: string | number) => {
    if (ecart === null || ecart === undefined) {
      return (
        <td key={key} className="px-6 py-2.5 text-right text-sm text-slate-400">
          —
        </td>
      )
    }
    const balanced = isCashFlowTreasuryBalanced(ecart)
    return (
      <td
        key={key}
        className={cn(
          "px-6 py-2.5 text-right text-sm font-semibold tabular-nums",
          balanced ? "text-emerald-700" : "text-amber-700",
        )}
        title={
          balanced
            ? "Flux de trésorerie équilibré"
            : `Écart trésorerie fin − bilan (ACT-A − PCT-A) : ${formatCurrency(ecart)}`
        }
      >
        {formatCurrency(ecart)}
      </td>
    )
  }

  const renderTreasuryValidationRow = () => {
    const trendEcarts = treasuryValidation?.trendEcarts ?? []
    const trendColumnCount =
      view === "12months"
        ? 12
        : view === "quarters"
          ? 5
          : isForecastSection
            ? forecastYearColumnCount
            : PERFORMANCE_CHART_YEAR_COUNT

    return (
      <tr
        data-testid="cash-flow-treasury-validation-row"
        className="[&_td]:border-slate-300 [&>td]:bg-slate-50 [&>td:first-child]:bg-slate-50"
      >
        <td
          className="whitespace-nowrap px-6 py-2.5 text-sm font-semibold text-slate-800"
          title="Trésorerie à la fin − (ACT-A − PCT-A) du mois"
        >
          Validation
        </td>
        {view === "current" && renderValidationEcartCell(treasuryValidation?.current ?? null)}
        {view === "comparison" && !isComparisonMode && (
          <>
            {renderValidationEcartCell(treasuryValidation?.current ?? null)}
            {renderValidationEcartCell(treasuryValidation?.prior ?? null)}
            {columnMode === "variations" ? (
              <td className="px-6 py-2.5 text-right text-sm text-slate-400">—</td>
            ) : null}
            {columnMode === "variations" ? (
              <td className="px-6 py-2.5 text-right text-sm text-slate-400">—</td>
            ) : null}
          </>
        )}
        {view === "comparison" && isComparisonMode && (
          <>
            {entitiesToCompare.map((entity) => (
              <td key={entity.id} className="px-6 py-2.5 text-right text-sm text-slate-400">
                —
              </td>
            ))}
          </>
        )}
        {(view === "ddm" || view === "ytd") && (
          <>
            {renderValidationEcartCell(treasuryValidation?.current ?? null)}
            {renderValidationEcartCell(treasuryValidation?.prior ?? null)}
            {columnMode === "variations" ? (
              <td className="px-6 py-2.5 text-right text-sm text-slate-400">—</td>
            ) : null}
            {columnMode === "variations" ? (
              <td className="px-6 py-2.5 text-right text-sm text-slate-400">—</td>
            ) : null}
          </>
        )}
        {(view === "12months" || view === "quarters" || view === "years") && (
          <>
            {(trendEcarts.length > 0 ? trendEcarts : Array.from({ length: trendColumnCount }).map(() => null)).map(
              (ecart, colIdx) => renderValidationEcartCell(ecart, colIdx),
            )}
          </>
        )}
      </tr>
    )
  }

  return (
    <div className={cn("w-full", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className="relative w-full min-w-0">
        {showTreasuryMismatch && treasuryValidation?.current != null && (
          <div
            role="alert"
            className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900 sm:px-7"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p className="leading-snug">
              <span className="font-semibold">Le flux de trésorerie ne concorde pas avec le bilan.</span>{" "}
              La ligne Validation affiche un écart de {formatCurrency(Math.abs(treasuryValidation.current))}{" "}
              (Trésorerie à la fin − (ACT-A − PCT-A) du mois).
            </p>
          </div>
        )}
        {renderCardHeader()}

        {isStructureStudio ? (
          isSummaryVariant ? (
            <CashFlowSummaryStructureStudio
              embedded
              companyId={companyId!}
              onSaved={handleSummaryStructureSaved}
              onClose={() => setStructureEditMode(false)}
            />
          ) : (
            <StatementStructureStudio
              embedded
              companyId={companyId!}
              statementType="cash-flow-detail"
              annexMode="summary"
              onSaved={handleStructureSaved}
              onClose={() => setStructureEditMode(false)}
            />
          )
        ) : (
          <>
            {/* Table — en-tête et colonne Poste figés au défilement */}
            <div className="min-w-0 max-h-[min(72vh,56rem)] overflow-auto overscroll-contain bg-white">
              <table
                className={cn(
                  "w-full min-w-full border-separate border-spacing-0",
                  // Annuel / trimestriel : répartir la largeur (sinon espace vide à droite avec 5 cols).
                  (view === "years" || view === "quarters") && "table-fixed",
                )}
              >
              {(view === "years" || view === "quarters") && (() => {
                const amountColCount = Math.max(1, detailTableColumnCount - 1)
                const firstPct = 36
                const amountPct = (100 - firstPct) / amountColCount
                return (
                  <colgroup>
                    <col style={{ width: `${firstPct}%` }} />
                    {Array.from({ length: amountColCount }).map((_, i) => (
                      <col key={i} style={{ width: `${amountPct}%` }} />
                    ))}
                  </colgroup>
                )
              })()}
          <thead
            className={cn(
              "[&_th]:sticky [&_th]:top-0 [&_th]:z-20 [&_th]:bg-slate-100",
              "[&_th]:border-b-2 [&_th]:border-slate-200",
              "[&_th:first-child]:left-0 [&_th:first-child]:z-30",
            )}
          >
            <tr>
              <th
                className={cn(
                  "px-6 py-4 text-left text-sm font-semibold text-slate-900 whitespace-nowrap",
                  view === "12months"
                    ? "min-w-[20rem] sm:min-w-[24rem] lg:min-w-[30rem]"
                    : view === "years" || view === "quarters"
                      ? "min-w-0"
                      : "w-2/5",
                )}
              >
                Poste
              </th>
              {view === "current" && (
                <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Montant</th>
              )}
              {view === "comparison" && !isComparisonMode && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : null}
                </>
              )}
              {view === "comparison" && isComparisonMode && (
                <>
                  {entitiesToCompare.map((entity) => (
                    <th key={entity.id} className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">
                      {entity.name}
                    </th>
                  ))}
                </>
              )}
              {view === "ddm" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getCurrentColumnLabel()}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">{getComparisonLabel()}</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : null}
                </>
              )}
              {view === "ytd" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {fiscalYear}</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">YTD {(fiscalYear ?? new Date().getFullYear()) - 1}</th>
                  {columnMode === "variations" ? (
                    <>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation %</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Variation $</th>
                    </>
                  ) : null}
                </>
              )}
              {view === "12months" && (
                <>
                  {getMonthLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "quarters" && (
                <>
                  {getQuarterLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th
                      key={idx}
                      className={cn(
                        "px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap",
                        isForecastHistoricalColumn(idx) ? "bg-slate-50" : ""
                      )}
                    >
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody
            className={cn(
              "[&_td]:border-b [&_td]:border-slate-200",
              "[&_td:first-child]:sticky [&_td:first-child]:left-0 [&_td:first-child]:z-10",
              "[&_td:first-child]:bg-white",
            )}
          >
            {showTreasuryValidation && renderTreasuryValidationRow()}
            {showTreasuryValidation && (
              <tr aria-hidden>
                <td
                  colSpan={detailTableColumnCount}
                  className="border-0 p-0 align-top leading-none border-t border-t-slate-600"
                />
              </tr>
            )}
            {data.map((row, idx) => {
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
              const displayLabel = row.label
              const isSpacer = row.label === ""
              const isFixedTreasuryRow =
                visiblePresentationStructureRows[idx] != null &&
                isCashFlowFixedTreasuryStructureRow(visiblePresentationStructureRows[idx]!)
              const shouldHideAmounts =
                isSpacer ||
                !!row.isSection ||
                (row.hasLiaisonCode === false && !isFixedTreasuryRow)
              const showSeparatorAbove = isTruthySeparatorAbove(
                isSummaryVariant
                  ? (row.separatorAbove ??
                      resolveCashFlowSummaryRowPresentation(
                        visiblePresentationStructureRows[idx] ?? {},
                      ).separatorAbove)
                  : (visiblePresentationStructureRows[idx]?.separatorAbove ?? row.separatorAbove),
              )
              const isBoldRow = !!row.isBold
              const matchedStructureRow =
                statementStructure && row.rowId
                  ? findStructureRowForStatementLine(row.rowId, row.label, statementStructure)
                  : undefined
              const canExpand =
                !isSummaryVariant &&
                !!row.rowId &&
                !!row.balanceAccounts &&
                row.balanceAccounts.length > 0 &&
                !structureRowHasFormulaLiaison(matchedStructureRow)
              const isExpanded = row.rowId ? expandedRows.has(row.rowId) : false
              const amountWeightClass =
                isBoldRow && !isExpanded ? "font-semibold font-bold" : "text-slate-500"
              const amountWeightClassPrior =
                isBoldRow && !isExpanded
                  ? "font-semibold font-bold text-slate-600"
                  : "text-slate-500"

              const renderGlAccountCells = (account: GlAccount) => {
                const accountVariation =
                  account.priorAmount !== undefined && account.amount && account.priorAmount
                    ? calculateVariation(account.amount, account.priorAmount)
                    : null
                const accountVariationAmount =
                  account.priorAmount !== undefined
                    ? account.amount - (account.priorAmount ?? 0)
                    : 0

                return (
                  <>
                    {view === "current" && (
                      <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                        {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                      </td>
                    )}
                    {view === "comparison" && !isComparisonMode && (
                      <>
                        <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                          {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                        </td>
                        <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                          {account.priorAmount !== undefined && account.priorAmount !== 0
                            ? formatCurrency(account.priorAmount)
                            : "-"}
                        </td>
                        {columnMode === "variations" ? (
                          <>
                            <td
                              className={`px-6 py-2 text-right font-normal text-sm ${
                                accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {accountVariation !== null && account.amount !== 0
                                ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                : "-"}
                            </td>
                            <td
                              className={`px-6 py-2 text-right font-normal text-sm ${
                                accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {account.amount !== 0
                                ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                : "-"}
                            </td>
                          </>
                        ) : null}
                      </>
                    )}
                    {view === "comparison" && isComparisonMode &&
                      entitiesToCompare.map((entity) => (
                        <td key={entity.id} className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                          -
                        </td>
                      ))}
                    {(view === "ddm" || view === "ytd") && (
                      <>
                        <td className="px-6 py-2 text-right font-normal text-sm text-slate-700">
                          {account.amount !== 0 ? formatCurrency(account.amount) : "-"}
                        </td>
                        <td className="px-6 py-2 text-right font-normal text-sm text-slate-500">
                          {account.priorAmount !== undefined && account.priorAmount !== 0
                            ? formatCurrency(account.priorAmount)
                            : "-"}
                        </td>
                        {columnMode === "variations" ? (
                          <>
                            <td
                              className={`px-6 py-2 text-right font-normal text-sm ${
                                accountVariation && accountVariation >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {accountVariation !== null && account.amount !== 0
                                ? `${accountVariation >= 0 ? "+" : ""}${accountVariation.toFixed(1)}%`
                                : "-"}
                            </td>
                            <td
                              className={`px-6 py-2 text-right font-normal text-sm ${
                                accountVariationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {account.amount !== 0
                                ? `${accountVariationAmount >= 0 ? "+" : ""}${formatCurrency(accountVariationAmount)}`
                                : "-"}
                            </td>
                          </>
                        ) : null}
                      </>
                    )}
                    {(view === "12months" || view === "quarters" || view === "years") && account.trendValues && (
                      <>
                        {account.trendValues.map((value, valueIdx) => (
                          <td
                            key={valueIdx}
                            className={cn(
                              "px-4 py-2 text-right font-normal text-sm text-slate-700",
                              isForecastHistoricalColumn(valueIdx) ? "bg-slate-50" : ""
                            )}
                          >
                            {value !== 0 ? formatCurrency(value) : "-"}
                          </td>
                        ))}
                      </>
                    )}
                  </>
                )
              }

              return (
                <Fragment key={`${row.label}-${idx}`}>
                  {showSeparatorAbove && (
                    <tr aria-hidden>
                      <td
                        colSpan={detailTableColumnCount}
                        className="border-0 p-0 align-top leading-none border-t border-t-slate-600"
                      />
                    </tr>
                  )}
                  <tr
                    className={cn(
                      isSpacer ? "h-2" : "",
                      !isSpacer && "hover:[&>td]:bg-slate-50/90 hover:[&>td:first-child]:bg-slate-50/90",
                      canExpand && "cursor-pointer",
                    )}
                    onClick={() => canExpand && toggleRow(row.rowId!)}
                    data-testid={canExpand ? "cash-flow-detail-expandable-row" : undefined}
                  >
                  <td
                    className={cn(
                      "px-6 py-3 whitespace-nowrap",
                      isBoldRow ? "font-bold text-slate-900" : "text-slate-700",
                      row.indent ? "pl-12" : ""
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {canExpand ? (
                        <span className="flex-shrink-0" aria-hidden>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-500" />
                          )}
                        </span>
                      ) : null}
                      <span className="flex-1 whitespace-nowrap">{displayLabel}</span>
                    </div>
                  </td>

                  {view === "current" && (
                    <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}>
                      {row.current !== 0 ? formatCurrency(row.current) : "-"}
                    </td>
                  )}

                  {view === "comparison" && !isComparisonMode && (
                    <>
                      <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {variation !== null && row.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {row.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}
                  {view === "comparison" && isComparisonMode && (
                    <>
                      {entitiesToCompare.map((entity) => {
                        const entityRows = entityDataMap[entity.id] || []
                        const entityRow = entityRows.find(r => r.label === row.label) || row
                        return (
                          <td
                            key={entity.id}
                            className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {entityRow.current !== 0 ? formatCurrency(entityRow.current) : "-"}
                          </td>
                        )
                      })}
                    </>
                  )}
                  {view === "ddm" && (
                    <>
                      <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {variation !== null && row.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {row.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}

                  {view === "ytd" && (
                    <>
                      <td className={`px-6 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.current !== 0 ? formatCurrency(row.current) : "-"}
                      </td>
                      <td className={`px-6 py-3 text-right ${amountWeightClassPrior} ${shouldHideAmounts ? "text-white" : ""}`}>
                        {row.prior !== 0 ? formatCurrency(row.prior) : "-"}
                      </td>
                      {columnMode === "variations" ? (
                        <>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variation && variation >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {variation !== null && row.current !== 0
                              ? `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`
                              : "-"}
                          </td>
                          <td
                            className={`px-6 py-3 text-right font-semibold ${
                              variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                            } ${shouldHideAmounts ? "text-white" : ""}`}
                          >
                            {row.current !== 0
                              ? `${variationAmount >= 0 ? "+" : ""}${formatCurrency(variationAmount)}`
                              : "-"}
                          </td>
                        </>
                      ) : null}
                    </>
                  )}

                  {/* Trend Views - 12 months, quarters, years */}
                  {view === "12months" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "quarters" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                        <td
                          key={valueIdx}
                          className={`px-4 py-3 text-right ${amountWeightClass} ${shouldHideAmounts ? "text-white" : ""}`}
                        >
                          {value !== 0 ? formatCurrency(value) : "-"}
                        </td>
                      ))}
                    </>
                  )}
                  {view === "years" && row.trendValues && (
                    <>
                      {row.trendValues.map((value, valueIdx) => (
                          <td 
                            key={valueIdx} 
                            className={cn(
                              "px-4 py-3 text-right",
                              amountWeightClass,
                              shouldHideAmounts ? "text-white" : "",
                              isForecastHistoricalColumn(valueIdx) ? "bg-slate-50" : ""
                            )}
                          >
                            {value !== 0 ? formatCurrency(value) : "-"}
                          </td>
                      ))}
                    </>
                  )}
                  {/* Empty cells for spacer rows in trend views */}
                  {(view === "12months" || view === "quarters" || view === "years") && !row.trendValues && (
                    <>
                      {Array.from({
                        length:
                          view === "12months"
                            ? 12
                            : view === "quarters"
                              ? 5
                              : isForecastSection
                                ? forecastYearColumnCount
                                : PERFORMANCE_CHART_YEAR_COUNT,
                      }).map((_, emptyIdx) => (
                          <td 
                            key={emptyIdx} 
                            className={cn(
                              "px-4 py-3 text-right font-semibold text-white",
                              isForecastHistoricalColumn(emptyIdx) ? "bg-slate-50" : ""
                            )}
                          >
                            -
                          </td>
                      ))}
                    </>
                  )}
                </tr>
                  {isExpanded && canExpand && row.balanceAccounts?.map((account, accIdx) => (
                    <tr
                      key={`${idx}-gl-${accIdx}`}
                      className="[&>td]:bg-slate-50 [&>td:first-child]:bg-slate-50"
                      data-testid="cash-flow-detail-gl-account"
                    >
                      <td className="px-6 py-2 text-slate-500 pl-20 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-500">{account.accountNumber}</span>
                          <span className="text-sm whitespace-nowrap">{account.accountName}</span>
                        </div>
                      </td>
                      {renderGlAccountCells(account)}
                    </tr>
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
            </div>

            <div className="border-t border-slate-200 bg-slate-50/90 px-6 py-4 sm:px-7">
              <p className={cn("text-xs", dashboardCardBodyMutedClass)}>
                Note: Les données affichées sont à titre informatif. Consulter les états financiers audités pour les
                montants officiels.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
