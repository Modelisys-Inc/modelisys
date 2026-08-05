import {
  BALANCE_POSITION_FAMILIES,
  BALANCE_POSITION_FAMILY_LABELS,
  type BalancePositionFamily,
  type FinancialPositionResult,
  familyHeading,
  ratioPct,
} from "@/lib/financial-position"
import { formatCurrency } from "@/lib/financial-utils"
import type { PerformanceNarrativeParagraph, PerformanceNarrativeResult } from "@/lib/income-performance-narrative"

const DATA_EPSILON = 1e-6
const SECTION = "financial-position" as const

function fmtPctPlain(value: number, digits = 1): string {
  return `${value.toFixed(digits).replace(".", ",")} %`
}

function referenceForPeriod(view: string, period: string): string {
  return view === "years" ? `l'exercice ${period}` : `le mois de ${period}`
}

function priorComparisonLabel(view: string): string {
  return view === "years" ? "En glissement annuel" : "Par rapport au mois précédent"
}

function describeFamilyBalance(
  family: BalancePositionFamily,
  latest: FinancialPositionResult["points"][number],
  view: string,
): string {
  const label = BALANCE_POSITION_FAMILY_LABELS[family]
  const amount = latest[family.toLowerCase() as "act" | "alt" | "pct" | "plt" | "cap"]
  const isAsset = family === "ACT" || family === "ALT"
  const total = isAsset ? latest.totalAssets : latest.totalLiabilitiesEquity
  const share = ratioPct(amount, total)

  const sharePart =
    share !== null
      ? `, soit ${fmtPctPlain(share)} du ${isAsset ? "total de l'actif" : "total du passif et des capitaux propres"}`
      : ""

  return `Pour ${referenceForPeriod(view, latest.period)}, la société affiche ${formatCurrency(amount)} en ${label.toLowerCase()}${sharePart}. Les postes les plus significatifs sont détaillés dans le tableau ci-dessous — développez les lignes pour voir la ventilation par code de liaison et par compte du grand livre.`
}

function describeFamilyTrend(
  family: BalancePositionFamily,
  result: FinancialPositionResult,
  view: string,
): string | null {
  const latest = result.points[0]
  const prior = result.points[1]
  if (!latest || !prior) return null

  const key = family.toLowerCase() as "act" | "alt" | "pct" | "plt" | "cap"
  const latestVal = latest[key]
  const priorVal = prior[key]
  if (Math.abs(priorVal) < DATA_EPSILON) return null

  const change = ((latestVal - priorVal) / Math.abs(priorVal)) * 100
  if (Math.abs(change) < 0.5) return null

  const label = BALANCE_POSITION_FAMILY_LABELS[family].toLowerCase()
  return `${priorComparisonLabel(view)}, le ${label} évolue de ${change >= 0 ? "+" : ""}${change.toFixed(1).replace(".", ",")} % (${formatCurrency(priorVal)} → ${formatCurrency(latestVal)}).`
}

export function buildFinancialPositionNarrative(
  result: FinancialPositionResult,
  view: string,
): PerformanceNarrativeResult | null {
  if (!result.points.length) return null

  const paragraphs: PerformanceNarrativeParagraph[] = []

  for (const family of BALANCE_POSITION_FAMILIES) {
    const latest = result.points[0]
    if (!latest) continue

    const amount = latest[family.toLowerCase() as "act" | "alt" | "pct" | "plt" | "cap"]
    if (Math.abs(amount) < DATA_EPSILON && result.mappedAccountCount === 0) continue

    const heading = familyHeading(family)
    const trend = describeFamilyTrend(family, result, view)

    paragraphs.push({
      section: SECTION,
      heading,
      body: describeFamilyBalance(family, latest, view),
      secondaryBody: trend ?? undefined,
    })
  }

  if (!paragraphs.length) return null

  return {
    title: "Lecture de la situation financière",
    subtitle:
      view === "years"
        ? "Structure du bilan de la société sur les cinq derniers exercices."
        : "Structure du bilan de la société sur les vingt-quatre derniers mois.",
    mode: view === "years" ? "annual" : "monthly",
    paragraphs,
  }
}
