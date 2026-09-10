import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  buildAmountsByCalendarMonth,
  fiscalYearAsOfSequenceFromReference,
  snapshotTrendFromCalendarSequence,
  sumFiscalYearThrough,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"

/** Colonnes réelles en tête du Pro Forma Résultats (années projetées ensuite). */
export type ForecastActualLayout = "single-prior-year" | "nMinusOne-and-ytd"

export function forecastActualColumnCount(layout: ForecastActualLayout = "single-prior-year"): number {
  return layout === "nMinusOne-and-ytd" ? 2 : 1
}

/** YTD (période intermédiaire) seulement si la date de référence n’est pas déjà une clôture d’exercice. */
export function forecastYtdColumnNeeded(refMonth: number, fiscalYearEndMonth: number): boolean {
  return refMonth !== fiscalYearEndMonth
}

export function resolveForecastActualLayout(
  layout: ForecastActualLayout,
  refMonth: number,
  fiscalYearEndMonth: number,
): ForecastActualLayout {
  if (layout === "nMinusOne-and-ytd" && !forecastYtdColumnNeeded(refMonth, fiscalYearEndMonth)) {
    return "single-prior-year"
  }
  return layout
}

export function forecastDisplayYearCount(
  projectionYears: number,
  layout: ForecastActualLayout = "single-prior-year",
): number {
  return projectionYears + forecastActualColumnCount(layout)
}

/** Fin du dernier exercice fiscal complet clos avant (ou au plus tard à) la date de référence. */
export function lastCompletedFiscalYearEnd(
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth = 12,
): { month: number; year: number } {
  const seq = fiscalYearAsOfSequenceFromReference(refMonth, refYear, 2, fiscalYearEndMonth)
  return seq[1] ?? { month: fiscalYearEndMonth, year: refYear - 1 }
}

/**
 * Les 2 dernières clôtures d’exercice (N-2, puis N-1), alignées sur la colonne « 2025 »
 * du bilan hypothèse (solde de fin d’exercice — pas le mois de référence YTD).
 */
export function lastTwoCompletedFiscalYearEnds(
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth = 12,
): [{ month: number; year: number }, { month: number; year: number }] {
  const seq = fiscalYearAsOfSequenceFromReference(refMonth, refYear, 3, fiscalYearEndMonth)
  const n1 = seq[1] ?? { month: fiscalYearEndMonth, year: refYear - 1 }
  const n2 = seq[2] ?? { month: fiscalYearEndMonth, year: n1.year - 1 }
  return [n2, n1]
}

/** Soldes bilan aux dates de clôture → map année → montant (pour l’historique DSO / DPO / stocks). */
export function balanceSheetFiscalYearEndAmountsByYear(
  row: SeriesRow,
  periods: SeriesPeriod[],
  ends: { month: number; year: number }[],
): Record<number, number> {
  const amounts = snapshotTrendFromCalendarSequence(row, periods, ends)
  const out: Record<number, number> = {}
  ends.forEach((end, i) => {
    out[end.year] = amounts[i] ?? 0
  })
  return out
}

/** Cumuls d’exercice (REV / CMV) aux mêmes clôtures N-2 / N-1. */
export function incomeStatementFiscalYearTotalsByYear(
  row: SeriesRow,
  periods: SeriesPeriod[],
  ends: { month: number; year: number }[],
  fiscalYearEndMonth: number,
): Record<number, number> {
  const map = buildAmountsByCalendarMonth(row, periods)
  const out: Record<number, number> = {}
  for (const end of ends) {
    out[end.year] = sumFiscalYearThrough(map, end.month, end.year, fiscalYearEndMonth)
  }
  return out
}

export function nMinusOneAndYtdActuals(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth = 12,
): { nMinusOne: number; ytd: number } {
  const map = buildAmountsByCalendarMonth(row, periods)
  const priorEnd = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
  return {
    nMinusOne: sumFiscalYearThrough(map, priorEnd.month, priorEnd.year, fiscalYearEndMonth),
    ytd: sumFiscalYearThrough(map, refMonth, refYear, fiscalYearEndMonth),
  }
}

/** Préfixe réel : N-1 + YTD, ou une seule année civile (baseYear − 1). */
export function forecastActualPrefixValues(
  layout: ForecastActualLayout,
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  forecastBaseYear: number,
): number[] {
  if (layout !== "nMinusOne-and-ytd") {
    return [yearTrendFromReference(row, periods, forecastBaseYear - 1, 1)[0] || 0]
  }
  const { nMinusOne, ytd } = nMinusOneAndYtdActuals(
    row,
    periods,
    refMonth,
    refYear,
    fiscalYearEndMonth,
  )
  return [nMinusOne, ytd]
}

export function forecastYearLabelsForLayout(
  layout: ForecastActualLayout,
  forecastBaseYear: number,
  projectionYears: number,
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): string[] {
  const projected = Array.from({ length: projectionYears }, (_, i) => `${forecastBaseYear + i}`)
  if (layout !== "nMinusOne-and-ytd") {
    return [`${forecastBaseYear - 1}`, ...projected]
  }
  const prior = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
  return [`${prior.year}`, `YTD ${refYear}`, ...projected]
}

export function forecastTrendFromActualPrefix(
  prefix: number[],
  projectionYears: number,
): number[] {
  return [...prefix, ...Array.from({ length: projectionYears }, () => 0)]
}

/** Ancre calendaire d’une colonne Pro Forma (`2025`, `YTD 2026`). */
export function parseForecastColumnCalendarAnchor(
  label: string,
  refMonth: number,
  fiscalYearEndMonth: number,
): { month: number; year: number } | null {
  const trimmed = String(label ?? "").trim()
  const ytd = /^YTD\s+(\d{4})$/i.exec(trimmed)
  if (ytd) {
    const year = Number(ytd[1])
    if (!Number.isFinite(year)) return null
    return { month: refMonth, year }
  }
  const yearOnly = /^(\d{4})$/.exec(trimmed)
  if (yearOnly) {
    const year = Number(yearOnly[1])
    if (!Number.isFinite(year)) return null
    return { month: fiscalYearEndMonth, year }
  }
  return null
}

/** Dates des colonnes réelles Pro Forma (clôture N-1, puis date de référence si YTD). */
export function forecastActualSnapshotDates(
  layout: ForecastActualLayout,
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): { month: number; year: number }[] {
  const effective = resolveForecastActualLayout(layout, refMonth, fiscalYearEndMonth)
  const priorEnd = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
  if (effective !== "nMinusOne-and-ytd") {
    if (layout === "nMinusOne-and-ytd") return [priorEnd]
    return [{ month: refMonth, year: refYear }]
  }
  return [priorEnd, { month: refMonth, year: refYear }]
}

export function forecastCashFlowYearTrend(
  layout: ForecastActualLayout,
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  projectionYears: number,
  forecastBaseYear: number,
): number[] {
  return forecastTrendFromActualPrefix(
    forecastActualPrefixValues(
      layout,
      row,
      periods,
      refMonth,
      refYear,
      fiscalYearEndMonth,
      forecastBaseYear,
    ),
    projectionYears,
  )
}

/** Bilan : soldes à la clôture N-1 et, si besoin, à la date de référence (YTD). */
export function forecastBalanceSheetActualPrefixValues(
  layout: ForecastActualLayout,
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): number[] {
  const effective = resolveForecastActualLayout(layout, refMonth, fiscalYearEndMonth)
  const priorEnd = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
  if (effective !== "nMinusOne-and-ytd") {
    if (layout === "nMinusOne-and-ytd") {
      return snapshotTrendFromCalendarSequence(row, periods, [priorEnd])
    }
    return snapshotTrendFromCalendarSequence(row, periods, [{ month: refMonth, year: refYear }])
  }
  return snapshotTrendFromCalendarSequence(row, periods, [
    priorEnd,
    { month: refMonth, year: refYear },
  ])
}

export function forecastBalanceSheetYearTrend(
  layout: ForecastActualLayout,
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  projectionYears: number,
): number[] {
  return forecastTrendFromActualPrefix(
    forecastBalanceSheetActualPrefixValues(
      layout,
      row,
      periods,
      refMonth,
      refYear,
      fiscalYearEndMonth,
    ),
    projectionYears,
  )
}

/**
 * Les configs d’hypothèses restent indexées 0 = réel historique, 1+ = années projetées.
 * Avec N-1 + YTD, une colonne réelle supplémentaire est insérée en tête (index 0) :
 * display[i] pour i >= actualCount correspond à config[i - (actualCount - 1)].
 */
export function forecastActualExtraColumnCount(actualColumnCount: number): number {
  return Math.max(0, actualColumnCount - 1)
}

/** Index config pour une colonne affichée, ou `null` pour le N-1 supplémentaire. */
export function forecastDisplayToConfigYearIndex(
  displayIndex: number,
  actualColumnCount: number,
): number | null {
  const extra = forecastActualExtraColumnCount(actualColumnCount)
  if (displayIndex < extra) return null
  return displayIndex - extra
}

export function forecastConfigToDisplayYearIndex(
  configIndex: number,
  actualColumnCount: number,
): number {
  return configIndex + forecastActualExtraColumnCount(actualColumnCount)
}

export function isForecastProjectedDisplayColumn(
  displayIndex: number,
  actualColumnCount: number,
): boolean {
  return displayIndex >= actualColumnCount
}

/**
 * Base de croissance % / $ (index config).
 * Avec N-1 + YTD, la 1re année projetée (index 1) croît sur l’exercice N-1 complet,
 * pas sur le YTD (index 0, période partielle).
 * `"nMinusOne"` → le montant N-1 vient de la série (colonne d’affichage hors config).
 */
export function forecastGrowthPreviousConfigYearIndex(
  yearIndex: number,
  actualColumnCount: number,
): number | "nMinusOne" | null {
  if (yearIndex <= 0) return null
  if (yearIndex === 1 && actualColumnCount > 1) return "nMinusOne"
  return yearIndex - 1
}

/**
 * Colonne d’affichage servant de base au % croissance (tableau).
 * 1re année projetée + YTD → N-1 (index 0), sinon année précédente.
 */
export function forecastGrowthBaseDisplayIndex(
  displayIndex: number,
  actualColumnCount: number,
): number | null {
  if (displayIndex <= 0) return null
  if (actualColumnCount > 1 && displayIndex === actualColumnCount) return 0
  return displayIndex - 1
}

export function forecastDisplayTrendToConfigTrend(
  displayTrend: number[],
  actualColumnCount: number,
): number[] {
  const extra = forecastActualExtraColumnCount(actualColumnCount)
  return extra > 0 ? displayTrend.slice(extra) : displayTrend
}

/**
 * Solde d’ouverture pour moteurs Capex / Bilan projetés.
 * Avec N-1 + YTD : toujours l’exercice N-1 complet (`display[0]` / `prefix[0]`),
 * jamais le YTD partiel. Sinon : unique colonne réelle.
 */
export function forecastProjectionOpeningFromActuals(
  actuals: number[] | undefined,
  fallback = 0,
): number {
  const v = actuals?.[0]
  return typeof v === "number" && Number.isFinite(v) ? v : fallback
}

export function mergeConfigYearsOntoForecastDisplay(
  displayTrend: number[],
  configTrend: number[],
  actualColumnCount: number,
): number[] {
  const extra = forecastActualExtraColumnCount(actualColumnCount)
  return displayTrend.map((value, idx) => {
    if (idx < actualColumnCount) return value ?? 0
    return configTrend[idx - extra] ?? 0
  })
}
