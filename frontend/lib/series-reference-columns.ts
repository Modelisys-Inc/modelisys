import type { SeriesRow, SeriesPeriod } from "@/lib/api"
import {
  formatCalendarMonthYear,
  formatQuarterShortLabel,
  calendarQuarterFromMonth,
  priorCalendarQuarter,
  type CalendarQuarter,
} from "@/lib/financial-period-labels"

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
    const amt = row.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0
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

/** Somme des montants sur les 3 mois civils d’un trimestre. */
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
  count = 5
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  const seq = calendarQuarterSequenceFromReference(refMonth, refYear, count)
  return seq.map(({ quarter, year }) => sumCalendarQuarter(map, quarter, year))
}

export function quarterLabelsFromReference(refMonth: number, refYear: number, count = 5): string[] {
  return calendarQuarterSequenceFromReference(refMonth, refYear, count).map(({ quarter, year }) =>
    formatQuarterShortLabel(quarter, year)
  )
}

/** Somme des montants sur les 12 mois civils d’une année calendaire. */
export function sumCalendarYear(map: Map<string, number>, year: number): number {
  let s = 0
  for (let m = 1; m <= 12; m++) {
    s += map.get(calendarMonthKey(m, year)) ?? 0
  }
  return s
}

export function calendarYearSequenceFromReference(refYear: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => refYear - i)
}

export function yearTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refYear: number,
  count = 6
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  const years = calendarYearSequenceFromReference(refYear, count)
  return years.map((y) => sumCalendarYear(map, y))
}

/** Bilan : solde à la date de clôture (mois de référence) pour chaque année — pas une somme des mois. */
export function balanceSheetYearTrendFromReference(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  count = 6,
): number[] {
  const map = buildAmountsByCalendarMonth(row, periods)
  const years = calendarYearSequenceFromReference(refYear, count)
  return years.map((year) => map.get(calendarMonthKey(refMonth, year)) ?? 0)
}

export function yearLabelsFromReference(refYear: number, count = 6): string[] {
  return calendarYearSequenceFromReference(refYear, count).map(String)
}
