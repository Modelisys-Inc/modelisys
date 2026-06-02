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
