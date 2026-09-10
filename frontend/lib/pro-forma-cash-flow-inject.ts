/**
 * Injection des montants projetés dans le Flux de trésorerie pro forma :
 * - Bénéfice net / add-backs IS (amort., intérêts…) = Résultats pro forma
 * - Variation FDR = mêmes variation_nn1 / variation_n1n, soldes issus du Bilan pro forma
 */

import {
  forecastDisplayToConfigYearIndex,
  isForecastProjectedDisplayColumn,
  mergeConfigYearsOntoForecastDisplay,
  parseForecastColumnCalendarAnchor,
} from "@/lib/pro-forma-forecast-columns"
import { isCapexDrivenAmortizationIsLinkCode } from "@/lib/capex-forecast-resolve"
import { isDebtDrivenInterestIsLinkCode } from "@/lib/debt-forecast-resolve"
import {
  type CashFlowCalcMode,
} from "@/lib/cash-flow-detail-settings"
import { NET_INCOME_BALANCE_LINK_CODE } from "@/lib/standard-link-code-utils"

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

function normLabel(label: string): string {
  return stripAccents(label).trim().toLowerCase()
}

function structureLinkCode(sr: Record<string, unknown>): string {
  return String(sr.linkCode ?? sr.id ?? "").trim().toUpperCase()
}

export function isCashFlowNetIncomeRow(params: {
  label?: string | null
  linkCode?: string | null
  attachedLinkCodes?: string[]
}): boolean {
  const codes = [
    params.linkCode,
    ...(params.attachedLinkCodes ?? []),
  ]
    .map((c) => String(c ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (c) =>
        c === NET_INCOME_BALANCE_LINK_CODE ||
        c.startsWith(`${NET_INCOME_BALANCE_LINK_CODE}.`) ||
        c === "CAP-C.1",
    )
  ) {
    return true
  }
  const label = normLabel(String(params.label ?? ""))
  return label === "benefice net" || label === "benefices nets"
}

/** Versement / paiement de dividendes (CAP-C.2 ou libellé CF). */
export function isCashFlowDividendPaymentRow(params: {
  label?: string | null
  linkCode?: string | null
  attachedLinkCodes?: string[]
}): boolean {
  const codes = [params.linkCode, ...(params.attachedLinkCodes ?? [])]
    .map((c) => String(c ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (codes.some((c) => c === "CAP-C.2" || c.startsWith("CAP-C.2."))) return true
  const label = normLabel(String(params.label ?? ""))
  if (!label) return false
  if (label.includes("versement") && label.includes("dividende")) return true
  if (label.includes("paiement") && label.includes("dividende")) return true
  return label === "dividendes" || label === "dividende"
}

/**
 * Années projetées = −|dividendes| (décaissement) ; N-1 / YTD inchangés via preserve.
 */
export function buildProFormaDividendPaymentTrend(params: {
  baseTrend: number[] | undefined
  forecastActualCols: number
  displayYearCount: number
  dividendsForDisplayYear: (displayYearIndex: number) => number
}): number[] {
  const actualCols = Math.max(1, params.forecastActualCols)
  const len = Math.max(params.displayYearCount, params.baseTrend?.length ?? 0)
  const out = Array.from({ length: len }, (_, i) => params.baseTrend?.[i] ?? 0)
  for (let i = 0; i < len; i++) {
    if (!isForecastProjectedDisplayColumn(i, actualCols)) continue
    out[i] = -Math.abs(params.dividendsForDisplayYear(i) || 0)
  }
  return out
}

/** Postes IS « add-back » typiques (amort. → litige) : mode Réel côté CF. */
export function isCashFlowIsDrivenActualRow(params: {
  label?: string | null
  attachedLinkCodes?: string[]
  calcMode: CashFlowCalcMode
}): boolean {
  if (params.calcMode !== "actual") return false
  if (isCashFlowNetIncomeRow(params)) return false
  const attached = (params.attachedLinkCodes ?? []).map((c) => c.trim().toUpperCase()).filter(Boolean)
  if (attached.some((c) => isCapexDrivenAmortizationIsLinkCode(c) || isDebtDrivenInterestIsLinkCode(c))) {
    return true
  }
  if (attached.some((c) => c.startsWith("AUT") || c.startsWith("CMV.11") || c.startsWith("EXP.2") || c.startsWith("ADM.2") || c.startsWith("FIN."))) {
    return true
  }
  const label = normLabel(String(params.label ?? ""))
  if (!label) return false
  return (
    label.includes("amortissement") ||
    label.includes("perte (gain)") ||
    label.includes("perte(gain)") ||
    label.includes("reglement de litige") ||
    label.includes("cession d") ||
    label.startsWith("interet") ||
    label.startsWith("interets")
  )
}

export function isCashFlowWorkingCapitalVariationRow(calcMode: CashFlowCalcMode): boolean {
  return calcMode === "variation_nn1" || calcMode === "variation_n1n"
}

export function buildAttachedLinkCodesByCfCode(
  standardCodes: Array<{ code: string; attached_link_codes?: string[] }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const row of standardCodes) {
    const code = String(row.code ?? "").trim().toUpperCase()
    if (!code) continue
    const attached = (row.attached_link_codes ?? [])
      .map((c) => String(c ?? "").trim().toUpperCase())
      .filter(Boolean)
    map.set(code, attached)
  }
  return map
}

export function resolveAttachedLinkCodesForStructureRow(
  sr: Record<string, unknown>,
  attachedByCfCode: Map<string, string[]>,
): string[] {
  const linkCode = structureLinkCode(sr)
  if (!linkCode) return []
  return attachedByCfCode.get(linkCode) ?? []
}

/**
 * Somme des montants IS projetés pour les codes attachés (config year 1+).
 * Les codes non résolus contribuent 0 (aligné Résultats pro forma hors hyp.).
 */
export function sumProjectedIsAmountsForAttachedCodes(params: {
  attachedLinkCodes: string[]
  configYearIndex: number
  netIncomeByConfigYear: number[] | null | undefined
  resolveDepreciationExpense: (isLinkCode: string, configYearIndex: number) => number
  resolveInterestExpense: (isLinkCode: string, configYearIndex: number) => number
  /** Montants IS projetés optionnels (dépenses / revenus hyp.) par code. */
  resolveOtherIsAmount?: (isLinkCode: string, configYearIndex: number) => number
}): number {
  const {
    attachedLinkCodes,
    configYearIndex,
    netIncomeByConfigYear,
    resolveDepreciationExpense,
    resolveInterestExpense,
    resolveOtherIsAmount,
  } = params
  if (configYearIndex <= 0) return 0
  let sum = 0
  for (const raw of attachedLinkCodes) {
    const code = raw.trim().toUpperCase()
    if (!code) continue
    if (code === NET_INCOME_BALANCE_LINK_CODE || code.startsWith(`${NET_INCOME_BALANCE_LINK_CODE}.`)) {
      sum += netIncomeByConfigYear?.[configYearIndex] ?? 0
      continue
    }
    if (isCapexDrivenAmortizationIsLinkCode(code)) {
      sum += resolveDepreciationExpense(code, configYearIndex)
      continue
    }
    if (isDebtDrivenInterestIsLinkCode(code)) {
      sum += resolveInterestExpense(code, configYearIndex)
      continue
    }
    sum += resolveOtherIsAmount?.(code, configYearIndex) ?? 0
  }
  return sum
}

/** Remplace les années projetées d’un trend d’affichage par les montants config. */
export function mergeProjectedAmountsOntoDisplayTrend(
  baseTrend: number[],
  projectedByConfigYear: number[],
  forecastActualCols: number,
): number[] {
  return mergeConfigYearsOntoForecastDisplay(baseTrend, projectedByConfigYear, forecastActualCols)
}

/**
 * Conserve N-1 / YTD (déjà calculés comme le Cashflow Détail) et n’applique
 * `overrideTrend` que sur les années projetées.
 */
export function preserveForecastActualColumnsFromBase(params: {
  baseTrend: number[] | undefined
  overrideTrend: number[]
  forecastActualCols: number
}): number[] {
  const { baseTrend, overrideTrend, forecastActualCols } = params
  const actualCols = Math.max(1, forecastActualCols)
  const len = Math.max(baseTrend?.length ?? 0, overrideTrend.length)
  return Array.from({ length: len }, (_, i) => {
    if (i < actualCols && baseTrend && i < baseTrend.length) {
      return baseTrend[i] ?? 0
    }
    return overrideTrend[i] ?? 0
  })
}

/**
 * Construit le trend « Réel » projeté (montants IS) pour une ligne CF.
 * Index 0 config = 0 (réel déjà dans le préfixe d’affichage).
 */
export function buildProjectedIsDrivenConfigTrend(params: {
  projectionYears: number
  attachedLinkCodes: string[]
  netIncomeByConfigYear: number[] | null | undefined
  resolveDepreciationExpense: (isLinkCode: string, configYearIndex: number) => number
  resolveInterestExpense: (isLinkCode: string, configYearIndex: number) => number
  resolveOtherIsAmount?: (isLinkCode: string, configYearIndex: number) => number
  /** Ligne BN sans attachment explicite. */
  forceNetIncome?: boolean
}): number[] {
  const numYears = params.projectionYears + 1
  return Array.from({ length: numYears }, (_, cfg) => {
    if (cfg <= 0) return 0
    if (params.forceNetIncome) return params.netIncomeByConfigYear?.[cfg] ?? 0
    return sumProjectedIsAmountsForAttachedCodes({
      attachedLinkCodes: params.attachedLinkCodes,
      configYearIndex: cfg,
      netIncomeByConfigYear: params.netIncomeByConfigYear,
      resolveDepreciationExpense: params.resolveDepreciationExpense,
      resolveInterestExpense: params.resolveInterestExpense,
      resolveOtherIsAmount: params.resolveOtherIsAmount,
    })
  })
}

/**
 * Index d’ouverture pour une variation Pro Forma :
 * - YTD → N-1 (index 0)
 * - 1re année projetée → N-1 (index 0), jamais le YTD
 * - années projetées suivantes → année pleine précédente (index i − 1)
 */
export function priorDisplayIndexForProFormaCashFlowVariation(
  displayIndex: number,
  forecastActualCols: number,
): number | null {
  const actualCols = Math.max(1, forecastActualCols)
  if (displayIndex <= 0) return null
  if (displayIndex < actualCols) return 0
  if (displayIndex === actualCols) return 0
  return displayIndex - 1
}

/**
 * Variations FDR / investissement / financement Pro Forma à partir des soldes Bilan.
 * 1re année projetée = solde_t − solde_N−1 ; ensuite solde_t − solde_{t−1}.
 */
export function applyProFormaVariationFromBilanBalances(params: {
  mode: "variation_nn1" | "variation_n1n"
  bilanBalanceByDisplayYear: number[]
  forecastActualCols: number
}): number[] {
  const { mode, bilanBalanceByDisplayYear, forecastActualCols } = params
  const len = bilanBalanceByDisplayYear.length
  return Array.from({ length: len }, (_, i) => {
    const priorIdx = priorDisplayIndexForProFormaCashFlowVariation(i, forecastActualCols)
    const current = bilanBalanceByDisplayYear[i] ?? 0
    const prior = priorIdx == null ? 0 : (bilanBalanceByDisplayYear[priorIdx] ?? 0)
    if (mode === "variation_nn1") return current - prior
    return prior - current
  })
}

/**
 * Remplit les colonnes réelles (N-1 / YTD) depuis le calendrier série seulement
 * si le solde bilan est encore vide — ne jamais écraser un solde BS déjà résolu.
 */
export function mergeSeriesSnapshotsIntoBilanBalanceTrend(params: {
  bilanBalanceByDisplayYear: number[]
  amountByCalendarMonth: Map<string, number>
  trendLabels: string[]
  forecastActualCols: number
  fiscalYearEndMonth: number
  forecastRefMonth: number
}): number[] {
  const {
    bilanBalanceByDisplayYear,
    amountByCalendarMonth,
    trendLabels,
    forecastActualCols,
    fiscalYearEndMonth,
    forecastRefMonth,
  } = params
  return bilanBalanceByDisplayYear.map((balance, i) => {
    if (isForecastProjectedDisplayColumn(i, forecastActualCols)) return balance
    if (balance !== 0 && Number.isFinite(balance)) return balance
    const label = trendLabels[i]
    if (!label) return balance
    const anchor = parseForecastColumnCalendarAnchor(label, forecastRefMonth, fiscalYearEndMonth)
    if (!anchor) return balance
    const fromSeries = amountByCalendarMonth.get(`${anchor.year}-${anchor.month}`)
    if (fromSeries == null || !Number.isFinite(fromSeries)) return balance
    return fromSeries
  })
}

/**
 * Sans driver d’hypothèse, le solde projeté = ouverture (N-1 puis année précédente)
 * pour que la variation CF soit 0 $ (ex. capital-actions inchangé).
 */
export function carryForwardBilanBalancesWithoutProjection(params: {
  balances: number[]
  forecastActualCols: number
  yearHasExplicitProjection: boolean[]
}): number[] {
  const { balances, forecastActualCols, yearHasExplicitProjection } = params
  const actualCols = Math.max(1, forecastActualCols)
  const out = balances.map((b) => b)
  for (let i = actualCols; i < out.length; i++) {
    if (yearHasExplicitProjection[i]) continue
    const opening = i === actualCols ? (out[0] ?? 0) : (out[i - 1] ?? 0)
    out[i] = opening
  }
  return out
}

/**
 * Dispositions (acquisitions) Capex : années projetées = ± somme des ajustements Capex
 * (N−1 − N → signe négatif des ajouts = sortie de fonds).
 * Colonnes réelles conservées depuis le trend historique.
 */
export function applyProFormaCapexAdditionsToTrend(params: {
  baseTrend: number[]
  forecastActualCols: number
  mode: "variation_nn1" | "variation_n1n"
  additionsByConfigYear: number[]
}): number[] {
  const { baseTrend, forecastActualCols, mode, additionsByConfigYear } = params
  const actualCols = Math.max(1, forecastActualCols)
  return baseTrend.map((value, i) => {
    if (!isForecastProjectedDisplayColumn(i, actualCols)) return value
    const cfg = forecastDisplayToConfigYearIndex(i, actualCols)
    if (cfg == null) return value
    const additions = additionsByConfigYear[cfg] ?? 0
    return mode === "variation_n1n" ? -additions : additions
  })
}

/**
 * Position nette impôts exigibles (Passif − Actif) pour variation CF.
 */
export function taxExigibleNetBalanceTrend(params: {
  assetBalances: number[]
  liabilityBalances: number[]
}): number[] {
  const len = Math.max(params.assetBalances.length, params.liabilityBalances.length)
  return Array.from(
    { length: len },
    (_, i) => (params.liabilityBalances[i] ?? 0) - (params.assetBalances[i] ?? 0),
  )
}

/**
 * @deprecated Préférer `applyProFormaVariationFromBilanBalances` (ancre N-1 explicite).
 */
export function applyProFormaWorkingCapitalVariationTrend(params: {
  baseTrend: number[]
  trendLabels: string[]
  mode: "variation_nn1" | "variation_n1n"
  /** Soldes bilan (pas la variation) par index d’affichage. */
  bilanBalanceByDisplayYear: number[]
  amountByCalendarMonth: Map<string, number>
  forecastActualCols: number
  fiscalYearEndMonth: number
  forecastRefMonth?: number
}): number[] {
  const refMonth = params.forecastRefMonth ?? params.fiscalYearEndMonth
  const balances = mergeSeriesSnapshotsIntoBilanBalanceTrend({
    bilanBalanceByDisplayYear: params.bilanBalanceByDisplayYear,
    amountByCalendarMonth: params.amountByCalendarMonth,
    trendLabels: params.trendLabels,
    forecastActualCols: params.forecastActualCols,
    fiscalYearEndMonth: params.fiscalYearEndMonth,
    forecastRefMonth: refMonth,
  })
  return applyProFormaVariationFromBilanBalances({
    mode: params.mode,
    bilanBalanceByDisplayYear: balances,
    forecastActualCols: params.forecastActualCols,
  })
}

/** Variante avec forecastActualCols pour ne forcer les soldes projetés. */
export function injectBilanBalancesIntoCalendarForProjectedYears(params: {
  amountByCalendarMonth: Map<string, number>
  trendLabels: string[]
  bilanBalanceByDisplayYear: number[]
  forecastActualCols: number
  fiscalYearEndMonth: number
  /** Mois de référence (ancre YTD) ; défaut = clôture. */
  forecastRefMonth?: number
}): Map<string, number> {
  const refMonth = params.forecastRefMonth ?? params.fiscalYearEndMonth
  const calendar = new Map(params.amountByCalendarMonth)
  for (let i = 0; i < params.trendLabels.length; i++) {
    if (!isForecastProjectedDisplayColumn(i, params.forecastActualCols)) continue
    const label = params.trendLabels[i]!
    const anchor = parseForecastColumnCalendarAnchor(
      label,
      refMonth,
      params.fiscalYearEndMonth,
    )
    if (!anchor) continue
    const balance = params.bilanBalanceByDisplayYear[i]
    if (balance == null || !Number.isFinite(balance)) continue
    calendar.set(`${anchor.year}-${anchor.month}`, balance)
  }
  return calendar
}

export function patchDisplayTrendProjectedYears(
  trend: number[] | undefined,
  displayYearIndex: number,
  forecastActualCols: number,
  value: number,
): number[] | undefined {
  if (!trend) return trend
  if (!isForecastProjectedDisplayColumn(displayYearIndex, forecastActualCols)) return trend
  const next = [...trend]
  next[displayYearIndex] = value
  return next
}

export function configYearIndexForDisplay(
  displayYearIndex: number,
  forecastActualCols: number,
): number | null {
  return forecastDisplayToConfigYearIndex(displayYearIndex, forecastActualCols)
}
