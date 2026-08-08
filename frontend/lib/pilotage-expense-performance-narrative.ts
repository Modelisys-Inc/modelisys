import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import {
  collectAllFixedCostAccountNumbers,
  collectAllVariableCostAccountNumbers,
} from "@/lib/expense-contribution-bridge"
import {
  PILOTAGE_MARGIN_AND_BAIIA_BLOCK_ID,
  PILOTAGE_MARGIN_AND_BAIIA_HEADING,
} from "@/lib/expense-cost-breakdown-tables"
import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import { buildPilotageMarginAndBaiiaParagraphs } from "@/lib/pilotage-margin-and-baiia-narrative"
import { extractMonthlyExpenseBridgeSeries } from "@/lib/pilotage-revenue-metrics"

function emptyVariableCostBody(): string {
  return "Aucun compte n'est marqué comme coût variable : la contribution marginale ne peut pas être calculée."
}

function emptyFixedCostBody(): string {
  return `Aucun compte n'est marqué comme coût fixe : le ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} ne peut pas être mesuré.`
}

function wrapParagraphs(
  contentParagraphs: PerformanceNarrativeParagraph[],
  options?: {
    emptyCmBody?: string
    emptyCfBody?: string
  },
): PerformanceNarrativeParagraph[] {
  if (!contentParagraphs.length) {
    const emptyBody = [options?.emptyCmBody, options?.emptyCfBody].filter(Boolean).join(" ")
    if (!emptyBody) return []
    return [
      {
        heading: PILOTAGE_MARGIN_AND_BAIIA_HEADING,
        divisionTitle: PILOTAGE_MARGIN_AND_BAIIA_HEADING,
        divisionBlockId: PILOTAGE_MARGIN_AND_BAIIA_BLOCK_ID,
        section: "revenue-performance",
        narrativePageGroup: PILOTAGE_MARGIN_AND_BAIIA_BLOCK_ID,
        hideMainHeading: false,
        body: emptyBody,
        showIndicatorTable: false,
      },
    ]
  }

  return contentParagraphs.map((paragraph, index) => {
    const parts: string[] = []
    if (index === 0 && options?.emptyCmBody) parts.push(options.emptyCmBody)
    if (index === 0 && options?.emptyCfBody) parts.push(options.emptyCfBody)
    if (paragraph.body?.trim()) parts.push(paragraph.body.trim())

    return {
      heading: PILOTAGE_MARGIN_AND_BAIIA_HEADING,
      divisionTitle: PILOTAGE_MARGIN_AND_BAIIA_HEADING,
      divisionBlockId: PILOTAGE_MARGIN_AND_BAIIA_BLOCK_ID,
      section: "revenue-performance",
      narrativePageGroup: PILOTAGE_MARGIN_AND_BAIIA_BLOCK_ID,
      hideMainHeading: index > 0,
      subsection: paragraph.subsection,
      body: parts.join(" "),
      showIndicatorTable: true,
    }
  })
}

export function buildPilotageExpensesBridgeNarrative(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  refMonth: number
  refYear: number
  fiscalYearEnd: string
  standardLinkCodes?: StandardLinkCode[]
}): PerformanceNarrativeResult | null {
  const series = extractMonthlyExpenseBridgeSeries({
    mappings: params.mappings,
    seriesRows: params.seriesRows,
    periods: params.periods,
    refMonth: params.refMonth,
    refYear: params.refYear,
    standardLinkCodes: params.standardLinkCodes,
    monthCount: 36,
  })

  const variableAccounts = collectAllVariableCostAccountNumbers(params.mappings)
  const fixedAccounts = collectAllFixedCostAccountNumbers(params.mappings)
  const canBuildNarrative = variableAccounts.length > 0 && fixedAccounts.length > 0 && series.length > 0

  const contentParagraphs = canBuildNarrative
    ? buildPilotageMarginAndBaiiaParagraphs(series, params.fiscalYearEnd)
    : []

  const paragraphs = wrapParagraphs(contentParagraphs, {
    emptyCmBody: !variableAccounts.length ? emptyVariableCostBody() : undefined,
    emptyCfBody: !fixedAccounts.length ? emptyFixedCostBody() : undefined,
  })

  if (!paragraphs.length) return null

  return {
    mode: "monthly",
    title: "Lecture des dépenses",
    subtitle: `Évolution du ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} — performance actuelle, exercice cumulé et douze derniers mois`,
    referencePeriod: series[0]?.period ?? "",
    paragraphs,
  }
}
