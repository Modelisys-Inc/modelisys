"use client"

import { useEffect, useMemo, useState } from "react"
import { getStatementStructure, listForecastConfigs } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import {
  computeProjectedExpenseHypothesisYearTotalsFromSeries,
  parseExpenseForecastConfig,
} from "@/lib/projected-cmv-year-totals"
import { syncDetailSubLinesFromStandard } from "@/lib/income-statement-structure-utils"

/** Totaux Hypothèses Dépenses (toutes annexes) par index config (0 = réel, 1+ = projeté). */
export function useProjectedExpenseHypothesisYearTotals(opts: {
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
}): { totals: number[] | null; loading: boolean } {
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

  const [expenseConfig, setExpenseConfig] = useState(() => parseExpenseForecastConfig({}))
  const [structure, setStructure] = useState<Record<string, unknown>[] | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(
    false,
    undefined,
    !!companyId && enabled,
  )

  const displayStructure = useMemo(() => {
    if (structure === null) return null
    if (standardLinkCodes.length === 0) return structure
    return syncDetailSubLinesFromStandard(structure, standardLinkCodes)
  }, [structure, standardLinkCodes])

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
      setExpenseConfig(parseExpenseForecastConfig({}))
      setStructure(null)
      setConfigLoading(false)
      return
    }
    let cancelled = false
    setConfigLoading(true)
    Promise.all([
      listForecastConfigs(companyId, {
        config_type: "income-statement-detail",
        projection_id: projectionId ?? undefined,
      }),
      getStatementStructure(companyId, "income-statement"),
    ])
      .then(([cfgs, structRes]) => {
        if (cancelled) return
        const data = (cfgs[0]?.data ?? {}) as Record<string, unknown>
        setExpenseConfig(parseExpenseForecastConfig(data))
        setStructure(Array.isArray(structRes.structure) ? structRes.structure : [])
      })
      .catch(() => {
        if (!cancelled) {
          setExpenseConfig(parseExpenseForecastConfig({}))
          setStructure([])
        }
      })
      .finally(() => {
        if (!cancelled) setConfigLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, projectionId, enabled])

  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()
  const effectiveRefMonth = refMonth ?? 12
  const { rows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: effectiveFiscalYear,
    month: effectiveRefMonth,
    months: 72,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: enabled && !!companyId && displayStructure !== null,
  })

  const totals = useMemo(() => {
    if (!displayStructure) return null
    return computeProjectedExpenseHypothesisYearTotalsFromSeries(
      rows,
      periods,
      displayStructure,
      projectionYears,
      expenseConfig,
      projectedRevenueYearTotals,
      {
        forecastActualLayout,
        refMonth: effectiveRefMonth,
        refYear: effectiveFiscalYear,
        fiscalYearEndMonth,
      },
    )
  }, [
    displayStructure,
    rows,
    periods,
    projectionYears,
    expenseConfig,
    projectedRevenueYearTotals,
    forecastActualLayout,
    effectiveRefMonth,
    effectiveFiscalYear,
    fiscalYearEndMonth,
  ])

  return {
    totals,
    loading: configLoading || seriesLoading || revenueLoading,
  }
}
