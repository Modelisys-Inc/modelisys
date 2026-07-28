import { formatCurrency } from "@/lib/financial-utils"
import type { BuiltSeriesMeta, DynamicChartPoint } from "@/lib/performance-chart-series"
import { PERFORMANCE_CHART_QUARTER_COUNT, PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"

/** Points alignés sur le graphique Performance financière (revenus, marge, BAIIA). */
export type PerformanceNarrativePoint = {
  period: string
  revenue: number
  grossProfit: number
  ebita: number
  grossMarginPercent: number
}

export type PerformanceNarrativeParagraph = {
  heading: string
  body: string
  /** Paragraphe complémentaire (ex. trajectoire BAIIA vs revenus). */
  secondaryBody?: string
  /** Ligne de repères chiffrés (fourchette, moyenne, TCAC). */
  statsLine?: string
}

export type PerformanceNarrativeResult =
  | {
      mode: "sequential"
      title: string
      paragraphs: PerformanceNarrativeParagraph[]
    }
  | {
      mode: "annual"
      title: string
      subtitle: string
      referencePeriod: string
      paragraphs: PerformanceNarrativeParagraph[]
    }

const DATA_EPSILON = 1e-6

function pctChange(current: number, base: number): number | null {
  if (Math.abs(base) < DATA_EPSILON) return null
  return ((current - base) / Math.abs(base)) * 100
}

function fmtPct(p: number, digits = 1): string {
  const sign = p > 0 ? "+" : ""
  return `${sign}${p.toFixed(digits)} %`
}

function fmtPts(p: number, digits = 1): string {
  const sign = p > 0 ? "+" : ""
  return `${sign}${p.toFixed(digits)} pt${Math.abs(p) >= 2 ? "s" : ""}`
}

function trendWord(delta: number): "progression" | "recul" | "stabilité" {
  if (delta > 0.5) return "progression"
  if (delta < -0.5) return "recul"
  return "stabilité"
}

function horizonLabel(view: string): string {
  if (view === "quarters")
    return `les ${PERFORMANCE_CHART_QUARTER_COUNT} trimestres couverts sur le graphique`
  if (view === "years") return `les ${PERFORMANCE_CHART_YEAR_COUNT} années affichées`
  return "les douze derniers mois couverts"
}

function nearlyEqual(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps
}

function parsePeriodYear(period: string): number | null {
  const y = parseInt(period, 10)
  return Number.isFinite(y) ? y : null
}

/** Un exercice est retenu lorsque les revenus sont disponibles (proxy d'une balance exploitable). */
export function isAnnualExercisePresent(point: PerformanceNarrativePoint): boolean {
  return Math.abs(point.revenue) > DATA_EPSILON
}

type WindowStats = {
  min: number
  max: number
  mean: number
  minPeriod: string
  maxPeriod: string
}

type PresentSeries = {
  values: number[]
  periods: string[]
  excludedPeriods: string[]
}

function filterPresentAnnualSeries(
  points: PerformanceNarrativePoint[],
  pickValue: (p: PerformanceNarrativePoint) => number,
): PresentSeries {
  const excludedPeriods: string[] = []
  const values: number[] = []
  const periods: string[] = []

  for (const point of points) {
    if (!isAnnualExercisePresent(point)) {
      excludedPeriods.push(point.period)
      continue
    }
    values.push(pickValue(point))
    periods.push(point.period)
  }

  return { values, periods, excludedPeriods }
}

function windowStats(values: number[], periods: string[]): WindowStats | null {
  if (!values.length) return null
  let min = values[0]!
  let max = values[0]!
  let minIdx = 0
  let maxIdx = 0
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!
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
    mean: sum / values.length,
    minPeriod: periods[minIdx]!,
    maxPeriod: periods[maxIdx]!,
  }
}

/** TCAC : (fin/début)^(1/n) − 1, avec n = écart calendaire entre les deux exercices. */
export function computeCagr(latest: number, oldest: number, intervalCount: number): number | null {
  if (intervalCount <= 0) return null
  if (Math.abs(oldest) < DATA_EPSILON) return null
  if (oldest <= 0 || latest <= 0) return null
  return (Math.pow(latest / oldest, 1 / intervalCount) - 1) * 100
}

type CagrResult = {
  cagr: number | null
  fromPeriod: string
  toPeriod: string
  intervalCount: number
}

function computeCagrFromPresentSeries(values: number[], periods: string[]): CagrResult | null {
  if (values.length < 2) return null
  const latest = values[0]!
  const oldest = values[values.length - 1]!
  const latestYear = parsePeriodYear(periods[0]!)
  const oldestYear = parsePeriodYear(periods[periods.length - 1]!)
  const intervalCount =
    latestYear !== null && oldestYear !== null ? latestYear - oldestYear : values.length - 1
  if (intervalCount <= 0) return null
  return {
    cagr: computeCagr(latest, oldest, intervalCount),
    fromPeriod: periods[periods.length - 1]!,
    toPeriod: periods[0]!,
    intervalCount,
  }
}

function formatMetricValue(value: number, format: "currency" | "percent"): string {
  if (format === "percent") return `${value.toFixed(1)} %`
  return formatCurrency(value)
}

function scopeSentence(
  observationCount: number,
  periods: string[],
  excludedPeriods: string[],
): string {
  const from = periods[periods.length - 1]
  const to = periods[0]
  if (!from || !to) return "Sur la période analysée"
  const base = `Sur ${observationCount} exercice${observationCount > 1 ? "s" : ""} disposant de données (${from} à ${to})`
  if (!excludedPeriods.length) return base
  const excluded = excludedPeriods.join(", ")
  return `${base}; les exercices ${excluded} sont exclus de l'analyse faute de données exploitables`
}

function positionVsMeanSentence(latest: number, mean: number, format: "currency" | "percent"): string {
  const delta = latest - mean
  if (format === "percent") {
    if (Math.abs(delta) <= 0.05) return "Le niveau actuel est aligné sur la moyenne historique."
    if (delta > 0) return `Le niveau actuel dépasse la moyenne historique de ${fmtPts(delta)}.`
    return `Le niveau actuel se situe ${fmtPts(Math.abs(delta))} sous la moyenne historique.`
  }
  const rel = pctChange(latest, mean)
  if (rel === null || Math.abs(rel) <= 0.5) return "Le niveau actuel est proche de la moyenne historique."
  if (rel > 0) return `Le niveau actuel se situe ${fmtPct(rel)} au-dessus de la moyenne historique.`
  return `Le niveau actuel se situe ${fmtPct(Math.abs(rel))} sous la moyenne historique.`
}

function cagrSentence(cagr: CagrResult | null, format: "currency" | "percent"): string {
  if (!cagr) return ""
  if (format === "currency" && cagr.cagr !== null) {
    const dir = trendWord(cagr.cagr)
    const qualifier =
      dir === "progression"
        ? "une trajectoire de croissance"
        : dir === "recul"
          ? "une trajectoire de contraction"
          : "une évolution modérée"
    return `Le taux de croissance annualisé composé (TCAC) entre ${cagr.fromPeriod} et ${cagr.toPeriod} s'établit à ${fmtPct(cagr.cagr)}, traduisant ${qualifier} sur la période retenue.`
  }
  return ""
}

function buildStatsLine(
  stats: WindowStats,
  format: "currency" | "percent",
  cagr: CagrResult | null,
  marginAnnualizedPts: number | null,
): string {
  const parts = [
    `Fourchette : ${formatMetricValue(stats.min, format)} (${stats.minPeriod}) – ${formatMetricValue(stats.max, format)} (${stats.maxPeriod})`,
    `Moyenne : ${formatMetricValue(stats.mean, format)}`,
  ]
  if (cagr?.cagr !== null && cagr) parts.push(`TCAC : ${fmtPct(cagr.cagr)}`)
  if (marginAnnualizedPts !== null) parts.push(`Évol. annualisée : ${fmtPts(marginAnnualizedPts)}/an`)
  return parts.join(" · ")
}

function buildCurrencyAnnualParagraph(
  heading: string,
  label: string,
  format: "currency",
  points: PerformanceNarrativePoint[],
  pickValue: (p: PerformanceNarrativePoint) => number,
): PerformanceNarrativeParagraph | null {
  const { values, periods, excludedPeriods } = filterPresentAnnualSeries(points, pickValue)
  const stats = windowStats(values, periods)
  if (!stats || !values.length) return null

  const latest = values[0]!
  const prior = values.length > 1 ? values[1]! : null
  const priorPeriod = values.length > 1 ? periods[1]! : null
  const cagr = computeCagrFromPresentSeries(values, periods)
  const scope = scopeSentence(values.length, periods, excludedPeriods)

  const sentences: string[] = [
    `${scope}, ${label} s'établit à ${formatMetricValue(latest, format)} pour l'exercice ${periods[0]}.`,
    `La fourchette observée s'étend de ${formatMetricValue(stats.min, format)} en ${stats.minPeriod} (fourchette basse) à ${formatMetricValue(stats.max, format)} en ${stats.maxPeriod} (fourchette haute), pour une moyenne de ${formatMetricValue(stats.mean, format)} sur les exercices retenus.`,
    positionVsMeanSentence(latest, stats.mean, format),
  ]

  if (cagr) {
    const cagrText = cagrSentence(cagr, format)
    if (cagrText) sentences.push(cagrText)
  } else if (values.length >= 2) {
    sentences.push(
      "Le TCAC n'a pas été calculé : les valeurs de début ou de fin de période ne permettent pas une croissance annualisée composée significative.",
    )
  }

  if (prior !== null && priorPeriod) {
    const yoy = pctChange(latest, prior)
    if (yoy !== null) {
      const dir = trendWord(yoy)
      sentences.push(
        dir === "stabilité"
          ? `En glissement annuel, ${label} est stable par rapport à ${priorPeriod} (${formatMetricValue(prior, format)}).`
          : `En glissement annuel, ${label} affiche une ${dir} de ${fmtPct(Math.abs(yoy))} par rapport à ${priorPeriod} (${formatMetricValue(prior, format)}).`,
      )
    }
  }

  if (nearlyEqual(latest, stats.max)) {
    sentences.push(`À la date de référence, ${label} atteint le plus haut niveau de la période analysée.`)
  } else if (nearlyEqual(latest, stats.min)) {
    sentences.push(`À la date de référence, ${label} se situe au plus bas de la période analysée.`)
  }

  return {
    heading,
    body: sentences.join(" "),
    statsLine: buildStatsLine(stats, format, cagr, null),
  }
}

function buildMarginAnnualParagraph(points: PerformanceNarrativePoint[]): PerformanceNarrativeParagraph | null {
  const { values, periods, excludedPeriods } = filterPresentAnnualSeries(
    points,
    (p) => p.grossMarginPercent,
  )
  const grossProfits = filterPresentAnnualSeries(points, (p) => p.grossProfit)
  const stats = windowStats(values, periods)
  if (!stats || !values.length) return null

  const latest = values[0]!
  const latestGp = grossProfits.values[0]!
  const prior = values.length > 1 ? values[1]! : null
  const priorPeriod = values.length > 1 ? periods[1]! : null
  const oldest = values[values.length - 1]!
  const gpCagr = computeCagrFromPresentSeries(grossProfits.values, grossProfits.periods)
  const scope = scopeSentence(values.length, periods, excludedPeriods)

  const marginAnnualizedPts =
    gpCagr && gpCagr.intervalCount > 0 ? (latest - oldest) / gpCagr.intervalCount : null

  const sentences: string[] = [
    `${scope}, la marge brute rapportée aux revenus s'affiche à ${latest.toFixed(1)} % pour l'exercice ${periods[0]}, soit un bénéfice brut de ${formatCurrency(latestGp)}.`,
    `Sur les exercices retenus, la marge évolue entre ${stats.min.toFixed(1)} % en ${stats.minPeriod} (fourchette basse) et ${stats.max.toFixed(1)} % en ${stats.maxPeriod} (fourchette haute), pour une moyenne de ${stats.mean.toFixed(1)} %.`,
    positionVsMeanSentence(latest, stats.mean, "percent"),
  ]

  if (gpCagr?.cagr !== null && gpCagr) {
    sentences.push(
      `Le bénéfice brut progresse à un TCAC de ${fmtPct(gpCagr.cagr!)} entre ${gpCagr.fromPeriod} et ${gpCagr.toPeriod}, indicateur de la dynamique sous-jacente du volume et de la marge.`,
    )
  }

  if (marginAnnualizedPts !== null && gpCagr && gpCagr.intervalCount > 0) {
    const dir = trendWord(marginAnnualizedPts)
    sentences.push(
      dir === "stabilité"
        ? `La marge brute demeure stable en moyenne (${fmtPts(marginAnnualizedPts)}/an) sur la période retenue.`
        : `La marge brute affiche une ${dir} moyenne de ${fmtPts(Math.abs(marginAnnualizedPts))} par année sur la période retenue.`,
    )
  }

  if (prior !== null && priorPeriod) {
    const delta = latest - prior
    if (Math.abs(delta) > 0.05) {
      sentences.push(
        `Par rapport à ${priorPeriod}, la marge ${delta > 0 ? "s'améliore" : "se détériore"} de ${fmtPts(Math.abs(delta))}.`,
      )
    } else {
      sentences.push(`Par rapport à ${priorPeriod}, la marge demeure stable.`)
    }
  }

  if (nearlyEqual(latest, stats.max, 0.05)) {
    sentences.push("À la date de référence, la marge brute constitue le niveau le plus élevé de la fenêtre analysée.")
  } else if (nearlyEqual(latest, stats.min, 0.05)) {
    sentences.push("À la date de référence, la marge brute se situe à son niveau le plus bas sur la période retenue.")
  }

  return {
    heading: "Marge brute",
    body: sentences.join(" "),
    statsLine: buildStatsLine(stats, "percent", gpCagr, marginAnnualizedPts),
  }
}

/** Compare la trajectoire du BAIIA à celle des revenus (TCAC, ratio opérationnel, glissement annuel). */
export function buildBaiiaVsRevenueTrajectoryParagraph(
  points: PerformanceNarrativePoint[],
): string | null {
  const rev = filterPresentAnnualSeries(points, (p) => p.revenue)
  const ebita = filterPresentAnnualSeries(points, (p) => p.ebita)
  if (rev.values.length < 2 || ebita.values.length < 2) return null

  const revCagr = computeCagrFromPresentSeries(rev.values, rev.periods)
  const ebitaCagr = computeCagrFromPresentSeries(ebita.values, ebita.periods)

  const latestRev = rev.values[0]!
  const latestEbita = ebita.values[0]!
  const oldestRev = rev.values[rev.values.length - 1]!
  const oldestEbita = ebita.values[ebita.values.length - 1]!

  const latestRatio = Math.abs(latestRev) > DATA_EPSILON ? (latestEbita / latestRev) * 100 : null
  const oldestRatio = Math.abs(oldestRev) > DATA_EPSILON ? (oldestEbita / oldestRev) * 100 : null
  const ratioDelta =
    latestRatio !== null && oldestRatio !== null ? latestRatio - oldestRatio : null

  const sentences: string[] = []

  if (revCagr?.cagr !== null && ebitaCagr?.cagr !== null) {
    const revC = revCagr.cagr!
    const ebitaC = ebitaCagr.cagr!
    const spread = ebitaC - revC

    sentences.push(
      `Comparativement au chiffre d'affaires, le TCAC du BAIIA (${fmtPct(ebitaC)}) se mesure face à celui des revenus (${fmtPct(revC)}) sur la période ${revCagr.fromPeriod}–${revCagr.toPeriod}.`,
    )

    if (Math.abs(spread) <= 0.5) {
      sentences.push(
        "Les deux trajectoires sont alignées : la rentabilité opérationnelle évolue au même rythme que le volume d'affaires.",
      )
    } else if (spread > 0.5) {
      sentences.push(
        `Le BAIIA croît plus vite que les revenus (écart de ${fmtPct(spread)}), ce qui traduit un effet de levier opérationnel favorable ou une meilleure absorption des charges fixes.`,
      )
    } else {
      sentences.push(
        `Le BAIIA croît moins vite que les revenus (écart de ${fmtPct(Math.abs(spread))}), ce qui peut signaler une pression sur la marge opérationnelle ou une hausse des charges en proportion plus élevée que la croissance des ventes.`,
      )
    }
  } else if (rev.values.length >= 2) {
    const revTotal = pctChange(latestRev, oldestRev)
    const ebitaTotal = pctChange(latestEbita, oldestEbita)
    if (revTotal !== null && ebitaTotal !== null) {
      sentences.push(
        `Sur la période ${rev.periods[rev.periods.length - 1]}–${rev.periods[0]}, les revenus évoluent de ${fmtPct(revTotal)} tandis que le BAIIA évolue de ${fmtPct(ebitaTotal)} (un TCAC n'a pas pu être calculé sur des valeurs non positives).`,
      )
    }
  }

  if (ratioDelta !== null && Math.abs(ratioDelta) >= 0.1) {
    if (ratioDelta > 0) {
      sentences.push(
        `Le ratio BAIIA / revenus progresse de ${oldestRatio!.toFixed(1)} % à ${latestRatio!.toFixed(1)} %, confirmant une amélioration de la rentabilité opérationnelle rapportée aux ventes.`,
      )
    } else {
      sentences.push(
        `Le ratio BAIIA / revenus recule de ${oldestRatio!.toFixed(1)} % à ${latestRatio!.toFixed(1)} %, signal d'une érosion de la marge opérationnelle malgré l'évolution du volume.`,
      )
    }
  } else if (latestRatio !== null && oldestRatio !== null) {
    sentences.push(
      `Le ratio BAIIA / revenus demeure stable autour de ${latestRatio.toFixed(1)} % sur la période analysée.`,
    )
  }

  const revYoy = pctChange(rev.values[0]!, rev.values[1]!)
  const ebitaYoy = pctChange(ebita.values[0]!, ebita.values[1]!)
  if (revYoy !== null && ebitaYoy !== null) {
    if (ebitaYoy > revYoy + 0.5) {
      sentences.push(
        `À la date de référence (${rev.periods[0]}), le BAIIA progresse plus vite que les revenus (${fmtPct(ebitaYoy)} vs ${fmtPct(revYoy)}), ce qui conforte une amélioration opérationnelle récente.`,
      )
    } else if (ebitaYoy < revYoy - 0.5) {
      sentences.push(
        `À la date de référence (${rev.periods[0]}), la croissance du BAIIA (${fmtPct(ebitaYoy)}) retarde celle des revenus (${fmtPct(revYoy)}), une tendance à surveiller si elle se poursuit.`,
      )
    } else {
      sentences.push(
        `À la date de référence (${rev.periods[0]}), le BAIIA et les revenus évoluent de concert (${fmtPct(ebitaYoy)} et ${fmtPct(revYoy)} respectivement).`,
      )
    }
  }

  return sentences.length ? sentences.join(" ") : null
}

function buildBaiiaAnnualParagraph(points: PerformanceNarrativePoint[]): PerformanceNarrativeParagraph | null {
  const base = buildCurrencyAnnualParagraph("BAIIA", "le BAIIA", "currency", points, (p) => p.ebita)
  if (!base) return null
  const secondaryBody = buildBaiiaVsRevenueTrajectoryParagraph(points)
  return secondaryBody ? { ...base, secondaryBody } : base
}

function buildAnnualPerformanceNarrative(data: PerformanceNarrativePoint[]): PerformanceNarrativeResult {
  const present = data.filter(isAnnualExercisePresent)
  const referencePeriod = present[0]?.period ?? data[0]?.period ?? ""

  const paragraphs = [
    buildCurrencyAnnualParagraph(
      "Revenus",
      "le chiffre d'affaires",
      "currency",
      data,
      (p) => p.revenue,
    ),
    buildMarginAnnualParagraph(data),
    buildBaiiaAnnualParagraph(data),
  ].filter((p): p is PerformanceNarrativeParagraph => p !== null)

  return {
    mode: "annual",
    title: "Lecture de la performance",
    subtitle: "Analyse pluriannuelle — lecture financière à la date de référence",
    referencePeriod,
    paragraphs,
  }
}

/**
 * Heuristique pour réutiliser la synthèse textuelle : 1er histogramme = revenus, 2e = BAIIA,
 * 1re courbe au format ratio = marge % — aligné sur la config par défaut.
 */
export function mapDynamicChartToNarrativePoints(
  points: DynamicChartPoint[],
  seriesMeta: BuiltSeriesMeta[],
): PerformanceNarrativePoint[] | null {
  if (!points.length || !seriesMeta.length) return null
  const bars = seriesMeta.filter((s) => s.kind === "bar")
  const marginLine = seriesMeta.find((s) => s.kind === "line" && s.valueFormat === "ratio")

  if (bars.length < 2 || !marginLine) return null

  const kRev = bars[0]!.dataKey
  const kEbita = bars[1]!.dataKey
  const kMargin = marginLine.dataKey

  return points.map((p) => {
    const row = p as Record<string, string | number>
    const revenue = Number(row[kRev] ?? 0)
    const ebita = Number(row[kEbita] ?? 0)
    const grossMarginPercent = Number(row[kMargin] ?? 0)
    const grossProfit = revenue * (grossMarginPercent / 100)
    return {
      period: String(row.period ?? ""),
      revenue,
      grossProfit,
      ebita,
      grossMarginPercent,
    }
  })
}

function buildSequentialPerformanceNarrative(
  data: PerformanceNarrativePoint[],
  view: string,
): PerformanceNarrativeResult {
  const latest = data[0]!
  const prior = data.length > 1 ? data[1]! : null
  const oldest = data.length > 1 ? data[data.length - 1]! : latest
  const horizon = horizonLabel(view)

  const revSeq = prior ? pctChange(latest.revenue, prior.revenue) : null
  const revWindow =
    data.length > 1 && Math.abs(oldest.revenue) > DATA_EPSILON
      ? pctChange(latest.revenue, oldest.revenue)
      : null

  let revenueText = ""
  if (prior && revSeq !== null) {
    const dir = trendWord(revSeq)
    revenueText =
      dir === "stabilité"
        ? `Pour ${latest.period}, les revenus s'établissent à ${formatCurrency(latest.revenue)}, en quasi-stabilité par rapport à ${prior.period} (${formatCurrency(prior.revenue)}).`
        : `Pour ${latest.period}, les revenus s'établissent à ${formatCurrency(latest.revenue)}, en ${dir} de ${fmtPct(Math.abs(revSeq))} par rapport à ${prior.period} (${formatCurrency(prior.revenue)}).`
  } else if (prior && revSeq === null && Math.abs(prior.revenue) < DATA_EPSILON && Math.abs(latest.revenue) > DATA_EPSILON) {
    revenueText = `Pour ${latest.period}, les revenus s'établissent à ${formatCurrency(latest.revenue)}, à la suite d'une base quasi nulle en ${prior.period}.`
  } else {
    revenueText = `Pour ${latest.period}, les revenus s'établissent à ${formatCurrency(latest.revenue)}.`
  }
  if (revWindow !== null && data.length > 2 && Math.abs(revWindow) > 0.5) {
    const w = trendWord(revWindow)
    revenueText += ` Sur ${horizon}, le niveau le plus récent se distingue du début de fenêtre (${oldest.period}) par une ${w === "stabilité" ? "évolution modérée" : w === "progression" ? "progression" : "contraction"} (${fmtPct(revWindow)} en variation relative).`
  } else if (data.length > 2) {
    revenueText += ` La lecture sur ${horizon} reste à contextualiser avec le calendrier commercial et les effets de base.`
  }

  const gpSeq =
    prior && Math.abs(prior.grossProfit) > DATA_EPSILON
      ? pctChange(latest.grossProfit, prior.grossProfit)
      : null
  const marginDelta = prior !== null ? latest.grossMarginPercent - prior.grossMarginPercent : null

  let marginText = ""
  if (prior && marginDelta !== null) {
    const pp = marginDelta >= 0 ? "+" : ""
    marginText = `La marge brute rapportée aux revenus s'affiche à ${latest.grossMarginPercent.toFixed(1)} % pour ${latest.period}, contre ${prior.grossMarginPercent.toFixed(1)} % pour ${prior.period} (${pp}${marginDelta.toFixed(1)} point${Math.abs(marginDelta) >= 2 ? "s" : ""} de pourcentage). `
  } else {
    marginText = `La marge brute rapportée aux revenus s'affiche à ${latest.grossMarginPercent.toFixed(1)} % pour ${latest.period}. `
  }
  if (gpSeq !== null) {
    const t = trendWord(gpSeq)
    marginText +=
      t === "stabilité"
        ? `Le bénéfice brut absolu est stable d'une période à l'autre (${formatCurrency(latest.grossProfit)}).`
        : `Le bénéfice brut affiche une ${t} de ${fmtPct(Math.abs(gpSeq))} en séquentiel (${formatCurrency(latest.grossProfit)} vs ${formatCurrency(prior!.grossProfit)}).`
  } else {
    marginText += `Le bénéfice brut s'élève à ${formatCurrency(latest.grossProfit)}.`
  }
  if (prior && latest.revenue > 0 && prior.revenue > 0) {
    const absLatest = latest.grossProfit
    const absPrior = prior.grossProfit
    if (
      (latest.revenue > prior.revenue && absLatest < absPrior) ||
      (latest.revenue < prior.revenue && absLatest > absPrior)
    ) {
      marginText +=
        " L'écart entre volume et marge invite à vérifier le mix produit / client et le coût des ventes."
    }
  }

  const ebitaSeq =
    prior && Math.abs(prior.ebita) > DATA_EPSILON
      ? pctChange(latest.ebita, prior.ebita)
      : prior
        ? pctChange(latest.ebita, prior.ebita)
        : null
  const ebitaRatioLatest = Math.abs(latest.revenue) > DATA_EPSILON ? (latest.ebita / latest.revenue) * 100 : null
  const ebitaRatioPrior =
    prior && Math.abs(prior.revenue) > DATA_EPSILON ? (prior.ebita / prior.revenue) * 100 : null

  let ebitaText = ""
  if (prior && ebitaSeq !== null && Math.abs(prior.ebita) > DATA_EPSILON) {
    const dir = trendWord(ebitaSeq)
    ebitaText =
      dir === "stabilité"
        ? `Le BAIIA ressort à ${formatCurrency(latest.ebita)} pour ${latest.period}, proche du niveau de ${prior.period} (${formatCurrency(prior.ebita)}).`
        : `Le BAIIA ressort à ${formatCurrency(latest.ebita)} pour ${latest.period}, en ${dir} de ${fmtPct(Math.abs(ebitaSeq))} par rapport à ${prior.period} (${formatCurrency(prior.ebita)}).`
  } else if (prior) {
    ebitaText = `Le BAIIA ressort à ${formatCurrency(latest.ebita)} pour ${latest.period}, à comparer à ${formatCurrency(prior.ebita)} pour ${prior.period}.`
  } else {
    ebitaText = `Le BAIIA ressort à ${formatCurrency(latest.ebita)} pour ${latest.period}.`
  }
  if (ebitaRatioLatest !== null) {
    ebitaText += ` Il représente environ ${ebitaRatioLatest.toFixed(1)} % des revenus`
    if (ebitaRatioPrior !== null && prior) {
      const rDelta = ebitaRatioLatest - ebitaRatioPrior
      if (Math.abs(rDelta) >= 0.1) {
        ebitaText += ` (${rDelta >= 0 ? "+" : ""}${rDelta.toFixed(1)} point${Math.abs(rDelta) >= 1 ? "s" : ""} de marge opérationnelle rapportée aux revenus vs ${prior.period})`
      }
    }
    ebitaText += "."
  }

  return {
    mode: "sequential",
    title: "Lecture de la performance",
    paragraphs: [
      { heading: "Évolution des revenus", body: revenueText },
      { heading: "Évolution de la marge brute", body: marginText },
      { heading: "Évolution du BAIIA", body: ebitaText },
    ],
  }
}

/**
 * Synthèse à partir des séries du graphique Performance financière.
 * Vue annuelle : analyse CPA sur exercices avec données uniquement.
 * Autres horizons : paragraphes séquentiels.
 */
export function buildIncomePerformanceNarrative(
  data: PerformanceNarrativePoint[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!data.length) return null
  if (view === "years") return buildAnnualPerformanceNarrative(data)
  return buildSequentialPerformanceNarrative(data, view)
}
