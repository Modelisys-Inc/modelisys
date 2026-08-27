"use client"

import { useEffect, useMemo, useState } from "react"
import { getStatementStructure } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { useProjectedCmvYearTotals } from "@/hooks/use-projected-cmv-year-totals"
import { useProjectedNetIncomeYearTotals } from "@/hooks/use-projected-net-income-year-totals"
import { useProFormaCashFlowProjected } from "@/hooks/use-pro-forma-cash-flow-projected"
import { structureUsesCashFlowTinCostMode } from "@/lib/cash-flow-detail-settings"
import {
  buildProFormaCashFlowYearRows,
} from "@/lib/pro-forma-ending-cash"
import {
  forecastActualColumnCount,
  forecastActualExtraColumnCount,
  forecastDisplayToConfigYearIndex,
  forecastYearLabelsForLayout,
  incomeStatementFiscalYearTotalsByYear,
  lastCompletedFiscalYearEnd,
  resolveForecastActualLayout,
  type ForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import {
  buildProFormaImpactMetrics,
  buildProjectedImpactYearOptions,
  extractCashFlowImpactTrends,
  firstProjectedDisplayIndex,
  pickDisplayYearAmount,
  pickImpactConfigAmount,
  previousImpactDisplayIndex,
  type ProFormaImpactMetric,
  type ProFormaImpactProjectedYearOption,
  type ProFormaImpactRawAmounts,
} from "@/lib/pro-forma-financial-impact"
import { findRow } from "@/lib/series-utils"
import { findNetIncomeSeriesRow } from "@/lib/projected-net-income-year-totals"
import { normLabel } from "@/lib/income-statement-structure-utils"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"

function nMinusOneFiscalYearAmount(
  row: SeriesRow | undefined,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): number | null {
  if (!row || !periods.length) return null
  const n1 = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
  const v = incomeStatementFiscalYearTotalsByYear(row, periods, [n1], fiscalYearEndMonth)[n1.year]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

/** CMV parent (libellés singulier/pluriel, avec/sans accents). */
function findCmvSeriesRow(rows: SeriesRow[]): SeriesRow | undefined {
  return (
    findRow(rows, "CMV") ||
    findRow(rows, "cout des produits vendus") ||
    findRow(rows, "coût des produits vendus") ||
    findRow(rows, "couts des produits vendus") ||
    findRow(rows, "coûts des produits vendus") ||
    rows.find((r) => {
      const id = String(r.id ?? "").toUpperCase()
      if (id === "CMV") return true
      const n = normLabel(String(r.label ?? ""))
      return n.includes("cout des produits vendus") || n.includes("couts des produits vendus")
    })
  )
}

function findGrossProfitSeriesRow(rows: SeriesRow[]): SeriesRow | undefined {
  return (
    findRow(rows, "bénéfice brut") ||
    findRow(rows, "benefice brut") ||
    rows.find((r) => {
      const n = normLabel(String(r.label ?? ""))
      return n === "benefice brut" || n === "benefices bruts"
    })
  )
}

/**
 * Agrège P&L + CF pro forma pour le panneau d’impact Hypothèses.
 * Remonter `key={refreshKey}` sur le panneau pour recharger après upsert config.
 */
export function useProFormaFinancialImpact(opts: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  forecastBaseYear: number
  refMonth: number
  fiscalYearEndMonth?: number
  enabled?: boolean
  forecastActualLayout?: ForecastActualLayout
  /** Colonne affichée (index dans yearLabels). Défaut = 1re année projetée. */
  selectedDisplayIndex?: number
}): {
  metrics: ProFormaImpactMetric[]
  yearLabel: string
  projectedYearOptions: ProFormaImpactProjectedYearOption[]
  yoyComparisonLabel: string | null
  loading: boolean
} {
  const {
    companyId,
    projectionId,
    projectionYears,
    forecastBaseYear,
    refMonth,
    fiscalYearEndMonth = 12,
    enabled = true,
    forecastActualLayout = "nMinusOne-and-ytd",
    selectedDisplayIndex: selectedDisplayIndexProp,
  } = opts

  const layoutEffective = resolveForecastActualLayout(
    forecastActualLayout,
    refMonth,
    fiscalYearEndMonth,
  )
  const forecastActualCols = forecastActualColumnCount(layoutEffective)
  const defaultDisplayIdx = firstProjectedDisplayIndex(forecastActualCols)

  const yearLabels = forecastYearLabelsForLayout(
    layoutEffective,
    forecastBaseYear,
    projectionYears,
    refMonth,
    forecastBaseYear,
    fiscalYearEndMonth,
  )

  const projectedYearOptions = useMemo(
    () =>
      buildProjectedImpactYearOptions(
        yearLabels,
        forecastActualCols,
        forecastDisplayToConfigYearIndex,
      ),
    [yearLabels, forecastActualCols],
  )

  const displayIdx = useMemo(() => {
    if (
      selectedDisplayIndexProp != null &&
      projectedYearOptions.some((o) => o.displayIndex === selectedDisplayIndexProp)
    ) {
      return selectedDisplayIndexProp
    }
    return projectedYearOptions[0]?.displayIndex ?? defaultDisplayIdx
  }, [selectedDisplayIndexProp, projectedYearOptions, defaultDisplayIdx])

  const yearLabel = yearLabels[displayIdx] ?? String(forecastBaseYear)

  const { totals: revenueTotals, loading: revenueLoading } = useProjectedRevenueYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: forecastBaseYear,
    enabled,
    forecastActualLayout: layoutEffective,
    refMonth,
    fiscalYearEndMonth,
  })

  const {
    rows: incomeStatementSeriesRows,
    periods: incomeStatementPeriods,
  } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: forecastBaseYear,
    month: refMonth,
    months: 72,
    enabled: enabled && !!companyId,
  })

  /** Même ancre N-1 que Hypothèses Bilan / CF pro forma (pas le YTD ni totals[0]). */
  const lastActualRevenue = useMemo(() => {
    const revRow =
      findRow(incomeStatementSeriesRows, "REV") || findRow(incomeStatementSeriesRows, "revenus")
    if (!revRow || !incomeStatementPeriods.length) return 0
    const n1 = lastCompletedFiscalYearEnd(refMonth, forecastBaseYear, fiscalYearEndMonth)
    return (
      incomeStatementFiscalYearTotalsByYear(
        revRow,
        incomeStatementPeriods,
        [n1],
        fiscalYearEndMonth,
      )[n1.year] ?? 0
    )
  }, [
    fiscalYearEndMonth,
    forecastBaseYear,
    incomeStatementPeriods,
    incomeStatementSeriesRows,
    refMonth,
  ])

  /** N-1 = dernier exercice fiscal complet (jamais le YTD partiel). */
  const nMinusOneCmv = useMemo(
    () =>
      nMinusOneFiscalYearAmount(
        findCmvSeriesRow(incomeStatementSeriesRows),
        incomeStatementPeriods,
        refMonth,
        forecastBaseYear,
        fiscalYearEndMonth,
      ),
    [
      fiscalYearEndMonth,
      forecastBaseYear,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      refMonth,
    ],
  )

  const nMinusOneGrossProfit = useMemo(
    () =>
      nMinusOneFiscalYearAmount(
        findGrossProfitSeriesRow(incomeStatementSeriesRows),
        incomeStatementPeriods,
        refMonth,
        forecastBaseYear,
        fiscalYearEndMonth,
      ),
    [
      fiscalYearEndMonth,
      forecastBaseYear,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      refMonth,
    ],
  )

  const nMinusOneNetIncome = useMemo(
    () =>
      nMinusOneFiscalYearAmount(
        findNetIncomeSeriesRow(incomeStatementSeriesRows) ?? undefined,
        incomeStatementPeriods,
        refMonth,
        forecastBaseYear,
        fiscalYearEndMonth,
      ),
    [
      fiscalYearEndMonth,
      forecastBaseYear,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      refMonth,
    ],
  )

  const nMinusOneBaiia = useMemo(
    () =>
      nMinusOneFiscalYearAmount(
        findRow(incomeStatementSeriesRows, "BAIIA") ||
          incomeStatementSeriesRows.find((r) => r.isEBITA === true),
        incomeStatementPeriods,
        refMonth,
        forecastBaseYear,
        fiscalYearEndMonth,
      ),
    [
      fiscalYearEndMonth,
      forecastBaseYear,
      incomeStatementPeriods,
      incomeStatementSeriesRows,
      refMonth,
    ],
  )

  const nMinusOneExpenseHypothesis = useMemo(() => {
    if (lastActualRevenue == null || nMinusOneBaiia == null) return null
    return lastActualRevenue - nMinusOneBaiia
  }, [lastActualRevenue, nMinusOneBaiia])

  const { totals: cmvTotals, loading: cmvLoading } = useProjectedCmvYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: forecastBaseYear,
    enabled,
    forecastActualLayout: layoutEffective,
    refMonth,
    fiscalYearEndMonth,
    lastActualCmv: nMinusOneCmv ?? 0,
    lastActualRevenue,
  })

  const {
    totals: netIncomeTotals,
    expenseHypothesisTotals,
    loading: niLoading,
  } = useProjectedNetIncomeYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: forecastBaseYear,
    enabled,
    forecastActualLayout: layoutEffective,
    refMonth,
    fiscalYearEndMonth,
    lastActualRevenue,
  })

  const projected = useProFormaCashFlowProjected({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: forecastBaseYear,
    refMonth,
    fiscalYearEndMonth,
    forecastActualLayout: layoutEffective,
    enabled,
    lastActualRevenue,
  })

  const [cfStructure, setCfStructure] = useState<Record<string, unknown>[] | null>(null)

  useEffect(() => {
    if (!enabled || !companyId) {
      setCfStructure(null)
      return
    }
    let cancelled = false
    getStatementStructure(companyId, "cash-flow-detail")
      .then((res) => {
        if (cancelled) return
        const raw = Array.isArray(res?.structure) ? res.structure : []
        setCfStructure(raw as Record<string, unknown>[])
      })
      .catch(() => {
        if (!cancelled) setCfStructure([])
      })
    return () => {
      cancelled = true
    }
  }, [companyId, enabled])

  const needsTinCost = useMemo(
    () => (cfStructure ? structureUsesCashFlowTinCostMode(cfStructure) : false),
    [cfStructure],
  )

  const {
    rows: cfSeriesRows,
    periods: cfPeriods,
    loading: cfSeriesLoading,
  } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow-detail",
    fiscalYear: forecastBaseYear,
    month: refMonth,
    months: 72,
    enabled: enabled && !!companyId,
  })

  const {
    rows: cfCostSeriesRows,
  } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow-detail",
    fiscalYear: forecastBaseYear,
    month: refMonth,
    months: 72,
    altAssetCostOnly: true,
    enabled: enabled && !!companyId && needsTinCost,
  })

  const {
    rows: bsSeriesRows,
    loading: bsLoading,
  } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: forecastBaseYear,
    month: refMonth,
    months: 72,
    enabled: enabled && !!companyId,
  })

  const cashTrends = useMemo(() => {
    if (!enabled || !cfStructure?.length || !cfSeriesRows.length || !cfPeriods.length) {
      return {
        operating: null as number[] | null,
        investing: null as number[] | null,
        financing: null as number[] | null,
        ending: [] as number[],
      }
    }
    const built = buildProFormaCashFlowYearRows({
      structure: cfStructure,
      cfSeriesRows,
      cfPeriods,
      costSeriesRows: needsTinCost ? cfCostSeriesRows : undefined,
      bsSeriesRows,
      trendLabels: yearLabels,
      forecastActualLayout: layoutEffective,
      forecastActualCols,
      projectionYears,
      refMonth,
      refYear: forecastBaseYear,
      fiscalYearEndMonth,
      forecastBaseYear,
      projected,
    })
    return extractCashFlowImpactTrends({
      displayRows: built.displayRows,
      rowTrends: built.rows.map((r) => r.trendValues),
      endingCashTrend: built.endingCashTrend,
    })
  }, [
    enabled,
    cfStructure,
    cfSeriesRows,
    cfPeriods,
    cfCostSeriesRows,
    needsTinCost,
    bsSeriesRows,
    yearLabels,
    layoutEffective,
    forecastActualCols,
    projectionYears,
    refMonth,
    forecastBaseYear,
    fiscalYearEndMonth,
    projected,
  ])

  const buildRawAmountsAtDisplayIndex = useMemo(() => {
    return (index: number): ProFormaImpactRawAmounts => {
      const isNMinusOneCol =
        index === 0 && forecastActualExtraColumnCount(forecastActualCols) > 0
      return {
        revenue: pickImpactConfigAmount(
          revenueTotals,
          index,
          forecastActualCols,
          forecastDisplayToConfigYearIndex,
          lastActualRevenue,
        ),
        cmv: pickImpactConfigAmount(
          cmvTotals,
          index,
          forecastActualCols,
          forecastDisplayToConfigYearIndex,
          nMinusOneCmv,
        ),
        netIncome: pickImpactConfigAmount(
          netIncomeTotals,
          index,
          forecastActualCols,
          forecastDisplayToConfigYearIndex,
          nMinusOneNetIncome,
        ),
        expenseHypothesisTotal: pickImpactConfigAmount(
          expenseHypothesisTotals,
          index,
          forecastActualCols,
          forecastDisplayToConfigYearIndex,
          nMinusOneExpenseHypothesis,
        ),
        // Priorité à la ligne série « Bénéfice brut » pour N-1 (évite CMV introuvable).
        grossProfit: isNMinusOneCol ? nMinusOneGrossProfit : undefined,
        cashOperating: pickDisplayYearAmount(cashTrends.operating, index),
        cashInvesting: pickDisplayYearAmount(cashTrends.investing, index),
        cashFinancing: pickDisplayYearAmount(cashTrends.financing, index),
        endingCash: pickDisplayYearAmount(cashTrends.ending, index),
      }
    }
  }, [
    revenueTotals,
    cmvTotals,
    netIncomeTotals,
    expenseHypothesisTotals,
    cashTrends,
    forecastActualCols,
    lastActualRevenue,
    nMinusOneCmv,
    nMinusOneNetIncome,
    nMinusOneExpenseHypothesis,
    nMinusOneGrossProfit,
  ])

  const prevDisplayIdx = previousImpactDisplayIndex(displayIdx, forecastActualCols)
  const yoyComparisonLabel =
    prevDisplayIdx != null ? yearLabels[prevDisplayIdx] ?? null : null

  const metrics = useMemo(
    () =>
      buildProFormaImpactMetrics(
        buildRawAmountsAtDisplayIndex(displayIdx),
        prevDisplayIdx != null ? buildRawAmountsAtDisplayIndex(prevDisplayIdx) : null,
      ),
    [buildRawAmountsAtDisplayIndex, displayIdx, prevDisplayIdx],
  )

  return {
    metrics,
    yearLabel,
    projectedYearOptions,
    yoyComparisonLabel,
    loading:
      revenueLoading ||
      cmvLoading ||
      niLoading ||
      cfSeriesLoading ||
      bsLoading,
  }
}
