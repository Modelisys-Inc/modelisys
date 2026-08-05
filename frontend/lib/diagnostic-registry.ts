/**
 * Registre local des diagnostics ouverts / créés par l'utilisateur (navigateur).
 * Chaque entrée pointe vers une société ; le rapport est calculé à la volée via l'API.
 */

export type DiagnosticRecord = {
  id: string
  companyId: string
  companyName: string
  title: string
  /** Année calendaire de référence (comme les états financiers). */
  referenceYear: number
  /** Mois calendaire de référence (1–12). */
  referenceMonth: number
  createdAt: string
  lastOpenedAt: string
}

import { removeCompanyOverview } from "@/lib/diagnostic-company-overview"

const STORAGE_KEY = "modelisys-diagnostic-registry"

function readAll(): DiagnosticRecord[] {
  if (typeof globalThis.localStorage === "undefined") return []
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isDiagnosticRecord).map(normalizeRecord)
  } catch {
    return []
  }
}

function writeAll(records: DiagnosticRecord[]) {
  if (typeof globalThis.localStorage === "undefined") return
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function isDiagnosticRecord(value: unknown): value is DiagnosticRecord {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  const hasReference =
    (row.referenceYear === undefined && row.referenceMonth === undefined) ||
    (typeof row.referenceYear === "number" &&
      typeof row.referenceMonth === "number" &&
      row.referenceMonth >= 1 &&
      row.referenceMonth <= 12)
  return (
    typeof row.id === "string" &&
    typeof row.companyId === "string" &&
    typeof row.companyName === "string" &&
    typeof row.title === "string" &&
    typeof row.createdAt === "string" &&
    typeof row.lastOpenedAt === "string" &&
    hasReference
  )
}

function normalizeRecord(row: DiagnosticRecord): DiagnosticRecord {
  const now = new Date()
  return {
    ...row,
    referenceYear: row.referenceYear ?? now.getFullYear(),
    referenceMonth: row.referenceMonth ?? now.getMonth() + 1,
  }
}

function defaultTitle(companyName: string, at = new Date()) {
  const date = at.toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  return `${companyName} — ${date}`
}

export function listDiagnostics(): DiagnosticRecord[] {
  return readAll().sort(
    (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime(),
  )
}

/** Diagnostics filtrés par société (comme les projections verrouillées par `companyId`). */
export function listDiagnosticsForCompany(companyId?: string | null): DiagnosticRecord[] {
  const all = listDiagnostics()
  if (!companyId) return all
  return all.filter((row) => row.companyId === companyId)
}

export function getDiagnostic(id: string): DiagnosticRecord | null {
  return readAll().find((row) => row.id === id) ?? null
}

export function findLatestDiagnosticForCompany(companyId: string): DiagnosticRecord | null {
  const matches = readAll()
    .filter((row) => row.companyId === companyId)
    .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
  return matches[0] ?? null
}

export function createDiagnostic(params: {
  companyId: string
  companyName: string
  title?: string
  referenceYear: number
  referenceMonth: number
}): DiagnosticRecord {
  const now = new Date().toISOString()
  const record: DiagnosticRecord = {
    id: globalThis.crypto.randomUUID(),
    companyId: params.companyId,
    companyName: params.companyName.trim(),
    title: params.title?.trim() || defaultTitle(params.companyName),
    referenceYear: params.referenceYear,
    referenceMonth: params.referenceMonth,
    createdAt: now,
    lastOpenedAt: now,
  }
  writeAll([record, ...readAll()])
  return record
}

export function touchDiagnostic(id: string): DiagnosticRecord | null {
  const all = readAll()
  const index = all.findIndex((row) => row.id === id)
  if (index < 0) return null
  const updated: DiagnosticRecord = {
    ...all[index]!,
    lastOpenedAt: new Date().toISOString(),
  }
  all[index] = updated
  writeAll(all)
  return updated
}

export function removeDiagnostic(id: string): void {
  writeAll(readAll().filter((row) => row.id !== id))
  removeCompanyOverview(id)
}

export function syncDiagnosticCompanyName(companyId: string, companyName: string): void {
  const trimmed = companyName.trim()
  if (!trimmed) return
  const all = readAll()
  let changed = false
  const next = all.map((row) => {
    if (row.companyId !== companyId || row.companyName === trimmed) return row
    changed = true
    return { ...row, companyName: trimmed }
  })
  if (changed) writeAll(next)
}
