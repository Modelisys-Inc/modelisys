import type { DivisionProfitabilitySlice } from "@/lib/division-profitability"
import {
  buildDivisionRentabilityAnalysisParagraph,
  buildRevenueAnalysisParagraphForSlice,
  isAnnualExercisePresent,
  resolveWindowNarrativeCopy,
  type PerformanceNarrativeParagraph,
  type PerformanceNarrativeResult,
  type RevenueSeriesNarrativeSlice,
  type WindowNarrativeCopy,
} from "@/lib/income-performance-narrative"

const DATA_EPSILON = 1e-6

function divisionTableHeading(heading: string): string {
  return `Rentabilité — ${heading}`
}

function divisionBlockMeta(slice: DivisionProfitabilitySlice) {
  return {
    divisionBlockId: slice.divisionId,
    divisionTitle: slice.heading,
    heading: divisionTableHeading(slice.heading),
    hideMainHeading: true,
  } as const
}

function mapDivisionSliceToRevenueSeries(slice: DivisionProfitabilitySlice): RevenueSeriesNarrativeSlice {
  return {
    heading: divisionTableHeading(slice.heading),
    metricLabel: slice.metricLabel,
    variableCostMapped: slice.mappingStatus.variableCostAccountCount > 0,
    variableCostAccountCount: slice.mappingStatus.variableCostAccountCount,
    points: slice.points.map((point) => ({
      period: point.period,
      revenue: point.revenue,
      grossProfit: point.contributiveMargin,
      ebita: point.operatingProfit,
      grossMarginPercent:
        Math.abs(point.revenue) > DATA_EPSILON
          ? (point.contributiveMargin / point.revenue) * 100
          : 0,
      variableCost: point.variableCosts,
    })),
  }
}

function buildDivisionRevenueParagraph(
  slice: DivisionProfitabilitySlice,
  seriesSlice: RevenueSeriesNarrativeSlice,
  series: RevenueSeriesNarrativeSlice[],
  index: number,
  copy: WindowNarrativeCopy,
): PerformanceNarrativeParagraph {
  const block = divisionBlockMeta(slice)
  const revenueParagraph = buildRevenueAnalysisParagraphForSlice(
    seriesSlice,
    series,
    index,
    copy,
    "division",
    "division-revenue",
  )

  if (revenueParagraph) {
    return {
      ...revenueParagraph,
      ...block,
      subsection: "Revenus",
      showIndicatorTable: false,
      section: "division-revenue",
    }
  }

  return {
    ...block,
    subsection: "Revenus",
    showIndicatorTable: false,
    section: "division-revenue",
    body: `Aucun revenu n'est affecté à ${slice.metricLabel} sur l'horizon analysé. Vérifiez l'affectation des comptes de revenus (codes REV) à cette division dans le mapping comptable.`,
  }
}

export function buildDivisionProfitabilityNarrative(
  slices: DivisionProfitabilitySlice[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!slices.length) return null

  const resolved = resolveWindowNarrativeCopy(view)
  if (!resolved) return null

  const { copy, mode } = resolved
  const series = slices.map(mapDivisionSliceToRevenueSeries)
  const paragraphs = slices.flatMap((slice, index) => {
    const seriesSlice = series[index]!
    const block = divisionBlockMeta(slice)
    const rentabilityParagraph = buildDivisionRentabilityAnalysisParagraph(
      seriesSlice,
      series,
      index,
      copy,
      slice.mappingStatus,
    )

    return [
      buildDivisionRevenueParagraph(slice, seriesSlice, series, index, copy),
      {
        ...rentabilityParagraph,
        ...block,
        subsection: "Rentabilité",
        showIndicatorTable: true,
        section: "division-rentability",
      },
    ]
  })

  if (!paragraphs.length) return null

  const referencePeriod =
    series
      .flatMap((s) => s.points)
      .find(isAnnualExercisePresent)?.period ??
    series[0]?.points[0]?.period ??
    ""

  return {
    mode,
    title: "Lecture de la performance",
    subtitle: copy.subtitle,
    referencePeriod,
    paragraphs,
  }
}
