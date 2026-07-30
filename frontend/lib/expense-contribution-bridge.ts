import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  buildSyntheticSeriesRow,
  computeMetricSeries,
  findSeriesRowByCode,
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
} from "@/lib/performance-chart-series"
import { getRowAmounts } from "@/lib/series-utils"
import {
  monthShortLabelsFromReference,
  monthTrendFromReference,
  yearLabelsFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"
import { filterRevenueLeafLinkCodes } from "@/lib/standard-link-code-utils"

const DATA_EPSILON = 1e-6
const MONTHLY_BRIDGE_COUNT = 12

export type ExpenseContributionBridgePoint = {
  period: string
  revenue: number
  variableCosts: number
  contributiveMargin: number
  fixedCosts: number
  operatingProfit: number
}

export type ExpenseContributionBridgeResult = {
  points: ExpenseContributionBridgePoint[]
  mappingStatus: {
    variableCostAccountCount: number
    fixedCostAccountCount: number
    revenueConfigured: boolean
  }
}

export function collectAllVariableCostAccountNumbers(mappings: AccountMappingData[]): string[] {
  return [
    ...new Set(mappings.filter((m) => m.variable_costs).map((m) => m.account_number)),
  ].sort()
}

export function collectAllFixedCostAccountNumbers(mappings: AccountMappingData[]): string[] {
  return [...new Set(mappings.filter((m) => m.fixed_costs).map((m) => m.account_number))].sort()
}

function sumAccountAmounts(
  mappingsByAccount: Map<string, AccountMappingData>,
  accountNumbers: string[],
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  absolute = true,
): number[] {
  const totals = periods.map(() => 0)
  const linkCodeAttributed = new Set<string>()

  for (const accountNumber of accountNumbers) {
    const mapping = mappingsByAccount.get(accountNumber)
    let row = findSeriesRowByCode(rows, accountNumber)
    if (!row && mapping?.link_code) {
      const linkCode = mapping.link_code.trim()
      if (!linkCodeAttributed.has(linkCode)) {
        row = findSeriesRowByCode(rows, linkCode)
        if (row) linkCodeAttributed.add(linkCode)
      }
    }
    if (!row) continue
    const amounts = getRowAmounts(row, periods)
    for (let i = 0; i < periods.length; i++) {
      const raw = amounts[i] ?? 0
      totals[i]! += absolute ? Math.abs(raw) : raw
    }
  }
  return totals
}

function trendFromMonthlyAmounts(
  monthly: number[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!periods.length) return null
  const synthetic = buildSyntheticSeriesRow(periods, monthly)
  if (view === "years") {
    return yearTrendFromReference(synthetic, periods, refYear, PERFORMANCE_CHART_YEAR_COUNT)
  }
  if (view === "24months") {
    return monthTrendFromReference(
      synthetic,
      periods,
      refMonth,
      refYear,
      PERFORMANCE_CHART_MONTH_COUNT_24,
    )
  }
  return null
}

function chartPeriodLabelsForView(view: string, refMonth: number, refYear: number): string[] {
  if (view === "years") return yearLabelsFromReference(refYear, PERFORMANCE_CHART_YEAR_COUNT)
  if (view === "24months") {
    return monthShortLabelsFromReference(refMonth, refYear, PERFORMANCE_CHART_MONTH_COUNT_24)
  }
  return []
}

function bridgeWindowSize(pointCount: number, view: string): number {
  if (view === "years") return pointCount
  return Math.min(MONTHLY_BRIDGE_COUNT, pointCount)
}

export function resolveRevenueLeafCodes(
  standardLinkCodes: StandardLinkCode[] | undefined,
  rows: SeriesRow[],
): string[] {
  if (standardLinkCodes?.length) {
    const leaves = filterRevenueLeafLinkCodes(standardLinkCodes).map((c) => c.code)
    if (leaves.length) return leaves
  }
  const revRow = findSeriesRowByCode(rows, "REV")
  if (revRow?.linkCode) return [revRow.linkCode]
  return []
}

function computeRevenueTrend(
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
  standardLinkCodes?: StandardLinkCode[],
): number[] | null {
  const leafCodes = resolveRevenueLeafCodes(standardLinkCodes, rows)
  if (!leafCodes.length) return null

  const spec =
    leafCodes.length === 1
      ? ({ type: "single", code: leafCodes[0]! } as const)
      : ({ type: "sum", codes: leafCodes } as const)

  const monthly = computeMetricSeries(spec, rows, periods)
  if (!monthly) return null
  return trendFromMonthlyAmounts(monthly, periods, view, refMonth, refYear)
}

function costTrendForAccounts(
  mappings: AccountMappingData[],
  accountNumbers: string[],
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!accountNumbers.length) return null
  const mappingsByAccount = new Map(mappings.map((m) => [m.account_number, m]))
  const monthly = sumAccountAmounts(mappingsByAccount, accountNumbers, rows, periods, true)
  return trendFromMonthlyAmounts(monthly, periods, view, refMonth, refYear)
}

export function buildExpenseContributionBridge(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): ExpenseContributionBridgeResult | null {
  const { mappings, seriesRows, periods, view, refMonth, refYear, standardLinkCodes } = params
  if (!seriesRows.length || !periods.length) return null

  const labels = chartPeriodLabelsForView(view, refMonth, refYear)
  if (!labels.length) return null

  const revenueSeriesTrend = computeRevenueTrend(seriesRows, periods, view, refMonth, refYear, standardLinkCodes)
  if (!revenueSeriesTrend || revenueSeriesTrend.length !== labels.length) return null

  const variableAccounts = collectAllVariableCostAccountNumbers(mappings)
  const fixedAccounts = collectAllFixedCostAccountNumbers(mappings)

  const variableTrend =
    variableAccounts.length > 0
      ? costTrendForAccounts(mappings, variableAccounts, seriesRows, periods, view, refMonth, refYear)
      : labels.map(() => 0)
  const fixedTrend =
    fixedAccounts.length > 0
      ? costTrendForAccounts(mappings, fixedAccounts, seriesRows, periods, view, refMonth, refYear)
      : labels.map(() => 0)

  if (!variableTrend || !fixedTrend) return null
  if (variableTrend.length !== labels.length || fixedTrend.length !== labels.length) return null

  const windowSize = bridgeWindowSize(labels.length, view)
  const points: ExpenseContributionBridgePoint[] = []

  for (let i = 0; i < windowSize; i++) {
    const revenue = revenueSeriesTrend[i] ?? 0
    const variableCosts = variableTrend[i] ?? 0
    const fixedCosts = fixedTrend[i] ?? 0
    const contributiveMargin = revenue - variableCosts
    const operatingProfit = contributiveMargin - fixedCosts
    points.push({
      period: labels[i]!,
      revenue,
      variableCosts,
      contributiveMargin,
      fixedCosts,
      operatingProfit,
    })
  }

  const hasRevenue = points.some((p) => Math.abs(p.revenue) > DATA_EPSILON)
  if (!hasRevenue) return null

  return {
    points,
    mappingStatus: {
      variableCostAccountCount: variableAccounts.length,
      fixedCostAccountCount: fixedAccounts.length,
      revenueConfigured: resolveRevenueLeafCodes(standardLinkCodes, seriesRows).length > 0,
    },
  }
}
