import { isCapexProjectionLinkCode, isFinancingBilanLinkCode } from "@/lib/standard-link-code-utils"
import { isForecastProjectedDisplayColumn } from "@/lib/pro-forma-forecast-columns"

export const BILAN_FORECAST_CONFIG_TYPE = "balance-sheet-forecast"
export const BILAN_HYPOTHESIS_TITLE = "Estimation du Bilan annuel"
export const ENCAISSE_LINK_CODE = "ACT-A.1"
/** Plan standard : PCT-A = Découvert bancaire (lié Trésorerie à la fin comme Encaisse). */
export const DECOUVERT_LINK_CODE_ROOT = "PCT-A"
/** Plan standard : ACT-C = Comptes clients (pas ACT-B, qui est Placements temporaires). */
export const COMPTES_CLIENTS_LINK_CODE_ROOT = "ACT-C"
/** Plan standard : ACT-F = Stocks. */
export const STOCKS_LINK_CODE_ROOT = "ACT-F"
/** Plan standard : PCT-C = Créditeurs (PCT-A = Découvert bancaire). */
export const CREDITEURS_LINK_CODE_ROOT = "PCT-C"
/** Plan standard : PCT-D = Créditeurs - Apparentés. */
export const CREDITEURS_APPARENTES_LINK_CODE_ROOT = "PCT-D"
/** Plan standard : CAP-C = Bénéfices non répartis. */
export const RETAINED_EARNINGS_LINK_CODE_ROOT = "CAP-C"

/** Plan standard : CAP-C.2 = Dividendes (saisie via le panneau CAP-C). */
export const DIVIDENDS_LINK_CODE = "CAP-C.2"

/** Plan standard : ACT-H = Actif d'impôts exigibles (Hypothèses Impôts). */
export const TAX_ASSET_LINK_CODE_ROOT = "ACT-H"
/** Plan standard : PCT-FF = Passif d'impôts exigibles (Hypothèses Impôts). */
export const TAX_LIABILITY_LINK_CODE_ROOT = "PCT-FF"
/** Plan standard : PCT-PD = Produits reportés. */
export const PRODUITS_REPORTES_LINK_CODE_ROOT = "PCT-PD"

export type BilanAdjustmentType =
  | "amount"
  | "collectionDays"
  | "revenuePercent"
  | "inventoryDays"
  | "paymentDays"
  | "dividends"

export interface BilanAdjustment {
  id: string
  rowId: string
  yearIndex: number
  type: BilanAdjustmentType
  value: number
  isRecurring: boolean
  note: string
}

export type ComptesClientsHistoryYear = {
  year: number
  ar: number
  revenue: number
  collectionDays: number | null
  revenuePercent: number | null
}

export type StocksHistoryYear = {
  year: number
  stocks: number
  cmv: number
  revenue: number
  inventoryDays: number | null
  revenuePercent: number | null
}

export type CrediteursHistoryYear = {
  year: number
  ap: number
  cmv: number
  revenue: number
  paymentDays: number | null
  revenuePercent: number | null
}

export type ActRevenuePercentHistoryYear = {
  year: number
  amount: number
  revenue: number
  revenuePercent: number | null
}

export type RetainedEarningsHistoryYear = {
  year: number
  retainedEarnings: number
  netIncome: number
  dividends: number | null
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

/** Famille ACT (actif courant) : ACT, ACT-A, ACT-A.2, ACT-D.1, … */
export function isActFamilyLinkCode(code: string | null | undefined): boolean {
  const c = String(code ?? "")
    .trim()
    .toUpperCase()
  return c === "ACT" || c.startsWith("ACT-")
}

export function isEncaisseBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (codes.includes(ENCAISSE_LINK_CODE) || codes.includes("ACT-A")) return true
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label === "encaisse"
}

/** Découvert bancaire (PCT-A) : même lien Trésorerie à la fin que Encaisse. */
export function isDecouvertBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) => code === DECOUVERT_LINK_CODE_ROOT || code.startsWith(`${DECOUVERT_LINK_CODE_ROOT}.`),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label === "decouvert bancaire" || label.startsWith("decouvert bancaire")
}

/** Encaisse ou Découvert — pilotés par Trésorerie à la fin. */
export function isTreasuryEndingCashDrivenBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  return isEncaisseBilanRow(params) || isDecouvertBilanRow(params)
}

export function isComptesClientsBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) =>
        code === COMPTES_CLIENTS_LINK_CODE_ROOT || code.startsWith(`${COMPTES_CLIENTS_LINK_CODE_ROOT}.`),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  if (label.includes("fournisseur")) return false
  return label === "comptes clients" || label.startsWith("comptes clients")
}

export function isStocksBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) => code === STOCKS_LINK_CODE_ROOT || code.startsWith(`${STOCKS_LINK_CODE_ROOT}.`),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label === "stocks" || label.startsWith("stocks")
}

export function isCrediteursBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) =>
        code === CREDITEURS_LINK_CODE_ROOT || code.startsWith(`${CREDITEURS_LINK_CODE_ROOT}.`),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  if (label.includes("apparent")) return false
  return (
    label === "crediteurs" ||
    label.startsWith("crediteurs") ||
    label === "comptes fournisseurs" ||
    label.startsWith("comptes fournisseurs") ||
    label === "fournisseurs" ||
    label.startsWith("fournisseurs")
  )
}

/** Créditeurs - Apparentés (PCT-D) : mêmes drivers que Créditeurs (délai / % CA). */
export function isCrediteursApparentesBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) =>
        code === CREDITEURS_APPARENTES_LINK_CODE_ROOT ||
        code.startsWith(`${CREDITEURS_APPARENTES_LINK_CODE_ROOT}.`),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label.includes("apparent") && label.includes("crediteur")
}

/** Créditeurs fournisseurs ou apparentés — même panneau / résolution. */
export function isCrediteursLikeBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  return isCrediteursBilanRow(params) || isCrediteursApparentesBilanRow(params)
}

/** Postes ALT-B / ALT-C / ALT-D pilotés par Hypothèses Capex (non ajustables au bilan). */
export function isCapexDrivenBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
}): boolean {
  return [params.linkCode, params.rowId].some(
    (code) => typeof code === "string" && isCapexProjectionLinkCode(code),
  )
}

/**
 * Portions CT dette / location + dettes LT / obligations location — Hypothèses Financement.
 */
export function isFinancingDrivenBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
}): boolean {
  return [params.linkCode, params.rowId].some(
    (code) => typeof code === "string" && isFinancingBilanLinkCode(code),
  )
}

/** Capex ou Financement — montants issus d’une hyp. externe (non ajustables au bilan). */
export function isExternalForecastDrivenBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  return (
    isCapexDrivenBilanRow(params) ||
    isFinancingDrivenBilanRow(params) ||
    isTaxDrivenBilanRow(params)
  )
}

/** Actif / passif d’impôts exigibles — pilotés par Hypothèses Impôts (non ajustables au bilan). */
export function isTaxDrivenBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  return isTaxAssetBilanRow(params) || isTaxLiabilityBilanRow(params)
}

export function isTaxAssetBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) =>
        code === TAX_ASSET_LINK_CODE_ROOT || code.startsWith(`${TAX_ASSET_LINK_CODE_ROOT}.`),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label.includes("actif") && label.includes("impot") && label.includes("exigib")
}

export function isTaxLiabilityBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) =>
        code === TAX_LIABILITY_LINK_CODE_ROOT ||
        code.startsWith(`${TAX_LIABILITY_LINK_CODE_ROOT}.`),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return (
    (label.includes("passif") && label.includes("impot") && label.includes("exigib")) ||
    label.includes("impots a payer") ||
    label.includes("impot a payer")
  )
}

/**
 * Soldes projetés Actif / Passif d’impôts exigibles (liés) :
 * net_t = Impôts_pro_forma_t + Passif_{t-1} − Actif_{t-1} − Impôts_{t-1} payés
 * (ouverture 1re année = N-1 / exercice complet, comme BNR ;
 *  impôts payés = charge N-1 complète pour la 1re année projetée, puis charge
 *  projetée de l’année précédente — horizon annuel = 100 % versé).
 * net > 0 → Passif = net, Actif = 0 ;
 * net < 0 → Actif = |net|, Passif = 0.
 */
export function resolveTaxExigibleProjectedValue(params: {
  side: "asset" | "liability"
  yearIndex: number
  forecastActualCols: number
  taxExpenseByDisplayYear: number[]
  assetBaseTrend: number[]
  liabilityBaseTrend: number[]
  /** Impôts de la période précédente payés dans l’année (par index d’affichage projeté). */
  taxPaidByDisplayYear?: number[]
}): number {
  const {
    side,
    yearIndex,
    forecastActualCols,
    taxExpenseByDisplayYear,
    assetBaseTrend,
    liabilityBaseTrend,
    taxPaidByDisplayYear,
  } = params
  const actualCols = Math.max(1, forecastActualCols)
  if (yearIndex < actualCols) {
    return side === "asset"
      ? (assetBaseTrend[yearIndex] ?? 0)
      : (liabilityBaseTrend[yearIndex] ?? 0)
  }

  let asset = Math.abs(assetBaseTrend[0] ?? 0)
  let liability = Math.abs(liabilityBaseTrend[0] ?? 0)
  for (let y = actualCols; y <= yearIndex; y++) {
    const tax = taxExpenseByDisplayYear[y] ?? 0
    const taxPaid =
      taxPaidByDisplayYear?.[y] ??
      // Repli : 1re année projetée = impôts N-1 (colonne 0) ; sinon charge de l’année précédente.
      Math.abs(
        y === actualCols
          ? (taxExpenseByDisplayYear[0] ?? 0)
          : (taxExpenseByDisplayYear[y - 1] ?? 0),
      )
    const net = tax + liability - asset - taxPaid
    if (net > 0) {
      liability = net
      asset = 0
    } else if (net < 0) {
      asset = -net
      liability = 0
    } else {
      asset = 0
      liability = 0
    }
  }
  return side === "asset" ? asset : liability
}

/** Produits reportés (PCT-PD / PD) — Montant $ ou % des revenus. */
export function isProduitsReportesBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (
    codes.some(
      (code) =>
        code === PRODUITS_REPORTES_LINK_CODE_ROOT ||
        code.startsWith(`${PRODUITS_REPORTES_LINK_CODE_ROOT}.`) ||
        code === "PD" ||
        code.startsWith("PD."),
    )
  ) {
    return true
  }
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label === "produits reportes" || label.startsWith("produits reportes")
}

/**
 * Postes ACT (hors encaisse / clients / stocks) ou Produits reportés :
 * Montant $ ou % des revenus.
 */
export function isRevenuePercentAdjustableBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  return isOtherActBilanRow(params) || isProduitsReportesBilanRow(params)
}

/** Bénéfices non répartis (CAP-C) — bénéfice de la période + dividendes. */
export function isRetainedEarningsBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  // Exact CAP-C only (pas CAP-C.1 bénéfice net calculé, ni CAP-C.2 feuilles).
  if (codes.some((code) => code === RETAINED_EARNINGS_LINK_CODE_ROOT)) return true
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label === "benefices non repartis" || label === "benefice non reparti"
}

/**
 * Dividendes applicables à une année d’affichage (dernier driver `dividends`).
 * Colonnes réelles (index 0, et YTD si présent) → 0.
 */
export function dividendsForBilanYear(
  adjustments: BilanAdjustment[],
  yearIndex: number,
  forecastActualCols = 1,
): number {
  if (!isForecastProjectedDisplayColumn(yearIndex, forecastActualCols)) return 0
  const driver = [...adjustments]
    .filter((adj) => adjustmentAppliesToYear(adj, yearIndex) && adj.type === "dividends")
    .reverse()[0]
  return driver && Number.isFinite(driver.value) ? Math.max(0, driver.value) : 0
}

/** Dividendes hyp. BNR dans la map d’ajustements (clé = rowId CAP-C ou code). */
export function dividendsFromBilanAdjustmentsMap(
  adjustments: Record<string, BilanAdjustment[]>,
  displayYearIndex: number,
  forecastActualCols = 1,
): number {
  let fromRe = 0
  let fromAny = 0
  for (const [key, list] of Object.entries(adjustments)) {
    const d = dividendsForBilanYear(list, displayYearIndex, forecastActualCols)
    if (!d) continue
    if (isRetainedEarningsBilanRow({ rowId: key, linkCode: key })) {
      fromRe = d
    } else {
      fromAny = d
    }
  }
  return fromRe || fromAny
}

/**
 * Solde d’ouverture BNR pour une année d’affichage projetée :
 * - 1re année projetée : clôture du dernier exercice complet
 *   (index 0 = N-1 si colonnes N-1+YTD partiel ; sinon l’unique colonne réelle = exercice complet / « YTD 12 mois »)
 * - années suivantes : BNR projeté de l’année précédente (ex. 2027 ← solde 2026)
 */
export function retainedEarningsOpeningForProjectedYear(params: {
  baseTrend: number[]
  yearIndex: number
  adjustments: BilanAdjustment[]
  periodNetIncomeByDisplayYear: number[]
  forecastActualCols: number
}): number {
  const { baseTrend, yearIndex, forecastActualCols } = params
  const actualCols = Math.max(1, forecastActualCols)
  if (yearIndex < actualCols) return baseTrend[yearIndex] ?? 0
  if (yearIndex === actualCols) return baseTrend[0] ?? 0
  return resolveRetainedEarningsProjectedValue({
    ...params,
    yearIndex: yearIndex - 1,
  })
}

/**
 * Solde projeté Bénéfices non répartis :
 * RE_t = ouverture_t + Bénéfice de la période_t − Dividendes_t
 * (enchaîné : 1re année depuis l’exercice complet, puis depuis le BNR projeté précédent).
 */
export function resolveRetainedEarningsProjectedValue(params: {
  baseTrend: number[]
  yearIndex: number
  adjustments: BilanAdjustment[]
  /** Bénéfice net de la période par index d’affichage. */
  periodNetIncomeByDisplayYear: number[]
  forecastActualCols: number
}): number {
  const { baseTrend, yearIndex, adjustments, periodNetIncomeByDisplayYear, forecastActualCols } =
    params
  const actualCols = Math.max(1, forecastActualCols)
  if (yearIndex < actualCols) return baseTrend[yearIndex] ?? 0

  // Exercice complet avant projection (N-1, ou seule colonne réelle si réf. = clôture).
  let re = baseTrend[0] ?? 0
  for (let y = actualCols; y <= yearIndex; y++) {
    const ni = periodNetIncomeByDisplayYear[y] ?? 0
    const div = dividendsForBilanYear(adjustments, y, actualCols)
    re = re + ni - div
  }
  return re
}

/**
 * Autres postes ACT (hors Encaisse, Comptes clients, Stocks) : Montant $ ou % des revenus.
 */
export function isOtherActBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  if (
    isEncaisseBilanRow(params) ||
    isComptesClientsBilanRow(params) ||
    isStocksBilanRow(params)
  ) {
    return false
  }
  return [params.linkCode, params.rowId].some((code) => isActFamilyLinkCode(code))
}

/**
 * Titres de section du bilan (Actif, Passif, Capitaux propres, …) :
 * pas de montants ni d’ajustement en Estimation du Bilan annuel.
 */
export function isHypothesisBilanSectionHeaderRow(params: {
  label: string
  isSection?: boolean
  isSubtotal?: boolean
  hasLiaisonCode?: boolean
  linkCode?: string | null
}): boolean {
  if (params.isSection) return true
  if (params.isSubtotal) return false
  if (params.hasLiaisonCode) return false
  if (String(params.linkCode ?? "").trim()) return false
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  if (!label || /^total\b/.test(label)) return false
  const headers = new Set([
    "actif",
    "actifs",
    "actif court terme",
    "actif a court terme",
    "actifs court terme",
    "actifs a court terme",
    "actif long terme",
    "actif a long terme",
    "actifs long terme",
    "actifs a long terme",
    "passif",
    "passifs",
    "passif court terme",
    "passif a court terme",
    "passifs court terme",
    "passifs a court terme",
    "passif long terme",
    "passif a long terme",
    "passifs long terme",
    "passifs a long terme",
    "capitaux propres",
    "avoir des actionnaires",
  ])
  return headers.has(label)
}

/** Sous-total d’hypothèse bilan : isResult, formule, ou libellé « Total … ». */
export function isHypothesisBilanSubtotalRow(params: {
  label: string
  isSection?: boolean
  isResult?: boolean
  isBold?: boolean
  hasFormula?: boolean
  hasLiaisonCode?: boolean
  linkCode?: string | null
}): boolean {
  if (params.isSection) return false
  if (params.isResult || params.hasFormula) return true
  const label = String(params.label ?? "").trim()
  if (!/^total\b/i.test(label)) return false
  // Poste mappé nommé « Total … » : traiter comme feuille si code de liaison.
  if (params.hasLiaisonCode || String(params.linkCode ?? "").trim()) {
    return !!params.isBold
  }
  return true
}

export function collectionDaysFromArAndRevenue(ar: number, revenue: number): number | null {
  if (!Number.isFinite(ar) || !Number.isFinite(revenue) || revenue === 0) return null
  return (Math.abs(ar) / Math.abs(revenue)) * 365
}

export function revenuePercentFromArAndRevenue(ar: number, revenue: number): number | null {
  if (!Number.isFinite(ar) || !Number.isFinite(revenue) || revenue === 0) return null
  return (Math.abs(ar) / Math.abs(revenue)) * 100
}

export function inventoryDaysFromStockAndCmv(stocks: number, cmv: number): number | null {
  if (!Number.isFinite(stocks) || !Number.isFinite(cmv) || cmv === 0) return null
  return (Math.abs(stocks) / Math.abs(cmv)) * 365
}

/** DPO : créditeurs / CMV × 365. */
export function paymentDaysFromApAndCmv(ap: number, cmv: number): number | null {
  return inventoryDaysFromStockAndCmv(ap, cmv)
}

export function comptesClientsAmountFromDriver(params: {
  type: "collectionDays" | "revenuePercent"
  value: number
  revenue: number
}): number {
  if (!Number.isFinite(params.value) || !Number.isFinite(params.revenue) || params.revenue === 0) return 0
  if (params.type === "collectionDays") return params.revenue * (params.value / 365)
  return params.revenue * (params.value / 100)
}

export function stocksAmountFromDriver(params: {
  type: "inventoryDays" | "revenuePercent"
  value: number
  /** CMV pour le délai de rotation ; CA pour le % des revenus. */
  baseAmount: number
}): number {
  if (!Number.isFinite(params.value) || !Number.isFinite(params.baseAmount) || params.baseAmount === 0) {
    return 0
  }
  if (params.type === "inventoryDays") return params.baseAmount * (params.value / 365)
  return params.baseAmount * (params.value / 100)
}

export function crediteursAmountFromDriver(params: {
  type: "paymentDays" | "revenuePercent"
  value: number
  /** CMV pour le délai de paiement ; CA pour le % des revenus. */
  baseAmount: number
}): number {
  if (!Number.isFinite(params.value) || !Number.isFinite(params.baseAmount) || params.baseAmount === 0) {
    return 0
  }
  if (params.type === "paymentDays") return params.baseAmount * (params.value / 365)
  return params.baseAmount * (params.value / 100)
}

export function lastTwoFiscalYears(lastActualYear: number): [number, number] {
  return [lastActualYear - 1, lastActualYear]
}

export function buildComptesClientsHistory(params: {
  lastActualYear: number
  arByYear: Record<number, number>
  revenueByYear: Record<number, number>
}): ComptesClientsHistoryYear[] {
  return lastTwoFiscalYears(params.lastActualYear).map((year) => {
    const ar = params.arByYear[year] ?? 0
    const revenue = params.revenueByYear[year] ?? 0
    return {
      year,
      ar,
      revenue,
      collectionDays: collectionDaysFromArAndRevenue(ar, revenue),
      revenuePercent: revenuePercentFromArAndRevenue(ar, revenue),
    }
  })
}

export function buildStocksHistory(params: {
  lastActualYear: number
  stocksByYear: Record<number, number>
  cmvByYear: Record<number, number>
  revenueByYear: Record<number, number>
}): StocksHistoryYear[] {
  return lastTwoFiscalYears(params.lastActualYear).map((year) => {
    const stocks = params.stocksByYear[year] ?? 0
    const cmv = params.cmvByYear[year] ?? 0
    const revenue = params.revenueByYear[year] ?? 0
    return {
      year,
      stocks,
      cmv,
      revenue,
      inventoryDays: inventoryDaysFromStockAndCmv(stocks, cmv),
      revenuePercent: revenuePercentFromArAndRevenue(stocks, revenue),
    }
  })
}

export function buildCrediteursHistory(params: {
  lastActualYear: number
  apByYear: Record<number, number>
  cmvByYear: Record<number, number>
  revenueByYear: Record<number, number>
}): CrediteursHistoryYear[] {
  return lastTwoFiscalYears(params.lastActualYear).map((year) => {
    const ap = params.apByYear[year] ?? 0
    const cmv = params.cmvByYear[year] ?? 0
    const revenue = params.revenueByYear[year] ?? 0
    return {
      year,
      ap,
      cmv,
      revenue,
      paymentDays: paymentDaysFromApAndCmv(ap, cmv),
      revenuePercent: revenuePercentFromArAndRevenue(ap, revenue),
    }
  })
}

export function buildActRevenuePercentHistory(params: {
  lastActualYear: number
  amountByYear: Record<number, number>
  revenueByYear: Record<number, number>
}): ActRevenuePercentHistoryYear[] {
  return lastTwoFiscalYears(params.lastActualYear).map((year) => {
    const amount = params.amountByYear[year] ?? 0
    const revenue = params.revenueByYear[year] ?? 0
    return {
      year,
      amount,
      revenue,
      revenuePercent: revenuePercentFromArAndRevenue(amount, revenue),
    }
  })
}

/** Dividendes implicites : RE_{t−1} + BN_t − RE_t (≥ 0). */
export function dividendsFromRetainedEarningsFlow(
  priorRetainedEarnings: number | undefined,
  netIncome: number,
  retainedEarnings: number,
): number | null {
  if (priorRetainedEarnings == null || !Number.isFinite(priorRetainedEarnings)) return null
  const derived = priorRetainedEarnings + netIncome - retainedEarnings
  return Number.isFinite(derived) ? Math.max(0, derived) : null
}

export function buildRetainedEarningsHistory(params: {
  lastActualYear: number
  reByYear: Record<number, number>
  netIncomeByYear: Record<number, number>
  dividendsByYear?: Record<number, number>
}): RetainedEarningsHistoryYear[] {
  return lastTwoFiscalYears(params.lastActualYear).map((year) => {
    const retainedEarnings = params.reByYear[year] ?? 0
    const netIncome = params.netIncomeByYear[year] ?? 0
    const explicit = params.dividendsByYear?.[year]
    const dividends =
      explicit != null && Number.isFinite(explicit)
        ? Math.max(0, explicit)
        : dividendsFromRetainedEarningsFlow(params.reByYear[year - 1], netIncome, retainedEarnings)
    return { year, retainedEarnings, netIncome, dividends }
  })
}

export function lastRetainedEarningsHistoryDividends(
  history: RetainedEarningsHistoryYear[],
): number {
  const last = history[history.length - 1]
  return last?.dividends != null && Number.isFinite(last.dividends) ? last.dividends : 0
}

export function adjustmentAppliesToYear(adj: BilanAdjustment, yearIndex: number): boolean {
  if (yearIndex <= 0) return false
  if (adj.yearIndex === yearIndex) return true
  return adj.isRecurring && adj.yearIndex > 0 && adj.yearIndex < yearIndex
}

export function resolveBilanAdjustedValue(
  baseTrend: number[],
  yearIndex: number,
  adjustments: BilanAdjustment[],
): number {
  const base = baseTrend[yearIndex] ?? 0
  if (yearIndex <= 0) return base
  let extra = 0
  for (const adj of adjustments) {
    if (!adjustmentAppliesToYear(adj, yearIndex)) continue
    if (adj.type !== "amount") continue
    extra += adj.value
  }
  return base + extra
}

export function revenueForComptesClientsYear(
  yearIndex: number,
  projectedRevenueByYear: number[] | null | undefined,
  lastActualRevenue: number,
): number {
  if (yearIndex < 0) return lastActualRevenue
  const projected = projectedRevenueByYear?.[yearIndex]
  if (typeof projected === "number" && Number.isFinite(projected)) return projected
  return lastActualRevenue
}

export function comptesClientsCalendarYear(
  yearIndex: number,
  forecastBaseYear: number,
): number {
  return forecastBaseYear - 1 + yearIndex
}

/**
 * @deprecated Préférer le même `yearIndex` config que Hypothèses Revenus
 * (0 = réel, 1+ = projeté). Conservé pour les appels legacy / tests.
 */
export function revenueHypothesisYearIndexForCalendarYear(
  calendarYear: number,
  revenueStartYear: number,
): number {
  return calendarYear - revenueStartYear
}

export function resolveComptesClientsProjectedValue(
  baseTrend: number[],
  yearIndex: number,
  adjustments: BilanAdjustment[],
  projectedRevenue: number,
): number {
  if (yearIndex <= 0) return baseTrend[yearIndex] ?? 0
  const applicable = adjustments.filter((adj) => adjustmentAppliesToYear(adj, yearIndex))
  const driver = [...applicable]
    .reverse()
    .find((adj) => adj.type === "collectionDays" || adj.type === "revenuePercent")
  if (driver && (driver.type === "collectionDays" || driver.type === "revenuePercent")) {
    return comptesClientsAmountFromDriver({
      type: driver.type,
      value: driver.value,
      revenue: projectedRevenue,
    })
  }
  return resolveBilanAdjustedValue(baseTrend, yearIndex, adjustments)
}

export function resolveStocksProjectedValue(
  baseTrend: number[],
  yearIndex: number,
  adjustments: BilanAdjustment[],
  projectedCmv: number,
  projectedRevenue: number,
): number {
  if (yearIndex <= 0) return baseTrend[yearIndex] ?? 0
  const applicable = adjustments.filter((adj) => adjustmentAppliesToYear(adj, yearIndex))
  const driver = [...applicable]
    .reverse()
    .find((adj) => adj.type === "inventoryDays" || adj.type === "revenuePercent")
  if (driver?.type === "inventoryDays") {
    return stocksAmountFromDriver({
      type: "inventoryDays",
      value: driver.value,
      baseAmount: projectedCmv,
    })
  }
  if (driver?.type === "revenuePercent") {
    return stocksAmountFromDriver({
      type: "revenuePercent",
      value: driver.value,
      baseAmount: projectedRevenue,
    })
  }
  return resolveBilanAdjustedValue(baseTrend, yearIndex, adjustments)
}

export function resolveCrediteursProjectedValue(
  baseTrend: number[],
  yearIndex: number,
  adjustments: BilanAdjustment[],
  projectedCmv: number,
  projectedRevenue: number,
): number {
  if (yearIndex <= 0) return baseTrend[yearIndex] ?? 0
  const applicable = adjustments.filter((adj) => adjustmentAppliesToYear(adj, yearIndex))
  const driver = [...applicable]
    .reverse()
    .find((adj) => adj.type === "paymentDays" || adj.type === "revenuePercent")
  if (driver?.type === "paymentDays") {
    return crediteursAmountFromDriver({
      type: "paymentDays",
      value: driver.value,
      baseAmount: projectedCmv,
    })
  }
  if (driver?.type === "revenuePercent") {
    return crediteursAmountFromDriver({
      type: "revenuePercent",
      value: driver.value,
      baseAmount: projectedRevenue,
    })
  }
  return resolveBilanAdjustedValue(baseTrend, yearIndex, adjustments)
}

/** Autres ACT : driver % des revenus remplace le solde ; sinon Montant $ (delta sur la base). */
export function resolveOtherActProjectedValue(
  baseTrend: number[],
  yearIndex: number,
  adjustments: BilanAdjustment[],
  projectedRevenue: number,
): number {
  if (yearIndex <= 0) return baseTrend[yearIndex] ?? 0
  const applicable = adjustments.filter((adj) => adjustmentAppliesToYear(adj, yearIndex))
  const driver = [...applicable].reverse().find((adj) => adj.type === "revenuePercent")
  if (driver?.type === "revenuePercent") {
    return comptesClientsAmountFromDriver({
      type: "revenuePercent",
      value: driver.value,
      revenue: projectedRevenue,
    })
  }
  return resolveBilanAdjustedValue(baseTrend, yearIndex, adjustments)
}

/** Trésorerie à la fin : début + variation, puis report d’exercice en exercice. */
export function buildForecastEndingCashTrend(
  actualBeginningCash: number,
  variationByYear: number[],
): number[] {
  const out: number[] = []
  for (let i = 0; i < variationByYear.length; i++) {
    const previous = i === 0 ? actualBeginningCash : out[i - 1]!
    out.push(previous + (variationByYear[i] ?? 0))
  }
  return out
}

/**
 * Encaisse et Découvert se partagent la Trésorerie à la fin (années projetées) :
 * - fin > 0 → Encaisse = fin, Découvert = 0
 * - fin < 0 → Encaisse = 0, Découvert = |fin|
 * - fin = 0 → les deux à 0
 * Colonnes réelles (N-1 / YTD) : soldes inchangés.
 */
export type TreasuryEndingCashSide = "encaisse" | "decouvert"

export function resolveTreasuryLineFromEndingCash(
  actualAmount: number,
  endingCashTrend: number[] | undefined,
  yearIndex: number,
  forecastActualCols = 1,
  side: TreasuryEndingCashSide = "encaisse",
): number {
  if (!isForecastProjectedDisplayColumn(yearIndex, forecastActualCols)) {
    return actualAmount
  }
  if (!endingCashTrend?.length) return actualAmount
  const projectedEnding = endingCashTrend[yearIndex]
  if (projectedEnding == null || !Number.isFinite(projectedEnding)) return actualAmount
  if (side === "encaisse") {
    return projectedEnding > 0 ? projectedEnding : 0
  }
  return projectedEnding < 0 ? -projectedEnding : 0
}

/** Alias Encaisse (côté positif de la Trésorerie à la fin). */
export function resolveEncaisseFromEndingCash(
  actualEncaisse: number,
  endingCashTrend: number[] | undefined,
  yearIndex: number,
  forecastActualCols = 1,
): number {
  return resolveTreasuryLineFromEndingCash(
    actualEncaisse,
    endingCashTrend,
    yearIndex,
    forecastActualCols,
    "encaisse",
  )
}

type BilanRollupRow = {
  label: string
  current: number
  prior: number
  indent?: boolean
  isSection?: boolean
  isSubtotal?: boolean
  trendValues?: number[]
  rowId?: string
  linkCode?: string
  formula?: string[]
  liaisonMode?: string
  liaisonSumCodes?: string[]
}

/** Code de liaison appartenant à une ancre de somme (ACT-A → ACT-A, ACT-A.1, …). */
export function linkCodeMatchesLiaisonSumCode(
  linkCode: string | null | undefined,
  sumCode: string | null | undefined,
): boolean {
  const code = String(linkCode ?? "")
    .trim()
    .toUpperCase()
  const anchor = String(sumCode ?? "")
    .trim()
    .toUpperCase()
  if (!code || !anchor) return false
  return code === anchor || code.startsWith(`${anchor}.`)
}

function parseHypothesisFormulaRefs(formula: string[]): Array<{ sign: 1 | -1; ref: string }> {
  const out: Array<{ sign: 1 | -1; ref: string }> = []
  for (const raw of formula) {
    const token = String(raw ?? "").trim()
    if (!token) continue
    if (token.startsWith("+")) out.push({ sign: 1, ref: token.slice(1).trim() })
    else if (token.startsWith("-")) out.push({ sign: -1, ref: token.slice(1).trim() })
    else out.push({ sign: 1, ref: token })
  }
  return out
}

function findBilanRollupAmountByRef<T extends BilanRollupRow>(
  rows: T[],
  ref: string,
  yearIndex: number,
  getDisplayAmount: (row: T, yearIndex: number) => number,
): number {
  const needle = String(ref ?? "").trim()
  if (!needle) return 0
  const needleLower = needle.toLowerCase()
  const match = rows.find((row) => {
    const id = String(row.rowId ?? "").trim()
    const code = String(row.linkCode ?? "").trim()
    const label = String(row.label ?? "").trim()
    return (
      id === needle ||
      code === needle ||
      label === needle ||
      id.toLowerCase() === needleLower ||
      code.toLowerCase() === needleLower ||
      label.toLowerCase() === needleLower
    )
  })
  if (!match) return 0
  if (match.isSubtotal) return match.trendValues?.[yearIndex] ?? 0
  return getDisplayAmount(match, yearIndex)
}

/**
 * Recalcule les sous-totaux du bilan hypothèse comme le Bilan Sommaire :
 * 1) `formula` (± refs id / linkCode / libellé)
 * 2) `liaisonMode: "sum"` + `liaisonSumCodes` (ex. ACT-* + ALT-* pour Total de l'actif)
 * 3) repli positionnel (feuilles du bloc, puis sous-totaux enfants)
 */
export function recomputeBilanHypothesisSubtotalTrends<T extends BilanRollupRow>(
  rows: T[],
  getDisplayAmount: (row: T, yearIndex: number) => number,
): T[] {
  const trendLen =
    rows.find((r) => r.trendValues && r.trendValues.length > 0)?.trendValues?.length ?? 0
  const out = rows.map((r) => ({
    ...r,
    trendValues: r.trendValues
      ? [...r.trendValues]
      : r.isSubtotal && trendLen > 0
        ? Array.from({ length: trendLen }, () => 0)
        : undefined,
    liaisonSumCodes: r.liaisonSumCodes ? [...r.liaisonSumCodes] : undefined,
    formula: r.formula ? [...r.formula] : undefined,
  }))

  for (let i = 0; i < out.length; i++) {
    const row = out[i]!
    const hasFormula = Array.isArray(row.formula) && row.formula.length > 0
    const sumCodes =
      row.liaisonMode === "sum" && Array.isArray(row.liaisonSumCodes)
        ? row.liaisonSumCodes.map((c) => String(c ?? "").trim()).filter(Boolean)
        : []
    const shouldRecompute = row.isSubtotal || hasFormula || sumCodes.length > 0
    if (!shouldRecompute) continue
    if (!row.trendValues?.length) {
      if (trendLen <= 0) continue
      row.trendValues = Array.from({ length: trendLen }, () => 0)
    }

    // Parents Capex / Financement en liaison sum : ne pas écraser avec une somme vide.
    if (
      isExternalForecastDrivenBilanRow({ rowId: row.rowId, linkCode: row.linkCode }) &&
      sumCodes.length > 0 &&
      !hasFormula
    ) {
      const baseline = [...row.trendValues]
      for (let y = 0; y < row.trendValues.length; y++) {
        row.trendValues[y] = getDisplayAmount(
          { ...row, trendValues: baseline, isSubtotal: false },
          y,
        )
      }
      row.current = row.trendValues[0] ?? 0
      row.prior = row.trendValues[1] ?? 0
      continue
    }

    let wrote = false
    for (let y = 0; y < row.trendValues.length; y++) {
      let amount = 0
      if (hasFormula) {
        for (const { sign, ref } of parseHypothesisFormulaRefs(row.formula!)) {
          amount += sign * findBilanRollupAmountByRef(out, ref, y, getDisplayAmount)
        }
      } else if (sumCodes.length > 0) {
        for (const part of out) {
          if (part === row) continue
          if (part.isSection) continue
          if (
            part.isSubtotal &&
            !isExternalForecastDrivenBilanRow({ rowId: part.rowId, linkCode: part.linkCode })
          ) {
            continue
          }
          if (!String(part.label ?? "").trim()) continue
          if (!sumCodes.some((code) => linkCodeMatchesLiaisonSumCode(part.linkCode, code))) {
            continue
          }
          amount += getDisplayAmount(part, y)
        }
      } else {
        // Repli : feuilles jusqu’à section / sous-total (sections indentées traversées).
        const leaves: T[] = []
        for (let j = i - 1; j >= 0; j--) {
          const prev = out[j]!
          if (prev.isSubtotal) break
          if (prev.isSection && !prev.indent) break
          if (prev.isSection && prev.indent) continue
          if (!String(prev.label ?? "").trim()) continue
          leaves.unshift(prev)
        }
        let parts = leaves
        if (parts.length === 0) {
          const childTotals: T[] = []
          let sawIndentedSection = false
          for (let j = i - 1; j >= 0; j--) {
            const prev = out[j]!
            if (prev.isSection && !prev.indent) break
            if (prev.isSection && prev.indent) {
              sawIndentedSection = true
              continue
            }
            if (!String(prev.label ?? "").trim()) continue
            if (prev.isSubtotal) childTotals.unshift(prev)
          }
          // Évite de coller un sous-total voisin (ex. Total ACT juste au-dessus)
          // quand on n’a pas traversé de sous-section indentée.
          if (sawIndentedSection) parts = childTotals
        }
        if (parts.length === 0) continue
        amount = parts.reduce((sum, part) => {
          if (part.isSubtotal) return sum + (part.trendValues?.[y] ?? 0)
          return sum + getDisplayAmount(part, y)
        }, 0)
      }
      row.trendValues[y] = amount
      wrote = true
    }
    if (wrote) {
      row.current = row.trendValues[0] ?? 0
      row.prior = row.trendValues[1] ?? 0
    }
  }

  return out
}

function parseAdjustmentType(raw: unknown): BilanAdjustmentType {
  if (
    raw === "collectionDays" ||
    raw === "revenuePercent" ||
    raw === "inventoryDays" ||
    raw === "paymentDays" ||
    raw === "dividends"
  ) {
    return raw
  }
  return "amount"
}

export function parseBilanAdjustments(raw: unknown): Record<string, BilanAdjustment[]> {
  if (!raw || typeof raw !== "object") return {}
  const out: Record<string, BilanAdjustment[]> = {}
  for (const [rowId, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    out[rowId] = list
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : `${rowId}-${item.yearIndex ?? 0}`,
        rowId,
        yearIndex: typeof item.yearIndex === "number" ? item.yearIndex : 0,
        type: parseAdjustmentType(item.type),
        value: typeof item.value === "number" && Number.isFinite(item.value) ? item.value : 0,
        isRecurring: item.isRecurring === true,
        note: typeof item.note === "string" ? item.note : "",
      }))
  }
  return out
}
