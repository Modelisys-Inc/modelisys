/** Noms de mois calendaires (aligné sur `financial-statement-reference-controls`). */
const MONTH_NAMES_FR = [
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

/** Abrégés alignés sur les axes de graphiques (`series-reference-columns`). */
const MONTH_ABBREVS_FR = [
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

/** Libellé « Mois année » pour la date de référence (ex. Avril 2025). */
export function formatCalendarMonthYear(month: number, fiscalYear: number): string {
  if (!Number.isFinite(month) || month < 1 || month > 12) return "—"
  if (!Number.isFinite(fiscalYear)) return "—"
  return `${MONTH_NAMES_FR[month - 1]} ${fiscalYear}`
}

/** Libellé court « Oct 2026 » pour en-têtes de tableaux. */
export function formatCalendarMonthYearShort(month: number, fiscalYear: number): string {
  if (!Number.isFinite(month) || month < 1 || month > 12) return "—"
  if (!Number.isFinite(fiscalYear)) return "—"
  return `${MONTH_ABBREVS_FR[month - 1]} ${fiscalYear}`
}

function priorCalendarMonth(month: number, fiscalYear: number): { month: number; year: number } {
  if (month > 1) return { month: month - 1, year: fiscalYear }
  return { month: 12, year: fiscalYear - 1 }
}

/** Mois civil précédent (ex. Mars 2025 si référence Avril 2025). */
export function formatPriorCalendarMonth(month: number, fiscalYear: number): string {
  const p = priorCalendarMonth(month, fiscalYear)
  return formatCalendarMonthYear(p.month, p.year)
}

/** Même mois, année − 1 (ex. Avril 2024 si référence Avril 2025). */
export function formatSameMonthPriorYear(month: number, fiscalYear: number): string {
  return formatCalendarMonthYear(month, fiscalYear - 1)
}

export type CalendarQuarter = 1 | 2 | 3 | 4

export function calendarQuarterFromMonth(month: number): CalendarQuarter {
  const m = Math.min(12, Math.max(1, month))
  const q = Math.ceil(m / 3)
  return Math.min(4, Math.max(1, q)) as CalendarQuarter
}

/** Libellé court aligné sur `series-utils` (T1 2025, …). */
export function formatQuarterShortLabel(quarter: number, fiscalYear: number): string {
  const q = Math.min(4, Math.max(1, quarter)) as CalendarQuarter
  return `T${q} ${fiscalYear}`
}

export function priorCalendarQuarter(
  quarter: number,
  fiscalYear: number
): { quarter: CalendarQuarter; year: number } {
  const q = Math.min(4, Math.max(1, quarter)) as CalendarQuarter
  if (q > 1) return { quarter: (q - 1) as CalendarQuarter, year: fiscalYear }
  return { quarter: 4, year: fiscalYear - 1 }
}
