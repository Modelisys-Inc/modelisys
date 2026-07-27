"use client"

import { useState, useEffect } from "react"
import { getCompanyDiagnostic, type CompanyDiagnostic } from "@/lib/api"

interface UseCompanyDiagnosticReturn {
  data: CompanyDiagnostic | null
  loading: boolean
  error: string | null
  reload: () => void
}

/** Charge le diagnostic complet d'une société (GET /api/companies/{id}/diagnostic). */
export function useCompanyDiagnostic(
  companyId: string | null
): UseCompanyDiagnosticReturn {
  const [data, setData] = useState<CompanyDiagnostic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadCounter, setReloadCounter] = useState(0)

  useEffect(() => {
    if (!companyId) {
      setData(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getCompanyDiagnostic(companyId)
      .then((response) => {
        if (!cancelled) setData(response)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Impossible de charger le diagnostic")
          setData(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [companyId, reloadCounter])

  return {
    data,
    loading,
    error,
    reload: () => setReloadCounter((c) => c + 1),
  }
}
