import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import { findSeriesRowByCode } from "@/lib/performance-chart-series"
import {
  collectAllFixedCostAccountNumbers,
  collectAllVariableCostAccountNumbers,
} from "@/lib/expense-contribution-bridge"
import {
  EXPENSE_FIXED_COSTS_HEADING,
  EXPENSE_VARIABLE_COSTS_HEADING,
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

function buildIndicatorMetrics(
  snapshots: ExpenseCostSnapshot[],
  costLabel: string,
  detailRows?: ContributiveMarginEvolutionDetailRow[],
): PilotageMarginIndicatorMetric[] {
  const ref = snapshots[0]
  if (!ref) return []

  const values = snapshots.map((snapshot) => snapshot.cost)
  const shares = snapshots.map((snapshot) => snapshot.costShare)
  const refValue = ref.cost
  const gaps = snapshots.map((snapshot, index) => {
    if (index === 0) return null
    return refValue - snapshot.cost
  })

  return [
    {
      id: "total",
      label: costLabel,
      format: "currency",
      values,
      shares,
      gaps,
      detailRows,
    },
  ]
}

function buildTableFromSpecs(
  heading: string,
  sectionId: string,
  costLabel: string,
  subsection: string,
  specs: SnapshotSpec[],
  columnLabels: string[],
  withGaps: boolean[],
  points: MonthlyExpenseBridgePoint[],
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
  detailRows?: ContributiveMarginEvolutionDetailRow[],
): PilotageMarginIndicatorTable | null {
  const snapshots = specs
    .map((spec) => resolveSnapshot(spec, points, pickCost))
    .filter((snapshot): snapshot is ExpenseCostSnapshot => snapshot !== null)
  if (!snapshots.length) return null

  return {
    sourceId: sectionId,
    sourceLabel: heading,
    subsection,
    columnGroups: buildColumnGroups(columnLabels, withGaps),
    sourceRevenuesByColumn: snapshots.map((snapshot) =>
      Math.abs(snapshot.revenue) > DATA_EPSILON ? snapshot.revenue : null,
    ),
    metrics: buildIndicatorMetrics(snapshots, costLabel, detailRows),
  }
}

function buildCurrentPerformanceTable(
  heading: string,
  sectionId: string,
  costLabel: string,
  points: MonthlyExpenseBridgePoint[],
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
  detailRows?: ContributiveMarginEvolutionDetailRow[],
): PilotageMarginIndicatorTable | null {
  const refPoint = points[0]
  if (!refPoint) return null

  const specs: SnapshotSpec[] = [{ kind: "point", index: 0 }]
  const labels = [refPoint.period]
  const withGaps = [false]

  const yoyPoint = points[12]
  if (yoyPoint) {
    specs.push({ kind: "point", index: 12 })
    labels.push(yoyPoint.period)
    withGaps.push(true)
  }

  const priorPoint = points[1]
  if (priorPoint) {
    specs.push({ kind: "point", index: 1 })
    labels.push(priorPoint.period)
    withGaps.push(true)
  }

  return buildTableFromSpecs(
    heading,
    sectionId,
    costLabel,
    "Performance actuelle",
    specs,
    labels,
    withGaps,
    points,
    pickCost,
    detailRows,
  )
}

function buildYtdPerformanceTable(
  heading: string,
  sectionId: string,
  costLabel: string,
  points: MonthlyExpenseBridgePoint[],
  fiscalYearEnd: string,
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
  detailRows?: ContributiveMarginEvolutionDetailRow[],
): PilotageMarginIndicatorTable | null {
  const refPoint = points[0]
  if (!refPoint) return null

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

  const specs: SnapshotSpec[] = [{ kind: "months", months: ytdMonths }]
  const labels = [`YTD ${fiscalYearLabel}`]
  const withGaps = [false]

  if (ytdMonths.length) {
    specs.push({
      kind: "months",
      months: ytdMonths.map((m) => ({ month: m.month, year: m.year - 1 })),
    })
    labels.push(`YTD ${fiscalYearLabel - 1}`)
    withGaps.push(true)
  }

  return buildTableFromSpecs(
    heading,
    sectionId,
    costLabel,
    "Performance de l'exercice (YTD)",
    specs,
    labels,
    withGaps,
    points,
    pickCost,
    detailRows,
  )
}

function buildTtmPerformanceTable(
  heading: string,
  sectionId: string,
  costLabel: string,
  points: MonthlyExpenseBridgePoint[],
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
  detailRows?: ContributiveMarginEvolutionDetailRow[],
): PilotageMarginIndicatorTable | null {
  const currentMonths = points.slice(0, 12)
  const priorMonths = points.slice(12, 24)
  if (currentMonths.length < 12) return null

  const specs: SnapshotSpec[] = [
    {
      kind: "months",
      months: currentMonths.map((point) => ({ month: point.month, year: point.year })),
    },
  ]
  const labels = ["TTM 12 mois"]
  const withGaps = [false]

  if (priorMonths.length >= 12) {
    specs.push({
      kind: "months",
      months: priorMonths.map((point) => ({ month: point.month, year: point.year })),
    })
    labels.push("TTM 12 mois préc.")
    withGaps.push(true)
  }

  return buildTableFromSpecs(
    heading,
    sectionId,
    costLabel,
    "Tendance des 12 derniers mois",
    specs,
    labels,
    withGaps,
    points,
    pickCost,
    detailRows,
  )
}

function buildSectionTables(
  heading: string,
  sectionId: string,
  costLabel: string,
  accountNumbers: string[],
  points: MonthlyExpenseBridgePoint[],
  fiscalYearEnd: string,
  pickCost: (point: MonthlyExpenseBridgePoint) => number,
  mappingsByAccount: Map<string, AccountMappingData>,
  rows: SeriesRow[],
  periodsRaw: SeriesPeriod[],
  codeByCode: StandardLinkCodeLookup,
): PilotageMarginIndicatorTable[] {
  if (!accountNumbers.length || !points.length) return []

  const buildDetailRows = (specs: SnapshotSpec[]) =>
    buildCostDetailRowsForSpecs(
      accountNumbers,
      specs,
      points,
      mappingsByAccount,
      rows,
      periodsRaw,
      codeByCode,
    )

  const refPoint = points[0]!
  const currentSpecs: SnapshotSpec[] = [{ kind: "point", index: 0 }]
  if (points[12]) currentSpecs.push({ kind: "point", index: 12 })
  if (points[1]) currentSpecs.push({ kind: "point", index: 1 })

  const fiscalYearEndMonth = parseFiscalYearEndMonth(fiscalYearEnd)
  const fyStart = fiscalYearStartForReference(refPoint.month, refPoint.year, fiscalYearEndMonth)
  const ytdMonths = enumerateMonthsForward(fyStart, {
    month: refPoint.month,
    year: refPoint.year,
  })
  const ytdSpecs: SnapshotSpec[] = [{ kind: "months", months: ytdMonths }]
  if (ytdMonths.length) {
    ytdSpecs.push({
      kind: "months",
      months: ytdMonths.map((m) => ({ month: m.month, year: m.year - 1 })),
    })
  }

  const ttmSpecs: SnapshotSpec[] = [
    {
      kind: "months",
      months: points.slice(0, 12).map((point) => ({ month: point.month, year: point.year })),
    },
  ]
  if (points.length >= 24) {
    ttmSpecs.push({
      kind: "months",
      months: points.slice(12, 24).map((point) => ({ month: point.month, year: point.year })),
    })
  }

  const tables: PilotageMarginIndicatorTable[] = []
  const current = buildCurrentPerformanceTable(
    heading,
    sectionId,
    costLabel,
    points,
    pickCost,
    buildDetailRows(currentSpecs),
  )
  if (current) tables.push(current)

  const ytd = buildYtdPerformanceTable(
    heading,
    sectionId,
    costLabel,
    points,
    fiscalYearEnd,
    pickCost,
    buildDetailRows(ytdSpecs),
  )
  if (ytd) tables.push(ytd)

  const ttm = buildTtmPerformanceTable(
    heading,
    sectionId,
    costLabel,
    points,
    pickCost,
    buildDetailRows(ttmSpecs),
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

export function buildPilotageExpenseIndicatorTables(params: {
  mappings: AccountMappingData[]
  seriesRows: SeriesRow[]
  periods: SeriesPeriod[]
  refMonth: number
  refYear: number
  fiscalYearEnd: string
  standardLinkCodes?: StandardLinkCode[]
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

  const sections = [
    {
      heading: EXPENSE_VARIABLE_COSTS_HEADING,
      sectionId: "expense-variable-costs",
      costLabel: "Coûts variables",
      accountNumbers: variableAccounts,
      pickCost: (point: MonthlyExpenseBridgePoint) => point.variableCosts,
    },
    {
      heading: EXPENSE_FIXED_COSTS_HEADING,
      sectionId: "expense-fixed-costs",
      costLabel: "Coûts fixes",
      accountNumbers: fixedAccounts,
      pickCost: (point: MonthlyExpenseBridgePoint) => point.fixedCosts,
    },
  ] as const

  for (const section of sections) {
    const sectionTables = buildSectionTables(
      section.heading,
      section.sectionId,
      section.costLabel,
      section.accountNumbers,
      points,
      params.fiscalYearEnd,
      section.pickCost,
      mappingsByAccount,
      params.seriesRows,
      params.periods,
      codeByCode,
    )
    for (const table of sectionTables) {
      tables.set(pilotageExpenseIndicatorTableKey(section.heading, table.subsection), table)
    }
  }

  return tables
}
