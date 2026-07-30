import { describe, expect, it } from "vitest"
import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  buildExpenseCostBreakdownTables,
  EXPENSE_FIXED_COSTS_HEADING,
  EXPENSE_VARIABLE_COSTS_HEADING,
} from "@/lib/expense-cost-breakdown-tables"
import { buildExpenseContributionBridge } from "@/lib/expense-contribution-bridge"

const CMV_CHART: StandardLinkCode[] = [
  {
    code: "CMV-A",
    family: "CMV",
    parent_code: "CMV",
    is_leaf: false,
    is_active: true,
    label_sub_account: "Achats",
    label_account: "Achats",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "CMV-A.1",
    family: "CMV",
    parent_code: "CMV-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Matières",
    label_account: "Matières",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "CMV-A.2",
    family: "CMV",
    parent_code: "CMV-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Sous-traitance",
    label_account: "Sous-traitance",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "ADM-A",
    family: "ADM",
    parent_code: "ADM",
    is_leaf: false,
    is_active: true,
    label_sub_account: "Administration",
    label_account: "Administration",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "ADM-A.1",
    family: "ADM",
    parent_code: "ADM-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Salaires",
    label_account: "Salaires",
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
    label_sub_account: "Revenus",
    label_account: "Revenus",
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
    link_code: partial.link_code ?? "CMV-A.1",
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

describe("buildExpenseCostBreakdownTables", () => {
  it("regroupe les comptes GL sous le code parent du mapping", () => {
    const periods: SeriesPeriod[] = [
      { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
      { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
    ]
    const rows: SeriesRow[] = [
      {
        id: "rev",
        label: "Revenus",
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
          { id: "5020", label: "Sous-traitance", amounts: { "2024-12": 50_000, "2025-12": 60_000 } },
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
          { id: "6020", label: "Loyer", amounts: { "2024-12": 50_000, "2025-12": 55_000 } },
        ],
      },
    ]
    const mappings = [
      mapping({
        account_number: "5010",
        description: "Matières premières",
        link_code: "CMV-A.1",
        variable_costs: true,
      }),
      mapping({
        account_number: "5020",
        description: "Sous-traitance",
        link_code: "CMV-A.2",
        variable_costs: true,
      }),
      mapping({ account_number: "6010", description: "Salaires admin", link_code: "ADM-A.1", fixed_costs: true }),
      mapping({ account_number: "6020", description: "Loyer", link_code: "ADM-A.1", fixed_costs: true }),
    ]

    const bridge = buildExpenseContributionBridge({
      mappings,
      seriesRows: rows,
      periods,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      standardLinkCodes: CMV_CHART,
    })
    expect(bridge).not.toBeNull()

    const tables = buildExpenseCostBreakdownTables({
      mappings,
      seriesRows: rows,
      periods,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      bridge: bridge!,
      standardLinkCodes: CMV_CHART,
    })

    const variable = tables.get(EXPENSE_VARIABLE_COSTS_HEADING)
    expect(variable?.metrics[0]?.detailRows).toHaveLength(1)
    expect(variable?.metrics[0]?.detailRows?.[0]?.id).toBe("CMV-A")
    expect(variable?.metrics[0]?.detailRows?.[0]?.displayKind).toBe("link-code")
    expect(variable?.metrics[0]?.detailRows?.[0]?.detailRows).toHaveLength(2)
    expect(variable?.metrics[0]?.detailRows?.[0]?.values[0]).toBe(460_000)

    const fixed = tables.get(EXPENSE_FIXED_COSTS_HEADING)
    expect(fixed?.metrics[0]?.detailRows?.[0]?.id).toBe("ADM-A")
    expect(fixed?.metrics[0]?.detailRows?.[0]?.detailRows).toHaveLength(2)
    expect(fixed?.metrics[0]?.values[0]).toBe(275_000)
  })

  it("ne regroupe pas les feuilles directement sous CMV dans un seul bucket famille", () => {
    const flatChart: StandardLinkCode[] = [
      {
        code: "CMV",
        family: "CMV",
        parent_code: null,
        is_leaf: false,
        is_active: true,
        label_sub_account: "Coûts des produits vendus",
        label_account: "Coûts des produits vendus",
        ft_category: null,
        account_type: null,
        coa_version: 1,
        deprecated_at: null,
      },
      {
        code: "CMV.1",
        family: "CMV",
        parent_code: "CMV",
        is_leaf: true,
        is_active: true,
        label_sub_account: "Matières",
        label_account: "Matières",
        ft_category: null,
        account_type: null,
        coa_version: 1,
        deprecated_at: null,
      },
      {
        code: "CMV.2",
        family: "CMV",
        parent_code: "CMV",
        is_leaf: true,
        is_active: true,
        label_sub_account: "Sous-traitance",
        label_account: "Sous-traitance",
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
        label_sub_account: "Revenus",
        label_account: "Revenus",
        ft_category: null,
        account_type: null,
        coa_version: 1,
        deprecated_at: null,
      },
    ]

    const periods: SeriesPeriod[] = [
      { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
    ]
    const rows: SeriesRow[] = [
      {
        id: "rev",
        label: "Revenus",
        linkCode: "REV-A.1",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: { "2025-12": 1_000_000 },
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
          { id: "5010", label: "Matières", amounts: { "2025-12": 400_000 } },
          { id: "5020", label: "Sous-traitance", amounts: { "2025-12": 60_000 } },
        ],
      },
    ]
    const mappings = [
      mapping({ account_number: "5010", link_code: "CMV.1", variable_costs: true }),
      mapping({ account_number: "5020", link_code: "CMV.2", variable_costs: true }),
    ]

    const bridge = buildExpenseContributionBridge({
      mappings,
      seriesRows: rows,
      periods,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      standardLinkCodes: flatChart,
    })

    const tables = buildExpenseCostBreakdownTables({
      mappings,
      seriesRows: rows,
      periods,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      bridge: bridge!,
      standardLinkCodes: flatChart,
    })

    const variable = tables.get(EXPENSE_VARIABLE_COSTS_HEADING)
    expect(variable?.metrics[0]?.detailRows?.map((row) => row.id)).toEqual(["CMV.1", "CMV.2"])
    expect(variable?.metrics[0]?.detailRows?.[0]?.id).not.toBe("CMV")
  })
})
