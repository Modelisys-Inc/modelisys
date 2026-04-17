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

function pctChange(current: number, base: number): number | null {
  if (Math.abs(base) < 1e-9) return null
  return ((current - base) / Math.abs(base)) * 100
}

function fmtPct(p: number, digits = 1): string {
  const sign = p > 0 ? "+" : ""
  return `${sign}${p.toFixed(digits)} %`
}

function trendWord(delta: number): "progression" | "recul" | "stabilité" {
  if (delta > 0.5) return "progression"
  if (delta < -0.5) return "recul"
  return "stabilité"
}

function horizonLabel(view: string): string {
  if (view === "quarters")
    return `les ${PERFORMANCE_CHART_QUARTER_COUNT} trimestres couverts sur le graphique`
  if (view === "years")
    return `les ${PERFORMANCE_CHART_YEAR_COUNT} années affichées`
  return "les douze derniers mois couverts"
}

/**
 * Heuristique pour réutiliser la synthèse textuelle : 1er histogramme = revenus, 2e = BAIIA,
 * 1re courbe au format ratio = marge % — aligné sur la config par défaut.
 * Le bénéfice brut absolu est estimé par revenus × (marge % / 100) pour alimenter le paragraphe marge.
 */
export function mapDynamicChartToNarrativePoints(
  points: DynamicChartPoint[],
  seriesMeta: BuiltSeriesMeta[]
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

/**
 * Texte d’appui (ton revue de gestion / direction financière) à partir des séries du graphique.
 * Trois blocs : revenus, marge brute, BAIIA.
 */
export function buildIncomePerformanceNarrative(
  data: PerformanceNarrativePoint[],
  view: string
): { title: string; paragraphs: { heading: string; body: string }[] } | null {
  if (!data.length) return null

  const latest = data[0]!
  const prior = data.length > 1 ? data[1]! : null
  const oldest = data.length > 1 ? data[data.length - 1]! : latest
  const horizon = horizonLabel(view)

  const revSeq = prior
    ? pctChange(latest.revenue, prior.revenue)
    : null
  const revWindow = data.length > 1 && Math.abs(oldest.revenue) > 1e-6
    ? pctChange(latest.revenue, oldest.revenue)
    : null

  let revenueText = ""
  if (prior && revSeq !== null) {
    const dir = trendWord(revSeq)
    revenueText =
      dir === "stabilité"
        ? `Pour ${latest.period}, les revenus s’établissent à ${formatCurrency(latest.revenue)}, en quasi-stabilité par rapport à ${prior.period} (${formatCurrency(prior.revenue)}).`
        : `Pour ${latest.period}, les revenus s’établissent à ${formatCurrency(latest.revenue)}, en ${dir} de ${fmtPct(Math.abs(revSeq))} par rapport à ${prior.period} (${formatCurrency(prior.revenue)}).`
  } else if (prior && revSeq === null && Math.abs(prior.revenue) < 1e-6 && Math.abs(latest.revenue) > 1e-6) {
    revenueText = `Pour ${latest.period}, les revenus s’établissent à ${formatCurrency(latest.revenue)}, à la suite d’une base quasi nulle en ${prior.period}.`
  } else {
    revenueText = `Pour ${latest.period}, les revenus s’établissent à ${formatCurrency(latest.revenue)}.`
  }
  if (revWindow !== null && data.length > 2 && Math.abs(revWindow) > 0.5) {
    const w = trendWord(revWindow)
    revenueText += ` Sur ${horizon}, le niveau le plus récent se distingue du début de fenêtre (${oldest.period}) par une ${w === "stabilité" ? "évolution modérée" : w === "progression" ? "progression" : "contraction"} (${fmtPct(revWindow)} en variation relative).`
  } else if (data.length > 2) {
    revenueText += ` La lecture sur ${horizon} reste à contextualiser avec le calendrier commercial et les effets de base.`
  }

  const gpSeq =
    prior && Math.abs(prior.grossProfit) > 1e-6
      ? pctChange(latest.grossProfit, prior.grossProfit)
      : null
  const marginDelta =
    prior !== null ? latest.grossMarginPercent - prior.grossMarginPercent : null

  let marginText = ""
  if (prior && marginDelta !== null) {
    const pp = marginDelta >= 0 ? "+" : ""
    marginText = `La marge brute rapportée aux revenus s’affiche à ${latest.grossMarginPercent.toFixed(1)} % pour ${latest.period}, contre ${prior.grossMarginPercent.toFixed(1)} % pour ${prior.period} (${pp}${marginDelta.toFixed(1)} point${Math.abs(marginDelta) >= 2 ? "s" : ""} de pourcentage). `
  } else {
    marginText = `La marge brute rapportée aux revenus s’affiche à ${latest.grossMarginPercent.toFixed(1)} % pour ${latest.period}. `
  }
  if (gpSeq !== null) {
    const t = trendWord(gpSeq)
    marginText +=
      t === "stabilité"
        ? `Le bénéfice brut absolu est stable d’une période à l’autre (${formatCurrency(latest.grossProfit)}).`
        : `Le bénéfice brut affiche une ${t} de ${fmtPct(Math.abs(gpSeq))} en séquentiel (${formatCurrency(latest.grossProfit)} vs ${formatCurrency(prior!.grossProfit)}).`
  } else {
    marginText += `Le bénéfice brut s’élève à ${formatCurrency(latest.grossProfit)}.`
  }
  if (prior && latest.revenue > 0 && prior.revenue > 0) {
    const absLatest = latest.grossProfit
    const absPrior = prior.grossProfit
    if ((latest.revenue > prior.revenue && absLatest < absPrior) || (latest.revenue < prior.revenue && absLatest > absPrior)) {
      marginText +=
        " L’écart entre volume et marge invite à vérifier le mix produit / client et le coût des ventes."
    }
  }

  const ebitaSeq =
    prior && Math.abs(prior.ebita) > 1e-6
      ? pctChange(latest.ebita, prior.ebita)
      : prior
        ? pctChange(latest.ebita, prior.ebita)
        : null
  const ebitaRatioLatest =
    Math.abs(latest.revenue) > 1e-6 ? (latest.ebita / latest.revenue) * 100 : null
  const ebitaRatioPrior =
    prior && Math.abs(prior.revenue) > 1e-6 ? (prior.ebita / prior.revenue) * 100 : null

  let ebitaText = ""
  if (prior && ebitaSeq !== null && Math.abs(prior.ebita) > 1e-6) {
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
    title: "Lecture de la performance",
    paragraphs: [
      { heading: "Évolution des revenus", body: revenueText },
      { heading: "Évolution de la marge brute", body: marginText },
      { heading: "Évolution du BAIIA", body: ebitaText },
    ],
  }
}
