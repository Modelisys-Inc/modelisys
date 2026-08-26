/**
 * Résolution Hypothèses Capex (Estimation Capex ↔ Estimation du Bilan).
 *
 * Affichage projeté = valeur comptable (Coût − Amortissement cumulé).
 * Ajustement = ajout au Coût ; la dotation suit le taux / la méthode du poste.
 * Sans ajustement, la VNC se projette quand même via l’amortissement annuel.
 */

import {
  CAPEX_PROJECTION_LINK_CODE_ROOTS,
  capexProjectionParentRoot,
  isCapexProjectionLinkCode,
} from "@/lib/standard-link-code-utils"

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

/** Codes CDR (amortissement) choisis par poste Capex → Pro Forma Résultats. */
export function parseCapexAmortizationLinkCodes(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const code = String(value ?? "").trim().toUpperCase()
    if (code) out[key] = code
  }
  return out
}

export function parseCapexForecastConfig(data: unknown): {
  capexAdjustments: Record<string, CapexAdjustment[]>
  depreciationRates: Record<string, number>
  depreciationMethods: Record<string, CapexDepreciationMethod>
  amortizationLinkCodes: Record<string, string>
} {
  const raw = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {}
  return {
    capexAdjustments: parseCapexAdjustments(raw.capexAdjustments),
    depreciationRates: parseCapexDepreciationRates(raw.depreciationRates),
    depreciationMethods: parseCapexDepreciationMethods(raw.depreciationMethods),
    amortizationLinkCodes: parseCapexAmortizationLinkCodes(raw.amortizationLinkCodes),
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
  linkCode?: string | null,
): number {
  if (rates[rowId] !== undefined) return rates[rowId]!
  const lc = String(linkCode ?? "").trim()
  if (lc && rates[lc] !== undefined) return rates[lc]!
  return defaultCapexDepreciationRate(label)
}

export function resolveCapexDepreciationMethod(
  rowId: string,
  methods: Record<string, CapexDepreciationMethod>,
  linkCode?: string | null,
): CapexDepreciationMethod {
  if (methods[rowId]) return methods[rowId]!
  const lc = String(linkCode ?? "").trim()
  if (lc && methods[lc]) return methods[lc]!
  return "linear"
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

/** True si le code est la racine ou un descendant (ALT-B, ALT-B.1, …). */
export function linkCodeMatchesAssetRoot(code: string, root: string): boolean {
  const c = normalizeLinkCode(code)
  const r = normalizeLinkCode(root)
  if (!c || !r) return false
  return c === r || linkCodeDescendsFrom(c, r)
}

/**
 * Somme des ajouts Hypothèses Capex (ajustements) pour une famille ALT-B / ALT-C / ALT-D
 * à un index config (année 0 = 0).
 */
export function sumCapexAdditionsForAssetRoot(params: {
  root: string
  configYearIndex: number
  peerRows: CapexBilanPeerRow[]
  adjustments: Record<string, CapexAdjustment[]>
  projectedRevenueYearTotals?: number[] | null
}): number {
  const { root, configYearIndex, peerRows, adjustments, projectedRevenueYearTotals } = params
  if (configYearIndex <= 0) return 0
  const rootNorm = normalizeLinkCode(root)
  if (!rootNorm || !isCapexProjectionLinkCode(rootNorm)) return 0

  const underRoot = peerRows.filter((peer) => {
    const code = normalizeLinkCode(peer.linkCode) || normalizeLinkCode(peer.rowId)
    return !!code && linkCodeMatchesAssetRoot(code, rootNorm)
  })
  const leaves = underRoot.filter((peer) => isCapexPeerLeafAmongPeers(peer, peerRows))
  const targets = leaves.length > 0 ? leaves : underRoot

  return targets.reduce((sum, peer) => {
    const openingCost = peer.actualCostBase ?? peer.actualBase
    return (
      sum +
      resolveCapexAdditionsForYear(
        peer.rowId,
        configYearIndex,
        0,
        openingCost,
        adjustments,
        projectedRevenueYearTotals,
      )
    )
  }, 0)
}

/**
 * Racine Capex unique déduite des codes attachés CF (ALT-B / ALT-C / ALT-D).
 * Retourne null si aucun ou plusieurs racines distinctes.
 */
export function uniqueCapexAssetRootFromAttachedCodes(
  attachedLinkCodes: string[],
): (typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number] | null {
  const roots = new Set<(typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number]>()
  for (const raw of attachedLinkCodes) {
    const code = normalizeLinkCode(raw)
    if (!code) continue
    for (const root of CAPEX_PROJECTION_LINK_CODE_ROOTS) {
      if (linkCodeMatchesAssetRoot(code, root)) roots.add(root)
    }
  }
  if (roots.size !== 1) return null
  return [...roots][0]!
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
 * - rollforward propre si le poste a une hyp. ;
 * - sinon somme des VNC de **toutes** les feuilles Capex descendantes (même sans hyp.,
 *   comme Hypothèses Capex feuille par feuille) ;
 * - sinon repli sur la map d’ajustements (UUID sans peer) ;
 * - sinon VNC propre après amortissement seul (parent sans feuilles).
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

  const resolvePeerBookKey = (peer: CapexBilanPeerRow): string => {
    if (hasCapexGrowthAdjustment(adjustments, peer.rowId, configYearIndex)) return peer.rowId
    if (peer.linkCode && hasCapexGrowthAdjustment(adjustments, peer.linkCode, configYearIndex)) {
      return peer.linkCode
    }
    return peer.rowId
  }

  // Priorité : toutes les feuilles Capex sous ce parent (avec ou sans hyp.).
  const leafPeers = peerRows.filter((peer) => {
    if (peer.rowId === rowId) return false
    const peerCode = normalizeLinkCode(peer.linkCode) || normalizeLinkCode(peer.rowId)
    if (!peerCode) return false
    if (peerCode !== parentCode && !linkCodeDescendsFrom(peerCode, parentCode)) return false
    return isCapexPeerLeafAmongPeers(peer, peerRows)
  })

  if (leafPeers.length > 0) {
    return leafPeers.reduce((sum, peer) => {
      const cost = peer.actualCostBase ?? peer.actualBase
      return sum + tryBook(resolvePeerBookKey(peer), peer.actualBase, cost, peer.label ?? "")
    }, 0)
  }

  // Repli : map d’ajustements (ex. UUID sans peerRows).
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

  return tryBook(rowId, actualBase, openingCost, label)
}

/**
 * Remplace la VNC d’un parent Capex (ALT-B/C/D…) par la somme des VNC de ses feuilles
 * déjà calculées — même total qu’Estimation du Bilan.
 */
export function rollupCapexParentTrendsFromLeafRows<
  T extends {
    rowId?: string
    linkCode?: string | null
    trendValues?: number[]
    current?: number
    prior?: number
  },
>(rows: T[]): T[] {
  return rows.map((row) => {
    const parentCode = normalizeLinkCode(row.linkCode) || normalizeLinkCode(row.rowId)
    if (!parentCode || !isCapexProjectionLinkCode(parentCode)) return row
    if (!row.trendValues?.length) return row

    const leafChildren = rows.filter((other) => {
      if (!other.rowId || other.rowId === row.rowId || !other.trendValues?.length) return false
      const childCode = normalizeLinkCode(other.linkCode) || normalizeLinkCode(other.rowId)
      if (!childCode || !linkCodeDescendsFrom(childCode, parentCode)) return false
      const hasDescendant = rows.some((desc) => {
        if (!desc.rowId || desc.rowId === other.rowId) return false
        const descCode = normalizeLinkCode(desc.linkCode) || normalizeLinkCode(desc.rowId)
        return !!descCode && linkCodeDescendsFrom(descCode, childCode)
      })
      return !hasDescendant
    })

    if (leafChildren.length === 0) return row

    const trendValues = row.trendValues.map((_, idx) =>
      leafChildren.reduce((sum, child) => sum + (child.trendValues?.[idx] ?? 0), 0),
    )
    return {
      ...row,
      trendValues,
      current: trendValues[0] ?? row.current,
      prior: trendValues[1] ?? row.prior,
    }
  })
}

/** Codes CDR (Détail) sélectionnables pour la dotation Capex — immobilisations corporelles / biens loués. */
export const CAPEX_CORPORELLES_AMORT_IS_LINK_CODES = ["CMV.11", "EXP.20", "ADM.20"] as const

/** Codes CDR (Détail) sélectionnables pour la dotation Capex — actifs incorporels. */
export const CAPEX_INCORPORELS_AMORT_IS_LINK_CODES = ["EXP.21", "ADM.21"] as const

const CAPEX_AMORT_IS_LINK_CODES = [
  ...CAPEX_CORPORELLES_AMORT_IS_LINK_CODES,
  ...CAPEX_INCORPORELS_AMORT_IS_LINK_CODES,
] as const

export const CAPEX_AMORT_IS_LINK_CODE_LABELS: Record<string, string> = {
  "CMV.11": "Amortissement - Immobilisations corporelles",
  "EXP.20": "Amortissement - Immobilisations corporelles",
  "ADM.20": "Amortissement - Immobilisations corporelles",
  "EXP.21": "Amortissement - Actifs incorporels",
  "ADM.21": "Amortissement - Actifs incorporels",
}

export function isCapexDrivenAmortizationIsLinkCode(code: string | null | undefined): boolean {
  const normalized = normalizeLinkCode(code)
  if (!normalized) return false
  return CAPEX_AMORT_IS_LINK_CODES.some(
    (root) => normalized === root || normalized.startsWith(`${root}.`),
  )
}

/** Options de code CDR selon la famille Capex (ALT-B/C vs ALT-D). */
export function capexAmortIsLinkCodeOptionsForAsset(
  assetLinkCode: string | null | undefined,
): readonly string[] {
  const root = capexProjectionParentRoot(String(assetLinkCode ?? ""))
  if (root === "ALT-D") return CAPEX_INCORPORELS_AMORT_IS_LINK_CODES
  if (root === "ALT-B" || root === "ALT-C") return CAPEX_CORPORELLES_AMORT_IS_LINK_CODES
  return CAPEX_AMORT_IS_LINK_CODES
}

/** @deprecated Prefer per-row amortizationLinkCodes; kept for tests / docs. */
export function capexAssetRootsForAmortIsLinkCode(
  code: string | null | undefined,
): Array<(typeof CAPEX_PROJECTION_LINK_CODE_ROOTS)[number]> {
  const normalized = normalizeLinkCode(code)
  if (!normalized) return []
  if (
    CAPEX_CORPORELLES_AMORT_IS_LINK_CODES.some(
      (root) => normalized === root || normalized.startsWith(`${root}.`),
    )
  ) {
    return ["ALT-B", "ALT-C"]
  }
  if (
    CAPEX_INCORPORELS_AMORT_IS_LINK_CODES.some(
      (root) => normalized === root || normalized.startsWith(`${root}.`),
    )
  ) {
    return ["ALT-D"]
  }
  return []
}

export function resolveCapexAmortizationLinkCode(
  rowId: string,
  linkCode: string | null | undefined,
  map: Record<string, string>,
): string {
  const fromRow = normalizeLinkCode(map[rowId])
  if (fromRow) return fromRow
  const lc = normalizeLinkCode(linkCode)
  if (lc) {
    const fromLink = normalizeLinkCode(map[lc])
    if (fromLink) return fromLink
  }
  return ""
}

function isCapexPeerLeafAmongPeers(peer: CapexBilanPeerRow, peerRows: CapexBilanPeerRow[]): boolean {
  const parent = normalizeLinkCode(peer.linkCode) || normalizeLinkCode(peer.rowId)
  if (!parent) return false
  return !peerRows.some((other) => {
    if (other.rowId === peer.rowId) return false
    const child = normalizeLinkCode(other.linkCode) || normalizeLinkCode(other.rowId)
    return !!child && linkCodeDescendsFrom(child, parent)
  })
}

function depreciationExpenseForCapexKey(params: {
  key: string
  linkCode?: string | null
  openingBook: number
  openingCost: number
  label: string
  configYearIndex: number
  configYearCount: number
  adjustments: Record<string, CapexAdjustment[]>
  depreciationRates: Record<string, number>
  depreciationMethods: Record<string, CapexDepreciationMethod>
  projectedRevenueYearTotals?: number[] | null
}): number {
  if (params.configYearIndex <= 0) return 0
  const states = buildCapexAssetYearStates({
    rowId: params.key,
    configYearCount: params.configYearCount,
    openingCost: params.openingCost,
    openingBookValue: params.openingBook,
    adjustments: params.adjustments,
    ratePercent: resolveCapexDepreciationRate(
      params.key,
      params.label,
      params.depreciationRates,
      params.linkCode,
    ),
    method: resolveCapexDepreciationMethod(params.key, params.depreciationMethods, params.linkCode),
    projectedRevenueYearTotals: params.projectedRevenueYearTotals,
  })
  return states[params.configYearIndex]?.depreciationExpense ?? 0
}

/**
 * Dotation d’exercice (pas l’amort. cumulé) projetée pour un code amortissement CDR
 * = somme des dotations des postes Capex feuilles dont le Code sélectionné = ce code CDR.
 */
export function resolveCapexDrivenDepreciationExpense(params: {
  isLinkCode: string | null | undefined
  configYearIndex: number
  configYearCount: number
  adjustments: Record<string, CapexAdjustment[]>
  depreciationRates?: Record<string, number>
  depreciationMethods?: Record<string, CapexDepreciationMethod>
  amortizationLinkCodes?: Record<string, string>
  projectedRevenueYearTotals?: number[] | null
  peerRows: CapexBilanPeerRow[]
}): number {
  const {
    isLinkCode,
    configYearIndex,
    configYearCount,
    adjustments,
    depreciationRates = {},
    depreciationMethods = {},
    amortizationLinkCodes = {},
    projectedRevenueYearTotals,
    peerRows,
  } = params

  const target = normalizeLinkCode(isLinkCode)
  if (!target || configYearIndex <= 0) return 0

  const leafPeers = peerRows.filter((p) => isCapexPeerLeafAmongPeers(p, peerRows))
  const peerByKey = new Map<string, CapexBilanPeerRow>()
  for (const peer of leafPeers) {
    peerByKey.set(peer.rowId, peer)
    const lc = normalizeLinkCode(peer.linkCode)
    if (lc) peerByKey.set(lc, peer)
  }

  let sum = 0
  const seen = new Set<string>()

  const addPeerDep = (peer: CapexBilanPeerRow) => {
    if (seen.has(peer.rowId)) return
    seen.add(peer.rowId)
    const resolveKey = hasCapexGrowthAdjustment(adjustments, peer.rowId, configYearIndex)
      ? peer.rowId
      : peer.linkCode && hasCapexGrowthAdjustment(adjustments, peer.linkCode, configYearIndex)
        ? peer.linkCode
        : peer.rowId
    const cost = peer.actualCostBase ?? peer.actualBase
    sum += depreciationExpenseForCapexKey({
      key: resolveKey,
      linkCode: peer.linkCode,
      openingBook: peer.actualBase,
      openingCost: cost,
      label: peer.label ?? "",
      configYearIndex,
      configYearCount,
      adjustments,
      depreciationRates,
      depreciationMethods,
      projectedRevenueYearTotals,
    })
  }

  // 1) Partir des codes enregistrés (clés = rowId Capex et/ou linkCode ALT-*).
  for (const [key, code] of Object.entries(amortizationLinkCodes)) {
    if (normalizeLinkCode(code) !== target) continue
    const peer = peerByKey.get(key) ?? peerByKey.get(normalizeLinkCode(key))
    if (peer) addPeerDep(peer)
  }

  // 2) Repli : peers dont le code résolu matche (si seule une clé alias est présente).
  for (const peer of leafPeers) {
    const assigned = resolveCapexAmortizationLinkCode(
      peer.rowId,
      peer.linkCode,
      amortizationLinkCodes,
    )
    if (!assigned || assigned !== target) continue
    addPeerDep(peer)
  }

  return Math.round(sum)
}
