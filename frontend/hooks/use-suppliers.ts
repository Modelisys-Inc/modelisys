"use client"

import { useState, useEffect, useCallback } from "react"
import { listSuppliers, type SupplierData } from "@/lib/api"

export function useSuppliers(companyId: string | null) {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(() => {
    if (!companyId) {
      setSuppliers([])
      return
    }
    setLoading(true)
    listSuppliers(companyId)
      .then(setSuppliers)
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { suppliers, loading, refresh }
}
