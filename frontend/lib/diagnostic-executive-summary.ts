/**
 * Sommaire exécutif — briefings analytiques par section (constats + points
 * à surveiller), à partir du payload `CompanyDiagnostic`.
 */

import type {
  CompanyDiagnostic,
  DiagnosticDivisionPerformance,
  DiagnosticProductPerformance,
  DiagnosticTrendYear,
} from "@/lib/api"
import { DEFAULT_BENCHMARK, type SectorBenchmark } from "@/lib/diagnostic-benchmarks"
import {
  buildSignals,
  type DiagnosticSignal,
} from "@/lib/diagnostic-derive"
import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import type { SignalTone } from "@/lib/diagnostic-theme"
import { diagnosticReportViewLabel } from "@/lib/diagnostic-report-chapters"
import type { DiagnosticNarrativeBundle } from "@/lib/diagnostic-narrative-bundle"
import {
  EXECUTIVE_SUMMARY_QUESTIONS,
  compressNarrativeBundle,
} from "@/lib/diagnostic-executive-summary-compress"

const nf = (v: number, digits = 1) =>
  v.toLocaleString("fr-CA", { minimumFractionDigits: digits, maximumFractionDigits: digits })

const nfPct = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? "—" : `${nf(v, 1)} %`

const nfMoneyK = (v: number, currency: string) => {
  const abs = Math.abs(v)
  const sign = v < 0 ? "−" : ""
  const suffix = currency === "CAD" ? "$" : ` ${currency}`
  if (abs >= 1_000_000) return `${sign}${nf(abs / 1_000_000, 1)} M${suffix}`
  return `${sign}${nf(abs / 1_000, 0)} k${suffix}`
}

export type SummaryMetricChip = {
  label: string
  value: string
  tone?: "positive" | "negative" | "watch" | "neutral"
}

export type ExecutiveSummaryBlock = {
  id: string
  reportView?: DiagnosticReportView
  scrollTargetId?: string
  title: string
  subtitle: string
  paragraphs: string[]
  metrics?: SummaryMetricChip[]
  highlight?: { tone: SignalTone; text: string }
}

export type ExecutiveSummaryModel = {
  referenceLabel: string
  headline: string
  introParagraphs: string[]
  conclusionParagraph: string
  blocks: ExecutiveSummaryBlock[]
  attentionPoints: DiagnosticSignal[]
}

function yoyDelta(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

function ptsDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null
  return current - previous
}

function vsSector(
  value: number | null,
  sector: number,
  higherIsBetter = true,
): "above" | "below" | "inline" | null {
  if (value == null || !Number.isFinite(value)) return null
  const diff = value - sector
  const threshold = Math.max(Math.abs(sector) * 0.05, 0.05)
  if (Math.abs(diff) <= threshold) return "inline"
  if (higherIsBetter) return diff > 0 ? "above" : "below"
  return diff < 0 ? "above" : "below"
}

function trendDirection(values: number[]): "hausse" | "baisse" | "stable" | null {
  if (values.length < 2) return null
  const first = values[0]!
  const last = values[values.length - 1]!
  if (first === 0) return null
  const delta = ((last - first) / Math.abs(first)) * 100
  if (delta > 3) return "hausse"
  if (delta < -3) return "baisse"
  return "stable"
}

function lifecycleLabel(stage: string): string {
  switch (stage) {
    case "croissance":
      return "croissance"
    case "décroissance":
      return "décroissance"
    case "maturité":
      return "maturité"
    default:
      return "stade indéterminé"
  }
}

function signalForSection(signals: DiagnosticSignal[], section: DiagnosticSignal["section"]) {
  const s = signals.find((x) => x.section === section)
  return s ? { tone: s.tone, text: s.text } : undefined
}

function summarizePerformanceTrend(
  years: DiagnosticTrendYear[],
  currency: string,
): { paragraphs: string[]; metrics: SummaryMetricChip[] } {
  const latest = years[years.length - 1]
  const previous = years.length > 1 ? years[years.length - 2] : null
  if (!latest) {
    return {
      paragraphs: ["Historique insuffisant pour établir une tendance fiable."],
      metrics: [],
    }
  }

  const revTrend = trendDirection(years.map((y) => y.revenue))
  const revYoY = previous ? yoyDelta(latest.revenue, previous.revenue) : null
  const cmTrend = trendDirection(years.map((y) => y.gross_margin_pct ?? 0))
  const marginPts = previous ? ptsDelta(latest.gross_margin_pct, previous.gross_margin_pct) : null
  const baiiaTrend = trendDirection(years.map((y) => y.ebitda))
  const ebitdaYoY = previous ? yoyDelta(latest.ebitda, previous.ebitda) : null

  const trendWord = (t: ReturnType<typeof trendDirection>) =>
    t === "hausse" ? "en hausse" : t === "baisse" ? "en baisse" : "stable"

  return {
    paragraphs: [
      `Revenus : tendance ${trendWord(revTrend)} sur l'horizon analysé${revYoY != null ? ` (${revYoY >= 0 ? "+" : "−"}${nf(Math.abs(revYoY), 1)} % vs N-1)` : ""}, pour un niveau de ${nfMoneyK(latest.revenue, currency)} à la date de référence.`,
      `Contribution marginale : tendance ${trendWord(cmTrend)}${marginPts != null && Math.abs(marginPts) >= 0.3 ? ` (${marginPts >= 0 ? "+" : "−"}${nf(Math.abs(marginPts), 1)} pt de marge brute vs N-1, en attendant le mapping des coûts variables)` : " — paramétrez le mapping des coûts variables pour une lecture exacte de la contribution marginale"}.`,
      `BAIIA : tendance ${trendWord(baiiaTrend)} de l'EBITDA consolidé (${nfMoneyK(latest.ebitda, currency)}, ${nfPct(latest.ebitda_margin_pct)})${ebitdaYoY != null ? ` (${ebitdaYoY >= 0 ? "+" : "−"}${nf(Math.abs(ebitdaYoY), 1)} % vs N-1)` : ""} — le pont de dépenses affine cette lecture en BAIIA opérationnel.`,
    ],
    metrics: [
      { label: "CA", value: nfMoneyK(latest.revenue, currency), tone: "neutral" },
      {
        label: "Marge brute",
        value: nfPct(latest.gross_margin_pct),
        tone: "neutral",
      },
      {
        label: "EBITDA",
        value: nfMoneyK(latest.ebitda, currency),
        tone: latest.ebitda >= 0 ? "positive" : "negative",
      },
    ],
  }
}

function summarizeRevenueGrowth(
  products: DiagnosticProductPerformance[],
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  summary: CompanyDiagnostic["summary"],
  currency: string,
): { paragraphs: string[]; metrics: SummaryMetricChip[] } {
  const revYoY = latest && previous ? yoyDelta(latest.revenue, previous.revenue) : null

  if (products.length >= 2) {
    const sorted = [...products].sort((a, b) => b.revenue - a.revenue)
    const leader = sorted[0]!
    const runner = sorted[1]!
    return {
      paragraphs: [
        `À la date de référence, ${leader.product_name} concentre ${nfPct(leader.revenue_share_pct)} du chiffre d'affaires (${nfMoneyK(leader.revenue, currency)}) et constitue le principal moteur du niveau d'activité.`,
        `${runner.product_name} représente ${nfPct(runner.revenue_share_pct)} du CA${revYoY != null ? ` ; la croissance consolidée atteint ${revYoY >= 0 ? "+" : "−"}${nf(Math.abs(revYoY), 1)} % vs N-1` : ""}. Ouvrez l'analyse des revenus pour une ventilation par série du graphique.`,
      ],
      metrics: [
        { label: "CA", value: nfMoneyK(summary.latest_revenue, currency), tone: "neutral" },
        { label: "TCAC", value: nfPct(summary.revenue_cagr_5y), tone: "neutral" },
      ],
    }
  }

  return {
    paragraphs: [
      `Le chiffre d'affaires s'établit à ${nfMoneyK(summary.latest_revenue, currency)}${revYoY != null ? `, en ${revYoY >= 0 ? "hausse" : "baisse"} de ${nf(Math.abs(revYoY), 1)} % vs N-1` : ""}${summary.revenue_cagr_5y != null ? ` (TCAC ${nfPct(summary.revenue_cagr_5y)})` : ""}.`,
      "La ventilation par source de revenus nécessite la configuration du graphique Revenus — chaque série indique d'où provient réellement la croissance.",
    ],
    metrics: [
      { label: "CA", value: nfMoneyK(summary.latest_revenue, currency), tone: "neutral" },
    ],
  }
}

function summarizeMarginByRevenueValue(
  products: DiagnosticProductPerformance[],
  summary: CompanyDiagnostic["summary"],
): { paragraphs: string[]; metrics: SummaryMetricChip[] } {
  if (products.length < 2) {
    return {
      paragraphs: [
        `La marge brute consolidée s'affiche à ${nfPct(summary.latest_gross_margin_pct)}.`,
        "Paramétrez les séries de revenus et le mapping des coûts variables pour identifier quelles sources créent le plus et le moins de valeur contributive.",
      ],
      metrics: [
        { label: "Marge brute", value: nfPct(summary.latest_gross_margin_pct), tone: "neutral" },
      ],
    }
  }

  const byMargin = [...products].sort(
    (a, b) => (a.gross_margin_pct ?? 0) - (b.gross_margin_pct ?? 0),
  )
  const best = byMargin[byMargin.length - 1]!
  const worst = byMargin[0]!

  return {
    paragraphs: [
      `${best.product_name} crée le plus de valeur avec une marge brute de ${nfPct(best.gross_margin_pct)} (${nfPct(best.revenue_share_pct)} du CA).`,
      `${worst.product_name} affiche la marge la plus faible (${nfPct(worst.gross_margin_pct)}) — à croiser avec la contribution marginale exacte dans l'analyse Marge par revenus.`,
      `La marge brute consolidée évolue autour de ${nfPct(summary.latest_gross_margin_pct)} ; la tendance de la contribution marginale se lit précisément dans le rapport détaillé.`,
    ],
    metrics: [
      { label: "Marge brute", value: nfPct(summary.latest_gross_margin_pct), tone: "neutral" },
      { label: "Marge EBITDA", value: nfPct(summary.latest_ebitda_margin_pct), tone: "neutral" },
    ],
  }
}

function summarizeExpensesStructure(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
): { paragraphs: string[] } {
  if (!latest) {
    return {
      paragraphs: [
        "Données insuffisantes pour analyser la structure variable / fixe.",
        "Paramétrez les coûts variables et fixes dans le mapping comptable pour quantifier les principaux postes de dépenses.",
      ],
    }
  }

  const gross = latest.gross_margin_pct ?? 0
  const ebitda = latest.ebitda_margin_pct ?? 0
  const opexDrag = gross - ebitda

  return {
    paragraphs: [
      `Entre la marge brute (${nfPct(gross)}) et l'EBITDA (${nfPct(ebitda)}), environ ${nf(opexDrag, 1)} points du CA sont absorbés par les charges d'exploitation — sans ventilation CV/CF tant que le mapping n'est pas complété.`,
      previous && latest.gross_margin_pct != null && previous.gross_margin_pct != null
        ? `Sur un an, la marge brute a ${latest.gross_margin_pct >= previous.gross_margin_pct ? "progressé" : "reculé"} de ${nf(Math.abs(latest.gross_margin_pct - previous.gross_margin_pct), 1)} pt — ouvrez l'analyse des dépenses pour la concentration variable vs fixe et les principaux postes.`
        : "Ouvrez l'analyse des dépenses pour mesurer la concentration des frais variables et fixes et lister les principaux postes.",
    ],
  }
}

function summarizeDivisionsValue(
  divisions: DiagnosticDivisionPerformance[],
  currency: string,
): {
  paragraphs: string[]
  metrics?: SummaryMetricChip[]
  highlight?: { tone: SignalTone; text: string }
} {
  if (divisions.length === 0) {
    return {
      paragraphs: [
        "Aucune division configurée — la création de valeur ne se lit qu'au niveau consolidé.",
        "Créez des divisions dans la structure organisationnelle pour comparer revenus, contribution marginale et BAIIA par centre d'activité.",
      ],
    }
  }

  const byEbitda = [...divisions].sort((a, b) => b.ebitda - a.ebitda)
  const best = byEbitda[0]!
  const worst = byEbitda[byEbitda.length - 1]!
  const profitable = divisions.filter((d) => d.profitable)

  const paragraphs = [
    `${best.division_name} crée le plus de valeur (${nfMoneyK(best.ebitda, currency)} d'EBITDA, ${nfPct(best.ebitda_margin_pct)} de marge, ${nfPct(best.revenue_share_pct)} du CA).`,
    worst.division_id !== best.division_id
      ? `${worst.division_name} affiche la rentabilité la plus faible (${nfMoneyK(worst.ebitda, currency)}, ${nfPct(worst.ebitda_margin_pct)} de marge).`
      : "Toutes les divisions affichent un profil de rentabilité comparable sur l'exercice de référence.",
    `${profitable.length}/${divisions.length} division${divisions.length > 1 ? "s" : ""} dégag${profitable.length > 1 ? "ent" : "e"} un résultat positif — la lecture détaillée des revenus, de la contribution marginale et du BAIIA par division est disponible dans l'analyse des divisions.`,
  ]

  return {
    paragraphs,
    metrics: [
      {
        label: "Rentables",
        value: `${profitable.length}/${divisions.length}`,
        tone: profitable.length === divisions.length ? "positive" : "watch",
      },
    ],
  }
}

export function buildExecutiveSummary(
  diagnostic: CompanyDiagnostic,
  narrativeBundle?: DiagnosticNarrativeBundle | null,
): ExecutiveSummaryModel {
  const { summary, currency, trends: rawTrends, divisions, products } = diagnostic
  const benchmark = DEFAULT_BENCHMARK
  const years = [...rawTrends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const previous = years.length > 1 ? years[years.length - 2] : null
  const signals = buildSignals(diagnostic, benchmark)

  const ref = diagnostic.reference_period
  const referenceLabel = `${String(ref.calendar_month).padStart(2, "0")}/${ref.calendar_year}`

  const compressed = narrativeBundle ? compressNarrativeBundle(narrativeBundle) : null

  const perfFallback = summarizePerformanceTrend(years, currency)
  const revFallback = summarizeRevenueGrowth(products, latest, previous, summary, currency)
  const marginFallback = summarizeMarginByRevenueValue(products, summary)
  const expensesFallback = summarizeExpensesStructure(latest, previous)
  const divsFallback = summarizeDivisionsValue(divisions, currency)

  const losingDivisions = divisions.filter((d) => !d.profitable)
  const introParagraphs: string[] = [
    `Cinq questions clés guident la lecture de ${diagnostic.company_name} à la date de référence ${referenceLabel} — performance, revenus, marge par revenus, dépenses et divisions.`,
    `Repères consolidés : CA ${nfMoneyK(summary.latest_revenue, currency)}, marge EBITDA ${nfPct(summary.latest_ebitda_margin_pct)}, résultat net ${nfMoneyK(summary.latest_net_income, currency)}${summary.revenue_cagr_5y != null ? `, TCAC revenus ${nfPct(summary.revenue_cagr_5y)}` : ""}.`,
  ]

  const blocks: ExecutiveSummaryBlock[] = [
    {
      id: "performance",
      reportView: "performance",
      title: diagnosticReportViewLabel("performance"),
      subtitle: EXECUTIVE_SUMMARY_QUESTIONS.performance,
      paragraphs:
        compressed?.performance.length ? compressed.performance : perfFallback.paragraphs,
      metrics: perfFallback.metrics,
    },
    {
      id: "revenue",
      reportView: "revenue",
      title: diagnosticReportViewLabel("revenue"),
      subtitle: EXECUTIVE_SUMMARY_QUESTIONS.revenue,
      paragraphs: compressed?.revenue.length ? compressed.revenue : revFallback.paragraphs,
      metrics: revFallback.metrics,
    },
    {
      id: "margin-by-revenue",
      reportView: "margin-by-revenue",
      title: diagnosticReportViewLabel("margin-by-revenue"),
      subtitle: EXECUTIVE_SUMMARY_QUESTIONS["margin-by-revenue"],
      paragraphs: compressed?.marginByRevenue.length
        ? compressed.marginByRevenue
        : marginFallback.paragraphs,
      metrics: marginFallback.metrics,
    },
    {
      id: "expenses",
      reportView: "expenses",
      title: diagnosticReportViewLabel("expenses"),
      subtitle: EXECUTIVE_SUMMARY_QUESTIONS.expenses,
      paragraphs: compressed?.expenses.length ? compressed.expenses : expensesFallback.paragraphs,
    },
    {
      id: "expenses-by-division",
      reportView: "expenses-by-division",
      title: diagnosticReportViewLabel("expenses-by-division"),
      subtitle: EXECUTIVE_SUMMARY_QUESTIONS["expenses-by-division"],
      paragraphs: compressed?.divisions.length ? compressed.divisions : divsFallback.paragraphs,
      metrics: divsFallback.metrics,
      highlight: signalForSection(signals, "divisions"),
    },
  ]

  const conclusionParts: string[] = [
    `En synthèse, ${diagnostic.company_name} est en phase de ${lifecycleLabel(summary.lifecycle_stage)} avec une rentabilité d'exploitation ${vsSector(summary.latest_ebitda_margin_pct, benchmark.ebitda_margin_pct) === "above" ? "au-dessus" : vsSector(summary.latest_ebitda_margin_pct, benchmark.ebitda_margin_pct) === "below" ? "sous" : "proche"} du secteur.`,
  ]
  if (losingDivisions.length > 0) {
    conclusionParts.push(
      `Priorité opérationnelle : ${losingDivisions.map((d) => d.division_name).join(", ")}.`,
    )
  }
  if (signals.length > 0) {
    conclusionParts.push(
      `${signals.length} point${signals.length > 1 ? "s" : ""} d'attention relevé${signals.length > 1 ? "s" : ""} dans le détail du rapport.`,
    )
  }
  conclusionParts.push("Cliquez sur une carte pour ouvrir l'analyse correspondante.")

  return {
    referenceLabel,
    headline: "Sommaire exécutif",
    introParagraphs,
    conclusionParagraph: conclusionParts.join(" "),
    blocks,
    attentionPoints: signals,
  }
}
