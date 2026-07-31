import {
  type WorkingCapitalDiagnosticResult,
  WORKING_CAPITAL_METRIC_KEYS,
  WORKING_CAPITAL_METRIC_LABELS,
  type WorkingCapitalMetricKey,
} from "@/lib/working-capital-diagnostic"
import { formatCurrency } from "@/lib/financial-utils"
import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"

const DATA_EPSILON = 1e-6
const SECTION = "working-capital" as const

function fmtDays(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} jours`
}

function referenceForPeriod(view: string, period: string): string {
  return view === "years" ? `l'exercice ${period}` : `le mois de ${period}`
}

function priorComparisonLabel(view: string): string {
  return view === "years" ? "En glissement annuel" : "Par rapport au mois précédent"
}

function describeMetricValue(metric: WorkingCapitalMetricKey, value: number): string {
  if (metric === "fdr" || metric === "fdrhc") return formatCurrency(value)
  return fmtDays(value)
}

function describeMetricTrend(
  metric: WorkingCapitalMetricKey,
  result: WorkingCapitalDiagnosticResult,
  view: string,
): string | null {
  const latest = result.points[0]
  const prior = result.points[1]
  if (!latest || !prior) return null

  const latestVal = latest[metric]
  const priorVal = prior[metric]
  if (Math.abs(priorVal) < DATA_EPSILON) return null

  const change = ((latestVal - priorVal) / Math.abs(priorVal)) * 100
  if (Math.abs(change) < 0.5) return null

  const label = WORKING_CAPITAL_METRIC_LABELS[metric].toLowerCase()
  const unit =
    metric === "fdr" || metric === "fdrhc"
      ? `${formatCurrency(priorVal)} → ${formatCurrency(latestVal)}`
      : `${fmtDays(priorVal)} → ${fmtDays(latestVal)}`

  return `${priorComparisonLabel(view)}, le ${label} évolue de ${change >= 0 ? "+" : ""}${change.toFixed(1).replace(".", ",")} % (${unit}).`
}

function buildOverviewParagraph(
  result: WorkingCapitalDiagnosticResult,
  view: string,
): PerformanceNarrativeParagraph | null {
  const latest = result.points[0]
  if (!latest) return null

  return {
    section: SECTION,
    heading: "Vue d'ensemble",
    body: `Pour ${referenceForPeriod(view, latest.period)}, la société affiche un fonds de roulement de ${formatCurrency(latest.fdr)} (hors caisse : ${formatCurrency(latest.fdrhc)}). Le cycle de conversion de trésorerie (CCC) s'établit à ${fmtDays(latest.ccc)} — DSO ${fmtDays(latest.dso)}, rotation des stocks ${fmtDays(latest.dio)}, DPO ${fmtDays(latest.dpo)}. Les composantes sont détaillées dans les tableaux ci-dessous.`,
  }
}

export function buildWorkingCapitalDiagnosticNarrative(
  result: WorkingCapitalDiagnosticResult,
  view: string,
): PerformanceNarrativeResult | null {
  if (!result.points.length) return null

  const paragraphs: PerformanceNarrativeParagraph[] = []
  const overview = buildOverviewParagraph(result, view)
  if (overview) paragraphs.push(overview)

  for (const metric of WORKING_CAPITAL_METRIC_KEYS) {
    const latest = result.points[0]
    if (!latest) continue
    const value = latest[metric]
    if (Math.abs(value) < DATA_EPSILON && result.configuredMetricCount === 0) continue

    const heading = WORKING_CAPITAL_METRIC_LABELS[metric]
    const trend = describeMetricTrend(metric, result, view)
    const intro =
      metric === "fdr" || metric === "fdrhc"
        ? `Pour ${referenceForPeriod(view, latest.period)}, le ${heading.toLowerCase()} s'élève à ${describeMetricValue(metric, value)}. Développez le tableau pour voir les codes de liaison qui composent cet indicateur.`
        : `Pour ${referenceForPeriod(view, latest.period)}, l'indicateur « ${heading} » s'établit à ${describeMetricValue(metric, value)}. Les postes utilisés dans le calcul sont listés dans le tableau ci-dessous.`

    paragraphs.push({
      section: SECTION,
      heading,
      body: intro,
      secondaryBody: trend ?? undefined,
    })
  }

  if (!paragraphs.length) return null

  return {
    title: "Lecture du fonds de roulement",
    subtitle:
      view === "years"
        ? "Évolution du fonds de roulement et du cycle de trésorerie sur les cinq derniers exercices."
        : "Évolution du fonds de roulement et du cycle de trésorerie sur les vingt-quatre derniers mois.",
    mode: view === "years" ? "annual" : "monthly",
    paragraphs,
  }
}
