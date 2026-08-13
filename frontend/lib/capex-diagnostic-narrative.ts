import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import { formatCurrency } from "@/lib/financial-utils"

export type CapexNarrativeMetricFormat = "currency" | "percent" | "ratio" | "days"

export interface CapexNarrativeMetric {
  key: string
  label: string
  format: CapexNarrativeMetricFormat
  /** Ordre chronologique : index 0 = plus ancien (sauf vue « courant » : [récent, passé]). */
  values: number[]
  periodLabels: string[]
}

const DATA_EPSILON = 1e-6
const SECTION = "capex" as const

function formatValue(value: number, format: CapexNarrativeMetricFormat): string {
  if (format === "percent") return `${value.toFixed(1).replace(".", ",")} %`
  if (format === "ratio") return value.toFixed(2).replace(".", ",")
  if (format === "days") return `${value.toFixed(1).replace(".", ",")} j`
  return formatCurrency(value)
}

function pctChange(latest: number, prior: number): number | null {
  if (Math.abs(prior) < DATA_EPSILON) return null
  return ((latest - prior) / Math.abs(prior)) * 100
}

function buildMetricParagraph(
  metric: CapexNarrativeMetric,
  labelCounts: Map<string, number>,
): PerformanceNarrativeParagraph | null {
  const { values, periodLabels } = metric
  if (!values.length) return null

  const latestIdx = values.length - 1
  const latest = values[latestIdx]!
  const prior = values.length > 1 ? values[latestIdx - 1]! : null
  const latestLabel = periodLabels[latestIdx] ?? "la période courante"
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length

  const sentences: string[] = []
  sentences.push(
    `À ${latestLabel}, ${metric.label} s'établit à ${formatValue(latest, metric.format)}.`,
  )

  if (prior != null) {
    const delta = latest - prior
    if (metric.format === "currency") {
      const pct = pctChange(latest, prior)
      sentences.push(
        pct != null
          ? `En glissement, la variation est de ${formatValue(delta, metric.format)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")} % vs période précédente).`
          : `En glissement, la variation est de ${formatValue(delta, metric.format)}.`,
      )
    } else if (metric.format === "percent") {
      sentences.push(
        `En glissement, le niveau a ${delta >= 0 ? "progressé" : "reculé"} de ${Math.abs(delta).toFixed(1).replace(".", ",")} point${Math.abs(delta) > 1 ? "s" : ""}.`,
      )
    } else if (metric.format === "days") {
      sentences.push(
        `En glissement, ${delta >= 0 ? "une hausse" : "une baisse"} de ${Math.abs(delta).toFixed(1).replace(".", ",")} jour${Math.abs(delta) > 1 ? "s" : ""} par rapport à la période précédente.`,
      )
    } else {
      const pct = pctChange(latest, prior)
      if (pct != null) {
        sentences.push(
          `En glissement, variation de ${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")} % vs période précédente.`,
        )
      }
    }
  }

  if (values.length >= 3 && Math.abs(latest - mean) > DATA_EPSILON) {
    sentences.push(
      `La moyenne sur la fenêtre est de ${formatValue(mean, metric.format)} ; le niveau courant ${latest > mean ? "dépasse" : "se situe sous"} cette moyenne.`,
    )
  }

  const labelCount = (labelCounts.get(metric.label) ?? 0) + 1
  labelCounts.set(metric.label, labelCount)
  const heading =
    labelCount > 1 ? `${metric.label} (${labelCount})` : metric.label

  return {
    section: SECTION,
    heading,
    body: sentences.join(" "),
  }
}

export function buildCapexDiagnosticNarrative(params: {
  metrics: CapexNarrativeMetric[]
  view: string
}): PerformanceNarrativeResult | null {
  const labelCounts = new Map<string, number>()
  const paragraphs = params.metrics
    .map((metric) => buildMetricParagraph(metric, labelCounts))
    .filter((paragraph): paragraph is PerformanceNarrativeParagraph => paragraph !== null)

  if (!paragraphs.length) return null

  const horizonSubtitle =
    params.view === "years"
      ? "Évolution des investissements et ratios d'intensité capitalistique sur les cinq derniers exercices."
      : params.view === "12months"
        ? "Évolution des investissements et ratios d'intensité capitalistique sur les douze derniers mois."
        : "Évolution des investissements et ratios d'intensité capitalistique sur la fenêtre affichée."

  return {
    title: "Lecture des Capex",
    subtitle: horizonSubtitle,
    mode: params.view === "years" ? "annual" : "monthly",
    paragraphs,
  }
}
