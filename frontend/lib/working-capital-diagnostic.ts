import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
} from "@/lib/performance-chart-series"
import {
  monthShortLabelsFromReference,
  yearLabelsFromReference,
} from "@/lib/series-reference-columns"
import { findRow, getRowAmounts } from "@/lib/series-utils"
import {
  resolveWorkingCapitalStructureAmount,
  seriesAmountForLinkCode,
  WORKING_CAPITAL_IS_TTM_LOOKBACK_MONTHS,
  workingCapitalRowRefCode,
} from "@/lib/working-capital-structure-utils"
import {
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
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
  dio: "DIO",
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

const METRIC_LABEL_ALIASES: Record<WorkingCapitalMetricKey, string[]> = {
  fdr: ["fdr", "fonds de roulement"],
  fdrhc: ["fdrhc", "fonds de roulement hors caisse"],
  dso: ["dso"],
  dio: ["dio", "rotation des stocks", "rotation stocks"],
  dpo: ["dpo"],
  ccc: ["ccc", "cycle de conversion de tresorerie"],
}

/** Libellés courts (DSO, DPO, …) souvent suivis d’un tiret dans la structure WC. */
const METRIC_PREFIX_MATCH: ReadonlySet<WorkingCapitalMetricKey> = new Set(["dso", "dio", "dpo", "ccc"])

function matchesMetricLabel(key: string, metric: WorkingCapitalMetricKey): boolean {
  const normalizedFull = normalizeMetricLabel(WORKING_CAPITAL_METRIC_LABELS[metric])
  if (key === normalizedFull) return true

  for (const alias of METRIC_LABEL_ALIASES[metric]) {
    if (key === alias) return true
    if (!METRIC_PREFIX_MATCH.has(metric)) continue
    if (
      key.startsWith(`${alias} —`) ||
      key.startsWith(`${alias} -`) ||
      key.startsWith(`${alias} `)
    ) {
      return true
    }
  }
  return false
}

function metricKeyFromLabel(label: string): WorkingCapitalMetricKey | null {
  const key = normalizeMetricLabel(label)
  if (!key) return null
  for (const metric of WORKING_CAPITAL_METRIC_KEYS) {
    if (matchesMetricLabel(key, metric)) return metric
  }
  return null
}

export function findStructureRowForMetric(
  structure: Record<string, unknown>[],
  metric: WorkingCapitalMetricKey,
): Record<string, unknown> | null {
  for (const row of structure) {
    if (isStructureRowHidden(row) || isStructureRowEmptyLabel(row)) continue
    if (!isCodeMappingEnabled(row)) continue
    const labelKey = normalizeMetricLabel(String(row.label ?? ""))
    if (matchesMetricLabel(labelKey, metric)) return row
    const ref = workingCapitalRowRefCode(row)
    if (ref && matchesMetricLabel(normalizeMetricLabel(ref), metric)) return row
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
  const count =
    view === "years"
      ? PERFORMANCE_CHART_YEAR_COUNT
      : view === "12months"
        ? 12
        : PERFORMANCE_CHART_MONTH_COUNT_24
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
  const act = seriesAmountForLinkCode("ACT", bsRows, bsPeriods, periodIndex)
  const pct = seriesAmountForLinkCode("PCT", bsRows, bsPeriods, periodIndex)
  let assets = act
  let liabilities = pct

  if (assets === 0 && liabilities === 0) {
    const assetsRow = findRow(bsRows, "total actifs courants")
    const liabilitiesRow = findRow(bsRows, "total passifs courants")
    assets = assetsRow ? getRowAmounts(assetsRow, bsPeriods)[periodIndex] ?? 0 : 0
    liabilities = liabilitiesRow ? getRowAmounts(liabilitiesRow, bsPeriods)[periodIndex] ?? 0 : 0
  }

  let cash = seriesAmountForLinkCode("ENC", bsRows, bsPeriods, periodIndex)
  if (cash === 0) {
    const cashRow =
      findRow(bsRows, "encaisse") || findRow(bsRows, "trésorerie") || findRow(bsRows, "cash")
    cash = cashRow ? getRowAmounts(cashRow, bsPeriods)[periodIndex] ?? 0 : 0
  }

  return exCash ? assets - cash - liabilities : assets - liabilities
}

function resolveCccFromComponents(
  structure: Record<string, unknown>[],
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
): number | null {
  const dso = resolveMetricAtPeriod("dso", structure, bsRows, isRows, bsPeriods, isPeriods, periodIndex)
  const dio = resolveMetricAtPeriod("dio", structure, bsRows, isRows, bsPeriods, isPeriods, periodIndex)
  const dpo = resolveMetricAtPeriod("dpo", structure, bsRows, isRows, bsPeriods, isPeriods, periodIndex)
  if (dso === null && dio === null && dpo === null) return null
  return (dso ?? 0) + (dio ?? 0) - (dpo ?? 0)
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
    const mode = normalizeLiaisonMode(row)
    if (mode !== "na") {
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
  }

  if (metric === "fdr") return heuristicFdr(bsRows, bsPeriods, periodIndex, false)
  if (metric === "fdrhc") return heuristicFdr(bsRows, bsPeriods, periodIndex, true)
  if (metric === "ccc") {
    return resolveCccFromComponents(
      structure,
      bsRows,
      isRows,
      bsPeriods,
      isPeriods,
      periodIndex,
    )
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
  /** Attendre le chargement de la structure WC avant de calculer (évite un faux vide). */
  structureReady?: boolean
}): WorkingCapitalDiagnosticResult | null {
  const { bsRows, bsPeriods, isRows, isPeriods, structure, view, refMonth, refYear, structureReady = true } =
    params
  if (!structureReady) return null
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
