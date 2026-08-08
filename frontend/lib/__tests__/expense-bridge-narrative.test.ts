import { describe, expect, it } from "vitest"
import { buildExpenseBridgeNarrativeContext } from "@/lib/expense-bridge-narrative-context"
import { buildExpensesBridgeNarrative } from "@/lib/expense-bridge-narrative"
import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"
import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"

function bridge(): ExpenseContributionBridgeResult {
  return {
    points: [
      {
        period: "2025",
        revenue: 1_000_000,
        variableCosts: 450_000,
        contributiveMargin: 550_000,
        fixedCosts: 240_000,
        operatingProfit: 310_000,
      },
      {
        period: "2024",
        revenue: 800_000,
        variableCosts: 300_000,
        contributiveMargin: 500_000,
        fixedCosts: 200_000,
        operatingProfit: 300_000,
      },
    ],
    mappingStatus: {
      variableCostAccountCount: 2,
      fixedCostAccountCount: 1,
      revenueConfigured: true,
    },
  }
}

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

describe("buildExpensesBridgeNarrative", () => {
  it("produit la section Lecture des dépenses avec CV et CF", () => {
    const result = buildExpensesBridgeNarrative(bridge(), "years")
    expect(result.title).toBe("Lecture des dépenses")
    expect(result.paragraphs.length).toBeGreaterThanOrEqual(2)
    expect(result.paragraphs[0]!.heading).toBe("Contribution marginale")
    expect(result.paragraphs.some((p) => p.heading === "Coûts fixes")).toBe(true)
    expect(result.paragraphs[0]!.body).toContain("contribution marginale s'établit")
    expect(result.paragraphs[0]!.body).toContain("BAIIA")
    const fixed = result.paragraphs.find((p) => p.heading === "Coûts fixes")
    expect(fixed?.body).toContain("bénéfice avant intérêts")
  })

  it("intègre les principaux postes et la détérioration du ratio CV/CA", () => {
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
          { id: "5010", label: "Matières", amounts: { "2024-12": 250_000, "2025-12": 350_000 } },
          { id: "5020", label: "Sous-traitance", amounts: { "2024-12": 50_000, "2025-12": 100_000 } },
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
        detailRows: [{ id: "6010", label: "Salaires", amounts: { "2024-12": 200_000, "2025-12": 240_000 } }],
      },
    ]
    const mappings = [
      mapping({ account_number: "5010", description: "Matières premières", link_code: "CMV-A.1", variable_costs: true }),
      mapping({ account_number: "5020", description: "Sous-traitance", link_code: "CMV-A.2", variable_costs: true }),
      mapping({ account_number: "6010", description: "Salaires admin", link_code: "ADM-A.1", fixed_costs: true }),
    ]
    const standardLinkCodes = [
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
    ]

    const cfBridge: ExpenseContributionBridgeResult = {
      points: [
        {
          period: "2025",
          revenue: 1_000_000,
          variableCosts: 450_000,
          contributiveMargin: 550_000,
          fixedCosts: 280_000,
          operatingProfit: 270_000,
        },
        {
          period: "2024",
          revenue: 800_000,
          variableCosts: 300_000,
          contributiveMargin: 500_000,
          fixedCosts: 200_000,
          operatingProfit: 300_000,
        },
      ],
      mappingStatus: bridge().mappingStatus,
    }

    const context = buildExpenseBridgeNarrativeContext({
      mappings,
      seriesRows: rows,
      periods,
      view: "years",
      refMonth: 12,
      refYear: 2025,
      bridge: cfBridge,
      standardLinkCodes,
    })

    const result = buildExpensesBridgeNarrative(cfBridge, "years", context)
    const variableParagraphs = result.paragraphs.filter((p) => p.heading === "Contribution marginale")
    expect(variableParagraphs.length).toBeGreaterThanOrEqual(3)
    expect(variableParagraphs.slice(0, -1).every((p) => p.showIndicatorTable === false)).toBe(true)
    expect(variableParagraphs.at(-1)?.showIndicatorTable).toBe(true)
    expect(variableParagraphs[0]!.body).toContain("En 2025")
    expect(variableParagraphs[0]!.body).toContain("mapping comptable")
    expect(variableParagraphs[1]!.body).toMatch(/proportion du chiffre d'affaires/i)
    expect(variableParagraphs[1]!.body).toMatch(/achats/i)
    expect(variableParagraphs.some((p) => /ratio aux revenus/i.test(p.body))).toBe(true)
    expect(variableParagraphs.some((p) => /contribution marginale recule/i.test(p.body))).toBe(true)
    const fixedParagraphs = result.paragraphs.filter((p) => p.heading === "Coûts fixes")
    expect(fixedParagraphs.length).toBeGreaterThanOrEqual(3)
    expect(fixedParagraphs.slice(0, -1).every((p) => p.showIndicatorTable === false)).toBe(true)
    expect(fixedParagraphs.at(-1)?.showIndicatorTable).toBe(true)
    expect(fixedParagraphs[0]!.body).toContain("En 2025")
    expect(fixedParagraphs[0]!.body).toContain("mapping comptable")
    expect(fixedParagraphs[1]!.body).toMatch(/principaux postes de coûts fixes/i)
    expect(fixedParagraphs[2]!.body).toMatch(/Comparativement à 2024/i)
    expect(fixedParagraphs[2]!.body).toMatch(/effet de levier opérationnel défavorable/i)
    expect(fixedParagraphs.some((p) => /contribution marginale/i.test(p.body))).toBe(true)
  })

  it("signale l'absence de mapping CV ou CF", () => {
    const noCv = buildExpensesBridgeNarrative(
      {
        ...bridge(),
        mappingStatus: { variableCostAccountCount: 0, fixedCostAccountCount: 2, revenueConfigured: true },
      },
      "years",
    )
    expect(noCv.paragraphs[0]!.body).toContain("Aucun compte")

    const noCf = buildExpensesBridgeNarrative(
      {
        ...bridge(),
        mappingStatus: { variableCostAccountCount: 1, fixedCostAccountCount: 0, revenueConfigured: true },
      },
      "years",
    )
    expect(noCf.paragraphs.find((p) => p.heading === "Coûts fixes")?.body).toContain("Aucun compte")
  })
})
