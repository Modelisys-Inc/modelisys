import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import type { DivisionProfitabilitySlice, DivisionSeriesBundle } from "@/lib/division-profitability"
import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import { filterMappingsForDivision } from "@/lib/mapping-division-utils"
import { buildPilotageBridgeIndicatorTables } from "@/lib/pilotage-expense-indicator"
import type { PilotageMarginIndicatorTable } from "@/lib/pilotage-margin-by-revenue-indicator"
import { buildPilotageMarginAndBaiiaParagraphs } from "@/lib/pilotage-margin-and-baiia-narrative"
import { extractMonthlyExpenseBridgeSeries } from "@/lib/pilotage-revenue-metrics"

export function pilotageDivisionRentabilityHeading(divisionName: string): string {
  return `Rentabilité — ${divisionName}`
}

function pilotageDivisionTableSectionId(divisionId: string): string {
  return `pilotage-division-${divisionId}`
}

export function buildPilotageDivisionProfitabilityNarrative(params: {
  slices: DivisionProfitabilitySlice[]
  divisionSeries: DivisionSeriesBundle[]
  mappings: AccountMappingData[]
  refMonth: number
  refYear: number
  fiscalYearEnd: string
  standardLinkCodes?: StandardLinkCode[]
}): PerformanceNarrativeResult | null {
  const seriesByDivision = new Map(params.divisionSeries.map((entry) => [entry.divisionId, entry]))
  const paragraphs: PerformanceNarrativeParagraph[] = []
  let referencePeriod = ""

  for (const slice of params.slices) {
    const bundle = seriesByDivision.get(slice.divisionId)
    if (!bundle?.rows.length || !bundle.periods.length) continue

    const divisionMappings = filterMappingsForDivision(params.mappings, slice.divisionId, slice.heading)
    const series = extractMonthlyExpenseBridgeSeries({
      mappings: divisionMappings,
      seriesRows: bundle.rows,
      periods: bundle.periods,
      refMonth: params.refMonth,
      refYear: params.refYear,
      standardLinkCodes: params.standardLinkCodes,
      monthCount: 36,
    })
    if (!series.length) continue
    if (!referencePeriod) referencePeriod = series[0]?.period ?? ""

    const heading = pilotageDivisionRentabilityHeading(slice.heading)
    const contentParagraphs = buildPilotageMarginAndBaiiaParagraphs(series, params.fiscalYearEnd)
    contentParagraphs.forEach((paragraph, index) => {
      paragraphs.push({
        ...paragraph,
        heading,
        divisionTitle: slice.heading,
        divisionBlockId: slice.divisionId,
        section: "division-rentability",
        narrativePageGroup: slice.divisionId,
        hideMainHeading: index > 0,
        showIndicatorTable: true,
      })
    })
  }

  if (!paragraphs.length) return null

  return {
    mode: "monthly",
    title: "Lecture de la performance",
    subtitle: `Évolution du ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} par division — performance actuelle, exercice cumulé et douze derniers mois`,
    referencePeriod,
    paragraphs,
  }
}

export function buildPilotageDivisionExpenseIndicatorTables(params: {
  slices: DivisionProfitabilitySlice[]
  divisionSeries: DivisionSeriesBundle[]
  mappings: AccountMappingData[]
  refMonth: number
  refYear: number
  fiscalYearEnd: string
  standardLinkCodes?: StandardLinkCode[]
}): Map<string, PilotageMarginIndicatorTable> {
  const tables = new Map<string, PilotageMarginIndicatorTable>()
  const seriesByDivision = new Map(params.divisionSeries.map((entry) => [entry.divisionId, entry]))

  for (const slice of params.slices) {
    const bundle = seriesByDivision.get(slice.divisionId)
    if (!bundle?.rows.length || !bundle.periods.length) continue

    const divisionMappings = filterMappingsForDivision(params.mappings, slice.divisionId, slice.heading)
    const heading = pilotageDivisionRentabilityHeading(slice.heading)
    const divisionTables = buildPilotageBridgeIndicatorTables({
      mappings: divisionMappings,
      seriesRows: bundle.rows,
      periods: bundle.periods,
      refMonth: params.refMonth,
      refYear: params.refYear,
      fiscalYearEnd: params.fiscalYearEnd,
      standardLinkCodes: params.standardLinkCodes,
      tableHeading: heading,
      tableSectionId: pilotageDivisionTableSectionId(slice.divisionId),
    })

    for (const [key, table] of divisionTables) {
      tables.set(key, table)
    }
  }

  return tables
}
