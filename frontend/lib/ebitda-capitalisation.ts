/**
 * Types et helpers purs — capitalisation BAIIA (méthode des multiples).
 */

import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import { findBaiiaSeriesRow } from "@/lib/capex-analysis-settings"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import { formatCalendarMonthYearShort } from "@/lib/financial-period-labels"
import { findIncomeStatementRevenueRow } from "@/lib/net-tangible-fdr-revenue"
import { lastCompletedFiscalYearEnd } from "@/lib/pro-forma-forecast-columns"
import { HORIZON_EMPTY_EPSILON } from "@/lib/horizon-column-visibility"
import {
  buildAmountsByCalendarMonth,
  sumFiscalYearThrough,
  sumTTMEndingAtCalendarMonth,
} from "@/lib/series-reference-columns"

export const EBITDA_MULTIPLE_CONFIG_TYPE = "ebitda-multiple-config"
export const EBITDA_DISCLAIMER_STORAGE_KEY = "ebitda-multiple-disclaimer-accepted"

/** Fenêtre série CDR : 5 exercices + TTM + PEC + marge. */
export const EBITDA_SERIES_LOOKBACK_MONTHS = 72

export type EbitdaColumnKind = "pec" | "ttm" | "fiscal"

export interface EbitdaColumnSpec {
  id: string
  kind: EbitdaColumnKind
  /** En-tête affiché (PEC, TTM, Déc 2025…). */
  label: string
  month: number
  year: number
}

export interface Adjustment {
  id: string
  name: string
  /** Montant par id de colonne (`pec`, `ttm`, `fy-2025`…). */
  amounts: Record<string, number>
  /**
   * Poste visé : revenus (reporte aussi sur le BAIIA) ou BAIIA seulement.
   * Défaut / legacy : `ebitda`.
   */
  target?: AdjustmentTarget
}

export type AdjustmentTarget = "revenue" | "ebitda"

export function normalizeAdjustmentTarget(
  target: AdjustmentTarget | string | undefined | null,
): AdjustmentTarget {
  return target === "revenue" ? "revenue" : "ebitda"
}

export interface EbitdaColumn {
  id: string
  kind: EbitdaColumnKind
  label: string
  month: number
  year: number
  ebitda: number
  revenue: number
  /** Revenus + ajustements ciblant les revenus. */
  adjustedRevenue: number
  adjustedEBITDA: number
  weight: number
  isRepresentative: boolean
}

/** @deprecated Conservé pour compat lecture legacy — préférer EbitdaColumn. */
export type EBITDAYear = EbitdaColumn

export type EbitdaRangeSide = "low" | "high"

export interface EnterpriseValueSeriesPoint {
  multiple: number
  enterpriseValue: number
  lowEV: number
  highEV: number
}

/** Payload ForecastConfig `ebitda-multiple-config`. */
export interface EbitdaMultipleConfigData {
  adjustments?: Adjustment[]
  lowMultiple?: number
  highMultiple?: number
  /** Poids alignés sur `columnIds` (sinon ordre chronologique legacy). */
  weights?: number[]
  isRepresentative?: boolean[]
  columnIds?: string[]
  lowEBITDARange?: number
  highEBITDARange?: number
  lowRevenueRange?: number
  highRevenueRange?: number
  /** §4 Flux monétaires — taux d’impôt (%). */
  cashFlowTaxRate?: number
  /** @deprecated Remplacé par croissance × FDR % VCA. */
  cashFlowWorkingCapital?: number
  /** Capex de maintien — borne basse ($). */
  cashFlowMaintenanceCapexLow?: number
  /** Capex de maintien — borne haute ($). */
  cashFlowMaintenanceCapexHigh?: number
  /** @deprecated Préférer Low/High. */
  cashFlowMaintenanceCapex?: number
  /** Croissance économique / inflation pour l’ajustement FDR (%). */
  cashFlowEconomicGrowth?: number
  /** Flux monétaires caractéristiques — borne basse (persisté pour Multiplicateur). */
  characteristicCashFlowLow?: number
  /** Flux monétaires caractéristiques — borne haute. */
  characteristicCashFlowHigh?: number
  /** Capacité de remboursement (Capitalisation) — taux / durée. */
  repaymentCapacity?: {
    annualInterestRate?: number
    durationYears?: number
  }
  repaymentCapacityNotes?: {
    annualInterestRate?: string
    durationYears?: string
  }
  /** Hypothèses Dette / BAIIA (empiriques, IA, comparables, retenu). */
  debtCapacity?: {
    debtBaiiaEmpirical?: number
    debtBaiiaAi?: number
    debtBaiiaComparables?: number
    debtBaiiaRetained?: number
  }
  debtCapacityNotes?: {
    debtBaiiaEmpirical?: string
    debtBaiiaAi?: string
    debtBaiiaComparables?: string
    debtBaiiaRetained?: string
  }
}

/** Hypothèses du pont de flux monétaires caractéristiques. */
export type CharacteristicCashFlowInputs = {
  taxRate: number
  /** Ajustement FDR déjà calculé ($), distinct bas / haut / moyen. */
  workingCapitalLow: number
  workingCapitalHigh: number
  workingCapitalMid: number
  maintenanceCapexLow: number
  maintenanceCapexHigh: number
  maintenanceCapexMid: number
}

export type CharacteristicCashFlowScenario = {
  baiia: number
  tax: number
  afterTax: number
  workingCapital: number
  maintenanceCapex: number
  characteristicCashFlow: number
}

export type CharacteristicCashFlowAnalysis = {
  low: CharacteristicCashFlowScenario
  high: CharacteristicCashFlowScenario
  mid: CharacteristicCashFlowScenario
}

/** Détail du calcul d’ajustement FDR (une borne de revenus). */
export type WorkingCapitalAdjustmentDetail = {
  revenue: number
  /** Revenus × croissance. */
  fdrGrowthEstimate: number
  /**
   * Ajustement FDR = FDR%_VCA × (Revenus × Croissance).
   */
  adjustment: number
}

export type WorkingCapitalAdjustmentAnalysis = {
  low: WorkingCapitalAdjustmentDetail
  high: WorkingCapitalAdjustmentDetail
  mid: WorkingCapitalAdjustmentDetail
  economicGrowthPct: number
  fdrPctOfRevenue: number | null
}

export const DEFAULT_CHARACTERISTIC_CASH_FLOW = {
  taxRate: 26.5,
  maintenanceCapexLow: 0,
  maintenanceCapexHigh: 0,
  economicGrowthPct: 2,
}

/**
 * Ajustement FDR pour les flux :
 * FDR%_VCA × (Revenus retenus × Croissance économique).
 */
export function computeWorkingCapitalAdjustment(
  revenue: number,
  economicGrowthPct: number,
  fdrPctOfRevenue: number | null,
): WorkingCapitalAdjustmentDetail {
  const rev = Number.isFinite(revenue) ? revenue : 0
  const g = Number.isFinite(economicGrowthPct) ? economicGrowthPct / 100 : 0
  const fdrPct =
    fdrPctOfRevenue != null && Number.isFinite(fdrPctOfRevenue)
      ? fdrPctOfRevenue / 100
      : 0
  const fdrGrowthEstimate = rev * g
  return {
    revenue: rev,
    fdrGrowthEstimate,
    adjustment: fdrGrowthEstimate * fdrPct,
  }
}

export function computeWorkingCapitalAdjustmentAnalysis(
  revenueLow: number,
  revenueHigh: number,
  economicGrowthPct: number,
  fdrPctOfRevenue: number | null,
): WorkingCapitalAdjustmentAnalysis {
  const mid = (revenueLow + revenueHigh) / 2
  return {
    low: computeWorkingCapitalAdjustment(revenueLow, economicGrowthPct, fdrPctOfRevenue),
    high: computeWorkingCapitalAdjustment(revenueHigh, economicGrowthPct, fdrPctOfRevenue),
    mid: computeWorkingCapitalAdjustment(mid, economicGrowthPct, fdrPctOfRevenue),
    economicGrowthPct,
    fdrPctOfRevenue,
  }
}

function configNumber(data: Record<string, unknown>, key: string): number | null {
  const v = data[key]
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** FDR % VCA depuis `net-tangible-fdr-adjustment`. */
export function parseVcaFdrPctOfRevenue(data: unknown): number | null {
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  const pct = configNumber(d, "pctOfRevenue")
  if (pct != null) return pct
  if (d.mode === "percent-revenue") return configNumber(d, "value")
  return null
}

/**
 * Recalcule les flux caractéristiques bas / haut / moyen depuis
 * `ebitda-multiple-config` (+ FDR % VCA) — même moteur que Flux monétaires.
 */
export function deriveCharacteristicCashFlowRange(
  ebitdaConfigData: unknown,
  fdrPctOfRevenue: number | null,
): { low: number; high: number; mid: number } | null {
  if (!ebitdaConfigData || typeof ebitdaConfigData !== "object") return null
  const d = ebitdaConfigData as Record<string, unknown>
  const baiiaLow = configNumber(d, "lowEBITDARange")
  const baiiaHigh = configNumber(d, "highEBITDARange")
  if (baiiaLow == null || baiiaHigh == null) return null

  const revenueLow = configNumber(d, "lowRevenueRange") ?? 0
  const revenueHigh = configNumber(d, "highRevenueRange") ?? 0
  const taxRate =
    configNumber(d, "cashFlowTaxRate") ?? DEFAULT_CHARACTERISTIC_CASH_FLOW.taxRate
  const growth =
    configNumber(d, "cashFlowEconomicGrowth") ??
    DEFAULT_CHARACTERISTIC_CASH_FLOW.economicGrowthPct
  const capexLow =
    configNumber(d, "cashFlowMaintenanceCapexLow") ??
    configNumber(d, "cashFlowMaintenanceCapex") ??
    DEFAULT_CHARACTERISTIC_CASH_FLOW.maintenanceCapexLow
  const capexHigh =
    configNumber(d, "cashFlowMaintenanceCapexHigh") ??
    configNumber(d, "cashFlowMaintenanceCapex") ??
    DEFAULT_CHARACTERISTIC_CASH_FLOW.maintenanceCapexHigh

  const wc = computeWorkingCapitalAdjustmentAnalysis(
    revenueLow,
    revenueHigh,
    growth,
    fdrPctOfRevenue,
  )
  const midCapex = (capexLow + capexHigh) / 2
  const cf = computeCharacteristicCashFlows(baiiaLow, baiiaHigh, {
    taxRate,
    workingCapitalLow: wc.low.adjustment,
    workingCapitalHigh: wc.high.adjustment,
    workingCapitalMid: wc.mid.adjustment,
    maintenanceCapexLow: capexLow,
    maintenanceCapexHigh: capexHigh,
    maintenanceCapexMid: midCapex,
  })
  return {
    low: cf.low.characteristicCashFlow,
    high: cf.high.characteristicCashFlow,
    mid: cf.mid.characteristicCashFlow,
  }
}

/**
 * Pont : BAIIA ajusté − impôt (taux × BAIIA) − ajustement FDR − Capex de maintien
 * → Flux monétaires caractéristiques (bas / haut / moyen).
 */
export function computeCharacteristicCashFlows(
  baiiaLow: number,
  baiiaHigh: number,
  inputs: CharacteristicCashFlowInputs,
): CharacteristicCashFlowAnalysis {
  const rate = Number.isFinite(inputs.taxRate) ? inputs.taxRate / 100 : 0

  const build = (
    baiia: number,
    workingCapital: number,
    maintenanceCapex: number,
  ): CharacteristicCashFlowScenario => {
    const tax = baiia * rate
    const afterTax = baiia - tax
    const wc = Number.isFinite(workingCapital) ? workingCapital : 0
    const capex = Number.isFinite(maintenanceCapex) ? maintenanceCapex : 0
    return {
      baiia,
      tax,
      afterTax,
      workingCapital: wc,
      maintenanceCapex: capex,
      // Ajustement FDR = FDR% × revenus × croissance (positif) — on le déduit du pont.
      characteristicCashFlow: afterTax - wc - capex,
    }
  }

  const midBaiia = (baiiaLow + baiiaHigh) / 2
  return {
    low: build(baiiaLow, inputs.workingCapitalLow, inputs.maintenanceCapexLow),
    high: build(baiiaHigh, inputs.workingCapitalHigh, inputs.maintenanceCapexHigh),
    mid: build(midBaiia, inputs.workingCapitalMid, inputs.maintenanceCapexMid),
  }
}

/**
 * Capitalisation des flux : taux = CMPC − croissance ; multiple = 1 / taux.
 * CMPC et croissance sont en % (ex. 10.75 et 2 → taux 8.75 % → multiple ≈ 11.43×).
 */
export type CashFlowCapitalisationInputs = {
  /** CMPC retenu (Multiplicateur), en %. */
  cmpcPct: number | null
  /** Croissance économique (Flux monétaires), en %. */
  economicGrowthPct: number
  cashFlowLow: number
  cashFlowHigh: number
}

export type CashFlowCapitalisationResult = {
  cmpcPct: number | null
  economicGrowthPct: number
  /** CMPC − croissance (en %). */
  capitalizationRatePct: number | null
  /** 1 / (taux / 100) = 100 / taux. */
  multiple: number | null
  cashFlow: { low: number; high: number; mid: number }
  enterpriseValue: { low: number; high: number; mid: number } | null
}

export function computeCashFlowCapitalisation(
  inputs: CashFlowCapitalisationInputs,
): CashFlowCapitalisationResult {
  const growth = Number.isFinite(inputs.economicGrowthPct) ? inputs.economicGrowthPct : 0
  const cfLow = Number.isFinite(inputs.cashFlowLow) ? inputs.cashFlowLow : 0
  const cfHigh = Number.isFinite(inputs.cashFlowHigh) ? inputs.cashFlowHigh : 0
  const cashFlow = { low: cfLow, high: cfHigh, mid: (cfLow + cfHigh) / 2 }

  const cmpc =
    inputs.cmpcPct != null && Number.isFinite(inputs.cmpcPct) ? inputs.cmpcPct : null
  if (cmpc == null) {
    return {
      cmpcPct: null,
      economicGrowthPct: growth,
      capitalizationRatePct: null,
      multiple: null,
      cashFlow,
      enterpriseValue: null,
    }
  }

  const capitalizationRatePct = cmpc - growth
  const multiple =
    Number.isFinite(capitalizationRatePct) && capitalizationRatePct > 1e-9
      ? 100 / capitalizationRatePct
      : null

  return {
    cmpcPct: cmpc,
    economicGrowthPct: growth,
    capitalizationRatePct,
    multiple,
    cashFlow,
    enterpriseValue:
      multiple != null
        ? {
            low: cashFlow.low * multiple,
            high: cashFlow.high * multiple,
            mid: cashFlow.mid * multiple,
          }
        : null,
  }
}

/** Achalandage = VE − ACN ; métriques vs dénominateurs moyens (bas/haut/moyen du numérateur). */
export type RangeTriple = { low: number; high: number; mid: number }

export type CapitalisationGoodwillResult = {
  acn: number | null
  goodwill: RangeTriple | null
  ratios: {
    veOverRevenue: { low: number | null; high: number | null; mid: number | null }
    veOverBaiia: { low: number | null; high: number | null; mid: number | null }
    veOverCashFlow: { low: number | null; high: number | null; mid: number | null }
    goodwillOverBaiia: { low: number | null; high: number | null; mid: number | null }
    goodwillOverCashFlow: { low: number | null; high: number | null; mid: number | null }
    cashFlowOverBaiia: { low: number | null; high: number | null; mid: number | null }
  }
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  if (Math.abs(denominator) < 1e-9) return null
  return numerator / denominator
}

/** Numérateurs bas/haut/moyen ÷ dénominateur moyen uniquement. */
function ratioVsMid(
  nums: RangeTriple,
  denMid: number,
): { low: number | null; high: number | null; mid: number | null } {
  return {
    low: safeRatio(nums.low, denMid),
    high: safeRatio(nums.high, denMid),
    mid: safeRatio(nums.mid, denMid),
  }
}

export function computeCapitalisationGoodwillAndRatios(inputs: {
  enterpriseValue: RangeTriple | null
  acn: number | null
  revenue: RangeTriple
  baiia: RangeTriple
  cashFlow: RangeTriple
}): CapitalisationGoodwillResult {
  const acn =
    inputs.acn != null && Number.isFinite(inputs.acn) ? inputs.acn : null
  const goodwill =
    inputs.enterpriseValue != null && acn != null
      ? {
          low: inputs.enterpriseValue.low - acn,
          high: inputs.enterpriseValue.high - acn,
          mid: inputs.enterpriseValue.mid - acn,
        }
      : null

  const emptyRatio = { low: null, high: null, mid: null }
  const cashFlowOverBaiia = ratioVsMid(inputs.cashFlow, inputs.baiia.mid)

  if (inputs.enterpriseValue == null) {
    return {
      acn,
      goodwill,
      ratios: {
        veOverRevenue: emptyRatio,
        veOverBaiia: emptyRatio,
        veOverCashFlow: emptyRatio,
        goodwillOverBaiia: emptyRatio,
        goodwillOverCashFlow: emptyRatio,
        cashFlowOverBaiia,
      },
    }
  }

  return {
    acn,
    goodwill,
    ratios: {
      veOverRevenue: ratioVsMid(inputs.enterpriseValue, inputs.revenue.mid),
      veOverBaiia: ratioVsMid(inputs.enterpriseValue, inputs.baiia.mid),
      veOverCashFlow: ratioVsMid(inputs.enterpriseValue, inputs.cashFlow.mid),
      goodwillOverBaiia:
        goodwill != null ? ratioVsMid(goodwill, inputs.baiia.mid) : emptyRatio,
      goodwillOverCashFlow:
        goodwill != null ? ratioVsMid(goodwill, inputs.cashFlow.mid) : emptyRatio,
      cashFlowOverBaiia,
    },
  }
}

export function isReferenceAtFiscalYearEnd(
  refMonth: number,
  fiscalYearEndMonth: number,
): boolean {
  return refMonth === fiscalYearEndMonth
}

export function fiscalYearColumnId(endYear: number): string {
  return `fy-${endYear}`
}

/**
 * Colonnes BAIIA selon la date de référence et la clôture d’exercice.
 * Ordre d’affichage (plus récent → plus ancien).
 *
 * - Clôture = réf. → 5 exercices complets (ex. Déc 2026 … Déc 2022).
 * - Sinon → PEC, TTM, puis 5 exercices complets clos (ex. Déc 2025 … Déc 2021).
 */
export function buildEbitdaColumnSpecs(
  refMonth: number,
  refYear: number,
  fiscalYearEndMonth: number,
  completeYearCount = 5,
): EbitdaColumnSpec[] {
  if (isReferenceAtFiscalYearEnd(refMonth, fiscalYearEndMonth)) {
    const specs: EbitdaColumnSpec[] = []
    for (let i = 0; i < completeYearCount; i++) {
      const year = refYear - i
      specs.push({
        id: fiscalYearColumnId(year),
        kind: "fiscal",
        label: formatCalendarMonthYearShort(fiscalYearEndMonth, year),
        month: fiscalYearEndMonth,
        year,
      })
    }
    return specs
  }

  const lastComplete = lastCompletedFiscalYearEnd(refMonth, refYear, fiscalYearEndMonth)
  const fiscalSpecs: EbitdaColumnSpec[] = []
  for (let i = 0; i < completeYearCount; i++) {
    const year = lastComplete.year - i
    fiscalSpecs.push({
      id: fiscalYearColumnId(year),
      kind: "fiscal",
      label: formatCalendarMonthYearShort(fiscalYearEndMonth, year),
      month: fiscalYearEndMonth,
      year,
    })
  }

  return [
    {
      id: "pec",
      kind: "pec",
      label: "PEC",
      month: refMonth,
      year: refYear,
    },
    {
      id: "ttm",
      kind: "ttm",
      label: "TTM",
      month: refMonth,
      year: refYear,
    },
    ...fiscalSpecs,
  ]
}

export function resolveColumnAmount(
  map: Map<string, number>,
  spec: EbitdaColumnSpec,
  fiscalYearEndMonth: number,
): number {
  if (spec.kind === "ttm") {
    return sumTTMEndingAtCalendarMonth(map, spec.month, spec.year)
  }
  return sumFiscalYearThrough(map, spec.month, spec.year, fiscalYearEndMonth)
}

export function defaultWeightsForSpecs(specs: EbitdaColumnSpec[]): number[] {
  const weights = specs.map(() => 0)
  if (specs.length === 0) return weights

  if (specs[0]?.kind === "pec" && specs[1]?.kind === "ttm") {
    // TTM + dernier exercice complet
    weights[1] = 0.3
    if (specs.length > 2) weights[2] = 0.25
    return weights
  }

  // Clôture : deux exercices les plus récents
  weights[0] = 0.3
  if (specs.length > 1) weights[1] = 0.25
  return weights
}

export function createColumnsFromSpecs(
  specs: EbitdaColumnSpec[],
  amounts: { ebitda: Record<string, number>; revenue: Record<string, number> },
  previous?: EbitdaColumn[],
): EbitdaColumn[] {
  const defaults = defaultWeightsForSpecs(specs)
  return specs.map((spec, i) => {
    const prev = previous?.find((c) => c.id === spec.id)
    const ebitda = amounts.ebitda[spec.id] ?? 0
    const revenue = amounts.revenue[spec.id] ?? 0
    return {
      ...spec,
      ebitda,
      revenue,
      adjustedRevenue: revenue,
      adjustedEBITDA: ebitda,
      weight: prev?.weight ?? defaults[i] ?? 0,
      isRepresentative: prev?.isRepresentative ?? (defaults[i] ?? 0) > 0,
    }
  })
}

export function computeSeriesAmountsByColumn(
  rows: SeriesRow[],
  periods: SeriesPeriod[],
  specs: EbitdaColumnSpec[],
  fiscalYearEndMonth: number,
): { ebitda: Record<string, number>; revenue: Record<string, number> } {
  const ebitda: Record<string, number> = {}
  const revenue: Record<string, number> = {}
  if (periods.length === 0 || specs.length === 0) {
    for (const spec of specs) {
      ebitda[spec.id] = 0
      revenue[spec.id] = 0
    }
    return { ebitda, revenue }
  }

  const ebitdaRow = findBaiiaSeriesRow(rows)
  const revenueRow = findIncomeStatementRevenueRow(rows)
  const ebitdaMap = ebitdaRow
    ? buildAmountsByCalendarMonth(ebitdaRow, periods)
    : new Map<string, number>()
  const revenueMap = revenueRow
    ? buildAmountsByCalendarMonth(revenueRow, periods)
    : new Map<string, number>()

  for (const spec of specs) {
    ebitda[spec.id] = resolveColumnAmount(ebitdaMap, spec, fiscalYearEndMonth)
    revenue[spec.id] = resolveColumnAmount(revenueMap, spec, fiscalYearEndMonth)
  }
  return { ebitda, revenue }
}

/** Migre les clés d’ajustement numériques legacy (`2025`) vers `fy-2025`. */
export function migrateAdjustmentAmountKeys(
  amounts: Record<string, number> | undefined,
): Record<string, number> {
  if (!amounts) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(amounts)) {
    if (/^\d{4}$/.test(key)) out[fiscalYearColumnId(Number(key))] = value
    else out[key] = value
  }
  return out
}

export function lastCompleteFiscalYear(
  fiscalYearEnd?: string | null,
  now: Date = new Date(),
): number {
  const curMonth = now.getMonth() + 1
  const curYear = now.getFullYear()
  const fyEndMonth = parseFiscalYearEndMonth(fiscalYearEnd || "12-31")
  const currentFY = curMonth <= fyEndMonth ? curYear : curYear + 1
  return currentFY - 1
}

export function defaultFiscalYears(lastCompleteFY: number): number[] {
  return [
    lastCompleteFY - 4,
    lastCompleteFY - 3,
    lastCompleteFY - 2,
    lastCompleteFY - 1,
    lastCompleteFY,
  ]
}

export function createDefaultEbitdaYears(anchorYear?: number): EbitdaColumn[] {
  const yr = anchorYear ?? new Date().getFullYear()
  const specs = buildEbitdaColumnSpecs(12, yr, 12, 5)
  return createColumnsFromSpecs(specs, { ebitda: {}, revenue: {} })
}

export function pickRevenueAndEbitdaFromRows(
  rows: Array<{ label: string; current: number; isResult?: boolean }>,
): { revenue: number; ebitda: number } {
  const revenueRow =
    rows.find((r) => r.label.toLowerCase().includes("revenu") && r.isResult) ||
    rows.find((r) => r.label.toLowerCase().includes("revenu"))

  const ebitdaRow =
    rows.find(
      (r) =>
        (r.label.toLowerCase().includes("baiia") ||
          r.label.toLowerCase().includes("ebitda")) &&
        r.isResult,
    ) ||
    rows.find(
      (r) =>
        r.label.toLowerCase().includes("baiia") ||
        r.label.toLowerCase().includes("ebitda"),
    )

  return {
    revenue: revenueRow ? revenueRow.current : 0,
    ebitda: ebitdaRow ? ebitdaRow.current : 0,
  }
}

export function getTotalAdjustmentsForColumn(
  adjustments: Adjustment[],
  columnId: string,
  target?: AdjustmentTarget,
): number {
  return adjustments.reduce((sum, adj) => {
    if (
      target != null &&
      normalizeAdjustmentTarget(adj.target) !== target
    ) {
      return sum
    }
    return sum + (adj.amounts[columnId] || 0)
  }, 0)
}

/** @deprecated Utiliser getTotalAdjustmentsForColumn. */
export function getTotalAdjustmentsForYear(
  adjustments: Adjustment[],
  year: number,
): number {
  return getTotalAdjustmentsForColumn(adjustments, fiscalYearColumnId(year))
}

export function computeAdjustedColumns(
  columns: EbitdaColumn[],
  adjustments: Adjustment[],
): EbitdaColumn[] {
  return columns.map((col) => {
    const revenueAdjustments = getTotalAdjustmentsForColumn(
      adjustments,
      col.id,
      "revenue",
    )
    const ebitdaAdjustments = getTotalAdjustmentsForColumn(
      adjustments,
      col.id,
      "ebitda",
    )
    return {
      ...col,
      adjustedRevenue: col.revenue + revenueAdjustments,
      // Ajustement revenus → BAIIA (1:1) ; ajustement BAIIA en sus.
      adjustedEBITDA: col.ebitda + revenueAdjustments + ebitdaAdjustments,
    }
  })
}

/** @deprecated */
export function computeAdjustedYears(
  years: EbitdaColumn[],
  adjustments: Adjustment[],
): EbitdaColumn[] {
  return computeAdjustedColumns(years, adjustments)
}

/** Colonne sans chiffre significatif (revenus / BAIIA / montants ajustés ≈ 0). */
export function isEbitdaColumnPopulated(
  col: Pick<
    EbitdaColumn,
    "revenue" | "ebitda" | "adjustedRevenue" | "adjustedEBITDA"
  >,
  epsilon: number = HORIZON_EMPTY_EPSILON,
): boolean {
  return (
    Math.abs(col.revenue) > epsilon ||
    Math.abs(col.ebitda) > epsilon ||
    Math.abs(col.adjustedRevenue ?? col.revenue) > epsilon ||
    Math.abs(col.adjustedEBITDA) > epsilon
  )
}

/** Masque les colonnes vides du tableau BAIIA (même logique que les horizons Capex / ratios). */
export function filterPopulatedEbitdaColumns(columns: EbitdaColumn[]): EbitdaColumn[] {
  return columns.filter(isEbitdaColumnPopulated)
}

export function computeWeightedAverageEBITDA(columns: EbitdaColumn[]): number {
  const representative = columns.filter(
    (y) => y.weight > 0 && isEbitdaColumnPopulated(y),
  )
  const totalWeight = representative.reduce((sum, y) => sum + y.weight, 0)
  if (totalWeight <= 0) return 0
  return (
    representative.reduce((sum, y) => sum + y.adjustedEBITDA * y.weight, 0) /
    totalWeight
  )
}

/** Moyenne simple des `n` derniers exercices fiscaux complets peuplés (ignore PEC/TTM et colonnes vides).
 *  Retourne `null` s’il n’y a pas assez d’exercices peuplés (à masquer dans la synthèse). */
export function computeAverageNFiscalYears(
  columns: EbitdaColumn[],
  n: number,
): number | null {
  const fiscal = columns.filter((c) => c.kind === "fiscal" && isEbitdaColumnPopulated(c))
  if (n <= 0 || fiscal.length < n) return null
  // display order is newest-first; take first n fiscal columns with data
  const slice = fiscal.slice(0, n)
  return slice.reduce((sum, y) => sum + y.adjustedEBITDA, 0) / n
}

/** BAIIA ajusté du dernier exercice fiscal peuplé (plus récent), ou null. */
export function computeLastFiscalYearEBITDA(columns: EbitdaColumn[]): number | null {
  const fiscal = columns.filter((c) => c.kind === "fiscal" && isEbitdaColumnPopulated(c))
  if (fiscal.length === 0) return null
  return fiscal[0]!.adjustedEBITDA
}

/** Moyenne simple des revenus ajustés sur les `n` derniers exercices fiscaux peuplés. */
export function computeAverageNFiscalRevenue(
  columns: EbitdaColumn[],
  n: number,
): number | null {
  const fiscal = columns.filter((c) => c.kind === "fiscal" && isEbitdaColumnPopulated(c))
  if (n <= 0 || fiscal.length < n) return null
  const slice = fiscal.slice(0, n)
  return slice.reduce((sum, y) => sum + (y.adjustedRevenue ?? y.revenue), 0) / n
}

/** Revenus ajustés du dernier exercice fiscal peuplé, ou null. */
export function computeLastFiscalYearRevenue(columns: EbitdaColumn[]): number | null {
  const fiscal = columns.filter((c) => c.kind === "fiscal" && isEbitdaColumnPopulated(c))
  if (fiscal.length === 0) return null
  return fiscal[0]!.adjustedRevenue ?? fiscal[0]!.revenue
}

export function computeWeightedAverageRevenue(columns: EbitdaColumn[]): number {
  const representative = columns.filter(
    (y) => y.weight > 0 && isEbitdaColumnPopulated(y),
  )
  const totalWeight = representative.reduce((sum, y) => sum + y.weight, 0)
  if (totalWeight <= 0) return 0
  return (
    representative.reduce(
      (sum, y) => sum + (y.adjustedRevenue ?? y.revenue) * y.weight,
      0,
    ) / totalWeight
  )
}

export type EbitdaSynthesisAverageRow = {
  id: string
  /** Nombre d’exercices (1 = dernier exercice). */
  yearCount: number
  label: string
  /** Moyenne / dernier des revenus ajustés. */
  revenue: number
  /** Moyenne / dernier du BAIIA ajusté. */
  ebitda: number
}

const SYNTHESIS_AVERAGE_SPECS: { yearCount: number; label: string; id: string }[] = [
  { yearCount: 5, label: "Moyenne 5 exercices", id: "avg-5y" },
  { yearCount: 4, label: "Moyenne 4 ans", id: "avg-4y" },
  { yearCount: 3, label: "Moyenne 3 ans", id: "avg-3y" },
  { yearCount: 2, label: "Moyenne 2 ans", id: "avg-2y" },
  { yearCount: 1, label: "Dernier exercice", id: "last-fy" },
]

/**
 * Lignes de synthèse : moyennes N ans + dernier exercice (revenus ajustés + BAIIA).
 * Masque toute moyenne qui exige plus d’exercices peuplés qu’il n’y en a.
 */
export function buildEbitdaSynthesisAverages(
  columns: EbitdaColumn[],
): EbitdaSynthesisAverageRow[] {
  const rows: EbitdaSynthesisAverageRow[] = []
  for (const spec of SYNTHESIS_AVERAGE_SPECS) {
    const ebitda =
      spec.yearCount === 1
        ? computeLastFiscalYearEBITDA(columns)
        : computeAverageNFiscalYears(columns, spec.yearCount)
    const revenue =
      spec.yearCount === 1
        ? computeLastFiscalYearRevenue(columns)
        : computeAverageNFiscalRevenue(columns, spec.yearCount)
    if (ebitda == null || revenue == null) continue
    rows.push({
      id: spec.id,
      yearCount: spec.yearCount,
      label: spec.label,
      revenue,
      ebitda,
    })
  }
  return rows
}

/** @deprecated Préférer computeAverageNFiscalYears. */
export function computeAverageNYears(columns: EbitdaColumn[], n: number): number {
  if (columns.length === 0 || n <= 0) return 0
  const chronological = [...columns].reverse()
  const slice = chronological.slice(-n)
  return slice.reduce((sum, y) => sum + y.adjustedEBITDA, 0) / slice.length
}

export function buildEnterpriseValueSeries(params: {
  lowMultiple: number
  highMultiple: number
  lowEBITDARange: number
  highEBITDARange: number
  step?: number
}): EnterpriseValueSeriesPoint[] {
  const {
    lowMultiple,
    highMultiple,
    lowEBITDARange,
    highEBITDARange,
    step = 0.1,
  } = params
  const data: EnterpriseValueSeriesPoint[] = []
  const minMultiple = Math.max(0, lowMultiple - 1)
  const maxMultiple = highMultiple + 1
  const avgEBITDA = (lowEBITDARange + highEBITDARange) / 2

  for (let mult = minMultiple; mult <= maxMultiple; mult += step) {
    data.push({
      multiple: parseFloat(mult.toFixed(1)),
      enterpriseValue: avgEBITDA * mult,
      lowEV: lowEBITDARange * mult,
      highEV: highEBITDARange * mult,
    })
  }
  return data
}

export function seedEbitdaRangeFromAverage(average: number): {
  low: number
  high: number
} {
  return { low: average * 0.9, high: average * 1.1 }
}

/** Alias — mêmes bornes ±10 % pour revenus ou BAIIA. */
export const seedRangeFromAverage = seedEbitdaRangeFromAverage

export function resolveFiscalYearEndMonth(
  fiscalYearEnd?: string | null,
): number {
  return parseFiscalYearEndMonth(fiscalYearEnd || "12-31")
}
