import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
} from "@/lib/performance-chart-series"
import {
  monthShortLabelsFromReference,
  yearLabelsFromReference,
} from "@/lib/series-reference-columns"
import {
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
} from "@/lib/income-statement-structure-utils"
import { findRow, getRowAmounts } from "@/lib/series-utils"
import {
  resolveWorkingCapitalStructureAmount,
  WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS,
  workingCapitalRowRefCode,
} from "@/lib/working-capital-structure-utils"
import {
  WORKING_CAPITAL_METRIC_KEYS,
  WORKING_CAPITAL_SERIES_ID_TO_METRIC,
  type WorkingCapitalMetricKey,
} from "@/lib/working-capital-diagnostic-config"

const DATA_EPSILON = 1e-6

export type { WorkingCapitalMetricKey }
export { WORKING_CAPITAL_METRIC_KEYS }

export const WORKING_CAPITAL_METRIC_LABELS: Record<WorkingCapitalMetricKey, string> = {
  fdr: "Fonds de roulement",
  fdrhc: "Fonds de roulement hors caisse",
  dso: "DSO — Délai de recouvrement clients",
  dio: "Rotation des stocks",
  dpo: "DPO — Délai de paiement fournisseurs",
  ccc: "CCC — Cycle de conversion de trésorerie",
}

export type WorkingCapitalDiagnosticPoint = {
  period: string
  fdr: number
  fdrhc: number
  dso: number
  dio: number
  dpo: number
  ccc: number
}

export type WorkingCapitalDiagnosticResult = {
  points: WorkingCapitalDiagnosticPoint[]
  configuredMetricCount: number
}

function normalizeMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function metricKeyFromLabel(label: string): WorkingCapitalMetricKey | null {
  const key = normalizeMetricLabel(label)
  if (key === "fdr" || key === "fonds de roulement") return "fdr"
  if (key === "fdrhc" || key === "fonds de roulement hors caisse") return "fdrhc"
  if (key === "dso") return "dso"
  if (key === "dio" || key === "rotation des stocks" || key === "rotation stocks") return "dio"
  if (key === "dpo") return "dpo"
  if (key === "ccc" || key === "cycle de conversion de tresorerie") return "ccc"
  return null
}

function findStructureRowForMetric(
  structure: Record<string, unknown>[],
  metric: WorkingCapitalMetricKey,
): Record<string, unknown> | null {
  for (const row of structure) {
    if (isStructureRowHidden(row) || isStructureRowEmptyLabel(row)) continue
    if (!isCodeMappingEnabled(row)) continue
    const fromLabel = metricKeyFromLabel(String(row.label ?? ""))
    if (fromLabel === metric) return row
    const ref = workingCapitalRowRefCode(row)
    if (ref && metricKeyFromLabel(ref) === metric) return row
  }
  return null
}

function priorCalMonth(m: number, y: number): { month: number; year: number } {
  if (m > 1) return { month: m - 1, year: y }
  return { month: 12, year: y - 1 }
}

function calendarYearSequenceFromReference(refYear: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => refYear - i)
}

function findBsPeriodIndex(
  periods: SeriesPeriod[],
  month: number,
  year: number,
): number {
  const exact = periods.findIndex((p) => p.fiscalYear === year && p.fiscalMonth === month)
  if (exact >= 0) return exact
  let best = -1
  for (let i = 0; i < periods.length; i++) {
    if (periods[i]!.fiscalYear === year) best = i
  }
  if (best >= 0) return best
  return Math.max(0, periods.length - 1)
}

function periodAnchorsForView(
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): { label: string; periodIndex: number }[] {
  if (!periods.length) return []
  const count = view === "years" ? PERFORMANCE_CHART_YEAR_COUNT : PERFORMANCE_CHART_MONTH_COUNT_24
  if (view === "years") {
    const years = calendarYearSequenceFromReference(refYear, count)
    const labels = yearLabelsFromReference(refYear, count)
    return years.map((year, i) => ({
      label: labels[i] ?? String(year),
      periodIndex: findBsPeriodIndex(periods, refMonth, year),
    }))
  }
  const labels = monthShortLabelsFromReference(refMonth, refYear, count)
  let m = refMonth
  let y = refYear
  return labels.map((label) => {
    const anchor = { label, periodIndex: findBsPeriodIndex(periods, m, y) }
    const prior = priorCalMonth(m, y)
    m = prior.month
    y = prior.year
    return anchor
  })
}

export function workingCapitalPeriodAnchors(
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): { label: string; periodIndex: number }[] {
  return periodAnchorsForView(periods, view, refMonth, refYear)
}

function heuristicFdr(
  bsRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  periodIndex: number,
  exCash: boolean,
): number {
  const assetsRow = findRow(bsRows, "total actifs courants")
  const liabilitiesRow = findRow(bsRows, "total passifs courants")
  const cashRow =
    findRow(bsRows, "encaisse") || findRow(bsRows, "trésorerie") || findRow(bsRows, "cash")
  const assets = assetsRow ? getRowAmounts(assetsRow, bsPeriods)[periodIndex] ?? 0 : 0
  const liabilities = liabilitiesRow ? getRowAmounts(liabilitiesRow, bsPeriods)[periodIndex] ?? 0 : 0
  const cash = cashRow ? getRowAmounts(cashRow, bsPeriods)[periodIndex] ?? 0 : 0
  return exCash ? assets - cash - liabilities : assets - liabilities
}

function resolveMetricAtPeriod(
  metric: WorkingCapitalMetricKey,
  structure: Record<string, unknown>[],
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
): number | null {
  const row = findStructureRowForMetric(structure, metric)
  if (row) {
    const amount = resolveWorkingCapitalStructureAmount(
      row,
      bsRows,
      isRows,
      bsPeriods,
      isPeriods,
      periodIndex,
      structure,
    )
    if (amount !== null) return amount
  }

  if (metric === "fdr") return heuristicFdr(bsRows, bsPeriods, periodIndex, false)
  if (metric === "fdrhc") return heuristicFdr(bsRows, bsPeriods, periodIndex, true)
  if (metric === "ccc") {
    const dso = resolveMetricAtPeriod("dso", structure, bsRows, isRows, bsPeriods, isPeriods, periodIndex)
    const dio = resolveMetricAtPeriod("dio", structure, bsRows, isRows, bsPeriods, isPeriods, periodIndex)
    const dpo = resolveMetricAtPeriod("dpo", structure, bsRows, isRows, bsPeriods, isPeriods, periodIndex)
    if (dso === null && dio === null && dpo === null) return null
    return (dso ?? 0) + (dio ?? 0) - (dpo ?? 0)
  }

  return null
}

function countConfiguredMetrics(structure: Record<string, unknown>[]): number {
  let count = 0
  for (const metric of WORKING_CAPITAL_METRIC_KEYS) {
    if (findStructureRowForMetric(structure, metric)) count += 1
  }
  return count
}

export function workingCapitalIsMonthsNeeded(displayMonths: number): number {
  return displayMonths + WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS
}

export function metricHeading(metric: WorkingCapitalMetricKey): string {
  return WORKING_CAPITAL_METRIC_LABELS[metric]
}

export function parseMetricFromHeading(heading: string): WorkingCapitalMetricKey | null {
  for (const metric of WORKING_CAPITAL_METRIC_KEYS) {
    if (heading === WORKING_CAPITAL_METRIC_LABELS[metric]) return metric
  }
  return null
}

export function buildWorkingCapitalDiagnosticResult(params: {
  bsRows: SeriesRow[]
  bsPeriods: SeriesPeriod[]
  isRows: SeriesRow[]
  isPeriods: SeriesPeriod[]
  structure: Record<string, unknown>[]
  view: string
  refMonth: number
  refYear: number
}): WorkingCapitalDiagnosticResult | null {
  const { bsRows, bsPeriods, isRows, isPeriods, structure, view, refMonth, refYear } = params
  if (!bsPeriods.length) return null

  const anchors = periodAnchorsForView(bsPeriods, view, refMonth, refYear)
  if (!anchors.length) return null

  const points: WorkingCapitalDiagnosticPoint[] = anchors.map(({ label, periodIndex }) => {
    const values = Object.fromEntries(
      WORKING_CAPITAL_METRIC_KEYS.map((metric) => [
        metric,
        resolveMetricAtPeriod(
          metric,
          structure,
          bsRows,
          isRows,
          bsPeriods,
          isPeriods,
          periodIndex,
        ) ?? 0,
      ]),
    ) as Record<WorkingCapitalMetricKey, number>

    return {
      period: label,
      ...values,
    }
  })

  const hasData = points.some((point) =>
    WORKING_CAPITAL_METRIC_KEYS.some((metric) => Math.abs(point[metric]) > DATA_EPSILON),
  )
  if (!hasData) {
    return { points: [], configuredMetricCount: countConfiguredMetrics(structure) }
  }

  return {
    points,
    configuredMetricCount: countConfiguredMetrics(structure),
  }
}

export function metricTrendFromResult(
  result: WorkingCapitalDiagnosticResult,
  metric: WorkingCapitalMetricKey,
): number[] {
  return result.points.map((point) => point[metric])
}

export function seriesIdForMetric(metric: WorkingCapitalMetricKey): string | undefined {
  return Object.entries(WORKING_CAPITAL_SERIES_ID_TO_METRIC).find(([, m]) => m === metric)?.[0]
}
