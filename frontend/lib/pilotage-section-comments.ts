/**
 * Commentaires libres par section du rapport Pilotage (localStorage).
 */

export const PILOTAGE_PERFORMANCE_COMMENT_BLOCK_IDS = [
  "pilotage-revenue",
  "pilotage-contributive-margin",
  "pilotage-ebita",
] as const

export type PilotagePerformanceCommentBlockId =
  (typeof PILOTAGE_PERFORMANCE_COMMENT_BLOCK_IDS)[number]

export type PilotageSectionCommentBlockId = string

export type PilotageSectionCommentsRecord = {
  pilotageId: string
  comments: Record<string, string>
  updatedAt: string
}

const STORAGE_KEY = "modelisys-pilotage-section-comments"
const REVENUE_SOURCE_BLOCK_ID_PATTERN = /^revenue-source-\d+-/
const MARGIN_BY_REVENUE_COMMENT_PREFIX = "margin-by-revenue:"
const DIVISION_PROFITABILITY_COMMENT_PREFIX = "division-profitability:"

export const PILOTAGE_EXPENSE_BRIDGE_COMMENT_BLOCK_ID = "pilotage-margin-and-baiia"

export function isPilotagePerformanceCommentBlockId(
  blockId: string,
): blockId is PilotagePerformanceCommentBlockId {
  return (PILOTAGE_PERFORMANCE_COMMENT_BLOCK_IDS as readonly string[]).includes(blockId)
}

export function isRevenueSourceCommentBlockId(blockId: string): boolean {
  return REVENUE_SOURCE_BLOCK_ID_PATTERN.test(blockId)
}

export function pilotageMarginByRevenueCommentBlockId(divisionBlockId: string): string {
  return `${MARGIN_BY_REVENUE_COMMENT_PREFIX}${divisionBlockId}`
}

export function isPilotageMarginByRevenueCommentBlockId(blockId: string): boolean {
  return blockId.startsWith(MARGIN_BY_REVENUE_COMMENT_PREFIX)
}

export function pilotageDivisionProfitabilityCommentBlockId(divisionBlockId: string): string {
  return `${DIVISION_PROFITABILITY_COMMENT_PREFIX}${divisionBlockId}`
}

export function isPilotageDivisionProfitabilityCommentBlockId(blockId: string): boolean {
  return blockId.startsWith(DIVISION_PROFITABILITY_COMMENT_PREFIX)
}

function readAll(): PilotageSectionCommentsRecord[] {
  if (typeof globalThis.localStorage === "undefined") return []
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isRecord).map(normalizeRecord)
  } catch {
    return []
  }
}

function writeAll(records: PilotageSectionCommentsRecord[]) {
  if (typeof globalThis.localStorage === "undefined") return
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function isRecord(value: unknown): value is PilotageSectionCommentsRecord {
  if (!value || typeof value !== "object") return false
  const row = value as Record<string, unknown>
  return typeof row.pilotageId === "string" && row.comments != null && typeof row.comments === "object"
}

function normalizeRecord(row: PilotageSectionCommentsRecord): PilotageSectionCommentsRecord {
  const comments: Record<string, string> = {}
  for (const [blockId, value] of Object.entries(row.comments ?? {})) {
    if (typeof value === "string" && value.trim()) {
      comments[blockId] = value
    }
  }
  return {
    pilotageId: row.pilotageId,
    comments,
    updatedAt: row.updatedAt || new Date().toISOString(),
  }
}

export function getPilotageSectionComments(pilotageId: string): PilotageSectionCommentsRecord {
  const existing = readAll().find((row) => row.pilotageId === pilotageId)
  if (existing) return normalizeRecord(existing)
  return {
    pilotageId,
    comments: {},
    updatedAt: new Date().toISOString(),
  }
}

export function savePilotageSectionComment(
  pilotageId: string,
  blockId: PilotageSectionCommentBlockId,
  text: string,
): PilotageSectionCommentsRecord {
  const current = getPilotageSectionComments(pilotageId)
  const trimmed = text.trim()
  const nextComments = { ...current.comments }
  if (trimmed) {
    nextComments[blockId] = text
  } else {
    delete nextComments[blockId]
  }
  const next: PilotageSectionCommentsRecord = {
    pilotageId,
    comments: nextComments,
    updatedAt: new Date().toISOString(),
  }
  const all = readAll().filter((row) => row.pilotageId !== pilotageId)
  writeAll([next, ...all])
  return next
}

export function removePilotageSectionComments(pilotageId: string): void {
  writeAll(readAll().filter((row) => row.pilotageId !== pilotageId))
}
