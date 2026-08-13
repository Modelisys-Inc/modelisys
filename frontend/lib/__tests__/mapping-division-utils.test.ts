import { describe, expect, it } from "vitest"
import { filterMappingsForDivision, mappingMatchesDivision } from "@/lib/mapping-division-utils"
import type { AccountMappingData } from "@/lib/api"

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "account_number">): AccountMappingData {
  return {
    id: partial.id ?? partial.account_number,
    description: partial.description ?? "",
    link_code: partial.link_code ?? "REV-A.1",
    summary_ef: null,
    detail_ef: null,
    divisions: partial.divisions ?? null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: false,
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

describe("mappingMatchesDivision", () => {
  it("accepte le nom ou l'UUID dans le CSV divisions", () => {
    const m = mapping({
      account_number: "5010",
      divisions: "Division Est, d2222222-2222-2222-2222-222222222222",
    })
    expect(mappingMatchesDivision(m, "d1111111-1111-1111-1111-111111111111", "Division Est")).toBe(true)
    expect(mappingMatchesDivision(m, "d2222222-2222-2222-2222-222222222222", "Division Ouest")).toBe(true)
    expect(mappingMatchesDivision(m, "d3333333-3333-3333-3333-333333333333", "Division Nord")).toBe(false)
  })

  it("filtre les mappings par division", () => {
    const mappings = [
      mapping({ account_number: "5010", divisions: "Division Est" }),
      mapping({ account_number: "6010", divisions: "Division Ouest" }),
    ]
    expect(filterMappingsForDivision(mappings, "d1", "Division Est")).toHaveLength(1)
    expect(filterMappingsForDivision(mappings, "d1", "Division Est")[0]!.account_number).toBe("5010")
  })
})
