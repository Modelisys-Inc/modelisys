import type { SeriesRow, SeriesPeriod } from "@/lib/api"

/** Garde les N derniers mois pour l’affichage mensuel (le mois N−1 sert au calcul de variation). */
export function slicePeriodsForMonthlyDisplay(
  periods: SeriesPeriod[],
  displayMonthCount: number,
): SeriesPeriod[] {
  if (periods.length <= displayMonthCount) return periods
  return periods.slice(-displayMonthCount)
}

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
 * Affiche la date / période de référence en première colonne (à gauche).
 * L’API renvoie les séries en ordre chronologique (du plus ancien au plus récent) ;
 * pour l’UI on veut le plus récent à gauche (ex. 2025, 2024, 2023…).
 */
export function reverseSeriesOrderForDisplay<T>(items: T[]): T[] {
  if (items.length <= 1) return items
  return [...items].reverse()
}

/** For balance-sheet style series: use the last month of each quarter (snapshot), not the sum of 3 months. */
export type SeriesAggregateMode = "sum" | "last"

/**
 * Aggregate monthly data into quarterly data.
 * Groups consecutive sets of 3 periods.
 * Use mode `"last"` for point-in-time balances (e.g. balance sheet); default `"sum"` for flows / P&L.
 */
export function aggregateToQuarters(
  amounts: number[],
  periods: SeriesPeriod[],
  mode: SeriesAggregateMode = "sum"
): { labels: string[]; amounts: number[] } {
  const quarterLabels: string[] = []
  const quarterAmounts: number[] = []

  for (let i = 0; i < periods.length; i += 3) {
    const chunk = amounts.slice(i, i + 3)
    const chunkPeriods = periods.slice(i, i + 3)
    const lastP = chunkPeriods[chunkPeriods.length - 1] ?? periods[i]
    const value =
      mode === "last"
        ? (chunk.length ? chunk[chunk.length - 1]! : 0)
        : chunk.reduce((a, b) => a + b, 0)
    quarterAmounts.push(value)
    if (mode === "last") {
      quarterLabels.push(lastP.label)
    } else {
      const quarterNum = Math.floor(i / 3) + 1
      quarterLabels.push(`T${quarterNum} ${lastP.fiscalYear}`)
    }
  }

  return { labels: quarterLabels, amounts: quarterAmounts }
}

/**
 * Aggregate monthly data into yearly data.
 * Groups by fiscal year.
 * Use mode `"last"` for point-in-time balances (last month of each FY in the series).
 */
export function aggregateToYears(
  amounts: number[],
  periods: SeriesPeriod[],
  mode: SeriesAggregateMode = "sum"
): { labels: string[]; amounts: number[] } {
  if (mode === "last") {
    const lastByYear = new Map<number, number>()
    for (let i = 0; i < periods.length; i++) {
      const fy = periods[i].fiscalYear
      lastByYear.set(fy, amounts[i])
    }
    const years = Array.from(lastByYear.keys()).sort((a, b) => a - b)
    return {
      labels: years.map((y) => y.toString()),
      amounts: years.map((y) => lastByYear.get(y) ?? 0),
    }
  }

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
 * Trouve une ligne de série par id / libellé, y compris dans les `detailRows` (comptes GL).
 * Retourne un `SeriesRow` « pseudo » pour le détail (sans sous-detail).
 */
export function findSeriesRowOrDetail(rows: SeriesRow[], idOrLabel: string): SeriesRow | undefined {
  const top = findRow(rows, idOrLabel)
  if (top) return top
  const raw = idOrLabel.trim()
  for (const r of rows) {
    const dr = r.detailRows?.find((d) => d.id === raw)
    if (dr) {
      return {
        id: dr.id,
        label: dr.label,
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: dr.amounts,
        detailRows: [],
      }
    }
  }
  return undefined
}

/**
 * Compute variation between two consecutive values.
 */
export function computeVariation(current: number, prior: number): number {
  if (prior === 0) return 0
  return ((current - prior) / Math.abs(prior)) * 100
}
