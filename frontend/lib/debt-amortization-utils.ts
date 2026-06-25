import type { DebtForecastLoan, DebtRepaymentMode } from "@/lib/debt-forecast-types"

export type LoanYearAmortization = {
  beginningBalance: number
  totalPayment: number
  principalPayment: number
  interestPayment: number
  endingBalance: number
}

export type AmortizableLoan = Pick<
  DebtForecastLoan,
  | "principal"
  | "interestRate"
  | "remainingPayments"
  | "startMonth"
  | "repaymentMode"
  | "balloonAmount"
  | "balloonMonth"
>

function effectiveRepaymentMode(loan: AmortizableLoan): DebtRepaymentMode {
  return loan.repaymentMode ?? "interest_only"
}

export function calculateMonthlyLoanPayment(
  balance: number,
  annualRatePercent: number,
  numPayments: number,
): number {
  if (numPayments <= 0 || balance <= 0) return 0
  if (annualRatePercent === 0) return balance / numPayments
  const monthlyRate = annualRatePercent / 100 / 12
  if (monthlyRate === 0) return balance / numPayments
  return (
    (balance * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  )
}

function processLoanMonth(
  absoluteMonth: number,
  currentBalance: number,
  remainingPayments: number,
  loan: AmortizableLoan,
): {
  interest: number
  principal: number
  newBalance: number
  newRemaining: number
} {
  if (currentBalance <= 0 || remainingPayments <= 0 || absoluteMonth < loan.startMonth) {
    return { interest: 0, principal: 0, newBalance: currentBalance, newRemaining: remainingPayments }
  }

  const mode = effectiveRepaymentMode(loan)
  const monthlyRate = loan.interestRate / 100 / 12
  const interest = currentBalance * monthlyRate
  let principal = 0

  if (mode === "capital_and_interest") {
    const monthlyPayment = calculateMonthlyLoanPayment(
      currentBalance,
      loan.interestRate,
      remainingPayments,
    )
    principal = Math.min(monthlyPayment - interest, currentBalance)
  } else if (
    mode === "interest_only_balloon" &&
    loan.balloonMonth != null &&
    absoluteMonth === loan.balloonMonth
  ) {
    principal = Math.min(loan.balloonAmount ?? currentBalance, currentBalance)
  }

  return {
    interest,
    principal,
    newBalance: Math.max(0, currentBalance - principal),
    newRemaining: remainingPayments - 1,
  }
}

function simulateToMonth(
  loan: AmortizableLoan,
  targetMonthExclusive: number,
): { balance: number; remainingPayments: number } {
  let balance = loan.principal
  let remainingPayments = loan.remainingPayments

  for (let m = loan.startMonth; m < targetMonthExclusive; m++) {
    if (balance <= 0 || remainingPayments <= 0) break
    const step = processLoanMonth(m, balance, remainingPayments, loan)
    balance = step.newBalance
    remainingPayments = step.newRemaining
  }

  return { balance, remainingPayments }
}

export function calculateMonthlyInterestPayment(
  principal: number,
  annualRatePercent: number,
): number {
  if (principal <= 0 || annualRatePercent <= 0) return 0
  return Math.round((principal * annualRatePercent) / 100 / 12)
}

export function calculatePreviewMonthlyPayment(loan: AmortizableLoan): number {
  if (effectiveRepaymentMode(loan) === "capital_and_interest") {
    return Math.round(
      calculateMonthlyLoanPayment(loan.principal, loan.interestRate, loan.remainingPayments),
    )
  }
  return calculateMonthlyInterestPayment(loan.principal, loan.interestRate)
}

/** Amortissement annuel selon le mode de remboursement. */
export function calculateLoanYearAmortization(
  loan: AmortizableLoan,
  yearIndex: number,
): LoanYearAmortization | null {
  const yearStartMonth = yearIndex * 12
  const yearEndMonth = (yearIndex + 1) * 12 - 1

  if (loan.startMonth > yearEndMonth) return null

  const atYearStart = simulateToMonth(loan, yearStartMonth)
  let currentBalance = atYearStart.balance
  let remainingPayments = atYearStart.remainingPayments
  const beginningBalance = currentBalance

  let totalPrincipal = 0
  let totalInterest = 0

  const firstMonth = Math.max(yearStartMonth, loan.startMonth)
  for (let m = firstMonth; m <= yearEndMonth; m++) {
    if (currentBalance <= 0 || remainingPayments <= 0) break
    const step = processLoanMonth(m, currentBalance, remainingPayments, loan)
    totalInterest += step.interest
    totalPrincipal += step.principal
    currentBalance = step.newBalance
    remainingPayments = step.newRemaining
  }

  if (
    beginningBalance <= 0 &&
    totalPrincipal === 0 &&
    totalInterest === 0 &&
    loan.startMonth > yearEndMonth
  ) {
    return null
  }

  return {
    beginningBalance: Math.round(beginningBalance),
    totalPayment: Math.round(totalPrincipal + totalInterest),
    principalPayment: Math.round(totalPrincipal),
    interestPayment: Math.round(totalInterest),
    endingBalance: Math.round(currentBalance),
  }
}
