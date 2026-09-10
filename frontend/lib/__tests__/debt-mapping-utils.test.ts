import { describe, it, expect } from "vitest"
import type { AccountMappingData, TrialBalanceData } from "@/lib/api"
import {
  buildDebtLoansFromPltMappings,
  debtForecastLoanGroupHeading,
  groupDebtForecastLoansByLiabilityRoot,
  mappingLiabilityTermRootForLinkCode,
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

  it("excludes PLT-G (Dues) from Financement — bilan-only line", () => {
    const { loans, skipped } = buildDebtLoansFromPltMappings({
      mappings: [
        mapping({ id: "m-g", account_number: "2600", link_code: "PLT-G.1", description: "Dues actionnaire" }),
        mapping({ id: "m-b", account_number: "2500", link_code: "PLT-B.1" }),
      ],
      trialBalance: {
        ...trialBalance,
        accounts: [
          ...trialBalance.accounts,
          {
            account_number: "2600",
            description: "Dues actionnaire",
            monthly_amounts: { Décembre: -100000 },
          },
        ],
      },
      referencePeriod: { fiscalYear: 2025, month: 12 },
    })
    expect(skipped).toEqual([])
    expect(loans).toHaveLength(1)
    expect(loans[0]?.sourceLinkCode).toBe("PLT-B.1")
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

describe("groupDebtForecastLoansByLiabilityRoot", () => {
  const baseLoan = (partial: Partial<DebtForecastLoan> & Pick<DebtForecastLoan, "id">): DebtForecastLoan => ({
    name: partial.name ?? "Emprunt",
    principal: 100_000,
    interestRate: 5,
    remainingPayments: 60,
    startMonth: 0,
    sourceType: "mapping",
    ...partial,
  })

  it("groups loans by PLT root in chart order", () => {
    const groups = groupDebtForecastLoansByLiabilityRoot([
      baseLoan({ id: "c", sourceLinkCode: "PLT-C.1", name: "LT" }),
      baseLoan({ id: "b", sourceLinkCode: "PLT-B.1", name: "Billet" }),
      baseLoan({ id: "g", sourceLinkCode: "PLT-G.2", name: "Dues" }),
      baseLoan({ id: "d", sourceLinkCode: "PLT-D.1", name: "Location" }),
    ])
    // PLT-G (Dues) : plus de section « Autres emprunts »
    expect(groups.map((g) => g.root)).toEqual(["PLT-B", "PLT-C", "PLT-D"])
    expect(debtForecastLoanGroupHeading(groups[0]!)).toBe("PLT-B — Billet à payer")
    expect(groups.flatMap((g) => g.loans.map((l) => l.id))).not.toContain("g")
  })

  it("excludes manual and capex loans without PLT code (no Autres emprunts)", () => {
    const groups = groupDebtForecastLoansByLiabilityRoot([
      baseLoan({ id: "manual", sourceType: "manual" }),
      baseLoan({ id: "capex", sourceType: "capex", sourceCapexKey: "x-1" }),
    ])
    expect(groups).toEqual([])
  })

  it("groups financed capex loans under PLT-C / PLT-D from sourceLinkCode", () => {
    const groups = groupDebtForecastLoansByLiabilityRoot([
      baseLoan({
        id: "capex-corp",
        sourceType: "capex",
        sourceCapexKey: "ALT-B.1-1:a",
        sourceLinkCode: "PLT-C",
        name: "Équipement",
      }),
      baseLoan({
        id: "capex-lease",
        sourceType: "capex",
        sourceCapexKey: "ALT-C.1-1:b",
        sourceLinkCode: "PLT-D",
        name: "Bien loué",
      }),
    ])
    expect(groups.map((g) => g.root)).toEqual(["PLT-C", "PLT-D"])
    expect(debtForecastLoanGroupHeading(groups[0]!)).toBe("PLT-C — Dette à long terme")
    expect(debtForecastLoanGroupHeading(groups[1]!)).toBe("PLT-D — Obligations de location-acquisition")
  })

  it("resolves PLT roots from leaf codes", () => {
    expect(mappingLiabilityTermRootForLinkCode("PLT-D.3")).toBe("PLT-D")
    expect(mappingLiabilityTermRootForLinkCode("PLT-G.1")).toBe("OTHER")
    expect(mappingLiabilityTermRootForLinkCode("")).toBe("OTHER")
  })
})
