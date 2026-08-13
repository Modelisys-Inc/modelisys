import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"
import {
  fiscalYearAsOfLabelsFromReference,
  fiscalYearTrendFromReference,
  flowYearTrendFromReference,
  quarterTrendFromReference,
  referenceMonthYearLabelsFromReference,
  referenceQuarterMonthLabelsFromReference,
  trailingQuarterMonthLabelsFromReference,
  trailingQuarterTrendFromReference,
} from "@/lib/series-reference-columns"

/** Base des colonnes Annuel 5 ans / Trimestriel 2 ans (Résultats). */
export type IncomeStatementPeriodBasis = "current" | "fiscal"

export const INCOME_STATEMENT_PERIOD_BASIS_LABEL = {
  current: "Courant",
  fiscal: "Exercice",
} as const

export const INCOME_STATEMENT_QUARTER_COUNT = 5

export function incomeStatementYearLabelsForBasis(
  refMonth: number,
  refYear: number,
  basis: IncomeStatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = PERFORMANCE_CHART_YEAR_COUNT,
): string[] {
  if (basis === "fiscal") {
    return fiscalYearAsOfLabelsFromReference(refMonth, refYear, count, fiscalYearEndMonth)
  }
  return referenceMonthYearLabelsFromReference(refMonth, refYear, count)
}

export function incomeStatementYearTrendForBasis(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  basis: IncomeStatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = PERFORMANCE_CHART_YEAR_COUNT,
): number[] {
  if (basis === "fiscal") {
    return fiscalYearTrendFromReference(row, periods, refMonth, refYear, count, fiscalYearEndMonth)
  }
  return flowYearTrendFromReference(row, periods, refMonth, refYear, count)
}

export function incomeStatementQuarterLabelsForBasis(
  refMonth: number,
  refYear: number,
  basis: IncomeStatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = INCOME_STATEMENT_QUARTER_COUNT,
): string[] {
  if (basis === "fiscal") {
    return referenceQuarterMonthLabelsFromReference(refMonth, refYear, count, fiscalYearEndMonth)
  }
  return trailingQuarterMonthLabelsFromReference(refMonth, refYear, count)
}

export function incomeStatementQuarterTrendForBasis(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  basis: IncomeStatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = INCOME_STATEMENT_QUARTER_COUNT,
): number[] {
  if (basis === "fiscal") {
    return quarterTrendFromReference(row, periods, refMonth, refYear, count, fiscalYearEndMonth)
  }
  return trailingQuarterTrendFromReference(row, periods, refMonth, refYear, count)
}
