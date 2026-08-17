import { describe, it, expect } from "vitest"
import type { AccountMappingData, TrialBalanceData } from "@/lib/api"
import {
  buildDebtLoansFromPltMappings,
  mergeDebtForecastLoans,
  resolveDebtOpeningReferencePeriod,
  trialBalanceAmountAtMonth,
} from "../debt-mapping-utils"
import type { DebtForecastLoan } from "../debt-forecast-types"
import { isDebtHypothesisDefined } from "../debt-forecast-types"

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "id" | "account_number">): AccountMappingData {
  return {
    description: "Emprunt test",
    link_code: "PLT-B.1",
    summary_ef: null,
    detail_ef: null,
    divisions: null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: false,
    fixed_costs: false,
    variable_cost_revenue_link_code: null,
    liability_remaining_years: 5,
    liability_interest_rate: 4.5,
    product: null,
    customer: null,
    supplier: null,
    interco_company_id: null,
    ...partial,
  }
}

describe("resolveDebtOpeningReferencePeriod", () => {
  it("uses December of prior year for annual projections", () => {
    expect(
      resolveDebtOpeningReferencePeriod({
        projectionHorizon: "annual",
        forecastBaseYear: 2026,
      }),
    ).toEqual({ fiscalYear: 2025, month: 12 })
  })

  it("uses month before start for monthly projections", () => {
    expect(
      resolveDebtOpeningReferencePeriod({
        projectionHorizon: "monthly",
        forecastBaseYear: 2026,
        referenceMonth: 4,
      }),
    ).toEqual({ fiscalYear: 2026, month: 3 })
  })
})

describe("buildDebtLoansFromPltMappings", () => {
  const trialBalance: TrialBalanceData = {
    company_id: "c1",
    fiscal_year: 2025,
    months_with_data: [12],
    accounts: [
      {
        account_number: "2500",
        description: "Emprunt bancaire",
        monthly_amounts: { Décembre: -500000 },
      },
    ],
  }

  it("builds a loan from PLT mapping and TB balance at reference month", () => {
    const { loans, skipped } = buildDebtLoansFromPltMappings({
      mappings: [mapping({ id: "m1", account_number: "2500" })],
      trialBalance,
      referencePeriod: { fiscalYear: 2025, month: 12 },
    })

    expect(skipped).toEqual([])
    expect(loans).toHaveLength(1)
    expect(loans[0]).toMatchObject({
      principal: 500000,
      interestRate: 0,
      remainingPayments: 0,
      hypothesisDefined: false,
      sourceType: "mapping",
      sourceMappingId: "m1",
      sourceAccountNumber: "2500",
      sourceLinkCode: "PLT-B.1",
    })
  })

  it("imports mappings even without rate or duration", () => {
    const { loans, skipped } = buildDebtLoansFromPltMappings({
      mappings: [
        mapping({ id: "m1", account_number: "2500", liability_interest_rate: null, liability_remaining_years: null }),
      ],
      trialBalance,
      referencePeriod: { fiscalYear: 2025, month: 12 },
    })
    expect(skipped).toEqual([])
    expect(loans).toHaveLength(1)
    expect(loans[0].hypothesisDefined).toBe(false)
  })
})

describe("mergeDebtForecastLoans", () => {
  it("preserves capex and manual loans while refreshing mapping loans", () => {
    const existing: DebtForecastLoan[] = [
      {
        id: "capex-1",
        name: "Projet",
        principal: 100,
        interestRate: 3,
        remainingPayments: 12,
        startMonth: 0,
        sourceType: "capex",
        sourceCapexKey: "k1",
      },
      {
        id: "plt-mapping-m1",
        name: "Custom name",
        principal: 1,
        interestRate: 1,
        remainingPayments: 1,
        startMonth: 2,
        sourceType: "mapping",
        sourceMappingId: "m1",
      },
    ]

    const mappingLoans: DebtForecastLoan[] = [
      {
        id: "plt-mapping-m1-new",
        name: "2500 — Emprunt",
        principal: 500000,
        interestRate: 4.5,
        remainingPayments: 60,
        startMonth: 0,
        sourceType: "mapping",
        sourceMappingId: "m1",
      },
    ]

    const merged = mergeDebtForecastLoans(existing, mappingLoans)
    expect(merged).toHaveLength(2)
    expect(merged.find((l) => l.sourceType === "capex")?.id).toBe("capex-1")
    const mappingLoan = merged.find((l) => l.sourceMappingId === "m1")
    expect(mappingLoan?.principal).toBe(500000)
    expect(mappingLoan?.name).toBe("Custom name")
    expect(mappingLoan?.startMonth).toBe(2)
    expect(mappingLoan?.interestRate).toBe(1)
    expect(mappingLoan?.remainingPayments).toBe(1)
    expect(mappingLoan?.hypothesisDefined).toBe(true)
  })
})

describe("isDebtHypothesisDefined", () => {
  it("treats manual and capex loans as defined", () => {
    expect(isDebtHypothesisDefined({ sourceType: "manual", remainingPayments: 0 })).toBe(true)
    expect(isDebtHypothesisDefined({ sourceType: "capex", remainingPayments: 0 })).toBe(true)
  })

  it("flags mapping loans until the hypothesis is saved", () => {
    expect(
      isDebtHypothesisDefined({ sourceType: "mapping", remainingPayments: 0, hypothesisDefined: false }),
    ).toBe(false)
    expect(
      isDebtHypothesisDefined({ sourceType: "mapping", remainingPayments: 60, hypothesisDefined: true }),
    ).toBe(true)
  })

  it("treats legacy mapping loans with a stored term as defined", () => {
    expect(isDebtHypothesisDefined({ sourceType: "mapping", remainingPayments: 60 })).toBe(true)
  })
})

describe("trialBalanceAmountAtMonth", () => {
  it("reads French month keys", () => {
    expect(
      trialBalanceAmountAtMonth(
        { account_number: "1", description: "", monthly_amounts: { Décembre: 12000 } },
        12,
      ),
    ).toBe(12000)
  })
})
