/**
 * Commentaires narratifs du rapport Diagnostic (style mémo d'investissement).
 *
 * Fonctions pures et déterministes : chaque section dérive une ou deux phrases
 * françaises du payload `CompanyDiagnostic`. Aucune donnée manquante ne doit
 * produire « NaN » ou « undefined » — on omet la phrase plutôt que de l'imprimer.
 */

import type { CompanyDiagnostic } from "@/lib/api"
import {
  formatMoney,
  formatMultiple,
  formatPercent,
  formatRatio,
} from "@/components/diagnostic/diagnostic-format"

function isNum(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value)
}

/** Tendances : croissance du CA + évolution de la marge EBITDA. */
export function trendsNarrative(d: CompanyDiagnostic): string | null {
  const parts: string[] = []
  const s = d.summary
  const years = d.trends.length

  if (isNum(s.latest_revenue)) {
    const rev = formatMoney(s.latest_revenue, d.currency)
    if (isNum(s.revenue_cagr_5y) && years >= 2) {
      const pct = formatPercent(Math.abs(s.revenue_cagr_5y))
      if (s.revenue_cagr_5y > 1) {
        parts.push(
          `Chiffre d'affaires en croissance de ${pct} par an sur ${years} ans, atteignant ${rev} en ${s.latest_fiscal_year}.`
        )
      } else if (s.revenue_cagr_5y < -1) {
        parts.push(
          `Chiffre d'affaires en décroissance de ${pct} par an sur ${years} ans, à ${rev} en ${s.latest_fiscal_year}.`
        )
      } else {
        parts.push(
          `Chiffre d'affaires stable sur ${years} ans, à ${rev} en ${s.latest_fiscal_year}.`
        )
      }
    } else {
      parts.push(`Chiffre d'affaires de ${rev} en ${s.latest_fiscal_year}.`)
    }
  }

  if (isNum(s.latest_ebitda_margin_pct)) {
    const sorted = [...d.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
    const first = sorted.find((t) => isNum(t.ebitda_margin_pct))
    let trend = ""
    if (
      first &&
      isNum(first.ebitda_margin_pct) &&
      first.fiscal_year !== s.latest_fiscal_year
    ) {
      const diff = s.latest_ebitda_margin_pct - first.ebitda_margin_pct
      if (diff > 1) {
        trend = ` (en hausse par rapport à ${formatPercent(first.ebitda_margin_pct)} il y a ${years} ans)`
      } else if (diff < -1) {
        trend = ` (en baisse par rapport à ${formatPercent(first.ebitda_margin_pct)} il y a ${years} ans)`
      } else {
        trend = " (stable sur la période)"
      }
    }
    parts.push(`Marge EBITDA de ${formatPercent(s.latest_ebitda_margin_pct)}${trend}.`)
  }

  return parts.length > 0 ? parts.join(" ") : null
}

/** Saisonnalité : mois fort / mois faible, ou activité peu saisonnière. */
export function seasonalityNarrative(d: CompanyDiagnostic): string | null {
  const valid = d.seasonality.filter((m) => isNum(m.revenue_share_pct))
  if (valid.length < 2) return null

  const peak = valid.reduce((a, b) =>
    (b.revenue_share_pct as number) > (a.revenue_share_pct as number) ? b : a
  )
  const trough = valid.reduce((a, b) =>
    (b.revenue_share_pct as number) < (a.revenue_share_pct as number) ? b : a
  )
  const spread =
    (peak.revenue_share_pct as number) - (trough.revenue_share_pct as number)

  if (spread < 3) {
    return "Activité peu saisonnière : les revenus sont répartis de façon relativement uniforme sur l'année."
  }
  return `L'activité culmine en ${peak.month_label} (${formatPercent(peak.revenue_share_pct)} du CA annuel) et ralentit en ${trough.month_label} (${formatPercent(trough.revenue_share_pct)}).`
}

/** Divisions : nombre, rentabilité, division dominante et divisions déficitaires. */
export function divisionsNarrative(d: CompanyDiagnostic): string | null {
  const divs = d.divisions
  if (divs.length === 0) return null

  const losing = divs.filter((x) => !x.profitable)

  if (divs.length === 1) {
    const only = divs[0]
    return `Une seule division, ${only.division_name}, ${only.profitable ? "rentable" : "déficitaire"}.`
  }

  const parts: string[] = []
  const profitableCount = divs.length - losing.length
  parts.push(
    `${divs.length} divisions, dont ${profitableCount} rentable${profitableCount > 1 ? "s" : ""}.`
  )

  const top = [...divs].sort((a, b) => b.revenue - a.revenue)[0]
  if (top && isNum(top.revenue_share_pct)) {
    parts.push(`${top.division_name} génère ${formatPercent(top.revenue_share_pct)} du CA.`)
  }

  if (losing.length === 1) {
    parts.push(`La division ${losing[0].division_name} est déficitaire.`)
  } else if (losing.length > 1) {
    parts.push(
      `Les divisions ${losing.map((x) => x.division_name).join(", ")} sont déficitaires.`
    )
  }

  return parts.join(" ")
}

/** Ratios : une phrase liquidité (seuil 1,0) + une phrase endettement. */
export function ratiosNarrative(d: CompanyDiagnostic): string | null {
  const s = d.summary
  const parts: string[] = []

  if (isNum(s.current_ratio)) {
    const cr = formatRatio(s.current_ratio)
    if (s.current_ratio >= 1.5) {
      parts.push(`Liquidité confortable : ratio courant de ${cr}, bien au-dessus du seuil de 1,0.`)
    } else if (s.current_ratio >= 1) {
      parts.push(`Liquidité adéquate : ratio courant de ${cr} (seuil : 1,0).`)
    } else {
      parts.push(`Liquidité sous pression : ratio courant de ${cr}, sous le seuil de 1,0.`)
    }
  }

  if (isNum(s.debt_to_equity)) {
    const de = formatRatio(s.debt_to_equity)
    if (s.debt_to_equity < 0.5) {
      parts.push(`Endettement faible (dette/capitaux propres de ${de}).`)
    } else if (s.debt_to_equity <= 1.5) {
      parts.push(`Endettement modéré (dette/capitaux propres de ${de}).`)
    } else {
      parts.push(`Endettement élevé (dette/capitaux propres de ${de}).`)
    }
  }

  return parts.length > 0 ? parts.join(" ") : null
}

/** Capex : montant, % du CA et intensité (>10 % soutenus, 3–10 % modérés, <3 % faibles). */
export function capexNarrative(d: CompanyDiagnostic): string | null {
  const s = d.summary

  // Capex quasi nul sur toute la période → l'entreprise investit peu.
  const capexValues = d.trends.map((t) => Math.abs(t.capex))
  const revenueScale = Math.max(...d.trends.map((t) => Math.abs(t.revenue)), 0)
  const nearZeroThreshold = Math.max(1, revenueScale * 0.001)
  const allNearZero =
    d.trends.length > 0 && capexValues.every((c) => c < nearZeroThreshold)
  if (allNearZero && Math.abs(s.capex_latest) < nearZeroThreshold) {
    return "L'entreprise investit peu en immobilisations."
  }

  if (!isNum(s.capex_latest)) return null
  const amount = formatMoney(s.capex_latest, d.currency)

  if (isNum(s.capex_revenue_pct)) {
    const intensity =
      s.capex_revenue_pct > 10
        ? "soutenus"
        : s.capex_revenue_pct >= 3
          ? "modérés"
          : "faibles"
    return `Investissements de ${amount} en ${s.latest_fiscal_year} (${formatPercent(s.capex_revenue_pct)} du CA) — investissements ${intensity}.`
  }
  return `Investissements de ${amount} en ${s.latest_fiscal_year}.`
}

/** Valorisation : rappel de la fourchette et de son caractère indicatif. */
export function valuationNarrative(d: CompanyDiagnostic): string | null {
  const v = d.valuation
  if (!v) return null
  if (v.enterprise_value_low === 0 && v.enterprise_value_high === 0) return null

  const c = d.currency
  return `Valeur d'entreprise indicative entre ${formatMoney(v.enterprise_value_low, c)} et ${formatMoney(v.enterprise_value_high, c)} (point médian : ${formatMoney(v.enterprise_value_mid, c)}), fondée sur un EBITDA normalisé de ${formatMoney(v.normalized_ebitda, c)} et un multiple de ${formatMultiple(v.multiple_low)} à ${formatMultiple(v.multiple_high)}. Cette fourchette est indicative et ne constitue pas une évaluation formelle.`
}
