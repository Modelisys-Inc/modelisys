import { reportAnalysisViewLabel } from "@/lib/diagnostic-report-chapters"

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
  | "diagnostic-expenses-by-division"
  | "diagnostic-financial-position"
  | "diagnostic-working-capital"

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
  /** ((revenus − coûts variables mappés) ÷ revenus de la série) × 100 — aligné sur Dépenses. */
  | {
      type: "derivedContributiveMargin"
      revenueSeriesId: string
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
  if (statementType === "diagnostic-revenue") return reportAnalysisViewLabel("revenue")
  if (statementType === "diagnostic-margin-by-revenue") {
    return reportAnalysisViewLabel("margin-by-revenue")
  }
  if (statementType === "diagnostic-expenses") return reportAnalysisViewLabel("expenses")
  if (statementType === "diagnostic-expenses-by-division") {
    return reportAnalysisViewLabel("expenses-by-division")
  }
  if (statementType === "diagnostic-financial-position") return "Situation financière"
  if (statementType === "diagnostic-working-capital") return "Fonds de roulement"
  if (statementType === "balance-sheet") return "Bilan"
  return "Flux de trésorerie"
}

/** Type de relevé utilisé pour charger les séries (API financial-statements/.../series). */
export function seriesStatementTypeForChart(statementType: StatementType): CoreStatementType {
  if (statementType === "diagnostic-revenue") return "income-statement"
  if (statementType === "diagnostic-margin-by-revenue") return "income-statement"
  if (statementType === "diagnostic-expenses") return "income-statement"
  if (statementType === "diagnostic-expenses-by-division") return "income-statement"
  if (statementType === "diagnostic-financial-position") return "balance-sheet"
  if (statementType === "diagnostic-working-capital") return "balance-sheet"
  return statementType
}

/** Type de relevé utilisé pour la structure / codes de liaison dans les paramètres. */
export function structureStatementTypeForChart(statementType: StatementType): CoreStatementType {
  return seriesStatementTypeForChart(statementType)
}

/** Structures à charger pour les sélecteurs de codes (paramètres des graphiques). */
export function structureTypesForChartSettings(statementType: StatementType): CoreStatementType[] {
  if (statementType === "diagnostic-working-capital") {
    return ["income-statement", "balance-sheet"]
  }
  return [structureStatementTypeForChart(statementType)]
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
  if (t === "derivedContributiveMargin") {
    return {
      type: "derivedContributiveMargin",
      revenueSeriesId: String(x.revenueSeriesId ?? ""),
    }
  }
  return { type: "single", code: "" }
}

export const CONTRIBUTIVE_MARGIN_SERIES_LABEL = "Contribution marginale (%)"

export function isContributiveMarginSeriesSpec(spec: ChartMetricSpec): boolean {
  return spec.type === "derivedContributiveMargin" || spec.type === "derivedMargin"
}

export function isAmountChartMetricSpec(spec: ChartMetricSpec): boolean {
  return !isContributiveMarginSeriesSpec(spec)
}

/** Format par défaut selon la métrique (pas selon barres vs courbe). */
export function defaultValueFormatForChartSeries(series: Pick<StatementChartSeries, "spec">): ChartValueFormat {
  return isContributiveMarginSeriesSpec(series.spec) ? "ratio" : "currency"
}

function repairMislabeledAmountSeries(series: StatementChartSeries[]): StatementChartSeries[] {
  return series.map((s) => {
    if (
      s.valueFormat === "ratio" &&
      isAmountChartMetricSpec(s.spec) &&
      !/baiia|ebita|ebitda/i.test(s.label)
    ) {
      return { ...s, valueFormat: "currency" as const }
    }
    return s
  })
}

function buildFixedContributiveMarginSeries(
  revenueSeriesId: string,
  existing?: StatementChartSeries,
): StatementChartSeries {
  return {
    id: existing?.id ?? newSeriesId(),
    kind: "line",
    label: CONTRIBUTIVE_MARGIN_SERIES_LABEL,
    spec: {
      type: "derivedContributiveMargin",
      revenueSeriesId,
    },
    yAxis: "right",
    valueFormat: "ratio",
    showOnChart: existing?.showOnChart ?? true,
    showInSidePanel: existing?.showInSidePanel ?? true,
    color: existing?.color ?? DEFAULT_COLORS[2],
  }
}

/**
 * Performance financière : impose la courbe Contribution marginale % (mapping CV),
 * non modifiable dans les paramètres. Revenus / BAIIA restent configurables.
 */
export function ensureIncomeStatementPerformanceConfig(
  config: StatementChartConfig,
  statementType: StatementType,
): StatementChartConfig {
  if (statementType !== "income-statement") return config

  const isRevenueLikeSeries = (s: StatementChartSeries) =>
    s.valueFormat === "currency" &&
    !isContributiveMarginSeriesSpec(s.spec) &&
    !/baiia|ebita|ebitda/i.test(s.label)

  const revenueSeries =
    config.series.find((s) => isRevenueLikeSeries(s) && /revenu/i.test(s.label)) ??
    config.series.find(isRevenueLikeSeries)
  const revenueSeriesId = revenueSeries?.id ?? config.series[0]?.id ?? ""

  const marginCandidates = config.series.filter((s) => isContributiveMarginSeriesSpec(s.spec))
  const normalizedMargin = buildFixedContributiveMarginSeries(revenueSeriesId, marginCandidates[0])

  const remaining = config.series.filter(
    (s) => !isContributiveMarginSeriesSpec(s.spec) && s !== revenueSeries,
  )
  const ebitaSeries =
    remaining.find((s) => s.valueFormat === "currency" && /baiia|ebita|ebitda/i.test(s.label)) ??
    remaining.find((s) => s.valueFormat === "currency")
  const others = remaining.filter((s) => s !== ebitaSeries)

  const series: StatementChartSeries[] = []
  if (revenueSeries) series.push(revenueSeries)
  series.push(normalizedMargin)
  if (ebitaSeries) series.push(ebitaSeries)
  series.push(...others)

  if (
    series.length === config.series.length &&
    series.every((s, i) => JSON.stringify(s) === JSON.stringify(config.series[i]))
  ) {
    return config
  }
  return { ...config, series }
}

/** @deprecated Utiliser ensureIncomeStatementPerformanceConfig */
export function migrateIncomeStatementPerformanceConfig(
  config: StatementChartConfig,
  statementType: StatementType,
): StatementChartConfig {
  return ensureIncomeStatementPerformanceConfig(config, statementType)
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
    series: repairMislabeledAmountSeries(series),
  }
}
