import type { RevenueSeriesNarrativeSlice } from "@/lib/income-performance-narrative"
import {
  enumerateMonthsForward,
  fiscalYearLabelForReference,
  fiscalYearStartForReference,
  monthlyMarginPointsFromRevenueSlice,
  type MonthlyMarginPoint,
} from "@/lib/pilotage-revenue-metrics"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import type { ContributiveMarginEvolutionDetailRow } from "@/lib/revenue-contributive-margin-evolution"
import { slugifyRevenueSourceId } from "@/lib/revenue-contributive-margin-table"

const DATA_EPSILON = 1e-6

export type PilotageMarginIndicatorColumnGroup = {
  label: string
  includeShare: boolean
  includeGap: boolean
}

export type PilotageMarginIndicatorMetric = {
  id: string
  label: string
  format: "currency" | "percent"
  values: (number | null)[]
  shares: (number | null)[]
  gaps: (number | null)[]
  detailRows?: ContributiveMarginEvolutionDetailRow[]
}

export type PilotageMarginIndicatorTable = {
  sourceId: string
  sourceLabel: string
  subsection: string
  columnGroups: PilotageMarginIndicatorColumnGroup[]
  metrics: PilotageMarginIndicatorMetric[]
  sourceRevenuesByColumn: (number | null)[]
}

export type PilotageMarginSnapshot = {
  revenue: number
  variableCost: number | null
  contributiveMargin: number | null
  marginPct: number | null
}

type SnapshotSpec =
  | { kind: "point"; index: number }
  | { kind: "months"; months: Array<{ month: number; year: number }> }

function pointIndexForMonth(
  points: MonthlyMarginPoint[],
  month: number,
  year: number,
): number {
  return points.findIndex((p) => p.month === month && p.year === year)
}

function snapshotFromPoint(point: MonthlyMarginPoint | undefined): PilotageMarginSnapshot | null {
  if (!point) return null
  const variableCost = point.variableCost !== undefined ? point.variableCost : null
  const contributiveMargin = variableCost !== null ? point.revenue - variableCost : null
  const marginPct =
    contributiveMargin !== null && Math.abs(point.revenue) > DATA_EPSILON
      ? (contributiveMargin / point.revenue) * 100
      : null
  return {
    revenue: point.revenue,
    variableCost,
    contributiveMargin,
    marginPct,
  }
}

function aggregateSnapshot(
  points: MonthlyMarginPoint[],
  months: Array<{ month: number; year: number }>,
): PilotageMarginSnapshot | null {
  let revenue = 0
  let variableCost = 0
  let hasCost = false
  for (const m of months) {
    const point = points.find((p) => p.month === m.month && p.year === m.year)
    if (!point) continue
    revenue += point.revenue
    if (point.variableCost !== undefined) {
      variableCost += point.variableCost
      hasCost = true
    }
  }
  if (!hasCost || Math.abs(revenue) < DATA_EPSILON) return null
  const contributiveMargin = revenue - variableCost
  return {
    revenue,
    variableCost,
    contributiveMargin,
    marginPct: (contributiveMargin / revenue) * 100,
  }
}

function resolveSnapshot(
  spec: SnapshotSpec,
  points: MonthlyMarginPoint[],
): PilotageMarginSnapshot | null {
  if (spec.kind === "point") {
    return snapshotFromPoint(points[spec.index])
  }
  return aggregateSnapshot(points, spec.months)
}

function shareOfRevenue(value: number | null, revenue: number | null): number | null {
  if (value === null || revenue === null || Math.abs(revenue) < DATA_EPSILON) return null
  return (value / revenue) * 100
}

function resolveAmountAtSpec(
  amounts: number[],
  spec: SnapshotSpec,
  points: MonthlyMarginPoint[],
): number | null {
  if (spec.kind === "point") {
    return amounts[spec.index] ?? null
  }
  let sum = 0
  let found = false
  for (const m of spec.months) {
    const index = pointIndexForMonth(points, m.month, m.year)
    if (index < 0) continue
    sum += amounts[index] ?? 0
    found = true
  }
  return found ? sum : null
}

function buildRevenueDetailRows(
  slice: RevenueSeriesNarrativeSlice,
  specs: SnapshotSpec[],
  points: MonthlyMarginPoint[],
): ContributiveMarginEvolutionDetailRow[] | undefined {
  const rows =
    slice.revenueComponents?.map((component) => ({
      id: component.id,
      label: component.label,
      displayKind: component.kind,
      values: specs.map((spec) => resolveAmountAtSpec(component.amounts, spec, points)),
    })) ?? []
  return rows.length ? rows : undefined
}

function buildVariableCostDetailRows(
  slice: RevenueSeriesNarrativeSlice,
  specs: SnapshotSpec[],
  points: MonthlyMarginPoint[],
): ContributiveMarginEvolutionDetailRow[] | undefined {
  const fromGroups =
    slice.variableCostGroups?.map((group) => ({
      id: group.id,
      label: group.label,
      displayKind: "link-code" as const,
      values: specs.map((spec) => resolveAmountAtSpec(group.amounts, spec, points)),
    })) ?? []
  if (fromGroups.length) return fromGroups

  const fromAccounts =
    slice.variableCostAccounts?.map((account) => ({
      id: account.accountNumber,
      label: account.label,
      displayKind: "gl-account" as const,
      values: specs.map((spec) => resolveAmountAtSpec(account.amounts, spec, points)),
    })) ?? []
  return fromAccounts.length ? fromAccounts : undefined
}

function buildIndicatorMetrics(
  slice: RevenueSeriesNarrativeSlice,
  snapshots: PilotageMarginSnapshot[],
  specs: SnapshotSpec[],
  points: MonthlyMarginPoint[],
): PilotageMarginIndicatorMetric[] {
  const ref = snapshots[0]
  if (!ref) return []

  const buildMetric = (
    id: string,
    label: string,
    format: "currency" | "percent",
    pickValue: (s: PilotageMarginSnapshot) => number | null,
    pickShare: (s: PilotageMarginSnapshot) => number | null,
    detailRows?: ContributiveMarginEvolutionDetailRow[],
  ): PilotageMarginIndicatorMetric => {
    const values = snapshots.map(pickValue)
    const shares = snapshots.map(pickShare)
    const refValue = pickValue(ref)
    const gaps = snapshots.map((snapshot, index) => {
      if (index === 0 || refValue === null) return null
      const value = pickValue(snapshot)
      if (value === null) return null
      return refValue - value
    })
    return { id, label, format, values, shares, gaps, detailRows }
  }

  return [
    buildMetric(
      "revenue",
      "Revenus",
      "currency",
      (s) => s.revenue,
      () => 100,
      buildRevenueDetailRows(slice, specs, points),
    ),
    buildMetric(
      "variable-cost",
      "Coûts var.",
      "currency",
      (s) => s.variableCost,
      (s) => shareOfRevenue(s.variableCost, s.revenue),
      buildVariableCostDetailRows(slice, specs, points),
    ),
    buildMetric(
      "contributive-margin",
      "Contr. marginale",
      "currency",
      (s) => s.contributiveMargin,
      (s) => s.marginPct,
    ),
  ]
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

function buildTableFromSpecs(
  slice: RevenueSeriesNarrativeSlice,
  sliceIndex: number,
  subsection: string,
  specs: SnapshotSpec[],
  columnLabels: string[],
  withGaps: boolean[],
  points: MonthlyMarginPoint[],
): PilotageMarginIndicatorTable | null {
  const snapshots = specs
    .map((spec) => resolveSnapshot(spec, points))
    .filter((snapshot): snapshot is PilotageMarginSnapshot => snapshot !== null)
  if (!snapshots.length) return null

  return {
    sourceId: slugifyRevenueSourceId(slice.heading, sliceIndex),
    sourceLabel: slice.heading,
    subsection,
    columnGroups: buildColumnGroups(columnLabels, withGaps),
    sourceRevenuesByColumn: snapshots.map((s) =>
      Math.abs(s.revenue) > DATA_EPSILON ? s.revenue : null,
    ),
    metrics: buildIndicatorMetrics(slice, snapshots, specs, points),
  }
}

function buildCurrentPerformanceTable(
  slice: RevenueSeriesNarrativeSlice,
  sliceIndex: number,
  points: MonthlyMarginPoint[],
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
    slice,
    sliceIndex,
    "Performance actuelle",
    specs,
    labels,
    withGaps,
    points,
  )
}

function buildYtdPerformanceTable(
  slice: RevenueSeriesNarrativeSlice,
  sliceIndex: number,
  points: MonthlyMarginPoint[],
  fiscalYearEnd: string,
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

  const priorMonths = ytdMonths.map((m) => ({ month: m.month, year: m.year - 1 }))
  if (aggregateSnapshot(points, priorMonths)) {
    specs.push({ kind: "months", months: priorMonths })
    labels.push(`YTD ${fiscalYearLabel - 1}`)
    withGaps.push(true)
  }

  return buildTableFromSpecs(
    slice,
    sliceIndex,
    "Performance de l'exercice (YTD)",
    specs,
    labels,
    withGaps,
    points,
  )
}

function buildTtmPerformanceTable(
  slice: RevenueSeriesNarrativeSlice,
  sliceIndex: number,
  points: MonthlyMarginPoint[],
): PilotageMarginIndicatorTable | null {
  const currentMonths = points.slice(0, 12)
  const priorMonths = points.slice(12, 24)
  if (currentMonths.length < 12) return null

  const specs: SnapshotSpec[] = [
    {
      kind: "months",
      months: currentMonths.map((p) => ({ month: p.month, year: p.year })),
    },
  ]
  const labels = ["TTM 12 mois"]
  const withGaps = [false]

  if (priorMonths.length >= 12) {
    specs.push({
      kind: "months",
      months: priorMonths.map((p) => ({ month: p.month, year: p.year })),
    })
    labels.push("TTM 12 mois préc.")
    withGaps.push(true)
  }

  return buildTableFromSpecs(
    slice,
    sliceIndex,
    "Tendance des 12 derniers mois",
    specs,
    labels,
    withGaps,
    points,
  )
}

export function pilotageMarginIndicatorTableKey(heading: string, subsection: string | undefined): string {
  return `${heading}::${subsection ?? ""}`
}

export function buildPilotageMarginByRevenueIndicatorTables(
  series: RevenueSeriesNarrativeSlice[],
  fiscalYearEnd: string,
): Map<string, PilotageMarginIndicatorTable> {
  const tables = new Map<string, PilotageMarginIndicatorTable>()
  const headingFor = (slice: RevenueSeriesNarrativeSlice) => `Marge contributive — ${slice.heading}`

  series.forEach((slice, sliceIndex) => {
    if (!slice.variableCostMapped) return
    const points = monthlyMarginPointsFromRevenueSlice(slice)
    if (!points.length) return

    const heading = headingFor(slice)
    const current = buildCurrentPerformanceTable(slice, sliceIndex, points)
    if (current) {
      tables.set(pilotageMarginIndicatorTableKey(heading, current.subsection), current)
    }

    const ytd = buildYtdPerformanceTable(slice, sliceIndex, points, fiscalYearEnd)
    if (ytd) {
      tables.set(pilotageMarginIndicatorTableKey(heading, ytd.subsection), ytd)
    }

    const ttm = buildTtmPerformanceTable(slice, sliceIndex, points)
    if (ttm) {
      tables.set(pilotageMarginIndicatorTableKey(heading, ttm.subsection), ttm)
    }
  })

  return tables
}
