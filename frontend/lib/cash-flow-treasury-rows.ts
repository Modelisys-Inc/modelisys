import { normLabel } from "@/lib/income-statement-structure-utils"
import {
  aggregateToQuarters,
  aggregateToYears,
  reverseSeriesOrderForDisplay,
} from "@/lib/series-utils"
import type { CashFlowDetailTrendView, CashFlowDisplayAmountRow } from "@/lib/cash-flow-detail-settings"

function normTreasuryLabel(s: string): string {
  return normLabel(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

export const CASH_FLOW_TREASURY_ACT_CODE = "ACT-A"
export const CASH_FLOW_TREASURY_PCT_CODE = "PCT-A"

export type BsAmountSource = {
  id?: string
  linkCode?: string
  current?: number
  prior?: number
  amounts?: Record<string, number>
}

export type CashFlowTreasuryPointSnapshot = {
  current: number
  prior: number
}

export type CashFlowTreasuryContext = {
  beginning?: CashFlowTreasuryPointSnapshot
  beginningTrend?: number[]
  /** ACT-A − PCT-A du mois affiché (référence validation fin de période). */
  endingBook?: CashFlowTreasuryPointSnapshot
  endingBookTrend?: number[]
}

export function periodKey(year: number, month: number): string {
  return `${year}-${month}`
}

export function priorCalendarMonth(year: number, month: number): { year: number; month: number } {
  if (month > 1) return { year, month: month - 1 }
  return { year: year - 1, month: 12 }
}

export function isCashFlowBeginningCashStructureRow(row: Record<string, unknown>): boolean {
  const label = normTreasuryLabel(String(row.label ?? ""))
  return label.includes("tresorerie au debut")
}

export function isCashFlowEndingCashStructureRow(row: Record<string, unknown>): boolean {
  const label = normTreasuryLabel(String(row.label ?? ""))
  return label.includes("tresorerie a la fin")
}

export function isCashFlowNetVariationStructureRow(row: Record<string, unknown>): boolean {
  const label = normTreasuryLabel(String(row.label ?? ""))
  if (isCashFlowBeginningCashStructureRow(row) || isCashFlowEndingCashStructureRow(row)) return false
  return label.includes("variation") && label.includes("tresorerie")
}

export function isCashFlowFixedTreasuryStructureRow(row: Record<string, unknown>): boolean {
  return isCashFlowBeginningCashStructureRow(row) || isCashFlowEndingCashStructureRow(row)
}

export function structureHasFixedTreasuryRows(structure: Record<string, unknown>[]): boolean {
  return structure.some(isCashFlowFixedTreasuryStructureRow)
}

export function findBalanceSheetRowByLinkCode(
  rows: BsAmountSource[],
  code: string,
): BsAmountSource | undefined {
  const target = code.trim()
  const flattened = flattenBsAmountSources(rows)
  return flattened.find((row) => {
    const lc = String(row.linkCode ?? row.id ?? "").trim()
    return lc === target
  })
}

function rowLinkCode(row: BsAmountSource): string {
  return String(row.linkCode ?? row.id ?? "").trim()
}

/** Montant bilan pour un code racine (ex. ACT-A) ou la somme de ses descendants ACT-A.*. */
export function balanceSheetAmountForLinkCodeRoot(
  rows: BsAmountSource[],
  rootCode: string,
  field: "current" | "prior" = "current",
): number {
  const target = rootCode.trim()
  if (!target) return 0
  const flat = flattenBsAmountSources(rows)

  const exact = flat.find((row) => rowLinkCode(row) === target)
  if (exact) return exact[field] ?? 0

  return flat.reduce((sum, row) => {
    const lc = rowLinkCode(row)
    if (lc.startsWith(`${target}.`)) return sum + (row[field] ?? 0)
    return sum
  }, 0)
}

function balanceSheetSeriesAmountForLinkCodeRoot(
  flat: BsAmountSource[],
  rootCode: string,
  key: string,
): number {
  const target = rootCode.trim()
  if (!target) return 0

  const exact = flat.find((row) => rowLinkCode(row) === target)
  if (exact) return exact.amounts?.[key] ?? 0

  return flat.reduce((sum, row) => {
    const lc = rowLinkCode(row)
    if (lc.startsWith(`${target}.`)) return sum + (row.amounts?.[key] ?? 0)
    return sum
  }, 0)
}

function flattenBsAmountSources(rows: BsAmountSource[]): BsAmountSource[] {
  const out: BsAmountSource[] = []
  const walk = (list: BsAmountSource[]) => {
    for (const row of list) {
      out.push(row)
      const nested = (row as { detailRows?: BsAmountSource[] }).detailRows
      if (nested?.length) walk(nested)
    }
  }
  walk(rows)
  return out
}

export function netCashFromBalanceSheetPointRows(
  rows: BsAmountSource[],
  field: "current" | "prior" = "current",
): number {
  const act = balanceSheetAmountForLinkCodeRoot(rows, CASH_FLOW_TREASURY_ACT_CODE, field)
  const pct = balanceSheetAmountForLinkCodeRoot(rows, CASH_FLOW_TREASURY_PCT_CODE, field)
  return act - pct
}

export function buildNetCashByPeriodKey(bsSeriesRows: BsAmountSource[]): Map<string, number> {
  const flat = flattenBsAmountSources(bsSeriesRows)
  const keys = new Set<string>()
  for (const row of flat) {
    for (const key of Object.keys(row.amounts ?? {})) keys.add(key)
  }
  const map = new Map<string, number>()
  for (const key of keys) {
    const act = balanceSheetSeriesAmountForLinkCodeRoot(flat, CASH_FLOW_TREASURY_ACT_CODE, key)
    const pct = balanceSheetSeriesAmountForLinkCodeRoot(flat, CASH_FLOW_TREASURY_PCT_CODE, key)
    map.set(key, act - pct)
  }
  return map
}

export function comparisonAnchorMonth(
  refYear: number,
  refMonth: number,
  comparisonType: "lastMonth" | "pastMonth" | "budget",
): { year: number; month: number } {
  if (comparisonType === "lastMonth" || comparisonType === "pastMonth") {
    return priorCalendarMonth(refYear, refMonth)
  }
  return { year: refYear - 1, month: refMonth }
}

export function beginningCashTrendFromNetCashByPeriod(
  netByPeriodKey: Map<string, number>,
  displayPeriods: Array<{ fiscalYear: number; fiscalMonth: number }>,
): number[] {
  return displayPeriods.map((period) => {
    const prior = priorCalendarMonth(period.fiscalYear, period.fiscalMonth)
    return netByPeriodKey.get(periodKey(prior.year, prior.month)) ?? 0
  })
}

export function buildBeginningCashTrendForView(
  netByPeriodKey: Map<string, number>,
  periods: Array<{ fiscalYear: number; fiscalMonth: number }>,
  view: CashFlowDetailTrendView,
): number[] {
  const monthly = beginningCashTrendFromNetCashByPeriod(netByPeriodKey, periods)
  if (view === "12months") {
    return reverseSeriesOrderForDisplay(monthly)
  }
  if (view === "quarters") {
    return reverseSeriesOrderForDisplay(aggregateToQuarters(monthly, periods).amounts)
  }
  return reverseSeriesOrderForDisplay(aggregateToYears(monthly, periods).amounts)
}

/** ACT-A − PCT-A du mois de chaque colonne affichée (validation trésorerie fin). */
export function endingBookNetCashForDisplayPeriods(
  netByPeriodKey: Map<string, number>,
  displayPeriods: Array<{ fiscalYear: number; fiscalMonth: number }>,
): number[] {
  return displayPeriods.map(
    (period) => netByPeriodKey.get(periodKey(period.fiscalYear, period.fiscalMonth)) ?? 0,
  )
}

export function buildEndingBookTrendForView(
  netByPeriodKey: Map<string, number>,
  periods: Array<{ fiscalYear: number; fiscalMonth: number }>,
  view: CashFlowDetailTrendView,
): number[] {
  const monthly = endingBookNetCashForDisplayPeriods(netByPeriodKey, periods)
  if (view === "12months") {
    return reverseSeriesOrderForDisplay(monthly)
  }
  if (view === "quarters") {
    return reverseSeriesOrderForDisplay(aggregateToQuarters(monthly, periods).amounts)
  }
  return reverseSeriesOrderForDisplay(aggregateToYears(monthly, periods).amounts)
}

/** Écart = Trésorerie à la fin − (ACT-A − PCT-A) du mois. */
export function cashFlowTreasuryValidationEcart(
  endingCash: number | undefined,
  bookNetCash: number | undefined,
): number | null {
  if (endingCash === undefined || bookNetCash === undefined) return null
  return endingCash - bookNetCash
}

export function isCashFlowTreasuryBalanced(ecart: number | null | undefined, tolerance = 1): boolean {
  if (ecart === null || ecart === undefined) return true
  return Math.abs(ecart) < tolerance
}

export function cashFlowTreasuryValidationTrendEcarts(
  endingTrend: number[] | undefined,
  bookTrend: number[] | undefined,
): number[] {
  if (!endingTrend?.length || !bookTrend?.length) return []
  const n = Math.min(endingTrend.length, bookTrend.length)
  return Array.from({ length: n }, (_, i) => (endingTrend[i] ?? 0) - (bookTrend[i] ?? 0))
}

function findTreasuryRowIndices(structureRows: Record<string, unknown>[]): {
  variationIndex: number
  beginningIndex: number
  endingIndex: number
} {
  let variationIndex = -1
  let beginningIndex = -1
  let endingIndex = -1
  structureRows.forEach((row, index) => {
    if (isCashFlowNetVariationStructureRow(row)) variationIndex = index
    if (isCashFlowBeginningCashStructureRow(row)) beginningIndex = index
    if (isCashFlowEndingCashStructureRow(row)) endingIndex = index
  })
  return { variationIndex, beginningIndex, endingIndex }
}

/** Trésorerie début = ACT-A − PCT-A (N−1) ; fin = variation + début. */
export function applyCashFlowFixedTreasuryRows<T extends CashFlowDisplayAmountRow>(
  detailRows: T[],
  structureRows: Record<string, unknown>[],
  treasury: CashFlowTreasuryContext | undefined,
): T[] {
  if (!treasury || detailRows.length !== structureRows.length) return detailRows

  const { variationIndex, beginningIndex, endingIndex } = findTreasuryRowIndices(structureRows)
  if (beginningIndex < 0 && endingIndex < 0) return detailRows

  const out = [...detailRows]

  if (beginningIndex >= 0 && (treasury.beginning || treasury.beginningTrend)) {
    out[beginningIndex] = {
      ...out[beginningIndex]!,
      ...(treasury.beginning
        ? {
            current: treasury.beginning.current,
            prior: treasury.beginning.prior,
          }
        : {}),
      hasLiaisonCode: true,
      ...(treasury.beginningTrend ? { trendValues: treasury.beginningTrend } : {}),
    }
  }

  if (endingIndex >= 0 && beginningIndex >= 0) {
    const beginning = out[beginningIndex]!
    const variation =
      variationIndex >= 0
        ? out[variationIndex]!
        : { current: 0, prior: 0, trendValues: undefined as number[] | undefined }

    const endingTrend =
      variation.trendValues && beginning.trendValues
        ? variation.trendValues.map(
            (value, index) => value + (beginning.trendValues?.[index] ?? 0),
          )
        : beginning.trendValues

    out[endingIndex] = {
      ...out[endingIndex]!,
      current: variation.current + beginning.current,
      prior: variation.prior + beginning.prior,
      hasLiaisonCode: true,
      ...(endingTrend ? { trendValues: endingTrend } : {}),
    }
  }

  return out
}
