/** Utilitaires partagés — encaissement (revenus) et décaissement (dépenses). */

export type ForecastCollectionBucket = {
  delayDays: number
  percent: number
  custom?: boolean
}

export type ForecastPreRevenueNeed = {
  enabled: boolean
  /** Avance en jours avant le mois de charge (30, 60, 90 ou 120). */
  advanceDays: number
}

export type ForecastCollectionCash = {
  mode: "simple" | "advanced"
  dsoDays: number
  badDebtPercent: number
  advancedBuckets?: ForecastCollectionBucket[]
  /** Dépenses variables : achats / besoins de trésorerie avant le mois de revenus liés. */
  preRevenueNeed?: ForecastPreRevenueNeed
}

export const STANDARD_COLLECTION_DELAYS = [0, 30, 60, 90, 120] as const
export const STANDARD_PRE_REVENUE_ADVANCE_DAYS = [30, 60, 90, 120] as const

export const DEFAULT_FORECAST_COLLECTION_CASH: ForecastCollectionCash = {
  mode: "advanced",
  dsoDays: 45,
  badDebtPercent: 0,
}

export function clampRoundBadDebt(p: number): number {
  return Math.max(0, Math.min(100, Math.round(Number(p) || 0)))
}

export function clampDsoDays(d: number): number {
  return Math.max(0, Math.min(365, Math.round(Number(d) || 0)))
}

export function weightedCollectionDelayDays(buckets: ForecastCollectionBucket[]): number {
  const sum = buckets.reduce((a, b) => a + Math.max(0, Math.round(b.percent || 0)), 0)
  if (sum <= 0) return 0
  const raw =
    buckets.reduce(
      (acc, b) => acc + Math.max(0, Math.round(b.percent || 0)) * Math.max(0, Math.round(b.delayDays || 0)),
      0
    ) / sum
  return Math.round(raw * 10) / 10
}

export function formatCollectionDelayDaysDisplay(days: number): string {
  if (!Number.isFinite(days) || days < 0) return "0 j"
  const rounded = Math.round(days * 10) / 10
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return `${Math.round(rounded)} j`
  return `${String(rounded).replace(".", ",")} j`
}

export function createDefaultAdvancedBuckets(badDebtPercent: number): ForecastCollectionBucket[] {
  const bd = clampRoundBadDebt(badDebtPercent)
  const target = 100 - bd
  const n = STANDARD_COLLECTION_DELAYS.length
  const base = Math.floor(target / n)
  const rest = target - base * n
  return STANDARD_COLLECTION_DELAYS.map((delayDays, i) => ({
    delayDays,
    percent: base + (i < rest ? 1 : 0),
    custom: false,
  }))
}

export function normalizeAdvancedBuckets(
  buckets: ForecastCollectionBucket[],
  badDebtPercent: number
): ForecastCollectionBucket[] {
  const bd = clampRoundBadDebt(badDebtPercent)
  const target = 100 - bd
  if (buckets.length === 0) return createDefaultAdvancedBuckets(bd)
  const safe = buckets.map((b) => ({
    delayDays: Math.max(0, Math.min(720, Math.round(Number(b.delayDays) || 0))),
    percent: Math.max(0, Math.round(Number(b.percent) || 0)),
    custom: b.custom === true,
  }))
  let sum = safe.reduce((a, b) => a + b.percent, 0)
  if (sum <= 0) return createDefaultAdvancedBuckets(bd)
  const rounded = safe.map((b) => ({
    ...b,
    percent: Math.round((b.percent / sum) * target),
  }))
  let diff = target - rounded.reduce((a, b) => a + b.percent, 0)
  const out = rounded.map((b) => ({ ...b }))
  const n = out.length
  let guard = 0
  while (diff !== 0 && guard < 400 && n > 0) {
    const i = guard % n
    if (diff > 0) {
      out[i] = { ...out[i]!, percent: out[i]!.percent + 1 }
      diff--
    } else if (diff < 0 && out[i]!.percent > 0) {
      out[i] = { ...out[i]!, percent: out[i]!.percent - 1 }
      diff++
    }
    guard++
  }
  return out
}

function coerceAdvancedBucketsForUi(
  raw: ForecastCollectionBucket[] | undefined,
  badDebtPercent: number
): ForecastCollectionBucket[] {
  if (!raw || raw.length === 0) return createDefaultAdvancedBuckets(badDebtPercent)
  const std = [...STANDARD_COLLECTION_DELAYS]
  const head = raw.slice(0, 5)
  const standardRows: ForecastCollectionBucket[] = std.map((delayDays, i) => ({
    delayDays,
    percent: head[i] ? Math.max(0, Math.round(Number(head[i]!.percent) || 0)) : 0,
    custom: false,
  }))
  const extra: ForecastCollectionBucket[] = raw.slice(5).map((b) => ({
    delayDays: Math.max(0, Math.min(720, Math.round(Number(b.delayDays) || 0))),
    percent: Math.max(0, Math.round(Number(b.percent) || 0)),
    custom: true,
  }))
  return normalizeAdvancedBuckets([...standardRows, ...extra], badDebtPercent)
}

export function clampPreRevenueAdvanceDays(days: number): number {
  const v = Math.round(Number(days) || 0)
  if ((STANDARD_PRE_REVENUE_ADVANCE_DAYS as readonly number[]).includes(v)) return v
  return 30
}

export function parsePreRevenueNeedFromStorage(raw: unknown): ForecastPreRevenueNeed {
  if (!raw || typeof raw !== "object") {
    return { enabled: false, advanceDays: 30 }
  }
  const o = raw as Record<string, unknown>
  if (o.enabled !== true) {
    return { enabled: false, advanceDays: clampPreRevenueAdvanceDays(Number(o.advanceDays) || 30) }
  }
  return { enabled: true, advanceDays: clampPreRevenueAdvanceDays(Number(o.advanceDays) || 30) }
}

export function labelForCollectionDelayDays(days: number): string {
  if (days === 0) return "Immédiat"
  if (days === 30) return "30 jours"
  if (days === 60) return "60 jours"
  if (days === 90) return "90 jours"
  if (days === 120) return "120 jours"
  return `${days} j`
}

/** Lit `collectionCash` / `disbursementCash` ou formats legacy revenus. */
export function parseCollectionCashFromStorage(adj: {
  collectionCash?: unknown
  disbursementCash?: unknown
  collectionSchedule?: unknown
  collectionPercents?: unknown
}): ForecastCollectionCash {
  const raw = adj.disbursementCash ?? adj.collectionCash
  if (raw && typeof raw === "object" && raw !== null && "mode" in raw) {
    const c = raw as Record<string, unknown>
    const badDebtPercent = 0
    const bucketsRaw = c.advancedBuckets
    let advancedBuckets: ForecastCollectionBucket[]
    if (Array.isArray(bucketsRaw) && bucketsRaw.length > 0) {
      const parsed = (bucketsRaw as { delayDays?: unknown; percent?: unknown; custom?: unknown }[]).map(
        (b) => ({
          delayDays: Number(b.delayDays) || 0,
          percent: Number(b.percent) || 0,
          custom: b.custom === true,
        })
      )
      advancedBuckets = coerceAdvancedBucketsForUi(parsed, badDebtPercent)
    } else {
      advancedBuckets = createDefaultAdvancedBuckets(badDebtPercent)
    }
    const weighted = weightedCollectionDelayDays(advancedBuckets)
    return {
      mode: "advanced",
      dsoDays: clampDsoDays(Math.round(weighted)),
      badDebtPercent,
      advancedBuckets,
      preRevenueNeed: parsePreRevenueNeedFromStorage(c.preRevenueNeed),
    }
  }

  const defBuckets = createDefaultAdvancedBuckets(DEFAULT_FORECAST_COLLECTION_CASH.badDebtPercent)
  return {
    mode: "advanced",
    dsoDays: clampDsoDays(Math.round(weightedCollectionDelayDays(defBuckets))),
    badDebtPercent: DEFAULT_FORECAST_COLLECTION_CASH.badDebtPercent,
    advancedBuckets: defBuckets,
  }
}

export function buildCollectionCashForSave(state: {
  badDebtPercent: number
  buckets: ForecastCollectionBucket[]
  preRevenueNeed?: ForecastPreRevenueNeed
}): ForecastCollectionCash {
  const bd = clampRoundBadDebt(state.badDebtPercent)
  const std = [...STANDARD_COLLECTION_DELAYS]
  const head = state.buckets.slice(0, 5)
  const standardRows: ForecastCollectionBucket[] = std.map((delayDays, i) => ({
    delayDays,
    percent: head[i] ? Math.max(0, Math.round(Number(head[i]!.percent) || 0)) : 0,
    custom: false,
  }))
  const extra = state.buckets.slice(5).map((b) => ({
    delayDays: Math.max(0, Math.min(720, Math.round(Number(b.delayDays) || 0))),
    percent: Math.max(0, Math.round(Number(b.percent) || 0)),
    custom: true as const,
  }))
  const advancedBuckets = normalizeAdvancedBuckets([...standardRows, ...extra], bd)
  const weighted = weightedCollectionDelayDays(advancedBuckets)
  const preRevenueNeed = state.preRevenueNeed
    ? {
        enabled: state.preRevenueNeed.enabled === true,
        advanceDays: clampPreRevenueAdvanceDays(state.preRevenueNeed.advanceDays),
      }
    : undefined
  return {
    mode: "advanced",
    dsoDays: clampDsoDays(Math.round(weighted)),
    badDebtPercent: bd,
    advancedBuckets,
    ...(preRevenueNeed ? { preRevenueNeed } : {}),
  }
}

export function parsePercentInput(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(/,/g, ".")
  if (t === "" || t === "+" || t === "-") return null
  const n = parseFloat(t)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, n))
}

export function parseDelayDaysInput(s: string): number | null {
  const t = s.trim().replace(/\s/g, "")
  if (t === "" || t === "+" || t === "-") return null
  const n = parseInt(t, 10)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(720, n))
}

export function computeCollectionChartYScale(percents: number[]): { yMax: number; ticks: number[] } {
  const m = Math.max(0, ...percents)
  let yMax: number
  if (m <= 0) {
    yMax = 10
  } else {
    const target = Math.min(100, Math.max(m * 1.22, m + 2))
    const steps = [5, 8, 10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 75, 80, 90, 100]
    yMax = steps.find((s) => s >= target) ?? 100
  }
  const segments = 5
  const ticksAsc = Array.from({ length: segments + 1 }, (_, i) => Math.round((yMax * i) / segments))
  const ticks = [...new Set(ticksAsc)].sort((a, b) => b - a)
  return { yMax, ticks }
}

export const COLLECTION_CHART_SLATE = "#475569"
export const COLLECTION_BAD_DEBT_RED = "#ef4444"
const COLLECTION_BAR_BAND_FRACTION = 0.15

export function collectionBarFill(isBadDebt: boolean): string {
  return isBadDebt ? COLLECTION_BAD_DEBT_RED : COLLECTION_CHART_SLATE
}
