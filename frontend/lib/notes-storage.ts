import { generateId } from "@/lib/seeded-random"

// Types for notes
export interface Note {
  id: string
  rowId: string
  rowLabel: string
  page: string // e.g., "income-statement", "balance-sheet"
  period: "monthly" | "quarterly" | "annual"
  view: string // e.g., "current", "comparison", "ytd", etc.
  companyId?: string | null
  companyName?: string | null
  divisionId?: string | null
  divisionName?: string | null
  subDivisionId?: string | null
  subDivisionName?: string | null
  // Financial data captured at note creation
  currentAmount?: number | null
  priorAmount?: number | null
  variationPercent?: number | null
  variationAmount?: number | null
  content: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "modelisys_notes"

export function getNotes(): Note[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function saveNote(note: Omit<Note, "id" | "createdAt" | "updatedAt">): Note {
  const notes = getNotes()
  const now = new Date().toISOString()
  const newNote: Note = {
    ...note,
    id: generateId("note"),
    createdAt: now,
    updatedAt: now,
  }
  notes.push(newNote)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  return newNote
}

export function updateNote(id: string, updates: Partial<Omit<Note, "id" | "createdAt">>): Note | null {
  const notes = getNotes()
  const index = notes.findIndex((n) => n.id === id)
  if (index === -1) return null
  notes[index] = {
    ...notes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  return notes[index]
}

export function deleteNote(id: string): boolean {
  const notes = getNotes()
  const filtered = notes.filter((n) => n.id !== id)
  if (filtered.length === notes.length) return false
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
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
  const notes = getNotes()
  return (
    notes.find(
      (n) =>
        n.rowId === rowId &&
        n.page === page &&
        n.period === period &&
        n.view === view &&
        n.companyId === (companyId || null) &&
        n.divisionId === (divisionId || null) &&
        n.subDivisionId === (subDivisionId || null)
    ) || null
  )
}

export function getNotesByPage(page: string): Note[] {
  const notes = getNotes()
  return notes.filter((n) => n.page === page).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

