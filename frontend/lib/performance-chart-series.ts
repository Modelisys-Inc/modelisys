import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { getRowAmounts } from "@/lib/series-utils"
import type {
  ChartValueFormat,
  PerformanceChartConfigV2,
  PerformanceChartSeriesV2,
  PerformanceMetricSpec,
} from "@/lib/performance-chart-config"
import {
  buildAmountsByCalendarMonth,
  calendarQuarterSequenceFromReference,
  calendarYearSequenceFromReference,
  monthShortLabelsFromReference,
  monthTrendFromReference,
  quarterLabelsFromReference,
  quarterTrendFromReference,
  sumCalendarQuarter,
  sumCalendarYear,
  yearLabelsFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"

/** Repère une ligne par id technique, par code de liaison Sommaire (`linkCode`) ou par id de compte détail. */
export function findSeriesRowByCode(rows: SeriesRow[], code: string): SeriesRow | undefined {
  const t = code.trim()
  if (!t) return undefined
  const lower = t.toLowerCase()
  for (const r of rows) {
    if (r.id.trim().toLowerCase() === lower) return r
    const lc = r.linkCode?.trim()
    if (lc && lc.toLowerCase() === lower) return r
    const dr = r.detailRows?.find((d) => d.id.trim().toLowerCase() === lower)
    if (dr) {
      return {
        id: dr.id,
        label: dr.label,
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: dr.amounts,
        detailRows: [],
      }
    }
  }
  return undefined
}

function addSeries(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length)
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) + (b[i] ?? 0))
  return out
}

function subSeries(a: number[], b: number[]): number[] {
  const n = Math.max(a.length, b.length)
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push((a[i] ?? 0) - (b[i] ?? 0))
  return out
}

function sumCodesSeries(rows: SeriesRow[], periods: SeriesPeriod[], codes: string[]): number[] | null {
  if (!codes.length) return periods.map(() => 0)
  let acc: number[] | null = null
  for (const c of codes) {
    const row = findSeriesRowByCode(rows, c)
    if (!row) return null
    const v = getRowAmounts(row, periods)
    acc = acc === null ? v : addSeries(acc, v)
  }
  return acc
}

const REF_EPS = 1e-9

export function buildSyntheticSeriesRow(periods: SeriesPeriod[], values: number[]): SeriesRow {
  const amounts: Record<string, number> = {}
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i]!
    amounts[`${p.fiscalYear}-${p.fiscalMonth}`] = values[i] ?? 0
  }
  return {
    id: "__performance_chart_synthetic__",
    label: "",
    isBold: false,
    isSection: false,
    isResult: false,
    amounts,
    detailRows: [],
  }
}

/**
 * Rapport (ou complément) sur trimestres / années **civils** : on agrège d’abord Σ numérateur et Σ
 * dénominateur sur chaque période, puis on calcule `num/den` ou `1 − num/den`.
 * Ne pas sommer les rapports mensuels (sinon ex. 1 − 32/20 sur l’année devient une somme de petits 1 − n/d).
 */
function ratioTrendAggregatedByCalendarView(
  spec: Extract<PerformanceMetricSpec, { type: "ratio" }>,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: "quarters" | "years",
  refMonth: number,
  refYear: number,
  count: number
): number[] | null {
  const n = sumCodesSeries(rows, periods, spec.numeratorCodes)
  const d = sumCodesSeries(rows, periods, spec.denominatorCodes)
  if (!n || !d) return null
  const mapN = buildAmountsByCalendarMonth(buildSyntheticSeriesRow(periods, n), periods)
  const mapD = buildAmountsByCalendarMonth(buildSyntheticSeriesRow(periods, d), periods)
  const comp = spec.complement === true

  const valueForTotals = (numTotal: number, denTotal: number): number => {
    if (Math.abs(denTotal) < REF_EPS) return 0
    const raw = numTotal / denTotal
    return comp ? 1 - raw : raw
  }

  if (view === "quarters") {
    const seq = calendarQuarterSequenceFromReference(refMonth, refYear, count)
    if (seq.length !== count) return null
    return seq.map(({ quarter, year }) =>
      valueForTotals(sumCalendarQuarter(mapN, quarter, year), sumCalendarQuarter(mapD, quarter, year))
    )
  }

  const years = calendarYearSequenceFromReference(refYear, count)
  if (years.length !== count) return null
  return years.map((y) => valueForTotals(sumCalendarYear(mapN, y), sumCalendarYear(mapD, y)))
}

/** Aplatit les montants sur la fenêtre (mois / trimestres / années). */
export function trendFromMetricSpec(
  spec: PerformanceMetricSpec,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: "quarters" | "years" | "months",
  refMonth: number,
  refYear: number,
  count: number
): number[] | null {
  if (spec.type === "derivedMargin") return null

  if (spec.type === "ratio" && view !== "months") {
    return ratioTrendAggregatedByCalendarView(
      spec,
      rows,
      periods,
      view,
      refMonth,
      refYear,
      count
    )
  }

  const vals = computeMetricSeries(spec, rows, periods)
  if (!vals || vals.length !== periods.length) return null
  const synthetic = buildSyntheticSeriesRow(periods, vals)
  if (view === "quarters") {
    return quarterTrendFromReference(synthetic, periods, refMonth, refYear, count)
  }
  if (view === "years") {
    return yearTrendFromReference(synthetic, periods, refYear, count)
  }
  return monthTrendFromReference(synthetic, periods, refMonth, refYear, count)
}

export function computeMetricSeries(
  spec: PerformanceMetricSpec,
  rows: SeriesRow[],
  periods: SeriesPeriod[]
): number[] | null {
  if (spec.type === "derivedMargin") return null

  if (spec.type === "single") {
    const row = findSeriesRowByCode(rows, spec.code)
    if (!row) return null
    return getRowAmounts(row, periods)
  }

  if (spec.type === "sum") {
    return sumCodesSeries(rows, periods, spec.codes)
  }

  if (spec.type === "difference") {
    const n = sumCodesSeries(rows, periods, spec.numeratorCodes)
    const d = sumCodesSeries(rows, periods, spec.denominatorCodes)
    if (!n || !d) return null
    return subSeries(n, d)
  }

  if (spec.type === "ratio") {
    const n = sumCodesSeries(rows, periods, spec.numeratorCodes)
    const d = sumCodesSeries(rows, periods, spec.denominatorCodes)
    if (!n || !d) return null
    const out: number[] = []
    const comp = spec.complement === true
    const EPS = 1e-9
    for (let i = 0; i < Math.max(n.length, d.length); i++) {
      const den = d[i] ?? 0
      const num = n[i] ?? 0
      // Sans dénominateur (référence) utilisable : pas de ratio valable — évite surtout le complément 1−0=100 %.
      if (Math.abs(den) < EPS) {
        out.push(0)
        continue
      }
      const raw = num / den
      out.push(comp ? 1 - raw : raw)
    }
    return out
  }

  return null
}

/**
 * Marge brute % = (GP / revenus) × 100. Sans base de revenus significative, on affiche 0
 * (évite un % trompeur quand il n’y a pas de donnée de référence pour la période).
 */
export function computeDerivedGrossMarginPercent(revenue: number[], grossProfit: number[]): number[] {
  const n = Math.max(revenue.length, grossProfit.length)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const r = revenue[i] ?? 0
    const gp = grossProfit[i] ?? 0
    if (Math.abs(r) < REF_EPS) {
      out.push(0)
      continue
    }
    out.push((gp / r) * 100)
  }
  return out
}

function applyRatioScaleIfNeeded(
  trend: number[] | null,
  spec: PerformanceMetricSpec,
  valueFormat: ChartValueFormat
): number[] | null {
  if (!trend) return null
  if (spec.type === "ratio" && valueFormat === "ratio") {
    return trend.map((x) => x * 100)
  }
  return trend
}

function resolveSeriesTrend(
  s: PerformanceChartSeriesV2,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: "quarters" | "years" | "months",
  refMonth: number,
  refYear: number,
  count: number
): number[] | null {
  const spec = s.spec
  if (spec.type === "derivedMargin") return null
  const t = trendFromMetricSpec(spec, rows, periods, view, refMonth, refYear, count)
  return applyRatioScaleIfNeeded(t, spec, s.valueFormat)
}

export function sanitizeSeriesDataKey(id: string): string {
  return `v_${id.replace(/[^a-zA-Z0-9]/g, "_")}`
}

/** Période en libellé + valeurs numériques par clé `v_*` (pas d’index `number` seul pour éviter le conflit TS avec `period: string`). */
export type DynamicChartPoint = {
  period: string
  [key: string]: string | number
}

export type BuiltSeriesMeta = {
  id: string
  dataKey: string
  kind: "bar" | "line"
  label: string
  color: string
  yAxis: "left" | "right"
  valueFormat: ChartValueFormat
  showOnChart: boolean
  showInSidePanel: boolean
}

/** Aligné sur l’horizon « Trimestriel - 2 ans » (8 trimestres civils). */
export const PERFORMANCE_CHART_QUARTER_COUNT = 8
/** Aligné sur l’horizon « Annuel - 5 ans » (année de référence + 4 années précédentes). */
export const PERFORMANCE_CHART_YEAR_COUNT = 5

/**
 * Nombre de mois à charger pour l’API : chaque trimestre doit pouvoir sommer 3 mois civils complets,
 * sinon marge brute = ΣBP/Σ revenus sur un trimestre partielment faux.
 */
export function performanceChartSeriesMonthsNeeded(view: string): number {
  if (view === "years") return PERFORMANCE_CHART_YEAR_COUNT * 12 + 12
  if (view === "quarters") return PERFORMANCE_CHART_QUARTER_COUNT * 3 + 6
  return 12
}

/**
 * Données du graphique Performance (v2) : points dynamiques + métadonnées par série.
 */
export function buildPerformanceChartData(
  config: PerformanceChartConfigV2,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number
): { points: DynamicChartPoint[]; series: BuiltSeriesMeta[] } | null {
  if (!config.series.length) return null
  const v = view === "quarters" ? "quarters" : view === "years" ? "years" : "months"

  let labels: string[]
  let count: number
  if (view === "quarters") {
    count = PERFORMANCE_CHART_QUARTER_COUNT
    labels = quarterLabelsFromReference(refMonth, refYear, count)
  } else if (view === "years") {
    count = PERFORMANCE_CHART_YEAR_COUNT
    labels = yearLabelsFromReference(refYear, count)
  } else {
    labels = monthShortLabelsFromReference(refMonth, refYear, 12)
    count = 12
  }

  const trends = new Map<string, number[]>()
  const pass1 = config.series.filter((s) => s.spec.type !== "derivedMargin")
  const pass2 = config.series.filter((s) => s.spec.type === "derivedMargin")

  for (const s of pass1) {
    const t = resolveSeriesTrend(s, rows, periods, v, refMonth, refYear, count)
    if (!t || t.length !== labels.length) return null
    trends.set(s.id, t)
  }

  for (const s of pass2) {
    const spec = s.spec
    if (spec.type !== "derivedMargin") continue
    const rev = trends.get(spec.revenueSeriesId)
    if (!rev) return null
    const gpT = trendFromMetricSpec(spec.grossProfitFromSpec, rows, periods, v, refMonth, refYear, count)
    if (!gpT || gpT.length !== labels.length) return null
    const margin = computeDerivedGrossMarginPercent(rev, gpT)
    if (margin.length !== labels.length) return null
    trends.set(s.id, margin)
  }

  const seriesMeta: BuiltSeriesMeta[] = config.series.map((s) => ({
    id: s.id,
    dataKey: sanitizeSeriesDataKey(s.id),
    kind: s.kind,
    label: s.label,
    color: s.color ?? "#3b82f6",
    yAxis: s.yAxis,
    valueFormat: s.valueFormat,
    showOnChart: s.showOnChart,
    showInSidePanel: s.showInSidePanel,
  }))

  const points: DynamicChartPoint[] = labels.map((label, i) => {
    const row: DynamicChartPoint = { period: label }
    for (const s of config.series) {
      const arr = trends.get(s.id)
      if (!arr) continue
      row[sanitizeSeriesDataKey(s.id)] = arr[i] ?? 0
    }
    return row
  })

  return { points, series: seriesMeta }
}

/** @deprecated Ancienne forme fixe — conservée pour compat narrative / vues legacy */
export type PerformanceChartDataPoint = {
  period: string
  revenue: number
  cogs: number
  grossProfit: number
  ebita: number
  grossMarginPercent: number
}
