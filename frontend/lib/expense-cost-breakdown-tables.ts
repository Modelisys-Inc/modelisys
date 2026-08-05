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
import type { ContributiveMarginEvolutionDetailRow, ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  resolveExpenseCostGroupingFromLinkCode,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"
import { getRowAmounts } from "@/lib/series-utils"
import {
  monthTrendFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"

const DATA_EPSILON = 1e-6

export const EXPENSE_VARIABLE_COSTS_HEADING = "Coûts variables"
export const EXPENSE_FIXED_COSTS_HEADING = "Coûts fixes"

const UNMAPPED_GROUP_ID = "__unmapped__"

function buildStandardLinkCodeLookup(codes: StandardLinkCode[] | undefined): StandardLinkCodeLookup {
  return new Map((codes ?? []).map((code) => [code.code, code]))
}

function sumNullableSeries(a: (number | null)[], b: (number | null)[]): (number | null)[] {
  return a.map((value, index) => {
    const other = b[index]
    if (value === null && other === null) return null
    return (value ?? 0) + (other ?? 0)
  })
}

function resolveParentGroupForAccount(
  accountNumber: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  codeByCode: StandardLinkCodeLookup,
): { id: string; label: string } {
  const mapping = mappingsByAccount.get(accountNumber)
  const linkCode = mapping?.link_code?.trim()
  if (!linkCode) {
    return { id: UNMAPPED_GROUP_ID, label: "Sans code de liaison" }
  }

  const group = resolveExpenseCostGroupingFromLinkCode(linkCode, codeByCode)
  if (group) return group

  return { id: linkCode, label: linkCode }
}

export function buildGroupedEvolutionDetailRows(params: {
  accountNumbers: string[]
  mappingsByAccount: Map<string, AccountMappingData>
  rows: SeriesRow[]
  periodsRaw: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
  resolveParentGroup?: (
    accountNumber: string,
    mappingsByAccount: Map<string, AccountMappingData>,
    codeByCode: StandardLinkCodeLookup,
  ) => { id: string; label: string }
}): ContributiveMarginEvolutionDetailRow[] {
  const {
    accountNumbers,
    mappingsByAccount,
    rows,
    periodsRaw,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
    resolveParentGroup = resolveParentGroupForAccount,
  } = params

  const glRowsByParent = new Map<string, ContributiveMarginEvolutionDetailRow[]>()
  const parentMeta = new Map<string, { id: string; label: string }>()

  for (const accountNumber of accountNumbers) {
    const trend = accountCostTrend(
      accountNumber,
      mappingsByAccount,
      rows,
      periodsRaw,
      view,
      refMonth,
      refYear,
    )
    if (!trend || trend.length < windowSize) continue

    const glRow: ContributiveMarginEvolutionDetailRow = {
      id: accountNumber,
      label: resolveAccountLabel(accountNumber, mappingsByAccount, rows),
      displayKind: "gl-account",
      values: trend.slice(0, windowSize),
    }

    const group = resolveParentGroup(accountNumber, mappingsByAccount, codeByCode)
    parentMeta.set(group.id, group)
    const siblings = glRowsByParent.get(group.id) ?? []
    siblings.push(glRow)
    glRowsByParent.set(group.id, siblings)
  }

  return [...parentMeta.entries()]
    .map(([groupId, meta]) => {
      const children = (glRowsByParent.get(groupId) ?? []).sort((a, b) => {
        const aLatest = a.values[0] ?? 0
        const bLatest = b.values[0] ?? 0
        return (bLatest as number) - (aLatest as number)
      })

      if (!children.length) return null

      const parentValues = children.reduce(
        (acc, child) => sumNullableSeries(acc, child.values),
        children[0]!.values.map(() => 0 as number | null),
      )

      if (groupId === UNMAPPED_GROUP_ID && children.length === 1) {
        return children[0]!
      }

      return {
        id: groupId,
        label: meta.label,
        displayKind: "link-code" as const,
        values: parentValues,
        detailRows: children,
      }
    })
    .filter((row): row is ContributiveMarginEvolutionDetailRow => row !== null)
    .sort((a, b) => {
      const aLatest = a.values[0] ?? 0
      const bLatest = b.values[0] ?? 0
      return (bLatest as number) - (aLatest as number)
    })
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

function buildCostSectionTable(params: {
  sectionId: string
  heading: string
  totalLabel: string
  accountNumbers: string[]
  totalValues: number[]
  revenueValues: number[]
  periods: string[]
  mappingsByAccount: Map<string, AccountMappingData>
  rows: SeriesRow[]
  periodsRaw: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  windowSize: number
  codeByCode: StandardLinkCodeLookup
}): ContributiveMarginEvolutionTable | null {
  const {
    sectionId,
    heading,
    totalLabel,
    accountNumbers,
    totalValues,
    revenueValues,
    periods,
    mappingsByAccount,
    rows,
    periodsRaw,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  } = params

  if (!periods.length || !windowSize) return null

  const detailRows = buildGroupedEvolutionDetailRows({
    accountNumbers,
    mappingsByAccount,
    rows,
    periodsRaw,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })

  const sourceRevenuesByPeriod = revenueValues.map((revenue) =>
    Math.abs(revenue) > DATA_EPSILON ? revenue : null,
  )

  return {
    sourceId: sectionId,
    sourceLabel: heading,
    periods,
    sourceRevenuesByPeriod,
    metrics: [
      {
        id: "total",
        label: totalLabel,
        format: "currency",
        values: totalValues,
        detailRows: detailRows.length ? detailRows : undefined,
      },
    ],
  }
}

export function buildExpenseCostBreakdownTables(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  view: string
  refMonth: number
  refYear: number
  bridge: ExpenseContributionBridgeResult
  standardLinkCodes?: StandardLinkCode[]
}): Map<string, ContributiveMarginEvolutionTable> {
  const { mappings, seriesRows, periods, view, refMonth, refYear, bridge, standardLinkCodes } =
    params
  const tables = new Map<string, ContributiveMarginEvolutionTable>()
  if (!bridge.points.length || !periods.length) return tables

  const codeByCode = buildStandardLinkCodeLookup(standardLinkCodes)

  const bridgePoints = bridge.points
  const windowSize = bridgePoints.length
  const periodLabels = bridgePoints.map((p) => p.period)
  const revenueValues = bridgePoints.map((p) => p.revenue)
  const variableValues = bridgePoints.map((p) => p.variableCosts)
  const fixedValues = bridgePoints.map((p) => p.fixedCosts)

  const mappingsByAccount = new Map(mappings.map((m) => [m.account_number, m]))
  const variableAccounts = collectAllVariableCostAccountNumbers(mappings)
  const fixedAccounts = collectAllFixedCostAccountNumbers(mappings)

  const variableTable = buildCostSectionTable({
    sectionId: "expense-variable-costs",
    heading: EXPENSE_VARIABLE_COSTS_HEADING,
    totalLabel: "Total coûts variables",
    accountNumbers: variableAccounts,
    totalValues: variableValues,
    revenueValues,
    periods: periodLabels,
    mappingsByAccount,
    rows: seriesRows,
    periodsRaw: periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })
  if (variableTable) tables.set(EXPENSE_VARIABLE_COSTS_HEADING, variableTable)

  const fixedTable = buildCostSectionTable({
    sectionId: "expense-fixed-costs",
    heading: EXPENSE_FIXED_COSTS_HEADING,
    totalLabel: "Total coûts fixes",
    accountNumbers: fixedAccounts,
    totalValues: fixedValues,
    revenueValues,
    periods: periodLabels,
    mappingsByAccount,
    rows: seriesRows,
    periodsRaw: periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })
  if (fixedTable) tables.set(EXPENSE_FIXED_COSTS_HEADING, fixedTable)

  return tables
}
