import type { DivisionProfitabilityRow } from "@/lib/division-profitability"
import type { ExpenseContributionBridgeResult } from "@/lib/expense-contribution-bridge"
import type {
  PerformanceNarrativeParagraph,
  PerformanceNarrativeResult,
  RevenueSeriesNarrativeSlice,
} from "@/lib/income-performance-narrative"
import type { DiagnosticNarrativeBundle } from "@/lib/diagnostic-narrative-bundle"

const DATA_EPSILON = 1e-6

export const EXECUTIVE_SUMMARY_QUESTIONS = {
  performance:
    "Quelle est la tendance des revenus, de la contribution marginale et du BAIIA ?",
  revenue: "D'où vient réellement la croissance des revenus ?",
  "margin-by-revenue":
    "Quelles sources de revenus créent le plus de valeur et le moins de valeur, et quelle est la tendance de la contribution marginale ?",
  expenses:
    "L'entreprise possède-t-elle une structure de coûts à forte concentration de frais variables ou de frais fixes, et quels sont les principaux postes ?",
  "expenses-by-division":
    "Quelles divisions créent le plus de valeur et le moins de valeur, et quelle est la tendance des revenus, de la contribution marginale et du BAIIA ?",
} as const

function paragraphText(paragraph: PerformanceNarrativeParagraph): string {
  return [paragraph.body, paragraph.secondaryBody, paragraph.seasonalityBody]
    .filter(Boolean)
    .join(" ")
}

function findParagraph(
  narrative: PerformanceNarrativeResult | null | undefined,
  heading: string,
): PerformanceNarrativeParagraph | undefined {
  return narrative?.paragraphs.find((p) => p.heading === heading)
}

function pctChange(current: number, base: number): number | null {
  if (Math.abs(base) < DATA_EPSILON) return null
  return ((current - base) / Math.abs(base)) * 100
}

function nfPct(v: number, digits = 1): string {
  const sign = v > 0 ? "+" : ""
  return `${sign}${v.toFixed(digits).replace(".", ",")} %`
}

function rankRevenueSlicesByGrowth(
  slices: RevenueSeriesNarrativeSlice[],
): Array<{ heading: string; growth: number | null; revenue: number }> {
  return slices
    .map((slice) => {
      const latest = slice.points[0]?.revenue ?? 0
      const prior = slice.points[1]?.revenue ?? null
      return {
        heading: slice.heading,
        growth: prior !== null ? pctChange(latest, prior) : null,
        revenue: latest,
      }
    })
    .sort((a, b) => (b.growth ?? Number.NEGATIVE_INFINITY) - (a.growth ?? Number.NEGATIVE_INFINITY))
}

function rankMarginSlices(
  slices: RevenueSeriesNarrativeSlice[],
): Array<{ heading: string; margin: number; revenue: number }> {
  return slices
    .map((slice) => {
      const latest = slice.points[0]
      const margin = latest?.grossMarginPercent ?? 0
      return {
        heading: slice.heading,
        margin,
        revenue: latest?.revenue ?? 0,
      }
    })
    .filter((item) => Math.abs(item.revenue) > DATA_EPSILON)
    .sort((a, b) => b.margin - a.margin)
}

export function compressPerformanceNarrative(
  narrative: PerformanceNarrativeResult | null,
): string[] {
  if (!narrative) return []

  const revenue = findParagraph(narrative, "Revenus")
  const margin = findParagraph(narrative, "Contribution marginale")
  const baiia = findParagraph(narrative, "BAIIA")

  return [revenue, margin, baiia]
    .filter((p): p is PerformanceNarrativeParagraph => Boolean(p))
    .map(paragraphText)
    .filter(Boolean)
}

export function compressRevenueNarrative(
  narrative: PerformanceNarrativeResult | null,
  slices: RevenueSeriesNarrativeSlice[],
): string[] {
  if (!narrative?.paragraphs.length) return []

  const ranked = rankRevenueSlicesByGrowth(slices)
  const growers = ranked.filter((item) => item.growth !== null && item.growth > 0.5)
  const decliners = ranked.filter((item) => item.growth !== null && item.growth < -0.5)

  const introParts: string[] = []
  if (growers.length > 0) {
    const names = growers
      .slice(0, 3)
      .map((item) => `${item.heading} (${nfPct(item.growth!)})`)
    introParts.push(
      `La croissance des revenus est portée principalement par ${names.join(", ")}.`,
    )
  } else if (ranked.length > 0) {
    introParts.push(
      "La croissance consolidée des revenus provient surtout d'une recomposition du mix plutôt que d'une accélération uniforme des sources.",
    )
  }

  if (decliners.length > 0) {
    const names = decliners
      .slice(0, 2)
      .map((item) => `${item.heading} (${nfPct(item.growth!)})`)
    introParts.push(`À l'inverse, ${names.join(" et ")} frein${decliners.length > 1 ? "ent" : ""} la dynamique globale.`)
  }

  const detailParagraphs = narrative.paragraphs
    .slice(0, 2)
    .map(paragraphText)
    .filter(Boolean)

  return [...introParts, ...detailParagraphs]
}

export function compressMarginByRevenueNarrative(
  narrative: PerformanceNarrativeResult | null,
  slices: RevenueSeriesNarrativeSlice[] | null,
): string[] {
  if (!narrative?.paragraphs.length && !slices?.length) return []

  const ranked = rankMarginSlices(slices ?? [])
  const paragraphs: string[] = []

  if (ranked.length >= 2) {
    const best = ranked[0]!
    const worst = ranked[ranked.length - 1]!
    paragraphs.push(
      `${best.heading} crée le plus de valeur avec une contribution marginale de ${best.margin.toFixed(1).replace(".", ",")} % du chiffre d'affaires.`,
      `${worst.heading} affiche la contribution marginale la plus faible (${worst.margin.toFixed(1).replace(".", ",")} % du CA) — poste à surveiller dans le mix.`,
    )
  } else if (ranked.length === 1) {
    paragraphs.push(
      `${ranked[0]!.heading} concentre l'essentiel de la lecture de marge contributive (${ranked[0]!.margin.toFixed(1).replace(".", ",")} % du CA).`,
    )
  }

  const trendParagraph = narrative?.paragraphs
    .map(paragraphText)
    .find((text) => /marge contributive|contribution marginale|ratio/i.test(text))
  if (trendParagraph) {
    paragraphs.push(trendParagraph)
  } else if (narrative?.paragraphs[0]) {
    paragraphs.push(paragraphText(narrative.paragraphs[0]))
  }

  return paragraphs.slice(0, 3)
}

export function compressExpensesNarrative(
  narrative: PerformanceNarrativeResult | null,
  bridge: ExpenseContributionBridgeResult | null,
): string[] {
  if (!narrative?.paragraphs.length && !bridge?.points[0]) return []

  const latest = bridge?.points[0]
  const paragraphs: string[] = []

  if (latest && Math.abs(latest.revenue) > DATA_EPSILON) {
    const cvShare = (latest.variableCosts / latest.revenue) * 100
    const cfShare = (latest.fixedCosts / latest.revenue) * 100
    const totalCosts = latest.variableCosts + latest.fixedCosts
    const cvOfCosts =
      totalCosts > DATA_EPSILON ? (latest.variableCosts / totalCosts) * 100 : null

    if (cvOfCosts !== null) {
      paragraphs.push(
        cvOfCosts >= 55
          ? `La structure de coûts est davantage portée par les charges variables (${cvOfCosts.toFixed(0)} % des charges d'exploitation, soit ${cvShare.toFixed(1).replace(".", ",")} % du CA) que par les charges fixes (${cfShare.toFixed(1).replace(".", ",")} % du CA).`
          : `La structure de coûts est davantage portée par les charges fixes (${(100 - cvOfCosts).toFixed(0)} % des charges d'exploitation, soit ${cfShare.toFixed(1).replace(".", ",")} % du CA) que par les charges variables (${cvShare.toFixed(1).replace(".", ",")} % du CA).`,
      )
    }
  }

  const variable = narrative?.paragraphs.filter((p) => p.heading === "Coûts variables") ?? []
  const fixed = narrative?.paragraphs.filter((p) => p.heading === "Coûts fixes") ?? []
  if (variable.length) {
    for (const paragraph of variable) {
      paragraphs.push(paragraphText(paragraph))
    }
  }
  if (fixed.length) {
    for (const paragraph of fixed) {
      paragraphs.push(paragraphText(paragraph))
    }
  }

  return paragraphs.slice(0, 3)
}

function divisionParagraphs(
  narrative: PerformanceNarrativeResult | null,
  divisionName: string,
): string[] {
  if (!narrative) return []
  return narrative.paragraphs
    .filter((p) => p.divisionTitle === divisionName)
    .map(paragraphText)
    .filter(Boolean)
}

export function compressDivisionsNarrative(
  narrative: PerformanceNarrativeResult | null,
  rows: DivisionProfitabilityRow[],
): string[] {
  if (!rows.length) return []

  const byOperatingProfit = [...rows].sort(
    (a, b) => (b.operatingProfit ?? b.contributiveMargin ?? 0) - (a.operatingProfit ?? a.contributiveMargin ?? 0),
  )
  const best = byOperatingProfit[0]!
  const worst = byOperatingProfit[byOperatingProfit.length - 1]!

  const paragraphs: string[] = [
    `${best.label} crée le plus de valeur${best.operatingMarginPct != null ? ` (marge BAIIA de ${best.operatingMarginPct.toFixed(1).replace(".", ",")} % du CA)` : best.contributiveMarginPct != null ? ` (contribution marginale de ${best.contributiveMarginPct.toFixed(1).replace(".", ",")} % du CA)` : ""}.`,
  ]

  if (worst.label !== best.label) {
    paragraphs.push(
      `${worst.label} affiche la rentabilité la plus faible${worst.operatingMarginPct != null ? ` (marge BAIIA de ${worst.operatingMarginPct.toFixed(1).replace(".", ",")} % du CA)` : worst.contributiveMarginPct != null ? ` (contribution marginale de ${worst.contributiveMarginPct.toFixed(1).replace(".", ",")} % du CA)` : ""}.`,
    )
  }

  const bestDetails = divisionParagraphs(narrative, best.label).slice(0, 1)
  const worstDetails =
    worst.label !== best.label ? divisionParagraphs(narrative, worst.label).slice(0, 1) : []

  return [...paragraphs, ...bestDetails, ...worstDetails].slice(0, 4)
}

export function compressNarrativeBundle(bundle: DiagnosticNarrativeBundle): {
  performance: string[]
  revenue: string[]
  marginByRevenue: string[]
  expenses: string[]
  divisions: string[]
} {
  return {
    performance: compressPerformanceNarrative(bundle.performance),
    revenue: compressRevenueNarrative(bundle.revenue, bundle.revenueSlices),
    marginByRevenue: compressMarginByRevenueNarrative(
      bundle.marginByRevenue,
      bundle.marginSlices,
    ),
    expenses: compressExpensesNarrative(bundle.expenses, bundle.expenseBridge),
    divisions: compressDivisionsNarrative(bundle.divisions, bundle.divisionRows),
  }
}
