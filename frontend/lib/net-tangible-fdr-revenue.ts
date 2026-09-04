/**
 * Revenus TTM pour FDR représentatif — même moteur que CDR Sommaire / Détail
 * (série mensuelle + somme des 12 mois se terminant à la date de référence, base Courant).
 */

import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  buildAmountsByCalendarMonth,
  sumTTMEndingAtCalendarMonth,
} from "@/lib/series-reference-columns"
import { findRow } from "@/lib/series-utils"

/** Fenêtre série à charger (12 mois glissants se terminant à la date de référence). */
export const NET_TANGIBLE_REVENUE_TTM_MONTHS = 12

/** Poste Revenus du CDR (ancre REV / libellé), comme Sommaire et FDR analyse. */
export function findIncomeStatementRevenueRow(rows: SeriesRow[]): SeriesRow | undefined {
  const exactNonSection = rows.find(
    (r) => r.label.trim().toLowerCase() === "revenus" && !r.isSection,
  )
  if (exactNonSection) return exactNonSection

  const byRevCode = rows.find((r) => {
    const code = String(r.linkCode ?? r.id ?? "").trim().toUpperCase()
    return code === "REV" && !r.isSection
  })
  if (byRevCode) return byRevCode

  return findRow(rows, "total revenus") || findRow(rows, "revenus")
}

/**
 * TTM au mois civil `(refMonth, refYear)` — identique à la 1re colonne
 * Annuel 5 ans / Courant du CDR (`flowYearTrendFromReference` / `sumTTMEndingAtCalendarMonth`).
 */
export function computeRevenueTtmFromIncomeStatementSeries(
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
): number | null {
  const row = findIncomeStatementRevenueRow(rows)
  if (!row || periods.length === 0) return null
  const ttm = sumTTMEndingAtCalendarMonth(
    buildAmountsByCalendarMonth(row, periods),
    refMonth,
    refYear,
  )
  if (!Number.isFinite(ttm)) return null
  return ttm
}
