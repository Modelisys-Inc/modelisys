/**
 * Bénéfice net projeté pour Estimation du Bilan (CAP-C).
 * Aligné États des résultats pro forma :
 * BAI ≈ REV − Hyp. Dépenses − dotation Capex − intérêts Financement ;
 * Impôts = taux × max(0, BAI) ; BN = BAI − Impôts.
 */

import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { nMinusOneAndYtdActuals } from "@/lib/pro-forma-forecast-columns"
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

/** Ligne « Impôts » du compte de résultat (charge IMP — pas Bénéfice avant impôts). */
export function findTaxExpenseSeriesRow(rows: SeriesRow[]): SeriesRow | null {
  const codeOf = (row: SeriesRow) =>
    String(row.linkCode ?? "")
      .trim()
      .toUpperCase()

  // Parent IMP d’abord (pas IMP.1 / feuilles annexe).
  const exactCode = rows.find((row) => codeOf(row) === "IMP")
  if (exactCode) return exactCode

  const exactLabel = rows.find((row) => {
    const label = normLabel(String(row.label ?? ""))
    return label === "impots" || label === "impot"
  })
  if (exactLabel) return exactLabel

  const labeled = rows.find((row) => {
    const label = normLabel(String(row.label ?? ""))
    if (label.includes("avant impot")) return false
    return (
      label.startsWith("impots ") ||
      label.startsWith("impot ") ||
      (label.includes("impot") && (row.isResult === true || row.isBold === true))
    )
  })
  if (labeled) return labeled

  return (
    rows.find((row) => {
      const code = codeOf(row)
      return code.startsWith("IMP.") || code.startsWith("IMP-")
    }) ?? null
  )
}

/**
 * Charge d’impôts de l’exercice complet clos avant la date de référence (N-1),
 * comme la colonne N-1 du Sommaire Pro Forma — pas le YTD partiel de l’année courante.
 */
export function lastCompletedFiscalYearTaxExpense(
  row: SeriesRow | null,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth = 12,
): number {
  if (!row || !periods.length) return 0
  const { nMinusOne } = nMinusOneAndYtdActuals(
    row,
    periods,
    refMonth,
    refYear,
    fiscalYearEndMonth,
  )
  return Math.abs(nMinusOne)
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
 * Totaux BAI / impôts / bénéfice net par index config (0 = réel N-1, 1+ = projeté).
 * Années projetées = même cascade que le Sommaire Pro Forma.
 */
export function computeProjectedBaiTaxAndNetIncomeYearTotals(params: {
  projectionYears: number
  lastActualNetIncome: number
  projectedRevenueYearTotals: number[] | null | undefined
  projectedExpenseHypothesisYearTotals: number[] | null | undefined
  projectedAmortizationYearTotals?: number[] | null | undefined
  projectedInterestYearTotals?: number[] | null | undefined
  taxRate: number
}): { netIncome: number[]; taxExpense: number[] } {
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

  const netIncome: number[] = []
  const taxExpense: number[] = []
  for (let yearIndex = 0; yearIndex < numYears; yearIndex++) {
    if (yearIndex <= 0) {
      netIncome.push(lastActualNetIncome)
      taxExpense.push(0)
      continue
    }
    const rev = projectedRevenueYearTotals?.[yearIndex] ?? 0
    const exp = projectedExpenseHypothesisYearTotals?.[yearIndex] ?? 0
    const amort = projectedAmortizationYearTotals?.[yearIndex] ?? 0
    const interest = projectedInterestYearTotals?.[yearIndex] ?? 0
    const bai = rev - exp - amort - interest
    const tax = Math.round((Math.max(0, bai) * rate) / 100)
    taxExpense.push(tax)
    netIncome.push(bai - tax)
  }
  return { netIncome, taxExpense }
}

/**
 * Totaux bénéfice net par index config (0 = réel N-1, 1+ = projeté).
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
  return computeProjectedBaiTaxAndNetIncomeYearTotals(params).netIncome
}

/** Impôts (charge) projetés — même moteur que le poste Impôts du Sommaire Pro Forma. */
export function computeProjectedTaxExpenseYearTotals(params: {
  projectionYears: number
  lastActualNetIncome: number
  projectedRevenueYearTotals: number[] | null | undefined
  projectedExpenseHypothesisYearTotals: number[] | null | undefined
  projectedAmortizationYearTotals?: number[] | null | undefined
  projectedInterestYearTotals?: number[] | null | undefined
  taxRate: number
}): number[] {
  return computeProjectedBaiTaxAndNetIncomeYearTotals(params).taxExpense
}
