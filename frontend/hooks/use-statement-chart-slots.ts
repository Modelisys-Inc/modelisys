"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addStatementChartSlot,
  listStatementChartSlots,
  removeStatementChartSlot,
} from "@/lib/api"
import type { ChartSlot, StatementType } from "@/lib/statement-chart-config"

export interface UseStatementChartSlotsReturn {
  slots: ChartSlot[]
  activeSlotId: string
  setActiveSlotId: (id: string) => void
  addSlot: () => Promise<void>
  removeSlot: (chartInstanceId: string) => Promise<void>
  refresh: () => Promise<void>
  loading: boolean
  error: string | null
}

export function useStatementChartSlots(
  companyId: string | null | undefined,
  statementType: StatementType,
): UseStatementChartSlotsReturn {
  const [slots, setSlots] = useState<ChartSlot[]>([])
  const [activeSlotId, setActiveSlotId] = useState<string>("default")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    if (!companyId) {
      setSlots([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const fetched = await listStatementChartSlots(companyId, statementType)
      setSlots(fetched)
      setActiveSlotId((prev) =>
        fetched.some((s) => s.chartInstanceId === prev)
          ? prev
          : fetched[0]?.chartInstanceId ?? "default",
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load chart configs"
      setError(msg)
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [companyId, statementType])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const addSlot = useCallback(async () => {
    if (!companyId) return
    const created = await addStatementChartSlot(companyId, statementType)
    await fetchSlots()
    setActiveSlotId(created.chartInstanceId)
  }, [companyId, statementType, fetchSlots])

  const removeSlot = useCallback(
    async (chartInstanceId: string) => {
      if (!companyId) return
      if (chartInstanceId === "default") return
      await removeStatementChartSlot(companyId, statementType, chartInstanceId)
      await fetchSlots()
    },
    [companyId, statementType, fetchSlots],
  )

  return useMemo(
    () => ({
      slots,
      activeSlotId,
      setActiveSlotId,
      addSlot,
      removeSlot,
      refresh: fetchSlots,
      loading,
      error,
    }),
    [slots, activeSlotId, addSlot, removeSlot, fetchSlots, loading, error],
  )
}
