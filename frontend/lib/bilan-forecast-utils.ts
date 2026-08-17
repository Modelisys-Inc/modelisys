export const BILAN_FORECAST_CONFIG_TYPE = "balance-sheet-forecast"
export const BILAN_HYPOTHESIS_TITLE = "Estimation du Bilan annuel"
export const ENCAISSE_LINK_CODE = "ACT-A.1"

export type BilanAdjustmentType = "amount"

export interface BilanAdjustment {
  id: string
  rowId: string
  yearIndex: number
  type: BilanAdjustmentType
  value: number
  isRecurring: boolean
  note: string
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
    extra += adj.value
  }
  return base + extra
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
        type: "amount",
        value: typeof item.value === "number" && Number.isFinite(item.value) ? item.value : 0,
        isRecurring: item.isRecurring === true,
        note: typeof item.note === "string" ? item.note : "",
      }))
  }
  return out
}
