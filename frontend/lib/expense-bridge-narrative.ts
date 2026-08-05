import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
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

function ratioOf(numerator: number, denominator: number): number | null {
  if (Math.abs(denominator) < DATA_EPSILON) return null
  return (numerator / denominator) * 100
}

function periodIntroLabel(view: string, period: string): string {
  return view === "years" ? `En ${period}` : `Pour le mois de ${period}`
}

function formatVariableDriverEntry(
  driver: ExpenseCostDriver,
  options: { includeCategoryShareLabel: boolean },
): string {
  const share = options.includeCategoryShareLabel
    ? `soit ${fmtPctPlain(driver.shareOfCategoryPct)} des coûts variables`
    : `soit ${fmtPctPlain(driver.shareOfCategoryPct)}`
  const label = driver.label.trim()
  const lowerFirst = label.charAt(0).toLowerCase() + label.slice(1)
  return `${lowerFirst} (${formatCurrency(driver.amount)}, ${share})`
}

function formatVariableDriversBreakdown(drivers: ExpenseCostDriver[]): string | null {
  if (!drivers.length) return null

  if (drivers.length === 1) {
    const driver = drivers[0]!
    return `Les coûts variables sont principalement composés de ${formatVariableDriverEntry(driver, { includeCategoryShareLabel: true })}.`
  }

  const top = drivers.slice(0, 3)
  const parts = top.map((driver, index) => {
    const entry = formatVariableDriverEntry(driver, { includeCategoryShareLabel: index === 0 })
    if (index === 0) return `des ${entry}`
    if (index === top.length - 1) return `ainsi que de ${entry}`
    return `de ${entry}`
  })

  const combinedShare = top.reduce((sum, driver) => sum + driver.shareOfCategoryPct, 0)
  const leverageSentence =
    top.length >= 3 && combinedShare >= 90
      ? ` À eux seuls, ces trois postes représentent plus de ${Math.floor(combinedShare)} % des coûts variables et constituent les principaux leviers influençant la marge contributive.`
      : " Ces postes constituent les principaux leviers influençant la marge contributive."

  return `Les coûts variables sont principalement composés ${parts.join(", ")}.${leverageSentence}`
}

function finalizeExpenseSectionParagraphs(
  paragraphs: PerformanceNarrativeParagraph[],
): PerformanceNarrativeParagraph[] {
  if (paragraphs.length <= 1) return paragraphs
  const lastIndex = paragraphs.length - 1
  return paragraphs.map((paragraph, index) => ({
    ...paragraph,
    showIndicatorTable: index === lastIndex,
  }))
}

function formatFixedDriverEntry(
  driver: ExpenseCostDriver,
  options: { includeCategoryShareLabel: boolean },
): string {
  const share = options.includeCategoryShareLabel
    ? `soit ${fmtPctPlain(driver.shareOfCategoryPct)} des coûts fixes`
    : `soit ${fmtPctPlain(driver.shareOfCategoryPct)}`
  const label = driver.label.trim()
  const lowerFirst = label.charAt(0).toLowerCase() + label.slice(1)
  return `${lowerFirst} (${formatCurrency(driver.amount)}, ${share})`
}

function formatFixedDriversBreakdown(drivers: ExpenseCostDriver[]): string | null {
  if (!drivers.length) return null

  if (drivers.length === 1) {
    const driver = drivers[0]!
    return `Les principaux postes de coûts fixes sont ${formatFixedDriverEntry(driver, { includeCategoryShareLabel: true })}.`
  }

  const top = drivers.slice(0, 3)
  const parts = top.map((driver, index) => {
    const entry = formatFixedDriverEntry(driver, { includeCategoryShareLabel: index === 0 })
    if (index === 0) return `les ${entry}`
    if (index === top.length - 1) return `ainsi que ${entry}`
    return `le ${entry}`
  })

  const combinedShare = top.reduce((sum, driver) => sum + driver.shareOfCategoryPct, 0)
  const leverageSentence =
    top.length >= 3 && combinedShare >= 70
      ? ` À eux seuls, ces trois postes représentent près de ${Math.round(combinedShare)} % de la structure de coûts fixes et constituent les principaux leviers d'optimisation de la rentabilité opérationnelle.`
      : " Ces postes constituent les principaux leviers d'optimisation de la rentabilité opérationnelle."

  return `Les principaux postes de coûts fixes sont ${parts.join(", ")}.${leverageSentence}`
}

function describeFixedGrowthTrend(
  priorPeriod: string,
  fixedChange: number,
  revChange: number,
  view: string,
): string {
  const priorLabel = view === "years" ? priorPeriod : `le mois de ${priorPeriod}`
  const gap = fixedChange - revChange
  const fixedVerb = fixedChange >= 0 ? "progressent" : "reculent"
  const revVerb = revChange >= 0 ? "augmente" : "recule"
  const fixedAmt = fmtPctPlain(Math.abs(fixedChange))
  const revAmt = fmtPctPlain(Math.abs(revChange))
  const onlyQualifier =
    fixedChange >= 0 && revChange > fixedChange && gap < -GROWTH_GAP_THRESHOLD ? "seulement " : ""

  if (gap > GROWTH_GAP_THRESHOLD) {
    return `Comparativement à ${priorLabel}, les coûts fixes ${fixedVerb} de ${fixedAmt}, alors que le chiffre d'affaires ${revVerb} de ${revAmt}. Cette évolution traduit un effet de levier opérationnel défavorable : la structure de coûts fixes pèse davantage sur la rentabilité tant que la croissance des charges de structure dépasse celle des revenus.`
  }

  if (gap < -GROWTH_GAP_THRESHOLD) {
    return `Comparativement à ${priorLabel}, les coûts fixes ${fixedVerb} de ${onlyQualifier}${fixedAmt}, alors que le chiffre d'affaires ${revVerb} de ${revAmt}. Cette évolution traduit un effet de levier opérationnel favorable : la croissance des revenus dépasse celle des coûts de structure, ce qui permet d'améliorer la rentabilité de l'entreprise sans augmentation proportionnelle de ses charges fixes.`
  }

  return `Comparativement à ${priorLabel}, les coûts fixes ${fixedVerb} de ${fixedAmt}, alors que le chiffre d'affaires ${revVerb} de ${revAmt}. La pression de la structure évolue globalement en phase avec l'activité.`
}

function describeFixedMarginAbsorption(fixedShareOfMargin: number): string {
  if (fixedShareOfMargin > 100) {
    return `Les coûts fixes dépassent la contribution marginale (${fmtPctPlain(fixedShareOfMargin)}), ce qui génère un ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} négatif malgré une marge contributive positive — la priorité est de rétablir le volume ou la marge variable, ou d'ajuster la structure fixe.`
  }

  const conversionPct = 100 - fixedShareOfMargin
  const structureComment =
    conversionPct >= 50
      ? "Cette situation témoigne d'une structure de coûts bien maîtrisée et d'une bonne capacité à transformer la croissance des ventes en rentabilité opérationnelle."
      : conversionPct >= 30
        ? "Cette situation indique une marge contributive encore disponible pour couvrir la structure, avec une vigilance à maintenir sur l'évolution des charges fixes."
        : "Cette situation laisse peu de marge contributive après absorption des coûts fixes : la rentabilité opérationnelle reste sensible à la moindre pression sur le volume ou la marge variable."

  return `À la date de référence, les coûts fixes absorbent ${fmtPctPlain(fixedShareOfMargin)} de la contribution marginale, laissant ${fmtPctPlain(conversionPct)} de celle-ci se convertir en ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}. ${structureComment}`
}

function describeVariableRatioTrend(
  priorPeriod: string | null,
  latestCvRatio: number,
  priorCvRatio: number | null,
  latestMarginRatio: number,
  view: string,
): string | null {
  if (priorCvRatio === null || priorPeriod === null) return null

  const cvDelta = latestCvRatio - priorCvRatio
  const priorLabel = view === "years" ? priorPeriod : `le mois de ${priorPeriod}`

  if (Math.abs(cvDelta) < RATIO_POINT_THRESHOLD) {
    const marginQualifier =
      latestMarginRatio >= 45 ? "élevée" : latestMarginRatio >= 30 ? "solide" : "stable"
    return `Comparativement à ${priorLabel}, le ratio des coûts variables demeure pratiquement stable, passant de ${fmtPctPlain(priorCvRatio)} à ${fmtPctPlain(latestCvRatio)} du chiffre d'affaires. Cette stabilité permet de maintenir une marge contributive ${marginQualifier} et indique que l'entreprise a conservé sa capacité à absorber la hausse de son volume d'activité sans détérioration significative de sa structure de coûts variables.`
  }

  if (cvDelta > 0) {
    return `Comparativement à ${priorLabel}, le ratio des coûts variables progresse de ${fmtPoints(cvDelta)}, passant de ${fmtPctPlain(priorCvRatio)} à ${fmtPctPlain(latestCvRatio)} du chiffre d'affaires. Cette détérioration comprime la marge contributive et réduit la capacité de l'entreprise à absorber ses coûts fixes et à dégager un ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} positif.`
  }

  return `Comparativement à ${priorLabel}, le ratio des coûts variables recule de ${fmtPoints(Math.abs(cvDelta))}, passant de ${fmtPctPlain(priorCvRatio)} à ${fmtPctPlain(latestCvRatio)} du chiffre d'affaires. Cette amélioration soutient la marge contributive et renforce la capacité de l'entreprise à couvrir sa structure fixe et à générer un ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} positif.`
}

function buildVariableCostParagraphs(
  bridge: ExpenseContributionBridgeResult,
  view: string,
  context: ExpenseBridgeNarrativeContext | null,
): PerformanceNarrativeParagraph[] {
  const latest = bridge.points[0]
  const prior = bridge.points[1]
  const { variableCostAccountCount } = bridge.mappingStatus

  if (!latest) {
    return finalizeExpenseSectionParagraphs([
      {
        heading: "Coûts variables",
        body: "Les coûts variables ne sont pas disponibles sur l'horizon analysé.",
      },
    ])
  }

  if (variableCostAccountCount === 0) {
    return finalizeExpenseSectionParagraphs([
      {
        heading: "Coûts variables",
        body: "Aucun compte n'est marqué comme coût variable dans le mapping comptable. Paramétrez le type « Variable » sur les comptes de charges directement liées à l'activité afin de quantifier la contribution marginale.",
      },
    ])
  }

  const costShare = ratioOf(latest.variableCosts, latest.revenue)
  const marginPct = ratioOf(latest.contributiveMargin, latest.revenue)
  const priorCostShare = prior ? ratioOf(prior.variableCosts, prior.revenue) : null

  const intro = `${periodIntroLabel(view, latest.period)}, les coûts variables totalisent ${formatCurrency(latest.variableCosts)}${costShare !== null ? `, soit ${fmtPctPlain(costShare)} du chiffre d'affaires` : ""}, et proviennent de ${variableCostAccountCount} compte${variableCostAccountCount > 1 ? "s" : ""} du mapping comptable.${marginPct !== null ? ` Chaque dollar de revenu génère ainsi une contribution marginale de ${fmtPctPlain(marginPct)}, représentant ${formatCurrency(latest.contributiveMargin)} disponibles pour couvrir les coûts fixes de l'entreprise et générer un bénéfice d'exploitation (${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}).` : ""}`

  const paragraphs: PerformanceNarrativeParagraph[] = [
    {
      heading: "Coûts variables",
      body: intro,
      narrativePageGroup: "expense-variable-costs",
    },
  ]

  const driversParagraph = context ? formatVariableDriversBreakdown(context.topVariableDrivers) : null
  if (driversParagraph) {
    paragraphs.push({
      heading: "Coûts variables",
      body: driversParagraph,
      hideMainHeading: true,
      narrativePageGroup: "expense-variable-costs",
    })
  }

  if (costShare !== null && priorCostShare !== null && marginPct !== null && prior) {
    const trendParagraph = describeVariableRatioTrend(
      prior.period,
      costShare,
      priorCostShare,
      marginPct,
      view,
    )
    if (trendParagraph) {
      paragraphs.push({
        heading: "Coûts variables",
        body: trendParagraph,
        hideMainHeading: true,
        narrativePageGroup: "expense-variable-costs",
      })
    }
  } else if (prior && Math.abs(prior.variableCosts) > DATA_EPSILON) {
    const costChange = pctChange(latest.variableCosts, prior.variableCosts)
    const revChange = pctChange(latest.revenue, prior.revenue)
    if (costChange !== null && revChange !== null && Math.abs(costChange - revChange) > GROWTH_GAP_THRESHOLD) {
      paragraphs.push({
        heading: "Coûts variables",
        body:
          costChange > revChange
            ? `Comparativement à ${view === "years" ? prior.period : `le mois de ${prior.period}`}, les coûts variables progressent plus vite (${fmtPct(costChange)}) que le chiffre d'affaires (${fmtPct(revChange)}), ce qui tend à comprimer la marge contributive.`
            : `Comparativement à ${view === "years" ? prior.period : `le mois de ${prior.period}`}, les coûts variables évoluent moins vite (${fmtPct(costChange)}) que le chiffre d'affaires (${fmtPct(revChange)}), ce qui soutient la marge contributive.`,
        hideMainHeading: true,
        narrativePageGroup: "expense-variable-costs",
      })
    }
  }

  return finalizeExpenseSectionParagraphs(paragraphs)
}

function buildFixedCostParagraphs(
  bridge: ExpenseContributionBridgeResult,
  view: string,
  context: ExpenseBridgeNarrativeContext | null,
): PerformanceNarrativeParagraph[] {
  const latest = bridge.points[0]
  const prior = bridge.points[1]
  const { fixedCostAccountCount } = bridge.mappingStatus

  if (!latest) {
    return finalizeExpenseSectionParagraphs([
      {
        heading: "Coûts fixes",
        body: "Les coûts fixes ne sont pas disponibles sur l'horizon analysé.",
      },
    ])
  }

  if (fixedCostAccountCount === 0) {
    return finalizeExpenseSectionParagraphs([
      {
        heading: "Coûts fixes",
        body: `Aucun compte n'est marqué comme coût fixe dans le mapping comptable. Paramétrez le type « Fixe » sur les charges de structure (salaires admin, loyers, amortissement opérationnel hors dotation, etc.) pour mesurer le passage de la contribution marginale au ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}.`,
      },
    ])
  }

  const fixedShareOfRevenue = ratioOf(latest.fixedCosts, latest.revenue)
  const fixedShareOfMargin = ratioOf(latest.fixedCosts, latest.contributiveMargin)
  const operatingMarginPct = ratioOf(latest.operatingProfit, latest.revenue)

  const intro = `${periodIntroLabel(view, latest.period)}, les coûts fixes totalisent ${formatCurrency(latest.fixedCosts)}${fixedShareOfRevenue !== null ? `, soit ${fmtPctPlain(fixedShareOfRevenue)} du chiffre d'affaires` : ""}, et regroupent ${fixedCostAccountCount} compte${fixedCostAccountCount > 1 ? "s" : ""} du mapping comptable. Ces charges représentent les coûts nécessaires au fonctionnement de l'entreprise indépendamment du volume d'activité.${operatingMarginPct !== null ? ` Après leur absorption, le bénéfice avant intérêts, impôts et amortissement (${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}) atteint ${formatCurrency(latest.operatingProfit)}, ce qui correspond à une marge de ${fmtPctPlain(operatingMarginPct)} du chiffre d'affaires.` : ` Après leur absorption, le bénéfice avant intérêts, impôts et amortissement (${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}) atteint ${formatCurrency(latest.operatingProfit)}.`}`

  const paragraphs: PerformanceNarrativeParagraph[] = [
    {
      heading: "Coûts fixes",
      body: intro,
      narrativePageGroup: "expense-fixed-costs",
    },
  ]

  const driversParagraph = context ? formatFixedDriversBreakdown(context.topFixedDrivers) : null
  if (driversParagraph) {
    paragraphs.push({
      heading: "Coûts fixes",
      body: driversParagraph,
      hideMainHeading: true,
      narrativePageGroup: "expense-fixed-costs",
    })
  }

  if (prior && Math.abs(prior.fixedCosts) > DATA_EPSILON && Math.abs(prior.revenue) > DATA_EPSILON) {
    const fixedChange = pctChange(latest.fixedCosts, prior.fixedCosts)
    const revChange = pctChange(latest.revenue, prior.revenue)
    if (fixedChange !== null && revChange !== null) {
      paragraphs.push({
        heading: "Coûts fixes",
        body: describeFixedGrowthTrend(prior.period, fixedChange, revChange, view),
        hideMainHeading: true,
        narrativePageGroup: "expense-fixed-costs",
      })
    }
  }

  if (fixedShareOfMargin !== null && Math.abs(latest.contributiveMargin) > DATA_EPSILON) {
    paragraphs.push({
      heading: "Coûts fixes",
      body: describeFixedMarginAbsorption(fixedShareOfMargin),
      hideMainHeading: true,
      narrativePageGroup: "expense-fixed-costs",
    })
  }

  return finalizeExpenseSectionParagraphs(paragraphs)
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
      ...buildVariableCostParagraphs(bridge, view, context ?? null),
      ...buildFixedCostParagraphs(bridge, view, context ?? null),
    ],
  }
}
