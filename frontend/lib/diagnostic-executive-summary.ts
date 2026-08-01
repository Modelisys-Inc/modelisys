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
  computeHealthIndex,
  type DiagnosticSignal,
} from "@/lib/diagnostic-derive"
import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import type { SignalTone } from "@/lib/diagnostic-theme"

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

function sectorPhrase(
  value: number | null,
  sector: number,
  label: string,
  higherIsBetter = true,
): string {
  const pos = vsSector(value, sector, higherIsBetter)
  const fmt = higherIsBetter ? 2 : 2
  const v = nf(value ?? 0, fmt)
  const s = nf(sector, fmt)
  if (pos === "above") {
    return higherIsBetter
      ? `${label} supérieur(e) au secteur (${v} vs ${s})`
      : `${label} plus conservateur que le secteur (${v} vs ${s})`
  }
  if (pos === "below") {
    return higherIsBetter
      ? `${label} inférieur(e) au secteur (${v} vs ${s})`
      : `${label} plus élevé(e) que le secteur (${v} vs ${s})`
  }
  if (pos === "inline") return `${label} aligné(e) sur le secteur (${v})`
  return `${label} non disponible`
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

function topBy<T>(items: T[], pick: (t: T) => number, desc = true): T | null {
  if (items.length === 0) return null
  return [...items].sort((a, b) => (desc ? pick(b) - pick(a) : pick(a) - pick(b)))[0] ?? null
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

function summarizePerformance(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  years: DiagnosticTrendYear[],
  summary: CompanyDiagnostic["summary"],
  currency: string,
  benchmark: SectorBenchmark,
): { paragraphs: string[]; subtitle: string; metrics: SummaryMetricChip[] } {
  if (!latest) {
    return {
      subtitle: "Données insuffisantes",
      paragraphs: ["Historique de résultats trop court pour établir une tendance fiable."],
      metrics: [],
    }
  }

  const revYoY = previous ? yoyDelta(latest.revenue, previous.revenue) : null
  const ebitdaMarginPts = previous ? ptsDelta(latest.ebitda_margin_pct, previous.ebitda_margin_pct) : null
  const marginTrend = trendDirection(years.map((y) => y.ebitda_margin_pct ?? 0))

  const p1Parts: string[] = [
    `Le chiffre d'affaires atteint ${nfMoneyK(latest.revenue, currency)}`,
  ]
  if (revYoY != null) {
    p1Parts.push(`en ${revYoY >= 0 ? "hausse" : "baisse"} de ${nf(Math.abs(revYoY), 1)} % par rapport à N-1`)
  }
  p1Parts.push(
    `; l'EBITDA s'établit à ${nfMoneyK(latest.ebitda, currency)} (${nfPct(latest.ebitda_margin_pct)} de marge).`,
  )

  const p2Parts: string[] = []
  if (ebitdaMarginPts != null && Math.abs(ebitdaMarginPts) >= 0.5) {
    p2Parts.push(
      `La marge EBITDA a ${ebitdaMarginPts >= 0 ? "gagné" : "perdu"} ${nf(Math.abs(ebitdaMarginPts), 1)} point${Math.abs(ebitdaMarginPts) >= 1.05 ? "s" : ""} sur un an`,
    )
  }
  if (marginTrend === "hausse") p2Parts.push("avec une tendance d'amélioration sur l'horizon analysé")
  else if (marginTrend === "baisse") p2Parts.push("avec une compression de marge sur l'horizon analysé")
  if (summary.revenue_cagr_5y != null && years.length >= 3) {
    p2Parts.push(`; le TCAC revenus de ${nfPct(summary.revenue_cagr_5y)} ${summary.revenue_cagr_5y >= benchmark.revenue_cagr_pct ? "dépasse" : "reste sous"} la médiane sectorielle`)
  }
  const p2 = p2Parts.length > 0 ? `${p2Parts.join(" ")}.` : sectorPhrase(latest.ebitda_margin_pct, benchmark.ebitda_margin_pct, "La marge EBITDA", true) + "."

  const netVsSector = vsSector(latest.net_margin_pct, benchmark.net_margin_pct, true)
  const ebitdaToNetGap =
    latest.ebitda_margin_pct != null && latest.net_margin_pct != null
      ? latest.ebitda_margin_pct - latest.net_margin_pct
      : null
  const p3 =
    latest.net_income >= 0
      ? `Le bénéfice net de ${nfMoneyK(latest.net_income, currency)} (${nfPct(latest.net_margin_pct)}) ${netVsSector === "above" ? "dégage une rentabilité nette supérieure au secteur" : netVsSector === "below" ? "reste en deçà de la rentabilité nette médiane" : "se situe dans la fourchette sectorielle"}${ebitdaToNetGap != null && ebitdaToNetGap > 3 ? ` ; ${nf(ebitdaToNetGap, 1)} points de marge se perdent entre l'EBITDA et le net (charges financières et fiscales)` : ""}.`
      : `Résultat net déficitaire (${nfMoneyK(latest.net_income, currency)}) malgré un EBITDA positif de ${nfMoneyK(latest.ebitda, currency)} — la structure de charges FIN/IMP absorbe la rentabilité d'exploitation.`

  return {
    subtitle:
      revYoY != null && revYoY > 0 && (ebitdaMarginPts ?? 0) >= 0
        ? "Croissance des revenus avec marge tenue"
        : (ebitdaMarginPts ?? 0) < 0
          ? "Pression sur la marge d'exploitation"
          : "Lecture de la trajectoire P&L",
    paragraphs: [p1Parts.join(" "), p2, p3],
    metrics: [
      { label: "CA", value: nfMoneyK(latest.revenue, currency), tone: "neutral" },
      {
        label: "Marge EBITDA",
        value: nfPct(latest.ebitda_margin_pct),
        tone: vsSector(latest.ebitda_margin_pct, benchmark.ebitda_margin_pct) === "above" ? "positive" : vsSector(latest.ebitda_margin_pct, benchmark.ebitda_margin_pct) === "below" ? "watch" : "neutral",
      },
      {
        label: "Résultat net",
        value: nfMoneyK(latest.net_income, currency),
        tone: latest.net_income >= 0 ? "positive" : "negative",
      },
    ],
  }
}

function summarizeRevenue(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  summary: CompanyDiagnostic["summary"],
  currency: string,
  benchmark: SectorBenchmark,
  seasonality: CompanyDiagnostic["seasonality"],
): { paragraphs: string[]; subtitle: string; metrics: SummaryMetricChip[] } {
  const revYoY = latest && previous ? yoyDelta(latest.revenue, previous.revenue) : null
  const sortedSeason = [...seasonality].sort(
    (a, b) => (b.revenue_share_pct ?? 0) - (a.revenue_share_pct ?? 0),
  )
  const peak = sortedSeason[0]

  const p1 = [
    `Chiffre d'affaires de ${nfMoneyK(summary.latest_revenue, currency)} à la date de référence`,
    summary.revenue_cagr_5y != null ? `, soit un TCAC de ${nfPct(summary.revenue_cagr_5y)} sur l'horizon disponible` : "",
    revYoY != null ? ` et ${revYoY >= 0 ? "+" : ""}${nf(revYoY, 1)} % vs l'exercice précédent` : "",
    ".",
  ].join("")

  const cagrVs = summary.revenue_cagr_5y != null
    ? summary.revenue_cagr_5y >= benchmark.revenue_cagr_pct
      ? `La croissance est plus rapide que la médiane sectorielle (${nfPct(benchmark.revenue_cagr_pct)}), signe d'un gain de parts ou d'un marché porteur.`
      : `La croissance reste en deçà de la médiane sectorielle (${nfPct(benchmark.revenue_cagr_pct)}) — dynamique à surveiller si l'écart persiste.`
    : revYoY != null
      ? `Sur un an, le CA progresse de ${nf(Math.abs(revYoY), 1)} %${revYoY >= 0 ? "" : " (contraction)"} ; l'horizon pluriannuel reste court pour confirmer une tendance structurelle.`
      : "La dynamique de revenus reste à établir sur un horizon plus long."

  const p2 = peak && (peak.revenue_share_pct ?? 0) > 10
    ? `${cagrVs} Par ailleurs, ${peak.month_label} concentre environ ${nfPct(peak.revenue_share_pct)} du CA annuel moyen — une lecture mensuelle peut masquer ou amplifier la tendance selon le mois de référence.`
    : cagrVs

  return {
    subtitle: revYoY != null && revYoY > benchmark.revenue_cagr_pct ? "Dynamique de croissance favorable" : "Croissance à contextualiser",
    paragraphs: [p1, p2],
    metrics: [
      { label: "CA", value: nfMoneyK(summary.latest_revenue, currency), tone: "neutral" },
      { label: "TCAC", value: nfPct(summary.revenue_cagr_5y), tone: (summary.revenue_cagr_5y ?? 0) >= benchmark.revenue_cagr_pct ? "positive" : "watch" },
    ],
  }
}

function summarizeMarginByRevenue(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  summary: CompanyDiagnostic["summary"],
  products: DiagnosticProductPerformance[],
  benchmark: SectorBenchmark,
): { paragraphs: string[]; subtitle: string; metrics: SummaryMetricChip[] } {
  const grossPts = latest && previous ? ptsDelta(latest.gross_margin_pct, previous.gross_margin_pct) : null
  const topProduct = topBy(products, (p) => p.revenue)
  const weakProduct = topBy(products, (p) => p.gross_margin_pct ?? 999, false)

  const grossVs = vsSector(summary.latest_gross_margin_pct, benchmark.gross_margin_pct, true)
  const p1 = `Marge brute de ${nfPct(summary.latest_gross_margin_pct)}${grossVs === "above" ? ", au-dessus du secteur" : grossVs === "below" ? ", sous le secteur" : ", dans la norme sectorielle"}${grossPts != null && Math.abs(grossPts) >= 0.5 ? `, ${grossPts >= 0 ? "en hausse" : "en baisse"} de ${nf(Math.abs(grossPts), 1)} pt vs N-1` : ""}.`

  const ebitdaVsGross =
    summary.latest_gross_margin_pct != null && summary.latest_ebitda_margin_pct != null
      ? summary.latest_gross_margin_pct - summary.latest_ebitda_margin_pct
      : null
  let p2 =
    ebitdaVsGross != null
      ? `Après coût des ventes, ${nf(ebitdaVsGross, 1)} points sont absorbés avant l'EBITDA — l'écart marge brute / marge EBITDA reflète la pression des charges d'exploitation sur la marge contributive.`
      : "La marge contributive se situe dans la continuité de l'exercice précédent."
  if (topProduct && products.length >= 2) {
    p2 = `${topProduct.product_name} domine le mix (${nfPct(topProduct.revenue_share_pct)} du CA, marge brute ${nfPct(topProduct.gross_margin_pct)})${weakProduct && weakProduct.product_name !== topProduct.product_name ? ` ; à l'inverse, ${weakProduct.product_name} affiche une marge brute de ${nfPct(weakProduct.gross_margin_pct)}` : ""}. Prioriser la lecture des lignes à forte contribution mais faible marge.`
  }

  return {
    subtitle:
      vsSector(summary.latest_gross_margin_pct, benchmark.gross_margin_pct) === "above"
        ? "Marge brute solide vs secteur"
        : "Marge brute sous pression",
    paragraphs: [p1, p2],
    metrics: [
      { label: "Marge brute", value: nfPct(summary.latest_gross_margin_pct), tone: "neutral" },
      { label: "Marge EBITDA", value: nfPct(summary.latest_ebitda_margin_pct), tone: "neutral" },
    ],
  }
}

function summarizeExpenses(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  summary: CompanyDiagnostic["summary"],
): { paragraphs: string[]; subtitle: string } {
  if (!latest) {
    return { subtitle: "Charges non analysables", paragraphs: ["Données insuffisantes."] }
  }

  const gross = latest.gross_margin_pct ?? 0
  const ebitda = latest.ebitda_margin_pct ?? 0
  const opexDrag = gross - ebitda
  const prevOpex =
    previous && previous.gross_margin_pct != null && previous.ebitda_margin_pct != null
      ? previous.gross_margin_pct - previous.ebitda_margin_pct
      : null
  const opexPts = prevOpex != null ? opexDrag - prevOpex : null

  const p1 = `Entre la marge brute (${nfPct(gross)}) et l'EBITDA (${nfPct(ebitda)}), environ ${nf(opexDrag, 1)} points sont absorbés par les charges d'exploitation (structure fixe + charges hors coût des ventes).`

  const p2 =
    opexPts != null && Math.abs(opexPts) >= 0.3
      ? `Cet écart a ${opexPts > 0 ? "élargi" : "rétréci"} de ${nf(Math.abs(opexPts), 1)} pt vs N-1 — ${opexPts > 0 ? "signal de dérive des coûts fixes ou de sous-utilisation de capacité" : "discipline de coûts ou effet de levier opérationnel favorable"}.`
      : `La structure de charges d'exploitation est stable d'un exercice à l'autre (écart brut → EBITDA quasi inchangé).`

  const netGap =
    latest.ebitda_margin_pct != null && latest.net_margin_pct != null
      ? latest.ebitda_margin_pct - latest.net_margin_pct
      : null
  const p3 =
    netGap != null && netGap > 5
      ? `Après EBITDA, ${nf(netGap, 1)} points supplémentaires sont absorbés par les charges financières et fiscales — poids notable sur le résultat net.`
      : netGap != null
        ? `L'écart EBITDA → résultat net (${nf(netGap, 1)} pt) reste modéré ; la charge financière et fiscale n'érode pas significativement la rentabilité d'exploitation.`
        : `Charges hors coût des ventes stables ; pas de dérive majeure détectée sur l'horizon disponible.`

  return {
    subtitle: opexPts != null && opexPts > 0.5 ? "Dérive des charges d'exploitation" : "Structure de coûts à valider",
    paragraphs: [p1, p2, p3],
  }
}

function summarizeDivisions(
  divisions: DiagnosticDivisionPerformance[],
  currency: string,
): { paragraphs: string[]; subtitle: string; metrics?: SummaryMetricChip[]; highlight?: { tone: SignalTone; text: string } } {
  if (divisions.length === 0) {
    return {
      subtitle: "Pas de ventilation divisionnelle",
      paragraphs: ["Aucune division configurée — la rentabilité n'est analysée qu'au niveau consolidé."],
    }
  }

  const profitable = divisions.filter((d) => d.profitable)
  const losing = divisions.filter((d) => !d.profitable)
  const topRev = topBy(divisions, (d) => d.revenue)
  const topMargin = topBy(divisions, (d) => d.ebitda_margin_pct ?? -999)
  const worst = topBy(divisions, (d) => d.ebitda, false)

  const p1 = `${profitable.length}/${divisions.length} division${divisions.length > 1 ? "s" : ""} dégag${profitable.length > 1 ? "ent" : "e"} un résultat positif. ${topRev ? `${topRev.division_name} concentre ${nfPct(topRev.revenue_share_pct)} du CA` : ""}${topMargin ? ` ; meilleure marge EBITDA : ${topMargin.division_name} (${nfPct(topMargin.ebitda_margin_pct)})` : ""}.`

  const p2 =
    losing.length > 0 && worst
      ? `Point d'attention : ${worst.division_name} affiche un EBITDA de ${nfMoneyK(worst.ebitda, currency)} (${nfPct(worst.ebitda_margin_pct)} de marge) alors qu'elle représente ${nfPct(worst.revenue_share_pct)} du CA — drag sur la rentabilité consolidée.`
      : losing.length > 0
        ? `${losing.length} division${losing.length > 1 ? "s" : ""} en perte ; le reste du portefeuille compense, mais le mix divisionnel mérite un suivi rapproché.`
        : `Toutes les divisions sont rentables ; les écarts de marge restent modérés entre unités.`

  return {
    subtitle: losing.length > 0 ? `${losing.length} division(s) déficitaire(s)` : "Rentabilité divisionnelle équilibrée",
    paragraphs: [p1, p2],
    metrics: [
      {
        label: "Rentables",
        value: `${profitable.length}/${divisions.length}`,
        tone: losing.length === 0 ? "positive" : "watch",
      },
    ],
  }
}

function summarizeFinancialPosition(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  currency: string,
  benchmark: SectorBenchmark,
): { paragraphs: string[]; subtitle: string; metrics: SummaryMetricChip[] } {
  if (!latest) {
    return { subtitle: "Bilan non disponible", paragraphs: ["Données bilancielles manquantes."], metrics: [] }
  }

  const equityYoY = previous ? yoyDelta(latest.equity, previous.equity) : null
  const assetsYoY = previous ? yoyDelta(latest.total_assets, previous.total_assets) : null
  const revYoY = previous ? yoyDelta(latest.revenue, previous.revenue) : null

  const p1 = `Actif total de ${nfMoneyK(latest.total_assets, currency)}, capitaux propres de ${nfMoneyK(latest.equity, currency)}${equityYoY != null ? ` (${equityYoY >= 0 ? "+" : ""}${nf(equityYoY, 1)} % vs N-1)` : ""}. ${sectorPhrase(latest.debt_to_equity, benchmark.debt_to_equity, "Le levier (dette / CP)", false)}.`

  let p2 = `${sectorPhrase(latest.current_ratio, benchmark.current_ratio, "La liquidité courante", true)} ; quick ratio de ${latest.quick_ratio != null ? nf(latest.quick_ratio, 2) : "—"}.`
  if (assetsYoY != null && revYoY != null && assetsYoY > revYoY + 5) {
    p2 += ` L'actif croît plus vite que le CA (+${nf(assetsYoY, 1)} % vs +${nf(revYoY, 1)} %) — surveiller l'efficacité d'utilisation des actifs (rotation).`
  } else if (assetsYoY != null && revYoY != null && revYoY > assetsYoY + 5) {
    p2 += ` Le CA progresse plus vite que l'actif : effet de levier positif sur la rotation.`
  }

  return {
    subtitle:
      vsSector(latest.current_ratio, benchmark.current_ratio) === "below"
        ? "Liquidité sous le secteur"
        : vsSector(latest.debt_to_equity, benchmark.debt_to_equity, false) === "below"
          ? "Structure financière conservative"
          : "Bilan à l'équilibre",
    paragraphs: [p1, p2],
    metrics: [
      { label: "Liquidité", value: latest.current_ratio != null ? nf(latest.current_ratio, 2) : "—", tone: vsSector(latest.current_ratio, benchmark.current_ratio) === "below" ? "watch" : "neutral" },
      { label: "D / CP", value: latest.debt_to_equity != null ? nf(latest.debt_to_equity, 2) : "—", tone: "neutral" },
    ],
  }
}

function summarizeWorkingCapital(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  currency: string,
  benchmark: SectorBenchmark,
): { paragraphs: string[]; subtitle: string } {
  if (!latest) {
    return { subtitle: "Fonds de roulement non calculable", paragraphs: ["Données insuffisantes."] }
  }

  const wc = latest.current_assets - latest.current_liabilities
  const prevWc = previous ? previous.current_assets - previous.current_liabilities : null
  const wcYoY = prevWc != null && prevWc !== 0 ? yoyDelta(wc, prevWc) : null
  const invShare = latest.current_assets > 0 ? (latest.inventory / latest.current_assets) * 100 : null

  const p1 = `Fonds de roulement net d'environ ${nfMoneyK(wc, currency)}${wcYoY != null ? ` (${wcYoY >= 0 ? "+" : ""}${nf(wcYoY, 1)} % vs N-1)` : ""}, stocks à ${nfMoneyK(latest.inventory, currency)}${invShare != null ? ` (${nf(invShare, 0)} % des actifs courants)` : ""}.`

  const liq = vsSector(latest.current_ratio, benchmark.current_ratio, true)
  const quick = latest.quick_ratio
  const p2 =
    liq === "below"
      ? `Liquidité courante de ${nf(latest.current_ratio ?? 0, 2)} sous la médiane sectorielle${quick != null ? ` (quick ratio ${nf(quick, 2)})` : ""}${invShare != null && invShare > 25 ? ` ; les stocks pèsent ${nf(invShare, 0)} % des actifs courants — poste probable d'immobilisation de trésorerie` : " — tension sur le financement du cycle d'exploitation"}.`
      : `Liquidité courante confortable (${nf(latest.current_ratio ?? 0, 2)}${quick != null ? `, quick ${nf(quick, 2)}` : ""})${invShare != null && invShare > 30 ? ` ; toutefois les stocks représentent ${nf(invShare, 0)} % des actifs courants` : " ; le BFR ne paraît pas contraignant à ce stade"}.`

  return {
    subtitle: liq === "below" ? "BFR tendu — cycle à examiner" : "Liquidité opérationnelle correcte",
    paragraphs: [p1, p2],
  }
}

function summarizeSeasonality(seasonality: CompanyDiagnostic["seasonality"]): {
  paragraphs: string[]
  subtitle: string
} {
  if (seasonality.length === 0) {
    return {
      subtitle: "Saisonnalité non mesurable",
      paragraphs: ["Historique mensuel insuffisant pour dégager un profil saisonnier."],
    }
  }

  const sorted = [...seasonality].sort((a, b) => (b.revenue_share_pct ?? 0) - (a.revenue_share_pct ?? 0))
  const top3 = sorted.slice(0, 3)
  const top3Share = top3.reduce((s, m) => s + (m.revenue_share_pct ?? 0), 0)
  const low = sorted[sorted.length - 1]

  const p1 = `Les mois ${top3.map((m) => m.month_label).join(", ")} représentent environ ${nf(top3Share, 0)} % du chiffre d'affaires annuel moyen ; pic en ${top3[0]!.month_label} (${nfPct(top3[0]!.revenue_share_pct)}).`

  const p2 =
    top3Share > 35
      ? `Forte concentration saisonnière : anticiper un besoin de trésorerie entre ${low?.month_label ?? "le creux"} et la haute saison.`
      : `Profil relativement lissé ; le creux en ${low?.month_label ?? "—"} (${nfPct(low?.revenue_share_pct)}) reste marginal.`

  return {
    subtitle: top3Share > 35 ? "Saisonnalité marquée" : "Activité relativement stable",
    paragraphs: [p1, p2],
  }
}

function summarizeProfil(
  diagnostic: CompanyDiagnostic,
  benchmark: SectorBenchmark,
): { paragraphs: string[]; subtitle: string } {
  const health = computeHealthIndex(diagnostic, benchmark)
  if (health.pillars.length === 0) {
    return { subtitle: "Profil non calculable", paragraphs: ["Données insuffisantes pour le positionnement sectoriel."] }
  }

  const ranked = [...health.pillars].sort((a, b) => b.score - a.score)
  const best = ranked[0]!
  const weak = ranked[ranked.length - 1]!
  const aboveSector = ranked.filter((p) => p.score >= p.benchmark + 5)
  const belowSector = ranked.filter((p) => p.score < p.benchmark - 5)

  const p1 = `Score global ${health.score}/100 (${benchmark.label}). Forces relatives : ${best.label} (${Math.round(best.score)}/100)${ranked[1] ? ` et ${ranked[1].label}` : ""}.`

  const p2 =
    belowSector.length > 0
      ? `Écarts marqués vs médiane sectorielle sur ${belowSector.map((p) => `${p.label.toLowerCase()} (${Math.round(p.score)}/100 vs ${Math.round(p.benchmark)})`).join(", ")}.`
      : `Profil équilibré sur les cinq piliers ; aucun écart majeur vs la médiane sectorielle.`

  const p3 =
    weak.score < 45
      ? `Le pilier le plus fragile reste ${weak.label} (${Math.round(weak.score)}/100) — principal levier d'amélioration du positionnement global.`
      : aboveSector.length >= 3
        ? `Positionnement globalement favorable ; les forces en ${aboveSector.map((p) => p.label.toLowerCase()).join(" et ")} devraient se traduire en résilience opérationnelle.`
        : ""

  return {
    subtitle: health.score >= 60 ? "Profil supérieur au secteur" : health.score >= 40 ? "Profil mitigé" : "Profil sous pression",
    paragraphs: [p1, p2, p3].filter(Boolean),
  }
}

function summarizeRatios(
  latest: DiagnosticTrendYear | undefined,
  previous: DiagnosticTrendYear | undefined,
  benchmark: SectorBenchmark,
): { paragraphs: string[]; subtitle: string } {
  if (!latest) {
    return { subtitle: "Ratios non disponibles", paragraphs: ["Exercice de référence sans ratios calculables."] }
  }

  const flags: string[] = []
  if (vsSector(latest.current_ratio, benchmark.current_ratio) === "below") flags.push("liquidité courante")
  if (vsSector(latest.quick_ratio, benchmark.quick_ratio) === "below") flags.push("liquidité relative")
  if (vsSector(latest.debt_to_equity, benchmark.debt_to_equity, false) === "below") flags.push("levier élevé")
  if (vsSector(latest.interest_coverage, benchmark.interest_coverage) === "below") flags.push("couverture des intérêts")
  if (vsSector(latest.ebitda_margin_pct, benchmark.ebitda_margin_pct) === "below") flags.push("marge EBITDA")

  const liqPts = previous ? ptsDelta(latest.current_ratio, previous.current_ratio) : null
  const p1 =
    flags.length > 0
      ? `À la date de référence, ${flags.join(", ")} ${flags.length > 1 ? "restent" : "reste"} sous le repère sectoriel.`
      : `Les principaux ratios (liquidité ${nf(latest.current_ratio ?? 0, 2)}, D/CP ${nf(latest.debt_to_equity ?? 0, 2)}, couverture ${latest.interest_coverage != null ? nf(latest.interest_coverage, 1) + "×" : "—"}) se situent dans la zone sectorielle.`

  const debtPts = previous ? ptsDelta(latest.debt_to_equity, previous.debt_to_equity) : null
  const covPts = previous ? ptsDelta(latest.interest_coverage, previous.interest_coverage) : null
  const trendParts: string[] = []
  if (liqPts != null && Math.abs(liqPts) >= 0.1) {
    trendParts.push(
      `liquidité courante ${liqPts > 0 ? "en hausse" : "en baisse"} de ${nf(Math.abs(liqPts), 2)} pt vs N-1`,
    )
  }
  if (debtPts != null && Math.abs(debtPts) >= 0.05) {
    trendParts.push(`levier D/CP ${debtPts > 0 ? "en hausse" : "en baisse"} (${nf(latest.debt_to_equity ?? 0, 2)})`)
  }
  if (covPts != null && Math.abs(covPts) >= 0.2) {
    trendParts.push(
      `couverture des intérêts ${covPts > 0 ? "améliorée" : "dégradée"} (${latest.interest_coverage != null ? nf(latest.interest_coverage, 1) + "×" : "—"})`,
    )
  }
  const p2 =
    trendParts.length > 0
      ? `Sur un an : ${trendParts.join(" ; ")}.`
      : `Ratios stables d'un exercice à l'autre ; pas de dérive structurelle détectée sur l'horizon disponible.`

  return {
    subtitle: flags.length > 0 ? `${flags.length} ratio(x) sous le secteur` : "Ratios dans la norme sectorielle",
    paragraphs: [p1, p2],
  }
}

function summarizeProducts(products: DiagnosticProductPerformance[]): {
  paragraphs: string[]
  subtitle: string
} {
  if (products.length === 0) {
    return {
      subtitle: "Mix produits non renseigné",
      paragraphs: ["Aucune ligne produit/service taguée — le mix de marge reste invisible à ce niveau."],
    }
  }

  const sorted = [...products].sort((a, b) => b.revenue - a.revenue)
  const top = sorted[0]!
  const second = sorted[1]
  const weakEbitda = topBy(products, (p) => p.ebitda_margin_pct ?? 999, false)

  const p1 = `${top.product_name} représente ${nfPct(top.revenue_share_pct)} du CA (marge brute ${nfPct(top.gross_margin_pct)}, EBITDA ${nfPct(top.ebitda_margin_pct)})${second ? `, devant ${second.product_name} (${nfPct(second.revenue_share_pct)})` : ""}.`

  const concentrated = (top.revenue_share_pct ?? 0) > 35
  const p2 = concentrated
    ? `Concentration élevée sur une ligne d'offre : un choc sur ${top.product_name} impacterait disproportionnellement le résultat.`
    : `Mix relativement diversifié ; ${weakEbitda && weakEbitda.product_name !== top.product_name ? `surveiller ${weakEbitda.product_name} (marge EBITDA ${nfPct(weakEbitda.ebitda_margin_pct)})` : "valider la rentabilité des lignes secondaires"}.`

  return {
    subtitle: concentrated ? "Forte dépendance à une offre" : "Mix d'offre diversifié",
    paragraphs: [p1, p2],
  }
}

function summarizeValuation(
  valuation: CompanyDiagnostic["valuation"],
  summary: CompanyDiagnostic["summary"],
  currency: string,
): { paragraphs: string[]; subtitle: string; metrics: SummaryMetricChip[] } {
  const evMid = valuation.enterprise_value_mid
  const equity = valuation.book_equity
  const ebitda = valuation.normalized_ebitda
  const impliedMultiple = ebitda > 0 ? evMid / ebitda : null
  const equityPremium = equity > 0 ? ((evMid - equity) / equity) * 100 : null

  const p1 = `Valeur d'entreprise indicative de ${nfMoneyK(evMid, currency)} (fourchette ${nfMoneyK(valuation.enterprise_value_low, currency)} – ${nfMoneyK(valuation.enterprise_value_high, currency)}), sur EBITDA normalisé de ${nfMoneyK(ebitda, currency)} et multiples de ${nf(valuation.multiple_low, 1)}× à ${nf(valuation.multiple_high, 1)}×.`

  const p2 =
    impliedMultiple != null && equityPremium != null
      ? `Multiple implicite au milieu de fourchette : ${nf(impliedMultiple, 1)}×${equityPremium > 20 ? ` ; prime de ${nf(equityPremium, 0)} % sur les capitaux propres comptables (${nfMoneyK(equity, currency)}), cohérente avec une rentabilité supérieure à la simple valeur comptable` : equityPremium < -10 ? ` ; décote vs capitaux propres — valider les ajustements de normalisation de l'EBITDA` : ""}.`
      : "Croiser avec la rentabilité courante et le profil de risque avant toute décision de transaction."

  const p3 = `Rappel : fourchette indicative seulement ; une valorisation formelle intégrerait ajustements, actifs non opérationnels et risques spécifiques.`

  return {
    subtitle: ebitda > 0 ? `Fourchette ${nf(valuation.multiple_low, 1)}×–${nf(valuation.multiple_high, 1)}× EBITDA` : "Valorisation à préciser",
    paragraphs: [p1, p2, p3],
    metrics: [
      { label: "VE médiane", value: nfMoneyK(evMid, currency), tone: "neutral" },
      { label: "EBITDA norm.", value: nfMoneyK(ebitda, currency), tone: "neutral" },
    ],
  }
}

export function buildExecutiveSummary(diagnostic: CompanyDiagnostic): ExecutiveSummaryModel {
  const { summary, currency, trends: rawTrends, divisions, products, seasonality, valuation } =
    diagnostic
  const benchmark = DEFAULT_BENCHMARK
  const years = [...rawTrends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const previous = years.length > 1 ? years[years.length - 2] : null
  const signals = buildSignals(diagnostic, benchmark)

  const ref = diagnostic.reference_period
  const referenceLabel = `${String(ref.calendar_month).padStart(2, "0")}/${ref.calendar_year}`

  const perf = summarizePerformance(latest, previous, years, summary, currency, benchmark)
  const rev = summarizeRevenue(latest, previous, summary, currency, benchmark, seasonality)
  const margin = summarizeMarginByRevenue(latest, previous, summary, products, benchmark)
  const expenses = summarizeExpenses(latest, previous, summary)
  const divs = summarizeDivisions(divisions, currency)
  const fin = summarizeFinancialPosition(latest, previous, currency, benchmark)
  const wc = summarizeWorkingCapital(latest, previous, currency, benchmark)
  const seas = summarizeSeasonality(seasonality)
  const profil = summarizeProfil(diagnostic, benchmark)
  const ratios = summarizeRatios(latest, previous, benchmark)
  const prods = summarizeProducts(products)
  const val = summarizeValuation(valuation, summary, currency)

  const losingDivisions = divisions.filter((d) => !d.profitable)
  const introParagraphs: string[] = [
    `Notre lecture de ${diagnostic.company_name} à la date de référence ${referenceLabel} — entreprise en phase de ${lifecycleLabel(summary.lifecycle_stage)}. Ci-dessous, le résumé de chaque volet d'analyse et les points qui méritent votre attention.`,
    `En un coup d'œil : CA ${nfMoneyK(summary.latest_revenue, currency)}, marge EBITDA ${nfPct(summary.latest_ebitda_margin_pct)}, résultat net ${nfMoneyK(summary.latest_net_income, currency)}${summary.revenue_cagr_5y != null ? `, TCAC revenus ${nfPct(summary.revenue_cagr_5y)}` : ""}.`,
  ]

  const blocks: ExecutiveSummaryBlock[] = [
    {
      id: "performance",
      reportView: "performance",
      title: "Performance financière",
      subtitle: perf.subtitle,
      paragraphs: perf.paragraphs,
      metrics: perf.metrics,
    },
    {
      id: "revenue",
      reportView: "revenue",
      title: "Revenus",
      subtitle: rev.subtitle,
      paragraphs: rev.paragraphs,
      metrics: rev.metrics,
    },
    {
      id: "margin-by-revenue",
      reportView: "margin-by-revenue",
      title: "Marge par Revenus",
      subtitle: margin.subtitle,
      paragraphs: margin.paragraphs,
      metrics: margin.metrics,
    },
    {
      id: "expenses",
      reportView: "expenses",
      title: "Dépenses",
      subtitle: expenses.subtitle,
      paragraphs: expenses.paragraphs,
    },
    {
      id: "expenses-by-division",
      reportView: "expenses-by-division",
      title: "Divisions",
      subtitle: divs.subtitle,
      paragraphs: divs.paragraphs,
      metrics: divs.metrics,
      highlight: signalForSection(signals, "divisions"),
    },
    {
      id: "financial-position",
      reportView: "financial-position",
      title: "Situation financière",
      subtitle: fin.subtitle,
      paragraphs: fin.paragraphs,
      metrics: fin.metrics,
    },
    {
      id: "working-capital",
      reportView: "working-capital",
      title: "Fonds de roulement",
      subtitle: wc.subtitle,
      paragraphs: wc.paragraphs,
    },
    {
      id: "saisonnalite",
      scrollTargetId: "diag-saisonnalite",
      title: "Saisonnalité",
      subtitle: seas.subtitle,
      paragraphs: seas.paragraphs,
      highlight: signalForSection(signals, "saisonnalite"),
    },
    {
      id: "profil",
      scrollTargetId: "diag-profil",
      title: "Profil vs secteur",
      subtitle: profil.subtitle,
      paragraphs: profil.paragraphs,
    },
    {
      id: "ratios",
      scrollTargetId: "diag-ratios",
      title: "Ratios financiers",
      subtitle: ratios.subtitle,
      paragraphs: ratios.paragraphs,
      highlight: signalForSection(signals, "ratios"),
    },
    {
      id: "produits",
      scrollTargetId: "diag-produits",
      title: "Revenus et marges par produits / services",
      subtitle: prods.subtitle,
      paragraphs: prods.paragraphs,
      highlight: signalForSection(signals, "produits"),
    },
    {
      id: "valorisation",
      scrollTargetId: "diag-valorisation",
      title: "Valorisation indicative",
      subtitle: val.subtitle,
      paragraphs: val.paragraphs,
      metrics: val.metrics,
    },
  ]

  const conclusionParts: string[] = [
    `En synthèse, ${diagnostic.company_name} affiche un profil de ${lifecycleLabel(summary.lifecycle_stage)} avec une rentabilité d'exploitation ${vsSector(summary.latest_ebitda_margin_pct, benchmark.ebitda_margin_pct) === "above" ? "au-dessus" : vsSector(summary.latest_ebitda_margin_pct, benchmark.ebitda_margin_pct) === "below" ? "sous" : "proche"} du secteur.`,
  ]
  if (losingDivisions.length > 0) {
    conclusionParts.push(
      `Priorité opérationnelle : ${losingDivisions.map((d) => d.division_name).join(", ")}.`,
    )
  }
  if (signals.length > 0) {
    conclusionParts.push(`${signals.length} point${signals.length > 1 ? "s" : ""} d'attention relevé${signals.length > 1 ? "s" : ""} dans le détail ci-dessous.`)
  }
  conclusionParts.push("Cliquez sur une carte pour approfondir le volet correspondant.")

  return {
    referenceLabel,
    headline: "Sommaire exécutif",
    introParagraphs,
    conclusionParagraph: conclusionParts.join(" "),
    blocks,
    attentionPoints: signals,
  }
}
