import { describe, expect, it } from "vitest"
import type { DebtForecastLoan } from "../debt-forecast-types"
import {
  debtAmortYearIndexFromBilanConfigYear,
  debtLoanMatchesBilanLinkCode,
  parseDebtForecastLoans,
  resolveFinancingDrivenBilanProjectedAmount,
} from "../debt-forecast-resolve"

const loan = (partial: Partial<DebtForecastLoan> & Pick<DebtForecastLoan, "id" | "sourceLinkCode">): DebtForecastLoan => ({
  name: "Emprunt test",
  principal: 100_000,
  interestRate: 0,
  remainingPayments: 24,
  startMonth: 0,
  repaymentMode: "capital_and_interest",
  sourceType: "mapping",
  hypothesisDefined: true,
  ...partial,
})

describe("debtLoanMatchesBilanLinkCode", () => {
  it("matches parent and leaf codes", () => {
    expect(debtLoanMatchesBilanLinkCode("PLT-C.1", "PLT-C")).toBe(true)
    expect(debtLoanMatchesBilanLinkCode("PLT-C.1", "PLT-C.1")).toBe(true)
    expect(debtLoanMatchesBilanLinkCode("PLT-C", "PLT-C.1")).toBe(true)
    expect(debtLoanMatchesBilanLinkCode("PLT-D.1", "PLT-C")).toBe(false)
    expect(debtLoanMatchesBilanLinkCode("PCT-H.1", "PCT-H")).toBe(true)
  })
})

describe("debtAmortYearIndexFromBilanConfigYear", () => {
  it("maps bilan config years to debt amort years", () => {
    expect(debtAmortYearIndexFromBilanConfigYear(0)).toBeNull()
    expect(debtAmortYearIndexFromBilanConfigYear(1)).toBe(0)
    expect(debtAmortYearIndexFromBilanConfigYear(2)).toBe(1)
  })
})

describe("resolveFinancingDrivenBilanProjectedAmount", () => {
  it("keeps actual base on year 0", () => {
    expect(
      resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PLT-C",
        configYearIndex: 0,
        actualBase: 250_000,
        loans: [loan({ id: "1", sourceLinkCode: "PLT-C.1", principal: 100_000 })],
      }),
    ).toBe(250_000)
  })

  it("sums ending balances of matching defined loans", () => {
    const loans = [
      loan({
        id: "1",
        sourceLinkCode: "PLT-C.1",
        principal: 120_000,
        interestRate: 0,
        remainingPayments: 12,
        repaymentMode: "interest_only",
      }),
      loan({
        id: "2",
        sourceLinkCode: "PLT-D.1",
        principal: 50_000,
        interestRate: 0,
        remainingPayments: 12,
        repaymentMode: "interest_only",
      }),
    ]
    // interest_only, rate 0 → ending = principal after year 0
    expect(
      resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PLT-C",
        configYearIndex: 1,
        actualBase: 0,
        loans,
      }),
    ).toBe(120_000)
    expect(
      resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PLT-D",
        configYearIndex: 1,
        actualBase: 0,
        loans,
      }),
    ).toBe(50_000)
  })

  it("returns 0 when no matching hyp or undefined mapping loans", () => {
    expect(
      resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PCT-H",
        configYearIndex: 1,
        actualBase: 10_000,
        loans: [],
      }),
    ).toBe(0)
    expect(
      resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PLT-C",
        configYearIndex: 1,
        actualBase: 10_000,
        loans: [
          loan({
            id: "1",
            sourceLinkCode: "PLT-C.1",
            hypothesisDefined: false,
            remainingPayments: 0,
          }),
        ],
      }),
    ).toBe(0)
  })
})

describe("parseDebtForecastLoans", () => {
  it("reads loans array from config data", () => {
    expect(parseDebtForecastLoans({ loans: [loan({ id: "x", sourceLinkCode: "PCT-I" })] })).toHaveLength(
      1,
    )
    expect(parseDebtForecastLoans({})).toEqual([])
  })
})
