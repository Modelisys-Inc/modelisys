/**
 * Configuration du graphique « Performance financière » (compte de résultat).
 * Persistée en localStorage par société.
 */

export type PerformanceMetricSpec =
  | { type: "single"; code: string }
  | { type: "sum"; codes: string[] }
  | { type: "difference"; numeratorCodes: string[]; denominatorCodes: string[] }
  | {
      type: "ratio"
      numeratorCodes: string[]
      denominatorCodes: string[]
      /** Si vrai : 1 − (numérateur ÷ dénominateur) au lieu de numérateur ÷ dénominateur. */
      complement?: boolean
    }
  /** (Bénéfice brut ÷ revenus d’une série barre) × 100 ; la série « revenus » est une autre série du graphique. */
  | {
      type: "derivedMargin"
      revenueSeriesId: string
      grossProfitFromSpec: PerformanceMetricSpec
    }

/** Ancien mode (v1) — conservé pour migration JSON */
export type GrossMarginLineMode =
  | { kind: "derived" }
  | { kind: "metric"; spec: PerformanceMetricSpec }

export interface PerformanceChartLabelsV1 {
  revenue: string
  grossProfit: string
  grossMargin: string
  ebita: string
}

/** Config v1 lue depuis le stockage ; peut contenir d’anciens `type: "auto"`. */
export interface PerformanceChartConfigV1 {
  version: 1
  revenue: unknown
  grossProfit: unknown
  grossMarginLine: GrossMarginLineMode
  ebita: unknown
  labels: PerformanceChartLabelsV1
}

/** Montant (devise) ou ratio affiché en % (valeur × 100 sur l’axe). */
export type ChartValueFormat = "currency" | "ratio"

/** Une série du graphique (histogramme ou courbe). */
export interface PerformanceChartSeriesV2 {
  id: string
  kind: "bar" | "line"
  label: string
  spec: PerformanceMetricSpec
  yAxis: "left" | "right"
  valueFormat: ChartValueFormat
  showOnChart: boolean
  showInSidePanel: boolean
  color?: string
}

export interface PerformanceChartConfigV2 {
  version: 2
  /** Titre affiché sur la carte du tableau de bord. */
  chartTitle: string
  series: PerformanceChartSeriesV2[]
}

/** Valeur par défaut du titre de carte (personnalisable dans Paramètres du graphique). */
export const DEFAULT_PERFORMANCE_CHART_CARD_TITLE = "Performance financière"

export const DEFAULT_PERFORMANCE_CHART_LABELS: PerformanceChartLabelsV1 = {
  revenue: "Revenus",
  grossProfit: "Bénéfice brut",
  grossMargin: "Marge brute (%)",
  ebita: "BAIIA",
}

export const DEFAULT_PERFORMANCE_CHART_CONFIG_V1: PerformanceChartConfigV1 = {
  version: 1,
  revenue: { type: "single", code: "" },
  grossProfit: { type: "single", code: "" },
  grossMarginLine: { kind: "derived" },
  ebita: { type: "single", code: "" },
  labels: DEFAULT_PERFORMANCE_CHART_LABELS,
}

const DEFAULT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

function newSeriesId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID()
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const DEFAULT_TEMPLATE_IDS = {
  revenue: "perf-default-revenue",
  ebita: "perf-default-ebita",
  margin: "perf-default-margin",
} as const

/** Migration JSON : plus de « auto », plus d’anciens formats. */
export function migrateMetricSpec(raw: unknown): PerformanceMetricSpec {
  if (!raw || typeof raw !== "object") return { type: "single", code: "" }
  const x = raw as Record<string, unknown>
  const t = x.type
  if (t === "auto" || t === undefined) return { type: "single", code: String(x.code ?? "").trim() }

  if (t === "single") return { type: "single", code: String(x.code ?? "").trim() }
  if (t === "sum") {
    const codes = Array.isArray(x.codes) ? (x.codes as string[]).map(String) : []
    return { type: "sum", codes }
  }
  if (t === "difference") {
    return {
      type: "difference",
      numeratorCodes: Array.isArray(x.numeratorCodes) ? (x.numeratorCodes as string[]).map(String) : [],
      denominatorCodes: Array.isArray(x.denominatorCodes) ? (x.denominatorCodes as string[]).map(String) : [],
    }
  }
  if (t === "ratio") {
    return {
      type: "ratio",
      numeratorCodes: Array.isArray(x.numeratorCodes) ? (x.numeratorCodes as string[]).map(String) : [],
      denominatorCodes: Array.isArray(x.denominatorCodes) ? (x.denominatorCodes as string[]).map(String) : [],
      complement: x.complement === true,
    }
  }
  if (t === "derivedMargin") {
    return {
      type: "derivedMargin",
      revenueSeriesId: String(x.revenueSeriesId ?? ""),
      grossProfitFromSpec: migrateMetricSpec(x.grossProfitFromSpec),
    }
  }
  return { type: "single", code: "" }
}

function migrateChartValueFormat(v: unknown): ChartValueFormat {
  if (v === "ratio" || v === "ratio100") return "ratio"
  if (v === "percent") return "currency"
  return "currency"
}

export function defaultPerformanceChartConfigV2(): PerformanceChartConfigV2 {
  const idRev = DEFAULT_TEMPLATE_IDS.revenue
  const idEb = DEFAULT_TEMPLATE_IDS.ebita
  const idM = DEFAULT_TEMPLATE_IDS.margin
  return {
    version: 2,
    chartTitle: DEFAULT_PERFORMANCE_CHART_CARD_TITLE,
    series: [
      {
        id: idRev,
        kind: "bar",
        label: DEFAULT_PERFORMANCE_CHART_LABELS.revenue,
        spec: { type: "single", code: "" },
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
        color: DEFAULT_COLORS[0],
      },
      {
        id: idEb,
        kind: "bar",
        label: DEFAULT_PERFORMANCE_CHART_LABELS.ebita,
        spec: { type: "single", code: "" },
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
        color: DEFAULT_COLORS[1],
      },
      {
        id: idM,
        kind: "line",
        label: DEFAULT_PERFORMANCE_CHART_LABELS.grossMargin,
        spec: {
          type: "derivedMargin",
          revenueSeriesId: idRev,
          grossProfitFromSpec: { type: "single", code: "" },
        },
        yAxis: "right",
        valueFormat: "ratio",
        showOnChart: true,
        showInSidePanel: true,
        color: DEFAULT_COLORS[2],
      },
    ],
  }
}

function migrateV1ToV2(v1: PerformanceChartConfigV1): PerformanceChartConfigV2 {
  const idRev = newSeriesId()
  const idEb = newSeriesId()
  const idM = newSeriesId()

  const revSpec = migrateMetricSpec(v1.revenue)
  const gpSpec = migrateMetricSpec(v1.grossProfit)
  const ebSpec = migrateMetricSpec(v1.ebita)

  let marginSpec: PerformanceMetricSpec
  if (v1.grossMarginLine.kind === "derived") {
    marginSpec = {
      type: "derivedMargin",
      revenueSeriesId: idRev,
      grossProfitFromSpec: gpSpec,
    }
  } else {
    const ms = migrateMetricSpec((v1.grossMarginLine as { spec?: unknown }).spec)
    marginSpec =
      ms.type === "single" && !String(ms.code ?? "").trim()
        ? {
            type: "derivedMargin",
            revenueSeriesId: idRev,
            grossProfitFromSpec: gpSpec,
          }
        : ms
  }

  const mLineFormat: ChartValueFormat =
    marginSpec.type === "ratio" || marginSpec.type === "derivedMargin" ? "ratio" : "currency"

  return {
    version: 2,
    chartTitle: DEFAULT_PERFORMANCE_CHART_CARD_TITLE,
    series: [
      {
        id: idRev,
        kind: "bar",
        label: v1.labels.revenue,
        spec: revSpec,
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
        color: DEFAULT_COLORS[0],
      },
      {
        id: idEb,
        kind: "bar",
        label: v1.labels.ebita,
        spec: ebSpec,
        yAxis: "left",
        valueFormat: "currency",
        showOnChart: true,
        showInSidePanel: true,
        color: DEFAULT_COLORS[1],
      },
      {
        id: idM,
        kind: "line",
        label: v1.labels.grossMargin,
        spec: marginSpec,
        yAxis: "right",
        valueFormat: mLineFormat,
        showOnChart: true,
        showInSidePanel: true,
        color: DEFAULT_COLORS[2],
      },
    ],
  }
}

function normalizeSpec(s: PerformanceMetricSpec): PerformanceMetricSpec {
  if (s.type === "derivedMargin") {
    return {
      ...s,
      grossProfitFromSpec: migrateMetricSpec(s.grossProfitFromSpec),
      revenueSeriesId: typeof s.revenueSeriesId === "string" ? s.revenueSeriesId : "",
    }
  }
  return s
}

function normalizeV2(raw: Partial<PerformanceChartConfigV2>): PerformanceChartConfigV2 {
  const def = defaultPerformanceChartConfigV2()
  const list = Array.isArray(raw.series) && raw.series.length > 0 ? raw.series : def.series
  const series: PerformanceChartSeriesV2[] = list.map((s, i) => ({
    id: typeof s.id === "string" && s.id.trim() ? s.id : newSeriesId(),
    kind: s.kind === "line" ? "line" : "bar",
    label: (s.label ?? "").trim() || `Série ${i + 1}`,
    spec: normalizeSpec(migrateMetricSpec(s.spec)),
    yAxis: s.yAxis === "right" ? "right" : "left",
    valueFormat: migrateChartValueFormat(s.valueFormat),
    showOnChart: s.showOnChart !== false,
    showInSidePanel: s.showInSidePanel !== false,
    color: typeof s.color === "string" && s.color.trim() ? s.color.trim() : DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }))
  const chartTitle =
    typeof raw.chartTitle === "string" && raw.chartTitle.trim() ? raw.chartTitle.trim() : def.chartTitle
  return { version: 2, chartTitle, series }
}

/** Clé historique : graphique principal (instance « default »). */
const legacyChartStorageKey = (companyId: string) => `modelisys:performance-chart:${companyId}`

function chartInstanceStorageKey(companyId: string, chartInstanceId: string): string {
  if (chartInstanceId === "default") return legacyChartStorageKey(companyId)
  return `modelisys:performance-chart:${companyId}:i:${chartInstanceId}`
}

const CHART_SLOTS_KEY = (companyId: string) => `modelisys:performance-chart-slots:${companyId}`

export type PerformanceChartConfig = PerformanceChartConfigV2

/**
 * @param chartInstanceId `default` = même stockage qu’avant ; autres id = graphiques additionnels.
 */
export function loadPerformanceChartConfig(
  companyId: string | null | undefined,
  chartInstanceId: string = "default"
): PerformanceChartConfigV2 {
  if (!companyId || typeof window === "undefined") return defaultPerformanceChartConfigV2()
  try {
    const raw = window.localStorage.getItem(chartInstanceStorageKey(companyId, chartInstanceId))
    if (!raw) return defaultPerformanceChartConfigV2()
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed?.version === 2) {
      return normalizeV2(parsed as Partial<PerformanceChartConfigV2>)
    }
    if (chartInstanceId !== "default") return defaultPerformanceChartConfigV2()
    if (parsed?.version === 1) {
      const v1 = parsed as unknown as PerformanceChartConfigV1
      const pl = v1.labels
      const labels: PerformanceChartLabelsV1 = {
        revenue: (typeof pl?.revenue === "string" && pl.revenue.trim()) || DEFAULT_PERFORMANCE_CHART_LABELS.revenue,
        grossProfit:
          (typeof pl?.grossProfit === "string" && pl.grossProfit.trim()) ||
          DEFAULT_PERFORMANCE_CHART_LABELS.grossProfit,
        grossMargin:
          (typeof pl?.grossMargin === "string" && pl.grossMargin.trim()) ||
          DEFAULT_PERFORMANCE_CHART_LABELS.grossMargin,
        ebita: (typeof pl?.ebita === "string" && pl.ebita.trim()) || DEFAULT_PERFORMANCE_CHART_LABELS.ebita,
      }
      const fullV1: PerformanceChartConfigV1 = {
        version: 1,
        revenue: v1.revenue ?? DEFAULT_PERFORMANCE_CHART_CONFIG_V1.revenue,
        grossProfit: v1.grossProfit ?? DEFAULT_PERFORMANCE_CHART_CONFIG_V1.grossProfit,
        grossMarginLine: v1.grossMarginLine ?? DEFAULT_PERFORMANCE_CHART_CONFIG_V1.grossMarginLine,
        ebita: v1.ebita ?? DEFAULT_PERFORMANCE_CHART_CONFIG_V1.ebita,
        labels,
      }
      return migrateV1ToV2(fullV1)
    }
    return defaultPerformanceChartConfigV2()
  } catch {
    return defaultPerformanceChartConfigV2()
  }
}

export function savePerformanceChartConfig(
  companyId: string,
  config: PerformanceChartConfigV2,
  chartInstanceId: string = "default"
): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      chartInstanceStorageKey(companyId, chartInstanceId),
      JSON.stringify(normalizeV2(config))
    )
  } catch {
    /* ignore quota */
  }
}

export function loadPerformanceChartSlotIds(companyId: string | null | undefined): string[] {
  if (!companyId || typeof window === "undefined") return ["default"]
  try {
    const raw = window.localStorage.getItem(CHART_SLOTS_KEY(companyId))
    if (!raw) return ["default"]
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr) || arr.length === 0) return ["default"]
    const ids = arr.filter((x): x is string => typeof x === "string")
    if (!ids.length) return ["default"]
    return ids.includes("default") ? ids : ["default", ...ids]
  } catch {
    return ["default"]
  }
}

/** Nouveau graphique avec config initiale. Retourne l’identifiant du slot. */
export function appendPerformanceChartSlot(companyId: string): string {
  const id = newSeriesId()
  const slots = loadPerformanceChartSlotIds(companyId)
  const next = slots.includes(id) ? slots : [...slots, id]
  try {
    window.localStorage.setItem(CHART_SLOTS_KEY(companyId), JSON.stringify(next))
    savePerformanceChartConfig(companyId, defaultPerformanceChartConfigV2(), id)
  } catch {
    /* ignore */
  }
  return id
}

/**
 * Retire un graphique additionnel du tableau de bord et supprime sa config locale.
 * Le slot `default` (graphique principal) ne peut pas être supprimé.
 */
export function removePerformanceChartSlot(companyId: string, chartInstanceId: string): boolean {
  if (typeof window === "undefined") return false
  if (chartInstanceId === "default") return false
  const slots = loadPerformanceChartSlotIds(companyId)
  if (slots.length <= 1 || !slots.includes(chartInstanceId)) return false
  const next = slots.filter((id) => id !== chartInstanceId)
  const normalized = next.length > 0 ? (next.includes("default") ? next : ["default", ...next]) : ["default"]
  try {
    window.localStorage.setItem(CHART_SLOTS_KEY(companyId), JSON.stringify(normalized))
    window.localStorage.removeItem(chartInstanceStorageKey(companyId, chartInstanceId))
  } catch {
    /* ignore */
  }
  return true
}

/** Alias stable pour l’état initial / imports existants. */
export const DEFAULT_PERFORMANCE_CHART_CONFIG: PerformanceChartConfigV2 = defaultPerformanceChartConfigV2()

export { newSeriesId, DEFAULT_COLORS }
