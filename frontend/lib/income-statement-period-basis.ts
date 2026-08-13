import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"
import {
  balanceSheetFiscalYearTrendFromReference,
  balanceSheetYearTrendFromReference,
  fiscalYearAsOfLabelsFromReference,
  fiscalYearTrendFromReference,
  flowQuarterSnapshotTrendFromReference,
  flowYearSnapshotTrendFromReference,
  flowYearTrendFromReference,
  quarterTrendFromReference,
  referenceMonthYearLabelsFromReference,
  referenceQuarterMonthLabelsFromReference,
  trailingQuarterMonthLabelsFromReference,
  trailingQuarterSnapshotTrendFromReference,
  trailingQuarterTrendFromReference,
} from "@/lib/series-reference-columns"

/** Base des colonnes Annuel 5 ans / Trimestriel 2 ans (Résultats, Bilan, Trésorerie). */
export type IncomeStatementPeriodBasis = "current" | "fiscal"
export type StatementPeriodBasis = IncomeStatementPeriodBasis

export const INCOME_STATEMENT_PERIOD_BASIS_LABEL = {
  current: "Courant",
  fiscal: "Exercice",
} as const

export const STATEMENT_PERIOD_BASIS_LABEL = INCOME_STATEMENT_PERIOD_BASIS_LABEL

export const INCOME_STATEMENT_QUARTER_COUNT = 5
export const STATEMENT_QUARTER_COUNT = INCOME_STATEMENT_QUARTER_COUNT

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

export const statementYearLabelsForBasis = incomeStatementYearLabelsForBasis
export const statementQuarterLabelsForBasis = incomeStatementQuarterLabelsForBasis

/** Bilan : snapshot à la date de chaque colonne (pas une somme). */
export function balanceSheetYearTrendForBasis(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  basis: StatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = PERFORMANCE_CHART_YEAR_COUNT,
): number[] {
  if (basis === "fiscal") {
    return balanceSheetFiscalYearTrendFromReference(
      row,
      periods,
      refMonth,
      refYear,
      count,
      fiscalYearEndMonth,
    )
  }
  return balanceSheetYearTrendFromReference(row, periods, refMonth, refYear, count)
}

export function balanceSheetQuarterTrendForBasis(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  basis: StatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = STATEMENT_QUARTER_COUNT,
): number[] {
  if (basis === "fiscal") {
    return flowQuarterSnapshotTrendFromReference(
      row,
      periods,
      refMonth,
      refYear,
      count,
      fiscalYearEndMonth,
    )
  }
  return trailingQuarterSnapshotTrendFromReference(row, periods, refMonth, refYear, count)
}

/** Trésorerie : snapshot au mois de la colonne (base Variation ; Réel est recalculé via les libellés). */
export function cashFlowYearSnapshotTrendForBasis(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  basis: StatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = PERFORMANCE_CHART_YEAR_COUNT,
): number[] {
  if (basis === "fiscal") {
    return balanceSheetFiscalYearTrendFromReference(
      row,
      periods,
      refMonth,
      refYear,
      count,
      fiscalYearEndMonth,
    )
  }
  return flowYearSnapshotTrendFromReference(row, periods, refMonth, refYear, count)
}

export function cashFlowQuarterSnapshotTrendForBasis(
  row: SeriesRow,
  periods: SeriesPeriod[],
  refMonth: number,
  refYear: number,
  basis: StatementPeriodBasis,
  fiscalYearEndMonth = 12,
  count = STATEMENT_QUARTER_COUNT,
): number[] {
  if (basis === "fiscal") {
    return flowQuarterSnapshotTrendFromReference(
      row,
      periods,
      refMonth,
      refYear,
      count,
      fiscalYearEndMonth,
    )
  }
  return trailingQuarterSnapshotTrendFromReference(row, periods, refMonth, refYear, count)
}
