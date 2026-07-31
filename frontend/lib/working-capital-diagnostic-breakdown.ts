import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  collectWorkingCapitalIncludedOperands,
  resolveWorkingCapitalOperandAmount,
  resolveWorkingCapitalStructureAmount,
  workingCapitalOperandDisplayLabel,
} from "@/lib/working-capital-structure-utils"
import {
  isCodeMappingEnabled,
  isStructureRowEmptyLabel,
  isStructureRowHidden,
} from "@/lib/income-statement-structure-utils"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  metricHeading,
  parseMetricFromHeading,
  workingCapitalPeriodAnchors,
  type WorkingCapitalDiagnosticResult,
  type WorkingCapitalMetricKey,
} from "@/lib/working-capital-diagnostic"
import { WORKING_CAPITAL_METRIC_KEYS } from "@/lib/working-capital-diagnostic-config"

const AMOUNT_EPSILON = 1e-6

function normalizeMetricLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function findStructureRowForMetric(
  structure: Record<string, unknown>[],
  metric: WorkingCapitalMetricKey,
): Record<string, unknown> | null {
  for (const row of structure) {
    if (isStructureRowHidden(row) || isStructureRowEmptyLabel(row)) continue
    if (!isCodeMappingEnabled(row)) continue
    const key = normalizeMetricLabel(String(row.label ?? ""))
    if (metric === "fdr" && (key === "fdr" || key === "fonds de roulement")) return row
    if (metric === "fdrhc" && (key === "fdrhc" || key === "fonds de roulement hors caisse")) return row
    if (metric === "dso" && key === "dso") return row
    if (metric === "dio" && (key === "dio" || key === "rotation des stocks" || key === "rotation stocks"))
      return row
    if (metric === "dpo" && key === "dpo") return row
    if (metric === "ccc" && key === "ccc") return row
  }
  return null
}

function metricFormat(metric: WorkingCapitalMetricKey): "currency" | "days" {
  return metric === "fdr" || metric === "fdrhc" ? "currency" : "days"
}

function operandTrendValues(
  code: string,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  structure: Record<string, unknown>[],
  anchors: { label: string; periodIndex: number }[],
): (number | null)[] {
  return anchors.map(({ periodIndex }) => {
    const value = resolveWorkingCapitalOperandAmount(
      code,
      bsRows,
      isRows,
      bsPeriods,
      isPeriods,
      periodIndex,
      structure,
    )
    return Math.abs(value) < AMOUNT_EPSILON ? null : value
  })
}

function buildMetricBreakdownTable(params: {
  metric: WorkingCapitalMetricKey
  result: WorkingCapitalDiagnosticResult
  bsRows: SeriesRow[]
  isRows: SeriesRow[]
  bsPeriods: SeriesPeriod[]
  isPeriods: SeriesPeriod[]
  structure: Record<string, unknown>[]
  view: string
  refMonth: number
  refYear: number
}): ContributiveMarginEvolutionTable | null {
  const {
    metric,
    result,
    bsRows,
    isRows,
    bsPeriods,
    isPeriods,
    structure,
    view,
    refMonth,
    refYear,
  } = params

  const periods = result.points.map((p) => p.period)
  const metricValues = result.points.map((p) => p[metric])
  const structureRow = findStructureRowForMetric(structure, metric)
  const anchors = workingCapitalPeriodAnchors(bsPeriods, view, refMonth, refYear)

  const detailRows = structureRow
    ? collectWorkingCapitalIncludedOperands(structureRow).map((operand) => {
        const label = workingCapitalOperandDisplayLabel(operand.code, bsRows, isRows, structure)
        const signPrefix = operand.sign ? `${operand.sign} ` : ""
        return {
          id: `${metric}-${operand.code}`,
          label: `${signPrefix}${operand.code}${label && label !== operand.code ? ` — ${label}` : ""}`,
          values: operandTrendValues(
            operand.code,
            bsRows,
            isRows,
            bsPeriods,
            isPeriods,
            structure,
            anchors,
          ),
          displayKind: "link-code" as const,
        }
      })
    : []

  if (metric === "ccc" && !structureRow) {
    for (const component of ["dso", "dio", "dpo"] as const) {
      const compRow = findStructureRowForMetric(structure, component)
      if (!compRow) continue
      detailRows.push({
        id: `${metric}-${component}`,
        label: metricHeading(component),
        values: result.points.map((p) => p[component]),
        displayKind: "link-code",
      })
    }
  }

  const hasVisibleDetail = detailRows.some((row) =>
    row.values.some((v) => v !== null && Math.abs(v) > AMOUNT_EPSILON),
  )
  if (!hasVisibleDetail && metricValues.every((v) => Math.abs(v) < AMOUNT_EPSILON)) return null

  return {
    sourceId: metric,
    sourceLabel: metricHeading(metric),
    periods,
    metrics: [
      {
        id: metric,
        label: metricHeading(metric),
        format: metricFormat(metric),
        values: metricValues,
        detailRows: hasVisibleDetail ? detailRows : undefined,
      },
    ],
  }
}

export function buildWorkingCapitalDiagnosticBreakdownTables(params: {
  result: WorkingCapitalDiagnosticResult
  bsRows: SeriesRow[]
  isRows: SeriesRow[]
  bsPeriods: SeriesPeriod[]
  isPeriods: SeriesPeriod[]
  structure: Record<string, unknown>[]
  view: string
  refMonth: number
  refYear: number
}): Map<string, ContributiveMarginEvolutionTable> | null {
  if (!params.result.points.length) return null

  const tables = new Map<string, ContributiveMarginEvolutionTable>()
  for (const metric of WORKING_CAPITAL_METRIC_KEYS) {
    const table = buildMetricBreakdownTable({ ...params, metric })
    if (!table) continue
    tables.set(metricHeading(metric), table)
  }

  return tables.size ? tables : null
}

export function resolveWorkingCapitalMetricAmount(
  row: Record<string, unknown>,
  bsRows: SeriesRow[],
  isRows: SeriesRow[],
  bsPeriods: SeriesPeriod[],
  isPeriods: SeriesPeriod[],
  periodIndex: number,
  structure: Record<string, unknown>[],
): number | null {
  return resolveWorkingCapitalStructureAmount(
    row,
    bsRows,
    isRows,
    bsPeriods,
    isPeriods,
    periodIndex,
    structure,
  )
}

export { parseMetricFromHeading }
