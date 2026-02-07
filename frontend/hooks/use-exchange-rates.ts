"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getExchangeRates,
  upsertExchangeRates,
  type ExchangeRateData,
} from "@/lib/api"

export function useExchangeRates(companyId: string | null, fiscalYear?: number) {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!companyId) {
      setExchangeRates([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getExchangeRates(companyId, fiscalYear)
      setExchangeRates(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load exchange rates"
      setError(message)
      setExchangeRates([])
    } finally {
      setLoading(false)
    }
  }, [companyId, fiscalYear])

  useEffect(() => {
    reload()
  }, [reload])

  const save = useCallback(
    async (
      rates: Array<{
        currency: string
        fiscal_year?: number | null
        monthly_rates: Record<string, number>
        notes?: Record<string, string>
      }>
    ) => {
      if (!companyId) return
      try {
        const updated = await upsertExchangeRates(companyId, rates)
        setExchangeRates(updated)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save exchange rates"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  return { exchangeRates, loading, error, reload, save }
}
