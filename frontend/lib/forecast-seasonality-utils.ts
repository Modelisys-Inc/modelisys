import { scaleBand } from "d3-scale"

/** Répartition mensuelle (12 mois, somme 100 %) — revenus et dépenses. */

export const FORECAST_SEASONALITY_MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const

export const FORECAST_SEASONALITY_AXIS_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const

export const FORECAST_SEASONALITY_CHART_SLATE = "#475569"
/** Courbe de référence : saisonnalité des revenus liés (dépenses variables). */
export const FORECAST_SEASONALITY_REVENUE_OVERLAY_BLUE = "#2563eb"
/** Exercice réel le plus ancien (N−2), puis N−1 — distincts de la projection ardoise. */
export const FORECAST_SEASONALITY_ACTUAL_YEAR_COLORS = ["#94a3b8", "#0284c7"] as const

export type ActualYearSeasonality = {
  year: number
  percents: number[]
  hasData: boolean
}

/** Deux derniers exercices civils clos avant l’année de début de projection (ex. 2026 → 2024, 2025). */
export function lastTwoActualCalendarYears(projectionStartYear: number): [number, number] {
  const lastActual = Math.round(Number(projectionStartYear) || 0) - 1
  return [lastActual - 1, lastActual]
}

export function calendarYearMonthlyAmounts(amountByCalendarMonth: Map<string, number>, year: number): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const raw = amountByCalendarMonth.get(`${year}-${i + 1}`) ?? 0
    const n = Number(raw)
    if (!Number.isFinite(n)) return 0
    return Math.abs(n)
  })
}

export function seasonalityPercentsFromMonthlyAmounts(amounts: number[]): ActualYearSeasonality["percents"] {
  const safe = amounts.map((a) => Math.max(0, Number(a) || 0))
  if (safe.reduce((s, v) => s + v, 0) <= 0) return Array.from({ length: 12 }, () => 0)
  return normalizeForecastSeasonalityMonthPercents(safe)
}

export function actualYearsSeasonalityFromCalendarMap(
  amountByCalendarMonth: Map<string, number>,
  years: number[]
): ActualYearSeasonality[] {
  return years.map((year) => {
    const amounts = calendarYearMonthlyAmounts(amountByCalendarMonth, year)
    const hasData = amounts.some((v) => v > 0)
    return {
      year,
      percents: hasData ? seasonalityPercentsFromMonthlyAmounts(amounts) : Array.from({ length: 12 }, () => 0),
      hasData,
    }
  })
}

/** Moyenne mensuelle des saisonnalités (années avec données, poids égaux), renormalisée à 100 %. */
export function averageSeasonalityMonthPercents(years: ActualYearSeasonality[]): number[] {
  const withData = years.filter((y) => y.hasData)
  if (withData.length === 0) return createDefaultForecastSeasonalityMonthPercents()
  const avg = Array.from({ length: 12 }, (_, m) => {
    const sum = withData.reduce((s, y) => s + (y.percents[m] ?? 0), 0)
    return sum / withData.length
  })
  return normalizeForecastSeasonalityMonthPercents(avg)
}

/**
 * Saisonnalité globale = répartition des montants mensuels Σ (poids × % poste).
 * Ex. revenus totaux projetés = Σ (CA_i × saisonnalité_i), renormalisé à 100 %.
 */
export function weightedSeasonalityMonthPercents(
  contributions: { weight: number; monthPercents: number[] }[]
): number[] {
  const usable = contributions.filter((c) => Number.isFinite(c.weight) && Math.abs(c.weight) > 1e-9)
  if (usable.length === 0) return createDefaultForecastSeasonalityMonthPercents()
  const monthAmounts = Array.from({ length: 12 }, (_, m) => {
    let sum = 0
    for (const c of usable) {
      const pct = normalizeForecastSeasonalityMonthPercents(c.monthPercents)
      sum += Math.abs(c.weight) * ((pct[m] ?? 0) / 100)
    }
    return sum
  })
  if (monthAmounts.every((v) => v <= 0)) return createDefaultForecastSeasonalityMonthPercents()
  return seasonalityPercentsFromMonthlyAmounts(monthAmounts)
}

export function createDefaultForecastSeasonalityMonthPercents(): number[] {
  const n = 12
  const base = Math.floor(100 / n)
  let rest = 100 - base * n
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0))
}

/** Jours d’avance pré-revenus → décalage en mois civils (30 j = 1 mois). */
export function seasonalityAdvanceToMonthOffset(advanceDays: number): number {
  const d = Math.max(0, Math.round(Number(advanceDays) || 0))
  return Math.max(0, Math.round(d / 30))
}

/**
 * Décale la répartition mensuelle vers le début de l’année (dépense avant les revenus du mois suivant).
 * Le mois i reçoit le % du mois source i + offset.
 */
export function shiftSeasonalityEarlierForPreRevenue(
  monthPercents: number[],
  advanceDays: number
): number[] {
  const offset = seasonalityAdvanceToMonthOffset(advanceDays)
  const src = normalizeForecastSeasonalityMonthPercents(monthPercents)
  if (offset === 0) return [...src]
  const out = Array.from({ length: 12 }, (_, i) => src[(i + offset) % 12] ?? 0)
  return normalizeForecastSeasonalityMonthPercents(out)
}

/** Index du mois « base » à modifier quand l’utilisateur édite la colonne affichée décalée. */
export function seasonalityDisplayColumnToBaseIndex(displayColIdx: number, advanceDays: number): number {
  const offset = seasonalityAdvanceToMonthOffset(advanceDays)
  return (displayColIdx + offset) % 12
}

export function normalizeForecastSeasonalityMonthPercents(months: number[]): number[] {
  const def = createDefaultForecastSeasonalityMonthPercents()
  const raw =
    months.length >= 12 ? months.slice(0, 12) : [...months, ...Array(12 - months.length).fill(0)]
  let sum = raw.reduce((a, b) => a + (Number.isFinite(b) ? Math.max(0, Math.round(b)) : 0), 0)
  if (sum <= 0) return [...def]
  const rounded = raw.map((b) => Math.max(0, Math.round(Number(b) || 0)))
  sum = rounded.reduce((a, b) => a + b, 0)
  if (sum === 0) return [...def]
  const target = 100
  const out = rounded.map((b) => Math.round((b / sum) * target))
  let diff = target - out.reduce((a, b) => a + b, 0)
  let guard = 0
  while (diff !== 0 && guard < 48) {
    const i = guard % 12
    if (diff > 0) {
      out[i] = (out[i] ?? 0) + 1
      diff--
    } else if (diff < 0 && (out[i] ?? 0) > 0) {
      out[i] = (out[i] ?? 0) - 1
      diff++
    }
    guard++
  }
  return out
}

/** Clamp 12 mois à des % ≥ 0 sans renormaliser (permet tout à 0 % pour éditer ensuite 1 mois à 100 %). */
export function clampForecastSeasonalityMonthPercents(months: number[]): number[] {
  const raw =
    months.length >= 12 ? months.slice(0, 12) : [...months, ...Array(12 - months.length).fill(0)]
  return raw.map((b) => Math.max(0, Math.round(Number.isFinite(Number(b)) ? Number(b) : 0)))
}

export function createZeroForecastSeasonalityMonthPercents(): number[] {
  return Array.from({ length: 12 }, () => 0)
}

/** Convertit des montants mensuels en % de saisonnalité (somme 100), ou défaut si total ≤ 0. */
export function monthPercentsFromMonthlyAmounts(amounts: number[]): number[] {
  const safe =
    amounts.length >= 12
      ? amounts.slice(0, 12).map((a) => Math.max(0, Number(a) || 0))
      : [...amounts.map((a) => Math.max(0, Number(a) || 0)), ...Array(12 - amounts.length).fill(0)]
  const sum = safe.reduce((a, b) => a + b, 0)
  if (sum <= 0) return createDefaultForecastSeasonalityMonthPercents()
  return normalizeForecastSeasonalityMonthPercents(safe.map((a) => (a / sum) * 100))
}

/** Couleur courbe « Avec ajustement » (saisonnalité dépenses). */
export const FORECAST_SEASONALITY_WITH_ADJUSTMENT_COLOR = "#059669"

export function parseSeasonalityMonthPercentsFromStorage(adj: {
  seasonalityMonthPercents?: unknown
}): number[] {
  const raw = adj.seasonalityMonthPercents
  if (!Array.isArray(raw) || raw.length !== 12) return createDefaultForecastSeasonalityMonthPercents()
  return normalizeForecastSeasonalityMonthPercents(raw.map((x) => Number(x)))
}

export function computeForecastSeasonalityChartYScale(monthPercents: number[]): {
  yMax: number
  ticks: number[]
} {
  const m = Math.max(0, ...monthPercents)
  let yMax: number
  if (m <= 0) {
    yMax = 10
  } else {
    const target = Math.min(100, Math.max(m * 1.22, m + 2))
    const steps = [5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 75, 80, 90, 100]
    yMax = steps.find((s) => s >= target) ?? 100
  }
  const segments = 5
  const ticksAsc = Array.from({ length: segments + 1 }, (_, i) => Math.round((yMax * i) / segments))
  const ticks = [...new Set(ticksAsc)].sort((a, b) => b - a)
  return { yMax, ticks }
}

export function createForecastSeasonalityBandXScale() {
  return scaleBand<string>()
    .domain([...FORECAST_SEASONALITY_AXIS_LABELS])
    .paddingInner(0)
    .paddingOuter(0)
}
