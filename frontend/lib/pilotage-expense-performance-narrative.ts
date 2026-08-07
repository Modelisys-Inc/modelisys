import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import {
  collectAllFixedCostAccountNumbers,
  collectAllVariableCostAccountNumbers,
} from "@/lib/expense-contribution-bridge"
import {
  EXPENSE_FIXED_COSTS_HEADING,
  EXPENSE_VARIABLE_COSTS_HEADING,
} from "@/lib/expense-cost-breakdown-tables"
import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import {
  buildPilotageScalarMetricParagraphs,
  createExpenseCostMetricConfig,
} from "@/lib/pilotage-revenue-performance-narrative"
import {
  computePilotageExpenseScalarMetrics,
  extractMonthlyExpenseBridgeSeries,
} from "@/lib/pilotage-revenue-metrics"

const VARIABLE_COST_CONFIG = createExpenseCostMetricConfig(
  EXPENSE_VARIABLE_COSTS_HEADING,
  "les coûts variables",
  "pilotage-variable-costs",
)

const FIXED_COST_CONFIG = createExpenseCostMetricConfig(
  EXPENSE_FIXED_COSTS_HEADING,
  "les coûts fixes",
  "pilotage-fixed-costs",
)

function emptyVariableCostParagraph(): PerformanceNarrativeParagraph {
  return {
    heading: EXPENSE_VARIABLE_COSTS_HEADING,
    divisionTitle: EXPENSE_VARIABLE_COSTS_HEADING,
    divisionBlockId: "pilotage-variable-costs",
    body:
      "Aucun compte n'est marqué comme coût variable dans le mapping comptable. Paramétrez le type « Variable » sur les comptes de charges directement liées à l'activité afin de quantifier la contribution marginale.",
  }
}

function emptyFixedCostParagraph(): PerformanceNarrativeParagraph {
  return {
    heading: EXPENSE_FIXED_COSTS_HEADING,
    divisionTitle: EXPENSE_FIXED_COSTS_HEADING,
    divisionBlockId: "pilotage-fixed-costs",
    body: `Aucun compte n'est marqué comme coût fixe dans le mapping comptable. Paramétrez le type « Fixe » sur les charges de structure (salaires admin, loyers, amortissement opérationnel hors dotation, etc.) pour mesurer le passage de la contribution marginale au ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}.`,
  }
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
  const paragraphs: PerformanceNarrativeParagraph[] = []

  if (!variableAccounts.length) {
    paragraphs.push(emptyVariableCostParagraph())
  } else {
    const metrics = computePilotageExpenseScalarMetrics(
      series,
      params.fiscalYearEnd,
      (point) => point.variableCosts,
    )
    if (metrics) {
      paragraphs.push(
        ...buildPilotageScalarMetricParagraphs(VARIABLE_COST_CONFIG, metrics, null, {
          showIndicatorTable: true,
        }),
      )
    }
  }

  if (!fixedAccounts.length) {
    paragraphs.push(emptyFixedCostParagraph())
  } else {
    const metrics = computePilotageExpenseScalarMetrics(
      series,
      params.fiscalYearEnd,
      (point) => point.fixedCosts,
    )
    if (metrics) {
      paragraphs.push(
        ...buildPilotageScalarMetricParagraphs(FIXED_COST_CONFIG, metrics, null, {
          showIndicatorTable: true,
        }),
      )
    }
  }

  if (!paragraphs.length) return null

  return {
    mode: "monthly",
    title: "Lecture des dépenses",
    subtitle:
      "Analyse mensuelle — coûts variables et fixes (performance actuelle, exercice cumulé et douze derniers mois)",
    referencePeriod: series[0]?.period ?? "",
    paragraphs,
  }
}
