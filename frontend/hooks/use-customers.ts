"use client"

import { useState, useEffect, useCallback } from "react"
import { listCustomers, type CustomerData } from "@/lib/api"

export function useCustomers(companyId: string | null) {
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    if (!companyId) {
      setCustomers([])
      return
    }
    setLoading(true)
    listCustomers(companyId)
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { customers, loading, refresh }
}
