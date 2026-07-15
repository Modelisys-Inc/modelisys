import { describe, it, expect } from "vitest"
import type { AccountMappingData, StandardLinkCode } from "@/lib/api"
import {
  buildIncomeStatementMappedLinkCodeIndex,
  incomeStatementFamilyForSectionLabel,
  incomeStatementLinkCodeHasMappedAccounts,
} from "@/lib/income-statement-mapping-rollup"
import {
  applyAutoHideEmptyIncomeStatementSummaryRows,
  isShowInDetail,
  isStructureRowHidden,
} from "@/lib/income-statement-structure-utils"
import {
  filterIncomeStatementParentLinkCodes,
  incomeStatementParentLinkCodeOptions,
} from "@/lib/standard-link-code-utils"

function code(
  partial: Pick<StandardLinkCode, "code" | "family" | "is_leaf"> &
    Partial<StandardLinkCode>,
): StandardLinkCode {
  return {
    parent_code: null,
    label_account: null,
    label_sub_account: partial.code,
    sort_order: 0,
    is_active: true,
    attached_link_codes: [],
    ...partial,
  }
}

describe("filterIncomeStatementParentLinkCodes", () => {
  const chart: StandardLinkCode[] = [
    code({ code: "REV-A", family: "REV", is_leaf: false }),
    code({ code: "REV-A.1", family: "REV", parent_code: "REV-A", is_leaf: true }),
    code({ code: "CMV", family: "CMV", is_leaf: false }),
    code({ code: "CMV.1", family: "CMV", parent_code: "CMV", is_leaf: true }),
  ]

  it("offers family anchors only (REV, CMV, …) not intermediate parents (REV-A)", () => {
    const { codes } = incomeStatementParentLinkCodeOptions(chart)
    expect(codes).toContain("REV")
    expect(codes).toContain("CMV")
    expect(codes).not.toContain("REV-A")
    expect(codes).not.toContain("CMV.1")
  })

  it("synthesizes REV anchor when chart has only REV-A roots", () => {
    const filtered = filterIncomeStatementParentLinkCodes(chart)
    expect(filtered.some((c) => c.code === "REV")).toBe(true)
  })
})

describe("buildIncomeStatementMappedLinkCodeIndex", () => {
  const chart: StandardLinkCode[] = [
    code({ code: "REV-A", family: "REV", is_leaf: false }),
    code({ code: "REV-A.1", family: "REV", parent_code: "REV-A", is_leaf: true }),
    code({ code: "CMV.1", family: "CMV", is_leaf: true }),
  ]

  it("rolls mapped leaf accounts up to family anchor REV", () => {
    const mappings: AccountMappingData[] = [
      {
        id: "1",
        account_number: "4000",
        description: "Sales",
        link_code: "REV-A.1",
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
        liability_remaining_years: null,
        liability_interest_rate: null,
        product: null,
        customer: null,
        supplier: null,
        interco_company_id: null,
      },
    ]
    const index = buildIncomeStatementMappedLinkCodeIndex(mappings, chart)
    expect(incomeStatementLinkCodeHasMappedAccounts("REV", index)).toBe(true)
    expect(incomeStatementLinkCodeHasMappedAccounts("REV-A", index)).toBe(true)
    expect(incomeStatementLinkCodeHasMappedAccounts("CMV", index)).toBe(false)
  })
})

describe("applyAutoHideEmptyIncomeStatementSummaryRows", () => {
  const chart: StandardLinkCode[] = [
    code({ code: "REV-A.1", family: "REV", is_leaf: true }),
    code({ code: "CMV.1", family: "CMV", is_leaf: true }),
  ]

  it("auto-checks Masquer for family section and link rows without mapped accounts", () => {
    const structure = [
      { label: "Chiffre d'affaires", isSection: true, isBold: true },
      { label: "Ventes", linkCode: "REV-A.1", defineMapping: true },
      { label: "Coûts des produits vendus", isSection: true, isBold: true },
      { label: "CMV ligne", linkCode: "CMV.1", defineMapping: true },
    ]
    const mappings: AccountMappingData[] = [
      {
        id: "1",
        account_number: "4000",
        description: "Sales",
        link_code: "REV-A.1",
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
        liability_remaining_years: null,
        liability_interest_rate: null,
        product: null,
        customer: null,
        supplier: null,
        interco_company_id: null,
      },
    ]
    const index = buildIncomeStatementMappedLinkCodeIndex(mappings, chart)
    const next = applyAutoHideEmptyIncomeStatementSummaryRows(structure, index, chart)

    expect(isStructureRowHidden(next[0]!)).toBe(false)
    expect(isStructureRowHidden(next[1]!)).toBe(false)
    expect(isStructureRowHidden(next[2]!)).toBe(true)
    expect(isStructureRowHidden(next[3]!)).toBe(true)
    expect(next[3]!.linkCode).toBe("CMV.1")
  })

  it("maps section labels to families", () => {
    expect(incomeStatementFamilyForSectionLabel("Coûts des produits vendus")).toBe("CMV")
    expect(incomeStatementFamilyForSectionLabel("Chiffre d'affaires")).toBe("REV")
  })
})

/**
 * Masque les sous-lignes Détail quand le poste sommaire de l'annexe est masqué.
 */
describe("applyAutoHideEmptyIncomeStatementSummaryRows detailOnly propagation", () => {
  it("masque les sous-lignes detailOnly quand le poste sommaire de l’annexe est masqué", () => {
    const structure = [
      {
        label: "Frais d'exploitation",
        linkCode: "EXP",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "B",
        hidden: true,
        posteNature: "depenses",
      },
      {
        label: "EXP ligne 1",
        detailOnly: true,
        linkCode: "EXP.1",
        defineMapping: true,
        showInDetail: true,
        annexLetter: "B",
      },
    ]
    const index = new Map<string, Set<string>>()
    const next = applyAutoHideEmptyIncomeStatementSummaryRows(structure, index, [])

    expect(isStructureRowHidden(next[1]!)).toBe(true)
    expect(isShowInDetail(next[1]!, next)).toBe(false)
  })
})

describe("isShowInDetail with structure", () => {
  it("retourne false pour detailOnly si le poste sommaire de l’annexe est masqué", () => {
    const structure = [
      {
        label: "Frais d'exploitation",
        linkCode: "EXP",
        annexLetter: "B",
        hidden: true,
        defineMapping: true,
      },
      {
        label: "EXP.1",
        detailOnly: true,
        linkCode: "EXP.1",
        annexLetter: "B",
        defineMapping: true,
      },
    ]
    expect(isShowInDetail(structure[1]!, structure)).toBe(false)
  })
})
