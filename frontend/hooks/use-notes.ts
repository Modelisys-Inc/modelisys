"use client"

import { useState, useEffect, useCallback } from "react"
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  type NoteData,
  type NoteFilters,
} from "@/lib/api"

export function useNotes(companyId: string | null, filters: NoteFilters = {}) {
  const [notes, setNotes] = useState<NoteData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!companyId) {
      setNotes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await listNotes(companyId, filters)
      setNotes(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load notes"
      setError(message)
      setNotes([])
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, filters.page, filters.row_id, filters.period, filters.view])

  useEffect(() => {
    reload()
  }, [reload])

  const add = useCallback(
    async (note: Parameters<typeof createNote>[1]) => {
      if (!companyId) return
      try {
        const created = await createNote(companyId, note)
        setNotes((prev) => [...prev, created])
        return created
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create note"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  const edit = useCallback(
    async (noteId: string, data: Parameters<typeof updateNote>[2]) => {
      if (!companyId) return
      try {
        const updated = await updateNote(companyId, noteId, data)
        setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)))
        return updated
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to update note"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  const remove = useCallback(
    async (noteId: string) => {
      if (!companyId) return
      try {
        await deleteNote(companyId, noteId)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to delete note"
        setError(message)
        throw err
      }
    },
    [companyId]
  )

  return { notes, loading, error, reload, add, edit, remove }
}
