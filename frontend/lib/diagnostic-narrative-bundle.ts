import type { Division } from "@/components/entity-selector"
import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  buildDivisionProfitabilityRows,
  buildDivisionProfitabilitySlices,
  type DivisionProfitabilityRow,
  type DivisionSeriesBundle,
} from "@/lib/division-profitability"
import { buildDivisionProfitabilityNarrative } from "@/lib/division-profitability-narrative"
import {
  buildExpenseContributionBridge,
  type ExpenseContributionBridgeResult,
} from "@/lib/expense-contribution-bridge"
import { buildExpenseBridgeNarrativeContext } from "@/lib/expense-bridge-narrative-context"
import { buildExpensesBridgeNarrative } from "@/lib/expense-bridge-narrative"
import { buildIncomePerformanceChartFromBridge } from "@/lib/income-performance-chart"
import {
  buildContributiveMarginByRevenueNarrative,
  buildIncomePerformanceNarrative,
  buildRevenueOnlyPerformanceNarrative,
  mapDynamicChartToNarrativePoints,
  mapDynamicChartToRevenueSeriesNarratives,
  type PerformanceNarrativeResult,
  type RevenueSeriesNarrativeSlice,
} from "@/lib/income-performance-narrative"
import { buildPerformanceChartData } from "@/lib/performance-chart-series"
import { enrichRevenueSeriesForNarrative } from "@/lib/revenue-series-narrative-enrichment"
import type { ChartSlot } from "@/lib/statement-chart-config"

export type DiagnosticNarrativeBundle = {
  performance: PerformanceNarrativeResult | null
  revenue: PerformanceNarrativeResult | null
  marginByRevenue: PerformanceNarrativeResult | null
  expenses: PerformanceNarrativeResult | null
  divisions: PerformanceNarrativeResult | null
  expenseBridge: ExpenseContributionBridgeResult | null
  divisionRows: DivisionProfitabilityRow[]
  revenueSlices: RevenueSeriesNarrativeSlice[]
  marginSlices: RevenueSeriesNarrativeSlice[] | null
}

const EMPTY_BUNDLE: DiagnosticNarrativeBundle = {
  performance: null,
  revenue: null,
  marginByRevenue: null,
  expenses: null,
  divisions: null,
  expenseBridge: null,
  divisionRows: [],
  revenueSlices: [],
  marginSlices: null,
}

export function buildDiagnosticNarrativeBundle(input: {
  view: string
  refMonth: number
  refYear: number
  accountMappings: AccountMappingData[]
  standardLinkCodes: StandardLinkCode[]
  seriesRows: SeriesRow[]
  seriesPeriods: SeriesPeriod[]
  revenueSlot: ChartSlot | null
  divisions: Division[]
  divisionSeriesBundles: DivisionSeriesBundle[]
}): DiagnosticNarrativeBundle {
  const {
    view,
    refMonth,
    refYear,
    accountMappings,
    standardLinkCodes,
    seriesRows,
    seriesPeriods,
    revenueSlot,
    divisions,
    divisionSeriesBundles,
  } = input

  if (!seriesRows.length || !seriesPeriods.length) {
    return EMPTY_BUNDLE
  }

  const expenseBridge = buildExpenseContributionBridge({
    mappings: accountMappings,
    seriesRows,
    periods: seriesPeriods,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  })

  let performance: PerformanceNarrativeResult | null = null
  if (expenseBridge) {
    const perfChart = buildIncomePerformanceChartFromBridge(expenseBridge)
    if (perfChart) {
      const points = mapDynamicChartToNarrativePoints(perfChart.points, perfChart.series)
      if (points) {
        performance = buildIncomePerformanceNarrative(points, view)
      }
    }
  }

  let revenueSlices: RevenueSeriesNarrativeSlice[] = []
  let revenue: PerformanceNarrativeResult | null = null
  let marginSlices: RevenueSeriesNarrativeSlice[] | null = null
  let marginByRevenue: PerformanceNarrativeResult | null = null

  if (revenueSlot) {
    const dynamicBuild = buildPerformanceChartData(
      revenueSlot.config,
      seriesRows,
      seriesPeriods,
      view,
      refMonth,
      refYear,
    )
    if (dynamicBuild) {
      revenueSlices = mapDynamicChartToRevenueSeriesNarratives(
        dynamicBuild.points,
        dynamicBuild.series,
      )
      if (revenueSlices.length) {
        revenue = buildRevenueOnlyPerformanceNarrative(revenueSlices, view)
      }

      marginSlices = enrichRevenueSeriesForNarrative({
        slices: revenueSlices,
        seriesMeta: dynamicBuild.series,
        chartSeries: revenueSlot.config.series,
        mappings: accountMappings,
        seriesRows,
        periods: seriesPeriods,
        view,
        refMonth,
        refYear,
        standardLinkCodes,
      })
      if (marginSlices?.length) {
        marginByRevenue = buildContributiveMarginByRevenueNarrative(marginSlices, view)
      }
    }
  }

  let expenses: PerformanceNarrativeResult | null = null
  if (expenseBridge) {
    const context = buildExpenseBridgeNarrativeContext({
      mappings: accountMappings,
      seriesRows,
      periods: seriesPeriods,
      view,
      refMonth,
      refYear,
      bridge: expenseBridge,
      standardLinkCodes,
    })
    expenses = buildExpensesBridgeNarrative(expenseBridge, view, context)
  }

  const divisionSlices = buildDivisionProfitabilitySlices({
    divisions,
    divisionSeries: divisionSeriesBundles,
    mappings: accountMappings,
    view,
    refMonth,
    refYear,
    standardLinkCodes,
  })
  const divisionRows = divisionSlices.length ? buildDivisionProfitabilityRows(divisionSlices) : []
  const divisionsNarrative = divisionSlices.length
    ? buildDivisionProfitabilityNarrative(divisionSlices, view)
    : null

  return {
    performance,
    revenue,
    marginByRevenue,
    expenses,
    divisions: divisionsNarrative,
    expenseBridge,
    divisionRows,
    revenueSlices,
    marginSlices,
  }
}
