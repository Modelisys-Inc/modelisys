import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"
import {
  type BuiltSeriesMeta,
  type DynamicChartPoint,
  isCurrencyAmountSeriesMeta,
  sanitizeSeriesDataKey,
} from "@/lib/performance-chart-series"
import {
  CONTRIBUTIVE_MARGIN_SERIES_LABEL,
  DEFAULT_COLORS,
  type StatementType,
} from "@/lib/statement-chart-config"

const DATA_EPSILON = 1e-6

export const INCOME_PERFORMANCE_SERIES_IDS = {
  revenue: "income-perf-revenue",
  operatingProfit: "income-perf-operating-profit",
  contributiveMargin: "income-perf-contributive-margin",
} as const

/** Graphique Performance financière : séries imposées (REV, BE, contribution marginale %). */
export function isFixedIncomePerformanceChart(
  statementType: StatementType,
  configStatementType: StatementType,
  narrativeScope: string,
): boolean {
  return (
    configStatementType === "income-statement" &&
    statementType === "income-statement" &&
    narrativeScope === "full"
  )
}

/**
 * Construit le graphique Performance à partir du pont Dépenses :
 * Revenus (REV) · Contribution marginale % · BAIIA (= bénéfice d'exploitation).
 */
export function buildIncomePerformanceChartFromBridge(
  bridge: ExpenseContributionBridgeResult,
): { points: DynamicChartPoint[]; series: BuiltSeriesMeta[] } | null {
  const { points } = bridge
  if (!points.length) return null

  const revKey = sanitizeSeriesDataKey(INCOME_PERFORMANCE_SERIES_IDS.revenue)
  const opKey = sanitizeSeriesDataKey(INCOME_PERFORMANCE_SERIES_IDS.operatingProfit)
  const cmKey = sanitizeSeriesDataKey(INCOME_PERFORMANCE_SERIES_IDS.contributiveMargin)

  const chartPoints: DynamicChartPoint[] = points.map((p) => {
    const contributiveMarginPct =
      Math.abs(p.revenue) > DATA_EPSILON
        ? ((p.revenue - p.variableCosts) / p.revenue) * 100
        : 0
    return {
      period: p.period,
      [revKey]: p.revenue,
      [opKey]: p.operatingProfit,
      [cmKey]: contributiveMarginPct,
    }
  })

  const series: BuiltSeriesMeta[] = [
    {
      id: INCOME_PERFORMANCE_SERIES_IDS.revenue,
      dataKey: revKey,
      kind: "bar",
      label: "Revenus",
      color: DEFAULT_COLORS[0]!,
      yAxis: "left",
      valueFormat: "currency",
      showOnChart: true,
      showInSidePanel: true,
    },
    {
      id: INCOME_PERFORMANCE_SERIES_IDS.contributiveMargin,
      dataKey: cmKey,
      kind: "line",
      label: CONTRIBUTIVE_MARGIN_SERIES_LABEL,
      color: DEFAULT_COLORS[2]!,
      yAxis: "right",
      valueFormat: "ratio",
      showOnChart: true,
      showInSidePanel: true,
    },
    {
      id: INCOME_PERFORMANCE_SERIES_IDS.operatingProfit,
      dataKey: opKey,
      kind: "bar",
      label: "BAIIA",
      color: DEFAULT_COLORS[1]!,
      yAxis: "left",
      valueFormat: "currency",
      showOnChart: true,
      showInSidePanel: true,
    },
  ]

  return { points: chartPoints, series }
}

/** Résout les clés de données pour la narration Performance (indépendant de l'ordre d'affichage). */
export function resolveIncomePerformanceSeriesKeys(
  seriesMeta: BuiltSeriesMeta[],
): { kRev: string; kEbita: string; kMargin: string } | null {
  const marginLine = seriesMeta.find((s) => s.valueFormat === "ratio")
  const currencySeries = seriesMeta.filter(isCurrencyAmountSeriesMeta)
  if (currencySeries.length < 2 || !marginLine) return null

  const revenueSeries =
    seriesMeta.find((s) => s.id === INCOME_PERFORMANCE_SERIES_IDS.revenue) ??
    currencySeries.find((s) => /revenu/i.test(s.label)) ??
    currencySeries[0]!

  const ebitaSeries =
    seriesMeta.find((s) => s.id === INCOME_PERFORMANCE_SERIES_IDS.operatingProfit) ??
    currencySeries.find((s) => s !== revenueSeries && /baiia|ebita|ebitda/i.test(s.label)) ??
    currencySeries.find((s) => s !== revenueSeries)

  if (!ebitaSeries) return null

  return {
    kRev: revenueSeries.dataKey,
    kEbita: ebitaSeries.dataKey,
    kMargin: marginLine.dataKey,
  }
}
export function defaultFixedIncomePerformanceVisibility(): Record<string, boolean> {
  return Object.fromEntries(
    Object.values(INCOME_PERFORMANCE_SERIES_IDS).map((id) => [id, true]),
  )
}
