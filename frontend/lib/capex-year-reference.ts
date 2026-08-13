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

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

/**
 * Mois fiscal 1–12 (aligné backend `_calendar_to_fiscal_month`).
 * Le mois fiscal 1 est le mois suivant la fin d'exercice.
 */
export function calendarToFiscalMonth(calendarMonth: number, fiscalYearEndMonth: number): number {
  return mod12(calendarMonth - fiscalYearEndMonth - 1) + 1
}

/** Année fiscale (année de clôture) pour un mois civil — backend `_calendar_to_fiscal_date`. */
export function calendarToFiscalYear(
  calendarYear: number,
  calendarMonth: number,
  fiscalYearEndMonth: number,
): number {
  return calendarMonth > fiscalYearEndMonth ? calendarYear + 1 : calendarYear
}

/** Inverse : (année fiscale, mois fiscal) → mois civil — backend `_fiscal_month_to_calendar`. */
export function fiscalToCalendarMonthYear(
  fiscalYear: number,
  fiscalMonth: number,
  fiscalYearEndMonth: number,
): { month: number; year: number } {
  const month = mod12(fiscalYearEndMonth + fiscalMonth - 1) + 1
  if (fiscalYearEndMonth === 12) {
    return { month, year: fiscalYear }
  }
  const yearOffset = month > fiscalYearEndMonth ? 0 : 1
  return { month, year: fiscalYear - 1 + yearOffset }
}

/**
 * Les 3 mois civils du trimestre fiscal contenant `(calendarMonth, calendarYear)`.
 * Ex. fin d'exercice août, réf. août → juin, juillet, août (pas juil–sep civil).
 */
export function monthsInFiscalQuarterContaining(
  calendarMonth: number,
  calendarYear: number,
  fiscalYearEndMonth: number,
): { month: number; year: number }[] {
  const fm = calendarToFiscalMonth(calendarMonth, fiscalYearEndMonth)
  const fy = calendarToFiscalYear(calendarYear, calendarMonth, fiscalYearEndMonth)
  const startFm = Math.floor((fm - 1) / 3) * 3 + 1
  return [0, 1, 2].map((offset) =>
    fiscalToCalendarMonthYear(fy, startFm + offset, fiscalYearEndMonth),
  )
}

/** Mois du trimestre fiscal jusqu’à la date as-of inclusive (exclut les mois futurs). */
export function monthsInFiscalQuarterThrough(
  asOfMonth: number,
  asOfYear: number,
  fiscalYearEndMonth: number,
): { month: number; year: number }[] {
  return monthsInFiscalQuarterContaining(asOfMonth, asOfYear, fiscalYearEndMonth).filter(
    (point) => point.year < asOfYear || (point.year === asOfYear && point.month <= asOfMonth),
  )
}

/** Dernier mois civil du trimestre fiscal précédent (ex. Nov → Sep, Déc → Sep). */
export function endOfPriorFiscalQuarter(
  calendarMonth: number,
  calendarYear: number,
  fiscalYearEndMonth: number,
): { month: number; year: number } {
  const [first] = monthsInFiscalQuarterContaining(calendarMonth, calendarYear, fiscalYearEndMonth)
  if (!first) return { month: calendarMonth, year: calendarYear }
  let month = first.month - 1
  let year = first.year
  if (month < 1) {
    month = 12
    year -= 1
  }
  return { month, year }
}

/** Premier mois civil de l’exercice contenant `(calendarMonth, calendarYear)`. */
export function fiscalYearStartContaining(
  calendarMonth: number,
  calendarYear: number,
  fiscalYearEndMonth: number,
): { month: number; year: number } {
  const startMonth = (fiscalYearEndMonth % 12) + 1
  if (calendarMonth > fiscalYearEndMonth) {
    return { month: startMonth, year: calendarYear }
  }
  if (startMonth <= calendarMonth) {
    return { month: startMonth, year: calendarYear }
  }
  return { month: startMonth, year: calendarYear - 1 }
}

/** Mois de l’exercice jusqu’à la date as-of inclusive (YTD fiscal, max 12 mois). */
export function monthsInFiscalYearThrough(
  asOfMonth: number,
  asOfYear: number,
  fiscalYearEndMonth: number,
): { month: number; year: number }[] {
  const start = fiscalYearStartContaining(asOfMonth, asOfYear, fiscalYearEndMonth)
  const out: { month: number; year: number }[] = []
  let month = start.month
  let year = start.year
  while (year < asOfYear || (year === asOfYear && month <= asOfMonth)) {
    out.push({ month, year })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    if (out.length >= 12) break
  }
  return out
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
