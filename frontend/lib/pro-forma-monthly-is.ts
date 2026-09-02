/**
 * Colonnes mensuelles Pro Forma Résultats (horizon projeté).
 * Répartit les montants annuels via la saisonnalité Hypothèses (12 %).
 */

import { distributeAnnualBySeasonality } from "@/lib/forecast-hypothesis-summary-utils"
import {
  createDefaultForecastSeasonalityMonthPercents,
  FORECAST_SEASONALITY_AXIS_LABELS,
  normalizeForecastSeasonalityMonthPercents,
} from "@/lib/forecast-seasonality-utils"
import type { TaxPaymentFrequency } from "@/lib/tax-forecast-utils"

export type ProFormaIsColumnHorizon = "annual" | "monthly"

/** Libellés des mois projetés (ex. 5 ans → 60 colonnes). */
export function buildProFormaMonthlyProjectedLabels(
  forecastBaseYear: number,
  projectionYears: number,
): string[] {
  const out: string[] = []
  const years = Math.max(0, Math.round(projectionYears) || 0)
  const base = Math.round(Number(forecastBaseYear) || 0)
  for (let y = 0; y < years; y++) {
    const year = base + y
    for (let m = 0; m < 12; m++) {
      out.push(`${FORECAST_SEASONALITY_AXIS_LABELS[m]} ${year}`)
    }
  }
  return out
}

export function proFormaMonthlyProjectedColumnCount(projectionYears: number): number {
  return Math.max(0, Math.round(projectionYears) || 0) * 12
}

/** Saisonnalité stockée sur un ajustement hyp. (revenus / dépenses). */
export function seasonalityFromAdjustmentMap(
  adjustments: Record<string, unknown> | null | undefined,
  rowId: string,
  configYearIndex: number,
  fallback: number[] = createDefaultForecastSeasonalityMonthPercents(),
): number[] {
  if (!adjustments || !rowId || configYearIndex < 1) {
    return normalizeForecastSeasonalityMonthPercents(fallback)
  }
  for (let y = configYearIndex; y >= 1; y--) {
    const list = adjustments[`${rowId}-${y}`]
    if (!Array.isArray(list)) continue
    for (let i = list.length - 1; i >= 0; i--) {
      const item = list[i] as { seasonalityMonthPercents?: unknown } | null | undefined
      const raw = item?.seasonalityMonthPercents
      if (Array.isArray(raw) && raw.length === 12) {
        return normalizeForecastSeasonalityMonthPercents(raw.map((x) => Number(x)))
      }
    }
  }
  return normalizeForecastSeasonalityMonthPercents(fallback)
}

/**
 * Transforme une série annuelle Pro Forma (N-1 / YTD + années projetées)
 * en série mensuelle des seules années projetées.
 */
export function expandProjectedAnnualTrendToMonthly(params: {
  annualTrend: number[] | null | undefined
  forecastActualCols: number
  projectionYears: number
  seasonalityForConfigYear: (configYearIndex: number) => number[]
}): number[] {
  const actualCols = Math.max(0, params.forecastActualCols)
  const years = Math.max(0, Math.round(params.projectionYears) || 0)
  const trend = params.annualTrend ?? []
  const months: number[] = []
  for (let y = 0; y < years; y++) {
    const displayIdx = actualCols + y
    const annual = trend[displayIdx] ?? 0
    const configYearIndex = y + 1
    const seasonality = params.seasonalityForConfigYear(configYearIndex)
    months.push(...distributeAnnualBySeasonality(Number(annual) || 0, seasonality))
  }
  return months
}

/** Charge d’impôt mensuelle (comptabilisation) = taux × max(0, BAI du mois). */
export function monthlyTaxExpenseFromBai(monthlyBai: number, taxRatePercent: number): number {
  const rate = Number.isFinite(taxRatePercent) ? Math.min(100, Math.max(0, taxRatePercent)) : 0
  const bai = Number.isFinite(monthlyBai) ? monthlyBai : 0
  return Math.round(Math.max(0, bai) * (rate / 100))
}

/**
 * Calendrier de versement d’acomptes (trésorerie / bilan) — pas la charge IS.
 * Retourne 12 poids (somme 1) indiquant quand l’impôt de l’année est payé.
 */
export function taxPaymentMonthWeights(frequency: TaxPaymentFrequency): number[] {
  const w = Array(12).fill(0)
  if (frequency === "monthly") {
    return Array(12).fill(1 / 12)
  }
  if (frequency === "quarterly") {
    // Fin de trimestre civil : mars, juin, sept, déc
    for (const m of [2, 5, 8, 11]) w[m] = 0.25
    return w
  }
  if (frequency === "semiannual") {
    w[5] = 0.5
    w[11] = 0.5
    return w
  }
  // Annuel : paiement en fin d’exercice (décembre)
  w[11] = 1
  return w
}

export function distributeAnnualTaxPayments(
  annualTaxExpense: number,
  frequency: TaxPaymentFrequency,
): number[] {
  const weights = taxPaymentMonthWeights(frequency)
  const total = Math.abs(Number.isFinite(annualTaxExpense) ? annualTaxExpense : 0)
  return distributeAnnualBySeasonality(
    total,
    weights.map((x) => x * 100),
  )
}

/** Répartition uniforme (amortissement / intérêts annuels → 12 mois). */
export function flatMonthlySeasonalityPercents(): number[] {
  return createDefaultForecastSeasonalityMonthPercents()
}

function normIsLabel(label: string): string {
  return String(label ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function findTrendByLabels(
  rows: { label: string; trendValues?: number[] }[],
  labels: string[],
): number[] | undefined {
  const wanted = new Set(labels.map(normIsLabel))
  for (const row of rows) {
    if (wanted.has(normIsLabel(row.label)) && row.trendValues?.length) {
      return row.trendValues
    }
  }
  return undefined
}

/**
 * Après expansion mensuelle : recalcule la cascade Sommaire
 * (brut, BAI, impôts = taux × max(0,BAI), BN) mois par mois.
 */
export function recomputeProFormaMonthlyIsCascade<
  T extends { label: string; trendValues?: number[]; current?: number; prior?: number },
>(rows: T[], taxRatePercent: number): T[] {
  const revenus = findTrendByLabels(rows, ["revenus", "revenu"])
  const cmv = findTrendByLabels(rows, [
    "cout des produits vendus",
    "couts des produits vendus",
    "coût des produits vendus",
    "coûts des produits vendus",
  ])
  const charges = findTrendByLabels(rows, ["total des charges"])
  if (!revenus?.length) return rows

  const len = revenus.length
  const brut: number[] = Array.from({ length: len }, (_, i) => {
    const r = revenus[i] ?? 0
    const c = cmv?.[i] ?? 0
    return r - c
  })
  const bai: number[] = Array.from({ length: len }, (_, i) => {
    const b = brut[i] ?? 0
    const ch = charges?.[i] ?? 0
    return b - ch
  })
  const impots: number[] = bai.map((v) => monthlyTaxExpenseFromBai(v, taxRatePercent))
  const net: number[] = Array.from({ length: len }, (_, i) => (bai[i] ?? 0) - (impots[i] ?? 0))

  return rows.map((row) => {
    const n = normIsLabel(row.label)
    let trend: number[] | undefined
    if (n === "benefice brut") trend = brut
    else if (
      n === "benefice avant impots" ||
      (n.includes("benefice avant") && n.includes("impot"))
    ) {
      trend = bai
    } else if (
      n === "impots" ||
      n.startsWith("impots ") ||
      n === "impot" ||
      n.startsWith("impot ")
    ) {
      trend = impots
    } else if (n === "benefice net" || n === "benefices nets") {
      trend = net
    } else {
      return row
    }
    return {
      ...row,
      trendValues: trend,
      current: trend[0] ?? 0,
      prior: trend[1] ?? 0,
    }
  })
}
