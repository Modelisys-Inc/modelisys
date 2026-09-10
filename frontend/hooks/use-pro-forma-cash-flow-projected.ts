"use client"

import { useEffect, useMemo, useState } from "react"
import { listForecastConfigs } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useProjectedNetIncomeYearTotals } from "@/hooks/use-projected-net-income-year-totals"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { useProjectedCmvYearTotals } from "@/hooks/use-projected-cmv-year-totals"
import { useCapexForecastForBilan } from "@/hooks/use-capex-forecast-for-bilan"
import { useDebtForecastForBilan } from "@/hooks/use-debt-forecast-for-bilan"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import {
  BILAN_FORECAST_CONFIG_TYPE,
  TAX_ASSET_LINK_CODE_ROOT,
  TAX_LIABILITY_LINK_CODE_ROOT,
  adjustmentAppliesToYear,
  dividendsFromBilanAdjustmentsMap,
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
  parseBilanAdjustments,
  resolveBilanAdjustedValue,
  resolveComptesClientsProjectedValue,
  resolveCrediteursProjectedValue,
  resolveOtherActProjectedValue,
  resolveRetainedEarningsProjectedValue,
  resolveStocksProjectedValue,
  resolveTaxExigibleProjectedValue,
  type BilanAdjustment,
} from "@/lib/bilan-forecast-utils"
import {
  forecastActualColumnCount,
  forecastBalanceSheetYearTrend,
  forecastDisplayToConfigYearIndex,
  forecastDisplayYearCount,
  isForecastProjectedDisplayColumn,
  resolveForecastActualLayout,
  type ForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import { findRow } from "@/lib/series-utils"
import {
  buildAttachedLinkCodesByCfCode,
  taxExigibleNetBalanceTrend,
} from "@/lib/pro-forma-cash-flow-inject"
import {
  sumCapexAdditionsForAssetRoot,
  uniqueCapexAssetRootFromAttachedCodes,
} from "@/lib/capex-forecast-resolve"
import { annualTaxPaidFromPriorExpense } from "@/lib/tax-forecast-utils"
import type { SeriesRow } from "@/lib/api"

/**
 * Données projetées pour injecter BN / add-backs IS / soldes Bilan dans le CF pro forma.
 */
export function useProFormaCashFlowProjected(opts: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  fiscalYear?: number
  refMonth: number
  fiscalYearEndMonth?: number
  divisionId?: string | null
  subDivisionId?: string | null
  forecastActualLayout?: ForecastActualLayout
  enabled?: boolean
  lastActualRevenue?: number
  /** Ajustements Bilan live (Hypothèses) — sinon chargement API. */
  bilanAdjustmentsOverride?: Record<string, BilanAdjustment[]> | null
}) {
  const {
    companyId,
    projectionId,
    projectionYears,
    fiscalYear,
    refMonth,
    fiscalYearEndMonth = 12,
    divisionId,
    subDivisionId,
    forecastActualLayout = "nMinusOne-and-ytd",
    enabled = true,
    lastActualRevenue = 0,
    bilanAdjustmentsOverride = null,
  } = opts

  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()
  const layoutEffective = resolveForecastActualLayout(forecastActualLayout, refMonth, fiscalYearEndMonth)
  const forecastActualCols = forecastActualColumnCount(layoutEffective)
  const displayYearCount = forecastDisplayYearCount(projectionYears, layoutEffective)

  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(false, undefined, enabled && !!companyId)
  const attachedByCfCode = useMemo(
    () => buildAttachedLinkCodesByCfCode(standardLinkCodes),
    [standardLinkCodes],
  )

  const {
    totals: netIncomeByConfigYear,
    taxExpenseTotals: projectedTaxExpenseYearTotals,
    lastActualTaxExpense,
    taxPaymentFrequency,
  } = useProjectedNetIncomeYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: effectiveFiscalYear,
    divisionId,
    subDivisionId,
    enabled: enabled && !!companyId,
    forecastActualLayout: layoutEffective,
    refMonth,
    fiscalYearEndMonth,
    lastActualRevenue,
  })

  const {
    resolveDepreciationExpense,
    peerRows: capexPeerRows,
    resolveProjectedAmount: resolveCapexBilan,
    adjustments: capexAdjustments,
    projectedRevenueYearTotals: capexProjectedRevenue,
  } =
    useCapexForecastForBilan({
      companyId,
      projectionId,
      projectionYears,
      fiscalYear: effectiveFiscalYear,
      divisionId,
      subDivisionId,
      enabled: enabled && !!companyId,
      forecastActualLayout: layoutEffective,
      refMonth,
      fiscalYearEndMonth,
    })

  const { resolveInterestExpense, resolveProjectedAmount: resolveFinancingBilan } = useDebtForecastForBilan({
    companyId,
    projectionId,
    enabled: enabled && !!companyId,
  })

  const { totals: projectedRevenueByConfigYear } = useProjectedRevenueYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: effectiveFiscalYear,
    divisionId,
    subDivisionId,
    enabled: enabled && !!companyId,
    forecastActualLayout: layoutEffective,
    refMonth,
    fiscalYearEndMonth,
  })

  const { totals: projectedCmvByConfigYear } = useProjectedCmvYearTotals({
    companyId,
    projectionId,
    projectionYears,
    fiscalYear: effectiveFiscalYear,
    divisionId,
    subDivisionId,
    enabled: enabled && !!companyId,
    forecastActualLayout: layoutEffective,
    refMonth,
    fiscalYearEndMonth,
    lastActualCmv: 0,
    lastActualRevenue,
  })

  const [loadedBilanAdjustments, setLoadedBilanAdjustments] = useState<
    Record<string, BilanAdjustment[]>
  >({})

  useEffect(() => {
    if (!enabled || !companyId || bilanAdjustmentsOverride != null) {
      if (!enabled || !companyId) setLoadedBilanAdjustments({})
      return
    }
    let cancelled = false
    listForecastConfigs(companyId, {
      config_type: BILAN_FORECAST_CONFIG_TYPE,
      projection_id: projectionId ?? undefined,
    })
      .then((configs) => {
        if (cancelled) return
        const data = configs[0]?.data as Record<string, unknown> | undefined
        setLoadedBilanAdjustments(parseBilanAdjustments(data?.adjustments))
      })
      .catch(() => {
        if (!cancelled) setLoadedBilanAdjustments({})
      })
    return () => {
      cancelled = true
    }
  }, [companyId, projectionId, enabled, bilanAdjustmentsOverride])

  const bilanAdjustments = bilanAdjustmentsOverride ?? loadedBilanAdjustments

  const { rows: bsRows, periods: bsPeriods } = useFinancialStatementSeries({
    companyId: companyId ?? null,
    statementType: "balance-sheet",
    fiscalYear: effectiveFiscalYear,
    month: refMonth,
    months: 72,
    divisionId: divisionId ?? undefined,
    subDivisionId: subDivisionId ?? undefined,
    enabled: enabled && !!companyId,
  })

  const periodNetIncomeByDisplayYear = useMemo(() => {
    return Array.from({ length: displayYearCount }, (_, displayYearIndex) => {
      const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
      if (cfg == null) return 0
      return netIncomeByConfigYear?.[cfg] ?? 0
    })
  }, [displayYearCount, forecastActualCols, netIncomeByConfigYear])

  const periodTaxExpenseByDisplayYear = useMemo(() => {
    return Array.from({ length: displayYearCount }, (_, displayYearIndex) => {
      if (displayYearIndex === 0) return lastActualTaxExpense
      const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
      if (cfg == null || cfg <= 0) return 0
      return projectedTaxExpenseYearTotals?.[cfg] ?? 0
    })
  }, [
    displayYearCount,
    forecastActualCols,
    lastActualTaxExpense,
    projectedTaxExpenseYearTotals,
  ])

  const periodTaxPaidByDisplayYear = useMemo(() => {
    return Array.from({ length: displayYearCount }, (_, displayYearIndex) => {
      if (!isForecastProjectedDisplayColumn(displayYearIndex, forecastActualCols)) return 0
      const priorTax =
        displayYearIndex === forecastActualCols
          ? (periodTaxExpenseByDisplayYear[0] ?? 0)
          : (periodTaxExpenseByDisplayYear[displayYearIndex - 1] ?? 0)
      return annualTaxPaidFromPriorExpense(priorTax, taxPaymentFrequency)
    })
  }, [
    displayYearCount,
    forecastActualCols,
    periodTaxExpenseByDisplayYear,
    taxPaymentFrequency,
  ])

  const findBsSeriesRow = (linkCode: string): SeriesRow | undefined => {
    const code = linkCode.trim().toUpperCase()
    if (!code) return undefined
    return (
      findRow(bsRows, code) ||
      bsRows.find((r) => String(r.linkCode ?? "").trim().toUpperCase() === code) ||
      bsRows.find((r) => String(r.id ?? "").trim().toUpperCase() === code)
    )
  }

  const getRevenueForDisplayYear = (displayYearIndex: number): number => {
    const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
    if (cfg == null) return 0
    return projectedRevenueByConfigYear?.[cfg] ?? 0
  }

  const getCmvForDisplayYear = (displayYearIndex: number): number => {
    const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
    if (cfg == null) return 0
    return projectedCmvByConfigYear?.[cfg] ?? 0
  }

  /** Solde bilan pro forma (snapshot) pour un code, par index d’affichage. */
  const bsTrendForLinkCode = (linkCode: string): number[] => {
    const row = findBsSeriesRow(linkCode)
    if (!row || !bsPeriods.length) {
      return Array.from({ length: displayYearCount }, () => 0)
    }
    return forecastBalanceSheetYearTrend(
      layoutEffective,
      row,
      bsPeriods,
      refMonth,
      effectiveFiscalYear,
      fiscalYearEndMonth,
      projectionYears,
    )
  }

  /** Solde bilan pro forma (snapshot) pour un code, par index d’affichage. */
  const resolveBilanBalanceByLinkCode = (linkCode: string, displayYearIndex: number): number => {
    const row = findBsSeriesRow(linkCode)
    if (!row || !bsPeriods.length) {
      // Impôts : résoudre quand même via moteur (soldes d’ouverture 0).
      if (isTaxDrivenBilanRow({ linkCode })) {
        const side = isTaxAssetBilanRow({ linkCode }) ? "asset" : "liability"
        return resolveTaxExigibleProjectedValue({
          side,
          yearIndex: displayYearIndex,
          forecastActualCols,
          taxExpenseByDisplayYear: periodTaxExpenseByDisplayYear,
          taxPaidByDisplayYear: periodTaxPaidByDisplayYear,
          assetBaseTrend: bsTrendForLinkCode(TAX_ASSET_LINK_CODE_ROOT),
          liabilityBaseTrend: bsTrendForLinkCode(TAX_LIABILITY_LINK_CODE_ROOT),
        })
      }
      return 0
    }
    const trend = forecastBalanceSheetYearTrend(
      layoutEffective,
      row,
      bsPeriods,
      refMonth,
      effectiveFiscalYear,
      fiscalYearEndMonth,
      projectionYears,
    )
    if (!isForecastProjectedDisplayColumn(displayYearIndex, forecastActualCols)) {
      return trend[displayYearIndex] ?? 0
    }

    const rowId = String(row.id ?? linkCode)
    const label = String(row.label ?? "")
    const adjustments = bilanAdjustments[rowId] ?? bilanAdjustments[linkCode] ?? []

    if (isTreasuryEndingCashDrivenBilanRow({ rowId, linkCode, label })) {
      return trend[displayYearIndex] ?? 0
    }
    if (isCapexDrivenBilanRow({ rowId, linkCode })) {
      const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
      if (cfg == null) return trend[displayYearIndex] ?? 0
      return resolveCapexBilan(
        rowId,
        linkCode,
        cfg,
        trend[Math.max(0, forecastActualCols - 1)] ?? trend[0] ?? 0,
        capexPeerRows,
        { label },
      )
    }
    if (isFinancingDrivenBilanRow({ rowId, linkCode })) {
      const cfg = forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
      if (cfg == null) return trend[displayYearIndex] ?? 0
      return resolveFinancingBilan(
        rowId,
        linkCode,
        cfg,
        trend[Math.max(0, forecastActualCols - 1)] ?? trend[0] ?? 0,
      )
    }
    if (isTaxDrivenBilanRow({ rowId, linkCode, label })) {
      const side = isTaxAssetBilanRow({ rowId, linkCode, label }) ? "asset" : "liability"
      const assetTrend = bsTrendForLinkCode(TAX_ASSET_LINK_CODE_ROOT)
      const liabilityTrend = bsTrendForLinkCode(TAX_LIABILITY_LINK_CODE_ROOT)
      return resolveTaxExigibleProjectedValue({
        side,
        yearIndex: displayYearIndex,
        forecastActualCols,
        taxExpenseByDisplayYear: periodTaxExpenseByDisplayYear,
        taxPaidByDisplayYear: periodTaxPaidByDisplayYear,
        assetBaseTrend: side === "asset" && trend.length > 0 ? trend : assetTrend,
        liabilityBaseTrend: side === "liability" && trend.length > 0 ? trend : liabilityTrend,
      })
    }
    if (isRetainedEarningsBilanRow({ rowId, linkCode, label })) {
      return resolveRetainedEarningsProjectedValue({
        baseTrend: trend,
        yearIndex: displayYearIndex,
        adjustments,
        periodNetIncomeByDisplayYear,
        forecastActualCols,
      })
    }
    if (isComptesClientsBilanRow({ rowId, linkCode, label })) {
      return resolveComptesClientsProjectedValue(
        trend,
        displayYearIndex,
        adjustments,
        getRevenueForDisplayYear(displayYearIndex),
      )
    }
    if (isStocksBilanRow({ rowId, linkCode, label })) {
      return resolveStocksProjectedValue(
        trend,
        displayYearIndex,
        adjustments,
        getCmvForDisplayYear(displayYearIndex),
        getRevenueForDisplayYear(displayYearIndex),
      )
    }
    if (isCrediteursLikeBilanRow({ rowId, linkCode, label })) {
      return resolveCrediteursProjectedValue(
        trend,
        displayYearIndex,
        adjustments,
        getCmvForDisplayYear(displayYearIndex),
        getRevenueForDisplayYear(displayYearIndex),
      )
    }
    if (isRevenuePercentAdjustableBilanRow({ rowId, linkCode, label })) {
      return resolveOtherActProjectedValue(
        trend,
        displayYearIndex,
        adjustments,
        getRevenueForDisplayYear(displayYearIndex),
      )
    }
    return resolveBilanAdjustedValue(trend, displayYearIndex, adjustments)
  }

  const linkCodeHasExplicitProjection = (linkCode: string, displayYearIndex: number): boolean => {
    if (!isForecastProjectedDisplayColumn(displayYearIndex, forecastActualCols)) return false
    const row = findBsSeriesRow(linkCode)
    const rowId = String(row?.id ?? linkCode)
    const label = String(row?.label ?? "")
    const adjustments = bilanAdjustments[rowId] ?? bilanAdjustments[linkCode] ?? []
    if (adjustments.some((adj) => adjustmentAppliesToYear(adj, displayYearIndex))) return true
    // Moteurs externes : toujours une projection explicite (même à 0 $).
    if (isCapexDrivenBilanRow({ rowId, linkCode })) return true
    if (isFinancingDrivenBilanRow({ rowId, linkCode })) return true
    if (isTaxDrivenBilanRow({ rowId, linkCode, label })) return true
    if (isRetainedEarningsBilanRow({ rowId, linkCode, label })) return true
    if (isTreasuryEndingCashDrivenBilanRow({ rowId, linkCode, label })) return true
    // Drivers AR/stocks/AP / % revenus : explicite seulement s’il y a un ajustement (ci-dessus).
    return false
  }

  const attachedCodesHaveExplicitProjection = (attachedLinkCodes: string[]): boolean[] => {
    return Array.from({ length: displayYearCount }, (_, i) =>
      attachedLinkCodes.some((code) => linkCodeHasExplicitProjection(code, i)),
    )
  }

  const attachedCodesIncludeTaxExigible = (attachedLinkCodes: string[]): boolean =>
    attachedLinkCodes.some(
      (code) =>
        isTaxDrivenBilanRow({ linkCode: code }) ||
        isTaxAssetBilanRow({ linkCode: code }) ||
        isTaxLiabilityBilanRow({ linkCode: code }),
    )

  const sumBilanBalancesForAttachedCodes = (
    attachedLinkCodes: string[],
    displayYearIndex: number,
  ): number => {
    return attachedLinkCodes.reduce(
      (sum, code) => sum + resolveBilanBalanceByLinkCode(code, displayYearIndex),
      0,
    )
  }

  /**
   * Soldes bruts (sans report) — appliquer `carryForward…` après merge série N-1/YTD.
   * Impôts exigibles : toujours Passif − Actif (ACT-H + PCT-FF), même si un seul code est attaché.
   */
  const bilanBalanceTrendForAttachedCodes = (attachedLinkCodes: string[]): number[] => {
    if (attachedCodesIncludeTaxExigible(attachedLinkCodes)) {
      const asset = Array.from({ length: displayYearCount }, (_, i) =>
        resolveBilanBalanceByLinkCode(TAX_ASSET_LINK_CODE_ROOT, i),
      )
      const liability = Array.from({ length: displayYearCount }, (_, i) =>
        resolveBilanBalanceByLinkCode(TAX_LIABILITY_LINK_CODE_ROOT, i),
      )
      return taxExigibleNetBalanceTrend({ assetBalances: asset, liabilityBalances: liability })
    }
    return Array.from({ length: displayYearCount }, (_, i) =>
      sumBilanBalancesForAttachedCodes(attachedLinkCodes, i),
    )
  }

  const capexAssetRootForAttachedCodes = (attachedLinkCodes: string[]) =>
    uniqueCapexAssetRootFromAttachedCodes(attachedLinkCodes)

  /** Ajouts Capex (config year → montant) pour la famille attachée ; null si pas Capex. */
  const capexAdditionsByConfigYearForAttachedCodes = (
    attachedLinkCodes: string[],
  ): number[] | null => {
    const root = uniqueCapexAssetRootFromAttachedCodes(attachedLinkCodes)
    if (!root) return null
    return Array.from({ length: projectionYears + 1 }, (_, cfg) =>
      sumCapexAdditionsForAssetRoot({
        root,
        configYearIndex: cfg,
        peerRows: capexPeerRows,
        adjustments: capexAdjustments,
        projectedRevenueYearTotals: capexProjectedRevenue,
      }),
    )
  }

  const dividendsForDisplayYear = (displayYearIndex: number): number =>
    dividendsFromBilanAdjustmentsMap(
      bilanAdjustments,
      displayYearIndex,
      forecastActualCols,
    )

  return {
    forecastActualCols,
    displayYearCount,
    attachedByCfCode,
    netIncomeByConfigYear,
    resolveDepreciationExpense,
    resolveInterestExpense,
    resolveBilanBalanceByLinkCode,
    bilanBalanceTrendForAttachedCodes,
    attachedCodesHaveExplicitProjection,
    attachedCodesIncludeTaxExigible,
    capexAssetRootForAttachedCodes,
    capexAdditionsByConfigYearForAttachedCodes,
    dividendsForDisplayYear,
  }
}
