/**
 * Repères sectoriels utilisés par l'indice de santé, le radar et la colonne
 * « Secteur » du tableau de ratios.
 *
 * ⚠️ TEMPORAIRE — ces médianes sont actuellement codées en dur côté client.
 * Elles devraient venir du backend (voir api-gaps.md, point 7) afin d'être
 * choisies selon le code SCIAN et la taille de la société.
 */

export interface SectorBenchmark {
  /** Libellé affiché sous le score (« fabrication métallique, 15-50 M$ »). */
  label: string
  current_ratio: number
  quick_ratio: number
  debt_to_equity: number
  net_debt_to_ebitda: number
  interest_coverage: number
  asset_turnover: number
  gross_margin_pct: number
  ebitda_margin_pct: number
  net_margin_pct: number
  cash_conversion_pct: number
  revenue_cagr_pct: number
  /** Score global médian du secteur, pour la mention « médiane secteur 64 ». */
  health_score: number
}

export const DEFAULT_BENCHMARK: SectorBenchmark = {
  label: "fabrication métallique, 15-50 M$",
  current_ratio: 1.9,
  quick_ratio: 1.1,
  debt_to_equity: 0.9,
  net_debt_to_ebitda: 2.2,
  interest_coverage: 5.0,
  asset_turnover: 1.4,
  gross_margin_pct: 32.0,
  ebitda_margin_pct: 11.8,
  net_margin_pct: 5.4,
  cash_conversion_pct: 48,
  revenue_cagr_pct: 6.1,
  health_score: 64,
}
