import { useEffect, useMemo, useState } from "react"
import { getStatementStructure, listForecastConfigs } from "@/lib/api"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { useProjectedRevenueYearTotals } from "@/hooks/use-projected-revenue-year-totals"
import { useStandardLinkCodesFlat } from "@/hooks/use-standard-link-codes"
import { useCapexForecastForBilan } from "@/hooks/use-capex-forecast-for-bilan"
import { useDebtForecastForBilan } from "@/hooks/use-debt-forecast-for-bilan"
import type { ForecastActualLayout } from "@/lib/pro-forma-forecast-columns"
import {
  CAPEX_CORPORELLES_AMORT_IS_LINK_CODES,
  CAPEX_INCORPORELS_AMORT_IS_LINK_CODES,
} from "@/lib/capex-forecast-resolve"
import { DEBT_DRIVEN_INTEREST_IS_LINK_CODES } from "@/lib/debt-forecast-resolve"
import {
  computeProjectedExpenseHypothesisYearTotalsFromSeries,
  parseExpenseForecastConfig,
  prepareCmvDisplayStructure,
} from "@/lib/projected-cmv-year-totals"
import {
  computeProjectedNetIncomeYearTotals,
  findNetIncomeSeriesRow,
  lastActualAnnualAmount,
} from "@/lib/projected-net-income-year-totals"
import { DEFAULT_TAX_RATE, parseTaxForecastData, TAX_FORECAST_CONFIG_TYPE } from "@/lib/tax-forecast-utils"

const CAPEX_AMORT_IS_CODES = [
  ...CAPEX_CORPORELLES_AMORT_IS_LINK_CODES,
  ...CAPEX_INCORPORELS_AMORT_IS_LINK_CODES,
] as const

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
  } = opts

  const effectiveFiscalYear = fiscalYear ?? new Date().getFullYear()
  const effectiveRefMonth = refMonth ?? 12

  const [expenseConfig, setExpenseConfig] = useState(() => parseExpenseForecastConfig({}))
  const [structure, setStructure] = useState<Record<string, unknown>[] | null>(null)
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE)
  const [configLoading, setConfigLoading] = useState(false)

  const { codes: standardLinkCodes } = useStandardLinkCodesFlat(
    false,
    undefined,
    !!companyId && enabled,
  )

  const displayStructure = useMemo(
    () => prepareCmvDisplayStructure(structure, standardLinkCodes),
    [structure, standardLinkCodes],
  )

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

  const { resolveDepreciationExpense, loading: capexLoading } = useCapexForecastForBilan({
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

  const { resolveInterestExpense, loading: debtLoading } = useDebtForecastForBilan({
    companyId,
    projectionId,
    enabled,
  })

  useEffect(() => {
    if (!enabled || !companyId) {
      setExpenseConfig(parseExpenseForecastConfig({}))
      setStructure(null)
      setTaxRate(DEFAULT_TAX_RATE)
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
      listForecastConfigs(companyId, {
        config_type: TAX_FORECAST_CONFIG_TYPE,
        projection_id: projectionId ?? undefined,
      }),
      getStatementStructure(companyId, "income-statement"),
    ])
      .then(([expenseCfgs, taxCfgs, structRes]) => {
        if (cancelled) return
        setExpenseConfig(parseExpenseForecastConfig((expenseCfgs[0]?.data ?? {}) as Record<string, unknown>))
        setTaxRate(parseTaxForecastData(taxCfgs[0]?.data ?? {}).taxRate)
        setStructure(Array.isArray(structRes.structure) ? structRes.structure : [])
      })
      .catch(() => {
        if (!cancelled) {
          setExpenseConfig(parseExpenseForecastConfig({}))
          setTaxRate(DEFAULT_TAX_RATE)
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

  const { rows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId ?? null,
    statementType: "income-statement",
    fiscalYear: effectiveFiscalYear,
    month: effectiveRefMonth,
    months: 72,
    divisionId: divisionId ?? undefined,
    subDivisionId: subDivisionId ?? undefined,
    enabled: enabled && !!companyId && displayStructure !== null,
  })

  const lastActualNetIncome = useMemo(
    () => lastActualAnnualAmount(findNetIncomeSeriesRow(rows), periods),
    [rows, periods],
  )

  const projectedExpenseHypothesisYearTotals = useMemo(() => {
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

  const projectedAmortizationYearTotals = useMemo(() => {
    const numYears = projectionYears + 1
    return Array.from({ length: numYears }, (_, yearIndex) => {
      if (yearIndex <= 0) return 0
      return CAPEX_AMORT_IS_CODES.reduce(
        (sum, code) => sum + resolveDepreciationExpense(code, yearIndex),
        0,
      )
    })
  }, [projectionYears, resolveDepreciationExpense])

  const projectedInterestYearTotals = useMemo(() => {
    const numYears = projectionYears + 1
    return Array.from({ length: numYears }, (_, yearIndex) => {
      if (yearIndex <= 0) return 0
      return DEBT_DRIVEN_INTEREST_IS_LINK_CODES.reduce(
        (sum, code) => sum + resolveInterestExpense(code, yearIndex),
        0,
      )
    })
  }, [projectionYears, resolveInterestExpense])

  const totals = useMemo(() => {
    if (!enabled || !companyId || projectedExpenseHypothesisYearTotals == null) return null
    return computeProjectedNetIncomeYearTotals({
      projectionYears,
      lastActualNetIncome,
      projectedRevenueYearTotals,
      projectedExpenseHypothesisYearTotals,
      projectedAmortizationYearTotals,
      projectedInterestYearTotals,
      taxRate,
    })
  }, [
    companyId,
    enabled,
    lastActualNetIncome,
    projectedAmortizationYearTotals,
    projectedExpenseHypothesisYearTotals,
    projectedInterestYearTotals,
    projectedRevenueYearTotals,
    projectionYears,
    taxRate,
  ])

  return {
    totals,
    lastActualNetIncome,
    loading:
      configLoading || seriesLoading || revenueLoading || capexLoading || debtLoading,
  }
}
