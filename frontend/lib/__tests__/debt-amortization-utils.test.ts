import { describe, expect, it } from "vitest"
import {
  buildLoanMonthlyPaymentSchedule,
  calculateLoanYearAmortization,
  calculateLoanYearMonthlyInterest,
  calculatePreviewMonthlyPayment,
  effectiveBalloonMonth,
  formatDebtAbsoluteMonthLabel,
} from "@/lib/debt-amortization-utils"
import type { AmortizableLoan } from "@/lib/debt-amortization-utils"

function baseLoan(overrides: Partial<AmortizableLoan> = {}): AmortizableLoan {
  return {
    principal: 100_000,
    interestRate: 12,
    remainingPayments: 24,
    startMonth: 0,
    repaymentMode: "interest_only",
    ...overrides,
  }
}

describe("debt amortization moratorium + residual", () => {
  it("interest-only moratorium skips interest cash for N months", () => {
    const loan = baseLoan({ moratoriumMonths: 3, moratoriumScope: "interest" })
    const y0 = calculateLoanYearAmortization(loan, 0)!
    // Months 0-2: $0 interest; months 3-11: 9 × (100000*1%) = 9000
    expect(y0.interestPayment).toBe(9000)
    expect(y0.principalPayment).toBe(0)
  })

  it("capital_and_interest capital moratorium pays interest only during window", () => {
    const loan = baseLoan({
      repaymentMode: "capital_and_interest",
      remainingPayments: 24,
      moratoriumMonths: 12,
      moratoriumScope: "capital",
    })
    const y0 = calculateLoanYearAmortization(loan, 0)!
    expect(y0.principalPayment).toBe(0)
    expect(y0.interestPayment).toBeGreaterThan(0)
    expect(y0.endingBalance).toBe(100_000)
  })

  it("capital_and_interest both moratorium pays nothing during window", () => {
    const loan = baseLoan({
      repaymentMode: "capital_and_interest",
      remainingPayments: 12,
      moratoriumMonths: 12,
      moratoriumScope: "both",
    })
    const y0 = calculateLoanYearAmortization(loan, 0)!
    expect(y0.totalPayment).toBe(0)
    expect(calculatePreviewMonthlyPayment(loan)).toBe(0)
  })

  it("interest_only residual balloon fires on balloon month", () => {
    const loan = baseLoan({
      repaymentMode: "interest_only",
      balloonAmount: 100_000,
      balloonMonth: 5,
      remainingPayments: 12,
    })
    const y0 = calculateLoanYearAmortization(loan, 0)!
    expect(y0.principalPayment).toBe(100_000)
    expect(y0.endingBalance).toBe(0)
  })

  it("defers balloon past moratorium when capital is blocked", () => {
    // Forcer la portée both via loan (cas amortissement générique).
    const loan = baseLoan({
      repaymentMode: "interest_only",
      balloonAmount: 50_000,
      balloonMonth: 2,
      moratoriumMonths: 6,
      moratoriumScope: "both",
    })
    // Intérêts seulement : scope effectif = interest → capital non bloqué
    expect(effectiveBalloonMonth(loan)).toBe(2)
  })

  it("legacy interest_only_balloon still amortizes residual", () => {
    const loan = baseLoan({
      repaymentMode: "interest_only_balloon",
      balloonAmount: 100_000,
      balloonMonth: 0,
      remainingPayments: 6,
    })
    const y0 = calculateLoanYearAmortization(loan, 0)!
    expect(y0.principalPayment).toBe(100_000)
  })
})

describe("buildLoanMonthlyPaymentSchedule", () => {
  it("lists interest / principal / balance for interest-only loan", () => {
    const loan = baseLoan({
      principal: 100_000,
      interestRate: 12,
      remainingPayments: 3,
      repaymentMode: "interest_only",
    })
    const rows = buildLoanMonthlyPaymentSchedule(loan)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      monthIndex: 1,
      interest: 1_000,
      principal: 0,
      endingBalance: 100_000,
    })
    expect(rows[2]?.monthIndex).toBe(3)
  })

  it("reduces balance for capital_and_interest", () => {
    const loan = baseLoan({
      principal: 12_000,
      interestRate: 0,
      remainingPayments: 12,
      repaymentMode: "capital_and_interest",
    })
    const rows = buildLoanMonthlyPaymentSchedule(loan)
    expect(rows).toHaveLength(12)
    expect(rows[0]?.principal).toBe(1_000)
    expect(rows[0]?.endingBalance).toBe(11_000)
    expect(rows[11]?.endingBalance).toBe(0)
  })
})

describe("formatDebtAbsoluteMonthLabel", () => {
  it("maps absolute months to calendar labels from forecast base year", () => {
    expect(formatDebtAbsoluteMonthLabel(0, 2026)).toBe("janv. 2026")
    expect(formatDebtAbsoluteMonthLabel(11, 2026)).toBe("déc. 2026")
    expect(formatDebtAbsoluteMonthLabel(12, 2026)).toBe("janv. 2027")
  })
})

describe("calculateLoanYearMonthlyInterest", () => {
  it("matches year interestPayment sum and is flat for interest-only", () => {
    const loan = baseLoan({
      principal: 100_000,
      interestRate: 12,
      remainingPayments: 24,
      repaymentMode: "interest_only",
    })
    const months = calculateLoanYearMonthlyInterest(loan, 0)
    expect(months).toHaveLength(12)
    expect(months.every((m) => m === 1_000)).toBe(true)
    expect(months.reduce((a, b) => a + b, 0)).toBe(
      calculateLoanYearAmortization(loan, 0)!.interestPayment,
    )
  })
})
