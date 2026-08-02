import type { RevenueSeriesNarrativeSlice } from "@/lib/income-performance-narrative"
import { slugifyRevenueSourceId } from "@/lib/revenue-contributive-margin-table"

const DATA_EPSILON = 1e-6
const MONTHLY_EVOLUTION_COUNT = 12

export const CONTRIBUTIVE_MARGIN_AMOUNT_EPSILON = DATA_EPSILON

export function contributiveMarginRowHasVisibleAmounts(
  values: (number | null)[],
  windowSize?: number,
): boolean {
  const slice = windowSize != null ? values.slice(0, windowSize) : values
  return slice.some((value) => value !== null && Math.abs(value) > DATA_EPSILON)
}

export function filterZeroContributiveMarginDetailRows(
  rows: ContributiveMarginEvolutionDetailRow[],
  windowSize?: number,
): ContributiveMarginEvolutionDetailRow[] {
  return rows
    .map((row) => {
      const detailRows = filterZeroContributiveMarginDetailRows(row.detailRows ?? [], windowSize)
      if (!contributiveMarginRowHasVisibleAmounts(row.values, windowSize) && !detailRows.length) {
        return null
      }
      return {
        ...row,
        detailRows: detailRows.length ? detailRows : undefined,
      }
    })
    .filter((row): row is ContributiveMarginEvolutionDetailRow => row !== null)
}

export type ContributiveMarginEvolutionDetailRow = {
  id: string
  label: string
  values: (number | null)[]
  displayKind?: "link-code" | "gl-account"
  /** Sous-lignes (ex. comptes GL sous un code parent). */
  detailRows?: ContributiveMarginEvolutionDetailRow[]
}

export type ContributiveMarginEvolutionMetric = {
  id: string
  label: string
  format: "currency" | "percent" | "days"
  values: (number | null)[]
  detailRows?: ContributiveMarginEvolutionDetailRow[]
}

export type ContributiveMarginEvolutionTable = {
  sourceId: string
  sourceLabel: string
  periods: string[]
  metrics: ContributiveMarginEvolutionMetric[]
}

function totalRevenueAtPoint(series: RevenueSeriesNarrativeSlice[], pointIndex: number): number {
  return series.reduce((sum, s) => sum + (s.points[pointIndex]?.revenue ?? 0), 0)
}

function totalContributiveAtPoint(series: RevenueSeriesNarrativeSlice[], pointIndex: number): number {
  return series.reduce((sum, s) => {
    const point = s.points[pointIndex]
    if (!point || point.variableCost === undefined) return sum
    return sum + (point.revenue - point.variableCost)
  }, 0)
}

function evolutionPointIndices(pointCount: number, view: string): number[] {
  const windowSize = view === "years" ? pointCount : Math.min(MONTHLY_EVOLUTION_COUNT, pointCount)
  if (windowSize <= 0) return []
  // Index 0 = période la plus récente ; colonnes de la plus récente à la plus ancienne.
  return Array.from({ length: windowSize }, (_, i) => i)
}

export function buildRevenueContributiveMarginEvolutionTable(
  slice: RevenueSeriesNarrativeSlice,
  allSeries: RevenueSeriesNarrativeSlice[],
  sliceIndex: number,
  view: string,
): ContributiveMarginEvolutionTable | null {
  if (!slice.points.length) return null

  const orderedIndices = evolutionPointIndices(slice.points.length, view)
  if (!orderedIndices.length) return null

  const periods = orderedIndices.map((i) => slice.points[i]!.period)
  const revenues = orderedIndices.map((i) => slice.points[i]!.revenue)
  const variableCosts = orderedIndices.map((i) => {
    const cost = slice.points[i]?.variableCost
    return cost !== undefined ? cost : null
  })
  const contributiveMargins = orderedIndices.map((i, col) => {
    const cost = variableCosts[col]
    if (cost === null) return null
    return slice.points[i]!.revenue - cost
  })
  const marginPcts = orderedIndices.map((_, col) => {
    const margin = contributiveMargins[col]
    const revenue = revenues[col]!
    if (margin === null || Math.abs(revenue) <= DATA_EPSILON) return null
    return (margin / revenue) * 100
  })
  const revenueShares = orderedIndices.map((i) => {
    const revenue = slice.points[i]!.revenue
    const total = totalRevenueAtPoint(allSeries, i)
    if (Math.abs(total) <= DATA_EPSILON) return null
    return (revenue / total) * 100
  })
  const contributiveShares = orderedIndices.map((i, col) => {
    const margin = contributiveMargins[col]
    if (margin === null) return null
    const total = totalContributiveAtPoint(allSeries, i)
    if (Math.abs(total) <= DATA_EPSILON) return null
    return (margin / total) * 100
  })

  const revenueDetailRows =
    slice.revenueComponents?.map((component) => ({
      id: component.id,
      label: component.label,
      displayKind: component.kind,
      values: orderedIndices.map((pointIndex) => component.amounts[pointIndex] ?? null),
    })) ?? undefined

  const variableCostDetailRows =
    slice.variableCostAccounts?.map((account) => ({
      id: account.accountNumber,
      label: account.label,
      displayKind: "gl-account" as const,
      values: orderedIndices.map((pointIndex) => account.amounts[pointIndex] ?? null),
    })) ?? undefined

  return {
    sourceId: slugifyRevenueSourceId(slice.heading, sliceIndex),
    sourceLabel: slice.heading,
    periods,
    metrics: [
      {
        id: "revenue",
        label: "Revenus",
        format: "currency",
        values: revenues,
        detailRows: revenueDetailRows?.length ? revenueDetailRows : undefined,
      },
      {
        id: "variable-cost",
        label: "Coûts var.",
        format: "currency",
        values: variableCosts,
        detailRows: variableCostDetailRows?.length ? variableCostDetailRows : undefined,
      },
      {
        id: "contributive-margin",
        label: "Contr. marginale",
        format: "currency",
        values: contributiveMargins,
      },
      { id: "margin-pct", label: "Marge", format: "percent", values: marginPcts },
      { id: "revenue-share", label: "Part CA", format: "percent", values: revenueShares },
      {
        id: "contributive-share",
        label: "Part contr.",
        format: "percent",
        values: contributiveShares,
      },
    ],
  }
}

export function buildRevenueContributiveMarginEvolutionTables(
  series: RevenueSeriesNarrativeSlice[],
  view: string,
): Map<string, ContributiveMarginEvolutionTable> {
  const tables = new Map<string, ContributiveMarginEvolutionTable>()
  series.forEach((slice, index) => {
    const table = buildRevenueContributiveMarginEvolutionTable(slice, series, index, view)
    if (!table) return
    tables.set(`Marge contributive — ${slice.heading}`, table)
  })
  return tables
}
