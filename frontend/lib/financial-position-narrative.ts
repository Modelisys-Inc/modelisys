import {
  BALANCE_POSITION_FAMILIES,
  BALANCE_POSITION_FAMILY_LABELS,
  type BalancePositionFamily,
  type FinancialPositionResult,
  familyHeading,
  ratioPct,
} from "@/lib/financial-position"
import { formatCurrency } from "@/lib/financial-utils"
import {
  buildCurrencySeriesWindowParagraph,
  computeCagr,
  isAnnualExercisePresent,
  resolveWindowNarrativeCopy,
  type PerformanceNarrativeParagraph,
  type PerformanceNarrativePoint,
  type PerformanceNarrativeResult,
  type WindowNarrativeCopy,
} from "@/lib/income-performance-narrative"
import type { ContributiveMarginEvolutionTable } from "@/lib/revenue-contributive-margin-evolution"

const DATA_EPSILON = 1e-6
const SECTION = "financial-position" as const

type BalanceSide = "assets" | "liabilities"

type FinancialFamilySlice = {
  family: BalancePositionFamily
  heading: string
  metricLabel: string
  side: BalanceSide
  totalLabel: string
  points: PerformanceNarrativePoint[]
}

function pctChange(current: number, base: number): number | null {
  if (Math.abs(base) < DATA_EPSILON) return null
  return ((current - base) / Math.abs(base)) * 100
}

function fmtPctSigned(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(digits).replace(".", ",")} %`
}

function ordinalFr(rank: number): string {
  if (rank === 1) return "1re"
  return `${rank}e`
}

function familyRankLabel(rank: number, total: number, side: BalanceSide): string {
  if (total <= 1) return side === "assets" ? "composante unique de l'actif" : "composante unique du passif"
  if (rank === 1) {
    return side === "assets" ? "la principale composante de l'actif" : "la principale composante du passif"
  }
  if (rank === total) {
    return side === "assets" ? "la composante d'actif la moins significative" : "la composante de passif la moins significative"
  }
  return side === "assets"
    ? `la ${ordinalFr(rank)} composante de l'actif`
    : `la ${ordinalFr(rank)} composante du passif`
}

function familySide(family: BalancePositionFamily): BalanceSide {
  return family === "ACT" || family === "ALT" ? "assets" : "liabilities"
}

function familyTotalLabel(side: BalanceSide): string {
  return side === "assets" ? "total de l'actif" : "total du passif et des capitaux propres"
}

function metricLabelForFamily(family: BalancePositionFamily): string {
  const label = BALANCE_POSITION_FAMILY_LABELS[family].toLowerCase()
  return `le ${label}`
}

function familyAmount(point: FinancialPositionResult["points"][number], family: BalancePositionFamily): number {
  const key = family.toLowerCase() as "act" | "alt" | "pct" | "plt" | "cap"
  return point[key]
}

function sideTotalAt(point: FinancialPositionResult["points"][number], side: BalanceSide): number {
  return side === "assets" ? point.totalAssets : point.totalLiabilitiesEquity
}

function toNarrativePoints(result: FinancialPositionResult, family: BalancePositionFamily): PerformanceNarrativePoint[] {
  return result.points.map((point) => ({
    period: point.period,
    revenue: familyAmount(point, family),
    grossProfit: 0,
    ebita: 0,
    grossMarginPercent: 0,
  }))
}

function buildFamilySlices(result: FinancialPositionResult): FinancialFamilySlice[] {
  return BALANCE_POSITION_FAMILIES.map((family) => {
    const side = familySide(family)
    return {
      family,
      heading: familyHeading(family),
      metricLabel: metricLabelForFamily(family),
      side,
      totalLabel: familyTotalLabel(side),
      points: toNarrativePoints(result, family),
    }
  })
}

function buildFamilyRankMap(slices: FinancialFamilySlice[]): Map<number, number> {
  const ranked = slices
    .map((slice, index) => ({
      index,
      amount: slice.points[0]?.revenue ?? 0,
      side: slice.side,
    }))
    .filter((item) => Math.abs(item.amount) > DATA_EPSILON)

  const rankByIndex = new Map<number, number>()
  for (const side of ["assets", "liabilities"] as const) {
    const sideItems = ranked
      .filter((item) => item.side === side)
      .sort((a, b) => b.amount - a.amount)
    sideItems.forEach((item, rank) => rankByIndex.set(item.index, rank + 1))
  }
  return rankByIndex
}

function filterPresentFamilySeries(points: PerformanceNarrativePoint[]): {
  values: number[]
  periods: string[]
} {
  const values: number[] = []
  const periods: string[] = []
  for (const point of points) {
    if (!isAnnualExercisePresent(point)) continue
    values.push(point.revenue)
    periods.push(point.period)
  }
  return { values, periods }
}

function totalForSideAtIndex(slices: FinancialFamilySlice[], side: BalanceSide, pointIndex: number): number {
  return slices
    .filter((slice) => slice.side === side)
    .reduce((sum, slice) => sum + (slice.points[pointIndex]?.revenue ?? 0), 0)
}

function buildFamilyShareSentence(
  slice: FinancialFamilySlice,
  slices: FinancialFamilySlice[],
  rank: number,
): string | null {
  const sideSlices = slices.filter((s) => s.side === slice.side)
  if (sideSlices.length <= 1) return null

  const latestAmount = slice.points[0]?.revenue ?? 0
  const totalLatest = totalForSideAtIndex(slices, slice.side, 0)
  if (Math.abs(totalLatest) < DATA_EPSILON) return null

  const share = (latestAmount / totalLatest) * 100
  const priorAmount = slice.points[1]?.revenue ?? null
  const totalPrior = slice.points.length > 1 ? totalForSideAtIndex(slices, slice.side, 1) : null

  const parts = [
    `Au regard de la structure du bilan, ${slice.metricLabel} représente ${share.toFixed(1).replace(".", ",")} % du ${slice.totalLabel} à la date de référence et constitue ${familyRankLabel(rank, sideSlices.length, slice.side)}.`,
  ]

  if (priorAmount !== null && totalPrior !== null && Math.abs(totalPrior) > DATA_EPSILON) {
    const priorShare = (priorAmount / totalPrior) * 100
    const deltaPts = share - priorShare
    if (Math.abs(deltaPts) > 0.05) {
      parts.push(
        `Sa part du ${slice.totalLabel} est passée de ${priorShare.toFixed(1).replace(".", ",")} % à ${share.toFixed(1).replace(".", ",")} %, ce qui traduit un rééquilibrement de la structure patrimoniale.`,
      )
    } else {
      parts.push(`Sa part du ${slice.totalLabel} demeure stable par rapport à la période précédente.`)
    }
  }

  if (rank === 1 && sideSlices.length > 2) {
    const sorted = [...sideSlices].sort(
      (a, b) => (b.points[0]?.revenue ?? 0) - (a.points[0]?.revenue ?? 0),
    )
    const secondShare = ((sorted[1]?.points[0]?.revenue ?? 0) / totalLatest) * 100
    if (secondShare > 0) {
      const gap = Math.abs(share - secondShare)
      parts.push(
        `Elle devance la deuxième composante de ${gap.toFixed(1).replace(".", ",")} % du ${slice.totalLabel}, ce qui confirme son poids prépondérant dans l'architecture du bilan.`,
      )
    }
  }

  return parts.join(" ")
}

function growthVsTotalClause(metricLabel: string, sourceRate: number, totalRate: number, totalLabel: string): string {
  const spread = sourceRate - totalRate
  if (Math.abs(spread) <= 0.5) {
    return `la croissance de ${metricLabel} (${fmtPctSigned(sourceRate)}) est alignée sur celle du ${totalLabel} (${fmtPctSigned(totalRate)})`
  }
  if (spread > 0) {
    return `${metricLabel} croît plus vite que le ${totalLabel} (${fmtPctSigned(sourceRate)} vs ${fmtPctSigned(totalRate)}), ce qui renforce sa contribution à la structure patrimoniale`
  }
  return `${metricLabel} croît moins vite que le ${totalLabel} (${fmtPctSigned(sourceRate)} vs ${fmtPctSigned(totalRate)}), ce qui tend à réduire sa pondération relative`
}

function buildFamilyGrowthVsTotalParagraph(
  slice: FinancialFamilySlice,
  slices: FinancialFamilySlice[],
  copy: WindowNarrativeCopy,
): string | null {
  const sideSlices = slices.filter((s) => s.side === slice.side)
  if (sideSlices.length <= 1) return null

  const source = filterPresentFamilySeries(slice.points)
  const totalValues: number[] = []
  const totalPeriods: string[] = []
  const pointCount = Math.max(...sideSlices.map((s) => s.points.length), 0)

  for (let i = 0; i < pointCount; i++) {
    const period = slice.points[i]?.period
    if (!period) continue
    const hasAny = sideSlices.some((s) => {
      const point = s.points[i]
      return point && isAnnualExercisePresent(point)
    })
    const total = totalForSideAtIndex(slices, slice.side, i)
    if (!hasAny || Math.abs(total) < DATA_EPSILON) continue
    totalValues.push(total)
    totalPeriods.push(period)
  }

  if (source.values.length < 2 || totalValues.length < 2) return null

  const sentences: string[] = []
  const sourceYoy = pctChange(source.values[0]!, source.values[1]!)
  const totalYoy = pctChange(totalValues[0]!, totalValues[1]!)
  if (sourceYoy !== null && totalYoy !== null) {
    sentences.push(
      `${copy.priorComparisonLabel} (${source.periods[0]} vs ${source.periods[1]}), ${growthVsTotalClause(slice.metricLabel, sourceYoy, totalYoy, slice.totalLabel)}.`,
    )
  }

  const sourceCagr = computeCagr(source.values[0]!, source.values[source.values.length - 1]!, source.values.length - 1)
  const totalCagr = computeCagr(totalValues[0]!, totalValues[totalValues.length - 1]!, totalValues.length - 1)
  if (sourceCagr !== null && totalCagr !== null) {
    const spread = sourceCagr - totalCagr
    const periodLabel = `Sur la période ${source.periods[source.periods.length - 1]} à ${source.periods[0]}`
    if (Math.abs(spread) <= 0.5) {
      sentences.push(
        `${periodLabel}, le TCAC de ${slice.metricLabel} (${fmtPctSigned(sourceCagr)}) est aligné sur celui du ${slice.totalLabel} (${fmtPctSigned(totalCagr)}).`,
      )
    } else if (spread > 0) {
      sentences.push(
        `${periodLabel}, le TCAC de ${slice.metricLabel} (${fmtPctSigned(sourceCagr)}) dépasse celui du ${slice.totalLabel} (${fmtPctSigned(totalCagr)}), traduisant une contribution croissante de ce poste à l'évolution du bilan.`,
      )
    } else {
      sentences.push(
        `${periodLabel}, le TCAC de ${slice.metricLabel} (${fmtPctSigned(sourceCagr)}) reste en deçà de celui du ${slice.totalLabel} (${fmtPctSigned(totalCagr)}), ce qui indique une croissance relative plus modeste de ce poste.`,
      )
    }
  }

  return sentences.length ? sentences.join(" ") : null
}

function buildFamilyCompositionSentence(
  heading: string,
  breakdownTables?: Map<string, ContributiveMarginEvolutionTable>,
): string | null {
  const table = breakdownTables?.get(heading)
  const detailRows = table?.metrics[0]?.detailRows
  if (!detailRows?.length) return null

  const ranked = [...detailRows]
    .filter((row) => Math.abs(row.values[0] ?? 0) > DATA_EPSILON)
    .sort((a, b) => Math.abs(b.values[0] ?? 0) - Math.abs(a.values[0] ?? 0))

  if (!ranked.length) return null

  const total = ranked.reduce((sum, row) => sum + Math.abs(row.values[0] ?? 0), 0)
  if (total < DATA_EPSILON) return null

  const top = ranked[0]!
  const topShare = (Math.abs(top.values[0] ?? 0) / total) * 100
  const topLabel = top.label.trim() || top.id

  if (ranked.length === 1) {
    return `La ventilation détaillée fait ressortir ${topLabel} comme unique poste significatif (${topShare.toFixed(1).replace(".", ",")} % de ce bloc) — développez le tableau ci-dessous pour consulter les comptes du grand livre.`
  }

  const second = ranked[1]!
  const secondShare = (Math.abs(second.values[0] ?? 0) / total) * 100
  return `La ventilation détaillée concentre ${topShare.toFixed(1).replace(".", ",")} % de ce bloc sur ${topLabel}, suivi de ${second.label.trim() || second.id} (${secondShare.toFixed(1).replace(".", ",")} %). Développez les lignes du tableau pour analyser la composition par code de liaison et par compte.`
}

function buildFamilyContextSentence(family: BalancePositionFamily, latestAmount: number, result: FinancialPositionResult): string | null {
  const latest = result.points[0]
  if (!latest) return null

  if (family === "ACT") {
    const share = ratioPct(latestAmount, latest.totalAssets)
    if (share !== null && share > 55) {
      return "Un actif à court terme élevé traduit une structure liquide, favorable au financement du cycle d'exploitation mais à surveiller si l'excédent n'est pas rémunéré."
    }
    if (share !== null && share < 25) {
      return "Un actif à court terme modeste peut signaler une structure plus immobilisée ou un besoin de financement à court terme plus marqué."
    }
    return null
  }

  if (family === "ALT") {
    const share = ratioPct(latestAmount, latest.totalAssets)
    if (share !== null && share > 60) {
      return "La prédominance de l'actif à long terme reflète une intensité capitalistique élevée — la capacité de génération de cash doit absorber ces immobilisations."
    }
    return null
  }

  if (family === "PCT") {
    const share = ratioPct(latestAmount, latest.totalLiabilitiesEquity)
    if (share !== null && share > 50) {
      return "Un passif à court terme important renforce l'enjeu de liquidité et de renouvellement des dettes opérationnelles."
    }
    return null
  }

  if (family === "CAP") {
    const share = ratioPct(latestAmount, latest.totalLiabilitiesEquity)
    if (share !== null && share > 45) {
      return "Des capitaux propres solides offrent une marge de manœuvre pour financer la croissance et absorber les chocs opérationnels."
    }
    if (share !== null && share < 25) {
      return "Des capitaux propres limités augmentent la sensibilité au levier financier et la dépendance au financement externe."
    }
    return null
  }

  return null
}

function buildFinancialFamilyAnalysisParagraph(
  slice: FinancialFamilySlice,
  slices: FinancialFamilySlice[],
  index: number,
  copy: WindowNarrativeCopy,
  rankByIndex: Map<number, number>,
  result: FinancialPositionResult,
  breakdownTables?: Map<string, ContributiveMarginEvolutionTable>,
  withSeasonality = false,
): PerformanceNarrativeParagraph | null {
  const latestAmount = slice.points[0]?.revenue ?? 0
  if (Math.abs(latestAmount) < DATA_EPSILON && result.mappedAccountCount === 0) return null

  const base = buildCurrencySeriesWindowParagraph(
    slice.heading,
    slice.metricLabel,
    slice.points,
    (p) => p.revenue,
    copy,
    {
      withSeasonality,
      comparisonNoun: "montants",
      section: SECTION,
    },
  )

  if (!base && Math.abs(latestAmount) < DATA_EPSILON) {
    return {
      heading: slice.heading,
      section: SECTION,
      body: `À la date de référence, ${slice.metricLabel} est négligeable ou nul sur l'horizon analysé. Les postes détaillés apparaissent dans le tableau ci-dessous lorsqu'ils sont renseignés dans le mapping comptable.`,
    }
  }

  const shareSentence = buildFamilyShareSentence(slice, slices, rankByIndex.get(index) ?? index + 1)
  const compositionSentence = buildFamilyCompositionSentence(slice.heading, breakdownTables)
  const contextSentence = buildFamilyContextSentence(slice.family, latestAmount, result)

  const bodyParts: string[] = []
  if (base) {
    bodyParts.push(base.body)
  } else {
    bodyParts.push(
      `À la date de référence, ${slice.metricLabel} est négligeable ou nul (${formatCurrency(latestAmount)}).`,
    )
  }
  if (shareSentence) bodyParts.push(shareSentence)
  if (compositionSentence) bodyParts.push(compositionSentence)
  if (contextSentence) bodyParts.push(contextSentence)

  const growthVsTotal = buildFamilyGrowthVsTotalParagraph(slice, slices, copy)

  return {
    heading: slice.heading,
    section: SECTION,
    body: bodyParts.join(" "),
    secondaryBody: growthVsTotal ?? base?.secondaryBody,
    seasonalityBody: base?.seasonalityBody,
    statsLine: base?.statsLine,
  }
}

export function buildFinancialPositionNarrative(
  result: FinancialPositionResult,
  view: string,
  options?: {
    breakdownTables?: Map<string, ContributiveMarginEvolutionTable>
  },
): PerformanceNarrativeResult | null {
  if (!result.points.length) return null

  const resolved = resolveWindowNarrativeCopy(view)
  if (!resolved) return null
  const { copy, mode } = resolved

  const slices = buildFamilySlices(result)
  const rankByIndex = buildFamilyRankMap(slices)
  const withSeasonality = view === "24months"

  const paragraphs = slices
    .map((slice, index) =>
      buildFinancialFamilyAnalysisParagraph(
        slice,
        slices,
        index,
        copy,
        rankByIndex,
        result,
        options?.breakdownTables,
        withSeasonality,
      ),
    )
    .filter((p): p is PerformanceNarrativeParagraph => p !== null)

  if (!paragraphs.length) return null

  const referencePeriod =
    result.points.find((_, i) =>
      slices.some((slice) => {
        const point = slice.points[i]
        return point && isAnnualExercisePresent(point)
      }),
    )?.period ?? result.points[0]?.period ?? ""

  return {
    title: "Lecture de la situation financière",
    subtitle:
      view === "years"
        ? "Structure du bilan de la société sur les cinq derniers exercices — lecture par composante."
        : "Structure du bilan de la société sur les vingt-quatre derniers mois — lecture par composante.",
    mode,
    referencePeriod,
    paragraphs,
  }
}
