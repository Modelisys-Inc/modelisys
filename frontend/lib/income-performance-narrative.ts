import { formatCurrency } from "@/lib/financial-utils"
import type { BuiltSeriesMeta, DynamicChartPoint } from "@/lib/performance-chart-series"
import { PERFORMANCE_CHART_MONTH_COUNT_24, PERFORMANCE_CHART_QUARTER_COUNT, PERFORMANCE_CHART_YEAR_COUNT } from "@/lib/performance-chart-series"

/** Points alignés sur le graphique Performance financière (revenus, marge, BAIIA). */
export type PerformanceNarrativePoint = {
  period: string
  revenue: number
  grossProfit: number
  ebita: number
  grossMarginPercent: number
  /** Coûts variables rattachés via le mapping comptable (vue Revenus). */
  variableCost?: number
}

export type NarrativeParagraphSection =
  | "revenue-performance"
  | "contributive-margin"
  | "division-profitability"
  | "revenue-mix"

export type PerformanceNarrativeParagraph = {
  heading: string
  body: string
  /** Regroupement visuel sous « Lecture de la performance ». */
  section?: NarrativeParagraphSection
  /** Paragraphe complémentaire (ex. trajectoire BAIIA vs revenus). */
  secondaryBody?: string
  /** Lecture saisonnière (horizon mensuel 24 mois). */
  seasonalityBody?: string
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
  | {
      mode: "monthly"
      title: string
      subtitle: string
      referencePeriod: string
      paragraphs: PerformanceNarrativeParagraph[]
    }

type WindowCagrMode = "calendar-years" | "months-annualized"

type WindowNarrativeCopy = {
  periodUnit: string
  periodUnitPlural: string
  referenceForPeriod: (period: string) => string
  priorComparisonLabel: string
  subtitle: string
  cagrMode: WindowCagrMode
  marginTrendLabel: string
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

const ANNUAL_COPY: WindowNarrativeCopy = {
  periodUnit: "exercice",
  periodUnitPlural: "exercices",
  referenceForPeriod: (period) => `l'exercice ${period}`,
  priorComparisonLabel: "En glissement annuel",
  subtitle: "Analyse pluriannuelle — lecture financière à la date de référence",
  cagrMode: "calendar-years",
  marginTrendLabel: "/an",
}

const MONTHLY_COPY: WindowNarrativeCopy = {
  periodUnit: "mois",
  periodUnitPlural: "mois",
  referenceForPeriod: (period) => `le mois de ${period}`,
  priorComparisonLabel: "Par rapport au mois précédent",
  subtitle: `Analyse sur ${PERFORMANCE_CHART_MONTH_COUNT_24} mois — lecture financière à la date de référence`,
  cagrMode: "months-annualized",
  marginTrendLabel: "/an (annualisé)",
}

/** Abrégés alignés sur `monthShortLabelsFromReference` (Jan, Fév, …). */
const CHART_MONTH_ABBREVS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Jun",
  "Jul",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
] as const

const FRENCH_MONTH_NAMES = [
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

export function parseChartMonthPeriod(period: string): { month: number; year: number } | null {
  const parts = period.trim().split(/\s+/)
  if (parts.length < 2) return null
  const year = parseInt(parts[parts.length - 1]!, 10)
  if (!Number.isFinite(year)) return null
  const abbrev = parts[0]!
  const monthIdx = CHART_MONTH_ABBREVS.findIndex((a) => a.toLowerCase() === abbrev.toLowerCase())
  if (monthIdx < 0) return null
  return { month: monthIdx + 1, year }
}

function monthName(month: number): string {
  return FRENCH_MONTH_NAMES[month - 1] ?? `mois ${month}`
}

function formatSeasonalityValue(value: number, format: "currency" | "percent"): string {
  if (format === "percent") return `${value.toFixed(1)} %`
  return formatCurrency(value)
}

/**
 * Lecture saisonnière sur 24 mois : moyennes par mois calendaire, pic / creux,
 * position du mois de référence vs sa moyenne saisonnière, comparaison homologue N-1.
 */
export function buildSeasonalityParagraph(
  periods: string[],
  values: number[],
  format: "currency" | "percent",
  metricLabel: string,
): string | null {
  if (periods.length < 12 || values.length !== periods.length) return null

  const byCalendarMonth = new Map<number, number[]>()
  const parsed: { month: number; year: number; value: number; period: string }[] = []

  for (let i = 0; i < periods.length; i++) {
    const meta = parseChartMonthPeriod(periods[i]!)
    if (!meta) continue
    parsed.push({ ...meta, value: values[i]!, period: periods[i]! })
    const bucket = byCalendarMonth.get(meta.month) ?? []
    bucket.push(values[i]!)
    byCalendarMonth.set(meta.month, bucket)
  }

  const recurringMonths = [...byCalendarMonth.entries()].filter(([, v]) => v.length >= 2)
  if (recurringMonths.length < 3) return null

  const monthlyAverages = [...byCalendarMonth.entries()]
    .map(([month, vals]) => ({
      month,
      name: monthName(month),
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
      count: vals.length,
    }))
    .sort((a, b) => b.mean - a.mean)

  const peak = monthlyAverages[0]!
  const trough = monthlyAverages[monthlyAverages.length - 1]!
  const spreadPct =
    Math.abs(trough.mean) > DATA_EPSILON
      ? ((peak.mean - trough.mean) / Math.abs(trough.mean)) * 100
      : null

  const sentences: string[] = [
    `Sur les ${PERFORMANCE_CHART_MONTH_COUNT_24} derniers mois, la saisonnalité de ${metricLabel} fait ressortir un pic récurrent en ${peak.name} (moyenne de ${formatSeasonalityValue(peak.mean, format)}) et un creux en ${trough.name} (moyenne de ${formatSeasonalityValue(trough.mean, format)}).`,
  ]

  if (spreadPct !== null && Math.abs(spreadPct) >= 1) {
    sentences.push(
      `L'écart entre ces deux extrêmes saisonniers représente environ ${fmtPct(spreadPct)} en variation relative.`,
    )
  }

  const ref = parsed[0]
  if (ref) {
    const seasonalBucket = byCalendarMonth.get(ref.month) ?? []
    const seasonalMean =
      seasonalBucket.length > 0
        ? seasonalBucket.reduce((a, b) => a + b, 0) / seasonalBucket.length
        : null
    if (seasonalMean !== null && seasonalBucket.length >= 2) {
      const vsSeasonal = pctChange(ref.value, seasonalMean)
      if (vsSeasonal !== null && Math.abs(vsSeasonal) > 0.5) {
        sentences.push(
          vsSeasonal > 0
            ? `À la date de référence (${ref.period}), le niveau observé (${formatSeasonalityValue(ref.value, format)}) dépasse la moyenne saisonnière de ${monthName(ref.month)} (${formatSeasonalityValue(seasonalMean, format)}, sur ${seasonalBucket.length} observations) de ${fmtPct(vsSeasonal)}.`
            : `À la date de référence (${ref.period}), le niveau observé (${formatSeasonalityValue(ref.value, format)}) se situe ${fmtPct(Math.abs(vsSeasonal))} sous la moyenne saisonnière de ${monthName(ref.month)} (${formatSeasonalityValue(seasonalMean, format)}, sur ${seasonalBucket.length} observations).`,
        )
      } else if (seasonalMean !== null) {
        sentences.push(
          `À la date de référence (${ref.period}), le niveau observé est aligné sur la moyenne saisonnière de ${monthName(ref.month)} (${formatSeasonalityValue(seasonalMean, format)}).`,
        )
      }
    }

    const priorYear = parsed.find((p) => p.month === ref.month && p.year === ref.year - 1)
    if (priorYear) {
      const yoy =
        format === "percent"
          ? ref.value - priorYear.value
          : pctChange(ref.value, priorYear.value)
      if (yoy !== null && (format === "percent" ? Math.abs(yoy) > 0.05 : Math.abs(yoy) > 0.5)) {
        sentences.push(
          format === "percent"
            ? `En comparaison homologue (${ref.period} vs ${priorYear.period}), ${metricLabel} ${yoy > 0 ? "progresse" : "recule"} de ${fmtPts(Math.abs(yoy))}.`
            : `En comparaison homologue (${ref.period} vs ${priorYear.period}), ${metricLabel} affiche une ${trendWord(yoy)} de ${fmtPct(Math.abs(yoy))}.`,
        )
      } else {
        sentences.push(
          `En comparaison homologue (${ref.period} vs ${priorYear.period}), ${metricLabel} demeure stable.`,
        )
      }
    }
  }

  return sentences.length ? sentences.join(" ") : null
}

function attachSeasonalityBody(
  paragraph: PerformanceNarrativeParagraph,
  points: PerformanceNarrativePoint[],
  pickValue: (p: PerformanceNarrativePoint) => number,
  format: "currency" | "percent",
  metricLabel: string,
  copy: WindowNarrativeCopy,
): PerformanceNarrativeParagraph {
  if (copy.cagrMode !== "months-annualized") return paragraph
  const { values, periods } = filterPresentSeries(points, pickValue)
  const seasonalityBody = buildSeasonalityParagraph(periods, values, format, metricLabel)
  return seasonalityBody ? { ...paragraph, seasonalityBody } : paragraph
}

/** Un point est retenu lorsque les revenus sont disponibles (proxy d'une balance exploitable). */
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

function filterPresentSeries(
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

/** TCAC annualisé à partir d'une fenêtre mensuelle (n = nombre de mois entre début et fin). */
export function computeAnnualizedCagrFromMonths(
  latest: number,
  oldest: number,
  monthCount: number,
): number | null {
  if (monthCount <= 0) return null
  if (Math.abs(oldest) < DATA_EPSILON) return null
  if (oldest <= 0 || latest <= 0) return null
  return (Math.pow(latest / oldest, 12 / monthCount) - 1) * 100
}

function computeCagrFromPresentSeries(
  values: number[],
  periods: string[],
  cagrMode: WindowCagrMode,
): CagrResult | null {
  if (values.length < 2) return null
  const latest = values[0]!
  const oldest = values[values.length - 1]!
  let intervalCount: number
  if (cagrMode === "calendar-years") {
    const latestYear = parsePeriodYear(periods[0]!)
    const oldestYear = parsePeriodYear(periods[periods.length - 1]!)
    intervalCount =
      latestYear !== null && oldestYear !== null ? latestYear - oldestYear : values.length - 1
  } else {
    intervalCount = values.length - 1
  }
  if (intervalCount <= 0) return null
  const cagr =
    cagrMode === "calendar-years"
      ? computeCagr(latest, oldest, intervalCount)
      : computeAnnualizedCagrFromMonths(latest, oldest, intervalCount)
  return {
    cagr,
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
  copy: WindowNarrativeCopy,
): string {
  const from = periods[periods.length - 1]
  const to = periods[0]
  if (!from || !to) return "Sur la période analysée"
  const unit =
    observationCount > 1 && copy.periodUnitPlural !== copy.periodUnit
      ? copy.periodUnitPlural
      : copy.periodUnit
  const base = `Sur ${observationCount} ${unit} disposant de données (${from} à ${to})`
  if (!excludedPeriods.length) return base
  const excluded =
    excludedPeriods.length <= 4
      ? excludedPeriods.join(", ")
      : `${excludedPeriods.length} ${copy.periodUnitPlural}`
  return `${base}; les ${copy.periodUnitPlural} ${excluded} sont exclus de l'analyse faute de données exploitables`
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
  marginTrendSuffix = "/an",
): string {
  const parts = [
    `Fourchette : ${formatMetricValue(stats.min, format)} (${stats.minPeriod}) – ${formatMetricValue(stats.max, format)} (${stats.maxPeriod})`,
    `Moyenne : ${formatMetricValue(stats.mean, format)}`,
  ]
  if (cagr?.cagr !== null && cagr) parts.push(`TCAC : ${fmtPct(cagr.cagr)}`)
  if (marginAnnualizedPts !== null)
    parts.push(`Évol. annualisée : ${fmtPts(marginAnnualizedPts)}${marginTrendSuffix}`)
  return parts.join(" · ")
}

function buildCurrencyWindowParagraph(
  heading: string,
  label: string,
  format: "currency",
  points: PerformanceNarrativePoint[],
  pickValue: (p: PerformanceNarrativePoint) => number,
  copy: WindowNarrativeCopy,
  withSeasonality = true,
): PerformanceNarrativeParagraph | null {
  const { values, periods, excludedPeriods } = filterPresentSeries(points, pickValue)
  const stats = windowStats(values, periods)
  if (!stats || !values.length) return null

  const latest = values[0]!
  const prior = values.length > 1 ? values[1]! : null
  const priorPeriod = values.length > 1 ? periods[1]! : null
  const cagr = computeCagrFromPresentSeries(values, periods, copy.cagrMode)
  const scope = scopeSentence(values.length, periods, excludedPeriods, copy)
  const retainedLabel = copy.periodUnitPlural === "mois" ? "les mois retenus" : "les exercices retenus"

  const sentences: string[] = [
    `${scope}, ${label} s'établit à ${formatMetricValue(latest, format)} pour ${copy.referenceForPeriod(periods[0]!)}.`,
    `La fourchette observée s'étend de ${formatMetricValue(stats.min, format)} en ${stats.minPeriod} (fourchette basse) à ${formatMetricValue(stats.max, format)} en ${stats.maxPeriod} (fourchette haute), pour une moyenne de ${formatMetricValue(stats.mean, format)} sur ${retainedLabel}.`,
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
          ? `${copy.priorComparisonLabel}, ${label} est stable par rapport à ${priorPeriod} (${formatMetricValue(prior, format)}).`
          : `${copy.priorComparisonLabel}, ${label} affiche une ${dir} de ${fmtPct(Math.abs(yoy))} par rapport à ${priorPeriod} (${formatMetricValue(prior, format)}).`,
      )
    }
  }

  if (nearlyEqual(latest, stats.max)) {
    sentences.push(`À la date de référence, ${label} atteint le plus haut niveau de la période analysée.`)
  } else if (nearlyEqual(latest, stats.min)) {
    sentences.push(`À la date de référence, ${label} se situe au plus bas de la période analysée.`)
  }

  const paragraph: PerformanceNarrativeParagraph = {
    heading,
    body: sentences.join(" "),
    statsLine: buildStatsLine(stats, format, cagr, null),
  }
  return withSeasonality
    ? attachSeasonalityBody(paragraph, points, pickValue, format, label, copy)
    : paragraph
}

function filterPresentMarginSeries(
  points: PerformanceNarrativePoint[],
  pickValue: (p: PerformanceNarrativePoint) => number,
): PresentSeries {
  const excludedPeriods: string[] = []
  const values: number[] = []
  const periods: string[] = []

  for (const point of points) {
    const v = pickValue(point)
    if (!Number.isFinite(v)) {
      excludedPeriods.push(point.period)
      continue
    }
    values.push(v)
    periods.push(point.period)
  }

  return { values, periods, excludedPeriods }
}

function buildMarginWindowParagraphForSeries(
  heading: string,
  metricLabel: string,
  points: PerformanceNarrativePoint[],
  copy: WindowNarrativeCopy,
): PerformanceNarrativeParagraph | null {
  const { values, periods, excludedPeriods } = filterPresentMarginSeries(points, (p) => p.grossMarginPercent)
  const grossProfits = filterPresentMarginSeries(points, (p) => p.grossProfit)
  const hasGrossProfit = grossProfits.values.some((v) => Math.abs(v) > DATA_EPSILON)
  const stats = windowStats(values, periods)
  if (!stats || !values.length) return null

  const latest = values[0]!
  const latestGp = grossProfits.values[0] ?? 0
  const prior = values.length > 1 ? values[1]! : null
  const priorPeriod = values.length > 1 ? periods[1]! : null
  const oldest = values[values.length - 1]!
  const gpCagr = hasGrossProfit
    ? computeCagrFromPresentSeries(grossProfits.values, grossProfits.periods, copy.cagrMode)
    : null
  const scope = scopeSentence(values.length, periods, excludedPeriods, copy)
  const retainedLabel = copy.periodUnitPlural === "mois" ? "les mois retenus" : "les exercices retenus"

  const marginAnnualizedPts =
    gpCagr && gpCagr.intervalCount > 0
      ? copy.cagrMode === "months-annualized"
        ? ((latest - oldest) / gpCagr.intervalCount) * 12
        : (latest - oldest) / gpCagr.intervalCount
      : values.length >= 2
        ? copy.cagrMode === "months-annualized"
          ? ((latest - oldest) / (values.length - 1)) * 12
          : (latest - oldest) / (values.length - 1)
        : null

  const sentences: string[] = [
    hasGrossProfit
      ? `${scope}, ${metricLabel} s'affiche à ${latest.toFixed(1)} % pour ${copy.referenceForPeriod(periods[0]!)}, soit un bénéfice brut de ${formatCurrency(latestGp)}.`
      : `${scope}, ${metricLabel} s'affiche à ${latest.toFixed(1)} % pour ${copy.referenceForPeriod(periods[0]!)}.`,
    `Sur ${retainedLabel}, la marge évolue entre ${stats.min.toFixed(1)} % en ${stats.minPeriod} (fourchette basse) et ${stats.max.toFixed(1)} % en ${stats.maxPeriod} (fourchette haute), pour une moyenne de ${stats.mean.toFixed(1)} %.`,
    positionVsMeanSentence(latest, stats.mean, "percent"),
  ]

  if (hasGrossProfit && gpCagr?.cagr !== null && gpCagr) {
    sentences.push(
      `Le bénéfice brut progresse à un TCAC de ${fmtPct(gpCagr.cagr!)} entre ${gpCagr.fromPeriod} et ${gpCagr.toPeriod}, indicateur de la dynamique sous-jacente du volume et de la marge.`,
    )
  }

  if (marginAnnualizedPts !== null && Math.abs(marginAnnualizedPts) > 0.05) {
    const dir = trendWord(marginAnnualizedPts)
    sentences.push(
      dir === "stabilité"
        ? `La marge demeure stable en moyenne (${fmtPts(marginAnnualizedPts)}${copy.marginTrendLabel}) sur la période retenue.`
        : `La marge affiche une ${dir} moyenne de ${fmtPts(Math.abs(marginAnnualizedPts))}${copy.marginTrendLabel} sur la période retenue.`,
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
    sentences.push(`À la date de référence, ${metricLabel} constitue le niveau le plus élevé de la fenêtre analysée.`)
  } else if (nearlyEqual(latest, stats.min, 0.05)) {
    sentences.push(`À la date de référence, ${metricLabel} se situe à son niveau le plus bas sur la période retenue.`)
  }

  return attachSeasonalityBody(
    {
      heading,
      body: sentences.join(" "),
      statsLine: buildStatsLine(stats, "percent", gpCagr, marginAnnualizedPts, copy.marginTrendLabel),
    },
    points,
    (p) => p.grossMarginPercent,
    "percent",
    metricLabel,
    copy,
  )
}

function buildMarginWindowParagraph(
  points: PerformanceNarrativePoint[],
  copy: WindowNarrativeCopy,
): PerformanceNarrativeParagraph | null {
  return buildMarginWindowParagraphForSeries("Marge brute", "la marge brute rapportée aux revenus", points, copy)
}

/** Compare la trajectoire du BAIIA à celle des revenus (TCAC, ratio opérationnel, glissement annuel). */
export function buildBaiiaVsRevenueTrajectoryParagraph(
  points: PerformanceNarrativePoint[],
  copy: WindowNarrativeCopy = ANNUAL_COPY,
): string | null {
  const rev = filterPresentSeries(points, (p) => p.revenue)
  const ebita = filterPresentSeries(points, (p) => p.ebita)
  if (rev.values.length < 2 || ebita.values.length < 2) return null

  const revCagr = computeCagrFromPresentSeries(rev.values, rev.periods, copy.cagrMode)
  const ebitaCagr = computeCagrFromPresentSeries(ebita.values, ebita.periods, copy.cagrMode)

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

function buildBaiiaWindowParagraph(
  points: PerformanceNarrativePoint[],
  copy: WindowNarrativeCopy,
): PerformanceNarrativeParagraph | null {
  const base = buildCurrencyWindowParagraph(
    "BAIIA",
    "le BAIIA",
    "currency",
    points,
    (p) => p.ebita,
    copy,
    false,
  )
  if (!base) return null
  const secondaryBody = buildBaiiaVsRevenueTrajectoryParagraph(points, copy)
  const withSecondary = secondaryBody ? { ...base, secondaryBody } : base
  return attachSeasonalityBody(withSecondary, points, (p) => p.ebita, "currency", "le BAIIA", copy)
}

function buildWindowPerformanceNarrative(
  data: PerformanceNarrativePoint[],
  copy: WindowNarrativeCopy,
  mode: "annual" | "monthly",
): PerformanceNarrativeResult {
  const present = data.filter(isAnnualExercisePresent)
  const referencePeriod = present[0]?.period ?? data[0]?.period ?? ""

  const paragraphs = [
    buildCurrencyWindowParagraph(
      "Revenus",
      "le chiffre d'affaires",
      "currency",
      data,
      (p) => p.revenue,
      copy,
    ),
    buildMarginWindowParagraph(data, copy),
    buildBaiiaWindowParagraph(data, copy),
  ].filter((p): p is PerformanceNarrativeParagraph => p !== null)

  return {
    mode,
    title: "Lecture de la performance",
    subtitle: copy.subtitle,
    referencePeriod,
    paragraphs,
  }
}

export type VariableCostAccountBreakdown = {
  accountNumber: string
  label: string
  /** Montants par période, alignés sur `points` de la tranche. */
  amounts: number[]
}

export type RevenueComponentBreakdown = {
  id: string
  label: string
  /** `link-code` pour un code REV ; `gl-account` pour un compte du détail. */
  kind: "link-code" | "gl-account"
  /** Montants par période, alignés sur `points` de la tranche. */
  amounts: number[]
}

export type RevenueSeriesNarrativeSlice = {
  heading: string
  metricLabel: string
  points: PerformanceNarrativePoint[]
  variableCostMapped?: boolean
  variableCostAccountCount?: number
  /** Ventilation GL des coûts variables (mapping comptable). */
  variableCostAccounts?: VariableCostAccountBreakdown[]
  /** Ventilation des revenus (sous-codes REV ou comptes GL). */
  revenueComponents?: RevenueComponentBreakdown[]
  /** Codes feuilles REV effectivement rattachés via le mapping (ex. REV-A.1, REV-A.2). */
  matchedRevenueLinkCodes?: string[]
  /** Cibles résolues pour la série (parent + feuilles, ex. REV-A + REV-A.1 + REV-A.2). */
  resolvedRevenueLinkCodes?: string[]
}

export type ContributiveMarginDimension = "revenue" | "division"

function ordinalFr(rank: number): string {
  if (rank === 1) return "1re"
  return `${rank}e`
}

function entityRankLabel(rank: number, total: number, dimension: ContributiveMarginDimension): string {
  if (dimension === "division") {
    if (total <= 1) return "division unique"
    if (rank === 1) return "la division la plus contributive"
    if (rank === total) return "la division la moins contributive"
    return `la ${ordinalFr(rank)} division en contribution`
  }
  if (total <= 1) return "source unique"
  if (rank === 1) return "la principale source de revenus"
  if (rank === total) return "la source la moins significative"
  return `la ${ordinalFr(rank)} source de revenus`
}

function revenueRankLabel(rank: number, total: number): string {
  return entityRankLabel(rank, total, "revenue")
}

function totalRevenueAtPoint(series: RevenueSeriesNarrativeSlice[], pointIndex: number): number {
  return series.reduce((sum, s) => sum + (s.points[pointIndex]?.revenue ?? 0), 0)
}

function buildRevenueShareSentence(
  slice: RevenueSeriesNarrativeSlice,
  series: RevenueSeriesNarrativeSlice[],
  rank: number,
  dimension: ContributiveMarginDimension = "revenue",
): string | null {
  if (series.length <= 1) return null
  const latestRevenue = slice.points[0]?.revenue ?? 0
  const totalLatest = totalRevenueAtPoint(series, 0)
  if (Math.abs(totalLatest) < DATA_EPSILON) return null

  const share = (latestRevenue / totalLatest) * 100
  const priorRevenue = slice.points[1]?.revenue ?? null
  const totalPrior = series.length > 1 && slice.points.length > 1 ? totalRevenueAtPoint(series, 1) : null

  const parts = [
    dimension === "division"
      ? `Au regard de la répartition du chiffre d'affaires, ${slice.metricLabel} représente ${share.toFixed(1).replace(".", ",")} % du total à la date de référence et constitue ${entityRankLabel(rank, series.length, dimension)}.`
      : `Au regard de la composition du chiffre d'affaires, ${slice.metricLabel} représente ${share.toFixed(1).replace(".", ",")} % du total à la date de référence et constitue ${entityRankLabel(rank, series.length, dimension)}.`,
  ]

  if (priorRevenue !== null && totalPrior !== null && Math.abs(totalPrior) > DATA_EPSILON) {
    const priorShare = (priorRevenue / totalPrior) * 100
    const deltaPts = share - priorShare
    if (Math.abs(deltaPts) > 0.05) {
      const dir = deltaPts > 0 ? "une hausse" : "une baisse"
      parts.push(
        `La pondération ${dir} de ${fmtPts(Math.abs(deltaPts))} par rapport à la période précédente (${priorShare.toFixed(1).replace(".", ",")} % → ${share.toFixed(1).replace(".", ",")} %) traduit un rééquilibrement de la structure ${dimension === "division" ? "entre divisions" : "des revenus"}.`,
      )
    } else {
      parts.push("La pondération relative demeure stable par rapport à la période précédente.")
    }
  }

  if (rank === 1 && series.length > 2) {
    const sortedByRevenue = [...series].sort(
      (a, b) => (b.points[0]?.revenue ?? 0) - (a.points[0]?.revenue ?? 0),
    )
    const secondShare = ((sortedByRevenue[1]?.points[0]?.revenue ?? 0) / totalLatest) * 100
    if (secondShare > 0) {
      parts.push(
        `L'écart avec la ${dimension === "division" ? "deuxième division" : "deuxième source"} (${Math.abs(share - secondShare).toFixed(1).replace(".", ",")} pt${Math.abs(share - secondShare) >= 2 ? "s" : ""} de pondération) confirme le poids prépondérant de cette ${dimension === "division" ? "division" : "activité"} dans le profil de revenus.`,
      )
    }
  }

  return parts.join(" ")
}

function buildContributiveMarginParagraph(
  slice: RevenueSeriesNarrativeSlice,
  copy: WindowNarrativeCopy,
  marginRank: number,
  totalSeries: number,
  dimension: ContributiveMarginDimension = "revenue",
): PerformanceNarrativeParagraph {
  const heading = `Marge contributive — ${slice.heading}`
  const hasQuantifiedMargin = slice.points.some(
    (p) => p.variableCost !== undefined && Math.abs(p.revenue) > DATA_EPSILON,
  )

  if (!slice.variableCostMapped) {
    return {
      heading,
      section: "contributive-margin",
      body:
        dimension === "division"
          ? "Aucun compte de coût variable n'est affecté à cette division dans le mapping comptable. Paramétrez le type « Variable » sur les charges directement liées à l'activité de la division afin d'obtenir la marge contributive."
          : "Aucun rattachement de coûts variables n'a été configuré dans le mapping comptable pour cette source. Paramétrez le type « Variable » et le compte de revenu associé (ex. REV-A.1) sur chaque compte de charge afin d'obtenir la marge contributive.",
    }
  }

  if (!hasQuantifiedMargin) {
    const accountNote =
      dimension === "division"
        ? slice.variableCostAccountCount && slice.variableCostAccountCount > 0
          ? `${slice.variableCostAccountCount} compte${slice.variableCostAccountCount > 1 ? "s" : ""} de coûts variables ${slice.variableCostAccountCount > 1 ? "sont affectés" : "est affecté"} à cette division, mais les montants ne sont pas disponibles sur l'horizon analysé.`
          : "Aucun compte de charge variable n'est encore affecté à cette division dans le mapping comptable."
        : slice.variableCostAccountCount && slice.variableCostAccountCount > 0
          ? `${slice.variableCostAccountCount} compte${slice.variableCostAccountCount > 1 ? "s" : ""} de coûts variables ${slice.variableCostAccountCount > 1 ? "sont rattachés" : "est rattaché"} au(x) code(s) ${(slice.matchedRevenueLinkCodes ?? []).join(", ") || "—"}, mais les montants ne sont pas disponibles sur l'horizon analysé.`
          : `Des codes de revenus sont résolus (${(slice.resolvedRevenueLinkCodes ?? []).join(", ") || "—"}), mais aucun compte de charge variable n'est encore associé dans le mapping comptable.`
    return {
      heading,
      section: "contributive-margin",
      body: accountNote,
    }
  }

  const marginParagraph = buildMarginWindowParagraphForSeries(
    slice.heading,
    `la marge contributive de ${slice.metricLabel.replace(/^les? /, "")}`,
    slice.points,
    copy,
  )
  const variableCostDetail = buildVariableCostAnalysisBody(slice, copy, dimension)
  const entityLabel = dimension === "division" ? "division" : "source"
  const rankNote =
    totalSeries > 1
      ? ` À la date de référence, cette ${entityLabel} affiche la ${marginRank === 1 ? "meilleure" : marginRank === totalSeries ? "plus faible" : `${ordinalFr(marginRank)} plus élevée`} marge contributive du portefeuille analysé.`
      : ""

  if (marginParagraph) {
    return {
      ...marginParagraph,
      heading,
      section: "contributive-margin",
      body: `${marginParagraph.body}${rankNote}`,
      secondaryBody: variableCostDetail ?? undefined,
    }
  }

  return {
    heading,
    section: "contributive-margin",
    body: `${variableCostDetail ?? "Marge contributive non calculable."}${rankNote}`,
  }
}

function buildContributiveMarginRankingParagraph(
  series: RevenueSeriesNarrativeSlice[],
  copy: WindowNarrativeCopy,
  dimension: ContributiveMarginDimension = "revenue",
): PerformanceNarrativeParagraph | null {
  const ranked = series
    .map((s) => ({
      heading: s.heading,
      margin: s.points[0]?.grossMarginPercent ?? null,
      revenue: s.points[0]?.revenue ?? 0,
      contributiveProfit: s.points[0]?.grossProfit ?? 0,
    }))
    .filter((r) => r.margin !== null && Number.isFinite(r.margin) && Math.abs(r.revenue) > DATA_EPSILON)
    .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0))

  if (ranked.length < 2) return null

  const breakdown = ranked
    .map((r) => `${r.heading} (${(r.margin ?? 0).toFixed(1).replace(".", ",")} %)`)
    .join(", ")
  const spread = (ranked[0]!.margin ?? 0) - (ranked[ranked.length - 1]!.margin ?? 0)

  const entityLabel = dimension === "division" ? "division" : "source"

  return {
    heading: "Synthèse comparative des marges",
    section: "contributive-margin",
    body: `Classement des marges contributives à la date de référence : ${breakdown}. L'écart entre la ${entityLabel} la plus rentable et la moins rentable atteint ${spread.toFixed(1).replace(".", ",")} points de marge, à interpréter conjointement avec la pondération de chaque ${dimension === "division" ? "division" : "activité"} dans le chiffre d'affaires.`,
    statsLine: ranked
      .map(
        (r) =>
          `${r.heading} : ${(r.margin ?? 0).toFixed(1).replace(".", ",")} % (${formatMetricValue(r.contributiveProfit, "currency")})`,
      )
      .join(" · "),
  }
}

function buildVariableCostAnalysisBody(
  slice: RevenueSeriesNarrativeSlice,
  copy: WindowNarrativeCopy,
  dimension: ContributiveMarginDimension = "revenue",
): string | null {
  const mapped = slice.variableCostMapped
  const accountCount = slice.variableCostAccountCount ?? 0

  if (!mapped) {
    return dimension === "division"
      ? "Aucun compte de coût variable n'est affecté à cette division dans le mapping comptable ; la marge contributive ne peut être quantifiée à partir des comptes actuellement paramétrés."
      : "Aucun rattachement de coûts variables n'a été configuré dans le mapping comptable pour cette source ; la marge contributive ne peut être quantifiée à partir des comptes actuellement paramétrés."
  }

  if (accountCount === 0) {
    return dimension === "division"
      ? "Aucun compte de coût variable n'est affecté à cette division dans le mapping comptable."
      : "Aucun compte de coût variable n'est associé à cette source de revenus dans le mapping comptable."
  }

  const latestRevenue = slice.points[0]?.revenue ?? 0
  const latestCost = slice.points[0]?.variableCost
  if (latestCost === undefined) {
    return `${accountCount} compte${accountCount > 1 ? "s" : ""} de coûts variables ${accountCount > 1 ? "sont rattachés" : "est rattaché"} dans le mapping comptable, mais les montants ne sont pas disponibles sur l'horizon analysé.`
  }

  const priorCost = slice.points[1]?.variableCost ?? null
  const priorRevenue = slice.points[1]?.revenue ?? null
  const contributiveMargin =
    Math.abs(latestRevenue) > DATA_EPSILON
      ? ((latestRevenue - latestCost) / latestRevenue) * 100
      : null
  const costToRevenue =
    Math.abs(latestRevenue) > DATA_EPSILON ? (latestCost / latestRevenue) * 100 : null
  const matchedLeaves = slice.matchedRevenueLinkCodes ?? []
  const rollupNote =
    dimension === "division"
      ? ""
      : matchedLeaves.length > 1
        ? `Les coûts variables agrègent les rattachements des codes ${matchedLeaves.join(", ")} configurés dans le mapping comptable. `
        : matchedLeaves.length === 1 && (slice.resolvedRevenueLinkCodes?.length ?? 0) > 1
          ? `Les coûts variables proviennent du rattachement au code ${matchedLeaves[0]} (parmi les composantes ${slice.resolvedRevenueLinkCodes!.join(", ")}). `
          : ""

  const scopeLabel = dimension === "division" ? "de cette division" : "de cette source"
  const sentences = [
    `${rollupNote}Les coûts variables ${dimension === "division" ? "affectés à la division" : "rattachés dans le mapping comptable"} (${accountCount} compte${accountCount > 1 ? "s" : ""}) s'élèvent à ${formatMetricValue(latestCost, "currency")} pour ${copy.referenceForPeriod(slice.points[0]!.period)}, soit ${costToRevenue !== null ? `${costToRevenue.toFixed(1).replace(".", ",")} %` : "—"} des revenus ${scopeLabel}.`,
  ]

  if (contributiveMargin !== null) {
    sentences.push(
      `La marge contributive après coûts variables s'établit à ${contributiveMargin.toFixed(1).replace(".", ",")} %, indicateur clé de la rentabilité opérationnelle de cette activité avant charges fixes et frais généraux.`,
    )
  }

  if (priorCost !== null && priorRevenue !== null) {
    const costChange = pctChange(latestCost, priorCost)
    const revChange = pctChange(latestRevenue, priorRevenue)
    if (costChange !== null && revChange !== null) {
      if (Math.abs(costChange - revChange) > 0.5) {
        const spread = costChange - revChange
        sentences.push(
          spread > 0
            ? `En glissement, les coûts variables progressent plus vite (+${fmtPct(Math.abs(costChange))}) que le chiffre d'affaires (+${fmtPct(Math.abs(revChange))}), ce qui exerce une pression sur la marge contributive.`
            : `En glissement, les coûts variables évoluent moins vite (${fmtPct(costChange)}) que le chiffre d'affaires (${fmtPct(revChange)}), ce qui favorise l'amélioration de la marge contributive.`,
        )
      } else {
        sentences.push(
          "Les coûts variables évoluent globalement en phase avec le chiffre d'affaires sur la période comparée.",
        )
      }
    }
  }

  return sentences.join(" ")
}

function buildRevenueMixSummaryParagraph(series: RevenueSeriesNarrativeSlice[]): PerformanceNarrativeParagraph | null {
  if (series.length <= 1) return null
  const total = totalRevenueAtPoint(series, 0)
  if (Math.abs(total) < DATA_EPSILON) return null

  const ranked = series
    .map((s) => ({
      heading: s.heading,
      revenue: s.points[0]?.revenue ?? 0,
      share: ((s.points[0]?.revenue ?? 0) / total) * 100,
    }))
    .sort((a, b) => b.share - a.share)

  const breakdown = ranked
    .map((r) => `${r.heading} (${r.share.toFixed(1).replace(".", ",")} %)`)
    .join(", ")

  const topTwo = ranked.slice(0, 2).reduce((sum, r) => sum + r.share, 0)
  const concentration =
    ranked.length >= 2
      ? `Les deux principales sources totalisent ${topTwo.toFixed(1).replace(".", ",")} % du chiffre d'affaires${
          topTwo >= 70
            ? ", ce qui traduit une concentration notable et un risque de dépendance commerciale à surveiller."
            : topTwo >= 50
              ? ", ce qui reflète une structure de revenus relativement diversifiée."
              : ", ce qui témoigne d'une diversification marquée entre les activités."
        }`
      : ""

  return {
    heading: "Structure du chiffre d'affaires",
    section: "revenue-mix",
    body: `À la date de référence, la répartition du chiffre d'affaires par source est la suivante : ${breakdown}. ${concentration}`.trim(),
  }
}

function metricLabelForRevenueSeries(heading: string): string {
  const h = heading.trim()
  if (!h) return "cette source de revenus"
  if (/^(le |la |les |l')/i.test(h)) return h
  return `les ${h.charAt(0).toLowerCase()}${h.slice(1)}`
}

function buildRevenueSeriesWindowNarrative(
  series: RevenueSeriesNarrativeSlice[],
  copy: WindowNarrativeCopy,
  mode: "annual" | "monthly",
  options?: { revenueAnalysis?: boolean },
): PerformanceNarrativeResult | null {
  const revenueAnalysis = options?.revenueAnalysis === true
  const rankedIndices = revenueAnalysis
    ? series
        .map((s, i) => ({ i, revenue: s.points[0]?.revenue ?? 0 }))
        .sort((a, b) => b.revenue - a.revenue)
    : []
  const rankByIndex = new Map<number, number>()
  rankedIndices.forEach((item, rank) => rankByIndex.set(item.i, rank + 1))

  const paragraphs = series
    .map((s, index) => {
      const base = buildCurrencyWindowParagraph(
        s.heading,
        s.metricLabel,
        "currency",
        s.points,
        (p) => p.revenue,
        copy,
      )
      if (!base) return null

      if (!revenueAnalysis) return base

      const shareSentence = buildRevenueShareSentence(s, series, rankByIndex.get(index) ?? index + 1)
      const bodyParts = [base.body]
      if (shareSentence) bodyParts.push(shareSentence)

      return {
        ...base,
        section: "revenue-performance" as const,
        body: bodyParts.join(" "),
      }
    })
    .filter((p): p is PerformanceNarrativeParagraph => p !== null)

  if (revenueAnalysis) {
    const mixParagraph = buildRevenueMixSummaryParagraph(series)
    if (mixParagraph) paragraphs.push(mixParagraph)
  }

  if (!paragraphs.length) return null

  const referencePeriod =
    series
      .flatMap((s) => s.points)
      .find(isAnnualExercisePresent)?.period ??
    series[0]?.points[0]?.period ??
    ""

  return {
    mode,
    title: "Lecture de la performance",
    subtitle: copy.subtitle,
    referencePeriod,
    paragraphs,
  }
}

function buildAnnualPerformanceNarrative(data: PerformanceNarrativePoint[]): PerformanceNarrativeResult {
  return buildWindowPerformanceNarrative(data, ANNUAL_COPY, "annual")
}

function buildMonthlyPerformanceNarrative(data: PerformanceNarrativePoint[]): PerformanceNarrativeResult {
  return buildWindowPerformanceNarrative(data, MONTHLY_COPY, "monthly")
}

export function mapDynamicChartToRevenueSeriesNarratives(
  points: DynamicChartPoint[],
  seriesMeta: BuiltSeriesMeta[],
): RevenueSeriesNarrativeSlice[] {
  if (!points.length || !seriesMeta.length) return []

  return seriesMeta
    .filter((s) => s.kind === "bar" && s.valueFormat === "currency")
    .map((bar) => {
      const heading = bar.label.trim() || "Revenus"
      return {
        heading,
        metricLabel: metricLabelForRevenueSeries(heading),
        points: points.map((p) => {
          const row = p as Record<string, string | number>
          const revenue = Number(row[bar.dataKey] ?? 0)
          return {
            period: String(row.period ?? ""),
            revenue,
            grossProfit: 0,
            ebita: 0,
            grossMarginPercent: 0,
          }
        }),
      }
    })
}

/** @deprecated Préférer `mapDynamicChartToRevenueSeriesNarratives` (une série). */
export function mapDynamicChartToRevenueNarrativePoints(
  points: DynamicChartPoint[],
  seriesMeta: BuiltSeriesMeta[],
): PerformanceNarrativePoint[] | null {
  const slices = mapDynamicChartToRevenueSeriesNarratives(points, seriesMeta)
  return slices[0]?.points ?? null
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
  if (view === "24months") return buildMonthlyPerformanceNarrative(data)
  return buildSequentialPerformanceNarrative(data, view)
}

/** Synthèse revenus par série affichée (carte Diagnostic « Revenus »). */
export function buildRevenueOnlyPerformanceNarrative(
  series: RevenueSeriesNarrativeSlice[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!series.length) return null
  if (view === "years") {
    return buildRevenueSeriesWindowNarrative(series, ANNUAL_COPY, "annual", { revenueAnalysis: true })
  }
  if (view === "24months") {
    return buildRevenueSeriesWindowNarrative(series, MONTHLY_COPY, "monthly", { revenueAnalysis: true })
  }
  return null
}

function buildContributiveMarginSeriesWindowNarrative(
  series: RevenueSeriesNarrativeSlice[],
  copy: WindowNarrativeCopy,
  mode: "annual" | "monthly",
  dimension: ContributiveMarginDimension = "revenue",
): PerformanceNarrativeResult | null {
  const rankedIndices = series
    .map((s, i) => ({
      i,
      margin: s.points[0]?.grossMarginPercent ?? null,
      revenue: s.points[0]?.revenue ?? 0,
    }))
    .filter((r) => r.margin !== null && Math.abs(r.revenue) > DATA_EPSILON)
    .sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0))
  const rankByIndex = new Map<number, number>()
  rankedIndices.forEach((item, rank) => rankByIndex.set(item.i, rank + 1))

  const paragraphs = series
    .map((s, index) =>
      buildContributiveMarginParagraph(
        s,
        copy,
        rankByIndex.get(index) ?? index + 1,
        series.length,
        dimension,
      ),
    )
    .filter((p): p is PerformanceNarrativeParagraph => p !== null)

  const ranking = buildContributiveMarginRankingParagraph(series, copy, dimension)
  if (ranking) paragraphs.push(ranking)

  if (!paragraphs.length) return null

  const referencePeriod =
    series
      .flatMap((s) => s.points)
      .find((p) => p.variableCost !== undefined && Math.abs(p.revenue) > DATA_EPSILON)?.period ??
    series[0]?.points[0]?.period ??
    ""

  return {
    mode,
    title:
      dimension === "division"
        ? "Lecture de la contribution marginale par division"
        : "Lecture de la contribution marginale par revenus",
    subtitle: copy.subtitle,
    referencePeriod,
    paragraphs,
  }
}

/** Synthèse contribution marginale par source (carte Diagnostic « Marge par Revenus »). */
export function buildContributiveMarginByRevenueNarrative(
  series: RevenueSeriesNarrativeSlice[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!series.length) return null
  if (view === "years") {
    return buildContributiveMarginSeriesWindowNarrative(series, ANNUAL_COPY, "annual", "revenue")
  }
  if (view === "24months") {
    return buildContributiveMarginSeriesWindowNarrative(series, MONTHLY_COPY, "monthly", "revenue")
  }
  return null
}

/** Synthèse contribution marginale par division (carte Diagnostic « Divisions » sous Dépenses). */
export function buildContributiveMarginByDivisionNarrative(
  series: RevenueSeriesNarrativeSlice[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!series.length) return null
  if (view === "years") {
    return buildContributiveMarginSeriesWindowNarrative(series, ANNUAL_COPY, "annual", "division")
  }
  if (view === "24months") {
    return buildContributiveMarginSeriesWindowNarrative(series, MONTHLY_COPY, "monthly", "division")
  }
  return null
}

export type MarginSeriesNarrativeSlice = {
  heading: string
  metricLabel: string
  points: PerformanceNarrativePoint[]
}

function metricLabelForMarginSeries(heading: string): string {
  const h = heading.trim()
  if (!h) return "cette marge"
  if (/^(le |la |les |l')/i.test(h)) return h
  return `la marge de ${h.charAt(0).toLowerCase()}${h.slice(1)}`
}

function buildMarginSeriesWindowNarrative(
  series: MarginSeriesNarrativeSlice[],
  copy: WindowNarrativeCopy,
  mode: "annual" | "monthly",
): PerformanceNarrativeResult | null {
  const paragraphs = series
    .map((s) => buildMarginWindowParagraphForSeries(s.heading, s.metricLabel, s.points, copy))
    .filter((p): p is PerformanceNarrativeParagraph => p !== null)

  if (!paragraphs.length) return null

  const referencePeriod =
    series
      .flatMap((s) => s.points)
      .find((p) => Number.isFinite(p.grossMarginPercent))?.period ??
    series[0]?.points[0]?.period ??
    ""

  return {
    mode,
    title: "Lecture de la performance",
    subtitle: copy.subtitle,
    referencePeriod,
    paragraphs,
  }
}

export function mapDynamicChartToMarginByRevenueSeriesNarratives(
  points: DynamicChartPoint[],
  seriesMeta: BuiltSeriesMeta[],
): MarginSeriesNarrativeSlice[] {
  if (!points.length || !seriesMeta.length) return []

  return seriesMeta
    .filter((s) => s.valueFormat === "ratio")
    .map((line) => {
      const heading = line.label.trim() || "Marge"
      return {
        heading,
        metricLabel: metricLabelForMarginSeries(heading),
        points: points.map((p) => {
          const row = p as Record<string, string | number>
          const grossMarginPercent = Number(row[line.dataKey] ?? 0)
          return {
            period: String(row.period ?? ""),
            revenue: Number.isFinite(grossMarginPercent) ? 1 : 0,
            grossProfit: 0,
            ebita: 0,
            grossMarginPercent,
          }
        }),
      }
    })
}

/** Synthèse marge par série affichée (carte Diagnostic « Marge par Revenus »). */
export function buildMarginByRevenueOnlyPerformanceNarrative(
  series: MarginSeriesNarrativeSlice[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!series.length) return null
  if (view === "years") return buildMarginSeriesWindowNarrative(series, ANNUAL_COPY, "annual")
  if (view === "24months") return buildMarginSeriesWindowNarrative(series, MONTHLY_COPY, "monthly")
  return null
}

function metricLabelForExpenseSeries(heading: string): string {
  const h = heading.trim()
  if (!h) return "ces dépenses"
  if (/^(le |la |les |l')/i.test(h)) return h
  const lower = h.toLowerCase()
  if (lower === "dépenses" || lower === "depenses") return "les dépenses"
  return `les dépenses de ${h.charAt(0).toLowerCase()}${h.slice(1)}`
}

export function mapDynamicChartToExpenseSeriesNarratives(
  points: DynamicChartPoint[],
  seriesMeta: BuiltSeriesMeta[],
): RevenueSeriesNarrativeSlice[] {
  if (!points.length || !seriesMeta.length) return []

  return seriesMeta
    .filter((s) => s.kind === "bar" && s.valueFormat === "currency")
    .map((bar) => {
      const heading = bar.label.trim() || "Dépenses"
      return {
        heading,
        metricLabel: metricLabelForExpenseSeries(heading),
        points: points.map((p) => {
          const row = p as Record<string, string | number>
          const revenue = Number(row[bar.dataKey] ?? 0)
          return {
            period: String(row.period ?? ""),
            revenue,
            grossProfit: 0,
            ebita: 0,
            grossMarginPercent: 0,
          }
        }),
      }
    })
}

/** Synthèse dépenses par série affichée (carte Diagnostic « Dépenses »). */
export function buildExpensesOnlyPerformanceNarrative(
  series: RevenueSeriesNarrativeSlice[],
  view: string,
): PerformanceNarrativeResult | null {
  if (!series.length) return null
  if (view === "years") return buildRevenueSeriesWindowNarrative(series, ANNUAL_COPY, "annual")
  if (view === "24months") return buildRevenueSeriesWindowNarrative(series, MONTHLY_COPY, "monthly")
  return null
}
