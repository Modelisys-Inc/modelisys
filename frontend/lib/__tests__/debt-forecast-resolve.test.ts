import { describe, expect, it } from "vitest"
import type { DebtForecastLoan } from "../debt-forecast-types"
import {
  debtAmortYearIndexFromBilanConfigYear,
  debtLoanMatchesBilanLinkCode,
  debtLinkCodeForInterestIsLinkCode,
  financingBilanLoanMatchCode,
  interestIsLinkCodeForDebtLinkCode,
  isDebtDrivenInterestIsLinkCode,
  isFinancingBilanCurrentPortionCode,
  parseDebtForecastLoans,
  resolveDebtDrivenInterestExpense,
  resolveDebtDrivenInterestExpenseMonthly,
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

describe("financingBilanLoanMatchCode", () => {
  it("maps current portion rows to long-term loan roots", () => {
    expect(financingBilanLoanMatchCode("PCT-H")).toBe("PLT-C")
    expect(financingBilanLoanMatchCode("PCT-H.1")).toBe("PLT-C.1")
    expect(financingBilanLoanMatchCode("PCT-I")).toBe("PLT-D")
    expect(financingBilanLoanMatchCode("PCT-I.2")).toBe("PLT-D.2")
    expect(financingBilanLoanMatchCode("PLT-C.1")).toBe("PLT-C.1")
    expect(financingBilanLoanMatchCode("PLT-D")).toBe("PLT-D")
  })
})

describe("isFinancingBilanCurrentPortionCode", () => {
  it("flags PCT-H/I only", () => {
    expect(isFinancingBilanCurrentPortionCode("PCT-H")).toBe(true)
    expect(isFinancingBilanCurrentPortionCode("PCT-I.1")).toBe(true)
    expect(isFinancingBilanCurrentPortionCode("PLT-C")).toBe(false)
    expect(isFinancingBilanCurrentPortionCode("PLT-D.1")).toBe(false)
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

  it("splits LT debt into current portion (next 12m P+I) and LT balance", () => {
    const pltLoan = loan({
      id: "1",
      sourceLinkCode: "PLT-C.1",
      principal: 120_000,
      interestRate: 0,
      remainingPayments: 24,
      repaymentMode: "capital_and_interest",
    })
    const loans = [pltLoan]

    const pctH = resolveFinancingDrivenBilanProjectedAmount({
      linkCode: "PCT-H",
      configYearIndex: 1,
      actualBase: 0,
      loans,
    })
    const pltC = resolveFinancingDrivenBilanProjectedAmount({
      linkCode: "PLT-C",
      configYearIndex: 1,
      actualBase: 0,
      loans,
    })

    // Year 0 ending = 60k ; year 1 payments = 60k (0 % C&I)
    expect(pctH).toBe(60_000)
    expect(pltC).toBe(0)
    expect(pctH + pltC).toBe(60_000)
  })

  it("keeps PLT non-negative when next-year interest would otherwise overshoot principal", () => {
    const loans = [
      loan({
        id: "1",
        sourceLinkCode: "PLT-D.1",
        principal: 26_164,
        interestRate: 5,
        remainingPayments: 36,
        repaymentMode: "capital_and_interest",
      }),
    ]

    for (let configYearIndex = 1; configYearIndex <= 5; configYearIndex++) {
      const pltD = resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PLT-D",
        configYearIndex,
        actualBase: 0,
        loans,
      })
      const pctI = resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PCT-I",
        configYearIndex,
        actualBase: 0,
        loans,
      })
      expect(pltD).toBeGreaterThanOrEqual(0)
      expect(pctI).toBeGreaterThanOrEqual(0)
    }
  })

  it("derives PCT-H from PLT-C loans (no direct PCT-H mapping)", () => {
    const loans = [
      loan({
        id: "1",
        sourceLinkCode: "PLT-C.1",
        principal: 300_000,
        interestRate: 6,
        remainingPayments: 60,
        repaymentMode: "capital_and_interest",
      }),
    ]
    const pctH = resolveFinancingDrivenBilanProjectedAmount({
      linkCode: "PCT-H",
      configYearIndex: 1,
      actualBase: 0,
      loans,
    })
    const pltC = resolveFinancingDrivenBilanProjectedAmount({
      linkCode: "PLT-C",
      configYearIndex: 1,
      actualBase: 0,
      loans,
    })
    expect(pctH).toBeGreaterThan(0)
    expect(pltC).toBeGreaterThan(0)
    expect(pctH + pltC).toBeGreaterThan(0)
  })

  it("interest_only at 0 % keeps full balance on PLT-C and 0 on PCT-H", () => {
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
    expect(
      resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PCT-H",
        configYearIndex: 1,
        actualBase: 0,
        loans,
      }),
    ).toBe(0)
    expect(
      resolveFinancingDrivenBilanProjectedAmount({
        linkCode: "PCT-I",
        configYearIndex: 1,
        actualBase: 0,
        loans,
      }),
    ).toBe(0)
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

describe("debt interest → income statement mapping", () => {
  it("maps FIN.3 ↔ PLT-C and FIN.4 ↔ PLT-D", () => {
    expect(isDebtDrivenInterestIsLinkCode("FIN.3")).toBe(true)
    expect(isDebtDrivenInterestIsLinkCode("FIN.4")).toBe(true)
    expect(isDebtDrivenInterestIsLinkCode("FIN.2")).toBe(false)
    expect(debtLinkCodeForInterestIsLinkCode("FIN.3")).toBe("PLT-C")
    expect(debtLinkCodeForInterestIsLinkCode("FIN.4")).toBe("PLT-D")
    expect(interestIsLinkCodeForDebtLinkCode("PLT-C.1")).toBe("FIN.3")
    expect(interestIsLinkCodeForDebtLinkCode("PLT-D")).toBe("FIN.4")
  })
})

describe("resolveDebtDrivenInterestExpense", () => {
  it("sums interestPayment for PLT-C loans into FIN.3", () => {
    const pltC = loan({
      id: "1",
      sourceLinkCode: "PLT-C",
      principal: 100_000,
      interestRate: 12,
      remainingPayments: 24,
      repaymentMode: "interest_only",
    })
    const pltD = loan({
      id: "2",
      sourceLinkCode: "PLT-D",
      principal: 50_000,
      interestRate: 12,
      remainingPayments: 24,
      repaymentMode: "interest_only",
    })
    const year1 = resolveDebtDrivenInterestExpense({
      isLinkCode: "FIN.3",
      configYearIndex: 1,
      loans: [pltC, pltD],
    })
    // Interest-only 12% on 100k ≈ 12_000 (PLT-D excluded)
    expect(year1).toBe(12_000)
    expect(
      resolveDebtDrivenInterestExpense({
        isLinkCode: "FIN.4",
        configYearIndex: 1,
        loans: [pltC, pltD],
      }),
    ).toBe(6_000)
  })

  it("returns 0 on year 0 and when no matching loans", () => {
    expect(
      resolveDebtDrivenInterestExpense({
        isLinkCode: "FIN.3",
        configYearIndex: 0,
        loans: [loan({ id: "1", sourceLinkCode: "PLT-C", interestRate: 10 })],
      }),
    ).toBe(0)
    expect(
      resolveDebtDrivenInterestExpense({
        isLinkCode: "FIN.3",
        configYearIndex: 1,
        loans: [loan({ id: "1", sourceLinkCode: "PLT-D", interestRate: 10 })],
      }),
    ).toBe(0)
  })

  it("skips mapping loans without defined hypothesis", () => {
    expect(
      resolveDebtDrivenInterestExpense({
        isLinkCode: "FIN.3",
        configYearIndex: 1,
        loans: [
          loan({
            id: "1",
            sourceLinkCode: "PLT-C",
            interestRate: 12,
            hypothesisDefined: false,
            remainingPayments: 0,
          }),
        ],
      }),
    ).toBe(0)
  })

  it("monthly interest sums to annual and is flat for interest-only", () => {
    const params = {
      isLinkCode: "FIN.3",
      configYearIndex: 1,
      loans: [
        loan({
          id: "1",
          sourceLinkCode: "PLT-C",
          principal: 100_000,
          interestRate: 12,
          remainingPayments: 24,
          repaymentMode: "interest_only",
        }),
      ],
    }
    const months = resolveDebtDrivenInterestExpenseMonthly(params)
    expect(months).toHaveLength(12)
    expect(months.every((m) => m === 1_000)).toBe(true)
    expect(months.reduce((a, b) => a + b, 0)).toBe(resolveDebtDrivenInterestExpense(params))
  })
})
