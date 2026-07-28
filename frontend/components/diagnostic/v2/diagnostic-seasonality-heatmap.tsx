"use client"

import type { DiagnosticSeasonalityMonth } from "@/lib/api"
import { formatMoney, formatPercent } from "@/components/diagnostic/diagnostic-format"

interface DiagnosticSeasonalityHeatmapProps {
  seasonality: DiagnosticSeasonalityMonth[]
  currency: string
  /**
   * Saisonnalité par exercice — permet la vraie grille mois × année de la maquette.
   * ⚠️ Champ ABSENT de l'API actuelle (voir api-gaps.md, point 2).
   * Sans lui, le composant affiche une seule ligne « Moyenne 5 ans ».
   */
  byYear?: { fiscal_year: number; months: DiagnosticSeasonalityMonth[] }[]
}

/**
 * Saisonnalité en carte de chaleur : une colonne par mois, une ligne par
 * exercice. Remplace le graphique barres + ligne, illisible pour comparer
 * un mois d'une année à l'autre.
 */
export function DiagnosticSeasonalityHeatmap({
  seasonality,
  currency,
  byYear,
}: DiagnosticSeasonalityHeatmapProps) {
  if (seasonality.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[rgba(201,184,165,.6)]">
        Pas assez de données mensuelles pour dégager une saisonnalité.
      </p>
    )
  }

  const sorted = [...seasonality].sort((a, b) => a.month_number - b.month_number)

  const rows =
    byYear && byYear.length > 0
      ? byYear.map((y) => ({
          label: String(y.fiscal_year),
          months: [...y.months].sort((a, b) => a.month_number - b.month_number),
        }))
      : [{ label: "Moy. 5 ans", months: sorted }]

  const allShares = rows.flatMap((r) => r.months.map((m) => m.revenue_share_pct ?? 0))
  const min = Math.min(...allShares)
  const max = Math.max(...allShares)
  const range = max - min || 1

  const peak = sorted.reduce((a, b) => ((a.revenue_share_pct ?? 0) > (b.revenue_share_pct ?? 0) ? a : b))
  const trough = sorted.reduce((a, b) => ((a.revenue_share_pct ?? 0) < (b.revenue_share_pct ?? 0) ? a : b))

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[52px_repeat(12,minmax(0,1fr))] gap-[3px]">
        <span />
        {sorted.map((m) => (
          <span
            key={m.month_number}
            className="text-center text-[9.5px] font-medium text-[rgba(201,184,165,.5)]"
          >
            {m.month_label.slice(0, 1).toUpperCase()}
          </span>
        ))}

        {rows.map((row) => (
          <div key={row.label} className="contents">
            <span className="font-mono text-[10px] font-semibold leading-[22px] text-[rgba(201,184,165,.6)] tabular-nums">
              {row.label}
            </span>
            {row.months.map((m) => {
              const share = m.revenue_share_pct ?? 0
              const n = (share - min) / range
              return (
                <span
                  key={`${row.label}-${m.month_number}`}
                  title={`${m.month_label} — ${formatPercent(share)} du CA annuel · ${formatMoney(
                    m.average_revenue,
                    currency
                  )}`}
                  className="flex h-[22px] items-center justify-center rounded-[3px] font-mono text-[9px] font-semibold tabular-nums"
                  style={{
                    background: `rgba(52,211,153,${(0.07 + n * 0.85).toFixed(3)})`,
                    color: n > 0.55 ? "#0D1B16" : "rgba(230,214,195,.75)",
                  }}
                >
                  {share.toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[rgba(201,184,165,.5)]">
        <span>faible</span>
        <span className="h-1.5 flex-1 rounded-full bg-[linear-gradient(90deg,rgba(52,211,153,.08),rgba(52,211,153,.95))]" />
        <span>fort</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[9px] bg-white/[.03] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(230,214,195,.08)]">
          <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-[rgba(201,184,165,.5)]">
            Pic — {peak.month_label}
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-[#E6D6C3] tabular-nums">
            {formatPercent(peak.revenue_share_pct)} du CA
          </div>
        </div>
        <div className="rounded-[9px] bg-white/[.03] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(230,214,195,.08)]">
          <div className="text-[9px] font-semibold uppercase tracking-[.1em] text-[rgba(201,184,165,.5)]">
            Creux — {trough.month_label}
          </div>
          <div className="mt-1 font-mono text-sm font-semibold text-[#E6D6C3] tabular-nums">
            {formatPercent(trough.revenue_share_pct)} du CA
          </div>
        </div>
      </div>
    </div>
  )
}
