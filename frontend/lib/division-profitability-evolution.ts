import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import {
  collectAllFixedCostAccountNumbers,
  collectAllVariableCostAccountNumbers,
  resolveRevenueLeafCodes,
} from "@/lib/expense-contribution-bridge"
import { buildGroupedEvolutionDetailRows } from "@/lib/expense-cost-breakdown-tables"
import type { DivisionProfitabilitySlice, DivisionSeriesBundle } from "@/lib/division-profitability"
import { filterMappingsForDivision } from "@/lib/mapping-division-utils"
import { findSeriesRowByCode } from "@/lib/performance-chart-series"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  resolveExpenseCostGroupingFromLinkCode,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"
import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"

const DATA_EPSILON = 1e-6
const MONTHLY_EVOLUTION_COUNT = 12

function buildStandardLinkCodeLookup(codes: StandardLinkCode[] | undefined): StandardLinkCodeLookup {
  return new Map((codes ?? []).map((code) => [code.code, code]))
}

function evolutionPointIndices(pointCount: number, view: string): number[] {
  const windowSize = view === "years" ? pointCount : Math.min(MONTHLY_EVOLUTION_COUNT, pointCount)
  if (windowSize <= 0) return []
  return Array.from({ length: windowSize }, (_, i) => i)
}

function totalRevenueAtPoint(slices: DivisionProfitabilitySlice[], pointIndex: number): number {
  return slices.reduce((sum, slice) => sum + (slice.points[pointIndex]?.revenue ?? 0), 0)
}

function collectRevenueAccountNumbers(
  rows: SeriesRow[],
  standardLinkCodes?: StandardLinkCode[],
): string[] {
  const leafCodes = new Set(resolveRevenueLeafCodes(standardLinkCodes, rows))
  const accounts = new Set<string>()

  for (const code of leafCodes) {
    const row = findSeriesRowByCode(rows, code)
    if (row?.detailRows?.length) {
      for (const detail of row.detailRows) {
        accounts.add(detail.id)
      }
    }
  }

  const revRow = findSeriesRowByCode(rows, "REV")
  revRow?.detailRows?.forEach((detail) => accounts.add(detail.id))

  for (const row of rows) {
    const linkCode = row.linkCode?.trim()
    if (!linkCode || !linkCode.startsWith("REV")) continue
    row.detailRows?.forEach((detail) => accounts.add(detail.id))
  }

  return [...accounts].sort()
}

export function buildDivisionProfitabilityEvolutionTable(params: {
  slice: DivisionProfitabilitySlice
  allSlices: DivisionProfitabilitySlice[]
  bundle: DivisionSeriesBundle | undefined
  mappings: AccountMappingData[]
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): ContributiveMarginEvolutionTable | null {
  const { slice, allSlices, bundle, mappings, view, refMonth, refYear, standardLinkCodes } = params
  if (!slice.points.length || !bundle?.rows.length || !bundle.periods.length) return null

  const orderedIndices = evolutionPointIndices(slice.points.length, view)
  if (!orderedIndices.length) return null

  const divisionMappings = filterMappingsForDivision(mappings, slice.divisionId, slice.heading)
  const mappingsByAccount = new Map(divisionMappings.map((m) => [m.account_number, m]))
  const codeByCode = buildStandardLinkCodeLookup(standardLinkCodes)
  const windowSize = orderedIndices.length

  const periods = orderedIndices.map((i) => slice.points[i]!.period)
  const revenues = orderedIndices.map((i) => slice.points[i]!.revenue)
  const variableCosts = orderedIndices.map((i) => slice.points[i]!.variableCosts)
  const contributiveMargins = orderedIndices.map((i) => slice.points[i]!.contributiveMargin)
  const fixedCosts = orderedIndices.map((i) => slice.points[i]!.fixedCosts)
  const operatingProfits = orderedIndices.map((i) => slice.points[i]!.operatingProfit)
  const sourceRevenuesByPeriod = revenues.map((revenue) =>
    Math.abs(revenue) > DATA_EPSILON ? revenue : null,
  )
  const revenueShares = orderedIndices.map((i) => {
    const revenue = slice.points[i]!.revenue
    const total = totalRevenueAtPoint(allSlices, i)
    if (Math.abs(total) <= DATA_EPSILON) return null
    return (revenue / total) * 100
  })

  const revenueAccounts = collectRevenueAccountNumbers(bundle.rows, standardLinkCodes)
  const variableAccounts = collectAllVariableCostAccountNumbers(divisionMappings)
  const fixedAccounts = collectAllFixedCostAccountNumbers(divisionMappings)

  const revenueDetailRows = buildGroupedEvolutionDetailRows({
    accountNumbers: revenueAccounts,
    mappingsByAccount,
    rows: bundle.rows,
    periodsRaw: bundle.periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
    resolveParentGroup: (accountNumber, mappingsByAccount, codeByCode) => {
      const mapping = mappingsByAccount.get(accountNumber)
      const linkCode = mapping?.link_code?.trim()
      if (!linkCode) return { id: accountNumber, label: accountNumber }
      const group = resolveExpenseCostGroupingFromLinkCode(linkCode, codeByCode)
      return group ?? { id: linkCode, label: linkCode }
    },
  })

  const variableDetailRows = buildGroupedEvolutionDetailRows({
    accountNumbers: variableAccounts,
    mappingsByAccount,
    rows: bundle.rows,
    periodsRaw: bundle.periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })

  const fixedDetailRows = buildGroupedEvolutionDetailRows({
    accountNumbers: fixedAccounts,
    mappingsByAccount,
    rows: bundle.rows,
    periodsRaw: bundle.periods,
    view,
    refMonth,
    refYear,
    windowSize,
    codeByCode,
  })

  return {
    sourceId: slice.divisionId,
    sourceLabel: slice.heading,
    periods,
    sourceRevenuesByPeriod,
    metrics: [
      {
        id: "revenue",
        label: "Revenus",
        format: "currency",
        values: revenues,
        detailRows: revenueDetailRows.length ? revenueDetailRows : undefined,
      },
      {
        id: "variable-cost",
        label: "Coûts var.",
        format: "currency",
        values: variableCosts,
        detailRows: variableDetailRows.length ? variableDetailRows : undefined,
      },
      {
        id: "contributive-margin",
        label: "Contr. marginale",
        format: "currency",
        values: contributiveMargins,
      },
      {
        id: "fixed-cost",
        label: "Coûts fixes",
        format: "currency",
        values: fixedCosts,
        detailRows: fixedDetailRows.length ? fixedDetailRows : undefined,
      },
      {
        id: "operating-profit",
        label: EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL,
        format: "currency",
        values: operatingProfits,
      },
      { id: "revenue-share", label: "Part CA", format: "percent", values: revenueShares },
    ],
  }
}

export function buildDivisionProfitabilityEvolutionTables(params: {
  slices: DivisionProfitabilitySlice[]
  divisionSeries: DivisionSeriesBundle[]
  mappings: AccountMappingData[]
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): Map<string, ContributiveMarginEvolutionTable> {
  const { slices, divisionSeries, mappings, view, refMonth, refYear, standardLinkCodes } = params
  const bundleByDivision = new Map(divisionSeries.map((entry) => [entry.divisionId, entry]))
  const tables = new Map<string, ContributiveMarginEvolutionTable>()

  for (const slice of slices) {
    const table = buildDivisionProfitabilityEvolutionTable({
      slice,
      allSlices: slices,
      bundle: bundleByDivision.get(slice.divisionId),
      mappings,
      view,
      refMonth,
      refYear,
      standardLinkCodes,
    })
    if (!table) continue
    tables.set(`Rentabilité — ${slice.heading}`, table)
  }

  return tables
}
