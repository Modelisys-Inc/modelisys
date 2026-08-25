/**
 * Bénéfice net projeté pour Estimation du Bilan (CAP-C).
 * Aligné États des résultats pro forma :
 * BAI ≈ REV − Hyp. Dépenses − dotation Capex − intérêts Financement ;
 * Impôts = taux × max(0, BAI) ; BN = BAI − Impôts.
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
 * Années projetées = même cascade que le Sommaire Pro Forma (BAI − impôts).
 */
export function computeProjectedNetIncomeYearTotals(params: {
  projectionYears: number
  lastActualNetIncome: number
  projectedRevenueYearTotals: number[] | null | undefined
  projectedExpenseHypothesisYearTotals: number[] | null | undefined
  projectedAmortizationYearTotals?: number[] | null | undefined
  projectedInterestYearTotals?: number[] | null | undefined
  taxRate: number
}): number[] {
  const {
    projectionYears,
    lastActualNetIncome,
    projectedRevenueYearTotals,
    projectedExpenseHypothesisYearTotals,
    projectedAmortizationYearTotals,
    projectedInterestYearTotals,
    taxRate,
  } = params
  const numYears = projectionYears + 1
  const rate = Number.isFinite(taxRate) ? Math.min(100, Math.max(0, taxRate)) : 0

  return Array.from({ length: numYears }, (_, yearIndex) => {
    if (yearIndex <= 0) return lastActualNetIncome
    const rev = projectedRevenueYearTotals?.[yearIndex] ?? 0
    const exp = projectedExpenseHypothesisYearTotals?.[yearIndex] ?? 0
    const amort = projectedAmortizationYearTotals?.[yearIndex] ?? 0
    const interest = projectedInterestYearTotals?.[yearIndex] ?? 0
    const bai = rev - exp - amort - interest
    const tax = Math.round((Math.max(0, bai) * rate) / 100)
    return bai - tax
  })
}
