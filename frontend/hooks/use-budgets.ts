"use client"

import { useState, useEffect, useCallback } from "react"
import {
  listBudgets,
  createBudget,
  deleteBudget,
  type BudgetData,
} from "@/lib/api"

export function useBudgets(companyId: string | null) {
  const [budgets, setBudgets] = useState<BudgetData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!companyId) {
      setBudgets([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await listBudgets(companyId)
      setBudgets(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load budgets"
      setError(message)
      setBudgets([])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (budget: { name: string; fiscal_year: number }) => {
      if (!companyId) return
      try {
        const created = await createBudget(companyId, budget)
        setBudgets((prev) => [...prev, created])
        return created
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create budget"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  const remove = useCallback(
    async (budgetId: string) => {
      if (!companyId) return
      try {
        await deleteBudget(companyId, budgetId)
        setBudgets((prev) => prev.filter((b) => b.id !== budgetId))
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete budget"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  return { budgets, loading, error, reload, add, remove }
}
