import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import type { ExpenseContributionBridgePoint } from "@/lib/expense-contribution-bridge"

const DATA_EPSILON = 1e-6
const CHART_POINT_COUNT = 48

export type BreakevenChartPoint = {
  revenue: number
  revenueLine: number
  totalCosts: number
  fixedCosts: number
}

export type BreakevenAnalysis = {
  period: string
  revenue: number
  variableCosts: number
  fixedCosts: number
  totalCosts: number
  /** Coûts variables pour 1 $ de chiffre d'affaires (0–1). */
  variableCostRatio: number | null
  contributionMarginRatio: number | null
  breakevenRevenue: number | null
  marginOfSafety: number | null
  marginOfSafetyPct: number | null
  isAboveBreakeven: boolean | null
  chartMaxRevenue: number
  chartMaxY: number
  chartPoints: BreakevenChartPoint[]
}

export type BreakevenScenario = {
  revenue: number
  variableCosts: number
  fixedCosts: number
  totalCosts: number
  contributiveMargin: number
  operatingProfit: number
  operatingMarginPct: number | null
  contributiveMarginPct: number | null
  gapToBreakeven: number | null
  gapToBreakevenPct: number | null
  isAboveBreakeven: boolean | null
  isAtActualRevenue: boolean
  isAtBreakeven: boolean
  badge: "actual" | "breakeven" | "scenario" | null
  interpretation: string
}

function fmtPctPlain(p: number, digits = 1): string {
  return `${p.toFixed(digits).replace(".", ",")} %`
}

/** Projette les postes CVP à un niveau de chiffre d'affaires simulé. */
export function projectBreakevenScenario(
  analysis: BreakevenAnalysis,
  scenarioRevenue: number,
  options?: { actualTolerance?: number; breakevenTolerance?: number },
): BreakevenScenario {
  const revenue = Math.max(0, scenarioRevenue)
  const vcr = analysis.variableCostRatio ?? 0
  const variableCosts = vcr * revenue
  const fixedCosts = analysis.fixedCosts
  const totalCosts = variableCosts + fixedCosts
  const contributiveMargin = revenue - variableCosts
  const operatingProfit = revenue - totalCosts
  const operatingMarginPct =
    Math.abs(revenue) > DATA_EPSILON ? (operatingProfit / revenue) * 100 : null
  const contributiveMarginPct =
    Math.abs(revenue) > DATA_EPSILON ? (contributiveMargin / revenue) * 100 : null

  const actualTol = options?.actualTolerance ?? analysis.chartMaxRevenue * 0.012
  const beTol = options?.breakevenTolerance ?? analysis.chartMaxRevenue * 0.012

  const isAtActualRevenue = Math.abs(revenue - analysis.revenue) <= actualTol
  const isAtBreakeven =
    analysis.breakevenRevenue !== null &&
    Math.abs(revenue - analysis.breakevenRevenue) <= beTol

  let gapToBreakeven: number | null = null
  let gapToBreakevenPct: number | null = null
  let isAboveBreakeven: boolean | null = null

  if (analysis.breakevenRevenue !== null) {
    gapToBreakeven = revenue - analysis.breakevenRevenue
    gapToBreakevenPct =
      Math.abs(analysis.breakevenRevenue) > DATA_EPSILON
        ? (gapToBreakeven / analysis.breakevenRevenue) * 100
        : null
    isAboveBreakeven = gapToBreakeven >= 0
  }

  let badge: BreakevenScenario["badge"] = "scenario"
  if (isAtActualRevenue) badge = "actual"
  else if (isAtBreakeven) badge = "breakeven"

  let interpretation: string
  if (isAtBreakeven) {
    interpretation =
      `Point d'équilibre : les revenus couvrent exactement l'ensemble des coûts fixes et variables. Le ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} est nul.`
  } else if (operatingProfit > DATA_EPSILON) {
    interpretation = `À ce chiffre d'affaires, l'entreprise couvre ses charges et dégage un ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} de ${operatingMarginPct !== null ? `${fmtPctPlain(operatingMarginPct)} du CA, soit ` : ""}un excédent opérationnel positif.`
  } else if (operatingProfit < -DATA_EPSILON) {
    const gapText =
      gapToBreakeven !== null && gapToBreakeven < 0
        ? ` Il manque environ ${fmtPctPlain(Math.abs((gapToBreakeven / (analysis.breakevenRevenue ?? 1)) * 100))} de CA pour atteindre le seuil de rentabilité.`
        : ""
    interpretation = `À ce chiffre d'affaires, les coûts totaux excèdent les revenus : l'entreprise enregistre une perte d'exploitation.${gapText}`
  } else {
    interpretation =
      "Les revenus équilibrent les coûts totaux à ce niveau d'activité simulé."
  }

  return {
    revenue,
    variableCosts,
    fixedCosts,
    totalCosts,
    contributiveMargin,
    operatingProfit,
    operatingMarginPct,
    contributiveMarginPct,
    gapToBreakeven,
    gapToBreakevenPct,
    isAboveBreakeven,
    isAtActualRevenue,
    isAtBreakeven,
    badge,
    interpretation,
  }
}

function roundChartMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1.5 ? 1 : normalized <= 3 ? 2 : normalized <= 7 ? 5 : 10
  return step * magnitude
}

export function computeBreakevenAnalysis(
  point: ExpenseContributionBridgePoint | undefined,
): BreakevenAnalysis | null {
  if (!point || Math.abs(point.revenue) < DATA_EPSILON) return null

  const { revenue, variableCosts, fixedCosts, period } = point
  const totalCosts = variableCosts + fixedCosts
  const variableCostRatio = revenue > DATA_EPSILON ? variableCosts / revenue : null
  const contributionMarginRatio =
    revenue > DATA_EPSILON ? (revenue - variableCosts) / revenue : null

  let breakevenRevenue: number | null = null
  if (contributionMarginRatio !== null && contributionMarginRatio > DATA_EPSILON) {
    breakevenRevenue = fixedCosts / contributionMarginRatio
  }

  let marginOfSafety: number | null = null
  let marginOfSafetyPct: number | null = null
  let isAboveBreakeven: boolean | null = null

  if (breakevenRevenue !== null && Number.isFinite(breakevenRevenue)) {
    marginOfSafety = revenue - breakevenRevenue
    marginOfSafetyPct =
      Math.abs(breakevenRevenue) > DATA_EPSILON ? (marginOfSafety / breakevenRevenue) * 100 : null
    isAboveBreakeven = marginOfSafety >= 0
  }

  const rawMax = Math.max(
    revenue * 1.15,
    breakevenRevenue !== null ? breakevenRevenue * 1.2 : 0,
    totalCosts * 1.1,
    fixedCosts * 1.5,
  )
  const chartMaxRevenue = roundChartMax(rawMax)
  const chartMaxY = chartMaxRevenue

  const chartPoints: BreakevenChartPoint[] = []
  const vcr = variableCostRatio ?? 0
  for (let i = 0; i <= CHART_POINT_COUNT; i++) {
    const r = (chartMaxRevenue * i) / CHART_POINT_COUNT
    chartPoints.push({
      revenue: r,
      revenueLine: r,
      totalCosts: fixedCosts + vcr * r,
      fixedCosts,
    })
  }

  return {
    period,
    revenue,
    variableCosts,
    fixedCosts,
    totalCosts,
    variableCostRatio,
    contributionMarginRatio,
    breakevenRevenue,
    marginOfSafety,
    marginOfSafetyPct,
    isAboveBreakeven,
    chartMaxRevenue,
    chartMaxY,
    chartPoints,
  }
}
