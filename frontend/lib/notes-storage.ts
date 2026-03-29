"use client"

import { useState, useEffect, useCallback } from "react"
import {
  listNotes,
  createNote,
  updateNote as apiUpdateNote,
  deleteNote as apiDeleteNote,
  type NoteData,
  type NoteFilters,
} from "@/lib/api"

// Types for notes (keep backward-compatible interface)
export interface Note {
  id: string
  rowId: string
  rowLabel: string
  page: string
  period: "monthly" | "quarterly" | "annual"
  view: string
  companyId?: string | null
  companyName?: string | null
  divisionId?: string | null
  divisionName?: string | null
  subDivisionId?: string | null
  subDivisionName?: string | null
  currentAmount?: number | null
  priorAmount?: number | null
  variationPercent?: number | null
  variationAmount?: number | null
  content: string
  createdAt: string
  updatedAt: string
}

// --- Module-level in-memory cache ---
let cachedNotes: Note[] = []
let cachedCompanyId: string | null = null
let loadingPromise: Promise<void> | null = null
let cacheListeners: Array<() => void> = []

function notifyCacheListeners() {
  for (const listener of cacheListeners) listener()
}

// Convert API NoteData to local Note interface
function toLocalNote(apiNote: NoteData, companyId?: string | null): Note {
  return {
    id: apiNote.id,
    rowId: apiNote.row_id,
    rowLabel: apiNote.row_label,
    page: apiNote.page,
    period: apiNote.period as "monthly" | "quarterly" | "annual",
    view: apiNote.view,
    companyId: apiNote.company_id ?? companyId ?? null,
    companyName: null,
    divisionId: apiNote.division_id ?? null,
    divisionName: null,
    subDivisionId: apiNote.sub_division_id ?? null,
    subDivisionName: null,
    currentAmount: apiNote.current_amount ?? null,
    priorAmount: apiNote.prior_amount ?? null,
    variationPercent: apiNote.variation_percent ?? null,
    variationAmount: apiNote.variation_amount ?? null,
    content: apiNote.content,
    createdAt: apiNote.created_at,
    updatedAt: apiNote.updated_at,
  }
}

// Load notes from API into cache
export async function loadNotesForCompany(companyId: string): Promise<void> {
  if (cachedCompanyId === companyId && cachedNotes.length >= 0 && loadingPromise === null) {
    // Already loaded for this company
    if (cachedNotes.length > 0 || cachedCompanyId === companyId) return
  }

  cachedCompanyId = companyId

  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    try {
      const apiNotes = await listNotes(companyId)
      cachedNotes = apiNotes.map((n) => toLocalNote(n, companyId))
    } catch {
      cachedNotes = []
    } finally {
      loadingPromise = null
      notifyCacheListeners()
    }
  })()

  return loadingPromise
}

// Force refresh the cache
export async function refreshNotesCache(companyId: string): Promise<void> {
  cachedCompanyId = null // Reset so loadNotesForCompany actually fetches
  return loadNotesForCompany(companyId)
}

// --- Synchronous read functions (read from cache) ---

export function getNotes(): Note[] {
  return cachedNotes
}

export function getNoteByRowId(
  rowId: string,
  page: string,
  period: "monthly" | "quarterly" | "annual",
  view: string,
  companyId?: string | null,
  divisionId?: string | null,
  subDivisionId?: string | null
): Note | null {
  return (
    cachedNotes.find(
      (n) =>
        n.rowId === rowId &&
        n.page === page &&
        n.period === period &&
        n.view === view &&
        (n.divisionId || null) === (divisionId || null) &&
        (n.subDivisionId || null) === (subDivisionId || null)
    ) || null
  )
}

export function getNotesByPage(page: string): Note[] {
  return cachedNotes
    .filter((n) => n.page === page)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

// --- Async write functions (call API + update cache) ---

export async function saveNote(
  note: Omit<Note, "id" | "createdAt" | "updatedAt">
): Promise<Note> {
  const companyId = note.companyId
  if (!companyId) {
    throw new Error("companyId is required to save a note")
  }

  const apiNote = await createNote(companyId, {
    row_id: note.rowId,
    row_label: note.rowLabel,
    page: note.page,
    period: note.period,
    view: note.view,
    current_amount: note.currentAmount,
    prior_amount: note.priorAmount,
    variation_percent: note.variationPercent,
    variation_amount: note.variationAmount,
    content: note.content,
    division_id: note.divisionId || undefined,
    sub_division_id: note.subDivisionId || undefined,
  })

  const localNote = toLocalNote(apiNote, companyId)
  cachedNotes.push(localNote)
  notifyCacheListeners()
  return localNote
}

export async function updateNote(
  id: string,
  updates: Partial<Omit<Note, "id" | "createdAt">>,
  companyId?: string | null
): Promise<Note | null> {
  const effectiveCompanyId = companyId || cachedCompanyId
  if (!effectiveCompanyId) return null

  const apiNote = await apiUpdateNote(effectiveCompanyId, id, {
    content: updates.content,
    current_amount: updates.currentAmount,
    prior_amount: updates.priorAmount,
    variation_percent: updates.variationPercent,
    variation_amount: updates.variationAmount,
  })

  const localNote = toLocalNote(apiNote, effectiveCompanyId)
  const index = cachedNotes.findIndex((n) => n.id === id)
  if (index !== -1) {
    cachedNotes[index] = localNote
  }
  notifyCacheListeners()
  return localNote
}

export async function deleteNote(id: string, companyId?: string | null): Promise<boolean> {
  const effectiveCompanyId = companyId || cachedCompanyId
  if (!effectiveCompanyId) return false

  await apiDeleteNote(effectiveCompanyId, id)
  cachedNotes = cachedNotes.filter((n) => n.id !== id)
  notifyCacheListeners()
  return true
}

// --- React hook to initialize notes cache ---

export function useNotesCache(companyId: string | null) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!companyId) return

    // Register listener for cache updates
    const listener = () => setVersion((v) => v + 1)
    cacheListeners.push(listener)

    // Load cache
    loadNotesForCompany(companyId).then(() => setVersion((v) => v + 1))

    return () => {
      cacheListeners = cacheListeners.filter((l) => l !== listener)
    }
  }, [companyId])

  const refresh = useCallback(() => {
    if (companyId) {
      refreshNotesCache(companyId)
    }
  }, [companyId])

  return { version, refresh }
}
