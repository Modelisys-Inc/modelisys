import { describe, expect, it } from "vitest"
import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import type { DivisionProfitabilitySlice, DivisionSeriesBundle } from "@/lib/division-profitability"
import { groupDivisionNarrativeBlocks } from "@/lib/income-performance-narrative"
import { packPilotageDivisionProfitabilityLecturePages } from "@/lib/report-narrative-pagination"
import {
  buildPilotageDivisionExpenseIndicatorTables,
  buildPilotageDivisionProfitabilityNarrative,
  pilotageDivisionRentabilityHeading,
} from "@/lib/pilotage-division-profitability-narrative"
import { pilotageExpenseIndicatorTableKey } from "@/lib/pilotage-expense-indicator"

function mapping(partial: Partial<AccountMappingData> & Pick<AccountMappingData, "account_number">): AccountMappingData {
  return {
    id: partial.id ?? partial.account_number,
    description: partial.description ?? "",
    link_code: partial.link_code ?? "CMV-A.1",
    summary_ef: null,
    detail_ef: null,
    divisions: partial.divisions ?? "Division Est",
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

function buildMonthlyFixture() {
  const abbrevs = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"] as const
  const periods: SeriesPeriod[] = []
  const revAmounts: Record<string, number> = {}
  const varAmounts: Record<string, number> = {}
  const fixAmounts: Record<string, number> = {}

  for (let index = 0; index < 36; index += 1) {
    const month = ((8 - index) % 12) + (index > 8 ? 0 : 1)
    const normalizedMonth = month <= 0 ? month + 12 : month
    const year = index <= 8 ? 2026 : 2026 - Math.ceil((index - 8) / 12)
    const fiscalYear = normalizedMonth >= 1 && normalizedMonth <= 8 && year === 2025 ? 2025 : year
    const key = `${fiscalYear}-${normalizedMonth}`
    periods.push({
      fiscalYear,
      fiscalMonth: normalizedMonth,
      label: `${abbrevs[normalizedMonth - 1]} ${year}`,
    })
    revAmounts[key] = 200_000 - index * 1_000
    varAmounts[key] = 80_000 - index * 400
    fixAmounts[key] = 40_000 - index * 100
  }

  const rows: SeriesRow[] = [
    {
      id: "rev",
      label: "Revenus",
      linkCode: "REV-A.1",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: revAmounts,
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
      detailRows: [{ id: "5010", label: "Matières", amounts: varAmounts }],
    },
    {
      id: "exp",
      label: "Charges",
      linkCode: "EXP",
      isBold: false,
      isSection: false,
      isResult: false,
      amounts: {},
      detailRows: [{ id: "6010", label: "Salaires", amounts: fixAmounts }],
    },
  ]

  const mappings = [
    mapping({ account_number: "5010", description: "Matières", link_code: "CMV-A.1", variable_costs: true }),
    mapping({ account_number: "6010", description: "Salaires", link_code: "ADM-A.1", fixed_costs: true }),
  ]

  const slices: DivisionProfitabilitySlice[] = [
    {
      divisionId: "d1",
      heading: "Division Est",
      metricLabel: "la division Division Est",
      points: [],
      mappingStatus: { variableCostAccountCount: 1, fixedCostAccountCount: 1, revenueConfigured: true },
    },
  ]

  const divisionSeries: DivisionSeriesBundle[] = [{ divisionId: "d1", rows, periods }]

  return {
    periods,
    rows,
    mappings,
    slices,
    divisionSeries,
    refMonth: 8,
    refYear: 2026,
  }
}

describe("buildPilotageDivisionProfitabilityNarrative", () => {
  it("produit 3 sous-sections BAIIA par division, comme l'analyse de rentabilité", () => {
    const fixture = buildMonthlyFixture()
    const result = buildPilotageDivisionProfitabilityNarrative({
      slices: fixture.slices,
      divisionSeries: fixture.divisionSeries,
      mappings: fixture.mappings,
      refMonth: fixture.refMonth,
      refYear: fixture.refYear,
      fiscalYearEnd: "12-31",
    })

    expect(result?.title).toBe("Lecture de la performance")
    expect(result?.paragraphs).toHaveLength(3)
    expect(result?.paragraphs.map((paragraph) => paragraph.subsection)).toEqual([
      "Performance actuelle",
      "Performance de l'exercice (YTD)",
      "Tendance des 12 derniers mois",
    ])

    const heading = pilotageDivisionRentabilityHeading("Division Est")
    expect(result?.paragraphs.every((paragraph) => paragraph.heading === heading)).toBe(true)
    expect(result?.paragraphs[0]?.body).toContain(EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL)
    expect(result?.paragraphs[0]?.body).toContain("s'explique par le fait que")
    expect(result?.paragraphs[0]?.body).toContain("Ainsi,")
    expect(result?.paragraphs[0]?.showIndicatorTable).toBe(true)

    const blocks = groupDivisionNarrativeBlocks(result?.paragraphs ?? [])
    expect(blocks).toHaveLength(1)
    expect(blocks?.[0]?.title).toBe("Division Est")
    expect(packPilotageDivisionProfitabilityLecturePages(result?.paragraphs)).toHaveLength(2)
    expect(
      packPilotageDivisionProfitabilityLecturePages(result?.paragraphs).map((page) =>
        page.map((paragraph) => paragraph.subsection),
      ),
    ).toEqual([
      ["Performance actuelle"],
      ["Performance de l'exercice (YTD)", "Tendance des 12 derniers mois"],
    ])
  })

  it("construit les tableaux indicateurs par division et sous-section", () => {
    const fixture = buildMonthlyFixture()
    const heading = pilotageDivisionRentabilityHeading("Division Est")
    const tables = buildPilotageDivisionExpenseIndicatorTables({
      slices: fixture.slices,
      divisionSeries: fixture.divisionSeries,
      mappings: fixture.mappings,
      refMonth: fixture.refMonth,
      refYear: fixture.refYear,
      fiscalYearEnd: "12-31",
    })

    const current = tables.get(
      pilotageExpenseIndicatorTableKey(heading, "Performance actuelle"),
    )
    expect(current?.metrics.map((metric) => metric.label)).toEqual([
      "Revenus",
      "Coûts variables",
      "Contribution marginale",
      "Coûts fixes",
      "BAIIA",
    ])
  })
})
