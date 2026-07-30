import { describe, expect, it } from "vitest"
import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  BALANCE_POSITION_FAMILY_LABELS,
  buildFinancialPositionResult,
  familyHeading,
} from "@/lib/financial-position"
import { buildFinancialPositionBreakdownTables } from "@/lib/financial-position-breakdown"
import { buildFinancialPositionNarrative } from "@/lib/financial-position-narrative"

const PERIODS: SeriesPeriod[] = [
  { fiscalYear: 2024, fiscalMonth: 12, label: "Déc 2024" },
  { fiscalYear: 2025, fiscalMonth: 12, label: "Déc 2025" },
]

function makeRow(id: string, linkCode: string, amounts: Record<string, number>): SeriesRow {
  return {
    id,
    label: id,
    linkCode,
    isBold: false,
    isSection: false,
    isResult: false,
    amounts,
    detailRows: [],
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

const ROWS: SeriesRow[] = [
  makeRow("1000", "ACT-A.1", { "2024-12": 90_000, "2025-12": 100_000 }),
  makeRow("1500", "ALT-A.1", { "2024-12": 180_000, "2025-12": 200_000 }),
  makeRow("2000", "PCT-A.1", { "2024-12": -45_000, "2025-12": -50_000 }),
  makeRow("3000", "CAP-A.1", { "2024-12": -225_000, "2025-12": -250_000 }),
]

describe("buildFinancialPositionResult", () => {
  it("agrège ACT/ALT/PCT/PLT/CAP au niveau société", () => {
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
      cap: 250_000,
      totalAssets: 300_000,
      totalLiabilitiesEquity: 300_000,
    })
    expect(result?.points.length).toBeGreaterThanOrEqual(2)
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
    expect(narrative?.paragraphs.some((p) => p.heading === "Vue d'ensemble")).toBe(true)
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
      view: "years",
      refMonth: 12,
      refYear: 2025,
    })
    const actTable = tables.get(familyHeading("ACT"))
    expect(actTable?.metrics[0]?.values[0]).toBe(100_000)
    expect(actTable?.sourceLabel).toBe(BALANCE_POSITION_FAMILY_LABELS.ACT)
  })
})
