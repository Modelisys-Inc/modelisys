import { describe, expect, it } from "vitest"
import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  BALANCE_POSITION_FAMILY_LABELS,
  buildFinancialPositionResult,
  familyHeading,
} from "@/lib/financial-position"
import { buildFinancialPositionBreakdownTables } from "@/lib/financial-position-breakdown"
import { buildFinancialPositionNarrative } from "@/lib/financial-position-narrative"
import {
  evolutionTableWeightFromHeading,
  packNarrativeParagraphs,
} from "@/lib/report-narrative-pagination"

const PERIODS: SeriesPeriod[] = [
  { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
  { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
]

function makeFamilyRow(
  family: string,
  label: string,
  amounts: Record<string, number>,
  detailRows: SeriesRow["detailRows"] = [],
): SeriesRow {
  return {
    id: family,
    label,
    linkCode: family,
    isBold: false,
    isSection: true,
    isResult: false,
    amounts,
    detailRows,
  }
}

const MAPPINGS: AccountMappingData[] = [
  {
    id: "m1",
    account_number: "1000",
    description: "Encaisse",
    link_code: "ACT-A.1",
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
  {
    id: "m2",
    account_number: "1500",
    description: "Immobilisations",
    link_code: "ALT-A.1",
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
  {
    id: "m3",
    account_number: "2000",
    description: "Fournisseurs",
    link_code: "PCT-A.1",
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
  {
    id: "m4",
    account_number: "3000",
    description: "Capital",
    link_code: "CAP-A.1",
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

const STANDARD_LINK_CODES: StandardLinkCode[] = [
  {
    code: "ACT-A",
    family: "ACT",
    parent_code: "ACT",
    is_leaf: false,
    is_active: true,
    label_sub_account: null,
    label_account: "Trésorerie",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "ACT-A.1",
    family: "ACT",
    parent_code: "ACT-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Encaisse",
    label_account: "Trésorerie",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "ALT-A",
    family: "ALT",
    parent_code: "ALT",
    is_leaf: false,
    is_active: true,
    label_sub_account: null,
    label_account: "Immobilisations",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "ALT-A.1",
    family: "ALT",
    parent_code: "ALT-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Immobilisations",
    label_account: "Immobilisations",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "PCT-A",
    family: "PCT",
    parent_code: "PCT",
    is_leaf: false,
    is_active: true,
    label_sub_account: null,
    label_account: "Fournisseurs",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "PCT-A.1",
    family: "PCT",
    parent_code: "PCT-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Fournisseurs",
    label_account: "Fournisseurs",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "CAP-A",
    family: "CAP",
    parent_code: "CAP",
    is_leaf: false,
    is_active: true,
    label_sub_account: null,
    label_account: "Capital",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "CAP-A.1",
    family: "CAP",
    parent_code: "CAP-A",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Capital",
    label_account: "Capital",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "CAP-C",
    family: "CAP",
    parent_code: "CAP",
    is_leaf: false,
    is_active: true,
    label_sub_account: null,
    label_account: "Résultat",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
  {
    code: "CAP-C.1",
    family: "CAP",
    parent_code: "CAP-C",
    is_leaf: true,
    is_active: true,
    label_sub_account: "Bénéfices non répartis",
    label_account: "Résultat",
    ft_category: null,
    account_type: null,
    coa_version: 1,
    deprecated_at: null,
  },
]

const ROWS: SeriesRow[] = [
  makeFamilyRow("ACT", BALANCE_POSITION_FAMILY_LABELS.ACT, { "2024-12": 90_000, "2025-12": 100_000 }, [
    { id: "1000", label: "Encaisse", amounts: { "2024-12": 90_000, "2025-12": 100_000 } },
  ]),
  makeFamilyRow("ALT", BALANCE_POSITION_FAMILY_LABELS.ALT, { "2024-12": 180_000, "2025-12": 200_000 }, [
    { id: "1500", label: "Immobilisations", amounts: { "2024-12": 180_000, "2025-12": 200_000 } },
  ]),
  makeFamilyRow("PCT", BALANCE_POSITION_FAMILY_LABELS.PCT, { "2024-12": 45_000, "2025-12": 50_000 }, [
    { id: "2000", label: "Fournisseurs", amounts: { "2024-12": 45_000, "2025-12": 50_000 } },
  ]),
  makeFamilyRow("PLT", BALANCE_POSITION_FAMILY_LABELS.PLT, { "2024-12": 0, "2025-12": 0 }),
  makeFamilyRow("CAP", BALANCE_POSITION_FAMILY_LABELS.CAP, { "2024-12": 225_000, "2025-12": 275_000 }, [
    { id: "3000", label: "Capital", amounts: { "2024-12": 200_000, "2025-12": 220_000 } },
    { id: "CAP-C.1", label: "Bénéfices non répartis", amounts: { "2024-12": 25_000, "2025-12": 55_000 } },
  ]),
]

describe("buildFinancialPositionResult", () => {
  it("utilise les agrégats famille du Sommaire bilan (incl. CAP-C.1)", () => {
    const result = buildFinancialPositionResult({
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })

    expect(result?.points[0]).toMatchObject({
      act: 100_000,
      alt: 200_000,
      pct: 50_000,
      plt: 0,
      cap: 275_000,
      totalAssets: 300_000,
      totalLiabilitiesEquity: 325_000,
    })
    expect(result?.points.length).toBeGreaterThanOrEqual(2)
    expect(result?.mappedAccountCount).toBe(5)
  })

  it("résout les familles via la structure bilan (libellés alternatifs)", () => {
    const defaultRows: SeriesRow[] = [
      makeFamilyRow("act-parent", "Actif", { "2025-12": 999_999 }),
      makeFamilyRow("act-section", "actifs courants", { "2025-12": 80_000 }),
      makeFamilyRow("alt-section", "actifs non courants", { "2025-12": 120_000 }),
      makeFamilyRow("pct-section", "passifs courants", { "2025-12": 40_000 }),
      makeFamilyRow("plt-section", "passifs non courants", { "2025-12": 10_000 }),
      makeFamilyRow("cap-section", "capitaux propres", { "2025-12": 150_000 }),
    ]
    const structure = [
      { label: "Actif", isSection: true },
      { label: "actifs courants", isSection: true },
      { label: "actifs non courants", isSection: true },
      { label: "passifs courants", isSection: true },
      { label: "passifs non courants", isSection: true },
      { label: "capitaux propres", isSection: true },
    ]

    const result = buildFinancialPositionResult({
      rows: defaultRows,
      periods: PERIODS,
      structure,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })

    expect(result?.points[0]).toMatchObject({
      act: 80_000,
      alt: 120_000,
      pct: 40_000,
      plt: 10_000,
      cap: 150_000,
      totalAssets: 200_000,
      totalLiabilitiesEquity: 200_000,
    })
  })

  it("utilise les codes de liaison configurés", () => {
    const chartConfig = {
      version: 2 as const,
      chartTitle: "Situation financière",
      series: [
        {
          id: "fp-act",
          kind: "bar" as const,
          label: "Actif court terme",
          spec: { type: "single" as const, code: "ACT" },
          yAxis: "left" as const,
          valueFormat: "currency" as const,
          showOnChart: true,
          showInSidePanel: true,
          color: "#3b82f6",
          stackGroup: "fp-assets",
        },
        {
          id: "fp-alt",
          kind: "bar" as const,
          label: "Actif long terme",
          spec: { type: "single" as const, code: "ALT" },
          yAxis: "left" as const,
          valueFormat: "currency" as const,
          showOnChart: true,
          showInSidePanel: true,
          color: "#10b981",
          stackGroup: "fp-assets",
        },
        {
          id: "fp-pct",
          kind: "bar" as const,
          label: "Passif court terme",
          spec: { type: "single" as const, code: "PCT" },
          yAxis: "left" as const,
          valueFormat: "currency" as const,
          showOnChart: true,
          showInSidePanel: true,
          color: "#f59e0b",
          stackGroup: "fp-liabilities",
        },
        {
          id: "fp-plt",
          kind: "bar" as const,
          label: "Passif long terme",
          spec: { type: "single" as const, code: "PLT" },
          yAxis: "left" as const,
          valueFormat: "currency" as const,
          showOnChart: true,
          showInSidePanel: true,
          color: "#8b5cf6",
          stackGroup: "fp-liabilities",
        },
        {
          id: "fp-cap",
          kind: "bar" as const,
          label: "Capitaux propres",
          spec: { type: "single" as const, code: "CAP" },
          yAxis: "left" as const,
          valueFormat: "currency" as const,
          showOnChart: true,
          showInSidePanel: true,
          color: "#06b6d4",
          stackGroup: "fp-liabilities",
        },
      ],
    }

    const result = buildFinancialPositionResult({
      rows: ROWS,
      periods: PERIODS,
      chartConfig,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })

    expect(result?.points[0]?.act).toBe(100_000)
    expect(result?.points[0]?.cap).toBe(275_000)
  })
})

describe("buildFinancialPositionNarrative", () => {
  it("produit une lecture par poste de bilan", () => {
    const result = buildFinancialPositionResult({
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })!
    const narrative = buildFinancialPositionNarrative(result, "years")
    expect(narrative?.title).toBe("Lecture de la situation financière")
    expect(narrative?.paragraphs.some((p) => p.heading === familyHeading("ACT"))).toBe(true)
    expect(narrative?.paragraphs.some((p) => p.heading === "Vue d'ensemble")).toBe(false)
  })
})

describe("buildFinancialPositionBreakdownTables", () => {
  it("génère un tableau indicateur par famille", () => {
    const result = buildFinancialPositionResult({
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })!
    const tables = buildFinancialPositionBreakdownTables({
      result,
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      standardLinkCodes: STANDARD_LINK_CODES,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    expect(tables.has(familyHeading("ACT"))).toBe(true)
    const actTable = tables.get(familyHeading("ACT"))
    expect(actTable?.metrics[0]?.detailRows?.[0]?.id).toBe("ACT-A")
    expect(actTable?.metrics[0]?.detailRows?.[0]?.displayKind).toBe("link-code")
    expect(actTable?.metrics[0]?.detailRows?.[0]?.detailRows?.[0]?.id).toBe("ACT-A.1")
    expect(actTable?.metrics[0]?.detailRows?.[0]?.detailRows?.[0]?.displayKind).toBe("link-code")
    expect(actTable?.metrics[0]?.detailRows?.[0]?.detailRows?.[0]?.detailRows?.[0]?.displayKind).toBe(
      "gl-account",
    )
    const capTable = tables.get(familyHeading("CAP"))
    expect(capTable?.metrics[0]?.detailRows?.every((row) => row.displayKind === "link-code")).toBe(true)
    expect(capTable?.metrics[0]?.detailRows?.map((row) => row.id)).toEqual(
      expect.arrayContaining(["CAP-A", "CAP-C"]),
    )
  })

  it("ventile par codes de liaison configurés dans les paramètres", () => {
    const result = buildFinancialPositionResult({
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })!
    const tables = buildFinancialPositionBreakdownTables({
      result,
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      standardLinkCodes: STANDARD_LINK_CODES,
      chartConfig: {
        version: 2,
        chartTitle: "Situation financière",
        series: [
          {
            id: "fp-cap",
            kind: "bar",
            label: "Capitaux propres",
            spec: { type: "sum", codes: ["CAP-A.1", "CAP-C.1"] },
            yAxis: "left",
            valueFormat: "currency",
            showOnChart: true,
            showInSidePanel: true,
          },
        ],
      },
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const capTable = tables.get(familyHeading("CAP"))
    const posteCodes = capTable?.metrics[0]?.detailRows?.map((row) => row.id) ?? []
    expect(posteCodes).toEqual(expect.arrayContaining(["CAP-A", "CAP-C"]))
    expect(posteCodes).not.toContain("CAP-A.1")
    expect(capTable?.metrics[0]?.detailRows?.every((row) => row.displayKind === "link-code")).toBe(true)
  })

  it("masque les postes entièrement à zéro", () => {
    const zeroMappings: AccountMappingData[] = [
      ...MAPPINGS,
      {
        id: "m-zero",
        account_number: "1010",
        description: "Poste vide",
        link_code: "ACT-B.1",
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
    const zeroRows: SeriesRow[] = ROWS.map((row) =>
      row.id === "ACT"
        ? {
            ...row,
            detailRows: [
              ...(row.detailRows ?? []),
              { id: "1010", label: "Poste vide", amounts: { "2024-12": 0, "2025-12": 0 } },
            ],
          }
        : row,
    )
    const result = buildFinancialPositionResult({
      rows: zeroRows,
      periods: PERIODS,
      mappings: zeroMappings,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })!
    const tables = buildFinancialPositionBreakdownTables({
      result,
      rows: zeroRows,
      periods: PERIODS,
      mappings: zeroMappings,
      standardLinkCodes: [
        ...STANDARD_LINK_CODES,
        {
          code: "ACT-B",
          family: "ACT",
          parent_code: "ACT",
          is_leaf: false,
          is_active: true,
          label_sub_account: null,
          label_account: "Poste vide",
          ft_category: null,
          account_type: null,
          coa_version: 1,
          deprecated_at: null,
        },
        {
          code: "ACT-B.1",
          family: "ACT",
          parent_code: "ACT-B",
          is_leaf: true,
          is_active: true,
          label_sub_account: "Poste vide",
          label_account: "Poste vide",
          ft_category: null,
          account_type: null,
          coa_version: 1,
          deprecated_at: null,
        },
      ],
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const actTable = tables.get(familyHeading("ACT"))
    expect(actTable?.metrics[0]?.detailRows?.map((row) => row.id)).toEqual(["ACT-A"])
  })
})

describe("financial position report lecture pagination", () => {
  it("regroupe plusieurs postes de bilan sur une même page rapport", () => {
    const result = buildFinancialPositionResult({
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })!
    const narrative = buildFinancialPositionNarrative(result, "years")!
    const tables = buildFinancialPositionBreakdownTables({
      result,
      rows: ROWS,
      periods: PERIODS,
      mappings: MAPPINGS,
      standardLinkCodes: STANDARD_LINK_CODES,
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const pages = packNarrativeParagraphs(narrative.paragraphs, (paragraph) =>
      evolutionTableWeightFromHeading(tables, paragraph.heading),
    )

    expect(narrative.paragraphs.length).toBeGreaterThan(4)
    expect(pages.length).toBeLessThanOrEqual(3)
    expect(Math.max(...pages.map((page) => page.length))).toBeGreaterThanOrEqual(2)
  })
})
