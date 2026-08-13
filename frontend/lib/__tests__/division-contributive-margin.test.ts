import { describe, expect, it } from "vitest"
import {
  buildDivisionProfitabilityRows,
  buildDivisionProfitabilitySlices,
} from "@/lib/division-profitability"
import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"

const DIV_EST = { id: "d-est", name: "Division Est", subDivisions: [] }
const DIV_OUEST = { id: "d-ouest", name: "Division Ouest", subDivisions: [] }

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "account_number">): AccountMappingData {
  return {
    id: partial.id ?? partial.account_number,
    description: partial.description ?? "",
    link_code: partial.link_code ?? "CMV-A.1",
    summary_ef: null,
    detail_ef: null,
    divisions: partial.divisions ?? null,
    sub_divisions: null,
    fdrhc: false,
    interests: false,
    amortization: false,
    variable_costs: partial.variable_costs ?? false,
    fixed_costs: partial.fixed_costs ?? false,
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

describe("buildDivisionProfitabilitySlices", () => {
  const periods: SeriesPeriod[] = [
    { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
    { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
  ]

  const standardLinkCodes = [
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

  it("produit une tranche par division avec pont complet jusqu'au BAIIA", () => {
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
        ],
      },
      {
        id: "adm",
        label: "Admin",
        linkCode: "ADM",
        isBold: false,
        isSection: false,
        isResult: false,
        amounts: {},
        detailRows: [
          { id: "6010", label: "Salaires", amounts: { "2024-12": 200_000, "2025-12": 250_000 } },
        ],
      },
    ]

    const mappings = [
      mapping({ account_number: "5010", divisions: "Division Est", variable_costs: true }),
      mapping({ account_number: "6010", divisions: "Division Est", fixed_costs: true }),
    ]

    const slices = buildDivisionProfitabilitySlices({
      divisions: [DIV_EST, DIV_OUEST],
      divisionSeries: [
        { divisionId: DIV_EST.id, rows, periods },
        { divisionId: DIV_OUEST.id, rows: [], periods },
      ],
      mappings,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      standardLinkCodes,
    })

    expect(slices).toHaveLength(2)
    expect(slices[0]!.heading).toBe("Division Est")
    expect(slices[0]!.points[0]?.revenue).toBe(1_000_000)
    expect(slices[0]!.points[0]?.variableCosts).toBe(400_000)
    expect(slices[0]!.points[0]?.contributiveMargin).toBe(600_000)
    expect(slices[0]!.points[0]?.fixedCosts).toBe(250_000)
    expect(slices[0]!.points[0]?.operatingProfit).toBe(350_000)

    const tableRows = buildDivisionProfitabilityRows(slices)
    expect(tableRows[0]!.profitable).toBe(true)
    expect(tableRows[0]!.operatingProfit).toBe(350_000)
  })
})
