import { useMemo } from "react"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import {
  computeProjectedNetIncomeYearTotals,
  findNetIncomeSeriesRow,
  lastActualAnnualAmount,
} from "@/lib/projected-net-income-year-totals"

export function useProjectedNetIncomeYearTotals(opts: {
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
  lastActualRevenue: number
}): { totals: number[] | null; lastActualNetIncome: number; loading: boolean } {
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
    lastActualRevenue,
  } = opts

  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()

  const { rows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId ?? null,
    statementType: "income-statement",
    fiscalYear: effectiveFiscalYear,
    divisionId: divisionId ?? undefined,
    subDivisionId: subDivisionId ?? undefined,
    enabled: enabled && !!companyId,
    months: 12,
  })

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

  const lastActualNetIncome = useMemo(
    () => lastActualAnnualAmount(findNetIncomeSeriesRow(rows), periods),
    [rows, periods],
  )

  const totals = useMemo(() => {
    if (!enabled || !companyId) return null
    return computeProjectedNetIncomeYearTotals({
      projectionYears,
      lastActualNetIncome,
      lastActualRevenue,
      projectedRevenueYearTotals,
    })
  }, [
    companyId,
    enabled,
    lastActualNetIncome,
    lastActualRevenue,
    projectedRevenueYearTotals,
    projectionYears,
  ])

  return {
    totals,
    lastActualNetIncome,
    loading: seriesLoading || revenueLoading,
  }
}
