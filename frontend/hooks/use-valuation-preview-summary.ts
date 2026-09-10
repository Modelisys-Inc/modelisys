"use client"

import { useEffect, useState } from "react"
import {
  emptyValuationPreviewSummary,
  fetchValuationPreviewSummary,
  type ValuationPreviewSummary,
} from "@/lib/valuation-preview-summary"

export function useValuationPreviewSummary(
  companyId: string | null | undefined,
  reference?: { month: number; year: number } | null,
) {
  const [summary, setSummary] = useState<ValuationPreviewSummary>(() =>
    emptyValuationPreviewSummary(companyId ?? ""),
  )
  const [loading, setLoading] = useState(false)
  const refMonth = reference?.month ?? null
  const refYear = reference?.year ?? null

  useEffect(() => {
    if (!companyId) {
      setSummary(emptyValuationPreviewSummary())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const ref =
      refMonth != null && refYear != null ? { month: refMonth, year: refYear } : null
    fetchValuationPreviewSummary(companyId, ref)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch(() => {
        if (!cancelled) setSummary(emptyValuationPreviewSummary(companyId))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [companyId, refMonth, refYear])

  return { summary, loading }
}
