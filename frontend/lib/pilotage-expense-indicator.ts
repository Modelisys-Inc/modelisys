import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import { findSeriesRowByCode } from "@/lib/performance-chart-series"
import {
  collectAllFixedCostAccountNumbers,
  collectAllVariableCostAccountNumbers,
} from "@/lib/expense-contribution-bridge"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import {
  PILOTAGE_MARGIN_AND_BAIIA_HEADING,
  PILOTAGE_MARGIN_AND_BAIIA_SECTION_ID,
} from "@/lib/expense-cost-breakdown-tables"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import {
  enumerateMonthsForward,
  fiscalYearLabelForReference,
  fiscalYearStartForReference,
  extractMonthlyExpenseBridgeSeries,
  type MonthlyExpenseBridgePoint,
} from "@/lib/pilotage-revenue-metrics"
import type { ContributiveMarginEvolutionDetailRow } from "@/lib/revenue-contributive-margin-evolution"
import { buildAmountsByCalendarMonth } from "@/lib/series-reference-columns"
import {
  resolveExpenseCostGroupingFromLinkCode,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"
import type {
  PilotageMarginIndicatorColumnGroup,
  PilotageMarginIndicatorMetric,
  PilotageMarginIndicatorTable,
} from "@/lib/pilotage-margin-by-revenue-indicator"

const DATA_EPSILON = 1e-6

type SnapshotSpec =
  | { kind: "point"; index: number }
  | { kind: "months"; months: Array<{ month: number; year: number }> }

type ExpenseCostSnapshot = {
  revenue: number
  cost: number
  costShare: number | null
}

function calendarMonthKey(month: number, year: number): string {
  return `${year}-${month}`
}

function buildStandardLinkCodeLookup(codes: StandardLinkCode[] | undefined): StandardLinkCodeLookup {
  return new Map((codes ?? []).map((code) => [code.code, code]))
}

function snapshotFromPoint(
  point: MonthlyExpenseBridgePoint | undefined,
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
): ExpenseCostSnapshot | null {
  if (!point) return null
  const cost = pickCost(point)
  const costShare =
    Math.abs(point.revenue) > DATA_EPSILON ? (cost / point.revenue) * 100 : null
  return { revenue: point.revenue, cost, costShare }
}

function aggregateSnapshot(
  points: MonthlyExpenseBridgePoint[],
  months: Array<{ month: number; year: number }>,
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
): ExpenseCostSnapshot | null {
  let revenue = 0
  let cost = 0
  let found = false
  for (const m of months) {
    const point = points.find((p) => p.month === m.month && p.year === m.year)
    if (!point) continue
    revenue += point.revenue
    cost += pickCost(point)
    found = true
  }
  if (!found) return null
  const costShare = Math.abs(revenue) > DATA_EPSILON ? (cost / revenue) * 100 : null
  return { revenue, cost, costShare }
}

function resolveSnapshot(
  spec: SnapshotSpec,
  points: MonthlyExpenseBridgePoint[],
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
): ExpenseCostSnapshot | null {
  if (spec.kind === "point") {
    return snapshotFromPoint(points[spec.index], pickCost)
  }
  return aggregateSnapshot(points, spec.months, pickCost)
}

function accountTrendAlignedWithBridge(
  accountNumber: string,
  bridgePoints: MonthlyExpenseBridgePoint[],
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
  periodsRaw: SeriesPeriod[],
): number[] | null {
  const mapping = mappingsByAccount.get(accountNumber)
  let row = findSeriesRowByCode(rows, accountNumber)
  if (!row && mapping?.link_code) {
    row = findSeriesRowByCode(rows, mapping.link_code.trim())
  }
  if (!row) return null

  const amountsByCal = buildAmountsByCalendarMonth(row, periodsRaw)
  return bridgePoints.map((point) =>
    Math.abs(amountsByCal.get(calendarMonthKey(point.month, point.year)) ?? 0),
  )
}

function resolveAmountAtSpec(
  amounts: number[],
  spec: SnapshotSpec,
  bridgePoints: MonthlyExpenseBridgePoint[],
): number | null {
  if (spec.kind === "point") {
    return amounts[spec.index] ?? null
  }
  let sum = 0
  let found = false
  for (const m of spec.months) {
    const index = bridgePoints.findIndex((p) => p.month === m.month && p.year === m.year)
    if (index < 0) continue
    sum += amounts[index] ?? 0
    found = true
  }
  return found ? sum : null
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

function buildCostDetailRowsForSpecs(
  accountNumbers: string[],
  specs: SnapshotSpec[],
  bridgePoints: MonthlyExpenseBridgePoint[],
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
  periodsRaw: SeriesPeriod[],
  codeByCode: StandardLinkCodeLookup,
): ContributiveMarginEvolutionDetailRow[] | undefined {
  const glRowsByParent = new Map<string, ContributiveMarginEvolutionDetailRow[]>()
  const parentMeta = new Map<string, { id: string; label: string }>()

  for (const accountNumber of accountNumbers) {
    const trend = accountTrendAlignedWithBridge(
      accountNumber,
      bridgePoints,
      mappingsByAccount,
      rows,
      periodsRaw,
    )
    if (!trend) continue

    const values = specs.map((spec) => resolveAmountAtSpec(trend, spec, bridgePoints))
    if (!values.some((value) => value !== null && Math.abs(value) > DATA_EPSILON)) continue

    const glRow: ContributiveMarginEvolutionDetailRow = {
      id: accountNumber,
      label: resolveAccountLabel(accountNumber, mappingsByAccount, rows),
      displayKind: "gl-account",
      values,
    }

    const linkCode = mappingsByAccount.get(accountNumber)?.link_code?.trim() ?? ""
    const group =
      resolveExpenseCostGroupingFromLinkCode(linkCode, codeByCode) ??
      (linkCode ? { id: linkCode, label: linkCode } : { id: "__unmapped__", label: "Sans code de liaison" })
    parentMeta.set(group.id, group)
    const siblings = glRowsByParent.get(group.id) ?? []
    siblings.push(glRow)
    glRowsByParent.set(group.id, siblings)
  }

  const grouped = [...parentMeta.entries()]
    .map(([groupId, meta]) => {
      const children = (glRowsByParent.get(groupId) ?? []).sort((a, b) => {
        const aLatest = a.values[0] ?? 0
        const bLatest = b.values[0] ?? 0
        return (bLatest as number) - (aLatest as number)
      })
      if (!children.length) return null

      if (groupId === "__unmapped__" && children.length === 1) {
        return children[0]!
      }

      const parentValues = children[0]!.values.map((_, index) =>
        children.reduce((sum, child) => sum + (child.values[index] ?? 0), 0),
      )

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

  return grouped.length ? grouped : undefined
}

function buildColumnGroups(
  labels: string[],
  withGaps: boolean[],
): PilotageMarginIndicatorColumnGroup[] {
  return labels.map((label, index) => ({
    label,
    includeShare: true,
    includeGap: withGaps[index] === true,
  }))
}

function buildCombinedBridgeMetrics(
  bridgeSnapshots: Array<{ revenue: number; variableCosts: number; fixedCosts: number }>,
  variableDetailRows?: ContributiveMarginEvolutionDetailRow[],
  fixedDetailRows?: ContributiveMarginEvolutionDetailRow[],
): PilotageMarginIndicatorMetric[] {
  const revenueValues = bridgeSnapshots.map((snapshot) => snapshot.revenue)
  const variableCostValues = bridgeSnapshots.map((snapshot) => snapshot.variableCosts)
  const contributiveMarginValues = bridgeSnapshots.map(
    (snapshot) => snapshot.revenue - snapshot.variableCosts,
  )
  const fixedCostValues = bridgeSnapshots.map((snapshot) => snapshot.fixedCosts)
  const operatingProfitValues = bridgeSnapshots.map(
    (snapshot) => snapshot.revenue - snapshot.variableCosts - snapshot.fixedCosts,
  )

  const shareOfRevenue = (values: number[]) =>
    values.map((value, index) => {
      const revenue = revenueValues[index]
      if (revenue === undefined || Math.abs(revenue) < DATA_EPSILON) return null
      return (value / revenue) * 100
    })

  const gapsFromReference = (values: (number | null)[]) =>
    values.map((value, index) => {
      if (index === 0 || value === null) return null
      const reference = values[0]
      if (reference === null) return null
      return reference - value
    })

  const buildMetric = (
    id: string,
    label: string,
    values: number[],
    detailRows?: ContributiveMarginEvolutionDetailRow[],
  ): PilotageMarginIndicatorMetric => ({
    id,
    label,
    format: "currency",
    values,
    shares: shareOfRevenue(values),
    gaps: gapsFromReference(values),
    detailRows,
  })

  return [
    buildMetric("revenue", "Revenus", revenueValues),
    buildMetric("variable-costs", "Coûts variables", variableCostValues, variableDetailRows),
    buildMetric("contributive-margin", "Contribution marginale", contributiveMarginValues),
    buildMetric("fixed-costs", "Coûts fixes", fixedCostValues, fixedDetailRows),
    buildMetric("baiia", EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL, operatingProfitValues),
  ]
}

function bridgeSnapshotsFromSpecs(
  specs: SnapshotSpec[],
  points: MonthlyExpenseBridgePoint[],
): Array<{ revenue: number; variableCosts: number; fixedCosts: number }> | null {
  const snapshots = specs.map((spec) => {
    const revenueSnapshot = resolveSnapshot(spec, points, (point) => point.revenue)
    const variableSnapshot = resolveSnapshot(spec, points, (point) => point.variableCosts)
    const fixedSnapshot = resolveSnapshot(spec, points, (point) => point.fixedCosts)
    if (!revenueSnapshot) return null
    return {
      revenue: revenueSnapshot.revenue,
      variableCosts: variableSnapshot?.cost ?? 0,
      fixedCosts: fixedSnapshot?.cost ?? 0,
    }
  })
  if (!snapshots.length || snapshots.some((snapshot) => snapshot === null)) return null
  return snapshots as Array<{ revenue: number; variableCosts: number; fixedCosts: number }>
}

type PilotageBridgeTableMeta = {
  sourceId: string
  sourceLabel: string
}

function buildCombinedTableFromSpecs(
  subsection: string,
  specs: SnapshotSpec[],
  columnLabels: string[],
  withGaps: boolean[],
  points: MonthlyExpenseBridgePoint[],
  tableMeta: PilotageBridgeTableMeta,
  variableDetailRows?: ContributiveMarginEvolutionDetailRow[],
  fixedDetailRows?: ContributiveMarginEvolutionDetailRow[],
): PilotageMarginIndicatorTable | null {
  const bridgeSnapshots = bridgeSnapshotsFromSpecs(specs, points)
  if (!bridgeSnapshots?.length) return null

  return {
    sourceId: tableMeta.sourceId,
    sourceLabel: tableMeta.sourceLabel,
    subsection,
    columnGroups: buildColumnGroups(columnLabels, withGaps),
    sourceRevenuesByColumn: bridgeSnapshots.map((snapshot) =>
      Math.abs(snapshot.revenue) > DATA_EPSILON ? snapshot.revenue : null,
    ),
    metrics: buildCombinedBridgeMetrics(bridgeSnapshots, variableDetailRows, fixedDetailRows),
  }
}

function buildCombinedSectionTables(
  variableAccounts: string[],
  fixedAccounts: string[],
  points: MonthlyExpenseBridgePoint[],
  fiscalYearEnd: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
  periodsRaw: SeriesPeriod[],
  codeByCode: StandardLinkCodeLookup,
  tableMeta: PilotageBridgeTableMeta,
): PilotageMarginIndicatorTable[] {
  if (!points.length) return []

  const buildDetailRows = (accountNumbers: string[], specs: SnapshotSpec[]) =>
    accountNumbers.length
      ? buildCostDetailRowsForSpecs(
          accountNumbers,
          specs,
          points,
          mappingsByAccount,
          rows,
          periodsRaw,
          codeByCode,
        )
      : undefined

  const refPoint = points[0]!
  const currentSpecs: SnapshotSpec[] = [{ kind: "point", index: 0 }]
  const currentLabels = [refPoint.period]
  const currentGaps = [false]
  if (points[12]) {
    currentSpecs.push({ kind: "point", index: 12 })
    currentLabels.push(points[12]!.period)
    currentGaps.push(true)
  }
  if (points[1]) {
    currentSpecs.push({ kind: "point", index: 1 })
    currentLabels.push(points[1]!.period)
    currentGaps.push(true)
  }

  const fiscalYearEndMonth = parseFiscalYearEndMonth(fiscalYearEnd)
  const fyStart = fiscalYearStartForReference(refPoint.month, refPoint.year, fiscalYearEndMonth)
  const ytdMonths = enumerateMonthsForward(fyStart, {
    month: refPoint.month,
    year: refPoint.year,
  })
  const fiscalYearLabel = fiscalYearLabelForReference(
    refPoint.month,
    refPoint.year,
    fiscalYearEndMonth,
  )
  const ytdSpecs: SnapshotSpec[] = [{ kind: "months", months: ytdMonths }]
  const ytdLabels = [`YTD ${fiscalYearLabel}`]
  const ytdGaps = [false]
  if (ytdMonths.length) {
    ytdSpecs.push({
      kind: "months",
      months: ytdMonths.map((month) => ({ month: month.month, year: month.year - 1 })),
    })
    ytdLabels.push(`YTD ${fiscalYearLabel - 1}`)
    ytdGaps.push(true)
  }

  const ttmSpecs: SnapshotSpec[] = [
    {
      kind: "months",
      months: points.slice(0, 12).map((point) => ({ month: point.month, year: point.year })),
    },
  ]
  const ttmLabels = ["TTM 12 mois"]
  const ttmGaps = [false]
  if (points.length >= 24) {
    ttmSpecs.push({
      kind: "months",
      months: points.slice(12, 24).map((point) => ({ month: point.month, year: point.year })),
    })
    ttmLabels.push("TTM 12 mois préc.")
    ttmGaps.push(true)
  }

  const tables: PilotageMarginIndicatorTable[] = []

  const current = buildCombinedTableFromSpecs(
    "Performance actuelle",
    currentSpecs,
    currentLabels,
    currentGaps,
    points,
    tableMeta,
    buildDetailRows(variableAccounts, currentSpecs),
    buildDetailRows(fixedAccounts, currentSpecs),
  )
  if (current) tables.push(current)

  const ytd = buildCombinedTableFromSpecs(
    "Performance de l'exercice (YTD)",
    ytdSpecs,
    ytdLabels,
    ytdGaps,
    points,
    tableMeta,
    buildDetailRows(variableAccounts, ytdSpecs),
    buildDetailRows(fixedAccounts, ytdSpecs),
  )
  if (ytd) tables.push(ytd)

  const ttm = buildCombinedTableFromSpecs(
    "Tendance des 12 derniers mois",
    ttmSpecs,
    ttmLabels,
    ttmGaps,
    points,
    tableMeta,
    buildDetailRows(variableAccounts, ttmSpecs),
    buildDetailRows(fixedAccounts, ttmSpecs),
  )
  if (ttm) tables.push(ttm)

  return tables
}

export function pilotageExpenseIndicatorTableKey(
  heading: string,
  subsection: string | undefined,
): string {
  return `${heading}::${subsection ?? ""}`
}

export function buildPilotageBridgeIndicatorTables(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  refMonth: number
  refYear: number
  fiscalYearEnd: string
  standardLinkCodes?: StandardLinkCode[]
  tableHeading: string
  tableSectionId: string
}): Map<string, PilotageMarginIndicatorTable> {
  const tables = new Map<string, PilotageMarginIndicatorTable>()
  const points = extractMonthlyExpenseBridgeSeries({
    mappings: params.mappings,
    seriesRows: params.seriesRows,
    periods: params.periods,
    refMonth: params.refMonth,
    refYear: params.refYear,
    standardLinkCodes: params.standardLinkCodes,
    monthCount: 36,
  })
  if (!points.length) return tables

  const mappingsByAccount = new Map(params.mappings.map((mapping) => [mapping.account_number, mapping]))
  const codeByCode = buildStandardLinkCodeLookup(params.standardLinkCodes)
  const variableAccounts = collectAllVariableCostAccountNumbers(params.mappings)
  const fixedAccounts = collectAllFixedCostAccountNumbers(params.mappings)
  const tableMeta = {
    sourceId: params.tableSectionId,
    sourceLabel: params.tableHeading,
  }

  const sectionTables = buildCombinedSectionTables(
    variableAccounts,
    fixedAccounts,
    points,
    params.fiscalYearEnd,
    mappingsByAccount,
    params.seriesRows,
    params.periods,
    codeByCode,
    tableMeta,
  )
  for (const table of sectionTables) {
    tables.set(pilotageExpenseIndicatorTableKey(params.tableHeading, table.subsection), table)
  }

  return tables
}

export function buildPilotageExpenseIndicatorTables(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  refMonth: number
  refYear: number
  fiscalYearEnd: string
  standardLinkCodes?: StandardLinkCode[]
}): Map<string, PilotageMarginIndicatorTable> {
  return buildPilotageBridgeIndicatorTables({
    ...params,
    tableHeading: PILOTAGE_MARGIN_AND_BAIIA_HEADING,
    tableSectionId: PILOTAGE_MARGIN_AND_BAIIA_SECTION_ID,
  })
}
