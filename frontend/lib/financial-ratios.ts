import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { findRow } from "@/lib/series-utils"
import { pickCapexDisplayIndices } from "@/lib/capex-analysis-settings"
import { capexYearLabelsChronological } from "@/lib/capex-year-reference"
import { reverseSeriesOrderForDisplay } from "@/lib/series-utils"
import {
  averageDisplayedHorizonValues,
  emptyHorizonColumnMask,
  pickHorizonColumns,
} from "@/lib/horizon-column-visibility"

export type RatioDisplayView = "current" | "12months" | "24months" | "years"

export interface RatioDataPoint {
  period: string
  currentRatio: number | null
  quickRatio: number | null
  grossMargin: number | null
  netMargin: number | null
  ebitdaMargin: number | null
  debtToEquity: number | null
  interestCoverage: number | null
}

export type RatioMetricKey = Exclude<keyof RatioDataPoint, "period">

export interface RatioRowDef {
  key: RatioMetricKey
  label: string
  format: "ratio" | "percentage"
  sectionLabel?: string
}

export const RATIO_ROWS: RatioRowDef[] = [
  { key: "currentRatio", label: "Ratio de liquidité générale", format: "ratio", sectionLabel: "Liquidité" },
  { key: "quickRatio", label: "Ratio de liquidité immédiate", format: "ratio" },
  { key: "grossMargin", label: "Marge brute", format: "percentage", sectionLabel: "Rentabilité" },
  { key: "netMargin", label: "Marge nette", format: "percentage" },
  { key: "ebitdaMargin", label: "Marge BAIIA", format: "percentage" },
  { key: "debtToEquity", label: "Dette / Capitaux propres", format: "ratio", sectionLabel: "Levier financier" },
  { key: "interestCoverage", label: "Couverture des intérêts", format: "ratio" },
]

export const RATIO_METRIC_KEYS: RatioMetricKey[] = RATIO_ROWS.map((row) => row.key)

function findRowMulti(rows: SeriesRow[], ...labels: string[]): SeriesRow | undefined {
  for (const label of labels) {
    const found = findRow(rows, label)
    if (found) return found
  }
  return undefined
}

function emptyRatioPoint(period: string): RatioDataPoint {
  return {
    period,
    currentRatio: null,
    quickRatio: null,
    grossMargin: null,
    netMargin: null,
    ebitdaMargin: null,
    debtToEquity: null,
    interestCoverage: null,
  }
}

/** Compute financial ratios from IS and BS series data for each period. */
export function computeRatios(
  isRows: SeriesRow[],
  bsRows: SeriesRow[],
  periods: SeriesPeriod[],
): RatioDataPoint[] {
  const revenueRow = findRowMulti(isRows, "revenus", "revenue", "ventes", "chiffre d'affaires")
  const grossProfitRow = findRowMulti(isRows, "bénéfice brut", "gross profit", "marge brute")
  const netIncomeRow = findRowMulti(isRows, "bénéfice net", "résultat net", "net income")
  const ebitdaRow = findRowMulti(isRows, "baiia", "ebitda", "bénéfice avant")
  const interestRow = findRowMulti(isRows, "charges financières", "frais financiers", "intérêts", "interest")

  const currentAssetsRow = findRowMulti(bsRows, "actif courant", "actifs courants", "current assets")
  const currentLiabRow = findRowMulti(bsRows, "passif courant", "passifs courants", "current liabilities")
  const inventoryRow = findRowMulti(bsRows, "stocks", "inventaire", "inventory")
  const totalLiabRow = findRowMulti(bsRows, "total du passif", "passif total", "total liabilities", "passif")
  const equityRow = findRowMulti(bsRows, "capitaux propres", "avoir", "equity", "actionnaires")

  return periods.map((p) => {
    const key = `${p.fiscalYear}-${p.fiscalMonth}`

    const revenue = Math.abs(revenueRow?.amounts[key] || 0)
    const grossProfit = grossProfitRow?.amounts[key] || 0
    const netIncome = netIncomeRow?.amounts[key] || 0
    const ebitda = ebitdaRow?.amounts[key] || 0
    const interest = Math.abs(interestRow?.amounts[key] || 0)

    const currentAssets = Math.abs(currentAssetsRow?.amounts[key] || 0)
    const currentLiab = Math.abs(currentLiabRow?.amounts[key] || 0)
    const inventory = Math.abs(inventoryRow?.amounts[key] || 0)
    const totalLiab = Math.abs(totalLiabRow?.amounts[key] || 0)
    const equity = Math.abs(equityRow?.amounts[key] || 0)

    return {
      period: p.label,
      currentRatio: currentLiab !== 0 ? currentAssets / currentLiab : null,
      quickRatio: currentLiab !== 0 ? (currentAssets - inventory) / currentLiab : null,
      grossMargin: revenue !== 0 ? (grossProfit / revenue) * 100 : null,
      netMargin: revenue !== 0 ? (netIncome / revenue) * 100 : null,
      ebitdaMargin: revenue !== 0 ? (ebitda / revenue) * 100 : null,
      debtToEquity: equity !== 0 ? totalLiab / equity : null,
      interestCoverage: interest !== 0 ? ebitda / interest : null,
    }
  })
}

function ratioTrendCount(view: RatioDisplayView): number {
  if (view === "24months") return 24
  if (view === "years") return 6
  if (view === "12months") return 12
  return 0
}

/** Points chronologiques (plus ancien → plus récent) alignés sur l’horizon Capex / FDR. */
export function pickRatioDisplayPoints(
  points: RatioDataPoint[],
  periods: SeriesPeriod[],
  view: RatioDisplayView,
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): RatioDataPoint[] {
  const yearLabels =
    view === "years"
      ? capexYearLabelsChronological(refMonth, refYear, fiscalYearEndMonth, 6)
      : []
  const indices = pickCapexDisplayIndices(
    points.length,
    view,
    ratioTrendCount(view),
    periods,
    refMonth,
    refYear,
    fiscalYearEndMonth,
  )
  return indices.map((index, displayIdx) => {
    const fallbackLabel = yearLabels[displayIdx] ?? ""
    if (index < 0) return emptyRatioPoint(fallbackLabel)
    const point = points[index] ?? emptyRatioPoint(fallbackLabel)
    if (view === "years" && fallbackLabel) return { ...point, period: fallbackLabel }
    return point
  })
}

/** Retire les années sans donnée (comme Capex / FDR). */
export function filterEmptyRatioPoints(points: RatioDataPoint[]): RatioDataPoint[] {
  if (points.length <= 1) return points
  const mask = emptyHorizonColumnMask(
    points.length,
    RATIO_METRIC_KEYS.map((key) => points.map((point) => point[key])),
  )
  return pickHorizonColumns(points, mask)
}

export function ratioDisplayPointsForTable(points: RatioDataPoint[]): RatioDataPoint[] {
  return reverseSeriesOrderForDisplay(points)
}

export function ratioSeriesValues(
  points: RatioDataPoint[],
  key: RatioMetricKey,
): (number | null)[] {
  return points.map((point) => point[key])
}

export function averageRatioValues(values: (number | null)[]): number | null {
  const numeric = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!numeric.length) return null
  return averageDisplayedHorizonValues(numeric)
}

export function formatRatioValue(value: number | null, format: "ratio" | "percentage"): string {
  if (value === null) return "\u2014"
  if (format === "percentage") return `${value.toFixed(1)}%`
  return `${value.toFixed(2)}x`
}

export function normalizeRatioLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function findFallbackRatioRow(label: string): RatioRowDef | undefined {
  const key = normalizeRatioLabel(label)
  return RATIO_ROWS.find((row) => normalizeRatioLabel(row.label) === key)
}
