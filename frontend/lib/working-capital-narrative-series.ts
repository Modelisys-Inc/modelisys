import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
} from "@/lib/income-statement-structure-utils"
import {
  resolveWorkingCapitalStructureAmount,
  resolveWorkingCapitalDisplayFormat,
  seriesTrailingTwelveMonthAmountForLinkCode,
} from "@/lib/working-capital-structure-utils"
import {
  workingCapitalPeriodAnchors,
  type WorkingCapitalDiagnosticPoint,
  type WorkingCapitalDiagnosticResult,
} from "@/lib/working-capital-diagnostic"
import type {
  WorkingCapitalCompositionMetricKey,
  WorkingCapitalCompositionResult,
} from "@/lib/working-capital-composition"
import {
  compositionMetricHeading,
  resolveCompositionValueAtPeriod,
} from "@/lib/working-capital-composition"

const DATA_EPSILON = 1e-6

export const WORKING_CAPITAL_NARRATIVE_METRIC_ORDER = [
  "fdrRevPct",
  "fdrhcRevPct",
  "dso",
  "dio",
  "dpo",
  "ccc",
  "arRevPct",
  "inventoryRevPct",
  "payablesRevPct",
] as const

export type WorkingCapitalNarrativeMetricKey =
  (typeof WORKING_CAPITAL_NARRATIVE_METRIC_ORDER)[number]

export const WORKING_CAPITAL_NARRATIVE_HEADINGS: Record<
  WorkingCapitalNarrativeMetricKey,
  string
> = {
  fdrRevPct: "FDR / Revenus",
  fdrhcRevPct: "FdRHC / Revenus",
  dso: "Délai de collection des clients",
  dio: "Délai de rotation des stocks",
  dpo: "Délai de paiement des fournisseurs",
  ccc: "Cycle de conversion de l'encaisse",
  arRevPct: "Comptes clients / Revenus",
  inventoryRevPct: "Stocks / Revenus",
  payablesRevPct: "Créditeurs / Revenus",
}

export type WorkingCapitalNarrativeMetricFormat = "percent" | "days"

export type WorkingCapitalNarrativeSeriesPoint = {
  period: string
  value: number
}

export type WorkingCapitalNarrativeMetricSeries = {
  key: WorkingCapitalNarrativeMetricKey
  heading: string
  format: WorkingCapitalNarrativeMetricFormat
  points: WorkingCapitalNarrativeSeriesPoint[]
}

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function findStructureRowByLabels(
  structure: Record<string, unknown>[],
  aliases: string[],
): Record<string, unknown> | null {
  const normalizedAliases = aliases.map(normalizeLabel)
  for (const row of structure) {
    if (isStructureRowHidden(row) || isStructureRowEmptyLabel(row)) continue
    if (!isCodeMappingEnabled(row)) continue
    const labelKey = normalizeLabel(String(row.label ?? ""))
    if (normalizedAliases.includes(labelKey)) return row
  }
  return null
}

function resolveStructurePercentAtPeriod(
  row: Record<string, unknown>,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
  structure: Record<string, unknown>[],
): number | null {
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

function heuristicFdrRevPct(
  fdr: number,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
): number | null {
  const revenue = seriesTrailingTwelveMonthAmountForLinkCode(
    "REV",
    isRows,
    isPeriods,
    periodIndex,
  )
  if (Math.abs(revenue) < DATA_EPSILON) return null
  return (fdr / revenue) * 100
}

function diagnosticValue(
  point: WorkingCapitalDiagnosticPoint,
  key: Extract<WorkingCapitalNarrativeMetricKey, "dso" | "dio" | "dpo" | "ccc">,
): number {
  return point[key]
}

function narrativeHeadingForMetric(
  key: WorkingCapitalNarrativeMetricKey,
  compositionResult: WorkingCapitalCompositionResult | null,
): string {
  const compositionKey = compositionMetricKeyForNarrative(key)
  if (compositionKey && compositionResult?.configuredMetrics.includes(compositionKey)) {
    return compositionMetricHeading(compositionResult, compositionKey)
  }
  return WORKING_CAPITAL_NARRATIVE_HEADINGS[key]
}

export function buildWorkingCapitalNarrativeMetricSeries(params: {
  fdrResult: WorkingCapitalDiagnosticResult
  compositionResult: WorkingCapitalCompositionResult | null
  bsRows: SeriesRow[]
  isRows: SeriesRow[]
  bsPeriods: SeriesPeriod[]
  isPeriods: SeriesPeriod[]
  structure: Record<string, unknown>[]
  view: string
  refMonth: number
  refYear: number
}): WorkingCapitalNarrativeMetricSeries[] {
  const {
    fdrResult,
    compositionResult,
    bsRows,
    isRows,
    bsPeriods,
    isPeriods,
    structure,
    view,
    refMonth,
    refYear,
  } = params

  const anchors = workingCapitalPeriodAnchors(bsPeriods, view, refMonth, refYear)
  const fdrRevRow = findStructureRowByLabels(structure, ["fdr / revenus", "fdr/revenus"])
  const fdrhcRevRow = findStructureRowByLabels(structure, [
    "fdrhc / revenus",
    "fdrhc/revenus",
    "fdRHC / revenus",
  ])

  const seriesByKey = new Map<WorkingCapitalNarrativeMetricKey, WorkingCapitalNarrativeSeriesPoint[]>()

  const compositionMetrics = (["arRevPct", "inventoryRevPct", "payablesRevPct"] as const).filter(
    (metric) => compositionResult?.configuredMetrics.includes(metric),
  )

  for (const { label, periodIndex } of anchors) {
    const fdrPoint = fdrResult.points.find((p) => p.period === label)

    if (fdrRevRow) {
      const value = resolveStructurePercentAtPeriod(
        fdrRevRow,
        bsRows,
        isRows,
        bsPeriods,
        isPeriods,
        periodIndex,
        structure,
      )
      if (value !== null) pushPoint(seriesByKey, "fdrRevPct", label, value)
    } else if (fdrPoint) {
      const value = heuristicFdrRevPct(fdrPoint.fdr, bsRows, isRows, isPeriods, periodIndex)
      if (value !== null) pushPoint(seriesByKey, "fdrRevPct", label, value)
    }

    if (fdrhcRevRow) {
      const value = resolveStructurePercentAtPeriod(
        fdrhcRevRow,
        bsRows,
        isRows,
        bsPeriods,
        isPeriods,
        periodIndex,
        structure,
      )
      if (value !== null) pushPoint(seriesByKey, "fdrhcRevPct", label, value)
    } else if (fdrPoint) {
      const value = heuristicFdrRevPct(fdrPoint.fdrhc, bsRows, isRows, isPeriods, periodIndex)
      if (value !== null) pushPoint(seriesByKey, "fdrhcRevPct", label, value)
    }

    if (fdrPoint) {
      for (const key of ["dso", "dio", "dpo", "ccc"] as const) {
        pushPoint(seriesByKey, key, label, diagnosticValue(fdrPoint, key))
      }
    }

    if (compositionMetrics.length) {
      for (const metric of compositionMetrics) {
        const value = resolveCompositionValueAtPeriod(
          metric,
          structure,
          bsRows,
          isRows,
          bsPeriods,
          isPeriods,
          periodIndex,
        )
        if (value !== null) pushPoint(seriesByKey, metric, label, value)
      }
    }
  }

  const formatFor: Record<WorkingCapitalNarrativeMetricKey, WorkingCapitalNarrativeMetricFormat> = {
    fdrRevPct: "percent",
    fdrhcRevPct: "percent",
    dso: "days",
    dio: "days",
    dpo: "days",
    ccc: "days",
    arRevPct: "percent",
    inventoryRevPct: "percent",
    payablesRevPct: "percent",
  }

  return WORKING_CAPITAL_NARRATIVE_METRIC_ORDER.map((key) => ({
    key,
    heading: narrativeHeadingForMetric(key, compositionResult),
    format: formatFor[key],
    points: seriesByKey.get(key) ?? [],
  })).filter((series) =>
    series.points.some((point) => Math.abs(point.value) > DATA_EPSILON),
  )
}

function pushPoint(
  map: Map<WorkingCapitalNarrativeMetricKey, WorkingCapitalNarrativeSeriesPoint[]>,
  key: WorkingCapitalNarrativeMetricKey,
  period: string,
  value: number,
) {
  if (!Number.isFinite(value)) return
  const bucket = map.get(key) ?? []
  bucket.push({ period, value })
  map.set(key, bucket)
}

export function compositionMetricKeyForNarrative(
  key: WorkingCapitalNarrativeMetricKey,
): WorkingCapitalCompositionMetricKey | null {
  if (key === "arRevPct") return "arRevPct"
  if (key === "inventoryRevPct") return "inventoryRevPct"
  if (key === "payablesRevPct") return "payablesRevPct"
  return null
}
