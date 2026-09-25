import { formatCurrency } from "@/lib/financial-utils"
import type { CapexAdjustment, CapexAdjustmentType } from "@/lib/capex-forecast-resolve"
import {
  formatRevenueAssumptionSeasonality,
  projectedYearLabel,
} from "@/lib/revenue-hypothesis-assumptions"

export type CapexHypothesisAssumptionRow = {
  id: string
  poste: string
  yearLabel: string
  yearIndex: number
  ajustement: string
  saisonnalite: string
  note: string
}

function parseAdjustmentsMap(raw: unknown): Record<string, CapexAdjustment[]> {
  const out: Record<string, CapexAdjustment[]> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value as CapexAdjustment[]
    } else if (value && typeof value === "object") {
      out[key] = [value as CapexAdjustment]
    }
  }
  return out
}

export function formatCapexAssumptionAdjustment(adj: CapexAdjustment): string {
  if (adj.hypothesisMetaOnly) return "Saisonnalité / financement"
  const type = adj.type as CapexAdjustmentType
  const n = Number(adj.value)
  switch (type) {
    case "growthPercent": {
      if (!Number.isFinite(n)) return "—"
      const body = n.toFixed(1).replace(".", ",")
      return `${n > 0 ? "+" : ""}${body} %`
    }
    case "growthAmount": {
      if (!Number.isFinite(n)) return "—"
      const formatted = formatCurrency(Math.abs(n))
      if (n > 0) return `+${formatted}`
      if (n < 0) return `−${formatted}`
      return formatted
    }
    case "percentRevenue": {
      if (!Number.isFinite(n)) return "—"
      const body = n.toFixed(1).replace(".", ",")
      return `${body} % des revenus`
    }
    case "amount":
    default: {
      if (!Number.isFinite(n)) return "—"
      return formatCurrency(n)
    }
  }
}

export function buildCapexHypothesisAssumptionRows(opts: {
  capexAdjustments: unknown
  labelsByRowId: Record<string, string>
  forecastBaseYear: number
  projectionYears: number
}): CapexHypothesisAssumptionRow[] {
  const map = parseAdjustmentsMap(opts.capexAdjustments)
  const rows: CapexHypothesisAssumptionRow[] = []

  for (let yearIndex = 1; yearIndex <= opts.projectionYears; yearIndex++) {
    const yearLabel = projectedYearLabel(opts.forecastBaseYear, yearIndex)
    for (const [rowId, label] of Object.entries(opts.labelsByRowId)) {
      const key = `${rowId}-${yearIndex}`
      const list = map[key]
      if (!list?.length) continue
      const adj = list[list.length - 1]!
      rows.push({
        id: key,
        poste: label || rowId,
        yearLabel,
        yearIndex,
        ajustement: formatCapexAssumptionAdjustment(adj),
        saisonnalite: formatRevenueAssumptionSeasonality(adj.seasonalityMonthPercents),
        note: String(adj.note ?? "").trim(),
      })
    }
  }

  return rows.sort((a, b) => {
    const posteCmp = a.poste.localeCompare(b.poste, "fr")
    if (posteCmp !== 0) return posteCmp
    return a.yearIndex - b.yearIndex
  })
}
