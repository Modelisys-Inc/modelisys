import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  collectWorkingCapitalIncludedOperands,
  resolveWorkingCapitalOperandAmount,
  workingCapitalOperandDisplayLabel,
} from "@/lib/working-capital-structure-utils"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"
import {
  contributiveMarginRowHasVisibleAmounts,
  filterZeroContributiveMarginDetailRows,
} from "@/lib/revenue-contributive-margin-evolution"
import { workingCapitalPeriodAnchors } from "@/lib/working-capital-diagnostic"
import {
  WORKING_CAPITAL_COMPOSITION_METRIC_KEYS,
  compositionMetricHeading,
  findStructureRowForCompositionMetric,
  parseCompositionMetricFromHeading,
  type WorkingCapitalCompositionMetricKey,
  type WorkingCapitalCompositionResult,
} from "@/lib/working-capital-composition"

const AMOUNT_EPSILON = 1e-6

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

function buildCompositionBreakdownTable(params: {
  metric: WorkingCapitalCompositionMetricKey
  result: WorkingCapitalCompositionResult
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

  if (!result.configuredMetrics.includes(metric)) return null

  const periods = result.points.map((p) => p.period)
  const metricValues = result.points.map((p) => p[metric])
  const structureRow = findStructureRowForCompositionMetric(structure, metric)
  const anchors = workingCapitalPeriodAnchors(bsPeriods, view, refMonth, refYear)
  const heading = compositionMetricHeading(result, metric)

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

  const hasVisibleDetail = detailRows.some((row) =>
    contributiveMarginRowHasVisibleAmounts(row.values, periods.length),
  )
  if (!hasVisibleDetail && metricValues.every((v) => Math.abs(v) < AMOUNT_EPSILON)) return null

  return {
    sourceId: metric,
    sourceLabel: heading,
    periods,
    metrics: [
      {
        id: metric,
        label: heading,
        format: "percent",
        values: metricValues,
        detailRows: hasVisibleDetail ? detailRows : undefined,
      },
    ],
  }
}

export function buildWorkingCapitalCompositionBreakdownTables(params: {
  result: WorkingCapitalCompositionResult
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
  for (const metric of WORKING_CAPITAL_COMPOSITION_METRIC_KEYS) {
    const table = buildCompositionBreakdownTable({ ...params, metric })
    if (!table) continue
    tables.set(compositionMetricHeading(params.result, metric), table)
  }

  return tables.size ? tables : null
}

export { parseCompositionMetricFromHeading }
