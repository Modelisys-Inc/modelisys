import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  collectWorkingCapitalIncludedOperands,
  resolveWorkingCapitalOperandAmount,
  resolveWorkingCapitalStructureAmount,
  workingCapitalOperandDisplayLabel,
} from "@/lib/working-capital-structure-utils"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  contributiveMarginRowHasVisibleAmounts,
  filterZeroContributiveMarginDetailRows,
} from "@/lib/revenue-contributive-margin-evolution"
import { buildWorkingCapitalCompositionBreakdownTables } from "@/lib/working-capital-composition-breakdown"
import type { WorkingCapitalCompositionResult } from "@/lib/working-capital-composition"
import {
  findStructureRowForMetric,
  metricHeading,
  parseMetricFromHeading,
  workingCapitalPeriodAnchors,
  type WorkingCapitalDiagnosticResult,
  type WorkingCapitalMetricKey,
} from "@/lib/working-capital-diagnostic"
import { WORKING_CAPITAL_METRIC_KEYS } from "@/lib/working-capital-diagnostic-config"

const AMOUNT_EPSILON = 1e-6

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
    ? filterZeroContributiveMarginDetailRows(
        collectWorkingCapitalIncludedOperands(structureRow).map((operand) => {
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
        }),
        periods.length,
      )
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
    contributiveMarginRowHasVisibleAmounts(row.values, periods.length),
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

export function buildWorkingCapitalNarrativeBreakdownTables(params: {
  diagnosticResult: WorkingCapitalDiagnosticResult
  compositionResult: WorkingCapitalCompositionResult | null
  bsRows: SeriesRow[]
  isRows: SeriesRow[]
  bsPeriods: SeriesPeriod[]
  isPeriods: SeriesPeriod[]
  structure: Record<string, unknown>[]
  view: string
  refMonth: number
  refYear: number
}): Map<string, ContributiveMarginEvolutionTable> | null {
  const {
    diagnosticResult,
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

  const merged = new Map<string, ContributiveMarginEvolutionTable>()

  const diagnosticTables = buildWorkingCapitalDiagnosticBreakdownTables({
    result: diagnosticResult,
    bsRows,
    isRows,
    bsPeriods,
    isPeriods,
    structure,
    view,
    refMonth,
    refYear,
  })
  diagnosticTables?.forEach((table, heading) => merged.set(heading, table))

  if (compositionResult?.points.length) {
    const compositionTables = buildWorkingCapitalCompositionBreakdownTables({
      result: compositionResult,
      bsRows,
      isRows,
      bsPeriods,
      isPeriods,
      structure,
      view,
      refMonth,
      refYear,
    })
    compositionTables?.forEach((table, heading) => merged.set(heading, table))
  }

  return merged.size ? merged : null
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
