import { formatCurrency } from "@/lib/financial-utils"
import type { NarrativeParagraphSection, PerformanceNarrativeParagraph } from "@/lib/income-performance-narrative"
import type {
  PilotagePerformanceBudgetSnapshot,
  PilotageRevenueBudgetSnapshot,
} from "@/lib/pilotage-revenue-budget"
import { hasPilotagePerformanceBudget } from "@/lib/pilotage-revenue-budget"
import type {
  PilotagePerformanceMetricsBundle,
  PilotageRevenueMetrics,
  PilotageScalarMetrics,
} from "@/lib/pilotage-revenue-metrics"

const DATA_EPSILON = 1e-6

type MetricValueKind = "currency" | "percent"

export type PilotageMetricConfig = {
  blockId: string
  divisionTitle: string
  section: NarrativeParagraphSection
  valueKind: MetricValueKind
  currentLabel: string
  ytdSubject: string
  ttmSubject: string
  yoyVerb: (pct: number) => string
  yoyNoun: (pct: number) => string
  ttmTrendSentence: string
  noBudgetCurrent: string
  noBudgetCurrentFollowUp: string
  noBudgetYtd: string
  noBudgetYtdFollowUp: string
  noBudgetTtm: string
  noBudgetTtmFollowUp: string
  budget: {
    currentBelow: (gap: string) => string
    currentAbove: (gap: string) => string
    currentAligned: string
    ytdBelow: (gap: string) => string
    ytdFollowUp: string
    ttmBelow: string
    ttmAboveOrAligned: string
  }
}

const METRIC_CONFIGS = {
  revenue: {
    blockId: "pilotage-revenue",
    divisionTitle: "Revenus",
    section: "revenue-performance",
    valueKind: "currency",
    currentLabel: "le chiffre d'affaires",
    ytdSubject: "les revenus",
    ttmSubject: "le chiffre d'affaires des douze derniers mois",
    yoyVerb: (pct: number) => {
      if (pct > 0.05) return "progressent"
      if (pct < -0.05) return "reculent"
      return "demeurent stables"
    },
    yoyNoun: (pct: number) => {
      if (pct > 0.05) return "une croissance de l'activité"
      if (pct < -0.05) return "un repli de l'activité"
      return "une activité stable"
    },
    ttmTrendSentence:
      "Cette progression confirme que la croissance observée ne repose pas uniquement sur la performance récente, mais s'inscrit dans une tendance soutenue depuis plusieurs mois.",
    noBudgetCurrent:
      "Aucun budget prévisionnel n'a été préparé pour cette période : la comparaison aux objectifs fixés ne peut pas être effectuée pour le moment.",
    noBudgetCurrentFollowUp:
      "L'évolution observée devra être suivie afin de déterminer si la dynamique récente reflète une tendance durable ou des facteurs ponctuels.",
    noBudgetYtd: "Aucun budget cumulatif n'est disponible pour évaluer l'écart par rapport aux objectifs fixés.",
    noBudgetYtdFollowUp:
      "La trajectoire de l'exercice devra être suivie au cours des prochains mois afin de confirmer la tendance observée.",
    noBudgetTtm:
      "En l'absence de budget de référence sur cet horizon, l'analyse se fonde sur la comparaison aux douze mois précédents.",
    noBudgetTtmFollowUp:
      "La trajectoire globale demeure à surveiller afin de confirmer la pérennité de la tendance observée.",
    budget: {
      currentBelow: (gap) =>
        `Malgré cette évolution, le chiffre d'affaires demeure ${gap}, ce qui indique que les objectifs fixés pour la période n'ont pas été entièrement atteints.`,
      currentAbove: (gap) =>
        `Le chiffre d'affaires dépasse de ${gap} le budget mensuel établi, ce qui témoigne d'une performance supérieure aux objectifs fixés pour la période.`,
      currentAligned: "Le chiffre d'affaires est aligné sur le budget mensuel établi pour la période.",
      ytdBelow: (gap) =>
        `Le chiffre d'affaires demeure toutefois ${gap}, ce qui signifie que, malgré une progression par rapport à l'année précédente, l'entreprise évolue actuellement sous la trajectoire prévue.`,
      ytdFollowUp:
        "L'écart observé devra être suivi au cours des prochains mois afin d'évaluer si les objectifs annuels demeurent réalistes ou si des ajustements seront nécessaires.",
      ttmBelow:
        "Bien que les résultats des derniers mois demeurent légèrement inférieurs au rythme prévu au budget, la trajectoire globale de l'entreprise reste favorable et traduit une amélioration continue de son niveau d'activité.",
      ttmAboveOrAligned:
        "Les résultats sur douze mois glissants sont conformes ou supérieurs au rythme prévu au budget, ce qui traduit une amélioration continue du niveau d'activité.",
    },
  },
  contributiveMargin: {
    blockId: "pilotage-contributive-margin",
    divisionTitle: "Contribution marginale",
    section: "contributive-margin",
    valueKind: "percent",
    currentLabel: "la contribution marginale",
    ytdSubject: "la contribution marginale",
    ttmSubject: "la contribution marginale sur douze mois glissants",
    yoyVerb: (pct: number) => {
      if (pct > 0.05) return "progresse"
      if (pct < -0.05) return "recule"
      return "demeure stable"
    },
    yoyNoun: (pct: number) => {
      if (pct > 0.05) return "une amélioration de la rentabilité contributive"
      if (pct < -0.05) return "une pression sur la rentabilité contributive"
      return "une rentabilité contributive stable"
    },
    ttmTrendSentence:
      "Cette évolution confirme que l'amélioration ou la dégradation observée ne repose pas uniquement sur le mois de référence, mais s'inscrit dans une tendance plus large sur les douze derniers mois.",
    noBudgetCurrent:
      "Aucun budget prévisionnel n'a été préparé pour la contribution marginale : la comparaison aux objectifs fixés ne peut pas être effectuée pour le moment.",
    noBudgetCurrentFollowUp:
      "L'évolution de la marge contributive devra être suivie afin de déterminer si la dynamique récente reflète une tendance durable ou des facteurs ponctuels.",
    noBudgetYtd:
      "Aucun budget cumulatif de marge n'est disponible pour évaluer l'écart par rapport aux objectifs fixés.",
    noBudgetYtdFollowUp:
      "La trajectoire de la marge contributive devra être suivie au cours des prochains mois afin de confirmer la tendance observée.",
    noBudgetTtm:
      "En l'absence de budget de référence sur cet horizon, l'analyse se fonde sur la comparaison aux douze mois précédents.",
    noBudgetTtmFollowUp:
      "La trajectoire globale de la marge contributive demeure à surveiller afin de confirmer la pérennité de la tendance observée.",
    budget: {
      currentBelow: (gap) =>
        `Malgré cette évolution, la contribution marginale demeure ${gap}, ce qui indique que les objectifs de rentabilité contributive n'ont pas été entièrement atteints pour la période.`,
      currentAbove: (gap) =>
        `La contribution marginale dépasse de ${gap} le budget mensuel établi, ce qui témoigne d'une rentabilité contributive supérieure aux objectifs fixés.`,
      currentAligned:
        "La contribution marginale est alignée sur le budget mensuel établi pour la période.",
      ytdBelow: (gap) =>
        `La contribution marginale demeure toutefois ${gap}, ce qui signifie que, malgré une évolution favorable par rapport à l'année précédente, l'entreprise évolue actuellement sous la trajectoire prévue.`,
      ytdFollowUp:
        "L'écart observé devra être suivi au cours des prochains mois afin d'évaluer si les objectifs de marge demeurent réalistes ou si des ajustements seront nécessaires.",
      ttmBelow:
        "Bien que la marge contributive des derniers mois demeure légèrement inférieure au rythme prévu au budget, la trajectoire globale reste à analyser au regard de l'évolution des coûts variables.",
      ttmAboveOrAligned:
        "La contribution marginale sur douze mois glissants est conforme ou supérieure au rythme prévu au budget, ce qui traduit une amélioration continue de la rentabilité contributive.",
    },
  },
  ebita: {
    blockId: "pilotage-ebita",
    divisionTitle: "BAIIA",
    section: "revenue-performance",
    valueKind: "currency",
    currentLabel: "le BAIIA",
    ytdSubject: "le BAIIA",
    ttmSubject: "le BAIIA des douze derniers mois",
    yoyVerb: (pct: number) => {
      if (pct > 0.05) return "progresse"
      if (pct < -0.05) return "recule"
      return "demeure stable"
    },
    yoyNoun: (pct: number) => {
      if (pct > 0.05) return "une amélioration de la rentabilité opérationnelle"
      if (pct < -0.05) return "un repli de la rentabilité opérationnelle"
      return "une rentabilité opérationnelle stable"
    },
    ttmTrendSentence:
      "Cette évolution confirme que la dynamique du BAIIA ne repose pas uniquement sur la performance récente, mais s'inscrit dans une tendance plus large depuis plusieurs mois.",
    noBudgetCurrent:
      "Aucun budget prévisionnel n'a été préparé pour le BAIIA : la comparaison aux objectifs fixés ne peut pas être effectuée pour le moment.",
    noBudgetCurrentFollowUp:
      "L'évolution du résultat opérationnel devra être suivie afin de déterminer si la dynamique récente reflète une tendance durable ou des facteurs ponctuels.",
    noBudgetYtd:
      "Aucun budget cumulatif de BAIIA n'est disponible pour évaluer l'écart par rapport aux objectifs fixés.",
    noBudgetYtdFollowUp:
      "La trajectoire du résultat opérationnel devra être suivie au cours des prochains mois afin de confirmer la tendance observée.",
    noBudgetTtm:
      "En l'absence de budget de référence sur cet horizon, l'analyse se fonde sur la comparaison aux douze mois précédents.",
    noBudgetTtmFollowUp:
      "La trajectoire globale du BAIIA demeure à surveiller afin de confirmer la pérennité de la tendance observée.",
    budget: {
      currentBelow: (gap) =>
        `Malgré cette évolution, le BAIIA demeure ${gap}, ce qui indique que les objectifs de rentabilité opérationnelle n'ont pas été entièrement atteints pour la période.`,
      currentAbove: (gap) =>
        `Le BAIIA dépasse de ${gap} le budget mensuel établi, ce qui témoigne d'une performance opérationnelle supérieure aux objectifs fixés.`,
      currentAligned: "Le BAIIA est aligné sur le budget mensuel établi pour la période.",
      ytdBelow: (gap) =>
        `Le BAIIA demeure toutefois ${gap}, ce qui signifie que, malgré une progression par rapport à l'année précédente, l'entreprise évolue actuellement sous la trajectoire prévue.`,
      ytdFollowUp:
        "L'écart observé devra être suivi au cours des prochains mois afin d'évaluer si les objectifs de rentabilité demeurent réalistes ou si des ajustements seront nécessaires.",
      ttmBelow:
        "Bien que le BAIIA des derniers mois demeure légèrement inférieur au rythme prévu au budget, la trajectoire globale reste à analyser au regard de l'évolution des charges fixes.",
      ttmAboveOrAligned:
        "Le BAIIA sur douze mois glissants est conforme ou supérieur au rythme prévu au budget, ce qui traduit une amélioration continue de la rentabilité opérationnelle.",
    },
  },
} satisfies Record<keyof PilotagePerformanceMetricsBundle, PilotageMetricConfig>

function pctChange(current: number, base: number): number | null {
  if (Math.abs(base) < DATA_EPSILON) return null
  return ((current - base) / Math.abs(base)) * 100
}

function fmtPctSigned(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits).replace(".", ",")} %`
}

function fmtPctUnsigned(value: number, digits = 1): string {
  return `${Math.abs(value).toFixed(digits).replace(".", ",")} %`
}

function fmtPercentValue(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")} %`
}

function fmtPointsUnsigned(value: number, digits = 1): string {
  return `${Math.abs(value).toFixed(digits).replace(".", ",")} point${Math.abs(value) >= 2 ? "s" : ""}`
}

function monthNameLower(month: number): string {
  const names = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ] as const
  return names[month - 1] ?? `mois ${month}`
}

function formatEnMonthYear(month: number, year: number): string {
  return `En ${monthNameLower(month)} ${year}`
}

function momDirection(pct: number): "hausse" | "baisse" | "stabilité" {
  if (pct > 0.05) return "hausse"
  if (pct < -0.05) return "baisse"
  return "stabilité"
}

function pointDirection(delta: number): "hausse" | "baisse" | "stabilité" {
  if (delta > 0.05) return "hausse"
  if (delta < -0.05) return "baisse"
  return "stabilité"
}

function budgetGapPhrase(pct: number, scope: "mensuel" | "cumulatif" | "glissant"): string {
  const scopeLabel =
    scope === "mensuel"
      ? "budget mensuel établi"
      : scope === "cumulatif"
        ? "budget cumulatif"
        : "rythme prévu au budget"
  if (pct > 0.05) {
    return `supérieur de ${fmtPctUnsigned(pct)} au ${scopeLabel}`
  }
  if (pct < -0.05) {
    return `inférieur de ${fmtPctUnsigned(pct)} au ${scopeLabel}`
  }
  return `aligné sur le ${scopeLabel}`
}

function budgetGapPhrasePoints(delta: number, scope: "mensuel" | "cumulatif" | "glissant"): string {
  const scopeLabel =
    scope === "mensuel"
      ? "budget mensuel établi"
      : scope === "cumulatif"
        ? "budget cumulatif"
        : "rythme prévu au budget"
  if (delta > 0.05) {
    return `supérieure de ${fmtPointsUnsigned(delta)} au ${scopeLabel}`
  }
  if (delta < -0.05) {
    return `inférieure de ${fmtPointsUnsigned(delta)} au ${scopeLabel}`
  }
  return `alignée sur le ${scopeLabel}`
}

function formatMetricValue(value: number, kind: MetricValueKind): string {
  return kind === "currency" ? formatCurrency(value) : fmtPercentValue(value)
}

function subjectUsesPlural(label: string): boolean {
  return /^les /i.test(label.trim())
}

function establishVerb(label: string): string {
  return subjectUsesPlural(label) ? "s'établissent" : "s'établit"
}

function totalizeVerb(label: string): string {
  return subjectUsesPlural(label) ? "totalisent" : "totalise"
}

function attainVerb(label: string): string {
  return subjectUsesPlural(label) ? "atteignent" : "atteint"
}

function blockBase(config: PilotageMetricConfig): Pick<
  PerformanceNarrativeParagraph,
  "divisionBlockId" | "divisionTitle" | "heading" | "hideMainHeading" | "section" | "narrativePageGroup" | "showIndicatorTable"
> {
  return {
    divisionBlockId: config.blockId,
    divisionTitle: config.divisionTitle,
    heading: config.divisionTitle,
    hideMainHeading: true,
    section: config.section,
    narrativePageGroup: config.blockId,
    showIndicatorTable: false,
  }
}

function resolveBudgetValues(
  metricKey: keyof PilotagePerformanceMetricsBundle,
  budget: PilotagePerformanceBudgetSnapshot | null,
): { monthly: number; ytd: number; ttm: number | null } | null {
  if (!hasPilotagePerformanceBudget(budget)) return null
  if (metricKey === "revenue") {
    return {
      monthly: budget.revenue.monthlyRevenue,
      ytd: budget.revenue.ytdRevenue,
      ttm: budget.revenue.ttmRevenue ?? null,
    }
  }
  if (metricKey === "contributiveMargin") {
    return {
      monthly: budget.contributiveMargin.monthlyPercent,
      ytd: budget.contributiveMargin.ytdPercent,
      ttm: budget.contributiveMargin.ttmPercent ?? null,
    }
  }
  return {
    monthly: budget.ebita.monthlyEbita,
    ytd: budget.ebita.ytdEbita,
    ttm: budget.ebita.ttmEbita ?? null,
  }
}

function buildCurrentPerformanceParagraph(
  config: PilotageMetricConfig,
  metrics: PilotageScalarMetrics,
  budgetValues: { monthly: number; ytd: number; ttm: number | null } | null,
  showIndicatorTable = false,
): PerformanceNarrativeParagraph {
  const { reference, priorMonth, sameMonthPriorYear } = metrics
  const parts: string[] = [
    `${formatEnMonthYear(reference.month, reference.year)}, ${config.currentLabel} ${establishVerb(config.currentLabel)} à ${formatMetricValue(reference.value, config.valueKind)}`,
  ]

  if (priorMonth) {
    if (config.valueKind === "currency") {
      const mom = pctChange(reference.value, priorMonth.value)
      if (mom !== null && Math.abs(mom) > 0.05) {
        const dir = momDirection(mom)
        parts[0] += `, soit une ${dir} de ${fmtPctUnsigned(mom)} par rapport à ${monthNameLower(priorMonth.month)} ${priorMonth.year}`
      } else if (mom !== null) {
        parts[0] += `, en stabilité par rapport à ${monthNameLower(priorMonth.month)} ${priorMonth.year}`
      }
    } else {
      const delta = reference.value - priorMonth.value
      if (Math.abs(delta) > 0.05) {
        const dir = pointDirection(delta)
        parts[0] += `, soit une ${dir} de ${fmtPointsUnsigned(delta)} par rapport à ${monthNameLower(priorMonth.month)} ${priorMonth.year}`
      } else {
        parts[0] += `, en stabilité par rapport à ${monthNameLower(priorMonth.month)} ${priorMonth.year}`
      }
    }
  }
  parts[0] += "."

  if (sameMonthPriorYear) {
    if (config.valueKind === "currency") {
      const yoy = pctChange(reference.value, sameMonthPriorYear.value)
      if (yoy !== null) {
        parts.push(
          `Comparativement au même mois de l'exercice précédent, ${config.ytdSubject} ${config.yoyVerb(yoy)} toutefois de ${fmtPctUnsigned(yoy)}, témoignant de ${config.yoyNoun(yoy)}.`,
        )
      }
    } else {
      const delta = reference.value - sameMonthPriorYear.value
      if (Math.abs(delta) > 0.05) {
        parts.push(
          `Comparativement au même mois de l'exercice précédent, ${config.currentLabel} ${config.yoyVerb(delta)} de ${fmtPointsUnsigned(delta)}, témoignant de ${config.yoyNoun(delta)}.`,
        )
      } else {
        parts.push(
          `Comparativement au même mois de l'exercice précédent, ${config.currentLabel} demeure stable.`,
        )
      }
    }
  }

  if (budgetValues) {
    if (config.valueKind === "currency") {
      const vsBudget = pctChange(reference.value, budgetValues.monthly)
      if (vsBudget !== null) {
        if (vsBudget < -0.05) {
          parts.push(config.budget.currentBelow(budgetGapPhrase(vsBudget, "mensuel")))
          parts.push(
            "Cette situation devra être analysée afin de déterminer si l'écart résulte d'un report d'activité, d'une baisse des volumes, d'un effet saisonnier ou d'autres facteurs ponctuels.",
          )
        } else if (vsBudget > 0.05) {
          parts.push(config.budget.currentAbove(fmtPctUnsigned(vsBudget)))
        } else {
          parts.push(config.budget.currentAligned)
        }
      }
    } else {
      const delta = reference.value - budgetValues.monthly
      if (delta < -0.05) {
        parts.push(config.budget.currentBelow(budgetGapPhrasePoints(delta, "mensuel")))
        parts.push(
          "Cette situation devra être analysée afin de déterminer si l'écart résulte d'une hausse des coûts variables, d'un effet mix produit ou d'autres facteurs ponctuels.",
        )
      } else if (delta > 0.05) {
        parts.push(config.budget.currentAbove(fmtPointsUnsigned(delta)))
      } else {
        parts.push(config.budget.currentAligned)
      }
    }
  } else {
    parts.push(config.noBudgetCurrent)
    parts.push(config.noBudgetCurrentFollowUp)
  }

  return {
    ...blockBase(config),
    subsection: "Performance actuelle",
    body: parts.join(" "),
    showIndicatorTable,
  }
}

function buildYtdPerformanceParagraph(
  config: PilotageMetricConfig,
  metrics: PilotageScalarMetrics,
  budgetValues: { monthly: number; ytd: number; ttm: number | null } | null,
  showIndicatorTable = false,
): PerformanceNarrativeParagraph | null {
  if (!metrics.ytd) return null
  const { current, priorYear, fiscalYearLabel } = metrics.ytd

  const parts: string[] = []
  if (config.valueKind === "currency") {
    const yoy = pctChange(current, priorYear)
    parts.push(`Depuis le début de l'exercice, ${config.ytdSubject} ${totalizeVerb(config.ytdSubject)} ${formatCurrency(current)}`)
    if (Math.abs(priorYear) > DATA_EPSILON) {
      parts[0] += `, comparativement à ${formatCurrency(priorYear)} pour la même période en ${fiscalYearLabel - 1}`
      if (yoy !== null) {
        parts[0] += `, soit une croissance cumulative de ${fmtPctUnsigned(yoy)}`
      }
    }
    parts[0] += "."
  } else {
    parts.push(
      `Depuis le début de l'exercice, ${config.ytdSubject} s'établit à ${fmtPercentValue(current)} en cumulatif`,
    )
    if (priorYear !== null && Math.abs(priorYear) > DATA_EPSILON) {
      const delta = current - priorYear
      parts[0] += `, comparativement à ${fmtPercentValue(priorYear)} pour la même période en ${fiscalYearLabel - 1}`
      if (Math.abs(delta) > 0.05) {
        parts[0] += `, soit une variation de ${fmtPointsUnsigned(delta)}`
      }
    }
    parts[0] += "."
  }

  if (budgetValues) {
    if (config.valueKind === "currency") {
      const vsBudget = pctChange(current, budgetValues.ytd)
      if (vsBudget !== null) {
        parts.push(config.budget.ytdBelow(budgetGapPhrase(vsBudget, "cumulatif")))
        parts.push(config.budget.ytdFollowUp)
      }
    } else {
      const delta = current - budgetValues.ytd
      if (delta < -0.05) {
        parts.push(config.budget.ytdBelow(budgetGapPhrasePoints(delta, "cumulatif")))
        parts.push(config.budget.ytdFollowUp)
      } else if (delta > 0.05) {
        parts.push(
          `La contribution marginale cumulée dépasse de ${fmtPointsUnsigned(delta)} le budget établi, ce qui témoigne d'une rentabilité contributive supérieure aux objectifs.`,
        )
      } else {
        parts.push("La contribution marginale cumulée est alignée sur le budget établi pour la période.")
      }
    }
  } else {
    parts.push(config.noBudgetYtd)
    parts.push(config.noBudgetYtdFollowUp)
  }

  return {
    ...blockBase(config),
    subsection: "Performance de l'exercice (YTD)",
    body: parts.join(" "),
    showIndicatorTable,
  }
}

function buildTtmPerformanceParagraph(
  config: PilotageMetricConfig,
  metrics: PilotageScalarMetrics,
  budgetValues: { monthly: number; ytd: number; ttm: number | null } | null,
  showIndicatorTable = false,
): PerformanceNarrativeParagraph | null {
  if (!metrics.ttm) return null
  const { current, prior } = metrics.ttm

  const parts: string[] = []
  if (config.valueKind === "currency") {
    const growth = pctChange(current, prior)
    parts.push(`Sur une base glissante, ${config.ttmSubject} ${attainVerb(config.ttmSubject)} ${formatCurrency(current)}`)
    if (Math.abs(prior) > DATA_EPSILON) {
      parts[0] += `, comparativement à ${formatCurrency(prior)} pour les douze mois précédents`
      if (growth !== null) {
        parts[0] += `, représentant une croissance de ${fmtPctUnsigned(growth)}`
      }
    }
    parts[0] += "."
  } else {
    const delta = current - prior
    parts.push(`Sur une base glissante, ${config.ttmSubject} s'établit à ${fmtPercentValue(current)}`)
    if (Math.abs(prior) > DATA_EPSILON) {
      parts[0] += `, comparativement à ${fmtPercentValue(prior)} pour les douze mois précédents`
      if (Math.abs(delta) > 0.05) {
        parts[0] += `, soit une variation de ${fmtPointsUnsigned(delta)}`
      }
    }
    parts[0] += "."
  }

  parts.push(config.ttmTrendSentence)

  if (budgetValues?.ttm != null) {
    if (config.valueKind === "currency") {
      const vsBudget = pctChange(current, budgetValues.ttm)
      if (vsBudget !== null) {
        if (vsBudget < -0.05) {
          parts.push(config.budget.ttmBelow)
        } else {
          parts.push(config.budget.ttmAboveOrAligned)
        }
      }
    } else {
      const delta = current - budgetValues.ttm
      if (delta < -0.05) {
        parts.push(config.budget.ttmBelow)
      } else {
        parts.push(config.budget.ttmAboveOrAligned)
      }
    }
  } else {
    parts.push(config.noBudgetTtm)
    parts.push(config.noBudgetTtmFollowUp)
  }

  return {
    ...blockBase(config),
    subsection: "Tendance des 12 derniers mois",
    body: parts.join(" "),
    showIndicatorTable,
  }
}

function buildMetricParagraphs(
  metricKey: keyof PilotagePerformanceMetricsBundle,
  metrics: PilotageScalarMetrics,
  budget: PilotagePerformanceBudgetSnapshot | null,
): PerformanceNarrativeParagraph[] {
  const config = METRIC_CONFIGS[metricKey]
  const budgetValues = resolveBudgetValues(metricKey, budget)
  return buildPilotageScalarMetricParagraphs(config, metrics, budgetValues)
}

export function buildPilotageScalarMetricParagraphs(
  config: PilotageMetricConfig,
  metrics: PilotageScalarMetrics,
  budgetValues: { monthly: number; ytd: number; ttm: number | null } | null = null,
  options?: { showIndicatorTable?: boolean },
): PerformanceNarrativeParagraph[] {
  const showIndicatorTable = options?.showIndicatorTable ?? false
  return [
    buildCurrentPerformanceParagraph(config, metrics, budgetValues, showIndicatorTable),
    buildYtdPerformanceParagraph(config, metrics, budgetValues, showIndicatorTable),
    buildTtmPerformanceParagraph(config, metrics, budgetValues, showIndicatorTable),
  ].filter((p): p is PerformanceNarrativeParagraph => p !== null)
}

function slugifyRevenueSourceBlockId(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "source"
  )
}

export function createRevenueSourceMetricConfig(
  heading: string,
  metricLabel: string,
  blockId: string,
): PilotageMetricConfig {
  const title = heading.trim() || "Revenus"
  const label = metricLabel.trim() || "cette source de revenus"
  return {
    blockId,
    divisionTitle: title,
    section: "revenue-performance",
    valueKind: "currency",
    currentLabel: label,
    ytdSubject: label,
    ttmSubject: `${label} sur douze mois glissants`,
    yoyVerb: METRIC_CONFIGS.revenue.yoyVerb,
    yoyNoun: METRIC_CONFIGS.revenue.yoyNoun,
    ttmTrendSentence:
      "Cette évolution confirme que la dynamique observée ne repose pas uniquement sur le mois de référence, mais s'inscrit dans une tendance plus large depuis plusieurs mois.",
    noBudgetCurrent: `Aucun budget prévisionnel n'a été préparé pour ${label} : la comparaison aux objectifs fixés ne peut pas être effectuée pour le moment.`,
    noBudgetCurrentFollowUp:
      "L'évolution observée devra être suivie afin de déterminer si la dynamique récente reflète une tendance durable ou des facteurs ponctuels.",
    noBudgetYtd:
      "Aucun budget cumulatif n'est disponible pour évaluer l'écart par rapport aux objectifs fixés.",
    noBudgetYtdFollowUp:
      "La trajectoire de l'exercice devra être suivie au cours des prochains mois afin de confirmer la tendance observée.",
    noBudgetTtm:
      "En l'absence de budget de référence sur cet horizon, l'analyse se fonde sur la comparaison aux douze mois précédents.",
    noBudgetTtmFollowUp:
      "La trajectoire globale demeure à surveiller afin de confirmer la pérennité de la tendance observée.",
    budget: {
      currentBelow: (gap) =>
        `Malgré cette évolution, ${label} demeure ${gap}, ce qui indique que les objectifs fixés pour la période n'ont pas été entièrement atteints.`,
      currentAbove: (gap) =>
        `${label.charAt(0).toUpperCase()}${label.slice(1)} dépasse de ${gap} le budget mensuel établi, ce qui témoigne d'une performance supérieure aux objectifs fixés.`,
      currentAligned: `${label.charAt(0).toUpperCase()}${label.slice(1)} est aligné${subjectUsesPlural(label) ? "s" : ""} sur le budget mensuel établi pour la période.`,
      ytdBelow: (gap) =>
        `${label.charAt(0).toUpperCase()}${label.slice(1)} demeure toutefois ${gap}, ce qui signifie que, malgré une progression par rapport à l'année précédente, cette source évolue actuellement sous la trajectoire prévue.`,
      ytdFollowUp:
        "L'écart observé devra être suivi au cours des prochains mois afin d'évaluer si les objectifs annuels demeurent réalistes ou si des ajustements seront nécessaires.",
      ttmBelow:
        "Bien que les résultats des derniers mois demeurent légèrement inférieurs au rythme prévu au budget, la trajectoire globale de cette source reste à analyser.",
      ttmAboveOrAligned:
        "Les résultats sur douze mois glissants sont conformes ou supérieurs au rythme prévu au budget, ce qui traduit une amélioration continue de l'activité.",
    },
  }
}

export function createExpenseCostMetricConfig(
  divisionTitle: string,
  costLabel: string,
  blockId: string,
): PilotageMetricConfig {
  const label = costLabel.trim() || "ces coûts"
  const title = divisionTitle.trim() || "Coûts"
  return {
    blockId,
    divisionTitle: title,
    section: "revenue-performance",
    valueKind: "currency",
    currentLabel: label,
    ytdSubject: label,
    ttmSubject: `${label} des douze derniers mois`,
    yoyVerb: METRIC_CONFIGS.revenue.yoyVerb,
    yoyNoun: (pct: number) => {
      if (pct > 0.05) return "une hausse des charges"
      if (pct < -0.05) return "une baisse des charges"
      return "des charges stables"
    },
    ttmTrendSentence:
      "Cette évolution confirme que la dynamique observée ne repose pas uniquement sur le mois de référence, mais s'inscrit dans une tendance plus large sur les douze derniers mois.",
    noBudgetCurrent: `Aucun budget prévisionnel n'a été préparé pour ${label} : la comparaison aux objectifs fixés ne peut pas être effectuée pour le moment.`,
    noBudgetCurrentFollowUp:
      "L'évolution des charges devra être suivie afin de déterminer si la dynamique récente reflète une tendance durable ou des facteurs ponctuels.",
    noBudgetYtd:
      "Aucun budget cumulatif n'est disponible pour évaluer l'écart par rapport aux objectifs fixés.",
    noBudgetYtdFollowUp:
      "La trajectoire des charges devra être suivie au cours des prochains mois afin de confirmer la tendance observée.",
    noBudgetTtm:
      "En l'absence de budget de référence sur cet horizon, l'analyse se fonde sur la comparaison aux douze mois précédents.",
    noBudgetTtmFollowUp:
      "La trajectoire globale des charges demeure à surveiller afin de confirmer la pérennité de la tendance observée.",
    budget: {
      currentBelow: (gap) =>
        `Malgré cette évolution, ${label} demeurent ${gap}, ce qui indique que les objectifs de maîtrise des charges n'ont pas été entièrement atteints pour la période.`,
      currentAbove: (gap) =>
        `${label.charAt(0).toUpperCase()}${label.slice(1)} sont inférieurs de ${gap} au budget mensuel établi, ce qui témoigne d'une maîtrise des charges supérieure aux objectifs fixés.`,
      currentAligned: `${label.charAt(0).toUpperCase()}${label.slice(1)} sont alignés sur le budget mensuel établi pour la période.`,
      ytdBelow: (gap) =>
        `${label.charAt(0).toUpperCase()}${label.slice(1)} demeurent toutefois ${gap}, ce qui signifie que, malgré une évolution favorable par rapport à l'année précédente, l'entreprise évolue actuellement au-dessus de la trajectoire prévue.`,
      ytdFollowUp:
        "L'écart observé devra être suivi au cours des prochains mois afin d'évaluer si les objectifs de charges demeurent réalistes ou si des ajustements seront nécessaires.",
      ttmBelow:
        "Bien que les charges des derniers mois demeurent légèrement supérieures au rythme prévu au budget, la trajectoire globale reste à analyser au regard de l'évolution de l'activité.",
      ttmAboveOrAligned:
        "Les charges sur douze mois glissants sont conformes ou inférieures au rythme prévu au budget, ce qui traduit une maîtrise continue de la structure de coûts.",
    },
  }
}

export function buildRevenueSourcePerformanceParagraphs(
  heading: string,
  metricLabel: string,
  blockId: string,
  metrics: PilotageScalarMetrics,
): PerformanceNarrativeParagraph[] {
  const config = createRevenueSourceMetricConfig(heading, metricLabel, blockId)
  return buildPilotageScalarMetricParagraphs(config, metrics, null)
}

export function createRevenueSourceMarginMetricConfig(
  heading: string,
  metricLabel: string,
  blockId: string,
): PilotageMetricConfig {
  const title = `Marge contributive — ${heading.trim() || "Revenus"}`
  const label = metricLabel.trim() || "cette source de revenus"
  const marginSubject = `la marge contributive de ${label.replace(/^les? /, "")}`
  return {
    blockId,
    divisionTitle: title,
    section: "contributive-margin",
    valueKind: "percent",
    currentLabel: marginSubject,
    ytdSubject: marginSubject,
    ttmSubject: `${marginSubject} sur douze mois glissants`,
    yoyVerb: METRIC_CONFIGS.contributiveMargin.yoyVerb,
    yoyNoun: METRIC_CONFIGS.contributiveMargin.yoyNoun,
    ttmTrendSentence: METRIC_CONFIGS.contributiveMargin.ttmTrendSentence,
    noBudgetCurrent: `Aucun budget prévisionnel n'a été préparé pour ${marginSubject} : la comparaison aux objectifs fixés ne peut pas être effectuée pour le moment.`,
    noBudgetCurrentFollowUp: METRIC_CONFIGS.contributiveMargin.noBudgetCurrentFollowUp,
    noBudgetYtd: METRIC_CONFIGS.contributiveMargin.noBudgetYtd,
    noBudgetYtdFollowUp: METRIC_CONFIGS.contributiveMargin.noBudgetYtdFollowUp,
    noBudgetTtm: METRIC_CONFIGS.contributiveMargin.noBudgetTtm,
    noBudgetTtmFollowUp: METRIC_CONFIGS.contributiveMargin.noBudgetTtmFollowUp,
    budget: METRIC_CONFIGS.contributiveMargin.budget,
  }
}

export function buildRevenueSourceMarginPerformanceParagraphs(
  heading: string,
  metricLabel: string,
  blockId: string,
  metrics: PilotageScalarMetrics,
): PerformanceNarrativeParagraph[] {
  const config = createRevenueSourceMarginMetricConfig(heading, metricLabel, blockId)
  return buildPilotageScalarMetricParagraphs(config, metrics, null, { showIndicatorTable: true })
}

export function buildRevenueSourceBlockId(index: number, heading: string): string {
  return `revenue-source-${index}-${slugifyRevenueSourceBlockId(heading)}`
}

export function buildPilotagePerformanceParagraphs(
  bundle: PilotagePerformanceMetricsBundle,
  budget: PilotagePerformanceBudgetSnapshot | null,
): PerformanceNarrativeParagraph[] {
  return [
    ...buildMetricParagraphs("revenue", bundle.revenue, budget),
    ...buildMetricParagraphs("contributiveMargin", bundle.contributiveMargin, budget),
    ...buildMetricParagraphs("ebita", bundle.ebita, budget),
  ]
}

/** @deprecated Utiliser `buildPilotagePerformanceParagraphs` avec un bundle complet. */
export function buildPilotageRevenuePerformanceParagraphs(
  metrics: PilotageRevenueMetrics,
  budget: PilotageRevenueBudgetSnapshot | null,
): PerformanceNarrativeParagraph[] {
  const scalar: PilotageScalarMetrics = {
    reference: { month: metrics.reference.month, year: metrics.reference.year, value: metrics.reference.amount },
    priorMonth: metrics.priorMonth
      ? { month: metrics.priorMonth.month, year: metrics.priorMonth.year, value: metrics.priorMonth.amount }
      : null,
    sameMonthPriorYear: metrics.sameMonthPriorYear
      ? {
          month: metrics.sameMonthPriorYear.month,
          year: metrics.sameMonthPriorYear.year,
          value: metrics.sameMonthPriorYear.amount,
        }
      : null,
    ytd: metrics.ytd,
    ttm: metrics.ttm,
  }
  const fullBudget: PilotagePerformanceBudgetSnapshot | null = budget
    ? {
        revenue: budget,
        contributiveMargin: { monthlyPercent: 0, ytdPercent: 0 },
        ebita: { monthlyEbita: 0, ytdEbita: 0 },
      }
    : null
  return buildMetricParagraphs("revenue", scalar, fullBudget)
}
