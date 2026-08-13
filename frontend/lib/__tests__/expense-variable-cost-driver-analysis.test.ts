import { describe, expect, it } from "vitest"
import type { AccountMappingData } from "@/lib/api"
import {
  analyzeVariableCostDrivers,
  formatTopVariableDriversByRevenueShare,
  formatTopVariableDriversByRevenueShift,
} from "@/lib/expense-variable-cost-driver-analysis"

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "account_number">): AccountMappingData {
  return {
    id: partial.id ?? partial.account_number,
    description: partial.description ?? "",
    link_code: partial.link_code ?? "CMV-A.1",
    summary_ef: null,
    detail_ef: null,
    divisions: null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: partial.variable_costs ?? true,
    fixed_costs: false,
    variable_cost_revenue_link_code: null,
    liability_remaining_years: null,
    liability_interest_rate: null,
    product: null,
    customer: null,
    supplier: null,
    interco_company_id: null,
    ...partial,
  }
}

describe("analyzeVariableCostDrivers", () => {
  it("classe les postes par part du CA et détecte les plus fortes variations de ratio", () => {
    const mappingsByAccount = new Map([
      [
        "5010",
        mapping({ account_number: "5010", description: "Matières premières", link_code: "CMV-A.1" }),
      ],
      [
        "5020",
        mapping({ account_number: "5020", description: "Sous-traitance", link_code: "CMV-A.2" }),
      ],
    ])

    const analysis = analyzeVariableCostDrivers({
      accountNumbers: ["5010", "5020"],
      currentRevenue: 1_000_000,
      currentCategoryTotal: 450_000,
      priorRevenue: 800_000,
      priorCategoryTotal: 300_000,
      resolveCurrentAmount: (accountNumber) => (accountNumber === "5010" ? 350_000 : 100_000),
      resolvePriorAmount: (accountNumber) => (accountNumber === "5010" ? 250_000 : 50_000),
      mappingsByAccount,
      rows: [],
    })

    expect(analysis.topByRevenueShare[0]?.shareOfRevenuePct).toBeCloseTo(35, 1)
    expect(analysis.topByRevenueShift[0]?.shareOfRevenueShiftPts).toBeGreaterThan(0)

    expect(formatTopVariableDriversByRevenueShare(analysis.topByRevenueShare)).toMatch(
      /proportion du chiffre d'affaires/i,
    )
    expect(
      formatTopVariableDriversByRevenueShift(analysis.topByRevenueShift, "décembre 2024"),
    ).toMatch(/ratio aux revenus/i)
  })
})
