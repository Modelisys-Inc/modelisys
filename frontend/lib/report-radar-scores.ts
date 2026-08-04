import type { CompanyDiagnostic } from "@/lib/api"
import { DEFAULT_BENCHMARK } from "@/lib/diagnostic-benchmarks"
import { computeHealthIndex } from "@/lib/diagnostic-derive"

export type RadarAxisKey =
  | "rentabilite"
  | "liquidite"
  | "efficacite"
  | "solvabilite"
  | "croissance"

export interface RadarAxisScore {
  key: RadarAxisKey
  label: string
  score: number
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function ratioScore(value: number | null | undefined, target: number, higherIsBetter = true): number {
  if (value == null || !Number.isFinite(value)) return 50
  const ratio = value / target
  const normalized = higherIsBetter ? ratio : 1 / Math.max(ratio, 0.01)
  return clampScore(50 + (normalized - 1) * 35)
}

/** Scores 0–100 sur 5 axes pour le radar du sommaire exécutif. */
export function buildReportRadarScores(diagnostic: CompanyDiagnostic): {
  overall: number
  axes: RadarAxisScore[]
} {
  const benchmark = DEFAULT_BENCHMARK
  const health = computeHealthIndex(diagnostic, benchmark)
  const years = [...diagnostic.trends].sort((a, b) => a.fiscal_year - b.fiscal_year)
  const latest = years[years.length - 1]
  const previous = years.length > 1 ? years[years.length - 2] : null

  const rentabilite = ratioScore(latest?.ebitda_margin_pct, benchmark.ebitda_margin_pct)
  const liquidite = ratioScore(latest?.current_ratio, benchmark.current_ratio)
  const efficacite = ratioScore(
    latest?.asset_turnover,
    benchmark.asset_turnover ?? 1,
  )
  const solvabilite = ratioScore(
    latest?.debt_to_equity != null ? 1 / Math.max(latest.debt_to_equity, 0.01) : null,
    1 / Math.max(benchmark.debt_to_equity ?? 1, 0.01),
  )
  const cagr = diagnostic.summary.revenue_cagr_5y
  const croissance =
    cagr != null
      ? clampScore(50 + cagr * 3)
      : previous && latest
        ? clampScore(
            50 +
              ((latest.revenue - previous.revenue) / Math.max(Math.abs(previous.revenue), 1)) *
                100,
          )
        : 50

  return {
    overall: health.score,
    axes: [
      { key: "rentabilite", label: "Rentabilité", score: rentabilite },
      { key: "liquidite", label: "Liquidité", score: liquidite },
      { key: "efficacite", label: "Efficacité", score: efficacite },
      { key: "solvabilite", label: "Solvabilité", score: solvabilite },
      { key: "croissance", label: "Croissance", score: croissance },
    ],
  }
}
