import { computeCagr } from "@/lib/income-performance-narrative"
import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import type { WorkingCapitalDiagnosticResult } from "@/lib/working-capital-diagnostic"
import type { WorkingCapitalCompositionResult } from "@/lib/working-capital-composition"
import type { SeriesPeriod, SeriesRow } from "@/lib/api"
import {
  WORKING_CAPITAL_NARRATIVE_METRIC_ORDER,
  buildWorkingCapitalNarrativeMetricSeries,
  type WorkingCapitalNarrativeMetricFormat,
  type WorkingCapitalNarrativeMetricKey,
  type WorkingCapitalNarrativeMetricSeries,
} from "@/lib/working-capital-narrative-series"

const DATA_EPSILON = 1e-6
const SECTION = "working-capital" as const

const REVENUE_SHARE_METRICS = new Set<WorkingCapitalNarrativeMetricKey>([
  "arRevPct",
  "inventoryRevPct",
  "payablesRevPct",
])

function fmtPct(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} %`
}

function fmtDays(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} j`
}

function fmtPts(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1).replace(".", ",")} pts`
}

function fmtDayDelta(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1).replace(".", ",")} j`
}

function formatValue(value: number, format: WorkingCapitalNarrativeMetricFormat): string {
  return format === "days" ? fmtDays(value) : fmtPct(value)
}

function pctChange(latest: number, prior: number): number | null {
  if (Math.abs(prior) < DATA_EPSILON) return null
  return ((latest - prior) / Math.abs(prior)) * 100
}

function parseYear(period: string): number | null {
  const match = period.match(/\b(20\d{2})\b/)
  return match ? Number(match[1]) : null
}

type WindowStats = {
  min: number
  max: number
  mean: number
  minPeriod: string
  maxPeriod: string
}

function windowStats(points: { period: string; value: number }[]): WindowStats | null {
  if (!points.length) return null
  let min = points[0]!.value
  let max = points[0]!.value
  let minIdx = 0
  let maxIdx = 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const v = points[i]!.value
    sum += v
    if (v < min) {
      min = v
      minIdx = i
    }
    if (v > max) {
      max = v
      maxIdx = i
    }
  }
  return {
    min,
    max,
    mean: sum / points.length,
    minPeriod: points[minIdx]!.period,
    maxPeriod: points[maxIdx]!.period,
  }
}

function scopeSentence(view: string, count: number, from: string, to: string): string {
  if (view === "years") {
    return `Sur ${count} exercice${count > 1 ? "s" : ""} disposant de données (${from} à ${to})`
  }
  return `Sur ${count} mois disposant de données (${from} à ${to})`
}

function positionVsMeanSentence(
  latest: number,
  mean: number,
  format: WorkingCapitalNarrativeMetricFormat,
): string {
  const delta = latest - mean
  if (format === "days") {
    if (Math.abs(delta) < 0.05) return "Le niveau actuel est aligné sur la moyenne historique."
    if (delta > 0) {
      return `Le niveau actuel dépasse la moyenne historique de ${fmtDayDelta(delta)}.`
    }
    return `Le niveau actuel se situe ${fmtDayDelta(Math.abs(delta))} sous la moyenne historique.`
  }
  if (Math.abs(delta) <= 0.05) return "Le niveau actuel est aligné sur la moyenne historique."
  if (delta > 0) return `Le niveau actuel dépasse la moyenne historique de ${fmtPts(delta)}.`
  return `Le niveau actuel se situe ${fmtPts(Math.abs(delta))} sous la moyenne historique.`
}

function buildStatsLine(
  stats: WindowStats,
  format: WorkingCapitalNarrativeMetricFormat,
  cagr: number | null,
): string {
  const parts = [
    `Min. : ${formatValue(stats.min, format)} (${stats.minPeriod})`,
    `Max. : ${formatValue(stats.max, format)} (${stats.maxPeriod})`,
    `Moyenne : ${formatValue(stats.mean, format)}`,
  ]
  if (cagr !== null) parts.push(`TCAC : ${fmtPct(cagr)}`)
  return parts.join(" · ")
}

function buildMetricParagraph(
  series: WorkingCapitalNarrativeMetricSeries,
  view: string,
): PerformanceNarrativeParagraph | null {
  const retained = series.points.filter((point) => Math.abs(point.value) > DATA_EPSILON)
  if (!retained.length) return null

  const stats = windowStats(retained)
  if (!stats) return null

  const latest = retained[0]!
  const prior = retained.length > 1 ? retained[1]! : null
  const label = series.heading.toLowerCase()
  const referenceLabel = view === "years" ? `l'exercice ${latest.period}` : `le mois de ${latest.period}`

  const sentences: string[] = [
    `${scopeSentence(view, retained.length, retained[retained.length - 1]!.period, latest.period)}, ${label} s'établit à ${formatValue(latest.value, series.format)} pour ${referenceLabel}.`,
    `La fourchette observée s'étend de ${formatValue(stats.min, series.format)} en ${stats.minPeriod} à ${formatValue(stats.max, series.format)} en ${stats.maxPeriod}, pour une moyenne de ${formatValue(stats.mean, series.format)}.`,
    positionVsMeanSentence(latest.value, stats.mean, series.format),
  ]

  let cagrForStats: number | null = null
  if (retained.length >= 2 && view === "years") {
    const oldest = retained[retained.length - 1]!
    const latestYear = parseYear(latest.period)
    const oldestYear = parseYear(oldest.period)
    const interval =
      latestYear !== null && oldestYear !== null ? latestYear - oldestYear : retained.length - 1
    cagrForStats =
      interval > 0 ? computeCagr(latest.value, oldest.value, interval) : null
    if (cagrForStats !== null) {
      const dir = cagrForStats >= 0 ? "croissance" : "contraction"
      sentences.push(
        `Sur la fenêtre analysée, le TCAC affiche une ${dir} de ${fmtPct(Math.abs(cagrForStats))} (${oldest.period} → ${latest.period}).`,
      )
    }
  }

  if (prior) {
    const comparison = view === "years" ? "En glissement annuel" : "Par rapport au mois précédent"
    if (series.format === "days") {
      const delta = latest.value - prior.value
      if (Math.abs(delta) >= 0.05) {
        sentences.push(
          `${comparison}, ${label} évolue de ${fmtDayDelta(delta)} (${formatValue(prior.value, series.format)} → ${formatValue(latest.value, series.format)}).`,
        )
      } else {
        sentences.push(`${comparison}, ${label} est stable (${formatValue(prior.value, series.format)}).`)
      }
    } else {
      const yoy = pctChange(latest.value, prior.value)
      if (yoy !== null && Math.abs(yoy) >= 0.5) {
        sentences.push(
          `${comparison}, ${label} évolue de ${yoy >= 0 ? "+" : ""}${fmtPct(yoy)} (${formatValue(prior.value, series.format)} → ${formatValue(latest.value, series.format)}).`,
        )
      } else {
        sentences.push(`${comparison}, ${label} est stable (${formatValue(prior.value, series.format)}).`)
      }
    }
  }

  if (Math.abs(latest.value - stats.max) < DATA_EPSILON * Math.max(1, Math.abs(stats.max))) {
    sentences.push(`À la date de référence, ${label} atteint le plus haut niveau de la période analysée.`)
  } else if (Math.abs(latest.value - stats.min) < DATA_EPSILON * Math.max(1, Math.abs(stats.min))) {
    sentences.push(`À la date de référence, ${label} se situe au plus bas de la période analysée.`)
  }

  return {
    section: SECTION,
    heading: series.heading,
    body: sentences.join(" "),
    statsLine: buildStatsLine(stats, series.format, cagrForStats),
  }
}

function buildRevenueShareIntro(): PerformanceNarrativeParagraph {
  return {
    section: SECTION,
    heading: "Structure en % des revenus",
    body: "Les ratios ci-dessous mesurent le poids des comptes clients, stocks et créditeurs par rapport aux revenus (base TTM). Ils reprennent les mêmes libellés que le tableau de structure et complètent la lecture des délais et du fonds de roulement rapporté aux ventes.",
  }
}

export function buildWorkingCapitalDiagnosticNarrative(params: {
  fdrResult: WorkingCapitalDiagnosticResult
  compositionResult: WorkingCapitalCompositionResult | null
  view: string
  bsRows: SeriesRow[]
  isRows: SeriesRow[]
  bsPeriods: SeriesPeriod[]
  isPeriods: SeriesPeriod[]
  structure: Record<string, unknown>[]
  refMonth: number
  refYear: number
}): PerformanceNarrativeResult | null {
  const { fdrResult, compositionResult, view, ...seriesParams } = params
  if (!fdrResult.points.length) return null

  const metricSeries = buildWorkingCapitalNarrativeMetricSeries({
    fdrResult,
    compositionResult,
    ...seriesParams,
    view,
  })

  if (!metricSeries.length) return null

  const paragraphs: PerformanceNarrativeParagraph[] = []
  let revenueShareIntroAdded = false

  for (const key of WORKING_CAPITAL_NARRATIVE_METRIC_ORDER) {
    const series = metricSeries.find((item) => item.key === key)
    if (!series) continue

    if (REVENUE_SHARE_METRICS.has(key) && !revenueShareIntroAdded) {
      paragraphs.push(buildRevenueShareIntro())
      revenueShareIntroAdded = true
    }

    const paragraph = buildMetricParagraph(series, view)
    if (paragraph) paragraphs.push(paragraph)
  }

  if (!paragraphs.length) return null

  const horizonSubtitle =
    view === "years"
      ? "Évolution sur cinq exercices, glissement annuel et positionnement par rapport à la moyenne historique."
      : view === "12months"
        ? "Évolution sur douze mois, variation récente et positionnement par rapport à la moyenne."
        : "Évolution sur vingt-quatre mois, variation récente et positionnement par rapport à la moyenne."

  return {
    title: "Lecture du fonds de roulement",
    subtitle: horizonSubtitle,
    mode: view === "years" ? "annual" : "monthly",
    paragraphs,
  }
}
