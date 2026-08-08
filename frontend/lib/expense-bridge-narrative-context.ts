import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  collectAllFixedCostAccountNumbers,
  collectAllVariableCostAccountNumbers,
  type ExpenseContributionBridgeResult,
} from "@/lib/expense-contribution-bridge"
import {
  buildSyntheticSeriesRow,
  findSeriesRowByCode,
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
} from "@/lib/performance-chart-series"
import {
  resolveExpenseCostGroupingFromLinkCode,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"
import { getRowAmounts } from "@/lib/series-utils"
import {
  analyzeVariableCostDrivers,
  type VariableCostDriverShift,
} from "@/lib/expense-variable-cost-driver-analysis"
import {
  monthTrendFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"

const DATA_EPSILON = 1e-6
const TOP_DRIVER_COUNT = 3

export type ExpenseCostDriver = {
  id: string
  label: string
  kind: "gl-account" | "link-code"
  amount: number
  shareOfCategoryPct: number
  shareOfRevenuePct: number
}

export type ExpenseBridgeNarrativeContext = {
  topVariableDrivers: ExpenseCostDriver[]
  topVariableDriversByRevenueShift: VariableCostDriverShift[]
  topFixedDrivers: ExpenseCostDriver[]
}

function buildStandardLinkCodeLookup(codes: StandardLinkCode[] | undefined): StandardLinkCodeLookup {
  return new Map((codes ?? []).map((code) => [code.code, code]))
}

function accountAmountsForPeriods(
  accountNumber: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
): number[] {
  const mapping = mappingsByAccount.get(accountNumber)
  let row = findSeriesRowByCode(rows, accountNumber)
  if (!row && mapping?.link_code) {
    row = findSeriesRowByCode(rows, mapping.link_code.trim())
  }
  if (!row) return periods.map(() => 0)
  const amounts = getRowAmounts(row, periods)
  return amounts.map((value) => Math.abs(value ?? 0))
}

function accountCostTrend(
  accountNumber: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!periods.length) return null
  const monthly = accountAmountsForPeriods(accountNumber, mappingsByAccount, rows, periods)
  const synthetic = buildSyntheticSeriesRow(periods, monthly)
  if (view === "years") {
    return yearTrendFromReference(synthetic, periods, refYear, PERFORMANCE_CHART_YEAR_COUNT)
  }
  if (view === "24months") {
    return monthTrendFromReference(
      synthetic,
      periods,
      refMonth,
      refYear,
      PERFORMANCE_CHART_MONTH_COUNT_24,
    )
  }
  return null
}

function resolveAccountLabel(
  accountNumber: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
): string {
  const mapping = mappingsByAccount.get(accountNumber)
  const description = mapping?.description?.trim()
  if (description) return description
  const row = findSeriesRowByCode(rows, accountNumber)
  if (row?.label?.trim()) return row.label.trim()
  return accountNumber
}

function buildDriversForAccounts(params: {
  accountNumbers: string[]
  categoryTotal: number
  revenue: number
  mappingsByAccount: Map<string, AccountMappingData>
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  codeByCode: StandardLinkCodeLookup
  groupByLinkCode?: boolean
}): ExpenseCostDriver[] {
  const {
    accountNumbers,
    categoryTotal,
    revenue,
    mappingsByAccount,
    rows,
    periods,
    view,
    refMonth,
    refYear,
    codeByCode,
    groupByLinkCode = false,
  } = params

  const bucket = new Map<string, { label: string; kind: ExpenseCostDriver["kind"]; amount: number }>()

  for (const accountNumber of accountNumbers) {
    const trend = accountCostTrend(
      accountNumber,
      mappingsByAccount,
      rows,
      periods,
      view,
      refMonth,
      refYear,
    )
    const amount = trend?.[0] ?? 0
    if (Math.abs(amount) < DATA_EPSILON) continue

    let id = accountNumber
    let label = resolveAccountLabel(accountNumber, mappingsByAccount, rows)
    let kind: ExpenseCostDriver["kind"] = "gl-account"

    if (groupByLinkCode) {
      const mapping = mappingsByAccount.get(accountNumber)
      const group = resolveExpenseCostGroupingFromLinkCode(mapping?.link_code, codeByCode)
      if (group) {
        id = group.id
        label = group.label
        kind = "link-code"
      }
    }

    const existing = bucket.get(id)
    if (existing) {
      existing.amount += amount
    } else {
      bucket.set(id, { label, kind, amount })
    }
  }

  return [...bucket.entries()]
    .map(([id, meta]) => ({
      id,
      label: meta.label,
      kind: meta.kind,
      amount: meta.amount,
      shareOfCategoryPct:
        Math.abs(categoryTotal) > DATA_EPSILON ? (meta.amount / categoryTotal) * 100 : 0,
      shareOfRevenuePct: Math.abs(revenue) > DATA_EPSILON ? (meta.amount / revenue) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_DRIVER_COUNT)
}

export function buildExpenseBridgeNarrativeContext(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  bridge: ExpenseContributionBridgeResult
  standardLinkCodes?: StandardLinkCode[]
}): ExpenseBridgeNarrativeContext | null {
  const { mappings, seriesRows, periods, view, refMonth, refYear, bridge, standardLinkCodes } = params
  const latest = bridge.points[0]
  if (!latest || !periods.length) return null

  const mappingsByAccount = new Map(mappings.map((m) => [m.account_number, m]))
  const codeByCode = buildStandardLinkCodeLookup(standardLinkCodes)
  const variableAccounts = collectAllVariableCostAccountNumbers(mappings)
  const fixedAccounts = collectAllFixedCostAccountNumbers(mappings)

  const prior = bridge.points[1]
  const variableDriverAnalysis =
    prior && Math.abs(prior.revenue) > DATA_EPSILON
      ? analyzeVariableCostDrivers({
          accountNumbers: variableAccounts,
          currentRevenue: latest.revenue,
          currentCategoryTotal: latest.variableCosts,
          priorRevenue: prior.revenue,
          priorCategoryTotal: prior.variableCosts,
          resolveCurrentAmount: (accountNumber) =>
            accountCostTrend(accountNumber, mappingsByAccount, seriesRows, periods, view, refMonth, refYear)?.[0] ??
            0,
          resolvePriorAmount: (accountNumber) =>
            accountCostTrend(accountNumber, mappingsByAccount, seriesRows, periods, view, refMonth, refYear)?.[1] ??
            0,
          mappingsByAccount,
          rows: seriesRows,
          standardLinkCodes,
          groupByLinkCode: true,
        })
      : null

  return {
    topVariableDrivers: variableDriverAnalysis?.topByRevenueShare ?? buildDriversForAccounts({
      accountNumbers: variableAccounts,
      categoryTotal: latest.variableCosts,
      revenue: latest.revenue,
      mappingsByAccount,
      rows: seriesRows,
      periods,
      view,
      refMonth,
      refYear,
      codeByCode,
      groupByLinkCode: true,
    }),
    topVariableDriversByRevenueShift: variableDriverAnalysis?.topByRevenueShift ?? [],
    topFixedDrivers: buildDriversForAccounts({
      accountNumbers: fixedAccounts,
      categoryTotal: latest.fixedCosts,
      revenue: latest.revenue,
      mappingsByAccount,
      rows: seriesRows,
      periods,
      view,
      refMonth,
      refYear,
      codeByCode,
      groupByLinkCode: true,
    }),
  }
}
