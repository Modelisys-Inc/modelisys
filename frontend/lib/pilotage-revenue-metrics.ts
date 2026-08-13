import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import { buildMonthlyBridgeSeries, resolveRevenueLeafCodes } from "@/lib/expense-contribution-bridge"
import { parseChartMonthPeriod } from "@/lib/income-performance-narrative"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import {
  buildSyntheticSeriesRow,
  computeMetricSeries,
} from "@/lib/performance-chart-series"
import {
  monthShortLabelsFromReference,
  monthTrendFromReference,
} from "@/lib/series-reference-columns"

const DATA_EPSILON = 1e-6

export type MonthlyRevenuePoint = {
  period: string
  month: number
  year: number
  amount: number
}

export type MonthlyPerformancePoint = {
  period: string
  month: number
  year: number
  revenue: number
  contributiveMargin: number
  contributiveMarginPercent: number | null
  operatingProfit: number
}

export type PilotageValueSnapshot = {
  month: number
  year: number
  value: number
}

export type PilotageRevenueMetrics = {
  reference: MonthlyRevenuePoint
  priorMonth: MonthlyRevenuePoint | null
  sameMonthPriorYear: MonthlyRevenuePoint | null
  ytd: { current: number; priorYear: number; fiscalYearLabel: number } | null
  ttm: { current: number; prior: number } | null
}

export type PilotageScalarMetrics = {
  reference: PilotageValueSnapshot
  priorMonth: PilotageValueSnapshot | null
  sameMonthPriorYear: PilotageValueSnapshot | null
  ytd: { current: number; priorYear: number; fiscalYearLabel: number } | null
  ttm: { current: number; prior: number } | null
}

export type PilotagePerformanceMetricsBundle = {
  revenue: PilotageScalarMetrics
  contributiveMargin: PilotageScalarMetrics
  ebita: PilotageScalarMetrics
}

function calendarMonthKey(month: number, year: number): string {
  return `${year}-${month}`
}

export function fiscalYearStartForReference(
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): { month: number; year: number } {
  if (fiscalYearEndMonth === 12) {
    return { month: 1, year: refYear }
  }
  const startMonth = fiscalYearEndMonth + 1
  if (refMonth > fiscalYearEndMonth) {
    return { month: startMonth, year: refYear }
  }
  return { month: startMonth, year: refYear - 1 }
}

/** Libellé d'exercice (année de clôture) pour la date de référence. */
export function fiscalYearLabelForReference(
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): number {
  if (fiscalYearEndMonth === 12) return refYear
  return refMonth > fiscalYearEndMonth ? refYear + 1 : refYear
}

export function enumerateMonthsForward(
  start: { month: number; year: number },
  end: { month: number; year: number },
): Array<{ month: number; year: number }> {
  const out: Array<{ month: number; year: number }> = []
  let m = start.month
  let y = start.year
  for (let i = 0; i < 24; i++) {
    out.push({ month: m, year: y })
    if (m === end.month && y === end.year) break
    if (m === 12) {
      m = 1
      y += 1
    } else {
      m += 1
    }
  }
  return out
}

export function extractMonthlyRevenueSeries(params: {
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
  monthCount?: number
}): MonthlyRevenuePoint[] {
  const { seriesRows, periods, refMonth, refYear, standardLinkCodes, monthCount = 36 } = params
  if (!seriesRows.length || !periods.length) return []

  const leafCodes = resolveRevenueLeafCodes(standardLinkCodes, seriesRows)
  if (!leafCodes.length) return []

  const spec =
    leafCodes.length === 1
      ? ({ type: "single", code: leafCodes[0]! } as const)
      : ({ type: "sum", codes: leafCodes } as const)

  const monthly = computeMetricSeries(spec, seriesRows, periods)
  if (!monthly) return []

  const synthetic = buildSyntheticSeriesRow(periods, monthly)
  const amounts = monthTrendFromReference(synthetic, periods, refMonth, refYear, monthCount)
  const labels = monthShortLabelsFromReference(refMonth, refYear, monthCount)

  return amounts.map((amount, index) => {
    const period = labels[index] ?? ""
    const parsed = parseChartMonthPeriod(period)
    return {
      period,
      month: parsed?.month ?? refMonth,
      year: parsed?.year ?? refYear,
      amount,
    }
  })
}

export function extractMonthlyPerformanceSeries(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
  monthCount?: number
}): MonthlyPerformancePoint[] {
  const bridge = buildMonthlyBridgeSeries(params)
  if (!bridge?.length) return []

  const { refMonth, refYear } = params
  return bridge.map((point) => {
    const parsed = parseChartMonthPeriod(point.period)
    const revenue = point.revenue
    const contributiveMarginPercent =
      Math.abs(revenue) > DATA_EPSILON ? (point.contributiveMargin / revenue) * 100 : null
    return {
      period: point.period,
      month: parsed?.month ?? refMonth,
      year: parsed?.year ?? refYear,
      revenue,
      contributiveMargin: point.contributiveMargin,
      contributiveMarginPercent,
      operatingProfit: point.operatingProfit,
    }
  })
}

function weightedMarginPercent(
  months: Array<{ month: number; year: number }>,
  amountByKey: Map<string, MonthlyPerformancePoint>,
): number | null {
  let sumRevenue = 0
  let sumMargin = 0
  for (const m of months) {
    const point = amountByKey.get(calendarMonthKey(m.month, m.year))
    if (!point) continue
    sumRevenue += point.revenue
    sumMargin += point.contributiveMargin
  }
  if (Math.abs(sumRevenue) < DATA_EPSILON) return null
  return (sumMargin / sumRevenue) * 100
}

export type MonthlyExpenseBridgePoint = {
  period: string
  month: number
  year: number
  revenue: number
  variableCosts: number
  fixedCosts: number
}

export function extractMonthlyExpenseBridgeSeries(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
  monthCount?: number
}): MonthlyExpenseBridgePoint[] {
  const bridge = buildMonthlyBridgeSeries(params)
  if (!bridge?.length) return []

  const { refMonth, refYear } = params
  return bridge.map((point) => {
    const parsed = parseChartMonthPeriod(point.period)
    return {
      period: point.period,
      month: parsed?.month ?? refMonth,
      year: parsed?.year ?? refYear,
      revenue: point.revenue,
      variableCosts: point.variableCosts,
      fixedCosts: point.fixedCosts,
    }
  })
}

export function computePilotageExpenseScalarMetrics(
  series: MonthlyExpenseBridgePoint[],
  fiscalYearEnd: string,
  pickValue: (point: MonthlyExpenseBridgePoint) => number,
): PilotageScalarMetrics | null {
  const asPerformance: MonthlyPerformancePoint[] = series.map((point) => ({
    period: point.period,
    month: point.month,
    year: point.year,
    revenue: pickValue(point),
    contributiveMargin: 0,
    contributiveMarginPercent: null,
    operatingProfit: 0,
  }))
  return computeScalarMetricsFromSeries(asPerformance, fiscalYearEnd, (point) => point.revenue)
}

function computeScalarMetricsFromSeries(
  series: MonthlyPerformancePoint[],
  fiscalYearEnd: string,
  valueAt: (point: MonthlyPerformancePoint) => number | null,
  aggregateAt?: (months: Array<{ month: number; year: number }>) => number | null,
): PilotageScalarMetrics | null {
  if (!series.length) return null

  const fiscalYearEndMonth = parseFiscalYearEndMonth(fiscalYearEnd)
  const referencePoint = series[0]!
  const referenceValue = valueAt(referencePoint)
  if (referenceValue === null) return null

  const priorPoint = series[1] ?? null
  const priorValue = priorPoint ? valueAt(priorPoint) : null
  const yoyPoint = series[12] ?? null
  const yoyValue = yoyPoint ? valueAt(yoyPoint) : null

  const fyStart = fiscalYearStartForReference(referencePoint.month, referencePoint.year, fiscalYearEndMonth)
  const ytdMonths = enumerateMonthsForward(fyStart, {
    month: referencePoint.month,
    year: referencePoint.year,
  })

  const amountByKey = new Map(series.map((p) => [calendarMonthKey(p.month, p.year), p]))
  const sumForMonths = (months: Array<{ month: number; year: number }>) =>
    months.reduce((sum, m) => {
      const point = amountByKey.get(calendarMonthKey(m.month, m.year))
      if (!point) return sum
      const value = valueAt(point)
      return value === null ? sum : sum + value
    }, 0)

  const ytdCurrent = aggregateAt
    ? aggregateAt(ytdMonths)
    : sumForMonths(ytdMonths)
  const ytdPrior = aggregateAt
    ? aggregateAt(ytdMonths.map((m) => ({ month: m.month, year: m.year - 1 })))
    : sumForMonths(ytdMonths.map((m) => ({ month: m.month, year: m.year - 1 })))
  const fiscalYearLabel = fiscalYearLabelForReference(
    referencePoint.month,
    referencePoint.year,
    fiscalYearEndMonth,
  )

  const ttmCurrent = aggregateAt
    ? aggregateAt(series.slice(0, 12).map((p) => ({ month: p.month, year: p.year })))
    : series.slice(0, 12).reduce((sum, p) => sum + (valueAt(p) ?? 0), 0)
  const ttmPrior = aggregateAt
    ? aggregateAt(series.slice(12, 24).map((p) => ({ month: p.month, year: p.year })))
    : series.slice(12, 24).reduce((sum, p) => sum + (valueAt(p) ?? 0), 0)

  return {
    reference: { month: referencePoint.month, year: referencePoint.year, value: referenceValue },
    priorMonth:
      priorPoint && priorValue !== null
        ? { month: priorPoint.month, year: priorPoint.year, value: priorValue }
        : null,
    sameMonthPriorYear:
      yoyPoint && yoyValue !== null
        ? { month: yoyPoint.month, year: yoyPoint.year, value: yoyValue }
        : null,
    ytd:
      ytdMonths.length > 0 && ytdCurrent !== null
        ? {
            current: ytdCurrent,
            priorYear: ytdPrior ?? 0,
            fiscalYearLabel,
          }
        : null,
    ttm: series.length >= 24 && ttmCurrent !== null ? { current: ttmCurrent, prior: ttmPrior ?? 0 } : null,
  }
}

export function computePilotageRevenueMetrics(
  series: MonthlyRevenuePoint[],
  fiscalYearEnd: string,
): PilotageRevenueMetrics | null {
  if (!series.length) return null

  const fiscalYearEndMonth = parseFiscalYearEndMonth(fiscalYearEnd)
  const reference = series[0]!
  const priorMonth = series[1] ?? null
  const sameMonthPriorYear = series[12] ?? null

  const fyStart = fiscalYearStartForReference(reference.month, reference.year, fiscalYearEndMonth)
  const ytdMonths = enumerateMonthsForward(fyStart, {
    month: reference.month,
    year: reference.year,
  })
  const amountByKey = new Map(series.map((p) => [calendarMonthKey(p.month, p.year), p.amount]))

  const sumForMonths = (months: Array<{ month: number; year: number }>) =>
    months.reduce((sum, m) => sum + (amountByKey.get(calendarMonthKey(m.month, m.year)) ?? 0), 0)

  const ytdCurrent = sumForMonths(ytdMonths)
  const ytdPrior = sumForMonths(ytdMonths.map((m) => ({ month: m.month, year: m.year - 1 })))
  const fiscalYearLabel = fiscalYearLabelForReference(
    reference.month,
    reference.year,
    fiscalYearEndMonth,
  )

  const ttmCurrent = series.slice(0, 12).reduce((sum, p) => sum + p.amount, 0)
  const ttmPrior = series.slice(12, 24).reduce((sum, p) => sum + p.amount, 0)

  return {
    reference,
    priorMonth,
    sameMonthPriorYear,
    ytd:
      ytdMonths.length > 0
        ? { current: ytdCurrent, priorYear: ytdPrior, fiscalYearLabel }
        : null,
    ttm: series.length >= 24 ? { current: ttmCurrent, prior: ttmPrior } : null,
  }
}

export function revenueMetricsToScalar(metrics: PilotageRevenueMetrics): PilotageScalarMetrics {
  return {
    reference: {
      month: metrics.reference.month,
      year: metrics.reference.year,
      value: metrics.reference.amount,
    },
    priorMonth: metrics.priorMonth
      ? {
          month: metrics.priorMonth.month,
          year: metrics.priorMonth.year,
          value: metrics.priorMonth.amount,
        }
      : null,
    sameMonthPriorYear: metrics.sameMonthPriorYear
      ? {
          month: metrics.sameMonthPriorYear.month,
          year: metrics.sameMonthPriorYear.year,
          value: metrics.sameMonthPriorYear.amount,
        }
      : null,
    ytd: metrics.ytd,
    ttm: metrics.ttm,
  }
}

export function monthlyPointsFromRevenueSlice(slice: {
  points: Array<{ period: string; revenue: number }>
}): MonthlyRevenuePoint[] {
  return slice.points.map((point) => {
    const parsed = parseChartMonthPeriod(point.period)
    return {
      period: point.period,
      month: parsed?.month ?? 1,
      year: parsed?.year ?? 2000,
      amount: point.revenue,
    }
  })
}

export function computePilotageScalarMetricsFromRevenueSlice(
  slice: { points: Array<{ period: string; revenue: number }> },
  fiscalYearEnd: string,
): PilotageScalarMetrics | null {
  const revenueMetrics = computePilotageRevenueMetrics(
    monthlyPointsFromRevenueSlice(slice),
    fiscalYearEnd,
  )
  return revenueMetrics ? revenueMetricsToScalar(revenueMetrics) : null
}

export type MonthlyMarginPoint = {
  period: string
  month: number
  year: number
  revenue: number
  variableCost: number | undefined
}

export function monthlyMarginPointsFromRevenueSlice(slice: {
  points: Array<{ period: string; revenue: number; variableCost?: number }>
}): MonthlyMarginPoint[] {
  return slice.points.map((point) => {
    const parsed = parseChartMonthPeriod(point.period)
    return {
      period: point.period,
      month: parsed?.month ?? 1,
      year: parsed?.year ?? 2000,
      revenue: point.revenue,
      variableCost: point.variableCost,
    }
  })
}

function marginPercentAt(point: MonthlyMarginPoint): number | null {
  if (point.variableCost === undefined || Math.abs(point.revenue) < DATA_EPSILON) return null
  return ((point.revenue - point.variableCost) / point.revenue) * 100
}

export function computePilotageMarginMetricsFromRevenueSlice(
  slice: { points: Array<{ period: string; revenue: number; variableCost?: number }> },
  fiscalYearEnd: string,
): PilotageScalarMetrics | null {
  const marginPoints = monthlyMarginPointsFromRevenueSlice(slice)
  if (!marginPoints.length) return null

  const asPerformancePoints: MonthlyPerformancePoint[] = marginPoints.map((point) => ({
    period: point.period,
    month: point.month,
    year: point.year,
    revenue: point.revenue,
    contributiveMargin:
      point.variableCost !== undefined ? point.revenue - point.variableCost : 0,
    contributiveMarginPercent: marginPercentAt(point),
    operatingProfit: 0,
  }))

  const amountByKey = new Map(asPerformancePoints.map((p) => [calendarMonthKey(p.month, p.year), p]))
  const weightedAggregate = (months: Array<{ month: number; year: number }>) =>
    weightedMarginPercent(months, amountByKey)

  return computeScalarMetricsFromSeries(
    asPerformancePoints,
    fiscalYearEnd,
    (p) => p.contributiveMarginPercent,
    weightedAggregate,
  )
}

export function computePilotagePerformanceMetrics(
  series: MonthlyPerformancePoint[],
  fiscalYearEnd: string,
): PilotagePerformanceMetricsBundle | null {
  if (!series.length) return null

  const amountByKey = new Map(series.map((p) => [calendarMonthKey(p.month, p.year), p]))
  const weightedAggregate = (months: Array<{ month: number; year: number }>) =>
    weightedMarginPercent(months, amountByKey)

  const revenue = computeScalarMetricsFromSeries(series, fiscalYearEnd, (p) => p.revenue)
  const contributiveMargin = computeScalarMetricsFromSeries(
    series,
    fiscalYearEnd,
    (p) => p.contributiveMarginPercent,
    weightedAggregate,
  )
  const ebita = computeScalarMetricsFromSeries(series, fiscalYearEnd, (p) => p.operatingProfit)

  if (!revenue || !contributiveMargin || !ebita) return null
  return { revenue, contributiveMargin, ebita }
}
