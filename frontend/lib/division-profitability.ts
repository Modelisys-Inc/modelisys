import type { Division } from "@/components/entity-selector"
import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  buildExpenseContributionBridge,
  type ExpenseContributionBridgeResult,
} from "@/lib/expense-contribution-bridge"
import { computeCagr } from "@/lib/income-performance-narrative"
import { filterMappingsForDivision } from "@/lib/mapping-division-utils"

const DATA_EPSILON = 1e-6

export type DivisionSeriesBundle = {
  divisionId: string
  rows: SeriesRow[]
  periods: SeriesPeriod[]
}

export type DivisionProfitabilityPoint = {
  period: string
  revenue: number
  variableCosts: number
  contributiveMargin: number
  fixedCosts: number
  operatingProfit: number
}

export type DivisionProfitabilitySlice = {
  divisionId: string
  heading: string
  metricLabel: string
  points: DivisionProfitabilityPoint[]
  mappingStatus: {
    variableCostAccountCount: number
    fixedCostAccountCount: number
    revenueConfigured: boolean
  }
}

export type DivisionProfitabilityRow = {
  id: string
  label: string
  revenue: number
  variableCost: number | null
  contributiveMargin: number | null
  contributiveMarginPct: number | null
  fixedCost: number | null
  operatingProfit: number | null
  operatingMarginPct: number | null
  revenueSharePct: number
  profitable: boolean
  variableCostMapped: boolean
  fixedCostMapped: boolean
  revenueCagrPct: number | null
}

export type DivisionProfitabilityTotals = {
  revenue: number
  variableCost: number | null
  contributiveMargin: number | null
  contributiveMarginPct: number | null
  fixedCost: number | null
  operatingProfit: number | null
  operatingMarginPct: number | null
}

function ratioPct(numerator: number, denominator: number): number | null {
  if (Math.abs(denominator) < DATA_EPSILON) return null
  return (numerator / denominator) * 100
}

function slugifyDivisionLabel(label: string, index: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return base || `division-${index}`
}

function bridgeToSlice(division: Division, bridge: ExpenseContributionBridgeResult): DivisionProfitabilitySlice {
  return {
    divisionId: division.id,
    heading: division.name,
    metricLabel: `la division ${division.name}`,
    points: bridge.points.map((point) => ({
      period: point.period,
      revenue: point.revenue,
      variableCosts: point.variableCosts,
      contributiveMargin: point.contributiveMargin,
      fixedCosts: point.fixedCosts,
      operatingProfit: point.operatingProfit,
    })),
    mappingStatus: bridge.mappingStatus,
  }
}

function emptySlice(division: Division): DivisionProfitabilitySlice {
  return {
    divisionId: division.id,
    heading: division.name,
    metricLabel: `la division ${division.name}`,
    points: [],
    mappingStatus: {
      variableCostAccountCount: 0,
      fixedCostAccountCount: 0,
      revenueConfigured: false,
    },
  }
}

export function buildDivisionProfitabilitySlices(params: {
  divisions: Division[]
  divisionSeries: DivisionSeriesBundle[]
  mappings: AccountMappingData[]
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): DivisionProfitabilitySlice[] {
  const { divisions, divisionSeries, mappings, view, refMonth, refYear, standardLinkCodes } = params
  if (!divisions.length) return []

  const seriesByDivision = new Map(divisionSeries.map((entry) => [entry.divisionId, entry]))

  const slices = divisions.map((division) => {
    const bundle = seriesByDivision.get(division.id)
    const divisionMappings = filterMappingsForDivision(mappings, division.id, division.name)

    if (!bundle?.rows.length || !bundle.periods.length) {
      return emptySlice(division)
    }

    const bridge = buildExpenseContributionBridge({
      mappings: divisionMappings,
      seriesRows: bundle.rows,
      periods: bundle.periods,
      view,
      refMonth,
      refYear,
      standardLinkCodes,
    })

    if (!bridge?.points.length) {
      return emptySlice(division)
    }

    return bridgeToSlice(division, bridge)
  })

  return slices.sort((a, b) => (b.points[0]?.revenue ?? 0) - (a.points[0]?.revenue ?? 0))
}

function revenueCagrPct(slice: DivisionProfitabilitySlice): number | null {
  const present = slice.points.filter((p) => Math.abs(p.revenue) > DATA_EPSILON)
  if (present.length < 2) return null
  return computeCagr(present[0]!.revenue, present[present.length - 1]!.revenue, present.length - 1)
}

export function buildDivisionProfitabilityRows(slices: DivisionProfitabilitySlice[]): DivisionProfitabilityRow[] {
  if (!slices.length) return []

  const totalRevenue = slices.reduce((sum, slice) => sum + (slice.points[0]?.revenue ?? 0), 0)

  return slices.map((slice, index) => {
    const latest = slice.points[0]
    const revenue = latest?.revenue ?? 0
    const variableCostMapped = slice.mappingStatus.variableCostAccountCount > 0
    const fixedCostMapped = slice.mappingStatus.fixedCostAccountCount > 0

    const variableCost = variableCostMapped && latest ? latest.variableCosts : null
    const contributiveMargin =
      variableCost !== null && latest ? latest.contributiveMargin : null
    const contributiveMarginPct =
      contributiveMargin !== null ? ratioPct(contributiveMargin, revenue) : null

    const fixedCost = fixedCostMapped && latest ? latest.fixedCosts : null
    const operatingProfit =
      contributiveMargin !== null && fixedCost !== null && latest
        ? latest.operatingProfit
        : null
    const operatingMarginPct =
      operatingProfit !== null ? ratioPct(operatingProfit, revenue) : null

    const profitable =
      operatingProfit !== null
        ? operatingProfit > DATA_EPSILON
        : contributiveMargin !== null
          ? contributiveMargin > DATA_EPSILON
          : false

    return {
      id: slugifyDivisionLabel(slice.heading, index),
      label: slice.heading,
      revenue,
      variableCost,
      contributiveMargin,
      contributiveMarginPct,
      fixedCost,
      operatingProfit,
      operatingMarginPct,
      revenueSharePct:
        Math.abs(totalRevenue) > DATA_EPSILON ? (revenue / totalRevenue) * 100 : 0,
      profitable,
      variableCostMapped,
      fixedCostMapped,
      revenueCagrPct: revenueCagrPct(slice),
    }
  })
}

export function buildDivisionProfitabilityTotals(
  rows: DivisionProfitabilityRow[],
): DivisionProfitabilityTotals {
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)
  const withVariable = rows.filter((row) => row.variableCost !== null)
  const withOperating = rows.filter((row) => row.operatingProfit !== null)

  const variableCost =
    withVariable.length && withVariable.every((row) => row.variableCost !== null)
      ? withVariable.reduce((sum, row) => sum + (row.variableCost ?? 0), 0)
      : null

  const contributiveMargin =
    withVariable.length && withVariable.every((row) => row.contributiveMargin !== null)
      ? withVariable.reduce((sum, row) => sum + (row.contributiveMargin ?? 0), 0)
      : null

  const contributiveMarginPct =
    contributiveMargin !== null ? ratioPct(contributiveMargin, revenue) : null

  const fixedCost =
    withOperating.length && withOperating.every((row) => row.fixedCost !== null)
      ? withOperating.reduce((sum, row) => sum + (row.fixedCost ?? 0), 0)
      : null

  const operatingProfit =
    withOperating.length
      ? withOperating.reduce((sum, row) => sum + (row.operatingProfit ?? 0), 0)
      : null

  const operatingMarginPct =
    operatingProfit !== null ? ratioPct(operatingProfit, revenue) : null

  return {
    revenue,
    variableCost,
    contributiveMargin,
    contributiveMarginPct,
    fixedCost,
    operatingProfit,
    operatingMarginPct,
  }
}

/** @deprecated Utiliser buildDivisionProfitabilitySlices */
export const buildDivisionContributiveMarginSlices = buildDivisionProfitabilitySlices
