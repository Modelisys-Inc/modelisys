import type { AccountMappingData, SeriesPeriod, SeriesRow } from "@/lib/api"
import { BALANCE_SHEET_FAMILY_SECTION_LABELS } from "@/lib/balance-sheet-mapping-rollup"
import { findSeriesRowByCode } from "@/lib/performance-chart-series"
import {
  monthShortLabelsFromReference,
  monthTrendFromReference,
  yearLabelsFromReference,
  yearTrendFromReference,
} from "@/lib/series-reference-columns"
import {
  PERFORMANCE_CHART_MONTH_COUNT_24,
  PERFORMANCE_CHART_YEAR_COUNT,
  buildSyntheticSeriesRow,
} from "@/lib/performance-chart-series"
import { getRowAmounts } from "@/lib/series-utils"
import { deriveLinkCodeFamily, linkCodeDtCtSignMultiplier } from "@/lib/standard-link-code-utils"

const DATA_EPSILON = 1e-6

export const BALANCE_POSITION_FAMILIES = ["ACT", "ALT", "PCT", "PLT", "CAP"] as const
export type BalancePositionFamily = (typeof BALANCE_POSITION_FAMILIES)[number]

export const BALANCE_POSITION_FAMILY_LABELS: Record<BalancePositionFamily, string> = {
  ACT: BALANCE_SHEET_FAMILY_SECTION_LABELS.ACT!,
  ALT: BALANCE_SHEET_FAMILY_SECTION_LABELS.ALT!,
  PCT: BALANCE_SHEET_FAMILY_SECTION_LABELS.PCT!,
  PLT: BALANCE_SHEET_FAMILY_SECTION_LABELS.PLT!,
  CAP: BALANCE_SHEET_FAMILY_SECTION_LABELS.CAP!,
}

export type FinancialPositionPoint = {
  period: string
  act: number
  alt: number
  pct: number
  plt: number
  cap: number
  totalAssets: number
  totalLiabilitiesEquity: number
}

export type FinancialPositionResult = {
  points: FinancialPositionPoint[]
  mappedAccountCount: number
}

function displayAmount(raw: number, linkCode: string): number {
  const sign = linkCodeDtCtSignMultiplier(linkCode)
  return Math.abs(raw * sign)
}

function sumFamilyMonthlyAmounts(
  family: BalancePositionFamily,
  mappings: AccountMappingData[],
  rows: SeriesRow[],
  periods: SeriesPeriod[],
): number[] {
  const totals = periods.map(() => 0)
  const linkCodeAttributed = new Set<string>()

  for (const mapping of mappings) {
    const linkCode = mapping.link_code?.trim()
    if (!linkCode || deriveLinkCodeFamily(linkCode) !== family) continue

    let row = findSeriesRowByCode(rows, mapping.account_number)
    if (!row && !linkCodeAttributed.has(linkCode)) {
      row = findSeriesRowByCode(rows, linkCode)
      if (row) linkCodeAttributed.add(linkCode)
    }
    if (!row) continue

    const amounts = getRowAmounts(row, periods)
    for (let i = 0; i < periods.length; i++) {
      totals[i]! += displayAmount(amounts[i] ?? 0, linkCode)
    }
  }

  return totals
}

function trendFromMonthlyAmounts(
  monthly: number[],
  periods: SeriesPeriod[],
  view: string,
  refMonth: number,
  refYear: number,
): number[] | null {
  if (!periods.length) return null
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

function periodLabelsForView(view: string, refMonth: number, refYear: number, pointCount: number): string[] {
  if (view === "years") return yearLabelsFromReference(refYear, pointCount)
  if (view === "24months") return monthShortLabelsFromReference(refMonth, refYear, pointCount)
  return []
}

function countMappedBalanceAccounts(mappings: AccountMappingData[]): number {
  return mappings.filter((m) => {
    const family = deriveLinkCodeFamily(m.link_code ?? "")
    return BALANCE_POSITION_FAMILIES.includes(family as BalancePositionFamily)
  }).length
}

export function buildFinancialPositionResult(params: {
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  mappings: AccountMappingData[]
  view: string
  refMonth: number
  refYear: number
}): FinancialPositionResult | null {
  const { rows, periods, mappings, view, refMonth, refYear } = params
  if (!rows.length || !periods.length) return null

  const familyTrends = Object.fromEntries(
    BALANCE_POSITION_FAMILIES.map((family) => [
      family,
      trendFromMonthlyAmounts(
        sumFamilyMonthlyAmounts(family, mappings, rows, periods),
        periods,
        view,
        refMonth,
        refYear,
      ),
    ]),
  ) as Record<BalancePositionFamily, number[] | null>

  const pointCount = Math.max(
    ...BALANCE_POSITION_FAMILIES.map((f) => familyTrends[f]?.length ?? 0),
    0,
  )
  if (!pointCount) {
    return { points: [], mappedAccountCount: countMappedBalanceAccounts(mappings) }
  }

  const labels = periodLabelsForView(view, refMonth, refYear, pointCount)
  const points: FinancialPositionPoint[] = []

  for (let i = 0; i < pointCount; i++) {
    const act = familyTrends.ACT?.[i] ?? 0
    const alt = familyTrends.ALT?.[i] ?? 0
    const pct = familyTrends.PCT?.[i] ?? 0
    const plt = familyTrends.PLT?.[i] ?? 0
    const cap = familyTrends.CAP?.[i] ?? 0
    points.push({
      period: labels[i] ?? `P${i + 1}`,
      act,
      alt,
      pct,
      plt,
      cap,
      totalAssets: act + alt,
      totalLiabilitiesEquity: pct + plt + cap,
    })
  }

  return {
    points,
    mappedAccountCount: countMappedBalanceAccounts(mappings),
  }
}

export function familyHeading(family: BalancePositionFamily): string {
  return BALANCE_POSITION_FAMILY_LABELS[family]
}

export function parseFamilyFromHeading(heading: string): BalancePositionFamily | null {
  for (const family of BALANCE_POSITION_FAMILIES) {
    if (heading === BALANCE_POSITION_FAMILY_LABELS[family]) return family
  }
  return null
}

export function ratioPct(numerator: number, denominator: number): number | null {
  if (Math.abs(denominator) < DATA_EPSILON) return null
  return (numerator / denominator) * 100
}
