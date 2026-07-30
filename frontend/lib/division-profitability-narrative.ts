import { formatCurrency } from "@/lib/financial-utils"
import type { DivisionProfitabilitySlice } from "@/lib/division-profitability"
import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"

const DATA_EPSILON = 1e-6
const SECTION = "division-profitability" as const

function fmtPctPlain(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")} %`
}

function referenceForPeriod(view: string, period: string): string {
  return view === "years" ? `l'exercice ${period}` : `le mois de ${period}`
}

function priorComparisonLabel(view: string): string {
  return view === "years" ? "En glissement annuel" : "Par rapport au mois précédent"
}

function describeOperatingOutcome(
  slice: DivisionProfitabilitySlice,
  latest: DivisionProfitabilitySlice["points"][number],
  view: string,
): string {
  const { operatingProfit, contributiveMargin, revenue, fixedCosts, variableCosts } = latest
  const operatingMarginPct =
    Math.abs(revenue) > DATA_EPSILON ? (operatingProfit / revenue) * 100 : null
  const contributiveMarginPct =
    Math.abs(revenue) > DATA_EPSILON ? (contributiveMargin / revenue) * 100 : null
  const fixedShareOfMargin =
    Math.abs(contributiveMargin) > DATA_EPSILON ? (fixedCosts / contributiveMargin) * 100 : null

  if (operatingProfit > DATA_EPSILON) {
    return `Pour ${referenceForPeriod(view, latest.period)}, ${slice.metricLabel} est rentable : le bénéfice d'exploitation atteint ${formatCurrency(operatingProfit)}${operatingMarginPct !== null ? ` (${fmtPctPlain(operatingMarginPct)} du chiffre d'affaires de la division)` : ""}. Après ${formatCurrency(variableCosts)} de coûts variables, la contribution marginale de ${formatCurrency(contributiveMargin)}${contributiveMarginPct !== null ? ` (${fmtPctPlain(contributiveMarginPct)} du CA)` : ""} absorbe ${formatCurrency(fixedCosts)} de coûts fixes et laisse un résultat d'exploitation positif.`
  }

  if (contributiveMargin > DATA_EPSILON && operatingProfit <= DATA_EPSILON) {
    return `Pour ${referenceForPeriod(view, latest.period)}, ${slice.metricLabel} n'est pas rentable au niveau du bénéfice d'exploitation (${formatCurrency(operatingProfit)}). La division génère une contribution marginale de ${formatCurrency(contributiveMargin)}${contributiveMarginPct !== null ? ` (${fmtPctPlain(contributiveMarginPct)} du CA)` : ""}, mais les coûts fixes de ${formatCurrency(fixedCosts)}${fixedShareOfMargin !== null ? ` (${fmtPctPlain(fixedShareOfMargin)} de la marge contributive)` : ""} excèdent cette capacité d'absorption : le problème est structurel (charges fixes), pas uniquement variable.`
  }

  return `Pour ${referenceForPeriod(view, latest.period)}, ${slice.metricLabel} est déficitaire dès le niveau variable : les coûts variables de ${formatCurrency(variableCosts)} dépassent les revenus de ${formatCurrency(revenue)}, pour une contribution marginale de ${formatCurrency(contributiveMargin)}. Avant même les coûts fixes (${formatCurrency(fixedCosts)}), l'économie unitaire de la division ne tient pas — priorité à la marge sur les ventes, au mix ou au volume.`
}

function describeTrend(slice: DivisionProfitabilitySlice, view: string): string | null {
  const latest = slice.points[0]
  const prior = slice.points[1]
  if (!latest || !prior || Math.abs(prior.revenue) < DATA_EPSILON) return null

  const revChange = ((latest.revenue - prior.revenue) / Math.abs(prior.revenue)) * 100
  const operatingBase =
    Math.abs(prior.operatingProfit) > DATA_EPSILON ? prior.operatingProfit : null
  const operatingChange =
    operatingBase !== null
      ? ((latest.operatingProfit - prior.operatingProfit) / Math.abs(operatingBase)) * 100
      : null

  if (latest.operatingProfit > DATA_EPSILON && prior.operatingProfit <= DATA_EPSILON) {
    return `${priorComparisonLabel(view)}, la division bascule en territoire rentable (bénéfice d'exploitation ${formatCurrency(prior.operatingProfit)} → ${formatCurrency(latest.operatingProfit)}).`
  }
  if (latest.operatingProfit <= DATA_EPSILON && prior.operatingProfit > DATA_EPSILON) {
    return `${priorComparisonLabel(view)}, la division bascule en déficit d'exploitation (bénéfice d'exploitation ${formatCurrency(prior.operatingProfit)} → ${formatCurrency(latest.operatingProfit)}) : à investiguer sur l'évolution des coûts variables et fixes affectés à cette division.`
  }

  if (Math.abs(revChange) > 0.5 || (operatingChange !== null && Math.abs(operatingChange) > 0.5)) {
    const operatingPart =
      operatingChange !== null
        ? `le bénéfice d'exploitation de ${operatingChange >= 0 ? "+" : ""}${operatingChange.toFixed(1).replace(".", ",")} %`
        : `le bénéfice d'exploitation passe de ${formatCurrency(prior.operatingProfit)} à ${formatCurrency(latest.operatingProfit)}`
    return `${priorComparisonLabel(view)}, le chiffre d'affaires évolue de ${revChange >= 0 ? "+" : ""}${revChange.toFixed(1).replace(".", ",")} % et ${operatingPart} — surveiller si la rentabilité suit le volume ou si la structure de coûts se dégrade.`
  }

  return null
}

function buildDivisionParagraph(
  slice: DivisionProfitabilitySlice,
  view: string,
): PerformanceNarrativeParagraph {
  const heading = `Rentabilité — ${slice.heading}`
  const latest = slice.points[0]

  if (!latest || Math.abs(latest.revenue) < DATA_EPSILON) {
    return {
      heading,
      section: SECTION,
      body: `Aucun revenu n'est affecté à ${slice.metricLabel} sur l'horizon analysé. Vérifiez l'affectation des comptes de revenus (codes REV) à cette division dans le mapping comptable.`,
    }
  }

  const { variableCostAccountCount, fixedCostAccountCount } = slice.mappingStatus
  if (variableCostAccountCount === 0 && fixedCostAccountCount === 0) {
    return {
      heading,
      section: SECTION,
      body: `Les revenus de ${slice.metricLabel} s'élèvent à ${formatCurrency(latest.revenue)}, mais aucun compte de coût variable ou fixe n'est affecté à cette division dans le mapping comptable. Paramétrez les types « Variable » et « Fixe » sur les charges de la division pour mesurer la rentabilité jusqu'au bénéfice d'exploitation.`,
    }
  }

  if (variableCostAccountCount === 0) {
    return {
      heading,
      section: SECTION,
      body: `Les revenus atteignent ${formatCurrency(latest.revenue)} pour ${referenceForPeriod(view, latest.period)}, avec ${fixedCostAccountCount} compte${fixedCostAccountCount > 1 ? "s" : ""} de coûts fixes affecté${fixedCostAccountCount > 1 ? "s" : ""}, mais aucun coût variable n'est paramétré : la marge contributive ne peut être calculée. Complétez le mapping pour isoler l'effet des charges directes.`,
    }
  }

  if (fixedCostAccountCount === 0) {
    const sentences = [
      describeOperatingOutcome(slice, latest, view),
      `Aucun coût fixe n'est affecté à cette division : le bénéfice d'exploitation ne peut être isolé. Affectez les charges de structure (salaires admin, loyers, etc.) à la division pour conclure sur la rentabilité complète.`,
    ]
    return { heading, section: SECTION, body: sentences.join(" ") }
  }

  const sentences = [describeOperatingOutcome(slice, latest, view)]
  const trend = describeTrend(slice, view)
  if (trend) sentences.push(trend)

  const operatingMarginPct =
    Math.abs(latest.revenue) > DATA_EPSILON ? (latest.operatingProfit / latest.revenue) * 100 : null

  return {
    heading,
    section: SECTION,
    body: sentences.join(" "),
    statsLine: [
      `CA ${formatCurrency(latest.revenue)}`,
      `CV ${formatCurrency(latest.variableCosts)}`,
      `Marge contrib. ${formatCurrency(latest.contributiveMargin)}`,
      `CF ${formatCurrency(latest.fixedCosts)}`,
      `Bén. expl. ${formatCurrency(latest.operatingProfit)}`,
      operatingMarginPct !== null ? `${fmtPctPlain(operatingMarginPct)} du CA` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

function buildComparativeSummary(slices: DivisionProfitabilitySlice[]): PerformanceNarrativeParagraph | null {
  const ranked = slices
    .map((slice) => ({
      heading: slice.heading,
      operatingProfit: slice.points[0]?.operatingProfit ?? null,
      revenue: slice.points[0]?.revenue ?? 0,
      operatingMarginPct:
        slice.points[0] && Math.abs(slice.points[0].revenue) > DATA_EPSILON
          ? (slice.points[0].operatingProfit / slice.points[0].revenue) * 100
          : null,
    }))
    .filter((row) => row.operatingProfit !== null && Math.abs(row.revenue) > DATA_EPSILON)
    .sort((a, b) => (b.operatingProfit ?? 0) - (a.operatingProfit ?? 0))

  if (ranked.length < 2) return null

  const profitable = ranked.filter((row) => (row.operatingProfit ?? 0) > DATA_EPSILON)
  const unprofitable = ranked.filter((row) => (row.operatingProfit ?? 0) <= DATA_EPSILON)

  const parts = [
    `Classement par bénéfice d'exploitation à la date de référence : ${ranked.map((row) => `${row.heading} (${formatCurrency(row.operatingProfit!)})`).join(", ")}.`,
  ]

  if (profitable.length && unprofitable.length) {
    parts.push(
      `${profitable.length} division${profitable.length > 1 ? "s" : ""} rentable${profitable.length > 1 ? "s" : ""} et ${unprofitable.length} en déficit : les divisions déficitaires méritent une revue distincte des coûts variables (marge contributive) et des coûts fixes (structure).`,
    )
  }

  const spread =
    (ranked[0]!.operatingMarginPct ?? 0) - (ranked[ranked.length - 1]!.operatingMarginPct ?? 0)
  if (Math.abs(spread) > 0.5) {
    parts.push(
      `L'écart de marge d'exploitation entre la division la plus performante (${ranked[0]!.heading}, ${fmtPctPlain(ranked[0]!.operatingMarginPct ?? 0)}) et la moins performante (${ranked[ranked.length - 1]!.heading}, ${fmtPctPlain(ranked[ranked.length - 1]!.operatingMarginPct ?? 0)}) atteint ${fmtPctPlain(Math.abs(spread))} — un signal de dispersion opérationnelle à creuser.`,
    )
  }

  return {
    heading: "Synthèse comparative des divisions",
    section: SECTION,
    body: parts.join(" "),
  }
}

export function buildDivisionProfitabilityNarrative(
  slices: DivisionProfitabilitySlice[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!slices.length) return null
  if (view !== "years" && view !== "24months") return null

  const paragraphs = slices
    .map((slice) => buildDivisionParagraph(slice, view))
    .filter((paragraph) => paragraph.body.trim().length > 0)

  const summary = buildComparativeSummary(slices)
  if (summary) paragraphs.push(summary)

  if (!paragraphs.length) return null

  const referencePeriod =
    slices.flatMap((slice) => slice.points).find((point) => Math.abs(point.revenue) > DATA_EPSILON)
      ?.period ??
    slices[0]?.points[0]?.period ??
    ""

  return {
    mode: view === "years" ? "annual" : "monthly",
    title: "Lecture de la rentabilité par division",
    subtitle:
      view === "years"
        ? "Analyse pluriannuelle — pont REV → CV → marge contributive → CF → bénéfice d'exploitation par division"
        : "Analyse mensuelle — pont REV → CV → marge contributive → CF → bénéfice d'exploitation par division",
    referencePeriod,
    paragraphs,
  }
}
