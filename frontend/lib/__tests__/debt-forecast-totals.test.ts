import { describe, expect, it } from "vitest"
import type { DebtForecastLoan } from "../debt-forecast-types"
import { computeDebtForecastYearTotals } from "../debt-forecast-totals"

const loan = (partial: Partial<DebtForecastLoan> & Pick<DebtForecastLoan, "id">): DebtForecastLoan => ({
  name: partial.name ?? "Emprunt",
  principal: 100_000,
  interestRate: 0,
  remainingPayments: 12,
  startMonth: 0,
  repaymentMode: "capital_and_interest",
  sourceType: "mapping",
  hypothesisDefined: true,
  ...partial,
})

describe("computeDebtForecastYearTotals", () => {
  const getYearData = (l: DebtForecastLoan, yearIndex: number) => {
    if (yearIndex === 0) {
      return l.id === "a"
        ? {
            beginningBalance: 26_164,
            totalPayment: 5_000,
            principalPayment: 5_000,
            interestPayment: 0,
            endingBalance: 21_164,
          }
        : {
            beginningBalance: 1_000_000,
            totalPayment: 100_000,
            principalPayment: 80_000,
            interestPayment: 20_000,
            endingBalance: 920_000,
          }
    }
    return null
  }

  it("sums only the loans in the provided subset", () => {
    const pltD = loan({ id: "a", sourceLinkCode: "PLT-D.1", principal: 26_164 })
    const pltC = loan({ id: "b", sourceLinkCode: "PLT-C.1", principal: 1_000_000 })

    const groupTotal = computeDebtForecastYearTotals([pltD], 0, getYearData)
    expect(groupTotal.beginningBalance).toBe(26_164)
    expect(groupTotal.endingBalance).toBe(21_164)

    const grandTotal = computeDebtForecastYearTotals([pltD, pltC], 0, getYearData)
    expect(grandTotal.beginningBalance).toBe(1_026_164)
  })

  it("uses opening principal for undefined hypotheses", () => {
    const undefinedHyp = loan({
      id: "u",
      hypothesisDefined: false,
      remainingPayments: 0,
      principal: 75_000,
    })
    const totals = computeDebtForecastYearTotals([undefinedHyp], 0, getYearData)
    expect(totals.beginningBalance).toBe(75_000)
    expect(totals.endingBalance).toBe(75_000)
    expect(totals.totalPayment).toBe(0)
  })

  it("returns zero for an empty subset", () => {
    const totals = computeDebtForecastYearTotals([], 0, getYearData)
    expect(totals.beginningBalance).toBe(0)
  })
})
