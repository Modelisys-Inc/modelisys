import type { AccountMappingData, SeriesPeriod, SeriesRow, StandardLinkCode } from "@/lib/api"
import { buildGroupedEvolutionDetailRows } from "@/lib/expense-cost-breakdown-tables"
import {
  BALANCE_POSITION_FAMILIES,
  type BalancePositionFamily,
  type FinancialPositionResult,
  familyHeading,
} from "@/lib/financial-position"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  deriveLinkCodeFamily,
  resolveExpenseCostGroupingFromLinkCode,
  type StandardLinkCodeLookup,
} from "@/lib/standard-link-code-utils"

const MONTHLY_EVOLUTION_COUNT = 24

function buildStandardLinkCodeLookup(codes: StandardLinkCode[] | undefined): StandardLinkCodeLookup {
  return new Map((codes ?? []).map((code) => [code.code, code]))
}

function evolutionPointIndices(pointCount: number, view: string): number[] {
  const windowSize = view === "years" ? pointCount : Math.min(MONTHLY_EVOLUTION_COUNT, pointCount)
  if (windowSize <= 0) return []
  return Array.from({ length: windowSize }, (_, i) => i)
}

function collectFamilyAccountNumbers(
  mappings: AccountMappingData[],
  family: BalancePositionFamily,
): string[] {
  return [
    ...new Set(
      mappings
        .filter((m) => deriveLinkCodeFamily(m.link_code ?? "") === family)
        .map((m) => m.account_number),
    ),
  ].sort()
}

function resolveBalanceSheetParentGroup(
  accountNumber: string,
  mappingsByAccount: Map<string, AccountMappingData>,
  codeByCode: StandardLinkCodeLookup,
): { id: string; label: string } {
  const mapping = mappingsByAccount.get(accountNumber)
  return (
    resolveExpenseCostGroupingFromLinkCode(mapping?.link_code, codeByCode) ?? {
      id: mapping?.link_code?.trim() || accountNumber,
      label: mapping?.link_code?.trim() || accountNumber,
    }
  )
}

export function buildFinancialPositionBreakdownTable(params: {
  result: FinancialPositionResult
  family: BalancePositionFamily
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  mappings: AccountMappingData[]
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): ContributiveMarginEvolutionTable | null {
  const { result, family, rows, periods, mappings, view, refMonth, refYear, standardLinkCodes } = params
  if (!result.points.length || !rows.length || !periods.length) return null

  const orderedIndices = evolutionPointIndices(result.points.length, view)
  if (!orderedIndices.length) return null

  const mappingsByAccount = new Map(mappings.map((m) => [m.account_number, m]))
  const codeByCode = buildStandardLinkCodeLookup(standardLinkCodes)
  const accountNumbers = collectFamilyAccountNumbers(mappings, family)
  if (!accountNumbers.length) return null

  const familyKey = family.toLowerCase() as "act" | "alt" | "pct" | "plt" | "cap"
  const familyValues = orderedIndices.map((i) => result.points[i]![familyKey])
  const totalAssets = orderedIndices.map((i) => result.points[i]!.totalAssets)
  const totalLe = orderedIndices.map((i) => result.points[i]!.totalLiabilitiesEquity)

  const shareDenominator = BALANCE_POSITION_FAMILIES.slice(0, 2).includes(family) ? totalAssets : totalLe

  const sharePcts = orderedIndices.map((_, col) => {
    const value = familyValues[col]
    const denom = shareDenominator[col]!
    if (value === null || Math.abs(denom) <= 1e-6) return null
    return (value / denom) * 100
  })

  const detailRows = buildGroupedEvolutionDetailRows({
    accountNumbers,
    mappingsByAccount,
    rows,
    periodsRaw: periods,
    view,
    refMonth,
    refYear,
    windowSize: orderedIndices.length,
    codeByCode,
    resolveParentGroup: resolveBalanceSheetParentGroup,
  })

  const periodLabels = orderedIndices.map((i) => result.points[i]!.period)

  return {
    sourceId: family,
    sourceLabel: familyHeading(family),
    periods: periodLabels,
    metrics: [
      {
        id: familyKey,
        label: "Montant",
        format: "currency",
        values: familyValues,
        detailRows: detailRows.length ? detailRows : undefined,
      },
      {
        id: `${familyKey}-share`,
        label: "Part du total",
        format: "percent",
        values: sharePcts,
      },
    ],
  }
}

export function buildFinancialPositionBreakdownTables(params: {
  result: FinancialPositionResult
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  mappings: AccountMappingData[]
  view: string
  refMonth: number
  refYear: number
  standardLinkCodes?: StandardLinkCode[]
}): Map<string, ContributiveMarginEvolutionTable> {
  const tables = new Map<string, ContributiveMarginEvolutionTable>()

  for (const family of BALANCE_POSITION_FAMILIES) {
    const table = buildFinancialPositionBreakdownTable({ ...params, family })
    if (table) tables.set(familyHeading(family), table)
  }

  return tables
}
