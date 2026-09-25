import { formatCurrency } from "@/lib/financial-utils"
import {
  createDefaultForecastSeasonalityMonthPercents,
  FORECAST_SEASONALITY_AXIS_LABELS,
  normalizeForecastSeasonalityMonthPercents,
} from "@/lib/forecast-seasonality-utils"

export type RevenueAssumptionAdjustment = {
  id: string
  type: "amount" | "growthPercent" | "growthAmount" | "custom"
  value: number
  note?: string
  seasonalityMonthPercents?: number[]
}

export type RevenueHypothesisAssumptionRow = {
  id: string
  poste: string
  yearLabel: string
  yearIndex: number
  croissance: string
  saisonnalite: string
  note: string
}

function parseAdjustmentsMap(raw: unknown): Record<string, RevenueAssumptionAdjustment[]> {
  const out: Record<string, RevenueAssumptionAdjustment[]> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value as RevenueAssumptionAdjustment[]
    } else if (value && typeof value === "object") {
      out[key] = [value as RevenueAssumptionAdjustment]
    }
  }
  return out
}

export function formatRevenueAssumptionGrowth(adj: RevenueAssumptionAdjustment): string {
  switch (adj.type) {
    case "growthPercent": {
      const n = Number(adj.value)
      if (!Number.isFinite(n)) return "—"
      const body = n.toFixed(1).replace(".", ",")
      return `${n > 0 ? "+" : ""}${body} %`
    }
    case "growthAmount": {
      const n = Number(adj.value)
      if (!Number.isFinite(n)) return "—"
      const formatted = formatCurrency(Math.abs(n))
      if (n > 0) return `+${formatted}`
      if (n < 0) return `−${formatted}`
      return formatted
    }
    case "amount": {
      const n = Number(adj.value)
      if (!Number.isFinite(n)) return "—"
      return formatCurrency(n)
    }
    case "custom":
      return "Formule personnalisée"
    default:
      return "—"
  }
}

export function formatRevenueAssumptionSeasonality(
  percents: number[] | null | undefined,
): string {
  if (!Array.isArray(percents) || percents.length !== 12) return "Par défaut"
  const normalized = normalizeForecastSeasonalityMonthPercents(percents)
  const uniform = createDefaultForecastSeasonalityMonthPercents()
  const isUniform = normalized.every((p, i) => Math.abs(p - (uniform[i] ?? 0)) <= 1)
  if (isUniform) return "Uniforme"
  let peakIdx = 0
  for (let i = 1; i < 12; i++) {
    if ((normalized[i] ?? 0) > (normalized[peakIdx] ?? 0)) peakIdx = i
  }
  const peakLabel = FORECAST_SEASONALITY_AXIS_LABELS[peakIdx] ?? ""
  return peakLabel ? `Personnalisée (pic ${peakLabel})` : "Personnalisée"
}

export function projectedYearLabel(forecastBaseYear: number, yearIndex: number): string {
  // Config : 0 = réel / 1+ = projeté → année civile = base + (index − 1).
  return String(Math.round(forecastBaseYear) + (yearIndex - 1))
}

/**
 * Une ligne par poste × année projetée pour laquelle une hypothèse existe
 * (ajustement de croissance / montant, saisonnalité stockée, ou note).
 */
export function buildRevenueHypothesisAssumptionRows(opts: {
  revenueAdjustments: unknown
  labelsByRowId: Record<string, string>
  forecastBaseYear: number
  projectionYears: number
}): RevenueHypothesisAssumptionRow[] {
  const map = parseAdjustmentsMap(opts.revenueAdjustments)
  const rows: RevenueHypothesisAssumptionRow[] = []

  for (let yearIndex = 1; yearIndex <= opts.projectionYears; yearIndex++) {
    const yearLabel = projectedYearLabel(opts.forecastBaseYear, yearIndex)
    for (const [rowId, label] of Object.entries(opts.labelsByRowId)) {
      const key = `${rowId}-${yearIndex}`
      const list = map[key]
      if (!list?.length) continue
      const adj = list[list.length - 1]!
      const note = String(adj.note ?? "").trim()

      rows.push({
        id: key,
        poste: label || rowId,
        yearLabel,
        yearIndex,
        croissance: formatRevenueAssumptionGrowth(adj),
        saisonnalite: formatRevenueAssumptionSeasonality(adj.seasonalityMonthPercents),
        note,
      })
    }
  }

  return rows.sort((a, b) => {
    const posteCmp = a.poste.localeCompare(b.poste, "fr")
    if (posteCmp !== 0) return posteCmp
    return a.yearIndex - b.yearIndex
  })
}
