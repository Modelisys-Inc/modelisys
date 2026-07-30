import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"
import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"
import type { ExpenseBridgeNarrativeContext, ExpenseCostDriver } from "@/lib/expense-bridge-narrative-context"
import { formatCurrency } from "@/lib/financial-utils"

const DATA_EPSILON = 1e-6
const RATIO_POINT_THRESHOLD = 0.3
const GROWTH_GAP_THRESHOLD = 0.5

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

function fmtPoints(p: number, digits = 1): string {
  const sign = p > 0 ? "+" : ""
  return `${sign}${p.toFixed(digits).replace(".", ",")} pt`
}

function referenceForPeriod(view: string, period: string): string {
  return view === "years" ? `l'exercice ${period}` : `le mois de ${period}`
}

function priorComparisonLabel(view: string): string {
  return view === "years" ? "En glissement annuel" : "Par rapport au mois précédent"
}

function formatDriver(driver: ExpenseCostDriver, includeRevenueShare = true): string {
  const base = `${driver.label} (${formatCurrency(driver.amount)}, ${fmtPctPlain(driver.shareOfCategoryPct)} des coûts`
  if (!includeRevenueShare) return `${base})`
  return `${base}, ${fmtPctPlain(driver.shareOfRevenuePct)} du CA)`
}

function formatDriverList(drivers: ExpenseCostDriver[], includeRevenueShare = true): string | null {
  if (!drivers.length) return null
  if (drivers.length === 1) {
    return `Le poste le plus significatif est ${formatDriver(drivers[0]!, includeRevenueShare)}.`
  }
  const head = drivers.slice(0, -1).map((d) => formatDriver(d, includeRevenueShare))
  const last = formatDriver(drivers[drivers.length - 1]!, includeRevenueShare)
  return `Les principaux postes sont ${head.join(", ")} et ${last}.`
}

function ratioOf(numerator: number, denominator: number): number | null {
  if (Math.abs(denominator) < DATA_EPSILON) return null
  return (numerator / denominator) * 100
}

function describeVariableRatioTrend(
  latestCvRatio: number,
  priorCvRatio: number | null,
  latestMarginRatio: number,
  priorMarginRatio: number | null,
  view: string,
): string | null {
  if (priorCvRatio === null || priorMarginRatio === null) return null

  const cvDelta = latestCvRatio - priorCvRatio
  const marginDelta = latestMarginRatio - priorMarginRatio

  if (Math.abs(cvDelta) < RATIO_POINT_THRESHOLD) {
    return `${priorComparisonLabel(view)}, le ratio coûts variables / chiffre d'affaires demeure stable (${fmtPctPlain(priorCvRatio)} → ${fmtPctPlain(latestCvRatio)}), ce qui laisse la marge contributive relativement inchangée.`
  }

  if (cvDelta > 0) {
    return `${priorComparisonLabel(view)}, le ratio coûts variables / chiffre d'affaires progresse de ${fmtPoints(cvDelta)} (${fmtPctPlain(priorCvRatio)} → ${fmtPctPlain(latestCvRatio)}). La marge contributive recule de ${fmtPoints(marginDelta)} (${fmtPctPlain(priorMarginRatio)} → ${fmtPctPlain(latestMarginRatio)} du CA) : la rentabilité variable se détériore — chaque dollar de vente laisse moins de marge pour couvrir la structure fixe.`
  }

  return `${priorComparisonLabel(view)}, le ratio coûts variables / chiffre d'affaires recule de ${fmtPoints(Math.abs(cvDelta))} (${fmtPctPlain(priorCvRatio)} → ${fmtPctPlain(latestCvRatio)}). La marge contributive gagne ${fmtPoints(marginDelta)} (${fmtPctPlain(priorMarginRatio)} → ${fmtPctPlain(latestMarginRatio)} du CA), signe d'une meilleure discipline sur les charges directes ou d'un mix plus favorable.`
}

function describeFixedGrowthVsRevenue(
  fixedChange: number,
  revChange: number,
  view: string,
): string {
  const gap = fixedChange - revChange
  if (gap > GROWTH_GAP_THRESHOLD) {
    return `${priorComparisonLabel(view)}, les coûts fixes progressent plus vite (${fmtPct(fixedChange)}) que le chiffre d'affaires (${fmtPct(revChange)}). La structure absorbée pèse davantage sur le bénéfice d'exploitation : l'effet de levier opérationnel est défavorable tant que la croissance des fixes dépasse celle des revenus.`
  }
  if (gap < -GROWTH_GAP_THRESHOLD) {
    return `${priorComparisonLabel(view)}, le chiffre d'affaires croît plus vite (${fmtPct(revChange)}) que les coûts fixes (${fmtPct(fixedChange)}). La structure se dilue dans le volume : l'effet de levier opérationnel est favorable, à condition que la marge contributive reste stable.`
  }
  return `${priorComparisonLabel(view)}, la croissance des coûts fixes (${fmtPct(fixedChange)}) suit de près celle du chiffre d'affaires (${fmtPct(revChange)}) : la pression de la structure évolue globalement en phase avec l'activité.`
}

function buildVariableCostParagraph(
  bridge: ExpenseContributionBridgeResult,
  view: string,
  context: ExpenseBridgeNarrativeContext | null,
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

  const costShare = ratioOf(latest.variableCosts, latest.revenue)
  const marginPct = ratioOf(latest.contributiveMargin, latest.revenue)
  const priorCostShare = prior ? ratioOf(prior.variableCosts, prior.revenue) : null
  const priorMarginPct = prior ? ratioOf(prior.contributiveMargin, prior.revenue) : null

  const sentences = [
    `Pour ${referenceForPeriod(view, latest.period)}, les coûts variables totalisent ${formatCurrency(latest.variableCosts)} (${costShare !== null ? fmtPctPlain(costShare) : "—"} du chiffre d'affaires), issus de ${variableCostAccountCount} compte${variableCostAccountCount > 1 ? "s" : ""} du mapping. La contribution marginale s'établit à ${formatCurrency(latest.contributiveMargin)}${marginPct !== null ? `, soit ${fmtPctPlain(marginPct)} du CA` : ""} — c'est la capacité de l'entreprise à absorber ses coûts fixes et à dégager un bénéfice d'exploitation.`,
  ]

  const driverSentence = context ? formatDriverList(context.topVariableDrivers) : null
  if (driverSentence) {
    sentences.push(driverSentence)
  }

  if (costShare !== null && priorCostShare !== null && marginPct !== null && priorMarginPct !== null) {
    const ratioTrend = describeVariableRatioTrend(costShare, priorCostShare, marginPct, priorMarginPct, view)
    if (ratioTrend) sentences.push(ratioTrend)
  } else if (prior && Math.abs(prior.variableCosts) > DATA_EPSILON) {
    const costChange = pctChange(latest.variableCosts, prior.variableCosts)
    const revChange = pctChange(latest.revenue, prior.revenue)
    if (costChange !== null && revChange !== null && Math.abs(costChange - revChange) > GROWTH_GAP_THRESHOLD) {
      sentences.push(
        costChange > revChange
          ? `${priorComparisonLabel(view)}, les coûts variables progressent plus vite (${fmtPct(costChange)}) que le chiffre d'affaires (${fmtPct(revChange)}), ce qui tend à comprimer la marge contributive.`
          : `${priorComparisonLabel(view)}, les coûts variables évoluent moins vite (${fmtPct(costChange)}) que le chiffre d'affaires (${fmtPct(revChange)}), ce qui soutient la marge contributive.`,
      )
    }
  }

  return {
    heading: "Coûts variables",
    body: sentences.join(" "),
    statsLine: [
      `CV : ${formatCurrency(latest.variableCosts)}`,
      costShare !== null ? `${fmtPctPlain(costShare)} du CA` : null,
      marginPct !== null ? `Marge contributive ${fmtPctPlain(marginPct)}` : null,
      priorCostShare !== null && costShare !== null
        ? `Δ ratio CV/CA ${fmtPoints(costShare - priorCostShare)}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

function buildFixedCostParagraph(
  bridge: ExpenseContributionBridgeResult,
  view: string,
  context: ExpenseBridgeNarrativeContext | null,
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
      body: "Aucun compte n'est marqué comme coût fixe dans le mapping comptable. Paramétrez le type « Fixe » sur les charges de structure (salaires admin, loyers, amortissement opérationnel hors dotation, etc.) pour mesurer le passage de la contribution marginale au bénéfice d'exploitation.",
    }
  }

  const fixedShareOfRevenue = ratioOf(latest.fixedCosts, latest.revenue)
  const fixedShareOfMargin = ratioOf(latest.fixedCosts, latest.contributiveMargin)
  const operatingMarginPct = ratioOf(latest.operatingProfit, latest.revenue)

  const sentences = [
    `Les coûts fixes s'élèvent à ${formatCurrency(latest.fixedCosts)} pour ${referenceForPeriod(view, latest.period)} (${fixedShareOfRevenue !== null ? fmtPctPlain(fixedShareOfRevenue) : "—"} du chiffre d'affaires, ${fixedCostAccountCount} compte${fixedCostAccountCount > 1 ? "s" : ""} dans le mapping). Après ces charges de structure, le bénéfice d'exploitation atteint ${formatCurrency(latest.operatingProfit)}${operatingMarginPct !== null ? ` (${fmtPctPlain(operatingMarginPct)} du CA)` : ""}.`,
  ]

  const driverSentence = context ? formatDriverList(context.topFixedDrivers) : null
  if (driverSentence) {
    sentences.push(driverSentence)
  }

  if (prior && Math.abs(prior.fixedCosts) > DATA_EPSILON && Math.abs(prior.revenue) > DATA_EPSILON) {
    const fixedChange = pctChange(latest.fixedCosts, prior.fixedCosts)
    const revChange = pctChange(latest.revenue, prior.revenue)
    if (fixedChange !== null && revChange !== null) {
      sentences.push(describeFixedGrowthVsRevenue(fixedChange, revChange, view))
    }
  }

  if (fixedShareOfMargin !== null && Math.abs(latest.contributiveMargin) > DATA_EPSILON) {
    sentences.push(
      fixedShareOfMargin <= 100
        ? `À la date de référence, les coûts fixes absorbent ${fmtPctPlain(fixedShareOfMargin)} de la contribution marginale : chaque dollar de marge contributive sert en priorité à couvrir la structure avant de dégager du bénéfice d'exploitation.`
        : `Les coûts fixes dépassent la contribution marginale (${fmtPctPlain(fixedShareOfMargin)}), ce qui génère un bénéfice d'exploitation négatif malgré une marge contributive positive — la priorité est de rétablir le volume ou la marge variable, ou d'ajuster la structure fixe.`,
    )
  }

  return {
    heading: "Coûts fixes",
    body: sentences.join(" "),
    statsLine: [
      `CF : ${formatCurrency(latest.fixedCosts)}`,
      fixedShareOfRevenue !== null ? `${fmtPctPlain(fixedShareOfRevenue)} du CA` : null,
      prior && Math.abs(prior.revenue) > DATA_EPSILON
        ? `Δ CF ${fmtPct(pctChange(latest.fixedCosts, prior.fixedCosts) ?? 0)} · Δ CA ${fmtPct(pctChange(latest.revenue, prior.revenue) ?? 0)}`
        : null,
      `BE : ${formatCurrency(latest.operatingProfit)}`,
    ]
      .filter(Boolean)
      .join(" · "),
  }
}

export function buildExpensesBridgeNarrative(
  bridge: ExpenseContributionBridgeResult,
  view: string,
  context?: ExpenseBridgeNarrativeContext | null,
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
    paragraphs: [
      buildVariableCostParagraph(bridge, view, context ?? null),
      buildFixedCostParagraph(bridge, view, context ?? null),
    ],
  }
}
