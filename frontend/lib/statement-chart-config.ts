/**
 * Statement-agnostic chart config types (V2).
 *
 * Used by the Tableau de bord on all three financial-statement pages.
 * Storage is server-side (see lib/api.ts); this module is types + helpers only.
 */

export type StatementType =
  | "income-statement"
  | "balance-sheet"
  | "cash-flow"
  | "diagnostic-revenue"
  | "diagnostic-margin-by-revenue"
  | "diagnostic-expenses"

export type CoreStatementType = "income-statement" | "balance-sheet" | "cash-flow"

export type ChartMetricSpec =
  | { type: "single"; code: string }
  | { type: "sum"; codes: string[] }
  | { type: "difference"; numeratorCodes: string[]; denominatorCodes: string[] }
  | {
      type: "ratio"
      numeratorCodes: string[]
      denominatorCodes: string[]
      /** If true: 1 − (num ÷ denom) instead of num ÷ denom. */
      complement?: boolean
    }
  /** (gross profit ÷ revenue of a referenced bar series) × 100. */
  | {
      type: "derivedMargin"
      revenueSeriesId: string
      grossProfitFromSpec: ChartMetricSpec
    }

export type ChartValueFormat = "currency" | "ratio"

export interface StatementChartSeries {
  id: string
  kind: "bar" | "line"
  label: string
  spec: ChartMetricSpec
  yAxis: "left" | "right"
  valueFormat: ChartValueFormat
  showOnChart: boolean
  showInSidePanel: boolean
  color?: string
  /** Bars sharing the same stackGroup are stacked together. */
  stackGroup?: string
}

export interface StatementChartConfig {
  version: 2
  chartTitle: string
  series: StatementChartSeries[]
}

export interface ChartSlot {
  chartInstanceId: string
  slotIndex: number
  version: number
  config: StatementChartConfig
  updatedByUserEmail?: string | null
  updatedAt: string
}

export const DEFAULT_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
]

export function newSeriesId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function defaultChartCardTitle(statementType: StatementType): string {
  if (statementType === "income-statement") return "Performance financière"
  if (statementType === "diagnostic-revenue") return "Revenus"
  if (statementType === "diagnostic-margin-by-revenue") return "Marge par Revenus"
  if (statementType === "diagnostic-expenses") return "Dépenses"
  if (statementType === "balance-sheet") return "Bilan"
  return "Flux de trésorerie"
}

/** Type de relevé utilisé pour charger les séries (API financial-statements/.../series). */
export function seriesStatementTypeForChart(statementType: StatementType): CoreStatementType {
  if (statementType === "diagnostic-revenue") return "income-statement"
  if (statementType === "diagnostic-margin-by-revenue") return "income-statement"
  if (statementType === "diagnostic-expenses") return "income-statement"
  return statementType
}

/** Type de relevé utilisé pour la structure / codes de liaison dans les paramètres. */
export function structureStatementTypeForChart(statementType: StatementType): CoreStatementType {
  return seriesStatementTypeForChart(statementType)
}

const EMPTY_CONFIG: StatementChartConfig = {
  version: 2,
  chartTitle: "",
  series: [],
}

/** Migration / normalization for a raw spec object coming back from the API. */
export function normalizeMetricSpec(raw: unknown): ChartMetricSpec {
  if (!raw || typeof raw !== "object") return { type: "single", code: "" }
  const x = raw as Record<string, unknown>
  const t = x.type
  if (t === "single") return { type: "single", code: String(x.code ?? "").trim() }
  if (t === "sum") {
    return { type: "sum", codes: Array.isArray(x.codes) ? x.codes.map(String) : [] }
  }
  if (t === "difference") {
    return {
      type: "difference",
      numeratorCodes: Array.isArray(x.numeratorCodes) ? x.numeratorCodes.map(String) : [],
      denominatorCodes: Array.isArray(x.denominatorCodes) ? x.denominatorCodes.map(String) : [],
    }
  }
  if (t === "ratio") {
    return {
      type: "ratio",
      numeratorCodes: Array.isArray(x.numeratorCodes) ? x.numeratorCodes.map(String) : [],
      denominatorCodes: Array.isArray(x.denominatorCodes) ? x.denominatorCodes.map(String) : [],
      complement: x.complement === true,
    }
  }
  if (t === "derivedMargin") {
    return {
      type: "derivedMargin",
      revenueSeriesId: String(x.revenueSeriesId ?? ""),
      grossProfitFromSpec: normalizeMetricSpec(x.grossProfitFromSpec),
    }
  }
  return { type: "single", code: "" }
}

export function normalizeChartConfig(raw: unknown): StatementChartConfig {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CONFIG }
  const r = raw as Partial<StatementChartConfig> & { series?: unknown }
  const seriesIn = Array.isArray(r.series) ? r.series : []
  const series: StatementChartSeries[] = seriesIn.map((s, i) => {
    const o = s as unknown as Record<string, unknown>
    return {
      id: typeof o.id === "string" && o.id.trim() ? o.id : newSeriesId(),
      kind: o.kind === "line" ? "line" : "bar",
      label: typeof o.label === "string" ? o.label : `Série ${i + 1}`,
      spec: normalizeMetricSpec(o.spec),
      yAxis: o.yAxis === "right" ? "right" : "left",
      valueFormat: o.valueFormat === "ratio" ? "ratio" : "currency",
      showOnChart: o.showOnChart !== false,
      showInSidePanel: o.showInSidePanel !== false,
      color: typeof o.color === "string" && o.color.trim()
        ? o.color
        : DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      stackGroup: typeof o.stackGroup === "string" && o.stackGroup.trim() ? o.stackGroup : undefined,
    }
  })
  return {
    version: 2,
    chartTitle: typeof r.chartTitle === "string" ? r.chartTitle : "",
    series,
  }
}
