"use client"

import { useState, useEffect, useCallback } from "react"
import {
  listProjections,
  createProjection,
  getProjection,
  updateProjection,
  deleteProjection,
  type ProjectionData,
  type ProjectionWithDetails,
} from "@/lib/api"

export function useProjections(companyId: string | null) {
  const [projections, setProjections] = useState<ProjectionData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!companyId) {
      setProjections([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await listProjections(companyId)
      setProjections(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load projections"
      setError(message)
      setProjections([])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (projection: Parameters<typeof createProjection>[1]) => {
      if (!companyId) return
      try {
        const created = await createProjection(companyId, projection)
        setProjections((prev) => [...prev, created])
        return created
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create projection"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  const get = useCallback(
    async (projectionId: string): Promise<ProjectionWithDetails | undefined> => {
      if (!companyId) return
      try {
        return await getProjection(companyId, projectionId)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load projection"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  const edit = useCallback(
    async (projectionId: string, data: Parameters<typeof updateProjection>[2]) => {
      if (!companyId) return
      try {
        const updated = await updateProjection(companyId, projectionId, data)
        setProjections((prev) => prev.map((p) => (p.id === projectionId ? updated : p)))
        return updated
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update projection"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  const remove = useCallback(
    async (projectionId: string) => {
      if (!companyId) return
      try {
        await deleteProjection(companyId, projectionId)
        setProjections((prev) => prev.filter((p) => p.id !== projectionId))
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete projection"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  return { projections, loading, error, reload, add, get, edit, remove }
}
