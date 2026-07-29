import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"
import { formatCurrency } from "@/lib/financial-utils"

const DATA_EPSILON = 1e-6

function pctChange(current: number, base: number): number | null {
  if (Math.abs(base) < DATA_EPSILON) return null
  return ((current - base) / Math.abs(base)) * 100
}

function fmtPct(p: number, digits = 1): string {
  const sign = p > 0 ? "+" : ""
  return `${sign}${p.toFixed(digits).replace(".", ",")} %`
}

function fmtPctPlain(p: number, digits = 1): string {
  return `${p.toFixed(digits).replace(".", ",")} %`
}

function referenceForPeriod(view: string, period: string): string {
  return view === "years" ? `l'exercice ${period}` : `le mois de ${period}`
}

function priorComparisonLabel(view: string): string {
  return view === "years" ? "En glissement annuel" : "Par rapport au mois précédent"
}

function buildVariableCostParagraph(
  bridge: ExpenseContributionBridgeResult,
  view: string,
): PerformanceNarrativeParagraph {
  const latest = bridge.points[0]
  const prior = bridge.points[1]
  const { variableCostAccountCount } = bridge.mappingStatus

  if (!latest) {
    return {
      heading: "Coûts variables",
      body: "Les coûts variables ne sont pas disponibles sur l'horizon analysé.",
    }
  }

  if (variableCostAccountCount === 0) {
    return {
      heading: "Coûts variables",
      body: "Aucun compte n'est marqué comme coût variable dans le mapping comptable. Paramétrez le type « Variable » sur les comptes de charges directement liées à l'activité afin de quantifier la contribution marginale.",
    }
  }

  const costShare =
    Math.abs(latest.revenue) > DATA_EPSILON ? (latest.variableCosts / latest.revenue) * 100 : null
  const marginPct =
    Math.abs(latest.revenue) > DATA_EPSILON
      ? (latest.contributiveMargin / latest.revenue) * 100
      : null

  const sentences = [
    `Les coûts variables agrégés (${variableCostAccountCount} compte${variableCostAccountCount > 1 ? "s" : ""} dans le mapping) atteignent ${formatCurrency(latest.variableCosts)} pour ${referenceForPeriod(view, latest.period)}, soit ${costShare !== null ? fmtPctPlain(costShare) : "—"} du chiffre d'affaires.`,
    marginPct !== null
      ? `Après ces charges, la contribution marginale s'établit à ${formatCurrency(latest.contributiveMargin)} (${fmtPctPlain(marginPct)} du CA) — c'est la capacité de l'entreprise à couvrir ses coûts fixes et à dégager un bénéfice d'exploitation.`
      : `La contribution marginale (revenus − coûts variables) s'établit à ${formatCurrency(latest.contributiveMargin)}.`,
  ]

  if (prior && Math.abs(prior.variableCosts) > DATA_EPSILON) {
    const costChange = pctChange(latest.variableCosts, prior.variableCosts)
    const revChange = pctChange(latest.revenue, prior.revenue)
    if (costChange !== null && revChange !== null) {
      if (Math.abs(costChange - revChange) > 0.5) {
        sentences.push(
          costChange > revChange
            ? `${priorComparisonLabel(view)}, les coûts variables progressent plus vite (${fmtPct(costChange)}) que le chiffre d'affaires (${fmtPct(revChange)}), ce qui comprime la marge contributive.`
            : `${priorComparisonLabel(view)}, les coûts variables évoluent moins vite (${fmtPct(costChange)}) que le chiffre d'affaires (${fmtPct(revChange)}), ce qui soutient la marge contributive.`,
        )
      } else {
        sentences.push(
          `${priorComparisonLabel(view)}, les coûts variables évoluent globalement en phase avec le chiffre d'affaires.`,
        )
      }
    }
  }

  return {
    heading: "Coûts variables",
    body: sentences.join(" "),
    statsLine: [
      `CV : ${formatCurrency(latest.variableCosts)}`,
      costShare !== null ? `${fmtPctPlain(costShare)} du CA` : null,
      marginPct !== null ? `Marge contributive ${fmtPctPlain(marginPct)}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

function buildFixedCostParagraph(
  bridge: ExpenseContributionBridgeResult,
  view: string,
): PerformanceNarrativeParagraph {
  const latest = bridge.points[0]
  const prior = bridge.points[1]
  const { fixedCostAccountCount } = bridge.mappingStatus

  if (!latest) {
    return {
      heading: "Coûts fixes",
      body: "Les coûts fixes ne sont pas disponibles sur l'horizon analysé.",
    }
  }

  if (fixedCostAccountCount === 0) {
    return {
      heading: "Coûts fixes",
      body: "Aucun compte n'est marqué comme coût fixe dans le mapping comptable. Paramétrez le type « Fixe » sur les charges de structure (salaires admin, loyers, etc.) pour mesurer le passage de la contribution marginale au bénéfice d'exploitation.",
    }
  }

  const fixedShareOfRevenue =
    Math.abs(latest.revenue) > DATA_EPSILON ? (latest.fixedCosts / latest.revenue) * 100 : null
  const fixedShareOfMargin =
    Math.abs(latest.contributiveMargin) > DATA_EPSILON
      ? (latest.fixedCosts / latest.contributiveMargin) * 100
      : null
  const operatingMarginPct =
    Math.abs(latest.revenue) > DATA_EPSILON
      ? (latest.operatingProfit / latest.revenue) * 100
      : null

  const sentences = [
    `Les coûts fixes (${fixedCostAccountCount} compte${fixedCostAccountCount > 1 ? "s" : ""} dans le mapping) totalisent ${formatCurrency(latest.fixedCosts)} pour ${referenceForPeriod(view, latest.period)}, soit ${fixedShareOfRevenue !== null ? fmtPctPlain(fixedShareOfRevenue) : "—"} du chiffre d'affaires.`,
    `Après déduction de ces charges de structure, le bénéfice d'exploitation atteint ${formatCurrency(latest.operatingProfit)}${operatingMarginPct !== null ? ` (${fmtPctPlain(operatingMarginPct)} du CA)` : ""}.`,
  ]

  if (fixedShareOfMargin !== null && Math.abs(latest.contributiveMargin) > DATA_EPSILON) {
    sentences.push(
      fixedShareOfMargin <= 100
        ? `Les coûts fixes absorbent ${fmtPctPlain(fixedShareOfMargin)} de la contribution marginale : plus ce ratio est élevé, plus la structure fixe pèse sur la rentabilité opérationnelle.`
        : `Les coûts fixes dépassent la contribution marginale (${fmtPctPlain(fixedShareOfMargin)}), ce qui se traduit par un bénéfice d'exploitation négatif malgré une marge contributive positive.`,
    )
  }

  if (prior && Math.abs(prior.fixedCosts) > DATA_EPSILON) {
    const fixedChange = pctChange(latest.fixedCosts, prior.fixedCosts)
    const profitChange = pctChange(latest.operatingProfit, prior.operatingProfit)
    if (fixedChange !== null && profitChange !== null && Math.abs(fixedChange) > 0.5) {
      sentences.push(
        `${priorComparisonLabel(view)}, les coûts fixes affichent une variation de ${fmtPct(fixedChange)} tandis que le bénéfice d'exploitation évolue de ${fmtPct(profitChange)}.`,
      )
    }
  }

  return {
    heading: "Coûts fixes",
    body: sentences.join(" "),
    statsLine: [
      `CF : ${formatCurrency(latest.fixedCosts)}`,
      fixedShareOfRevenue !== null ? `${fmtPctPlain(fixedShareOfRevenue)} du CA` : null,
      `BE : ${formatCurrency(latest.operatingProfit)}`,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

export function buildExpensesBridgeNarrative(
  bridge: ExpenseContributionBridgeResult,
  view: string,
): PerformanceNarrativeResult {
  const latest = bridge.points[0]
  const subtitle =
    view === "years"
      ? "Analyse pluriannuelle — lecture des charges variables et fixes à la date de référence"
      : "Analyse mensuelle — lecture des charges variables et fixes à la date de référence"

  return {
    mode: view === "years" ? "annual" : "monthly",
    title: "Lecture des dépenses",
    subtitle,
    referencePeriod: latest?.period ?? "",
    paragraphs: [buildVariableCostParagraph(bridge, view), buildFixedCostParagraph(bridge, view)],
  }
}
