export const BILAN_FORECAST_CONFIG_TYPE = "balance-sheet-forecast"
export const BILAN_HYPOTHESIS_TITLE = "Estimation du Bilan annuel"
export const ENCAISSE_LINK_CODE = "ACT-A.1"
export const COMPTES_CLIENTS_LINK_CODE_ROOT = "ACT-B"

export type BilanAdjustmentType = "amount" | "collectionDays" | "revenuePercent"

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

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "")
}

export function isEncaisseBilanRow(params: {
  linkCode?: string | null
  rowId?: string | null
  label?: string | null
}): boolean {
  const codes = [params.linkCode, params.rowId]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
  if (codes.includes(ENCAISSE_LINK_CODE)) return true
  const label = stripAccents(String(params.label ?? "").trim().toLowerCase())
  return label === "encaisse"
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

export function collectionDaysFromArAndRevenue(ar: number, revenue: number): number | null {
  if (!Number.isFinite(ar) || !Number.isFinite(revenue) || revenue === 0) return null
  return (Math.abs(ar) / Math.abs(revenue)) * 365
}

export function revenuePercentFromArAndRevenue(ar: number, revenue: number): number | null {
  if (!Number.isFinite(ar) || !Number.isFinite(revenue) || revenue === 0) return null
  return (Math.abs(ar) / Math.abs(revenue)) * 100
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

/** Encaisse projetée = Encaisse réelle + Δ de la Trésorerie à la fin. */
export function resolveEncaisseFromEndingCash(
  actualEncaisse: number,
  endingCashTrend: number[] | undefined,
  yearIndex: number,
): number {
  if (yearIndex <= 0) return actualEncaisse
  if (!endingCashTrend?.length) return actualEncaisse
  const actualEnding = endingCashTrend[0] ?? actualEncaisse
  const projectedEnding = endingCashTrend[yearIndex] ?? actualEnding
  return actualEncaisse + (projectedEnding - actualEnding)
}

function parseAdjustmentType(raw: unknown): BilanAdjustmentType {
  if (raw === "collectionDays" || raw === "revenuePercent") return raw
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
