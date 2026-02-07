"use client"

import { useState, useEffect } from "react"
import {
  getFinancialStatementSeries,
  type FinancialStatementSeriesResponse,
  type SeriesRow,
  type SeriesPeriod,
} from "@/lib/api"

interface UseFinancialStatementSeriesParams {
  companyId: string | null
  statementType: "income-statement" | "balance-sheet" | "cash-flow"
  fiscalYear: number
  months?: number
  divisionId?: string | null
  subDivisionId?: string | null
  enabled?: boolean  // skip fetch when false
}

interface UseFinancialStatementSeriesReturn {
  data: FinancialStatementSeriesResponse | null
  rows: SeriesRow[]
  periods: SeriesPeriod[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useFinancialStatementSeries({
  companyId,
  statementType,
  fiscalYear,
  months = 12,
  divisionId,
  subDivisionId,
  enabled = true,
}: UseFinancialStatementSeriesParams): UseFinancialStatementSeriesReturn {
  const [data, setData] = useState<FinancialStatementSeriesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    if (!companyId || !enabled) {
      setData(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getFinancialStatementSeries(companyId, statementType, {
      fiscal_year: fiscalYear,
      months,
      division_id: divisionId || undefined,
      sub_division_id: subDivisionId || undefined,
    })
      .then((response) => {
        if (!cancelled) {
          setData(response)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to fetch series data")
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [companyId, statementType, fiscalYear, months, divisionId, subDivisionId, enabled, reloadCounter])

  return {
    data,
    rows: data?.rows || [],
    periods: data?.periods || [],
    loading,
    error,
    reload: () => setReloadCounter((c) => c + 1),
  }
}
