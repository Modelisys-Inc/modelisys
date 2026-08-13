import type { SeriesRow, SeriesPeriod } from "@/lib/api"
import {
  formatCalendarMonthYear,
  formatQuarterShortLabel,
  calendarQuarterFromMonth,
  priorCalendarQuarter,
  type CalendarQuarter,
} from "@/lib/financial-period-labels"
import {
  monthsInFiscalQuarterThrough,
  monthsInFiscalYearThrough,
  endOfPriorFiscalQuarter,
} from "@/lib/capex-year-reference"

/** Abrégés alignés sur l’API (`financial_statements._build_periods`). */
const FRENCH_MONTH_ABBREVS_SHORT = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "")
}

/**
 * Parse un libellé de période série (ex. « Avr 2025 ») renvoyé par l’API.
 */
export function parseSeriesPeriodCalendarLabel(label: string): { month: number; year: number } | null {
  const m = /^(\S+)\s+(\d{4})$/.exec(label.trim())
  if (!m) return null
  const token = stripAccents(m[1]!.toLowerCase())
  const year = Number(m[2])
  if (!Number.isFinite(year)) return null
  const map: Record<string, number> = {
    jan: 1,
    fev: 2,
    mar: 3,
    avr: 4,
    mai: 5,
    jun: 6,
    jul: 7,
    aou: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
  }
  const mon = map[token]
  if (!mon) return null
  return { month: mon, year }
}

function calendarMonthKey(month: number, year: number): string {
  return `${year}-${month}`
}

function priorCalMonth(m: number, y: number): { month: number; year: number } {
  if (m > 1) return { month: m - 1, year: y }
  return { month: 12, year: y - 1 }
}

/** Montants indexés par mois civil (clé `année-mois`), à partir des libellés de périodes API. */
export function buildAmountsByCalendarMonth(row: SeriesRow, periods: SeriesPeriod[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const p of periods) {
    const cal = parseSeriesPeriodCalendarLabel(p.label)
    if (!cal) continue
    const key = calendarMonthKey(cal.month, cal.year)
    const amt = row.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] ?? 0
    map.set(key, amt)
  }
  return map
}

export function monthTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count: number
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  const out: number[] = []
  let m = refMonth
  let y = refYear
  for (let i = 0; i < count; i++) {
    out.push(map.get(calendarMonthKey(m, y)) ?? 0)
    const p = priorCalMonth(m, y)
    m = p.month
    y = p.year
  }
  return out
}

/** En-têtes « Avril 2025 », … — mois de référence en premier, puis en reculant. */
export function monthLabelsFromReference(refMonth: number, refYear: number, count: number): string[] {
  const out: string[] = []
  let m = refMonth
  let y = refYear
  for (let i = 0; i < count; i++) {
    out.push(formatCalendarMonthYear(m, y))
    const p = priorCalMonth(m, y)
    m = p.month
    y = p.year
  }
  return out
}

/** Libellés courts (axes de graphiques). */
export function monthShortLabelsFromReference(refMonth: number, refYear: number, count: number): string[] {
  const out: string[] = []
  let m = refMonth
  let y = refYear
  for (let i = 0; i < count; i++) {
    out.push(`${FRENCH_MONTH_ABBREVS_SHORT[m - 1]} ${y}`)
    const p = priorCalMonth(m, y)
    m = p.month
    y = p.year
  }
  return out
}

/** Somme des montants du trimestre fiscal jusqu’au mois as-of (pas de mois futurs). */
export function sumFiscalQuarterContaining(
  map: Map<string, number>,
  month: number,
  year: number,
  fiscalYearEndMonth = 12,
): number {
  return monthsInFiscalQuarterThrough(month, year, fiscalYearEndMonth).reduce(
    (sum, point) => sum + (map.get(calendarMonthKey(point.month, point.year)) ?? 0),
    0,
  )
}

/** @deprecated Préférer `sumFiscalQuarterContaining` (trimestre fiscal). */
export function sumCalendarQuarter(map: Map<string, number>, quarter: number, year: number): number {
  const startM = (quarter - 1) * 3 + 1
  let s = 0
  for (let dm = 0; dm < 3; dm++) {
    const mo = startM + dm
    s += map.get(calendarMonthKey(mo, year)) ?? 0
  }
  return s
}

export function calendarQuarterSequenceFromReference(
  refMonth: number,
  refYear: number,
  count: number
): { quarter: CalendarQuarter; year: number }[] {
  let q = calendarQuarterFromMonth(refMonth) as CalendarQuarter
  let y = refYear
  const out: { quarter: CalendarQuarter; year: number }[] = []
  for (let i = 0; i < count; i++) {
    out.push({ quarter: q, year: y })
    const p = priorCalendarQuarter(q, y)
    q = p.quarter
    y = p.year
  }
  return out
}

export function quarterTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
  fiscalYearEndMonth = 12,
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  return referenceQuarterMonthSequenceFromReference(refMonth, refYear, count, fiscalYearEndMonth).map(
    ({ month, year }) => sumFiscalQuarterContaining(map, month, year, fiscalYearEndMonth),
  )
}

export function quarterLabelsFromReference(refMonth: number, refYear: number, count = 5): string[] {
  return calendarQuarterSequenceFromReference(refMonth, refYear, count).map(({ quarter, year }) =>
    formatQuarterShortLabel(quarter, year)
  )
}

/** Position du mois dans son trimestre civil (0 = 1er mois, 2 = dernier). */
export function monthOffsetWithinCalendarQuarter(month: number): number {
  const m = Math.min(12, Math.max(1, month))
  return (m - 1) % 3
}

export function monthForQuarterAndOffset(quarter: number, offset: number): number {
  const q = Math.min(4, Math.max(1, quarter))
  const o = Math.min(2, Math.max(0, offset))
  return (q - 1) * 3 + 1 + o
}

/**
 * Colonnes trimestrielles cash-flow :
 * - col. 0 = mois de référence (trimestre en cours, éventuellement partiel) ;
 * - colonnes suivantes = dernier mois de chaque trimestre fiscal déjà clos.
 * Ex. réf. Nov 2026 → Nov 2026, Sep 2026, Jun 2026… (pas Aoû).
 */
export function referenceQuarterMonthSequenceFromReference(
  refMonth: number,
  refYear: number,
  count: number,
  fiscalYearEndMonth = 12,
): { month: number; year: number }[] {
  if (count < 1) return []
  const out: { month: number; year: number }[] = [{ month: refMonth, year: refYear }]
  let cursor = { month: refMonth, year: refYear }
  for (let i = 1; i < count; i++) {
    cursor = endOfPriorFiscalQuarter(cursor.month, cursor.year, fiscalYearEndMonth)
    out.push(cursor)
  }
  return out
}

/** En-têtes « Nov 2026 », « Sep 2026 », … */
export function referenceQuarterMonthLabelsFromReference(
  refMonth: number,
  refYear: number,
  count = 5,
  fiscalYearEndMonth = 12,
): string[] {
  return referenceQuarterMonthSequenceFromReference(
    refMonth,
    refYear,
    count,
    fiscalYearEndMonth,
  ).map(({ month, year }) => `${FRENCH_MONTH_ABBREVS_SHORT[month - 1]} ${year}`)
}

/** Flux de trésorerie : snapshot au mois de chaque colonne (base des modes Variation). */
export function flowQuarterSnapshotTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
  fiscalYearEndMonth = 12,
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  return referenceQuarterMonthSequenceFromReference(
    refMonth,
    refYear,
    count,
    fiscalYearEndMonth,
  ).map(({ month, year }) => map.get(calendarMonthKey(month, year)) ?? 0)
}

/** Flux de trésorerie : somme du trimestre fiscal jusqu’au mois de la colonne (mode Réel). */
export function flowQuarterTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
  fiscalYearEndMonth = 12,
): number[] {
  return quarterTrendFromReference(row, periods, refMonth, refYear, count, fiscalYearEndMonth)
}

/** Somme des montants sur les 12 mois civils d’une année calendaire. */
export function sumCalendarYear(map: Map<string, number>, year: number): number {
  let s = 0
  for (let m = 1; m <= 12; m++) {
    s += map.get(calendarMonthKey(m, year)) ?? 0
  }
  return s
}

/** Somme des `count` mois civils se terminant au mois `(month, year)` inclus. */
export function sumTrailingMonthsEndingAt(
  map: Map<string, number>,
  month: number,
  year: number,
  count: number,
): number {
  let sum = 0
  let m = month
  let y = year
  for (let i = 0; i < count; i++) {
    sum += map.get(calendarMonthKey(m, y)) ?? 0
    const prior = priorCalMonth(m, y)
    m = prior.month
    y = prior.year
  }
  return sum
}

/** TTM : 12 derniers mois se terminant au mois civil `(month, year)` inclus. */
export function sumTTMEndingAtCalendarMonth(
  map: Map<string, number>,
  month: number,
  year: number,
): number {
  return sumTrailingMonthsEndingAt(map, month, year, 12)
}

/** YTD de l’exercice contenant `(month, year)` jusqu’à ce mois inclus. */
export function sumFiscalYearThrough(
  map: Map<string, number>,
  month: number,
  year: number,
  fiscalYearEndMonth = 12,
): number {
  return monthsInFiscalYearThrough(month, year, fiscalYearEndMonth).reduce(
    (sum, point) => sum + (map.get(calendarMonthKey(point.month, point.year)) ?? 0),
    0,
  )
}

/**
 * Colonnes « Exercice » annuel : mois de référence, puis chaque fin d’exercice close.
 * Ex. réf. Aoû 2026, clôture 31 déc. → Aoû 2026, Déc 2025, Déc 2024…
 */
export function fiscalYearAsOfSequenceFromReference(
  refMonth: number,
  refYear: number,
  count: number,
  fiscalYearEndMonth = 12,
): { month: number; year: number }[] {
  if (count < 1) return []
  const out: { month: number; year: number }[] = [{ month: refMonth, year: refYear }]
  let fyYear = refMonth <= fiscalYearEndMonth ? refYear - 1 : refYear
  for (let i = 1; i < count; i++) {
    out.push({ month: fiscalYearEndMonth, year: fyYear })
    fyYear -= 1
  }
  return out
}

export function fiscalYearAsOfLabelsFromReference(
  refMonth: number,
  refYear: number,
  count = 5,
  fiscalYearEndMonth = 12,
): string[] {
  return fiscalYearAsOfSequenceFromReference(refMonth, refYear, count, fiscalYearEndMonth).map(
    ({ month, year }) => `${FRENCH_MONTH_ABBREVS_SHORT[month - 1]} ${year}`,
  )
}

export function fiscalYearTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
  fiscalYearEndMonth = 12,
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  return fiscalYearAsOfSequenceFromReference(refMonth, refYear, count, fiscalYearEndMonth).map(
    ({ month, year }) => sumFiscalYearThrough(map, month, year, fiscalYearEndMonth),
  )
}

/**
 * Colonnes trimestrielles « Courant » : tous les 3 mois civils, T3M se terminant à cette date.
 * Ex. réf. Aoû 2026 → Aoû 2026, Mai 2026, Fév 2026…
 */
export function trailingQuarterMonthSequenceFromReference(
  refMonth: number,
  refYear: number,
  count: number,
): { month: number; year: number }[] {
  const out: { month: number; year: number }[] = []
  let month = refMonth
  let year = refYear
  for (let i = 0; i < count; i++) {
    out.push({ month, year })
    month -= 3
    while (month < 1) {
      month += 12
      year -= 1
    }
  }
  return out
}

export function trailingQuarterMonthLabelsFromReference(
  refMonth: number,
  refYear: number,
  count = 5,
): string[] {
  return trailingQuarterMonthSequenceFromReference(refMonth, refYear, count).map(
    ({ month, year }) => `${FRENCH_MONTH_ABBREVS_SHORT[month - 1]} ${year}`,
  )
}

export function trailingQuarterTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  return trailingQuarterMonthSequenceFromReference(refMonth, refYear, count).map(({ month, year }) =>
    sumTrailingMonthsEndingAt(map, month, year, 3),
  )
}

export function calendarYearSequenceFromReference(refYear: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => refYear - i)
}

export function yearTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refYear: number,
  count = 5
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  const years = calendarYearSequenceFromReference(refYear, count)
  return years.map((y) => sumCalendarYear(map, y))
}

/** Snapshot au mois civil de chaque point (bilan / variation trésorerie). */
export function snapshotTrendFromCalendarSequence(
  row: SeriesRow,
  periods: SeriesPeriod[],
  sequence: { month: number; year: number }[],
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  return sequence.map(({ month, year }) => map.get(calendarMonthKey(month, year)) ?? 0)
}

/** Bilan : solde à la date de clôture (mois de référence) pour chaque année — pas une somme des mois. */
export function balanceSheetYearTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
): number[] {
  return snapshotTrendFromCalendarSequence(
    row,
    periods,
    calendarYearSequenceFromReference(refYear, count).map((year) => ({ month: refMonth, year })),
  )
}

/** Bilan Exercice : solde à la date de référence, puis à chaque fin d’exercice close. */
export function balanceSheetFiscalYearTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
  fiscalYearEndMonth = 12,
): number[] {
  return snapshotTrendFromCalendarSequence(
    row,
    periods,
    fiscalYearAsOfSequenceFromReference(refMonth, refYear, count, fiscalYearEndMonth),
  )
}

/** Bilan / variation CF « Courant » trimestriel : solde tous les 3 mois civils. */
export function trailingQuarterSnapshotTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
): number[] {
  return snapshotTrendFromCalendarSequence(
    row,
    periods,
    trailingQuarterMonthSequenceFromReference(refMonth, refYear, count),
  )
}

export function yearLabelsFromReference(refYear: number, count = 5): string[] {
  return calendarYearSequenceFromReference(refYear, count).map(String)
}

/** En-têtes « Déc 2026 », « Déc 2025 », … — même mois civil chaque année. */
export function referenceMonthYearLabelsFromReference(
  refMonth: number,
  refYear: number,
  count = 5,
): string[] {
  return calendarYearSequenceFromReference(refYear, count).map(
    (year) => `${FRENCH_MONTH_ABBREVS_SHORT[refMonth - 1]} ${year}`,
  )
}

/** Flux de trésorerie : snapshot au mois de référence pour chaque année (base des modes Variation). */
export function flowYearSnapshotTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
): number[] {
  return balanceSheetYearTrendFromReference(row, periods, refMonth, refYear, count)
}

/** Flux de trésorerie : TTM (12 mois) se terminant au mois de référence pour chaque année (mode Réel). */
export function flowYearTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  const years = calendarYearSequenceFromReference(refYear, count)
  return years.map((year) => sumTTMEndingAtCalendarMonth(map, refMonth, year))
}

/** Index dans `periods` du mois civil (ex. août 2025), ou −1 si absent. */
export function findPeriodIndexForCalendarMonth(
  periods: SeriesPeriod[],
  month: number,
  year: number,
): number {
  for (let i = 0; i < periods.length; i++) {
    const cal = parseSeriesPeriodCalendarLabel(periods[i]!.label)
    if (cal?.month === month && cal?.year === year) return i
  }
  const direct = periods.findIndex(
    (p) => p.fiscalYear === year && p.fiscalMonth === month,
  )
  if (direct >= 0) return direct
  const targetLabel = formatCalendarMonthYear(month, year)
  return periods.findIndex((p) => p.label.trim() === targetLabel)
}

/**
 * Indices bilan pour chaque année du même mois de référence (ordre chronologique : plus ancien → plus récent).
 * Ex. réf. août 2026 → août 2021 … août 2026.
 */
export function yearPeriodIndicesFromReference(
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
): number[] {
  const yearsChronological = [...calendarYearSequenceFromReference(refYear, count)].reverse()
  return yearsChronological.map((year) => findPeriodIndexForCalendarMonth(periods, refMonth, year))
}

/** Montants à chaque année du même mois de référence (ordre chronologique). */
export function sliceAmountsAtReferenceMonthYears(
  amounts: number[],
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 5,
): number[] {
  return yearPeriodIndicesFromReference(periods, refMonth, refYear, count).map((index) =>
    index >= 0 ? (amounts[index] ?? 0) : 0,
  )
}
