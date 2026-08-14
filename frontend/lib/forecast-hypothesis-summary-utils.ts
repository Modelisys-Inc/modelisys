import {
  createDefaultForecastSeasonalityMonthPercents,
  FORECAST_SEASONALITY_AXIS_LABELS,
  FORECAST_SEASONALITY_MONTH_LABELS,
  normalizeForecastSeasonalityMonthPercents,
  shiftSeasonalityEarlierForPreRevenue,
} from "@/lib/forecast-seasonality-utils"
import {
  clampRoundBadDebt,
  createDefaultAdvancedBuckets,
  normalizeAdvancedBuckets,
  type ForecastCollectionBucket,
  type ForecastPreRevenueNeed,
} from "@/lib/forecast-collection-cash-utils"

export type HypothesisYearSummaryInput = {
  annual: number
  /** Montant annuel pour la courbe décaissement (défaut = annual). */
  cashFlowAnnual?: number
  seasonalityMonthPercents: number[]
  /** Si true, le décaissement suit directement la saisonnalité (sans délais de paiement). */
  cashFlowBySeasonalityDirect?: boolean
  /** Saisonnalité du décaissement (défaut = seasonalityMonthPercents). */
  cashFlowSeasonalityMonthPercents?: number[]
  /** Toujours 0 (encaissement / décaissement à 100 %). Conservé pour compatibilité du payload. */
  badDebtPercent: number
  buckets: ForecastCollectionBucket[]
  /** Dépenses variables : avance pré-revenus → décalage de la saisonnalité ; décaissement = charge + délai paiement. */
  preRevenueNeed?: ForecastPreRevenueNeed
}

export type HypothesisSummaryMoneyPoint = {
  axisLabel: string
  monthName: string
  primary: number
  cashFlow: number
  balance: number
}

/** Délai (jours) → mois civils après le mois de charge / reconnaissance. */
export function collectionDelayToMonthOffset(delayDays: number): number {
  const d = Math.max(0, Math.round(Number(delayDays) || 0))
  return Math.max(0, Math.round(d / 30))
}

/** Mois de paiement par rapport au mois de charge (délai fournisseur ; l’avance pré-revenus décale la saisonnalité). */
export function disbursementCashOutMonthOffset(
  paymentDelayDays: number,
  _preRevenue?: ForecastPreRevenueNeed
): number {
  return collectionDelayToMonthOffset(paymentDelayDays)
}

function effectiveSummarySeasonality(
  monthPercents: number[],
  preRevenue?: ForecastPreRevenueNeed
): number[] {
  const base = normalizeSummarySeasonality(monthPercents)
  if (preRevenue?.enabled) {
    return shiftSeasonalityEarlierForPreRevenue(base, preRevenue.advanceDays)
  }
  return base
}

/** Répartit le montant annuel sur 12 mois selon les % de saisonnalité. */
export function distributeAnnualBySeasonality(annual: number, monthPercentsRaw: number[]): number[] {
  const pct =
    monthPercentsRaw.length >= 12
      ? monthPercentsRaw.slice(0, 12)
      : [...monthPercentsRaw, ...Array(12 - monthPercentsRaw.length).fill(0)]
  const safe = pct.map((p) => Math.max(0, Number(p) || 0))
  const total = safe.reduce((a, b) => a + b, 0)
  const weights = total > 0 ? safe.map((p) => p / total) : Array(12).fill(1 / 12)
  const floats = weights.map((w) => annual * w)
  const out = floats.map((x) => Math.floor(x))
  let diff = Math.round(annual) - out.reduce((a, b) => a + b, 0)
  let guard = 0
  while (diff !== 0 && guard < 5000) {
    let best = 0
    let bestFrac = -Infinity
    for (let m = 0; m < 12; m++) {
      const frac = floats[m]! - out[m]!
      if (frac > bestFrac) {
        bestFrac = frac
        best = m
      }
    }
    if (diff > 0) {
      out[best] = (out[best] ?? 0) + 1
      diff--
    } else {
      const m = out.findIndex((v) => v > 0)
      if (m < 0) break
      out[m] = (out[m] ?? 0) - 1
      diff++
    }
    guard++
  }
  return out
}

export function normalizeSummarySeasonality(months: number[]): number[] {
  return normalizeForecastSeasonalityMonthPercents(
    months.length >= 12 ? months : createDefaultForecastSeasonalityMonthPercents()
  )
}

/**
 * Sommaire sur une seule année-colonne : pas de report depuis d'autres années.
 */
export function computeHypothesisSummarySingleYear(
  yp: HypothesisYearSummaryInput
): HypothesisSummaryMoneyPoint[] {
  const R = distributeAnnualBySeasonality(
    Math.round(yp.annual),
    effectiveSummarySeasonality(yp.seasonalityMonthPercents, yp.preRevenueNeed)
  )
  const cashAnnual = yp.cashFlowAnnual ?? yp.annual
  const cashFlowSeasonality = normalizeSummarySeasonality(
    yp.cashFlowSeasonalityMonthPercents ?? yp.seasonalityMonthPercents,
  )

  let cashFlow: number[]
  if (yp.cashFlowBySeasonalityDirect) {
    cashFlow = distributeAnnualBySeasonality(Math.round(cashAnnual), cashFlowSeasonality)
  } else {
    const Rcash =
      cashAnnual === yp.annual
        ? R
        : distributeAnnualBySeasonality(
            Math.round(cashAnnual),
            effectiveSummarySeasonality(yp.seasonalityMonthPercents, yp.preRevenueNeed),
          )
    const bd = clampRoundBadDebt(yp.badDebtPercent)
    const adv = normalizeAdvancedBuckets(yp.buckets, bd)
    cashFlow = Array.from({ length: 12 }, () => 0)
    for (let m = 0; m < 12; m++) {
      for (const b of adv) {
        const pct = Math.max(0, Math.round(b.percent))
        const off = collectionDelayToMonthOffset(b.delayDays)
        const tgt = m + off
        if (tgt <= 11) cashFlow[tgt]! += ((Rcash[m] ?? 0) * pct) / 100
      }
    }
    for (let i = 0; i < 12; i++) cashFlow[i] = Math.round(cashFlow[i] ?? 0)
  }

  const bd = clampRoundBadDebt(yp.badDebtPercent)
  const balanceMonths: number[] = []

  if (yp.cashFlowBySeasonalityDirect) {
    for (let j = 0; j < 12; j++) {
      let capexCum = 0
      let cashCum = 0
      for (let m = 0; m <= j; m++) {
        capexCum += R[m] ?? 0
        cashCum += cashFlow[m] ?? 0
      }
      balanceMonths.push(Math.round(capexCum - cashCum))
    }
  } else {
    const adv = normalizeAdvancedBuckets(yp.buckets, bd)
    const Rcash =
      cashAnnual === yp.annual
        ? R
        : distributeAnnualBySeasonality(
            Math.round(cashAnnual),
            effectiveSummarySeasonality(yp.seasonalityMonthPercents, yp.preRevenueNeed),
          )
    const U = R.map((r) => (r * (100 - bd)) / 100)
    for (let j = 0; j < 12; j++) {
      let sum = 0
      for (let m = 0; m <= j; m++) {
        let settled = 0
        for (const b of adv) {
          const pct = Math.max(0, Math.round(b.percent))
          if (m + disbursementCashOutMonthOffset(b.delayDays, yp.preRevenueNeed) <= j)
            settled += ((Rcash[m] ?? 0) * pct) / 100
        }
        sum += (U[m] ?? 0) - settled
      }
      balanceMonths.push(Math.round(sum))
    }
  }
  return FORECAST_SEASONALITY_AXIS_LABELS.map((axisLabel, i) => ({
    axisLabel,
    monthName: FORECAST_SEASONALITY_MONTH_LABELS[i] ?? axisLabel,
    primary: R[i] ?? 0,
    cashFlow: cashFlow[i] ?? 0,
    balance: balanceMonths[i] ?? 0,
  }))
}

/** Sommaire multi-années projetées (continuité encaissements / solde). */
export function computeHypothesisSummaryMoneyPoints(
  yearsParams: HypothesisYearSummaryInput[],
  displayYearIndex: number,
  firstProjectedYearIndex = 0
): HypothesisSummaryMoneyPoint[] {
  const Y = displayYearIndex
  const P0 = firstProjectedYearIndex
  if (Y < 0 || yearsParams.length < Y + 1) return []
  if (Y <= P0) {
    return computeHypothesisSummarySingleYear(yearsParams[Y]!)
  }

  const RByYear: number[][] = []
  const RcashByYear: number[][] = []
  const advByYear: ForecastCollectionBucket[][] = []
  const bdByYear: number[] = []
  const preRevenueByYear: (ForecastPreRevenueNeed | undefined)[] = []

  for (let p = P0; p <= Y; p++) {
    const yp = yearsParams[p]!
    const bd = clampRoundBadDebt(yp.badDebtPercent)
    bdByYear.push(bd)
    preRevenueByYear.push(yp.preRevenueNeed)
    RByYear.push(
      distributeAnnualBySeasonality(
        Math.round(yp.annual),
        effectiveSummarySeasonality(yp.seasonalityMonthPercents, yp.preRevenueNeed)
      )
    )
    const cashAnnual = yp.cashFlowAnnual ?? yp.annual
    RcashByYear.push(
      cashAnnual === yp.annual
        ? RByYear[RByYear.length - 1]!
        : distributeAnnualBySeasonality(
            Math.round(cashAnnual),
            effectiveSummarySeasonality(yp.seasonalityMonthPercents, yp.preRevenueNeed)
          )
    )
    advByYear.push(normalizeAdvancedBuckets(yp.buckets, bd))
  }

  const T0proj = (Y - P0) * 12
  const T1proj = T0proj + 11

  const cashFlowDisplay = Array.from({ length: 12 }, () => 0)
  for (let idx = 0; idx < RByYear.length; idx++) {
    const R = RcashByYear[idx]!
    const adv = advByYear[idx]!
    const preRev = preRevenueByYear[idx]
    for (let m = 0; m < 12; m++) {
      const T_rec_proj = idx * 12 + m
      const rm = R[m] ?? 0
      for (const b of adv) {
        const pct = Math.max(0, Math.round(b.percent))
        const off = disbursementCashOutMonthOffset(b.delayDays, preRev)
        const T_col = T_rec_proj + off
        if (T_col < T0proj || T_col > T1proj) continue
        cashFlowDisplay[T_col - T0proj]! += (rm * pct) / 100
      }
    }
  }
  for (let i = 0; i < 12; i++) cashFlowDisplay[i] = Math.round(cashFlowDisplay[i] ?? 0)

  const balanceDisplay: number[] = []
  const RY = RByYear[Y - P0]!
  for (let j = 0; j < 12; j++) {
    const T_end_proj = T0proj + j
    let bal = 0
    for (let idx = 0; idx < RByYear.length; idx++) {
      const R = RByYear[idx]!
      const Rcash = RcashByYear[idx]!
      const adv = advByYear[idx]!
      const bd = bdByYear[idx]!
      const preRev = preRevenueByYear[idx]
      const U = R.map((r) => (r * (100 - bd)) / 100)
      for (let m = 0; m < 12; m++) {
        const T_rec_proj = idx * 12 + m
        if (T_rec_proj > T_end_proj) continue
        let settled = 0
        for (const b of adv) {
          const pct = Math.max(0, Math.round(b.percent))
          const T_col = T_rec_proj + disbursementCashOutMonthOffset(b.delayDays, preRev)
          if (T_col <= T_end_proj) settled += ((Rcash[m] ?? 0) * pct) / 100
        }
        bal += (U[m] ?? 0) - settled
      }
    }
    balanceDisplay.push(Math.round(bal))
  }

  return FORECAST_SEASONALITY_AXIS_LABELS.map((axisLabel, i) => ({
    axisLabel,
    monthName: FORECAST_SEASONALITY_MONTH_LABELS[i] ?? axisLabel,
    primary: RY[i] ?? 0,
    cashFlow: cashFlowDisplay[i] ?? 0,
    balance: balanceDisplay[i] ?? 0,
  }))
}

export function computeHypothesisSummaryDollarYScale(maxValue: number): { yMax: number; ticks: number[] } {
  const m = Math.max(0, maxValue)
  if (m <= 0) {
    const yMax = 1
    const segments = 5
    const ticksAsc = Array.from({ length: segments + 1 }, (_, i) => Math.round((yMax * i) / segments))
    const ticks = [...new Set(ticksAsc)].sort((a, b) => b - a)
    return { yMax, ticks }
  }
  const target = Math.max(m * 1.15, m + 1)
  const pow10 = Math.pow(10, Math.floor(Math.log10(target)))
  const rel = target / pow10
  const niceUnit =
    rel <= 1 ? pow10 : rel <= 2 ? 2 * pow10 : rel <= 2.5 ? 2.5 * pow10 : rel <= 5 ? 5 * pow10 : 10 * pow10
  const yMax = Math.ceil(target / niceUnit) * niceUnit
  const segments = 5
  const ticksAsc = Array.from({ length: segments + 1 }, (_, i) => Math.round((yMax * i) / segments))
  const ticks = [...new Set(ticksAsc)].sort((a, b) => b - a)
  return { yMax, ticks }
}
