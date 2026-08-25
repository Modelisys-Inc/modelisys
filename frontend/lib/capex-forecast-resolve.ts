/**
 * Résolution Hypothèses Capex (Estimation Capex ↔ Estimation du Bilan).
 *
 * Affichage projeté = valeur comptable (Coût − Amortissement cumulé).
 * Ajustement = ajout au Coût ; la dotation suit le taux / la méthode du poste.
 * Sans ajustement, la VNC se projette quand même via l’amortissement annuel.
 */

import { isCapexProjectionLinkCode } from "@/lib/standard-link-code-utils"

export const CAPEX_FORECAST_CONFIG_TYPE = "capex-forecast"

export type CapexAdjustmentType = "amount" | "growthPercent" | "growthAmount" | "percentRevenue"

export type CapexDepreciationMethod = "declining" | "linear"

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

/** État annuel d’une immobilisation (montants arrondis au dollar). */
export type CapexAssetYearState = {
  /** Coût brut en fin d’année (après ajouts). */
  cost: number
  /** Amortissement cumulé (magnitude positive) en fin d’année. */
  accumulatedDepreciation: number
  /** Valeur nette comptable = coût − amort. cumulé. */
  bookValue: number
  /** Ajouts Capex de l’année (ajustements). */
  additions: number
  /** Dotation de l’exercice. */
  depreciationExpense: number
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

export function parseCapexDepreciationRates(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof value === "number" ? value : Number(value)
    if (Number.isFinite(n)) out[key] = n
  }
  return out
}

export function parseCapexDepreciationMethods(
  raw: unknown,
): Record<string, CapexDepreciationMethod> {
  const out: Record<string, CapexDepreciationMethod> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === "declining" || value === "linear") out[key] = value
  }
  return out
}

export function parseCapexForecastConfig(data: unknown): {
  capexAdjustments: Record<string, CapexAdjustment[]>
  depreciationRates: Record<string, number>
  depreciationMethods: Record<string, CapexDepreciationMethod>
} {
  const raw = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  return {
    capexAdjustments: parseCapexAdjustments(raw.capexAdjustments),
    depreciationRates: parseCapexDepreciationRates(raw.depreciationRates),
    depreciationMethods: parseCapexDepreciationMethods(raw.depreciationMethods),
  }
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

/** Taux d’amortissement par défaut selon le libellé du poste (aligné UI Capex). */
export function defaultCapexDepreciationRate(label: string): number {
  if (label.includes("Location-acquisition") || label.includes("Biens loués")) return 0
  if (label.includes("Terrains")) return 0
  if (label.includes("Constructions") || label.includes("Terrains et constructions")) return 2.5
  if (label.includes("Matériel") || label.includes("équipement")) return 10
  if (label.includes("Véhicules")) return 20
  if (label.includes("Brevets") || label.includes("licences")) return 5
  if (label.includes("Logiciels") || label.includes("développement")) return 33.33
  if (label.includes("Fonds commercial")) return 0
  return 8
}

export function resolveCapexDepreciationRate(
  rowId: string,
  label: string,
  rates: Record<string, number>,
): number {
  if (rates[rowId] !== undefined) return rates[rowId]!
  return defaultCapexDepreciationRate(label)
}

export function resolveCapexDepreciationMethod(
  rowId: string,
  methods: Record<string, CapexDepreciationMethod>,
): CapexDepreciationMethod {
  return methods[rowId] ?? "linear"
}

/**
 * Dotation annuelle.
 * - Linéaire : taux × coût brut (plafonné à la VNC avant dotation).
 * - Dégressif : taux × VNC avant dotation.
 */
export function computeCapexDepreciationExpense(params: {
  cost: number
  bookValueBeforeDepreciation: number
  ratePercent: number
  method: CapexDepreciationMethod
}): number {
  const { cost, bookValueBeforeDepreciation, ratePercent, method } = params
  const book = Math.max(0, Math.round(bookValueBeforeDepreciation))
  if (book <= 0 || !(ratePercent > 0)) return 0
  const raw =
    method === "declining"
      ? Math.round(book * (ratePercent / 100))
      : Math.round(Math.max(0, cost) * (ratePercent / 100))
  return Math.min(Math.max(0, raw), book)
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
      ? resolveCapexAdditionsForYear(
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
 * Montant d’ajout Capex (dépense / hausse du Coût) pour un index config.
 * Année 0 = 0 (les soldes d’ouverture viennent du mapping) ;
 * année projetée sans ajustement = 0.
 */
export function resolveCapexAdditionsForYear(
  rowId: string,
  yearIndex: number,
  defaultValue: number,
  baseValue: number,
  adjustments: Record<string, CapexAdjustment[]>,
  projectedRevenueYearTotals?: number[] | null,
  builtTrend?: number[],
): number {
  if (yearIndex <= 0) return 0
  const list = getCapexAdjustmentsForKey(adjustments, rowId, yearIndex).filter(
    isCapexHypothesisGrowthAdjustment,
  )
  if (list.length === 0) return 0

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

/**
 * @deprecated Prefer resolveCapexAdditionsForYear (ajouts) or buildCapexAssetYearStates (VNC).
 * Conservé pour compat : années projetées = ajouts ; année 0 = defaultValue (base réelle).
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
  if (yearIndex === 0) return defaultValue
  return resolveCapexAdditionsForYear(
    rowId,
    yearIndex,
    defaultValue,
    baseValue,
    adjustments,
    projectedRevenueYearTotals,
    builtTrend,
  )
}

export function normalizeCapexOpeningBalances(params: {
  openingCost: number
  openingBookValue: number
}): { cost: number; accumulatedDepreciation: number; bookValue: number } {
  const openingBook = Math.round(params.openingBookValue)
  let cost = Math.round(params.openingCost)
  if (!(cost > 0) && openingBook !== 0) {
    // Mapping Coût manquant : repli = VNC comme coût (amort. cumulé 0).
    cost = Math.max(0, openingBook)
  }
  if (cost < Math.max(0, openingBook)) {
    cost = Math.max(0, openingBook)
  }
  const accumulatedDepreciation = Math.max(0, cost - Math.max(0, openingBook))
  const bookValue = cost - accumulatedDepreciation
  return { cost, accumulatedDepreciation, bookValue }
}

export function buildCapexAssetYearStates(params: {
  rowId: string
  configYearCount: number
  openingCost: number
  openingBookValue: number
  adjustments: Record<string, CapexAdjustment[]>
  ratePercent: number
  method: CapexDepreciationMethod
  projectedRevenueYearTotals?: number[] | null
  /** Remplace les ajouts résolus pour une année (aperçu brouillon panneau). */
  additionsOverrides?: Record<number, number>
}): CapexAssetYearState[] {
  const {
    rowId,
    configYearCount,
    openingCost,
    openingBookValue,
    adjustments,
    ratePercent,
    method,
    projectedRevenueYearTotals,
    additionsOverrides,
  } = params

  const opening = normalizeCapexOpeningBalances({ openingCost, openingBookValue })
  const states: CapexAssetYearState[] = []
  const additionsTrend: number[] = []

  for (let yearIndex = 0; yearIndex < configYearCount; yearIndex++) {
    if (yearIndex === 0) {
      states.push({
        cost: opening.cost,
        accumulatedDepreciation: opening.accumulatedDepreciation,
        bookValue: opening.bookValue,
        additions: 0,
        depreciationExpense: 0,
      })
      additionsTrend.push(0)
      continue
    }

    const prev = states[yearIndex - 1]!
    const additions =
      additionsOverrides?.[yearIndex] !== undefined
        ? Math.round(additionsOverrides[yearIndex]!)
        : resolveCapexAdditionsForYear(
            rowId,
            yearIndex,
            0,
            opening.bookValue,
            adjustments,
            projectedRevenueYearTotals,
            additionsTrend,
          )
    additionsTrend.push(additions)

    const cost = prev.cost + additions
    const bookBeforeDep = cost - prev.accumulatedDepreciation
    const depreciationExpense = computeCapexDepreciationExpense({
      cost,
      bookValueBeforeDepreciation: bookBeforeDep,
      ratePercent,
      method,
    })
    const accumulatedDepreciation = prev.accumulatedDepreciation + depreciationExpense
    const bookValue = cost - accumulatedDepreciation
    states.push({
      cost,
      accumulatedDepreciation,
      bookValue,
      additions,
      depreciationExpense,
    })
  }

  return states
}

export function buildCapexBookValueTrend(params: {
  rowId: string
  configYearCount: number
  openingCost: number
  openingBookValue: number
  adjustments: Record<string, CapexAdjustment[]>
  ratePercent: number
  method: CapexDepreciationMethod
  projectedRevenueYearTotals?: number[] | null
  additionsOverrides?: Record<number, number>
}): number[] {
  return buildCapexAssetYearStates(params).map((s) => s.bookValue)
}

/** @deprecated Prefer buildCapexBookValueTrend — conserve l’ancien sens « ajouts ». */
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
  /** Valeur comptable d’ouverture (série bilan). */
  actualBase: number
  /** Coût d’ouverture (série alt_asset_cost_only) ; repli = actualBase. */
  actualCostBase?: number
  label?: string
}

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

function bookTrendForCapexKey(params: {
  key: string
  openingBook: number
  openingCost: number
  label: string
  configYearCount: number
  adjustments: Record<string, CapexAdjustment[]>
  depreciationRates: Record<string, number>
  depreciationMethods: Record<string, CapexDepreciationMethod>
  projectedRevenueYearTotals?: number[] | null
}): number[] {
  const {
    key,
    openingBook,
    openingCost,
    label,
    configYearCount,
    adjustments,
    depreciationRates,
    depreciationMethods,
    projectedRevenueYearTotals,
  } = params
  return buildCapexBookValueTrend({
    rowId: key,
    configYearCount,
    openingCost,
    openingBookValue: openingBook,
    adjustments,
    ratePercent: resolveCapexDepreciationRate(key, label, depreciationRates),
    method: resolveCapexDepreciationMethod(key, depreciationMethods),
    projectedRevenueYearTotals,
  })
}

/**
 * Montant projeté bilan pour un poste Capex = valeur comptable projetée :
 * - rollforward propre (rowId / linkCode) ;
 * - sinon somme des VNC des descendants ayant une hyp. (ou toujours leurs VNC si
 *   la map d’ajustements les relie) ;
 * - sinon VNC propre après amortissement seul.
 */
export function resolveCapexDrivenBilanProjectedAmount(params: {
  rowId: string
  linkCode?: string | null
  configYearIndex: number
  configYearCount: number
  actualBase: number
  actualCostBase?: number
  label?: string
  adjustments: Record<string, CapexAdjustment[]>
  depreciationRates?: Record<string, number>
  depreciationMethods?: Record<string, CapexDepreciationMethod>
  projectedRevenueYearTotals?: number[] | null
  peerRows: CapexBilanPeerRow[]
}): number {
  const {
    rowId,
    linkCode,
    configYearIndex,
    configYearCount,
    actualBase,
    actualCostBase,
    label = "",
    adjustments,
    depreciationRates = {},
    depreciationMethods = {},
    projectedRevenueYearTotals,
    peerRows,
  } = params

  if (configYearIndex <= 0) return actualBase

  const openingCost = actualCostBase ?? actualBase
  const tryBook = (
    key: string,
    book: number,
    cost: number,
    rowLabel: string,
  ) =>
    bookTrendForCapexKey({
      key,
      openingBook: book,
      openingCost: cost,
      label: rowLabel,
      configYearCount,
      adjustments,
      depreciationRates,
      depreciationMethods,
      projectedRevenueYearTotals,
    })[configYearIndex] ?? 0

  const ownHasAnyHyp = Object.keys(adjustments).some((key) => {
    const parsed = parseCapexAdjustmentStorageKey(key)
    if (!parsed || parsed.rowId !== rowId) return false
    return adjustments[key]?.some(isCapexHypothesisGrowthAdjustment)
  })
  const lc = normalizeLinkCode(linkCode)
  const linkHasAnyHyp =
    !!lc &&
    lc !== rowId &&
    Object.keys(adjustments).some((key) => {
      const parsed = parseCapexAdjustmentStorageKey(key)
      if (!parsed || parsed.rowId !== lc) return false
      return adjustments[key]?.some(isCapexHypothesisGrowthAdjustment)
    })

  if (ownHasAnyHyp || hasCapexGrowthAdjustment(adjustments, rowId, configYearIndex)) {
    return tryBook(rowId, actualBase, openingCost, label)
  }
  if (linkHasAnyHyp || (lc && hasCapexGrowthAdjustment(adjustments, lc, configYearIndex))) {
    return tryBook(lc, actualBase, openingCost, label)
  }

  const parentCode = lc || normalizeLinkCode(rowId)
  if (!parentCode || !isCapexProjectionLinkCode(parentCode)) {
    return tryBook(rowId, actualBase, openingCost, label)
  }

  let sum = 0
  let any = false
  const seen = new Set<string>()

  for (const [key, list] of Object.entries(adjustments)) {
    const parsed = parseCapexAdjustmentStorageKey(key)
    if (!parsed) continue
    if (!list.some(isCapexHypothesisGrowthAdjustment)) continue

    const adjRowId =
      list.find(isCapexHypothesisGrowthAdjustment)?.rowId?.trim() || parsed.rowId
    if (!adjRowId || seen.has(adjRowId)) continue

    const storedLink = list.find(isCapexHypothesisGrowthAdjustment)?.linkCode
    const adjLink = resolveLinkCodeForCapexAdjRowId(adjRowId, peerRows, storedLink)
    if (!adjLink) continue
    if (adjLink !== parentCode && !linkCodeDescendsFrom(adjLink, parentCode)) continue

    const peer = peerRows.find((p) => p.rowId === adjRowId || p.linkCode === adjRowId)
    const book = peer?.actualBase ?? 0
    const cost = peer?.actualCostBase ?? book
    const peerLabel = peer?.label ?? ""
    seen.add(adjRowId)
    sum += tryBook(adjRowId, book, cost, peerLabel)
    any = true
  }

  if (any) return sum

  // Repli peers (structure sync) si la map d’ajustements n’a pas pu être reliée.
  for (const peer of peerRows) {
    if (peer.rowId === rowId) continue
    if (!linkCodeDescendsFrom(peer.linkCode, parentCode)) continue
    const peerHasHyp = Object.keys(adjustments).some((key) => {
      const parsed = parseCapexAdjustmentStorageKey(key)
      if (!parsed) return false
      if (parsed.rowId !== peer.rowId && parsed.rowId !== peer.linkCode) return false
      return adjustments[key]?.some(isCapexHypothesisGrowthAdjustment)
    })
    if (!peerHasHyp) continue
    const cost = peer.actualCostBase ?? peer.actualBase
    const resolveKey = hasCapexGrowthAdjustment(adjustments, peer.rowId, configYearIndex)
      ? peer.rowId
      : peer.linkCode && hasCapexGrowthAdjustment(adjustments, peer.linkCode, configYearIndex)
        ? peer.linkCode
        : peer.rowId
    sum += tryBook(resolveKey, peer.actualBase, cost, peer.label ?? "")
    any = true
  }
  if (any) return sum

  return tryBook(rowId, actualBase, openingCost, label)
}
