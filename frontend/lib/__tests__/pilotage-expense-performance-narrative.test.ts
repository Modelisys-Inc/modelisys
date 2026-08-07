import { describe, expect, it } from "vitest"
import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  buildPilotageExpenseIndicatorTables,
  pilotageExpenseIndicatorTableKey,
} from "@/lib/pilotage-expense-indicator"
import { buildPilotageExpensesBridgeNarrative } from "@/lib/pilotage-expense-performance-narrative"
import { EXPENSE_FIXED_COSTS_HEADING, EXPENSE_VARIABLE_COSTS_HEADING } from "@/lib/expense-cost-breakdown-tables"
import { packPilotageExpensesLecturePages } from "@/lib/report-narrative-pagination"

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
    mapping({ account_number: "5010", description: "Matières premières", link_code: "CMV-A.1", variable_costs: true }),
    mapping({ account_number: "6010", description: "Salaires admin", link_code: "ADM-A.1", fixed_costs: true }),
  ]

  return {
    periods,
    rows,
    mappings,
    refMonth: 8,
    refYear: 2026,
  }
}

describe("buildPilotageExpensesBridgeNarrative", () => {
  it("émet 3 sous-sections par catégorie de coûts", () => {
    const fixture = buildMonthlyFixture()
    const result = buildPilotageExpensesBridgeNarrative({
      mappings: fixture.mappings,
      seriesRows: fixture.rows,
      periods: fixture.periods,
      refMonth: fixture.refMonth,
      refYear: fixture.refYear,
      fiscalYearEnd: "12-31",
    })

    expect(result?.title).toBe("Lecture des dépenses")
    expect(result?.paragraphs).toHaveLength(6)

    const variable = result?.paragraphs.filter((p) => p.heading === EXPENSE_VARIABLE_COSTS_HEADING)
    expect(variable?.map((p) => p.subsection)).toEqual([
      "Performance actuelle",
      "Performance de l'exercice (YTD)",
      "Tendance des 12 derniers mois",
    ])
    expect(variable?.[0]?.body).toContain("coûts variables")

    const fixed = result?.paragraphs.filter((p) => p.heading === EXPENSE_FIXED_COSTS_HEADING)
    expect(fixed?.map((p) => p.subsection)).toEqual([
      "Performance actuelle",
      "Performance de l'exercice (YTD)",
      "Tendance des 12 derniers mois",
    ])
  })

  it("regroupe CV et CF sur deux pages de lecture", () => {
    const fixture = buildMonthlyFixture()
    const result = buildPilotageExpensesBridgeNarrative({
      mappings: fixture.mappings,
      seriesRows: fixture.rows,
      periods: fixture.periods,
      refMonth: fixture.refMonth,
      refYear: fixture.refYear,
      fiscalYearEnd: "12-31",
    })
    const pages = packPilotageExpensesLecturePages(result?.paragraphs)
    expect(pages).toHaveLength(2)
    expect(pages[0]?.every((p) => p.heading === EXPENSE_VARIABLE_COSTS_HEADING)).toBe(true)
    expect(pages[1]?.every((p) => p.heading === EXPENSE_FIXED_COSTS_HEADING)).toBe(true)
  })
})

describe("buildPilotageExpenseIndicatorTables", () => {
  it("construit les tableaux Performance actuelle, YTD et TTM pour CV et CF", () => {
    const fixture = buildMonthlyFixture()
    const tables = buildPilotageExpenseIndicatorTables({
      mappings: fixture.mappings,
      seriesRows: fixture.rows,
      periods: fixture.periods,
      refMonth: fixture.refMonth,
      refYear: fixture.refYear,
      fiscalYearEnd: "12-31",
    })

    const variableCurrent = tables.get(
      pilotageExpenseIndicatorTableKey(EXPENSE_VARIABLE_COSTS_HEADING, "Performance actuelle"),
    )
    expect(variableCurrent?.metrics).toHaveLength(1)
    expect(variableCurrent?.metrics[0]?.label).toBe("Coûts variables")
    expect(variableCurrent?.columnGroups.length).toBeGreaterThanOrEqual(2)

    const fixedYtd = tables.get(
      pilotageExpenseIndicatorTableKey(
        EXPENSE_FIXED_COSTS_HEADING,
        "Performance de l'exercice (YTD)",
      ),
    )
    expect(fixedYtd?.columnGroups.map((group) => group.label)).toEqual(["YTD 2026", "YTD 2025"])
  })
})
