/**
 * Bénéfice net projeté pour Estimation du Bilan (CAP-C).
 * Aligné sur les hypothèses Revenus : marge nette × CA projeté
 * (même base que Résultats pro forma tant que les hyp. revenus sont la source principale).
 */

import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { aggregateToYears, getRowAmounts } from "@/lib/series-utils"

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

function normLabel(label: string): string {
  return stripAccents(label).trim().toLowerCase()
}

/** Ligne « Bénéfice net » du compte de résultat (résultat / sous-total). */
export function findNetIncomeSeriesRow(rows: SeriesRow[]): SeriesRow | null {
  const exact = rows.find((row) => {
    const label = normLabel(String(row.label ?? ""))
    return label === "benefice net" || label === "benefices nets"
  })
  if (exact) return exact
  return (
    rows.find((row) => {
      const label = normLabel(String(row.label ?? ""))
      return label.includes("benefice net") && (row.isResult === true || row.isBold === true)
    }) ?? null
  )
}

export function lastActualAnnualAmount(
  row: SeriesRow | null,
  periods: SeriesPeriod[],
): number {
  if (!row || !periods.length) return 0
  const rawAmounts = getRowAmounts(row, periods)
  const { amounts } = aggregateToYears(rawAmounts, periods)
  return amounts.length > 0 ? amounts[amounts.length - 1]! : 0
}

/**
 * Totaux bénéfice net par index config (0 = réel N-1, 1+ = projeté).
 * Années projetées = CA projeté × (BN N-1 / CA N-1), sinon BN N-1.
 */
export function computeProjectedNetIncomeYearTotals(params: {
  projectionYears: number
  lastActualNetIncome: number
  lastActualRevenue: number
  projectedRevenueYearTotals: number[] | null | undefined
}): number[] {
  const { projectionYears, lastActualNetIncome, lastActualRevenue, projectedRevenueYearTotals } =
    params
  const numYears = projectionYears + 1
  const margin =
    lastActualRevenue !== 0 && Number.isFinite(lastActualRevenue)
      ? lastActualNetIncome / lastActualRevenue
      : 0

  return Array.from({ length: numYears }, (_, yearIndex) => {
    if (yearIndex <= 0) return lastActualNetIncome
    const rev = projectedRevenueYearTotals?.[yearIndex]
    if (typeof rev === "number" && Number.isFinite(rev) && lastActualRevenue !== 0) {
      return Math.round(rev * margin)
    }
    return lastActualNetIncome
  })
}
