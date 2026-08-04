import type { SeriesPeriod } from "@/lib/api"
import { formatCalendarMonthYearShort } from "@/lib/financial-period-labels"
import {
  calendarYearSequenceFromReference,
  findPeriodIndexForCalendarMonth,
} from "@/lib/series-reference-columns"

/** Extrait le mois civil d'une fin d'exercice « MM-JJ » (défaut : décembre). */
export function parseFiscalYearEndMonth(fiscalYearEnd: string): number {
  const month = Number.parseInt(fiscalYearEnd.split("-")[0] ?? "12", 10)
  if (Number.isFinite(month) && month >= 1 && month <= 12) return month
  return 12
}

/**
 * Mois bilan pour chaque année de la fenêtre « 5 ans » Capex :
 * année de référence → mois de référence ; années antérieures → fin d'exercice.
 */
export function capexYearCalendarMonth(
  year: number,
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
): number {
  return year === refYear ? refMonth : fiscalYearEndMonth
}

/** Indices bilan chronologiques (plus ancien → plus récent) pour la vue annuelle Capex. */
export function capexYearPeriodIndicesFromReference(
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  count = 6,
): number[] {
  const yearsChronological = [...calendarYearSequenceFromReference(refYear, count)].reverse()
  return yearsChronological.map((year) => {
    const month = capexYearCalendarMonth(year, refMonth, refYear, fiscalYearEndMonth)
    return findPeriodIndexForCalendarMonth(periods, month, year)
  })
}

/** Libellés chronologiques (plus ancien → plus récent) pour la vue annuelle Capex. */
export function capexYearLabelsChronological(
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  count = 6,
): string[] {
  const yearsChronological = [...calendarYearSequenceFromReference(refYear, count)].reverse()
  return yearsChronological.map((year) => {
    const month = capexYearCalendarMonth(year, refMonth, refYear, fiscalYearEndMonth)
    return formatCalendarMonthYearShort(month, year)
  })
}

export function sliceAmountsAtCapexReferenceYears(
  amounts: number[],
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  count = 6,
): number[] {
  return capexYearPeriodIndicesFromReference(
    periods,
    refMonth,
    refYear,
    fiscalYearEndMonth,
    count,
  ).map((index) => (index >= 0 ? (amounts[index] ?? 0) : 0))
}
