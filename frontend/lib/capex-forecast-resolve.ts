/**
 * Résolution des montants Hypothèses Capex (partagée Capex ↔ Estimation du Bilan).
 * Sans ajustement sur une année projetée → 0 $ (pas d’invention).
 */

import { isCapexProjectionLinkCode } from "@/lib/standard-link-code-utils"

export const CAPEX_FORECAST_CONFIG_TYPE = "capex-forecast"

export type CapexAdjustmentType = "amount" | "growthPercent" | "growthAmount" | "percentRevenue"

export type CapexAdjustment = {
  id: string
  rowId: string
  yearIndex: number
  type: CapexAdjustmentType
  value: number
  note?: string
  /** Code de liaison (ex. ALT-B.1) — permet le rollup bilan même si rowId est un UUID. */
  linkCode?: string
  hypothesisMetaOnly?: boolean
  seasonalityMonthPercents?: number[]
  capexFinancing?: unknown
}

function isCapexHypothesisMetaOnly(adj: CapexAdjustment): boolean {
  return adj.hypothesisMetaOnly === true
}

export function isCapexHypothesisGrowthAdjustment(adj: CapexAdjustment): boolean {
  return !isCapexHypothesisMetaOnly(adj)
}

export function parseCapexAdjustments(raw: unknown): Record<string, CapexAdjustment[]> {
  const out: Record<string, CapexAdjustment[]> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value as CapexAdjustment[]
    } else if (value && typeof value === "object") {
      out[key] = [value as CapexAdjustment]
    }
  }
  return out
}

export function parseCapexForecastConfig(data: unknown): {
  capexAdjustments: Record<string, CapexAdjustment[]>
} {
  const raw = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  return { capexAdjustments: parseCapexAdjustments(raw.capexAdjustments) }
}

export function getCapexAdjustmentsForKey(
  map: Record<string, CapexAdjustment[]>,
  rowId: string,
  yearIndex: number,
): CapexAdjustment[] {
  return map[`${rowId}-${yearIndex}`] ?? []
}

export function hasCapexGrowthAdjustment(
  map: Record<string, CapexAdjustment[]>,
  rowId: string,
  yearIndex: number,
): boolean {
  return getCapexAdjustmentsForKey(map, rowId, yearIndex).some(isCapexHypothesisGrowthAdjustment)
}

function resolveSingleCapexAdjustmentAmount(
  adjustment: CapexAdjustment,
  yearIndex: number,
  defaultValue: number,
  baseValue: number,
  projectedRevenueYearTotals: number[] | null | undefined,
  rowId: string,
  adjustments: Record<string, CapexAdjustment[]>,
  builtTrend?: number[],
): number {
  if (adjustment.type === "amount") {
    return Math.round(adjustment.value)
  }
  if (adjustment.type === "percentRevenue") {
    const revenueTotal = projectedRevenueYearTotals?.[yearIndex] ?? 0
    return Math.round(revenueTotal * (adjustment.value / 100))
  }
  const prevDefault =
    yearIndex > 0 ? (builtTrend?.[yearIndex - 1] ?? (yearIndex === 1 ? baseValue : 0)) : defaultValue
  const previousValue =
    yearIndex > 0
      ? resolveCapexRowValue(
          rowId,
          yearIndex - 1,
          prevDefault,
          baseValue,
          adjustments,
          projectedRevenueYearTotals,
          builtTrend,
        )
      : defaultValue
  if (adjustment.type === "growthPercent") {
    return Math.round(previousValue * (1 + adjustment.value / 100))
  }
  if (adjustment.type === "growthAmount") {
    return Math.round(previousValue + adjustment.value)
  }
  return 0
}

/**
 * Montant Capex d’un poste pour un index config (0 = réel / base, 1+ = projeté).
 * Aligné Estimation des Capex annuels.
 */
export function resolveCapexRowValue(
  rowId: string,
  yearIndex: number,
  defaultValue: number,
  baseValue: number,
  adjustments: Record<string, CapexAdjustment[]>,
  projectedRevenueYearTotals?: number[] | null,
  builtTrend?: number[],
): number {
  const list = getCapexAdjustmentsForKey(adjustments, rowId, yearIndex).filter(
    isCapexHypothesisGrowthAdjustment,
  )
  if (list.length === 0) {
    return yearIndex === 0 ? defaultValue : 0
  }

  const amountLike = list.filter((a) => a.type === "amount" || a.type === "percentRevenue")
  if (amountLike.length > 0) {
    return amountLike.reduce(
      (sum, adj) =>
        sum +
        resolveSingleCapexAdjustmentAmount(
          adj,
          yearIndex,
          defaultValue,
          baseValue,
          projectedRevenueYearTotals,
          rowId,
          adjustments,
          builtTrend,
        ),
      0,
    )
  }

  const adjustment = list[list.length - 1]!
  return resolveSingleCapexAdjustmentAmount(
    adjustment,
    yearIndex,
    defaultValue,
    baseValue,
    projectedRevenueYearTotals,
    rowId,
    adjustments,
    builtTrend,
  )
}

export function buildCapexConfigTrend(
  rowId: string,
  configYearCount: number,
  actualBase: number,
  adjustments: Record<string, CapexAdjustment[]>,
  projectedRevenueYearTotals?: number[] | null,
): number[] {
  const trend: number[] = []
  for (let yearIndex = 0; yearIndex < configYearCount; yearIndex++) {
    const defaultValue = yearIndex === 0 ? actualBase : 0
    trend.push(
      resolveCapexRowValue(
        rowId,
        yearIndex,
        defaultValue,
        actualBase,
        adjustments,
        projectedRevenueYearTotals,
        trend,
      ),
    )
  }
  return trend
}

function normalizeLinkCode(code: string | null | undefined): string {
  return String(code ?? "").trim().toUpperCase()
}

/** Enfant strict sous un parent (ALT-B.1 sous ALT-B ; pas ALT-C sous ALT-B). */
export function linkCodeDescendsFrom(child: string, parent: string): boolean {
  const c = normalizeLinkCode(child)
  const p = normalizeLinkCode(parent)
  if (!c || !p || c === p) return false
  return c.startsWith(`${p}.`) || c.startsWith(`${p}-`)
}

export type CapexBilanPeerRow = {
  rowId: string
  linkCode: string
  actualBase: number
}

/**
 * Montant projeté bilan pour un poste Capex :
 * - ajustement propre (rowId ou linkCode) → valeur Capex ;
 * - sinon somme des Capex dont le code de liaison = parent ou descendant
 *   (feuilles hyp. sous ALT-B / ALT-C / ALT-D, y compris id UUID Capex) ;
 * - sinon 0 $ en année projetée.
 */
export function parseCapexAdjustmentStorageKey(
  key: string,
): { rowId: string; yearIndex: number } | null {
  const m = /^(.*)-(\d+)$/.exec(key)
  if (!m) return null
  return { rowId: m[1]!, yearIndex: Number(m[2]) }
}

function resolveLinkCodeForCapexAdjRowId(
  adjRowId: string,
  peerRows: CapexBilanPeerRow[],
  adjLinkCode?: string | null,
): string {
  const fromAdj = normalizeLinkCode(adjLinkCode)
  if (fromAdj && isCapexProjectionLinkCode(fromAdj)) return fromAdj
  const peer = peerRows.find((p) => p.rowId === adjRowId || p.linkCode === adjRowId)
  if (peer?.linkCode) return normalizeLinkCode(peer.linkCode)
  if (isCapexProjectionLinkCode(adjRowId)) return normalizeLinkCode(adjRowId)
  return ""
}

export function resolveCapexDrivenBilanProjectedAmount(params: {
  rowId: string
  linkCode?: string | null
  configYearIndex: number
  configYearCount: number
  actualBase: number
  adjustments: Record<string, CapexAdjustment[]>
  projectedRevenueYearTotals?: number[] | null
  peerRows: CapexBilanPeerRow[]
}): number {
  const {
    rowId,
    linkCode,
    configYearIndex,
    configYearCount,
    actualBase,
    adjustments,
    projectedRevenueYearTotals,
    peerRows,
  } = params

  if (configYearIndex <= 0) return actualBase

  const tryResolve = (key: string, base: number) =>
    buildCapexConfigTrend(
      key,
      configYearCount,
      base,
      adjustments,
      projectedRevenueYearTotals,
    )[configYearIndex] ?? 0

  if (hasCapexGrowthAdjustment(adjustments, rowId, configYearIndex)) {
    return tryResolve(rowId, actualBase)
  }
  const lc = normalizeLinkCode(linkCode)
  if (lc && lc !== rowId && hasCapexGrowthAdjustment(adjustments, lc, configYearIndex)) {
    return tryResolve(lc, actualBase)
  }

  const parentCode = lc || normalizeLinkCode(rowId)
  if (!parentCode || !isCapexProjectionLinkCode(parentCode)) return 0

  let sum = 0
  let any = false
  const seen = new Set<string>()

  for (const [key, list] of Object.entries(adjustments)) {
    const parsed = parseCapexAdjustmentStorageKey(key)
    if (!parsed || parsed.yearIndex !== configYearIndex) continue
    if (!list.some(isCapexHypothesisGrowthAdjustment)) continue

    const adjRowId =
      list.find(isCapexHypothesisGrowthAdjustment)?.rowId?.trim() || parsed.rowId
    if (!adjRowId || seen.has(adjRowId)) continue

    const storedLink = list.find(isCapexHypothesisGrowthAdjustment)?.linkCode
    const adjLink = resolveLinkCodeForCapexAdjRowId(adjRowId, peerRows, storedLink)
    if (!adjLink) continue
    if (adjLink !== parentCode && !linkCodeDescendsFrom(adjLink, parentCode)) continue

    const peer = peerRows.find((p) => p.rowId === adjRowId || p.linkCode === adjRowId)
    const base = peer?.actualBase ?? 0
    seen.add(adjRowId)
    sum += tryResolve(adjRowId, base)
    any = true
  }

  if (any) return sum

  // Repli peers (structure sync) si la map d’ajustements n’a pas pu être reliée.
  for (const peer of peerRows) {
    if (peer.rowId === rowId) continue
    if (!linkCodeDescendsFrom(peer.linkCode, parentCode)) continue
    if (hasCapexGrowthAdjustment(adjustments, peer.rowId, configYearIndex)) {
      sum += tryResolve(peer.rowId, peer.actualBase)
      any = true
    } else if (
      peer.linkCode &&
      hasCapexGrowthAdjustment(adjustments, peer.linkCode, configYearIndex)
    ) {
      sum += tryResolve(peer.linkCode, peer.actualBase)
      any = true
    }
  }
  return any ? sum : 0
}
