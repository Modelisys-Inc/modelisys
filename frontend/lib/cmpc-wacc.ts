/**
 * Modèle CMPC (Coût Moyen Pondéré du Capital / WACC) — société privée.
 * Porté depuis le rapport cmpc-model (CAPM + primes, dette nette d'impôt, structure).
 */

export type CmpcWaccInputs = {
  riskFreeRate: number
  equityRiskPremium: number
  beta: number
  sizePremium: number
  specificRiskPremium: number
  creditSpread: number
  taxRate: number
  /** Poids des capitaux propres dans la structure cible (%). */
  equityWeightPct: number
  /** Poids de la dette financière nette dans la structure cible (%). */
  debtWeightPct: number
}

/**
 * Multiples Dette / BAIIA ajusté pour l’analyse de capacité d’endettement
 * (section Structure de capital — Multiplicateur).
 */
export type CmpcDebtCapacityInputs = {
  /** Multiple selon règles empiriques (ex. banques / covenants). */
  debtBaiiaEmpirical: number
  /** Multiple selon estimation IA / modèles. */
  debtBaiiaAi: number
  /** Multiple selon comparables sectoriels. */
  debtBaiiaComparables: number
  /** Multiple Dette / BAIIA retenu pour la structure cible. */
  debtBaiiaRetained: number
}

export type CmpcDebtCapacityNotes = {
  debtBaiiaEmpirical: string
  debtBaiiaAi: string
  debtBaiiaComparables: string
  debtBaiiaRetained: string
}

/** BAIIA ajusté bas / haut / moyen issu de l’étape BAIIA ajusté. */
export type BaiiaAdjustedRange = {
  low: number
  high: number
  mid: number
}

export type DebtCapacityScenario = {
  low: number
  high: number
  mid: number
}

export type DebtCapacityAnalysis = {
  empirical: DebtCapacityScenario
  ai: DebtCapacityScenario
  comparables: DebtCapacityScenario
}

export type CmpcWaccResults = {
  costOfEquity: number
  preTaxCostOfDebt: number
  afterTaxCostOfDebt: number
  taxShield: number
  weightEquity: number
  weightDebt: number
  totalCapital: number
  equityContribution: number
  debtContribution: number
  wacc: number
}

export type CmpcReportMeta = {
  subject: string
  mandate: string
  valuationDate: string
  currency: string
  preparedBy: string
  preparedFor: string
}

/** Notes sous les hypothèses Ke (libellés courts). */
export type CmpcEquityNotes = {
  riskFreeRate: string
  equityRiskPremium: string
  beta: string
  sizePremium: string
  specificRiskPremium: string
}

/**
 * Sources / justifications (section 5) — alimentent aussi les infobulles en lecture seule.
 * Alias historique : `hints` dans les configs déjà persistées.
 */
export type CmpcParamSources = {
  riskFreeRate: string
  equityRiskPremium: string
  beta: string
  sizePremium: string
  specificRiskPremium: string
  creditSpread: string
  taxRate: string
  equityWeightPct: string
  debtWeightPct: string
}

/** @deprecated Prefer CmpcParamSources */
export type CmpcParamHints = CmpcParamSources

export const DEFAULT_CMPC_META: CmpcReportMeta = {
  subject: "Société ABC inc.",
  mandate: "Détermination du coût moyen pondéré du capital (taux d'actualisation)",
  valuationDate: "31 décembre 2025",
  currency: "Dollar canadien (CAD)",
  preparedBy: "Expert en évaluation d'entreprises (EEE / CBV)",
  preparedFor: "Direction de la Société",
}

export const DEFAULT_CMPC_EQUITY_NOTES: CmpcEquityNotes = {
  riskFreeRate: "Obligation du gouvernement du Canada, 10 ans",
  equityRiskPremium: "Prime de risque sur actions — marché canadien",
  beta: "Bêta ré-endetté de sociétés comparables",
  sizePremium: "Décote de petite capitalisation",
  specificRiskPremium: "Facteurs propres à l'entreprise (jugement)",
}

export const DEFAULT_CMPC_PARAM_SOURCES: CmpcParamSources = {
  riskFreeRate:
    "Rendement des obligations du gouvernement du Canada à long terme (≈ 10 ans).",
  equityRiskPremium:
    "Prime de risque sur actions du marché canadien, selon les études de référence reconnues (p. ex. Kroll).",
  beta: "Bêta désendetté d'un échantillon de sociétés ouvertes comparables, ré-endetté à la structure de capital cible.",
  sizePremium:
    "Études sur les primes de taille des petites capitalisations (Kroll / Duff & Phelps).",
  specificRiskPremium:
    "Jugement professionnel de l'évaluateur : dépendance au dirigeant, concentration de clientèle, diversification, etc.",
  creditSpread:
    "Écart de crédit correspondant à la qualité de crédit estimée de l'emprunteur.",
  taxRate: "Taux marginal combiné (fédéral + provincial) applicable à la société.",
  equityWeightPct: "Poids cible des capitaux propres dans la structure de capital (We).",
  debtWeightPct: "Poids cible de la dette financière nette dans la structure de capital (Wd).",
}

/** @deprecated Prefer DEFAULT_CMPC_PARAM_SOURCES */
export const DEFAULT_CMPC_PARAM_HINTS = DEFAULT_CMPC_PARAM_SOURCES

export const DEFAULT_CMPC_INPUTS: CmpcWaccInputs = {
  riskFreeRate: 3.3,
  equityRiskPremium: 5.5,
  beta: 1.1,
  sizePremium: 3.5,
  specificRiskPremium: 2.0,
  creditSpread: 3.0,
  taxRate: 26.5,
  equityWeightPct: 60,
  debtWeightPct: 40,
}

/** Défauts prudents pour PME (multiples Dette / BAIIA). */
export const DEFAULT_CMPC_DEBT_CAPACITY: CmpcDebtCapacityInputs = {
  debtBaiiaEmpirical: 3.0,
  debtBaiiaAi: 2.5,
  debtBaiiaComparables: 2.75,
  debtBaiiaRetained: 2.75,
}

export const DEFAULT_CMPC_DEBT_CAPACITY_NOTES: CmpcDebtCapacityNotes = {
  debtBaiiaEmpirical: "Règles empiriques / covenants bancaires typiques",
  debtBaiiaAi: "Estimation selon modèles / IA",
  debtBaiiaComparables: "Multiples de sociétés comparables",
  debtBaiiaRetained: "Multiple retenu pour la structure de capital cible",
}

/**
 * Hypothèses de capacité de remboursement (VA / PV d’annuité).
 * Capacité max = VA(taux annuel, durée en années, flux monétaires caractéristiques).
 */
export type CmpcRepaymentCapacityInputs = {
  /** Taux d’intérêt annuel (%). */
  annualInterestRate: number
  /** Durée du remboursement (années). */
  durationYears: number
}

export type CmpcRepaymentCapacityNotes = {
  annualInterestRate: string
  durationYears: string
}

/** Flux monétaires caractéristiques bas / haut (étape Flux monétaires). */
export type CharacteristicCashFlowRange = {
  low: number
  high: number
  mid: number
}

export type RepaymentCapacityAnalysis = {
  /** VA(taux, durée, flux) — capacité d’endettement maximale. */
  maxDebt: { low: number; high: number }
  /** Capacité max ÷ BAIIA moyen → Dette / BAIIA. */
  debtBaiia: { low: number; high: number }
}

export const DEFAULT_CMPC_REPAYMENT_CAPACITY: CmpcRepaymentCapacityInputs = {
  annualInterestRate: 6,
  durationYears: 5,
}

export const DEFAULT_CMPC_REPAYMENT_CAPACITY_NOTES: CmpcRepaymentCapacityNotes = {
  annualInterestRate: "Taux d’intérêt annuel estimé de la dette",
  durationYears: "Horizon de remboursement (années)",
}

/**
 * Valeur actuelle d’une annuité ordinaire (fin de période) — équivalent Excel VA / PV
 * avec type = 0 : |VA| = |vpm| × (1 − (1+r)^(−n)) / r.
 */
export function annuityPresentValue(
  annualRatePct: number,
  durationYears: number,
  payment: number,
): number {
  const n = Number.isFinite(durationYears) ? durationYears : 0
  const pmt = Number.isFinite(payment) ? payment : 0
  if (n <= 0 || !Number.isFinite(n)) return 0
  if (Math.abs(pmt) < 1e-12) return 0
  const r = Number.isFinite(annualRatePct) ? annualRatePct / 100 : 0
  if (Math.abs(r) < 1e-12) return pmt * n
  return (pmt * (1 - Math.pow(1 + r, -n))) / r
}

/**
 * Paiement d’annuité ordinaire — équivalent Excel VPM / PMT
 * avec type = 0 et VA = −montant (emprunt) : VPM(taux, durée, −dette).
 * Inverse de `annuityPresentValue`.
 */
export function annuityPayment(
  annualRatePct: number,
  durationYears: number,
  presentValue: number,
): number {
  const n = Number.isFinite(durationYears) ? durationYears : 0
  const pv = Number.isFinite(presentValue) ? presentValue : 0
  if (n <= 0 || !Number.isFinite(n)) return 0
  if (Math.abs(pv) < 1e-12) return 0
  const r = Number.isFinite(annualRatePct) ? annualRatePct / 100 : 0
  if (Math.abs(r) < 1e-12) return pv / n
  return (pv * r) / (1 - Math.pow(1 + r, -n))
}

export function computeRepaymentCapacity(
  cashFlows: CharacteristicCashFlowRange,
  baiia: BaiiaAdjustedRange,
  inputs: CmpcRepaymentCapacityInputs,
): RepaymentCapacityAnalysis {
  const maxLow = annuityPresentValue(
    inputs.annualInterestRate,
    inputs.durationYears,
    cashFlows.low,
  )
  const maxHigh = annuityPresentValue(
    inputs.annualInterestRate,
    inputs.durationYears,
    cashFlows.high,
  )
  const baiiaMid =
    Number.isFinite(baiia.mid) && Math.abs(baiia.mid) >= 1e-9
      ? baiia.mid
      : Number.NaN
  const ratio = (debt: number) =>
    Number.isFinite(baiiaMid) ? debt / baiiaMid : Number.NaN
  return {
    maxDebt: { low: maxLow, high: maxHigh },
    debtBaiia: {
      low: ratio(maxLow),
      high: ratio(maxHigh),
    },
  }
}

/**
 * Compare un Dette / BAIIA (estimé via pondération CMPC, ou historique retenu)
 * à la fourchette issue de la capacité max (VA).
 * - over : ratio > haut de capacité
 * - within : bas < ratio ≤ haut
 * - ok : ratio ≤ bas
 */
export type DebtBaiiaLeverageStatus = "ok" | "within" | "over"

export function assessDebtBaiiaLeverage(
  debtBaiia: number,
  capacityDebtBaiia: { low: number; high: number },
): DebtBaiiaLeverageStatus {
  if (!Number.isFinite(debtBaiia)) return "ok"
  const low = capacityDebtBaiia.low
  const high = capacityDebtBaiia.high
  if (!Number.isFinite(low) || !Number.isFinite(high)) return "ok"
  const ceil = Math.max(low, high)
  const floor = Math.min(low, high)
  if (debtBaiia > ceil + 1e-9) return "over"
  if (debtBaiia > floor + 1e-9) return "within"
  return "ok"
}

/**
 * Dette estimée = VE × pondération dette CMPC (%) ;
 * Dette / BAIIA = dette estimée ÷ BAIIA moyen.
 */
export type EstimatedDebtFromCmpcWeight = {
  debtWeightPct: number
  estimatedDebt: { low: number; high: number; mid: number }
  debtBaiia: { low: number | null; high: number | null; mid: number | null }
  /**
   * Capacité de remboursement = VPM(taux, durée, −dette estimée)
   * (taux / durée = hypothèses de remboursement).
   */
  repaymentCapacityPayment: { low: number; high: number; mid: number }
  /** Flux caractéristiques − VPM. */
  cashFlowAfterDebtService: { low: number; high: number; mid: number }
}

export function computeEstimatedDebtFromCmpcWeight(inputs: {
  enterpriseValue: { low: number; high: number; mid: number }
  debtWeightPct: number | null
  baiiaMid: number
  annualInterestRate: number
  durationYears: number
  cashFlowLow: number
  cashFlowHigh: number
}): EstimatedDebtFromCmpcWeight | null {
  if (inputs.debtWeightPct == null || !Number.isFinite(inputs.debtWeightPct)) return null
  const w = Math.max(0, inputs.debtWeightPct) / 100
  const estimatedDebt = {
    low: inputs.enterpriseValue.low * w,
    high: inputs.enterpriseValue.high * w,
    mid: inputs.enterpriseValue.mid * w,
  }
  const ratio = (debt: number): number | null => {
    if (!Number.isFinite(inputs.baiiaMid) || Math.abs(inputs.baiiaMid) < 1e-9) return null
    if (!Number.isFinite(debt)) return null
    return debt / inputs.baiiaMid
  }
  const payment = (debt: number) =>
    annuityPayment(inputs.annualInterestRate, inputs.durationYears, debt)
  const repaymentCapacityPayment = {
    low: payment(estimatedDebt.low),
    high: payment(estimatedDebt.high),
    mid: payment(estimatedDebt.mid),
  }
  const cfLow = Number.isFinite(inputs.cashFlowLow) ? inputs.cashFlowLow : 0
  const cfHigh = Number.isFinite(inputs.cashFlowHigh) ? inputs.cashFlowHigh : 0
  const cashFlow = { low: cfLow, high: cfHigh, mid: (cfLow + cfHigh) / 2 }
  return {
    debtWeightPct: inputs.debtWeightPct,
    estimatedDebt,
    debtBaiia: {
      low: ratio(estimatedDebt.low),
      high: ratio(estimatedDebt.high),
      mid: ratio(estimatedDebt.mid),
    },
    repaymentCapacityPayment,
    cashFlowAfterDebtService: {
      low: cashFlow.low - repaymentCapacityPayment.low,
      high: cashFlow.high - repaymentCapacityPayment.high,
      mid: cashFlow.mid - repaymentCapacityPayment.mid,
    },
  }
}

export function computeDebtCapacity(
  baiia: BaiiaAdjustedRange,
  multiples: CmpcDebtCapacityInputs,
): DebtCapacityAnalysis {
  const scale = (multiple: number): DebtCapacityScenario => ({
    low: baiia.low * multiple,
    high: baiia.high * multiple,
    mid: baiia.mid * multiple,
  })
  return {
    empirical: scale(multiples.debtBaiiaEmpirical),
    ai: scale(multiples.debtBaiiaAi),
    comparables: scale(multiples.debtBaiiaComparables),
  }
}

/** Extrait bas / haut / moyen depuis la config `ebitda-multiple-config`. */
export function parseBaiiaAdjustedRange(data: unknown): BaiiaAdjustedRange | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const low = typeof d.lowEBITDARange === "number" ? d.lowEBITDARange : Number(d.lowEBITDARange)
  const high =
    typeof d.highEBITDARange === "number" ? d.highEBITDARange : Number(d.highEBITDARange)
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null
  return { low, high, mid: (low + high) / 2 }
}

/** Revenus représentatifs bas / haut / moyen — fourchette retenue (Flux monétaires). */
export function parseRepresentativeRevenueRange(data: unknown): BaiiaAdjustedRange | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const low = typeof d.lowRevenueRange === "number" ? d.lowRevenueRange : Number(d.lowRevenueRange)
  const high =
    typeof d.highRevenueRange === "number" ? d.highRevenueRange : Number(d.highRevenueRange)
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null
  // Même formule que `midRevenueRange` (ligne Revenus · colonne Moyen, Fourchette retenue).
  return { low, high, mid: (low + high) / 2 }
}

/** Flux caractéristiques persistés depuis l’étape Flux monétaires. */
export function parseCharacteristicCashFlowRange(
  data: unknown,
): CharacteristicCashFlowRange | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const low =
    typeof d.characteristicCashFlowLow === "number"
      ? d.characteristicCashFlowLow
      : Number(d.characteristicCashFlowLow)
  const high =
    typeof d.characteristicCashFlowHigh === "number"
      ? d.characteristicCashFlowHigh
      : Number(d.characteristicCashFlowHigh)
  if (!Number.isFinite(low) || !Number.isFinite(high)) return null
  return { low, high, mid: (low + high) / 2 }
}

export function computeCmpcWacc(i: CmpcWaccInputs): CmpcWaccResults {
  const costOfEquity =
    i.riskFreeRate + i.beta * i.equityRiskPremium + i.sizePremium + i.specificRiskPremium

  const preTaxCostOfDebt = i.riskFreeRate + i.creditSpread
  const tax = i.taxRate / 100
  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - tax)
  const taxShield = preTaxCostOfDebt - afterTaxCostOfDebt

  const eq = Number.isFinite(i.equityWeightPct) ? Math.max(0, i.equityWeightPct) : 0
  const deb = Number.isFinite(i.debtWeightPct) ? Math.max(0, i.debtWeightPct) : 0
  const totalPct = eq + deb
  const weightEquity = totalPct > 0 ? eq / totalPct : 0
  const weightDebt = totalPct > 0 ? deb / totalPct : 0
  const totalCapital = totalPct

  const equityContribution = weightEquity * costOfEquity
  const debtContribution = weightDebt * afterTaxCostOfDebt
  const wacc = equityContribution + debtContribution

  return {
    costOfEquity,
    preTaxCostOfDebt,
    afterTaxCostOfDebt,
    taxShield,
    weightEquity,
    weightDebt,
    totalCapital,
    equityContribution,
    debtContribution,
    wacc,
  }
}

export function formatCmpcPct(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(decimals)} %`
}

const currencyFormatter = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
})

export function formatCmpcCurrency(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return currencyFormatter.format(value)
}

export function roundCmpcToNearest(value: number, step = 0.25): number {
  if (!Number.isFinite(value)) return Number.NaN
  return Math.round(value / step) * step
}

export function cmpcWaccRange(
  wacc: number,
  halfWidth = 0.5,
): { low: number; high: number; retained: number } {
  const retained = roundCmpcToNearest(wacc, 0.25)
  return {
    retained,
    low: roundCmpcToNearest(wacc - halfWidth, 0.25),
    high: roundCmpcToNearest(wacc + halfWidth, 0.25),
  }
}

export function parseCmpcWaccConfig(data: unknown): {
  inputs: CmpcWaccInputs
  meta: CmpcReportMeta
  equityNotes: CmpcEquityNotes
  sources: CmpcParamSources
  debtCapacity: CmpcDebtCapacityInputs
  debtCapacityNotes: CmpcDebtCapacityNotes
  repaymentCapacity: CmpcRepaymentCapacityInputs
  repaymentCapacityNotes: CmpcRepaymentCapacityNotes
} {
  const source = data && typeof data === "object" ? (data as Record<string, unknown>) : {}
  const inputsRaw =
    source.inputs && typeof source.inputs === "object"
      ? (source.inputs as Record<string, unknown>)
      : source
  const metaRaw =
    source.meta && typeof source.meta === "object"
      ? (source.meta as Record<string, unknown>)
      : {}
  const equityNotesRaw =
    source.equityNotes && typeof source.equityNotes === "object"
      ? (source.equityNotes as Record<string, unknown>)
      : {}
  // Prefer `sources` (section 5); fall back to legacy `hints`.
  const sourcesRaw =
    source.sources && typeof source.sources === "object"
      ? (source.sources as Record<string, unknown>)
      : source.hints && typeof source.hints === "object"
        ? (source.hints as Record<string, unknown>)
        : {}
  const debtCapacityRaw =
    source.debtCapacity && typeof source.debtCapacity === "object"
      ? (source.debtCapacity as Record<string, unknown>)
      : {}
  const debtCapacityNotesRaw =
    source.debtCapacityNotes && typeof source.debtCapacityNotes === "object"
      ? (source.debtCapacityNotes as Record<string, unknown>)
      : {}
  const repaymentCapacityRaw =
    source.repaymentCapacity && typeof source.repaymentCapacity === "object"
      ? (source.repaymentCapacity as Record<string, unknown>)
      : {}
  const repaymentCapacityNotesRaw =
    source.repaymentCapacityNotes && typeof source.repaymentCapacityNotes === "object"
      ? (source.repaymentCapacityNotes as Record<string, unknown>)
      : {}

  const num = (key: keyof CmpcWaccInputs, fallback: number) => {
    const v = inputsRaw[key]
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const debtNum = (key: keyof CmpcDebtCapacityInputs, fallback: number) => {
    const v = debtCapacityRaw[key]
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const repaymentNum = (key: keyof CmpcRepaymentCapacityInputs, fallback: number) => {
    const v = repaymentCapacityRaw[key]
    const n = typeof v === "number" ? v : Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  const str = (key: keyof CmpcReportMeta, fallback: string) => {
    const v = metaRaw[key]
    return typeof v === "string" && v.trim() ? v : fallback
  }
  const noteStr = (key: keyof CmpcEquityNotes, fallback: string) => {
    const v = equityNotesRaw[key]
    return typeof v === "string" ? v : fallback
  }
  const sourceStr = (key: keyof CmpcParamSources, fallback: string) => {
    const v = sourcesRaw[key]
    return typeof v === "string" ? v : fallback
  }
  const debtNoteStr = (key: keyof CmpcDebtCapacityNotes, fallback: string) => {
    const v = debtCapacityNotesRaw[key]
    return typeof v === "string" ? v : fallback
  }
  const repaymentNoteStr = (key: keyof CmpcRepaymentCapacityNotes, fallback: string) => {
    const v = repaymentCapacityNotesRaw[key]
    return typeof v === "string" ? v : fallback
  }

  /** Poids % : champs dédiés, sinon migration depuis anciens montants $ (equityValue / debtValue). */
  const resolveStructureWeights = (): {
    equityWeightPct: number
    debtWeightPct: number
  } => {
    const eqPctRaw = inputsRaw.equityWeightPct
    const debPctRaw = inputsRaw.debtWeightPct
    const eqPct =
      typeof eqPctRaw === "number" ? eqPctRaw : eqPctRaw != null ? Number(eqPctRaw) : Number.NaN
    const debPct =
      typeof debPctRaw === "number"
        ? debPctRaw
        : debPctRaw != null
          ? Number(debPctRaw)
          : Number.NaN
    if (Number.isFinite(eqPct) || Number.isFinite(debPct)) {
      const e = Number.isFinite(eqPct) ? eqPct : DEFAULT_CMPC_INPUTS.equityWeightPct
      const d = Number.isFinite(debPct) ? debPct : Math.max(0, 100 - e)
      return { equityWeightPct: e, debtWeightPct: d }
    }
    const eqDol = num("equityValue" as keyof CmpcWaccInputs, Number.NaN)
    const debDol = num("debtValue" as keyof CmpcWaccInputs, Number.NaN)
    // Legacy dollar amounts (typically >> 100).
    if (
      Number.isFinite(eqDol) &&
      Number.isFinite(debDol) &&
      (eqDol > 100 || debDol > 100 || eqDol + debDol > 100)
    ) {
      const total = eqDol + debDol
      if (total > 0) {
        return {
          equityWeightPct: (eqDol / total) * 100,
          debtWeightPct: (debDol / total) * 100,
        }
      }
    }
    return {
      equityWeightPct: DEFAULT_CMPC_INPUTS.equityWeightPct,
      debtWeightPct: DEFAULT_CMPC_INPUTS.debtWeightPct,
    }
  }
  const structureWeights = resolveStructureWeights()

  return {
    inputs: {
      riskFreeRate: num("riskFreeRate", DEFAULT_CMPC_INPUTS.riskFreeRate),
      equityRiskPremium: num("equityRiskPremium", DEFAULT_CMPC_INPUTS.equityRiskPremium),
      beta: num("beta", DEFAULT_CMPC_INPUTS.beta),
      sizePremium: num("sizePremium", DEFAULT_CMPC_INPUTS.sizePremium),
      specificRiskPremium: num("specificRiskPremium", DEFAULT_CMPC_INPUTS.specificRiskPremium),
      creditSpread: num("creditSpread", DEFAULT_CMPC_INPUTS.creditSpread),
      taxRate: num("taxRate", DEFAULT_CMPC_INPUTS.taxRate),
      equityWeightPct: structureWeights.equityWeightPct,
      debtWeightPct: structureWeights.debtWeightPct,
    },
    meta: {
      subject: str("subject", DEFAULT_CMPC_META.subject),
      mandate: str("mandate", DEFAULT_CMPC_META.mandate),
      valuationDate: str("valuationDate", DEFAULT_CMPC_META.valuationDate),
      currency: str("currency", DEFAULT_CMPC_META.currency),
      preparedBy: str("preparedBy", DEFAULT_CMPC_META.preparedBy),
      preparedFor: str("preparedFor", DEFAULT_CMPC_META.preparedFor),
    },
    equityNotes: {
      riskFreeRate: noteStr("riskFreeRate", DEFAULT_CMPC_EQUITY_NOTES.riskFreeRate),
      equityRiskPremium: noteStr(
        "equityRiskPremium",
        DEFAULT_CMPC_EQUITY_NOTES.equityRiskPremium,
      ),
      beta: noteStr("beta", DEFAULT_CMPC_EQUITY_NOTES.beta),
      sizePremium: noteStr("sizePremium", DEFAULT_CMPC_EQUITY_NOTES.sizePremium),
      specificRiskPremium: noteStr(
        "specificRiskPremium",
        DEFAULT_CMPC_EQUITY_NOTES.specificRiskPremium,
      ),
    },
    sources: {
      riskFreeRate: sourceStr("riskFreeRate", DEFAULT_CMPC_PARAM_SOURCES.riskFreeRate),
      equityRiskPremium: sourceStr(
        "equityRiskPremium",
        DEFAULT_CMPC_PARAM_SOURCES.equityRiskPremium,
      ),
      beta: sourceStr("beta", DEFAULT_CMPC_PARAM_SOURCES.beta),
      sizePremium: sourceStr("sizePremium", DEFAULT_CMPC_PARAM_SOURCES.sizePremium),
      specificRiskPremium: sourceStr(
        "specificRiskPremium",
        DEFAULT_CMPC_PARAM_SOURCES.specificRiskPremium,
      ),
      creditSpread: sourceStr("creditSpread", DEFAULT_CMPC_PARAM_SOURCES.creditSpread),
      taxRate: sourceStr("taxRate", DEFAULT_CMPC_PARAM_SOURCES.taxRate),
      equityWeightPct:
        (typeof sourcesRaw.equityWeightPct === "string" && sourcesRaw.equityWeightPct) ||
        (typeof sourcesRaw.equityValue === "string" && sourcesRaw.equityValue) ||
        DEFAULT_CMPC_PARAM_SOURCES.equityWeightPct,
      debtWeightPct:
        (typeof sourcesRaw.debtWeightPct === "string" && sourcesRaw.debtWeightPct) ||
        (typeof sourcesRaw.debtValue === "string" && sourcesRaw.debtValue) ||
        DEFAULT_CMPC_PARAM_SOURCES.debtWeightPct,
    },
    debtCapacity: {
      debtBaiiaEmpirical: debtNum(
        "debtBaiiaEmpirical",
        DEFAULT_CMPC_DEBT_CAPACITY.debtBaiiaEmpirical,
      ),
      debtBaiiaAi: debtNum("debtBaiiaAi", DEFAULT_CMPC_DEBT_CAPACITY.debtBaiiaAi),
      debtBaiiaComparables: debtNum(
        "debtBaiiaComparables",
        DEFAULT_CMPC_DEBT_CAPACITY.debtBaiiaComparables,
      ),
      debtBaiiaRetained: debtNum(
        "debtBaiiaRetained",
        DEFAULT_CMPC_DEBT_CAPACITY.debtBaiiaRetained,
      ),
    },
    debtCapacityNotes: {
      debtBaiiaEmpirical: debtNoteStr(
        "debtBaiiaEmpirical",
        DEFAULT_CMPC_DEBT_CAPACITY_NOTES.debtBaiiaEmpirical,
      ),
      debtBaiiaAi: debtNoteStr("debtBaiiaAi", DEFAULT_CMPC_DEBT_CAPACITY_NOTES.debtBaiiaAi),
      debtBaiiaComparables: debtNoteStr(
        "debtBaiiaComparables",
        DEFAULT_CMPC_DEBT_CAPACITY_NOTES.debtBaiiaComparables,
      ),
      debtBaiiaRetained: debtNoteStr(
        "debtBaiiaRetained",
        DEFAULT_CMPC_DEBT_CAPACITY_NOTES.debtBaiiaRetained,
      ),
    },
    repaymentCapacity: {
      annualInterestRate: repaymentNum(
        "annualInterestRate",
        DEFAULT_CMPC_REPAYMENT_CAPACITY.annualInterestRate,
      ),
      durationYears: repaymentNum(
        "durationYears",
        DEFAULT_CMPC_REPAYMENT_CAPACITY.durationYears,
      ),
    },
    repaymentCapacityNotes: {
      annualInterestRate: repaymentNoteStr(
        "annualInterestRate",
        DEFAULT_CMPC_REPAYMENT_CAPACITY_NOTES.annualInterestRate,
      ),
      durationYears: repaymentNoteStr(
        "durationYears",
        DEFAULT_CMPC_REPAYMENT_CAPACITY_NOTES.durationYears,
      ),
    },
  }
}
