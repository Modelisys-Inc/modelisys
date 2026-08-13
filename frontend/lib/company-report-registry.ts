import { removeCompanyOverview } from "@/lib/diagnostic-company-overview"
import { removePilotageSectionComments } from "@/lib/pilotage-section-comments"
import {
  getCompanyReportModule,
  type CompanyReportModuleId,
} from "@/lib/company-report-module"

export type CompanyReportRecord = {
  id: string
  companyId: string
  companyName: string
  title: string
  referenceYear: number
  referenceMonth: number
  createdAt: string
  lastOpenedAt: string
}

function storageKey(moduleId: CompanyReportModuleId): string {
  return getCompanyReportModule(moduleId).storageKey
}

function readAll(moduleId: CompanyReportModuleId): CompanyReportRecord[] {
  if (typeof globalThis.localStorage === "undefined") return []
  try {
    const raw = globalThis.localStorage.getItem(storageKey(moduleId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCompanyReportRecord).map(normalizeRecord)
  } catch {
    return []
  }
}

function writeAll(moduleId: CompanyReportModuleId, records: CompanyReportRecord[]) {
  if (typeof globalThis.localStorage === "undefined") return
  globalThis.localStorage.setItem(storageKey(moduleId), JSON.stringify(records))
}

function isCompanyReportRecord(value: unknown): value is CompanyReportRecord {
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

function normalizeRecord(row: CompanyReportRecord): CompanyReportRecord {
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

export function listCompanyReports(moduleId: CompanyReportModuleId): CompanyReportRecord[] {
  return readAll(moduleId).sort(
    (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime(),
  )
}

export function listCompanyReportsForCompany(
  moduleId: CompanyReportModuleId,
  companyId?: string | null,
): CompanyReportRecord[] {
  const all = listCompanyReports(moduleId)
  if (!companyId) return all
  return all.filter((row) => row.companyId === companyId)
}

export function getCompanyReport(
  moduleId: CompanyReportModuleId,
  id: string,
): CompanyReportRecord | null {
  return readAll(moduleId).find((row) => row.id === id) ?? null
}

export function findLatestCompanyReportForCompany(
  moduleId: CompanyReportModuleId,
  companyId: string,
): CompanyReportRecord | null {
  const matches = readAll(moduleId)
    .filter((row) => row.companyId === companyId)
    .sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime())
  return matches[0] ?? null
}

export function createCompanyReport(
  moduleId: CompanyReportModuleId,
  params: {
    companyId: string
    companyName: string
    title?: string
    referenceYear: number
    referenceMonth: number
  },
): CompanyReportRecord {
  const now = new Date().toISOString()
  const record: CompanyReportRecord = {
    id: globalThis.crypto.randomUUID(),
    companyId: params.companyId,
    companyName: params.companyName.trim(),
    title: params.title?.trim() || defaultTitle(params.companyName),
    referenceYear: params.referenceYear,
    referenceMonth: params.referenceMonth,
    createdAt: now,
    lastOpenedAt: now,
  }
  writeAll(moduleId, [record, ...readAll(moduleId)])
  return record
}

export function touchCompanyReport(
  moduleId: CompanyReportModuleId,
  id: string,
): CompanyReportRecord | null {
  const all = readAll(moduleId)
  const index = all.findIndex((row) => row.id === id)
  if (index < 0) return null
  const updated: CompanyReportRecord = {
    ...all[index]!,
    lastOpenedAt: new Date().toISOString(),
  }
  all[index] = updated
  writeAll(moduleId, all)
  return updated
}

export function removeCompanyReport(moduleId: CompanyReportModuleId, id: string): void {
  writeAll(
    moduleId,
    readAll(moduleId).filter((row) => row.id !== id),
  )
  removeCompanyOverview(id)
  if (moduleId === "pilotage") {
    removePilotageSectionComments(id)
  }
}

export function syncCompanyReportCompanyName(
  moduleId: CompanyReportModuleId,
  companyId: string,
  companyName: string,
): void {
  const trimmed = companyName.trim()
  if (!trimmed) return
  const all = readAll(moduleId)
  let changed = false
  const next = all.map((row) => {
    if (row.companyId !== companyId || row.companyName === trimmed) return row
    changed = true
    return { ...row, companyName: trimmed }
  })
  if (changed) writeAll(moduleId, next)
}
