import type { ExpenseContributionBridgePoint } from "@/lib/expense-contribution-bridge"

const DATA_EPSILON = 1e-6

export type ExpenseBridgeStackPercentPoint = ExpenseContributionBridgePoint & {
  variableCostsPct: number
  fixedCostsPct: number
  operatingProfitPct: number
  /** Segments empilés (BAIIA négatif → 0 % visible, détail dans l'infobulle). */
  variableCostsStackPct: number
  fixedCostsStackPct: number
  operatingProfitStackPct: number
}

function pctOfRevenue(value: number, revenue: number): number {
  return (value / revenue) * 100
}

/** Répartition % du CA : CV + CF + BAIIA = 100 % (quand revenus ≠ 0). */
export function toExpenseBridgeStackPercentPoint(
  point: ExpenseContributionBridgePoint,
): ExpenseBridgeStackPercentPoint | null {
  const revenue = point.revenue
  if (!Number.isFinite(revenue) || Math.abs(revenue) < DATA_EPSILON) return null

  const variableCostsPct = pctOfRevenue(point.variableCosts, revenue)
  const fixedCostsPct = pctOfRevenue(point.fixedCosts, revenue)
  const operatingProfitPct = pctOfRevenue(point.operatingProfit, revenue)

  return {
    ...point,
    variableCostsPct,
    fixedCostsPct,
    operatingProfitPct,
    variableCostsStackPct: variableCostsPct,
    fixedCostsStackPct: fixedCostsPct,
    operatingProfitStackPct: Math.max(0, operatingProfitPct),
  }
}

export function buildExpenseBridgeStackPercentSeries(
  points: ExpenseContributionBridgePoint[],
): ExpenseBridgeStackPercentPoint[] {
  return points
    .map((p) => toExpenseBridgeStackPercentPoint(p))
    .filter((p): p is ExpenseBridgeStackPercentPoint => p !== null)
}

export function formatBridgePercent(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")} %`
}
