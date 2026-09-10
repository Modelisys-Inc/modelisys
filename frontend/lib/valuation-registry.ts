/**
 * Registre local des valorisations (scénarios d'évaluation).
 * Même idée que le registre diagnostic / projections côté UI.
 */

import type { ValuationPlanPhaseId } from "@/lib/valuation-plan-phases"
import { normalizeCompletedPlanSteps } from "@/lib/valuation-plan-phases"

export type ValuationRecord = {
  id: string
  companyId: string
  companyName: string
  title: string
  referenceYear: number
  referenceMonth: number
  createdAt: string
  lastOpenedAt: string
  completedPlanSteps?: ValuationPlanPhaseId[]
}

const STORAGE_KEY = "modelisys-valuation-registry"

function readAll(): ValuationRecord[] {
  if (typeof globalThis.localStorage === "undefined") return []
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValuationRecord)
  } catch {
    return []
  }
}

function writeAll(records: ValuationRecord[]) {
  if (typeof globalThis.localStorage === "undefined") return
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function isValuationRecord(value: unknown): value is ValuationRecord {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === "string" &&
    typeof row.companyId === "string" &&
    typeof row.companyName === "string" &&
    typeof row.title === "string" &&
    typeof row.referenceYear === "number" &&
    typeof row.referenceMonth === "number" &&
    row.referenceMonth >= 1 &&
    row.referenceMonth <= 12 &&
    typeof row.createdAt === "string" &&
    typeof row.lastOpenedAt === "string"
  )
}

function normalizeValuationRecord(record: ValuationRecord): ValuationRecord {
  if (!record.completedPlanSteps?.length) return record
  const completedPlanSteps = normalizeCompletedPlanSteps(record.completedPlanSteps)
  if (completedPlanSteps.length === record.completedPlanSteps.length &&
      completedPlanSteps.every((step, index) => step === record.completedPlanSteps?.[index])) {
    return record
  }
  return { ...record, completedPlanSteps }
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `val-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function listValuations(): ValuationRecord[] {
  return readAll().map(normalizeValuationRecord).sort(
    (a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime(),
  )
}

export function listValuationsForCompany(companyId?: string | null): ValuationRecord[] {
  const all = listValuations()
  if (!companyId) return all
  return all.filter((row) => row.companyId === companyId)
}

export function getValuation(id: string): ValuationRecord | null {
  const record = readAll().find((row) => row.id === id) ?? null
  return record ? normalizeValuationRecord(record) : null
}

export function createValuation(params: {
  companyId: string
  companyName: string
  title: string
  referenceYear: number
  referenceMonth: number
}): ValuationRecord {
  const now = new Date().toISOString()
  const record: ValuationRecord = {
    id: newId(),
    companyId: params.companyId,
    companyName: params.companyName,
    title: params.title.trim() || "Nouvelle valorisation",
    referenceYear: params.referenceYear,
    referenceMonth: params.referenceMonth,
    createdAt: now,
    lastOpenedAt: now,
  }
  writeAll([record, ...readAll().filter((r) => r.id !== record.id)])
  return record
}

export function touchValuation(id: string): ValuationRecord | null {
  const all = readAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const updated = { ...all[idx], lastOpenedAt: new Date().toISOString() }
  all[idx] = updated
  writeAll(all)
  return updated
}

export function removeValuation(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id))
}

function valuationQueryParams(
  valuation: Pick<ValuationRecord, "id" | "companyId" | "referenceMonth" | "referenceYear">,
  options?: { includeValuationId?: boolean },
): URLSearchParams {
  const params = new URLSearchParams()
  if (options?.includeValuationId !== false) {
    params.set("valuationId", valuation.id)
  }
  params.set("companyId", valuation.companyId)
  params.set("refMonth", String(valuation.referenceMonth))
  params.set("refYear", String(valuation.referenceYear))
  return params
}

export function valuationDashboardPath(
  valuation: Pick<ValuationRecord, "id" | "companyId" | "referenceMonth" | "referenceYear">,
): string {
  const params = valuationQueryParams(valuation, { includeValuationId: false })
  return `/evaluation/${valuation.id}?${params.toString()}`
}

export function valuationPlanBackHref(searchParams: {
  get: (key: string) => string | null
}): string {
  const valuationId = searchParams.get("valuationId")
  const companyId = searchParams.get("companyId")
  const refMonth = searchParams.get("refMonth")
  const refYear = searchParams.get("refYear")

  if (valuationId && companyId && refMonth && refYear) {
    const month = Number(refMonth)
    const year = Number(refYear)
    if (Number.isFinite(month) && Number.isFinite(year)) {
      return valuationDashboardPath({
        id: valuationId,
        companyId,
        referenceMonth: month,
        referenceYear: year,
      })
    }
  }

  if (companyId) {
    return `/evaluation?companyId=${encodeURIComponent(companyId)}`
  }
  return "/evaluation"
}

export function valuationToolPath(
  valuation: Pick<ValuationRecord, "id" | "companyId" | "referenceMonth" | "referenceYear">,
  toolPath: string,
): string {
  const params = valuationQueryParams(valuation)
  return `${toolPath}?${params.toString()}`
}

/** @deprecated Prefer valuationDashboardPath or valuationToolPath */
export function valuationDetailPath(
  valuation: Pick<ValuationRecord, "id" | "companyId" | "referenceMonth" | "referenceYear">,
  toolPath?: string,
): string {
  if (!toolPath || toolPath === "/evaluation/dashboard") {
    return valuationDashboardPath(valuation)
  }
  return valuationToolPath(valuation, toolPath)
}

export function markValuationPlanStepComplete(
  id: string,
  step: ValuationPlanPhaseId,
): ValuationRecord | null {
  const all = readAll()
  const idx = all.findIndex((r) => r.id === id)
  if (idx < 0) return null
  const existing = normalizeCompletedPlanSteps(all[idx].completedPlanSteps)
  if (existing.includes(step)) return normalizeValuationRecord(all[idx])
  const updated: ValuationRecord = normalizeValuationRecord({
    ...all[idx],
    completedPlanSteps: [...existing, step],
    lastOpenedAt: new Date().toISOString(),
  })
  all[idx] = updated
  writeAll(all)
  return updated
}
