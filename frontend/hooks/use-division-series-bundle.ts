"use client"

import { useEffect, useState } from "react"
import type { Division } from "@/components/entity-selector"
import {
  getFinancialStatementSeries,
  type SeriesPeriod,
  type SeriesRow,
} from "@/lib/api"
import type { DivisionSeriesBundle } from "@/lib/division-contributive-margin"

interface UseDivisionSeriesBundleParams {
  companyId: string | null
  divisions: Division[]
  fiscalYear: number
  month?: number
  months?: number
  enabled?: boolean
  structureVersion?: number
  statementType?: "income-statement" | "balance-sheet"
}

interface UseDivisionSeriesBundleReturn {
  bundles: DivisionSeriesBundle[]
  loading: boolean
  error: string | null
}

export function useDivisionSeriesBundle({
  companyId,
  divisions,
  fiscalYear,
  month,
  months = 12,
  enabled = true,
  structureVersion = 0,
  statementType = "income-statement",
}: UseDivisionSeriesBundleParams): UseDivisionSeriesBundleReturn {
  const [bundles, setBundles] = useState<DivisionSeriesBundle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !companyId || !divisions.length) {
      setBundles([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all(
      divisions.map(async (division) => {
        const response = await getFinancialStatementSeries(companyId, statementType, {
          fiscal_year: fiscalYear,
          month,
          months,
          division_id: division.id,
          structure_rev: structureVersion > 0 ? structureVersion : undefined,
        })
        return {
          divisionId: division.id,
          rows: response.rows as SeriesRow[],
          periods: response.periods as SeriesPeriod[],
        }
      }),
    )
      .then((results) => {
        if (!cancelled) setBundles(results)
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Failed to fetch division series")
          setBundles([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [companyId, divisions, fiscalYear, month, months, enabled, structureVersion, statementType])

  return { bundles, loading, error }
}
