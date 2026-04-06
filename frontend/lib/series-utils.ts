import type { SeriesRow, SeriesPeriod } from "@/lib/api"

/**
 * Extract amounts for a specific row as an ordered array matching the periods.
 */
export function getRowAmounts(row: SeriesRow, periods: SeriesPeriod[]): number[] {
  return periods.map((p) => row.amounts[`${p.fiscalYear}-${p.fiscalMonth}`] || 0)
}

/**
 * Get period labels as strings.
 */
export function getPeriodLabels(periods: SeriesPeriod[]): string[] {
  return periods.map((p) => p.label)
}

/**
 * Aggregate monthly data into quarterly data.
 * Groups consecutive sets of 3 periods.
 */
export function aggregateToQuarters(
  amounts: number[],
  periods: SeriesPeriod[]
): { labels: string[]; amounts: number[] } {
  const quarterLabels: string[] = []
  const quarterAmounts: number[] = []

  for (let i = 0; i < periods.length; i += 3) {
    const chunk = amounts.slice(i, i + 3)
    const sum = chunk.reduce((a, b) => a + b, 0)
    quarterAmounts.push(sum)
    // Label: "T1 2024", "T2 2024", etc.
    const quarterNum = Math.floor(i / 3) + 1
    quarterLabels.push(`T${quarterNum} ${periods[i].fiscalYear}`)
  }

  return { labels: quarterLabels, amounts: quarterAmounts }
}

/**
 * Aggregate monthly data into yearly data.
 * Groups by fiscal year.
 */
export function aggregateToYears(
  amounts: number[],
  periods: SeriesPeriod[]
): { labels: string[]; amounts: number[] } {
  const yearMap = new Map<number, number>()

  for (let i = 0; i < periods.length; i++) {
    const fy = periods[i].fiscalYear
    yearMap.set(fy, (yearMap.get(fy) || 0) + amounts[i])
  }

  const labels = Array.from(yearMap.keys()).map((y) => y.toString())
  const yearAmounts = Array.from(yearMap.values())

  return { labels, amounts: yearAmounts }
}

/**
 * Find a row by ID, exact label (trim/case), then substring match.
 * Prefers an exact « revenus » line over another line that merely contains the word.
 */
export function findRow(rows: SeriesRow[], idOrLabel: string): SeriesRow | undefined {
  const raw = idOrLabel.trim()
  const lower = raw.toLowerCase()
  const byId = rows.find((r) => r.id === idOrLabel)
  if (byId) return byId
  const exact = rows.find((r) => r.label.trim().toLowerCase() === lower)
  if (exact) return exact
  const revenueAliases = ["revenus", "chiffre d'affaires", "chiffre d affaires", "revenue"]
  if (revenueAliases.some((a) => a === lower)) {
    const rev = rows.find((r) => revenueAliases.includes(r.label.trim().toLowerCase()))
    if (rev) return rev
  }
  return rows.find((r) => r.label.toLowerCase().includes(lower))
}

/**
 * Compute variation between two consecutive values.
 */
export function computeVariation(current: number, prior: number): number {
  if (prior === 0) return 0
  return ((current - prior) / Math.abs(prior)) * 100
}
