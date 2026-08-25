import type { DebtForecastLoan } from "@/lib/debt-forecast-types"
import { isDebtHypothesisDefined } from "@/lib/debt-forecast-types"

export type DebtForecastYearTotals = {
  beginningBalance: number
  totalPayment: number
  principalPayment: number
  interestPayment: number
  endingBalance: number
}

export const EMPTY_DEBT_FORECAST_YEAR_TOTALS: DebtForecastYearTotals = {
  beginningBalance: 0,
  totalPayment: 0,
  principalPayment: 0,
  interestPayment: 0,
  endingBalance: 0,
}

export type DebtForecastLoanYearData = Pick<
  DebtForecastYearTotals,
  | "beginningBalance"
  | "totalPayment"
  | "principalPayment"
  | "interestPayment"
  | "endingBalance"
>

/**
 * Agrège les montants annuels d'un sous-ensemble d'emprunts (ligne ou sous-total de section).
 * Les emprunts sans hypothèse définie reprennent le capital d'ouverture (comme les lignes du tableau).
 */
export function computeDebtForecastYearTotals(
  loans: DebtForecastLoan[],
  yearIndex: number,
  getYearData: (loan: DebtForecastLoan, yearIndex: number) => DebtForecastLoanYearData | null,
): DebtForecastYearTotals {
  const totals = { ...EMPTY_DEBT_FORECAST_YEAR_TOTALS }

  for (const loan of loans) {
    if (!isDebtHypothesisDefined(loan)) {
      totals.beginningBalance += loan.principal
      totals.endingBalance += loan.principal
      continue
    }

    const yearData = getYearData(loan, yearIndex)
    if (!yearData) continue

    totals.beginningBalance += yearData.beginningBalance
    totals.totalPayment += yearData.totalPayment
    totals.principalPayment += yearData.principalPayment
    totals.interestPayment += yearData.interestPayment
    totals.endingBalance += yearData.endingBalance
  }

  return totals
}
