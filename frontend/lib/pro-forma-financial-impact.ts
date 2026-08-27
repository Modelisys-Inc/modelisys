/**
 * Métriques d’impact Hypothèses Pro Forma (panneau latéral live).
 */

import { normLabel } from "@/lib/income-statement-structure-utils"
import { forecastActualExtraColumnCount } from "@/lib/pro-forma-forecast-columns"
import {
  isCashFlowBeginningCashStructureRow,
  isCashFlowEndingCashStructureRow,
  isCashFlowNetVariationStructureRow,
} from "@/lib/cash-flow-treasury-rows"

export type ProFormaImpactMetricId =
  | "revenue"
  | "grossProfit"
  | "grossProfitMargin"
  | "netIncome"
  | "netIncomeMargin"
  | "baiia"
  | "baiiaMargin"
  | "cashOperating"
  | "cashInvesting"
  | "cashFinancing"
  | "endingCash"

export type ProFormaImpactMetric = {
  id: ProFormaImpactMetricId
  label: string
  /** Montant $ ou points de % (si isPercent). */
  value: number | null
  isPercent?: boolean
  /** Variation absolue vs année précédente ($ ou pts si isPercent). */
  yoyDelta?: number | null
  /** Variation relative vs année précédente (%). */
  yoyPct?: number | null
}

export type ProFormaImpactRawAmounts = {
  revenue: number | null
  cmv: number | null
  netIncome: number | null
  expenseHypothesisTotal: number | null
  cashOperating: number | null
  cashInvesting: number | null
  cashFinancing: number | null
  endingCash: number | null
}

export function pctOfRevenue(amount: number | null | undefined, revenue: number | null | undefined): number | null {
  if (amount == null || revenue == null) return null
  if (!Number.isFinite(amount) || !Number.isFinite(revenue) || Math.abs(revenue) < 1e-9) return null
  return (amount / Math.abs(revenue)) * 100
}

/** Index d’affichage de la 1re année projetée (après N-1 / YTD). */
export function firstProjectedDisplayIndex(forecastActualCols: number): number {
  return Math.max(0, forecastActualCols)
}

/** Index config (0 = réel, 1+ = projeté) pour la 1re année projetée. */
export function firstProjectedConfigYearIndex(): number {
  return 1
}

export type ProFormaImpactProjectedYearOption = {
  displayIndex: number
  configYearIndex: number
  label: string
}

/** Colonnes projetées disponibles pour le panneau d’impact (exclut N-1 / YTD). */
export function buildProjectedImpactYearOptions(
  yearLabels: string[],
  forecastActualCols: number,
  configIndexForDisplay: (displayIndex: number, actualCols: number) => number | null,
): ProFormaImpactProjectedYearOption[] {
  const options: ProFormaImpactProjectedYearOption[] = []
  for (let displayIndex = forecastActualCols; displayIndex < yearLabels.length; displayIndex++) {
    const configYearIndex = configIndexForDisplay(displayIndex, forecastActualCols)
    if (configYearIndex == null || configYearIndex < 1) continue
    options.push({
      displayIndex,
      configYearIndex,
      label: yearLabels[displayIndex] ?? String(displayIndex),
    })
  }
  return options
}

export function pickConfigYearAmount(
  totals: number[] | null | undefined,
  configYearIndex: number,
): number | null {
  if (!totals?.length) return null
  const v = totals[configYearIndex]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

/** Montant config ou repli N-1 (colonne d’affichage 0) pour le panneau d’impact. */
export function pickImpactConfigAmount(
  totals: number[] | null | undefined,
  displayIndex: number,
  forecastActualCols: number,
  configIndexForDisplay: (displayIndex: number, actualCols: number) => number | null,
  nMinusOneFallback: number | null,
): number | null {
  const configIdx = configIndexForDisplay(displayIndex, forecastActualCols)
  if (configIdx != null) return pickConfigYearAmount(totals, configIdx)
  if (displayIndex === 0 && forecastActualExtraColumnCount(forecastActualCols) > 0) {
    return nMinusOneFallback
  }
  return null
}

export function pickDisplayYearAmount(
  trend: number[] | null | undefined,
  displayIndex: number,
): number | null {
  if (!trend?.length) return null
  const v = trend[displayIndex]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

/** Index d’affichage de l’année précédente pour la variation (2026 → 2025, 2027 → 2026…). */
export function previousImpactDisplayIndex(
  displayIndex: number,
  forecastActualCols: number,
): number | null {
  if (displayIndex <= 0) return null
  const firstProjected = firstProjectedDisplayIndex(forecastActualCols)
  if (displayIndex === firstProjected) {
    return forecastActualExtraColumnCount(forecastActualCols) > 0 ? 0 : displayIndex - 1
  }
  if (displayIndex > firstProjected) return displayIndex - 1
  return null
}

export function computeImpactYoY(
  current: number | null | undefined,
  previous: number | null | undefined,
): { delta: number | null; pct: number | null } {
  if (current == null || previous == null) return { delta: null, pct: null }
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return { delta: null, pct: null }
  const delta = current - previous
  const pct = Math.abs(previous) < 1e-9 ? null : (delta / Math.abs(previous)) * 100
  return { delta, pct }
}

function withYoY(
  metric: Omit<ProFormaImpactMetric, "yoyDelta" | "yoyPct">,
  previousValue: number | null | undefined,
): ProFormaImpactMetric {
  const { delta, pct } = computeImpactYoY(metric.value, previousValue)
  return { ...metric, yoyDelta: delta, yoyPct: pct }
}

export type CashFlowImpactSection = "operating" | "investing" | "financing" | "ending"

function sectionKindFromLabel(label: string): Exclude<CashFlowImpactSection, "ending"> | null {
  const n = normLabel(label)
  if (!n) return null
  if (n.includes("investissement")) return "investing"
  if (n.includes("financement")) return "financing"
  if (n.includes("exploitation")) return "operating"
  return null
}

function cashFlowFamilyRootSection(row: Record<string, unknown>): Exclude<CashFlowImpactSection, "ending"> | null {
  const code = String(row.linkCode ?? "").trim().toUpperCase()
  if (code === "TEX") return "operating"
  if (code === "TIN") return "investing"
  if (code === "TFI") return "financing"
  return null
}

/**
 * True for amount-bearing section totals (not section *headers*).
 * Headers (`isSection`) often share the same keywords but carry 0 $.
 */
function isCashFlowImpactAmountTotal(row: Record<string, unknown>): boolean {
  if (row.isSection === true) return false
  if (row.isResult === true || row.isSubtotal === true) return true
  if (cashFlowFamilyRootSection(row)) return true
  const n = normLabel(String(row.label ?? ""))
  if (!n) return false
  // « Flux d'exploitation » / « Total exploitation » (souvent gras, parfois sans isResult)
  if (row.isBold === true && (n.startsWith("flux ") || n.startsWith("total "))) return true
  return false
}

/**
 * Classe un poste CF porteur de montant (sous-total / résultat) pour le panneau d’impact.
 * Les titres de section (`isSection`) renvoient null — ce ne sont pas les totaux.
 */
export function classifyCashFlowImpactSection(
  row: Record<string, unknown>,
): CashFlowImpactSection | null {
  if (isCashFlowEndingCashStructureRow(row)) return "ending"
  if (row.isSection === true) return null
  if (isCashFlowBeginningCashStructureRow(row)) return null
  if (isCashFlowNetVariationStructureRow(row)) return null
  if (!isCashFlowImpactAmountTotal(row)) return null

  const fromCode = cashFlowFamilyRootSection(row)
  if (fromCode) return fromCode

  return sectionKindFromLabel(String(row.label ?? ""))
}

function impactCandidateScore(row: Record<string, unknown>): number {
  if (row.isResult === true || row.isSubtotal === true) return 2
  if (cashFlowFamilyRootSection(row)) return 2
  if (row.isBold === true) return 1
  return 0
}

export function extractCashFlowImpactTrends(params: {
  displayRows: Record<string, unknown>[]
  rowTrends: (number[] | undefined)[]
  endingCashTrend: number[]
}): {
  operating: number[] | null
  investing: number[] | null
  financing: number[] | null
  ending: number[]
} {
  type Slot = { trend: number[]; score: number }
  const slots: {
    operating: Slot | null
    investing: Slot | null
    financing: Slot | null
  } = { operating: null, investing: null, financing: null }

  let currentSection: Exclude<CashFlowImpactSection, "ending"> | null = null

  const len = Math.min(params.displayRows.length, params.rowTrends.length)
  for (let i = 0; i < len; i++) {
    const row = params.displayRows[i]!

    if (row.isSection === true) {
      const fromHeader = sectionKindFromLabel(String(row.label ?? ""))
      if (fromHeader) currentSection = fromHeader
      continue
    }

    let kind = classifyCashFlowImpactSection(row)
    // Sous-total isResult sans mot-clé → section courante (ex. après « Trésorerie - Exploitation »)
    if (
      !kind &&
      currentSection &&
      (row.isResult === true || row.isSubtotal === true) &&
      !isCashFlowBeginningCashStructureRow(row) &&
      !isCashFlowEndingCashStructureRow(row) &&
      !isCashFlowNetVariationStructureRow(row)
    ) {
      kind = currentSection
    }
    if (!kind || kind === "ending") continue

    const trend = params.rowTrends[i]
    if (!trend?.length) continue

    const score = impactCandidateScore(row)
    const prev = slots[kind]
    // Préférer isResult ; à score égal, le dernier gagne (total en bas de section).
    if (!prev || score > prev.score || score === prev.score) {
      slots[kind] = { trend, score }
    }
  }

  return {
    operating: slots.operating?.trend ?? null,
    investing: slots.investing?.trend ?? null,
    financing: slots.financing?.trend ?? null,
    ending: params.endingCashTrend,
  }
}

export function buildProFormaImpactMetrics(
  current: ProFormaImpactRawAmounts,
  previous?: ProFormaImpactRawAmounts | null,
): ProFormaImpactMetric[] {
  const grossProfit =
    current.revenue != null && current.cmv != null ? current.revenue - current.cmv : null
  const baiia =
    current.revenue != null && current.expenseHypothesisTotal != null
      ? current.revenue - current.expenseHypothesisTotal
      : null

  const prevGrossProfit =
    previous?.revenue != null && previous?.cmv != null ? previous.revenue - previous.cmv : null
  const prevBaiia =
    previous?.revenue != null && previous?.expenseHypothesisTotal != null
      ? previous.revenue - previous.expenseHypothesisTotal
      : null

  const grossProfitMargin = pctOfRevenue(grossProfit, current.revenue)
  const netIncomeMargin = pctOfRevenue(current.netIncome, current.revenue)
  const baiiaMargin = pctOfRevenue(baiia, current.revenue)

  return [
    withYoY({ id: "revenue", label: "Revenus", value: current.revenue }, previous?.revenue),
    withYoY({ id: "grossProfit", label: "Bénéfice brut", value: grossProfit }, prevGrossProfit),
    withYoY(
      {
        id: "grossProfitMargin",
        label: "% des revenus",
        value: grossProfitMargin,
        isPercent: true,
      },
      pctOfRevenue(prevGrossProfit, previous?.revenue ?? null),
    ),
    withYoY(
      { id: "netIncome", label: "Bénéfice net", value: current.netIncome },
      previous?.netIncome,
    ),
    withYoY(
      {
        id: "netIncomeMargin",
        label: "% des revenus",
        value: netIncomeMargin,
        isPercent: true,
      },
      pctOfRevenue(previous?.netIncome ?? null, previous?.revenue ?? null),
    ),
    withYoY({ id: "baiia", label: "BAIIA opérationnel", value: baiia }, prevBaiia),
    withYoY(
      {
        id: "baiiaMargin",
        label: "% des revenus",
        value: baiiaMargin,
        isPercent: true,
      },
      pctOfRevenue(prevBaiia, previous?.revenue ?? null),
    ),
    withYoY(
      { id: "cashOperating", label: "Trésorerie — Exploitation", value: current.cashOperating },
      previous?.cashOperating,
    ),
    withYoY(
      { id: "cashInvesting", label: "Trésorerie — Investissement", value: current.cashInvesting },
      previous?.cashInvesting,
    ),
    withYoY(
      { id: "cashFinancing", label: "Trésorerie — Financement", value: current.cashFinancing },
      previous?.cashFinancing,
    ),
    withYoY(
      { id: "endingCash", label: "Trésorerie à la fin", value: current.endingCash },
      previous?.endingCash,
    ),
  ]
}
