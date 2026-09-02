/**
 * Colonnes mensuelles Pro Forma Bilan (soldes de clôture).
 */

import {
  buildCapexBookValueMonthlyTrend,
  resolveCapexDepreciationMethod,
  resolveCapexDepreciationRate,
  type CapexAdjustment,
  type CapexBilanPeerRow,
  type CapexDepreciationMethod,
} from "@/lib/capex-forecast-resolve"
import {
  dividendsForBilanYear,
  isCapexDrivenBilanRow,
  isComptesClientsBilanRow,
  isCrediteursLikeBilanRow,
  isFinancingDrivenBilanRow,
  isRetainedEarningsBilanRow,
  isRevenuePercentAdjustableBilanRow,
  isStocksBilanRow,
  isTaxAssetBilanRow,
  isTaxDrivenBilanRow,
  isTaxLiabilityBilanRow,
  isTreasuryEndingCashDrivenBilanRow,
  isDecouvertBilanRow,
  recomputeBilanHypothesisSubtotalTrends,
  resolveComptesClientsProjectedValue,
  resolveCrediteursProjectedValue,
  resolveOtherActProjectedValue,
  resolveStocksProjectedValue,
  resolveTaxExigibleProjectedValue,
  type BilanAdjustment,
} from "@/lib/bilan-forecast-utils"
import {
  expandProjectedAnnualTrendToMonthly,
  flatMonthlySeasonalityPercents,
  proFormaMonthlyProjectedColumnCount,
} from "@/lib/pro-forma-monthly-is"

export type { ProFormaIsColumnHorizon } from "@/lib/pro-forma-monthly-is"
export {
  buildProFormaMonthlyProjectedLabels,
  proFormaMonthlyProjectedColumnCount,
} from "@/lib/pro-forma-monthly-is"

export type BilanMonthlyRow = {
  label: string
  current: number
  prior: number
  trendValues?: number[]
  rowId?: string
  linkCode?: string
  isSubtotal?: boolean
  isSection?: boolean
  formula?: string[]
  liaisonMode?: string
  liaisonSumCodes?: string[]
}

export function proFormaMonthlyDisplayYearIndex(monthIndex: number, forecastActualCols: number): number {
  return forecastActualCols + Math.floor(monthIndex / 12)
}

export function proFormaMonthlyConfigYearIndex(monthIndex: number): number {
  return Math.floor(monthIndex / 12) + 1
}

/** Répartit des totaux config (index 1+ = projeté) en mois. */
export function expandConfigYearTotalsToMonthly(
  totals: number[] | null | undefined,
  projectionYears: number,
  seasonality = flatMonthlySeasonalityPercents(),
): number[] {
  const months: number[] = []
  for (let cfg = 1; cfg <= projectionYears; cfg++) {
    const annual = totals?.[cfg] ?? 0
    months.push(
      ...expandProjectedAnnualTrendToMonthly({
        annualTrend: [0, annual],
        forecastActualCols: 1,
        projectionYears: 1,
        seasonalityForConfigYear: () => seasonality,
      }),
    )
  }
  return months
}

/** Interpole linéairement entre clôtures annuelles projetées. */
export function interpolateProjectedAnnualTrendToMonthly(
  annualTrend: number[],
  forecastActualCols: number,
  projectionYears: number,
): number[] {
  const months: number[] = []
  for (let y = 0; y < projectionYears; y++) {
    const endIdx = forecastActualCols + y
    const startIdx = endIdx - 1
    const startVal =
      y === 0
        ? (annualTrend[Math.max(0, forecastActualCols - 1)] ?? annualTrend[0] ?? 0)
        : (annualTrend[startIdx] ?? 0)
    const endVal = annualTrend[endIdx] ?? startVal
    for (let m = 0; m < 12; m++) {
      months.push(Math.round(startVal + ((endVal - startVal) * (m + 1)) / 12))
    }
  }
  return months
}

function annualizedMonthlyRevenue(monthlyRev: number): number {
  return monthlyRev * 12
}

function resolveTreasuryFromMonthlyEndingCash(
  endingCash: number,
  side: "encaisse" | "decouvert",
): number {
  if (side === "encaisse") return endingCash > 0 ? endingCash : 0
  return endingCash < 0 ? -endingCash : 0
}

export type ExpandBilanMonthlyContext = {
  forecastActualCols: number
  projectionYears: number
  configYearCount: number
  bilanAdjustments: Record<string, BilanAdjustment[]>
  projectedRevenueMonthly: number[]
  projectedCmvMonthly: number[]
  periodNetIncomeMonthly: number[]
  endingCashMonthly: number[]
  periodTaxExpenseByDisplayYear: number[]
  periodTaxPaidByDisplayYear: number[]
  taxExigibleBaseTrends: { asset: number[]; liability: number[] }
  capexAdjustments: Record<string, CapexAdjustment[]>
  capexDepreciationRates: Record<string, number>
  capexDepreciationMethods: Record<string, CapexDepreciationMethod>
  projectedRevenueYearTotals: number[] | null
  capexPeerRows: CapexBilanPeerRow[]
  costByRowId: Record<string, number>
  getAnnualDisplayAmount: (row: BilanMonthlyRow, displayYearIndex: number) => number
}

function buildCapexMonthlyCache(ctx: ExpandBilanMonthlyContext): Map<string, number[]> {
  const cache = new Map<string, number[]>()
  for (const peer of ctx.capexPeerRows) {
    const key = peer.rowId
    if (cache.has(key)) continue
    const opening = peer.actualBase
    const openingCost = peer.actualCostBase ?? ctx.costByRowId[key] ?? opening
    const monthly = buildCapexBookValueMonthlyTrend({
      rowId: key,
      configYearCount: ctx.configYearCount,
      openingCost,
      openingBookValue: opening,
      adjustments: ctx.capexAdjustments,
      ratePercent: resolveCapexDepreciationRate(key, peer.label ?? "", ctx.capexDepreciationRates),
      method: resolveCapexDepreciationMethod(key, ctx.capexDepreciationMethods),
      projectedRevenueYearTotals: ctx.projectedRevenueYearTotals,
    })
    cache.set(key, monthly)
    if (peer.linkCode) cache.set(peer.linkCode, monthly)
  }
  return cache
}

function capexMonthlyAt(
  rowId: string | undefined,
  linkCode: string | null | undefined,
  monthIndex: number,
  cache: Map<string, number[]>,
): number | null {
  const trend =
    (rowId ? cache.get(rowId) : undefined) ?? (linkCode ? cache.get(linkCode) : undefined)
  if (!trend?.length) return null
  return trend[monthIndex] ?? 0
}

function buildRetainedEarningsMonthlyTrend(
  row: BilanMonthlyRow,
  ctx: ExpandBilanMonthlyContext,
): number[] {
  const monthlyCount = proFormaMonthlyProjectedColumnCount(ctx.projectionYears)
  const baseTrend = row.trendValues ?? []
  let re = baseTrend[Math.max(0, ctx.forecastActualCols - 1)] ?? baseTrend[0] ?? 0
  const out: number[] = []
  const rowId = row.rowId ?? ""
  for (let m = 0; m < monthlyCount; m++) {
    const displayYear = proFormaMonthlyDisplayYearIndex(m, ctx.forecastActualCols)
    const ni = ctx.periodNetIncomeMonthly[m] ?? 0
    const div =
      m % 12 === 11
        ? dividendsForBilanYear(ctx.bilanAdjustments[rowId] ?? [], displayYear, ctx.forecastActualCols)
        : 0
    re = re + ni - div
    out.push(re)
  }
  return out
}

export function expandBilanHypothesisRowsToMonthly(
  rows: BilanMonthlyRow[],
  ctx: ExpandBilanMonthlyContext,
): BilanMonthlyRow[] {
  const monthlyCount = proFormaMonthlyProjectedColumnCount(ctx.projectionYears)
  const capexCache = buildCapexMonthlyCache(ctx)

  const annualByRow = new Map<string, number[]>()
  for (const row of rows) {
    const annualLen = ctx.forecastActualCols + ctx.projectionYears
    const values = Array.from({ length: annualLen }, (_, i) => ctx.getAnnualDisplayAmount(row, i))
    annualByRow.set(row.rowId ?? row.label, values)
  }

  const expanded = rows.map((row) => {
    const annualValues = annualByRow.get(row.rowId ?? row.label) ?? []
    const rowParams = { rowId: row.rowId, linkCode: row.linkCode, label: row.label }
    let monthly: number[]

    if (isCapexDrivenBilanRow(rowParams)) {
      monthly = Array.from({ length: monthlyCount }, (_, m) => {
        const cached = capexMonthlyAt(row.rowId, row.linkCode ?? null, m, capexCache)
        if (cached != null) return cached
        return interpolateProjectedAnnualTrendToMonthly(
          annualValues,
          ctx.forecastActualCols,
          ctx.projectionYears,
        )[m] ?? 0
      })
    } else if (isRetainedEarningsBilanRow(rowParams)) {
      monthly = buildRetainedEarningsMonthlyTrend(row, ctx)
    } else if (isFinancingDrivenBilanRow(rowParams)) {
      monthly = interpolateProjectedAnnualTrendToMonthly(
        annualValues,
        ctx.forecastActualCols,
        ctx.projectionYears,
      )
    } else if (isTreasuryEndingCashDrivenBilanRow(rowParams)) {
      const side = isDecouvertBilanRow(rowParams) ? "decouvert" : "encaisse"
      monthly = ctx.endingCashMonthly.map((ending) =>
        resolveTreasuryFromMonthlyEndingCash(ending, side),
      )
    } else if (isTaxDrivenBilanRow(rowParams)) {
      const side = isTaxAssetBilanRow(rowParams) ? "asset" : "liability"
      monthly = Array.from({ length: monthlyCount }, (_, m) => {
        const displayYear = proFormaMonthlyDisplayYearIndex(m, ctx.forecastActualCols)
        return resolveTaxExigibleProjectedValue({
          side,
          yearIndex: displayYear,
          forecastActualCols: ctx.forecastActualCols,
          taxExpenseByDisplayYear: ctx.periodTaxExpenseByDisplayYear,
          taxPaidByDisplayYear: ctx.periodTaxPaidByDisplayYear,
          assetBaseTrend:
            side === "asset" && row.trendValues?.length
              ? row.trendValues
              : ctx.taxExigibleBaseTrends.asset,
          liabilityBaseTrend:
            side === "liability" && row.trendValues?.length
              ? row.trendValues
              : ctx.taxExigibleBaseTrends.liability,
        })
      })
    } else if (isComptesClientsBilanRow(rowParams)) {
      monthly = Array.from({ length: monthlyCount }, (_, m) => {
        const displayYear = proFormaMonthlyDisplayYearIndex(m, ctx.forecastActualCols)
        const rev = annualizedMonthlyRevenue(ctx.projectedRevenueMonthly[m] ?? 0)
        return resolveComptesClientsProjectedValue(
          row.trendValues ?? [],
          displayYear,
          ctx.bilanAdjustments[row.rowId ?? ""] ?? [],
          rev,
        )
      })
    } else if (isStocksBilanRow(rowParams)) {
      monthly = Array.from({ length: monthlyCount }, (_, m) => {
        const displayYear = proFormaMonthlyDisplayYearIndex(m, ctx.forecastActualCols)
        const cmv = annualizedMonthlyRevenue(ctx.projectedCmvMonthly[m] ?? 0)
        const rev = annualizedMonthlyRevenue(ctx.projectedRevenueMonthly[m] ?? 0)
        return resolveStocksProjectedValue(
          row.trendValues ?? [],
          displayYear,
          ctx.bilanAdjustments[row.rowId ?? ""] ?? [],
          cmv,
          rev,
        )
      })
    } else if (isCrediteursLikeBilanRow(rowParams)) {
      monthly = Array.from({ length: monthlyCount }, (_, m) => {
        const displayYear = proFormaMonthlyDisplayYearIndex(m, ctx.forecastActualCols)
        const cmv = annualizedMonthlyRevenue(ctx.projectedCmvMonthly[m] ?? 0)
        const rev = annualizedMonthlyRevenue(ctx.projectedRevenueMonthly[m] ?? 0)
        return resolveCrediteursProjectedValue(
          row.trendValues ?? [],
          displayYear,
          ctx.bilanAdjustments[row.rowId ?? ""] ?? [],
          cmv,
          rev,
        )
      })
    } else if (isRevenuePercentAdjustableBilanRow(rowParams)) {
      monthly = Array.from({ length: monthlyCount }, (_, m) => {
        const displayYear = proFormaMonthlyDisplayYearIndex(m, ctx.forecastActualCols)
        const rev = annualizedMonthlyRevenue(ctx.projectedRevenueMonthly[m] ?? 0)
        return resolveOtherActProjectedValue(
          row.trendValues ?? [],
          displayYear,
          ctx.bilanAdjustments[row.rowId ?? ""] ?? [],
          rev,
        )
      })
    } else {
      monthly = interpolateProjectedAnnualTrendToMonthly(
        annualValues,
        ctx.forecastActualCols,
        ctx.projectionYears,
      )
    }

    return {
      ...row,
      trendValues: monthly,
      current: monthly[0] ?? 0,
      prior: monthly[1] ?? 0,
    }
  })

  return recomputeBilanHypothesisSubtotalTrends(
    expanded,
    (row, monthIndex) => row.trendValues?.[monthIndex] ?? 0,
  )
}
