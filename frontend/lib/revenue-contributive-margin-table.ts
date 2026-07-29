import type { RevenueSeriesNarrativeSlice } from "@/lib/income-performance-narrative"
import { computeCagr } from "@/lib/income-performance-narrative"

const DATA_EPSILON = 1e-6

export type RevenueContributiveMarginRow = {
  id: string
  label: string
  revenue: number
  variableCost: number | null
  contributiveMargin: number | null
  marginPct: number | null
  revenueSharePct: number
  contributiveSharePct: number | null
  revenueCagrPct: number | null
  profitable: boolean
  mappingConfigured: boolean
}

function slugifyId(label: string, index: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return base || `source-${index}`
}

function revenueCagrPct(slice: RevenueSeriesNarrativeSlice): number | null {
  const present = slice.points.filter((p) => Math.abs(p.revenue) > DATA_EPSILON)
  if (present.length < 2) return null
  const latest = present[0]!.revenue
  const oldest = present[present.length - 1]!.revenue
  return computeCagr(latest, oldest, present.length - 1)
}

export function buildRevenueContributiveMarginRows(
  series: RevenueSeriesNarrativeSlice[],
): RevenueContributiveMarginRow[] {
  if (!series.length) return []

  const totalRevenue = series.reduce((sum, s) => sum + (s.points[0]?.revenue ?? 0), 0)
  const rawRows = series.map((slice, index) => {
    const revenue = slice.points[0]?.revenue ?? 0
    const variableCost =
      slice.points[0]?.variableCost !== undefined ? slice.points[0]!.variableCost! : null
    const contributiveMargin =
      variableCost !== null ? revenue - variableCost : null
    const marginPct =
      contributiveMargin !== null && Math.abs(revenue) > DATA_EPSILON
        ? (contributiveMargin / revenue) * 100
        : null

    return {
      id: slugifyId(slice.heading, index),
      label: slice.heading,
      revenue,
      variableCost,
      contributiveMargin,
      marginPct,
      revenueSharePct:
        Math.abs(totalRevenue) > DATA_EPSILON ? (revenue / totalRevenue) * 100 : 0,
      contributiveSharePct: null as number | null,
      revenueCagrPct: revenueCagrPct(slice),
      profitable: (contributiveMargin ?? 0) > DATA_EPSILON,
      mappingConfigured: slice.variableCostMapped === true,
    }
  })

  const totalContributive = rawRows.reduce((sum, r) => sum + (r.contributiveMargin ?? 0), 0)
  return rawRows
    .map((row) => ({
      ...row,
      contributiveSharePct:
        row.contributiveMargin !== null && Math.abs(totalContributive) > DATA_EPSILON
          ? (row.contributiveMargin / totalContributive) * 100
          : null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
}

export type RevenueContributiveMarginTotals = {
  revenue: number
  variableCost: number | null
  contributiveMargin: number | null
  marginPct: number | null
}

export function buildRevenueContributiveMarginTotals(
  rows: RevenueContributiveMarginRow[],
): RevenueContributiveMarginTotals {
  const revenue = rows.reduce((sum, r) => sum + r.revenue, 0)
  const allCostsKnown = rows.every((r) => r.variableCost !== null)
  const variableCost = allCostsKnown
    ? rows.reduce((sum, r) => sum + (r.variableCost ?? 0), 0)
    : null
  const contributiveMargin =
    variableCost !== null ? revenue - variableCost : null
  const marginPct =
    contributiveMargin !== null && Math.abs(revenue) > DATA_EPSILON
      ? (contributiveMargin / revenue) * 100
      : null
  return { revenue, variableCost, contributiveMargin, marginPct }
}
