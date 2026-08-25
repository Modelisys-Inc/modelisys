import { useEffect, useMemo, useState } from "react"
import { listForecastConfigs } from "@/lib/api"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import {
  forecastActualColumnCount,
  forecastBalanceSheetYearTrend,
  resolveForecastActualLayout,
} from "@/lib/pro-forma-forecast-columns"
import {
  CAPEX_FORECAST_CONFIG_TYPE,
  parseCapexForecastConfig,
  resolveCapexDrivenBilanProjectedAmount,
  type CapexAdjustment,
  type CapexBilanPeerRow,
  type CapexDepreciationMethod,
} from "@/lib/capex-forecast-resolve"

export function useCapexForecastForBilan(opts: {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  fiscalYear?: number
  divisionId?: string | null
  subDivisionId?: string | null
  enabled?: boolean
  forecastActualLayout?: ForecastActualLayout
  refMonth?: number
  fiscalYearEndMonth?: number
}): {
  adjustments: Record<string, CapexAdjustment[]>
  depreciationRates: Record<string, number>
  depreciationMethods: Record<string, CapexDepreciationMethod>
  costByRowId: Record<string, number>
  projectedRevenueYearTotals: number[] | null
  configYearCount: number
  resolveProjectedAmount: (
    rowId: string,
    linkCode: string | null | undefined,
    configYearIndex: number,
    actualBase: number,
    peerRows: CapexBilanPeerRow[],
    opts?: { actualCostBase?: number; label?: string },
  ) => number
  loading: boolean
} {
  const {
    companyId,
    projectionId,
    projectionYears,
    fiscalYear,
    divisionId,
    subDivisionId,
    enabled = true,
    forecastActualLayout = "single-prior-year",
    refMonth,
    fiscalYearEndMonth = 12,
  } = opts

  const [adjustments, setAdjustments] = useState<Record<string, CapexAdjustment[]>>({})
  const [depreciationRates, setDepreciationRates] = useState<Record<string, number>>({})
  const [depreciationMethods, setDepreciationMethods] = useState<
    Record<string, CapexDepreciationMethod>
  >({})
  const [configLoading, setConfigLoading] = useState(false)

  const { totals: projectedRevenueYearTotals, loading: revenueLoading } =
    useProjectedRevenueYearTotals({
      companyId,
      projectionId,
      projectionYears,
      fiscalYear,
      divisionId,
      subDivisionId,
      enabled,
      forecastActualLayout,
      refMonth,
      fiscalYearEndMonth,
    })

  const effectiveRefMonth = refMonth ?? 12
  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()

  const { rows: costRows, periods: costPeriods, loading: costLoading } =
    useFinancialStatementSeries({
      companyId: companyId || null,
      statementType: "balance-sheet",
      fiscalYear: effectiveFiscalYear,
      month: effectiveRefMonth,
      months: 72,
      divisionId: divisionId || null,
      subDivisionId: subDivisionId || null,
      enabled: enabled && !!companyId,
      altAssetCostOnly: true,
    })

  const forecastActualLayoutEffective = resolveForecastActualLayout(
    forecastActualLayout,
    effectiveRefMonth,
    fiscalYearEndMonth,
  )
  const forecastActualCols = forecastActualColumnCount(forecastActualLayoutEffective)

  const costByRowId = useMemo(() => {
    const out: Record<string, number> = {}
    if (!costRows.length || !costPeriods.length) return out
    for (const row of costRows) {
      const trend = forecastBalanceSheetYearTrend(
        forecastActualLayoutEffective,
        row,
        costPeriods,
        effectiveRefMonth,
        effectiveFiscalYear,
        fiscalYearEndMonth,
        projectionYears,
      )
      const opening = trend[Math.max(0, forecastActualCols - 1)] ?? trend[0] ?? 0
      if (row.id) out[row.id] = opening
      // Also index by amounts keys? link codes often match id.
    }
    return out
  }, [
    costPeriods,
    costRows,
    effectiveFiscalYear,
    effectiveRefMonth,
    fiscalYearEndMonth,
    forecastActualCols,
    forecastActualLayoutEffective,
    projectionYears,
  ])

  useEffect(() => {
    if (!enabled || !companyId) {
      setAdjustments({})
      setDepreciationRates({})
      setDepreciationMethods({})
      setConfigLoading(false)
      return
    }
    let cancelled = false
    setConfigLoading(true)
    listForecastConfigs(companyId, {
      config_type: CAPEX_FORECAST_CONFIG_TYPE,
      projection_id: projectionId ?? undefined,
    })
      .then((cfgs) => {
        if (cancelled) return
        const parsed = parseCapexForecastConfig(cfgs[0]?.data ?? {})
        setAdjustments(parsed.capexAdjustments)
        setDepreciationRates(parsed.depreciationRates)
        setDepreciationMethods(parsed.depreciationMethods)
      })
      .catch(() => {
        if (!cancelled) {
          setAdjustments({})
          setDepreciationRates({})
          setDepreciationMethods({})
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, enabled, projectionId])

  const configYearCount = projectionYears + 1

  const resolveProjectedAmount = useMemo(() => {
    return (
      rowId: string,
      linkCode: string | null | undefined,
      configYearIndex: number,
      actualBase: number,
      peerRows: CapexBilanPeerRow[],
      resolveOpts?: { actualCostBase?: number; label?: string },
    ) => {
      const peersWithCost = peerRows.map((p) => ({
        ...p,
        actualCostBase: p.actualCostBase ?? costByRowId[p.rowId] ?? p.actualBase,
      }))
      return resolveCapexDrivenBilanProjectedAmount({
        rowId,
        linkCode,
        configYearIndex,
        configYearCount,
        actualBase,
        actualCostBase:
          resolveOpts?.actualCostBase ?? costByRowId[rowId] ?? actualBase,
        label: resolveOpts?.label,
        adjustments,
        depreciationRates,
        depreciationMethods,
        projectedRevenueYearTotals,
        peerRows: peersWithCost,
      })
    }
  }, [
    adjustments,
    configYearCount,
    costByRowId,
    depreciationMethods,
    depreciationRates,
    projectedRevenueYearTotals,
  ])

  return {
    adjustments,
    depreciationRates,
    depreciationMethods,
    costByRowId,
    projectedRevenueYearTotals,
    configYearCount,
    resolveProjectedAmount,
    loading: configLoading || revenueLoading || costLoading,
  }
}
