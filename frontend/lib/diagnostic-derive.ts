/**
 * Dérivations client du rapport Diagnostic : indice de santé, piliers,
 * définitions de ratios et signaux.
 *
 * Tout ce qui se trouve ici est calculé à partir de `CompanyDiagnostic`
 * tel que retourné aujourd'hui par `GET /api/companies/{id}/diagnostic`.
 * Aucune de ces fonctions ne nécessite de changement backend.
 */

import type { CompanyDiagnostic, DiagnosticTrendYear } from "@/lib/api"
import { DEFAULT_BENCHMARK, type SectorBenchmark } from "@/lib/diagnostic-benchmarks"
import type { SignalTone } from "@/lib/diagnostic-theme"

/** Ramène une valeur sur une échelle 0-100 par interpolation linéaire bornée. */
function scale(value: number | null | undefined, floor: number, ceil: number): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 50
  const pct = ((value - floor) / (ceil - floor)) * 100
  return Math.max(0, Math.min(100, pct))
}

/** Idem, mais « plus bas = mieux » (levier, endettement). */
function scaleInverse(value: number | null | undefined, best: number, worst: number): number {
  if (value === null || value === undefined || !Number.isFinite(value)) return 50
  const pct = ((worst - value) / (worst - best)) * 100
  return Math.max(0, Math.min(100, pct))
}

export interface HealthPillar {
  key: string
  label: string
  /** 0-100. */
  score: number
  /** Position 0-100 de la médiane sectorielle sur la même échelle. */
  benchmark: number
}

export interface HealthIndex {
  /** 0-100, moyenne pondérée des piliers. */
  score: number
  pillars: HealthPillar[]
  /** Écart en points vs l'exercice précédent (null si un seul exercice). */
  deltaVsPreviousYear: number | null
  benchmark: SectorBenchmark
}

const PILLAR_WEIGHTS: Record<string, number> = {
  croissance: 0.25,
  rentabilite: 0.25,
  liquidite: 0.2,
  structure: 0.15,
  efficacite: 0.15,
}

function pillarsForYear(
  year: DiagnosticTrendYear,
  cagr: number | null,
  b: SectorBenchmark
): HealthPillar[] {
  const netDebtToEbitda =
    year.ebitda > 0 ? (year.total_liabilities - year.current_assets + year.inventory) / year.ebitda : null

  return [
    {
      key: "croissance",
      label: "Croissance",
      score: scale(cagr, -5, 25),
      benchmark: scale(b.revenue_cagr_pct, -5, 25),
    },
    {
      key: "rentabilite",
      label: "Rentabilité",
      score: scale(year.ebitda_margin_pct, 0, 25),
      benchmark: scale(b.ebitda_margin_pct, 0, 25),
    },
    {
      key: "liquidite",
      label: "Liquidité",
      score: scale(year.current_ratio, 0.8, 3.0),
      benchmark: scale(b.current_ratio, 0.8, 3.0),
    },
    {
      key: "structure",
      label: "Structure fin.",
      score: (scaleInverse(year.debt_to_equity, 0.2, 2.5) + scaleInverse(netDebtToEbitda, 0.5, 5)) / 2,
      benchmark:
        (scaleInverse(b.debt_to_equity, 0.2, 2.5) + scaleInverse(b.net_debt_to_ebitda, 0.5, 5)) / 2,
    },
    {
      key: "efficacite",
      label: "Efficacité",
      score: scale(year.asset_turnover, 0.6, 2.2),
      benchmark: scale(b.asset_turnover, 0.6, 2.2),
    },
  ]
}

function weightedScore(pillars: HealthPillar[]): number {
  const total = pillars.reduce((sum, p) => sum + p.score * (PILLAR_WEIGHTS[p.key] ?? 0), 0)
  return Math.round(total)
}

/** Indice de santé Modelisys : 0-100 + décomposition en 5 piliers. */
export function computeHealthIndex(
  diagnostic: CompanyDiagnostic,
  benchmark: SectorBenchmark = DEFAULT_BENCHMARK
): HealthIndex {
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const previous = years.length > 1 ? years[years.length - 2] : null

  if (!latest) {
    return { score: 0, pillars: [], deltaVsPreviousYear: null, benchmark }
  }

  const pillars = pillarsForYear(latest, diagnostic.summary.revenue_cagr_5y, benchmark)
  const score = weightedScore(pillars)

  let delta: number | null = null
  if (previous) {
    // Le TCAC glissant n'est pas disponible par exercice : on réutilise le TCAC 5 ans
    // pour le pilier croissance des deux années, l'écart provient donc des 4 autres piliers.
    const prevScore = weightedScore(pillarsForYear(previous, diagnostic.summary.revenue_cagr_5y, benchmark))
    delta = score - prevScore
  }

  return { score, pillars, deltaVsPreviousYear: delta, benchmark }
}

/** Quartile textuel affiché à côté du score. */
export function quartileLabel(score: number): string {
  if (score >= 75) return "4e quartile"
  if (score >= 50) return "3e quartile"
  if (score >= 25) return "2e quartile"
  return "1er quartile"
}

// ---------------------------------------------------------------------------
// Ratios
// ---------------------------------------------------------------------------

export interface RatioDefinition {
  key: string
  label: string
  get: (y: DiagnosticTrendYear) => number | null
  format: (v: number) => string
  benchmark: (b: SectorBenchmark) => number
  formatBenchmark: (b: SectorBenchmark) => string
  /** true si « au-dessus du repère = bon ». */
  higherIsBetter: boolean
}

const nf = (v: number, digits: number) =>
  v.toLocaleString("fr-CA", { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const RATIO_DEFINITIONS: RatioDefinition[] = [
  {
    key: "current_ratio",
    label: "Ratio de liquidité",
    get: (y) => y.current_ratio,
    format: (v) => nf(v, 2),
    benchmark: (b) => b.current_ratio,
    formatBenchmark: (b) => nf(b.current_ratio, 2),
    higherIsBetter: true,
  },
  {
    key: "quick_ratio",
    label: "Liquidité relative",
    get: (y) => y.quick_ratio,
    format: (v) => nf(v, 2),
    benchmark: (b) => b.quick_ratio,
    formatBenchmark: (b) => nf(b.quick_ratio, 2),
    higherIsBetter: true,
  },
  {
    key: "debt_to_equity",
    label: "Dette / capitaux propres",
    get: (y) => y.debt_to_equity,
    format: (v) => nf(v, 2),
    benchmark: (b) => b.debt_to_equity,
    formatBenchmark: (b) => nf(b.debt_to_equity, 2),
    higherIsBetter: false,
  },
  {
    key: "interest_coverage",
    label: "Couverture des intérêts",
    get: (y) => y.interest_coverage,
    format: (v) => `${nf(v, 1)}×`,
    benchmark: (b) => b.interest_coverage,
    formatBenchmark: (b) => `${nf(b.interest_coverage, 1)}×`,
    higherIsBetter: true,
  },
  {
    key: "asset_turnover",
    label: "Rotation de l'actif",
    get: (y) => y.asset_turnover,
    format: (v) => nf(v, 2),
    benchmark: (b) => b.asset_turnover,
    formatBenchmark: (b) => nf(b.asset_turnover, 2),
    higherIsBetter: true,
  },
  {
    key: "gross_margin_pct",
    label: "Marge brute",
    get: (y) => y.gross_margin_pct,
    format: (v) => `${nf(v, 1)} %`,
    benchmark: (b) => b.gross_margin_pct,
    formatBenchmark: (b) => `${nf(b.gross_margin_pct, 1)} %`,
    higherIsBetter: true,
  },
  {
    key: "ebitda_margin_pct",
    label: "Marge EBITDA",
    get: (y) => y.ebitda_margin_pct,
    format: (v) => `${nf(v, 1)} %`,
    benchmark: (b) => b.ebitda_margin_pct,
    formatBenchmark: (b) => `${nf(b.ebitda_margin_pct, 1)} %`,
    higherIsBetter: true,
  },
  {
    key: "net_margin_pct",
    label: "Marge nette",
    get: (y) => y.net_margin_pct,
    format: (v) => `${nf(v, 1)} %`,
    benchmark: (b) => b.net_margin_pct,
    formatBenchmark: (b) => `${nf(b.net_margin_pct, 1)} %`,
    higherIsBetter: true,
  },
]

// ---------------------------------------------------------------------------
// Signaux
// ---------------------------------------------------------------------------

export interface DiagnosticSignal {
  /** Identifiant de la section à laquelle le signal est rattaché. */
  section: "trajectoire" | "saisonnalite" | "divisions" | "ratios" | "produits" | "valorisation"
  tone: SignalTone
  text: string
}

/**
 * Remplace les phrases narratives de `diagnostic-narrative.ts` : au lieu d'un
 * paragraphe en italique par section, on émet des signaux typés qui s'affichent
 * en bandeau coloré sous le graphique concerné et en pastilles dans l'en-tête.
 */
export function buildSignals(
  diagnostic: CompanyDiagnostic,
  benchmark: SectorBenchmark = DEFAULT_BENCHMARK
): DiagnosticSignal[] {
  const out: DiagnosticSignal[] = []
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const first = years[0]
  if (!latest) return out

  // Trajectoire — gain ou perte de marge sur la période.
  if (first && first.ebitda_margin_pct != null && latest.ebitda_margin_pct != null) {
    const delta = latest.ebitda_margin_pct - first.ebitda_margin_pct
    if (Math.abs(delta) >= 1) {
      out.push({
        section: "trajectoire",
        tone: delta > 0 ? "ok" : "risk",
        text:
          delta > 0
            ? `Marge EBITDA en hausse de ${nf(delta, 1)} pts depuis ${first.fiscal_year} — la croissance est rentable.`
            : `Marge EBITDA en baisse de ${nf(Math.abs(delta), 1)} pts depuis ${first.fiscal_year} — la croissance se paie en marge.`,
      })
    }
  }

  // Liquidité sous le repère sectoriel.
  if (latest.current_ratio != null && latest.current_ratio < benchmark.current_ratio) {
    out.push({
      section: "ratios",
      tone: "watch",
      text: `Ratio de liquidité de ${nf(latest.current_ratio, 2)} contre ${nf(benchmark.current_ratio, 2)} pour la médiane du secteur.`,
    })
  }

  // Divisions déficitaires.
  const losing = diagnostic.divisions.filter((d) => !d.profitable)
  if (losing.length > 0) {
    const worst = losing.reduce((a, b) => (a.ebitda < b.ebitda ? a : b))
    out.push({
      section: "divisions",
      tone: "risk",
      text: `${worst.division_name} est déficitaire (${nf(worst.ebitda / 1000, 0)} k$ d'EBITDA) sur ${nf(worst.revenue_share_pct ?? 0, 1)} % du chiffre d'affaires.`,
    })
  }

  // Concentration produit.
  const topProduct = [...diagnostic.products].sort((a, b) => b.revenue - a.revenue)[0]
  if (topProduct && (topProduct.revenue_share_pct ?? 0) > 35) {
    out.push({
      section: "produits",
      tone: "risk",
      text: `${topProduct.product_name} pèse ${nf(topProduct.revenue_share_pct ?? 0, 1)} % du chiffre d'affaires — au-dessus du seuil de 35 % retenu par les acquéreurs.`,
    })
  }

  // Saisonnalité.
  const season = [...diagnostic.seasonality].sort(
    (a, b) => (b.revenue_share_pct ?? 0) - (a.revenue_share_pct ?? 0)
  )
  if (season.length >= 3) {
    const topThree = season.slice(0, 3).reduce((s, m) => s + (m.revenue_share_pct ?? 0), 0)
    if (topThree > 30) {
      out.push({
        section: "saisonnalite",
        tone: "watch",
        text: `${nf(topThree, 0)} % du chiffre d'affaires se concentre sur trois mois (${season
          .slice(0, 3)
          .map((m) => m.month_label)
          .join(", ")}) — le fonds de roulement doit absorber le creux.`,
      })
    }
  }

  return out
}
