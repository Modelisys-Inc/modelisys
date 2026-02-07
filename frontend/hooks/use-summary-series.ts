"use client"

import { useState, useEffect } from "react"
import {
  getFinancialStatementSummarySeries,
  type SummarySeriesResponse,
  type SummarySeriesMonth,
} from "@/lib/api"

interface UseSummarySeriesParams {
  companyId: string | null
  fiscalYear: number
  enabled?: boolean
}

interface UseSummarySeriesReturn {
  data: SummarySeriesResponse | null
  months: SummarySeriesMonth[]
  loading: boolean
  error: string | null
}

export function useSummarySeries({
  companyId,
  fiscalYear,
  enabled = true,
}: UseSummarySeriesParams): UseSummarySeriesReturn {
  const [data, setData] = useState<SummarySeriesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!companyId || !enabled) {
      setData(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getFinancialStatementSummarySeries(companyId, fiscalYear)
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to fetch summary series")
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [companyId, fiscalYear, enabled])

  return {
    data,
    months: data?.months || [],
    loading,
    error,
  }
}
