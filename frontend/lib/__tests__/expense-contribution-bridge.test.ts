import { describe, expect, it } from "vitest"
import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  buildExpenseContributionBridge,
  collectAllFixedCostAccountNumbers,
  collectAllVariableCostAccountNumbers,
} from "@/lib/expense-contribution-bridge"

const REV_CHART: StandardLinkCode[] = [
  {
    code: "REV-A",
    family: "REV",
    parent_code: null,
    is_leaf: false,
    is_active: true,
    label_sub_account: "Produits",
    label_account: "Produits",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "REV-A.1",
    family: "REV",
    parent_code: "REV-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Charpentes",
    label_account: "Charpentes",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
]

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "account_number">): AccountMappingData {
  return {
    id: partial.id ?? partial.account_number,
    description: partial.description ?? "",
    link_code: partial.link_code ?? "CMV.1",
    summary_ef: null,
    detail_ef: null,
    divisions: null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: partial.variable_costs ?? false,
    fixed_costs: partial.fixed_costs ?? false,
    variable_cost_revenue_link_code: partial.variable_cost_revenue_link_code ?? null,
    liability_remaining_years: null,
    liability_interest_rate: null,
    product: null,
    customer: null,
    supplier: null,
    interco_company_id: null,
    ...partial,
  }
}

describe("expense-contribution-bridge", () => {
  it("collecte tous les comptes CV et CF du mapping", () => {
    const mappings = [
      mapping({ account_number: "5010", variable_costs: true }),
      mapping({ account_number: "6010", fixed_costs: true }),
      mapping({ account_number: "6020", fixed_costs: true }),
    ]
    expect(collectAllVariableCostAccountNumbers(mappings)).toEqual(["5010"])
    expect(collectAllFixedCostAccountNumbers(mappings)).toEqual(["6010", "6020"])
  })

  it("calcule le pont REV → CV → CM → CF → BE par période", () => {
    const periods: SeriesPeriod[] = [
      { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
      { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
    ]
    const rows: SeriesRow[] = [
      {
        id: "rev-a-1",
        label: "Charpentes",
        linkCode: "REV-A.1",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: { "2024-12": 800_000, "2025-12": 1_000_000 },
        detailRows: [],
      },
      {
        id: "cmv",
        label: "CMV",
        linkCode: "CMV",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: {},
        detailRows: [
          { id: "5010", label: "Matières", amounts: { "2024-12": 300_000, "2025-12": 400_000 } },
        ],
      },
      {
        id: "exp",
        label: "Charges",
        linkCode: "EXP",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: {},
        detailRows: [
          { id: "6010", label: "Salaires admin", amounts: { "2024-12": 200_000, "2025-12": 220_000 } },
        ],
      },
    ]
    const mappings = [
      mapping({ account_number: "5010", variable_costs: true, variable_cost_revenue_link_code: "REV-A.1" }),
      mapping({ account_number: "6010", fixed_costs: true }),
    ]

    const bridge = buildExpenseContributionBridge({
      mappings,
      seriesRows: rows,
      periods,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      standardLinkCodes: REV_CHART,
    })

    expect(bridge?.points[0]).toMatchObject({
      period: "2025",
      revenue: 1_000_000,
      variableCosts: 400_000,
      contributiveMargin: 600_000,
      fixedCosts: 220_000,
      operatingProfit: 380_000,
    })
    expect(bridge?.points[1]).toMatchObject({
      period: "2024",
      revenue: 800_000,
      variableCosts: 300_000,
      contributiveMargin: 500_000,
      fixedCosts: 200_000,
      operatingProfit: 300_000,
    })
  })
})
