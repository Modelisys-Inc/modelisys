import { formatCurrency } from "@/lib/financial-utils"
import {
  formatRevenueAssumptionSeasonality,
  projectedYearLabel,
} from "@/lib/revenue-hypothesis-assumptions"

export type ExpenseAssumptionAdjustment = {
  id: string
  type: "amount" | "percentage" | "inflation"
  amount?: number
  percentage?: number
  inflationRate?: number
  isRecurring?: boolean
  note?: string
  seasonalityMonthPercents?: number[]
  hypothesisMetaOnly?: boolean
}

export type ExpenseHypothesisAssumptionRow = {
  id: string
  poste: string
  yearLabel: string
  yearIndex: number
  ajustement: string
  saisonnalite: string
  note: string
}

function parseAdjustmentsMap(raw: unknown): Record<string, ExpenseAssumptionAdjustment[]> {
  const out: Record<string, ExpenseAssumptionAdjustment[]> = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value as ExpenseAssumptionAdjustment[]
    } else if (value && typeof value === "object") {
      out[key] = [value as ExpenseAssumptionAdjustment]
    }
  }
  return out
}

function isMetaOnly(adj: ExpenseAssumptionAdjustment): boolean {
  if (adj.hypothesisMetaOnly) return true
  if (adj.type === "inflation") return false
  if (adj.type === "percentage" && (adj.percentage ?? 0) !== 0) return false
  if (adj.type === "amount" && (adj.amount ?? 0) !== 0) return false
  if (adj.seasonalityMonthPercents != null) return true
  if (adj.type === "amount" && (adj.amount ?? 0) === 0 && !String(adj.note ?? "").trim()) return true
  return false
}

export function formatExpenseAssumptionAdjustment(adj: ExpenseAssumptionAdjustment): string {
  if (isMetaOnly(adj)) return "Saisonnalité seule"
  switch (adj.type) {
    case "percentage": {
      const n = Number(adj.percentage ?? 0)
      if (!Number.isFinite(n)) return "—"
      const body = n.toFixed(1).replace(".", ",")
      return `${body} % des revenus`
    }
    case "inflation": {
      const n = Number(adj.inflationRate ?? 0)
      if (!Number.isFinite(n)) return "—"
      const body = n.toFixed(1).replace(".", ",")
      return `Inflation ${n > 0 ? "+" : ""}${body} %`
    }
    case "amount": {
      const n = Number(adj.amount ?? 0)
      if (!Number.isFinite(n)) return "—"
      const formatted = formatCurrency(Math.abs(n))
      const signed = n > 0 ? `+${formatted}` : n < 0 ? `−${formatted}` : formatted
      return adj.isRecurring ? `${signed} (récurrent)` : signed
    }
    default:
      return "—"
  }
}

/**
 * Une ligne par poste × année projetée pour laquelle une hypothèse dépenses existe.
 */
export function buildExpenseHypothesisAssumptionRows(opts: {
  expenseAdjustments: unknown
  labelsByRowId: Record<string, string>
  forecastBaseYear: number
  projectionYears: number
}): ExpenseHypothesisAssumptionRow[] {
  const map = parseAdjustmentsMap(opts.expenseAdjustments)
  const rows: ExpenseHypothesisAssumptionRow[] = []

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
        ajustement: formatExpenseAssumptionAdjustment(adj),
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
