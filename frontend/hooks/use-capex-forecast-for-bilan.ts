import { useEffect, useMemo, useState } from "react"
import { listForecastConfigs } from "@/lib/api"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import {
  CAPEX_FORECAST_CONFIG_TYPE,
  parseCapexForecastConfig,
  resolveCapexDrivenBilanProjectedAmount,
  type CapexAdjustment,
  type CapexBilanPeerRow,
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
  projectedRevenueYearTotals: number[] | null
  configYearCount: number
  resolveProjectedAmount: (
    rowId: string,
    linkCode: string | null | undefined,
    configYearIndex: number,
    actualBase: number,
    peerRows: CapexBilanPeerRow[],
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

  useEffect(() => {
    if (!enabled || !companyId) {
      setAdjustments({})
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
        setAdjustments(parseCapexForecastConfig(cfgs[0]?.data ?? {}).capexAdjustments)
      })
      .catch(() => {
        if (!cancelled) setAdjustments({})
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
    ) =>
      resolveCapexDrivenBilanProjectedAmount({
        rowId,
        linkCode,
        configYearIndex,
        configYearCount,
        actualBase,
        adjustments,
        projectedRevenueYearTotals,
        peerRows,
      })
  }, [adjustments, configYearCount, projectedRevenueYearTotals])

  return {
    adjustments,
    projectedRevenueYearTotals,
    configYearCount,
    resolveProjectedAmount,
    loading: configLoading || revenueLoading,
  }
}
