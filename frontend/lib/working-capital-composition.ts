import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
  normalizeLiaisonMode,
} from "@/lib/income-statement-structure-utils"
import {
  resolveWorkingCapitalStructureAmount,
  resolveWorkingCapitalDisplayFormat,
  workingCapitalRowRefCode,
} from "@/lib/working-capital-structure-utils"
import {
  workingCapitalPeriodAnchors,
  type WorkingCapitalDiagnosticResult,
} from "@/lib/working-capital-diagnostic"

const DATA_EPSILON = 1e-6

export const WORKING_CAPITAL_COMPOSITION_METRIC_KEYS = [
  "arRevPct",
  "inventoryRevPct",
  "payablesRevPct",
  "payablesExpPct",
] as const

export type WorkingCapitalCompositionMetricKey =
  (typeof WORKING_CAPITAL_COMPOSITION_METRIC_KEYS)[number]

export const WORKING_CAPITAL_COMPOSITION_LABELS: Record<
  WorkingCapitalCompositionMetricKey,
  string
> = {
  arRevPct: "Comptes clients en % des revenus",
  inventoryRevPct: "Stocks en % des revenus",
  payablesRevPct: "Créditeurs en % des revenus",
  payablesExpPct: "Créditeurs en % des dépenses",
}

const COMPOSITION_LABEL_ALIASES: Record<WorkingCapitalCompositionMetricKey, string[]> = {
  arRevPct: [
    "comptes clients en % des revenus",
    "comptes clients / revenus",
    "clients en % des revenus",
    "clients / revenus",
  ],
  inventoryRevPct: ["stocks en % des revenus", "stocks / revenus", "inventaire en % des revenus"],
  payablesRevPct: [
    "crediteurs en % des revenus",
    "créditeurs en % des revenus",
    "crediteurs / revenus",
    "créditeurs / revenus",
  ],
  payablesExpPct: [
    "crediteurs en % des depenses",
    "créditeurs en % des dépenses",
    "crediteurs / depenses",
    "créditeurs / dépenses",
  ],
}

function normalizeMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function matchesCompositionLabel(
  key: string,
  metric: WorkingCapitalCompositionMetricKey,
): boolean {
  const canonical = normalizeMetricLabel(WORKING_CAPITAL_COMPOSITION_LABELS[metric])
  if (key === canonical) return true
  return COMPOSITION_LABEL_ALIASES[metric].some(
    (alias) => key === alias || key.includes(alias),
  )
}

export function findStructureRowForCompositionMetric(
  structure: Record<string, unknown>[],
  metric: WorkingCapitalCompositionMetricKey,
): Record<string, unknown> | null {
  for (const row of structure) {
    if (isStructureRowHidden(row) || isStructureRowEmptyLabel(row)) continue
    if (!isCodeMappingEnabled(row)) continue
    const labelKey = normalizeMetricLabel(String(row.label ?? ""))
    if (matchesCompositionLabel(labelKey, metric)) return row
    const ref = workingCapitalRowRefCode(row)
    if (ref && matchesCompositionLabel(normalizeMetricLabel(ref), metric)) return row
  }
  return null
}

export function resolveCompositionValueAtPeriod(
  metric: WorkingCapitalCompositionMetricKey,
  structure: Record<string, unknown>[],
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
): number | null {
  const row = findStructureRowForCompositionMetric(structure, metric)
  if (!row) return null
  if (normalizeLiaisonMode(row) === "na") return null

  const raw = resolveWorkingCapitalStructureAmount(
    row,
    bsRows,
    isRows,
    bsPeriods,
    isPeriods,
    periodIndex,
    structure,
  )
  if (raw === null) return null
  const format = resolveWorkingCapitalDisplayFormat(row)
  return format === "percent" ? raw * 100 : raw
}

export type WorkingCapitalCompositionPoint = {
  period: string
  arRevPct: number
  inventoryRevPct: number
  payablesRevPct: number
  payablesExpPct: number
}

export type WorkingCapitalCompositionResult = {
  points: WorkingCapitalCompositionPoint[]
  configuredMetrics: WorkingCapitalCompositionMetricKey[]
  /** Libellé réel dans la structure (pour titres de tableaux). */
  metricHeadings: Partial<Record<WorkingCapitalCompositionMetricKey, string>>
}

export function buildWorkingCapitalCompositionResult(params: {
  bsRows: SeriesRow[]
  bsPeriods: SeriesPeriod[]
  isRows: SeriesRow[]
  isPeriods: SeriesPeriod[]
  structure: Record<string, unknown>[]
  view: string
  refMonth: number
  refYear: number
  structureReady?: boolean
}): WorkingCapitalCompositionResult | null {
  const {
    bsRows,
    bsPeriods,
    isRows,
    isPeriods,
    structure,
    view,
    refMonth,
    refYear,
    structureReady = true,
  } = params
  if (!structureReady || !bsPeriods.length) return null

  const anchors = workingCapitalPeriodAnchors(bsPeriods, view, refMonth, refYear)
  if (!anchors.length) return null

  const metricHeadings: Partial<Record<WorkingCapitalCompositionMetricKey, string>> = {}
  const configuredMetrics: WorkingCapitalCompositionMetricKey[] = []

  for (const metric of WORKING_CAPITAL_COMPOSITION_METRIC_KEYS) {
    const row = findStructureRowForCompositionMetric(structure, metric)
    if (!row) continue
    if (normalizeLiaisonMode(row) === "na") continue
    configuredMetrics.push(metric)
    const label = String(row.label ?? "").trim()
    metricHeadings[metric] = label || WORKING_CAPITAL_COMPOSITION_LABELS[metric]
  }

  const points: WorkingCapitalCompositionPoint[] = anchors.map(({ label, periodIndex }) => {
    const values = Object.fromEntries(
      WORKING_CAPITAL_COMPOSITION_METRIC_KEYS.map((metric) => [
        metric,
        resolveCompositionValueAtPeriod(
          metric,
          structure,
          bsRows,
          isRows,
          bsPeriods,
          isPeriods,
          periodIndex,
        ) ?? 0,
      ]),
    ) as Record<WorkingCapitalCompositionMetricKey, number>

    return { period: label, ...values }
  })

  const hasData = points.some((point) =>
    WORKING_CAPITAL_COMPOSITION_METRIC_KEYS.some(
      (metric) => Math.abs(point[metric]) > DATA_EPSILON,
    ),
  )

  if (!configuredMetrics.length && !hasData) {
    return { points: [], configuredMetrics: [], metricHeadings }
  }

  return { points, configuredMetrics, metricHeadings }
}

export function compositionMetricHeading(
  result: WorkingCapitalCompositionResult,
  metric: WorkingCapitalCompositionMetricKey,
): string {
  return result.metricHeadings[metric] ?? WORKING_CAPITAL_COMPOSITION_LABELS[metric]
}

export function parseCompositionMetricFromHeading(
  heading: string,
  result: WorkingCapitalCompositionResult,
): WorkingCapitalCompositionMetricKey | null {
  for (const metric of WORKING_CAPITAL_COMPOSITION_METRIC_KEYS) {
    if (heading === compositionMetricHeading(result, metric)) return metric
  }
  return null
}

export type WorkingCapitalNarrativeInputs = {
  fdrResult: WorkingCapitalDiagnosticResult | null
  compositionResult: WorkingCapitalCompositionResult | null
}
