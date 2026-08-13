import { EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import { parseFiscalYearEndMonth } from "@/lib/capex-year-reference"
import { formatCurrency } from "@/lib/financial-utils"
import type { PerformanceNarrativeParagraph } from "@/lib/income-performance-narrative"
import {
  enumerateMonthsForward,
  fiscalYearLabelForReference,
  fiscalYearStartForReference,
  type MonthlyExpenseBridgePoint,
} from "@/lib/pilotage-revenue-metrics"

const DATA_EPSILON = 1e-6
const CHANGE_THRESHOLD = 0.05
const CM_RATE_STABLE_THRESHOLD = 0.5

type BridgeSnapshot = {
  revenue: number
  variableCosts: number
  fixedCosts: number
}

type CmCharacter = "stable" | "improved" | "declined"

export type BaiiaChangeDecomposition = {
  baiiaCurrent: number
  baiiaPrior: number
  baiiaDelta: number
  baiiaPct: number | null
  revenueGrowthPct: number | null
  contributiveMarginDelta: number
  contributiveMarginRatePrior: number | null
  contributiveMarginRateCurrent: number | null
  contributiveMarginRatePptDelta: number | null
  variableCostGrowthPct: number | null
  fixedCostDelta: number
  fixedCostGrowthPct: number | null
  fixedCostImpactOnBaiia: number
  contributiveMarginShareOfBaiiaChange: number | null
  fixedCostShareOfBaiiaChange: number | null
}

function pctChange(current: number, base: number): number | null {
  if (Math.abs(base) < DATA_EPSILON) return null
  return ((current - base) / Math.abs(base)) * 100
}

function fmtPctUnsigned(value: number, digits = 1): string {
  return `${Math.abs(value).toFixed(digits).replace(".", ",")} %`
}

function fmtPctPlain(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")} %`
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

function baiiaAt(snapshot: BridgeSnapshot): number {
  return snapshot.revenue - snapshot.variableCosts - snapshot.fixedCosts
}

function contributiveMarginAt(snapshot: BridgeSnapshot): number {
  return snapshot.revenue - snapshot.variableCosts
}

function contributiveMarginRateOfRevenue(snapshot: BridgeSnapshot): number | null {
  if (Math.abs(snapshot.revenue) < DATA_EPSILON) return null
  return (contributiveMarginAt(snapshot) / snapshot.revenue) * 100
}

export function decomposeBaiiaChange(
  current: BridgeSnapshot,
  prior: BridgeSnapshot,
): BaiiaChangeDecomposition {
  const baiiaCurrent = baiiaAt(current)
  const baiiaPrior = baiiaAt(prior)
  const baiiaDelta = baiiaCurrent - baiiaPrior
  const contributiveMarginDelta = contributiveMarginAt(current) - contributiveMarginAt(prior)
  const contributiveMarginRatePrior = contributiveMarginRateOfRevenue(prior)
  const contributiveMarginRateCurrent = contributiveMarginRateOfRevenue(current)
  const contributiveMarginRatePptDelta =
    contributiveMarginRatePrior !== null && contributiveMarginRateCurrent !== null
      ? contributiveMarginRateCurrent - contributiveMarginRatePrior
      : null
  const fixedCostDelta = current.fixedCosts - prior.fixedCosts
  const fixedCostImpactOnBaiia = prior.fixedCosts - current.fixedCosts

  const share = (impact: number) =>
    Math.abs(baiiaDelta) > DATA_EPSILON ? (impact / baiiaDelta) * 100 : null

  return {
    baiiaCurrent,
    baiiaPrior,
    baiiaDelta,
    baiiaPct: pctChange(baiiaCurrent, baiiaPrior),
    revenueGrowthPct: pctChange(current.revenue, prior.revenue),
    contributiveMarginDelta,
    contributiveMarginRatePrior,
    contributiveMarginRateCurrent,
    contributiveMarginRatePptDelta,
    variableCostGrowthPct: pctChange(current.variableCosts, prior.variableCosts),
    fixedCostDelta,
    fixedCostGrowthPct: pctChange(current.fixedCosts, prior.fixedCosts),
    fixedCostImpactOnBaiia,
    contributiveMarginShareOfBaiiaChange: share(contributiveMarginDelta),
    fixedCostShareOfBaiiaChange: share(fixedCostImpactOnBaiia),
  }
}

function snapshotFromPoint(point: MonthlyExpenseBridgePoint): BridgeSnapshot {
  return {
    revenue: point.revenue,
    variableCosts: point.variableCosts,
    fixedCosts: point.fixedCosts,
  }
}

function aggregateSnapshot(points: MonthlyExpenseBridgePoint[]): BridgeSnapshot {
  return points.reduce(
    (acc, point) => ({
      revenue: acc.revenue + point.revenue,
      variableCosts: acc.variableCosts + point.variableCosts,
      fixedCosts: acc.fixedCosts + point.fixedCosts,
    }),
    { revenue: 0, variableCosts: 0, fixedCosts: 0 },
  )
}

function pointsForMonths(
  series: MonthlyExpenseBridgePoint[],
  months: Array<{ month: number; year: number }>,
): MonthlyExpenseBridgePoint[] {
  return months
    .map((month) => series.find((point) => point.month === month.month && point.year === month.year))
    .filter((point): point is MonthlyExpenseBridgePoint => point !== undefined)
}

function describeChange(pct: number | null): "hausse" | "baisse" | "stable" | null {
  if (pct === null) return null
  if (pct > CHANGE_THRESHOLD) return "hausse"
  if (pct < -CHANGE_THRESHOLD) return "baisse"
  return "stable"
}

function characterizeCmRate(pptDelta: number | null): CmCharacter {
  if (pptDelta === null || Math.abs(pptDelta) <= CM_RATE_STABLE_THRESHOLD) return "stable"
  return pptDelta > 0 ? "improved" : "declined"
}

function formatCmClause(decomposition: BaiiaChangeDecomposition): string {
  const character = characterizeCmRate(decomposition.contributiveMarginRatePptDelta)
  const { contributiveMarginRatePrior, contributiveMarginRateCurrent } = decomposition

  if (character === "stable") {
    return "la contribution marginale est demeurée relativement stable"
  }

  if (
    character === "improved" &&
    contributiveMarginRatePrior !== null &&
    contributiveMarginRateCurrent !== null
  ) {
    return `la contribution marginale s'est améliorée, passant de ${fmtPctPlain(contributiveMarginRatePrior)} à ${fmtPctPlain(contributiveMarginRateCurrent)} des revenus`
  }

  if (
    character === "declined" &&
    contributiveMarginRatePrior !== null &&
    contributiveMarginRateCurrent !== null
  ) {
    return `la contribution marginale a reculé, passant de ${fmtPctPlain(contributiveMarginRatePrior)} à ${fmtPctPlain(contributiveMarginRateCurrent)} des revenus`
  }

  return character === "improved"
    ? "la contribution marginale s'est améliorée"
    : "la contribution marginale a reculé"
}

function formatFixedCostClause(decomposition: BaiiaChangeDecomposition): string {
  const { fixedCostDelta, fixedCostGrowthPct, revenueGrowthPct } = decomposition

  if (Math.abs(fixedCostDelta) <= DATA_EPSILON) {
    return "les coûts fixes sont demeurés stables"
  }

  const amount = formatCurrency(Math.abs(fixedCostDelta))
  const modestIncrease =
    fixedCostDelta > 0 &&
    revenueGrowthPct !== null &&
    fixedCostGrowthPct !== null &&
    fixedCostGrowthPct < revenueGrowthPct - CHANGE_THRESHOLD

  if (fixedCostDelta > 0) {
    return modestIncrease
      ? `les coûts fixes ont seulement augmenté de ${amount}`
      : `les coûts fixes ont augmenté de ${amount}`
  }

  return `les coûts fixes ont diminué de ${amount}`
}

function formatOpeningSentence(
  periodLabel: string,
  priorLabel: string,
  decomposition: BaiiaChangeDecomposition,
): string {
  const { baiiaDelta, baiiaPct } = decomposition
  const direction = describeChange(baiiaPct)

  if (direction === "hausse" || direction === "baisse") {
    const movementVerb = direction === "hausse" ? "progresse" : "recule"
    const variationNoun = direction === "hausse" ? "hausse" : "baisse"
    return `${periodLabel}, le ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} ${movementVerb} de ${formatCurrency(Math.abs(baiiaDelta))} par rapport ${priorLabel}, soit une ${variationNoun} de ${fmtPctUnsigned(baiiaPct!)}.`
  }

  if (Math.abs(baiiaDelta) <= DATA_EPSILON) {
    return `${periodLabel}, le ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} est stable par rapport ${priorLabel} (${formatCurrency(decomposition.baiiaCurrent)}).`
  }

  return `${periodLabel}, le ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} varie de ${formatCurrency(Math.abs(baiiaDelta))} par rapport ${priorLabel}.`
}

function formatExplanationSentence(
  decomposition: BaiiaChangeDecomposition,
): string | null {
  const direction = describeChange(decomposition.baiiaPct)
  if (direction !== "hausse" && direction !== "baisse") return null

  const variationNoun = direction === "hausse" ? "hausse" : "baisse"
  return `Cette ${variationNoun} s'explique par le fait que ${formatCmClause(decomposition)} alors que ${formatFixedCostClause(decomposition)}.`
}

function formatSummarySentence(decomposition: BaiiaChangeDecomposition): string | null {
  const direction = describeChange(decomposition.baiiaPct)
  if (direction !== "hausse" && direction !== "baisse") return null

  const variationNoun = direction === "hausse" ? "hausse" : "baisse"
  const cmCharacter = characterizeCmRate(decomposition.contributiveMarginRatePptDelta)
  const { revenueGrowthPct, fixedCostGrowthPct } = decomposition
  const revDirection = describeChange(revenueGrowthPct)
  const fcDirection = describeChange(fixedCostGrowthPct)

  const cmMaintien =
    cmCharacter === "stable" ? "le maintien de la contribution marginale" : null
  const cmImprovement =
    cmCharacter === "improved" ? "l'amélioration de la contribution marginale" : null
  const cmDecline = cmCharacter === "declined" ? "le recul de la contribution marginale" : null

  const parts: string[] = []

  if (direction === "hausse") {
    if (cmMaintien) parts.push(cmMaintien)
    else if (cmImprovement) parts.push(cmImprovement)

    if (
      revDirection === "hausse" &&
      (fcDirection === "hausse" || fcDirection === "stable") &&
      revenueGrowthPct !== null &&
      fixedCostGrowthPct !== null &&
      revenueGrowthPct > fixedCostGrowthPct + CHANGE_THRESHOLD
    ) {
      parts.push(
        `du fait que les revenus ont augmenté plus rapidement que les coûts fixes (${fmtPctPlain(revenueGrowthPct)} vs ${fmtPctPlain(fixedCostGrowthPct)})`,
      )
    } else if (revDirection === "hausse" && revenueGrowthPct !== null) {
      parts.push(`de la croissance des revenus (${fmtPctPlain(revenueGrowthPct)})`)
    } else if (fcDirection === "baisse" && fixedCostGrowthPct !== null) {
      parts.push(`de la baisse des coûts fixes (${fmtPctPlain(Math.abs(fixedCostGrowthPct))})`)
    }

    if (!parts.length) {
      parts.push("d'une dynamique favorable entre la contribution marginale et les coûts fixes")
    }
  } else {
    if (cmDecline) parts.push(cmDecline)
    else if (cmCharacter === "stable") parts.push("le maintien insuffisant de la contribution marginale")

    if (revDirection === "baisse" && revenueGrowthPct !== null) {
      parts.push(`du recul des revenus (${fmtPctPlain(Math.abs(revenueGrowthPct))})`)
    } else if (
      fcDirection === "hausse" &&
      revDirection === "hausse" &&
      revenueGrowthPct !== null &&
      fixedCostGrowthPct !== null &&
      fixedCostGrowthPct > revenueGrowthPct + CHANGE_THRESHOLD
    ) {
      parts.push(
        `de la hausse des coûts fixes, plus rapide que celle des revenus (${fmtPctPlain(fixedCostGrowthPct)} vs ${fmtPctPlain(revenueGrowthPct)})`,
      )
    } else if (fcDirection === "hausse" && fixedCostGrowthPct !== null) {
      parts.push(`de la hausse des coûts fixes (${fmtPctPlain(fixedCostGrowthPct)})`)
    }

    if (!parts.length) {
      parts.push("d'une pression conjointe sur la contribution marginale et les coûts fixes")
    }
  }

  const joined =
    parts.length === 1
      ? parts[0]!
      : parts.length === 2
        ? `${parts[0]} et ${parts[1]}`
        : parts.join(", ")

  return `Ainsi, la ${variationNoun} du ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} s'explique par ${joined}.`
}

function buildBaiiaNarrativeBody(
  periodLabel: string,
  current: BridgeSnapshot,
  prior?: { snapshot: BridgeSnapshot; label: string },
): string {
  if (!prior) {
    return `${periodLabel}, le ${EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} s'établit à ${formatCurrency(baiiaAt(current))}.`
  }

  const decomposition = decomposeBaiiaChange(current, prior.snapshot)
  const parts = [formatOpeningSentence(periodLabel, prior.label, decomposition)]

  const explanation = formatExplanationSentence(decomposition)
  const summary = formatSummarySentence(decomposition)
  if (explanation) parts.push(explanation)
  if (summary) parts.push(summary)

  return parts.join(" ")
}

function buildCurrentParagraph(series: MonthlyExpenseBridgePoint[]): PerformanceNarrativeParagraph | null {
  const refPoint = series[0]
  if (!refPoint) return null

  const current = snapshotFromPoint(refPoint)
  const yoyPoint = series[12]
  const prior = yoyPoint
    ? {
        snapshot: snapshotFromPoint(yoyPoint),
        label: `à ${monthNameLower(yoyPoint.month)} ${yoyPoint.year}`,
      }
    : undefined

  return {
    subsection: "Performance actuelle",
    body: buildBaiiaNarrativeBody(
      `En ${monthNameLower(refPoint.month)} ${refPoint.year}`,
      current,
      prior,
    ),
  }
}

function buildYtdParagraph(
  series: MonthlyExpenseBridgePoint[],
  fiscalYearEnd: string,
): PerformanceNarrativeParagraph | null {
  const refPoint = series[0]
  if (!refPoint) return null

  const fiscalYearEndMonth = parseFiscalYearEndMonth(fiscalYearEnd)
  const fyStart = fiscalYearStartForReference(refPoint.month, refPoint.year, fiscalYearEndMonth)
  const ytdMonths = enumerateMonthsForward(fyStart, {
    month: refPoint.month,
    year: refPoint.year,
  })
  const fiscalYearLabel = fiscalYearLabelForReference(
    refPoint.month,
    refPoint.year,
    fiscalYearEndMonth,
  )

  const current = aggregateSnapshot(pointsForMonths(series, ytdMonths))
  const priorMonths = ytdMonths.map((month) => ({ month: month.month, year: month.year - 1 }))
  const priorSnapshot = aggregateSnapshot(pointsForMonths(series, priorMonths))

  return {
    subsection: "Performance de l'exercice (YTD)",
    body: buildBaiiaNarrativeBody(
      `Depuis le début de l'exercice ${fiscalYearLabel}`,
      current,
      {
        snapshot: priorSnapshot,
        label: `à la même période cumulée de l'exercice ${fiscalYearLabel - 1}`,
      },
    ),
  }
}

function buildTtmParagraph(series: MonthlyExpenseBridgePoint[]): PerformanceNarrativeParagraph | null {
  if (series.length < 12) return null

  const current = aggregateSnapshot(series.slice(0, 12))
  const priorSnapshot = series.length >= 24 ? aggregateSnapshot(series.slice(12, 24)) : null

  return {
    subsection: "Tendance des 12 derniers mois",
    body: buildBaiiaNarrativeBody(
      "Sur les douze derniers mois glissants",
      current,
      priorSnapshot
        ? { snapshot: priorSnapshot, label: "aux douze mois précédents" }
        : undefined,
    ),
  }
}

export function buildPilotageMarginAndBaiiaParagraphs(
  series: MonthlyExpenseBridgePoint[],
  fiscalYearEnd: string,
): PerformanceNarrativeParagraph[] {
  if (!series.length) return []

  return [
    buildCurrentParagraph(series),
    buildYtdParagraph(series, fiscalYearEnd),
    buildTtmParagraph(series),
  ].filter((paragraph): paragraph is PerformanceNarrativeParagraph => paragraph !== null)
}
