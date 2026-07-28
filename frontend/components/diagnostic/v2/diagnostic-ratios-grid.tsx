"use client"

import type { DiagnosticTrendYear } from "@/lib/api"
import { DEFAULT_BENCHMARK } from "@/lib/diagnostic-benchmarks"
import { RATIO_DEFINITIONS } from "@/lib/diagnostic-derive"

interface DiagnosticRatiosGridProps {
  trends: DiagnosticTrendYear[]
  showBenchmarks?: boolean
}

/**
 * Ratios financiers : lignes = ratios, colonnes = exercices, plus une
 * sparkline de tendance et le repère sectoriel.
 *
 * Remplace `diagnostic-ratios-table.tsx`. Deux ajouts par rapport à l'existant :
 * la colonne « Secteur » et la pastille verte/ambre qui dit immédiatement si le
 * dernier exercice est au-dessus ou en dessous du repère.
 */
export function DiagnosticRatiosGrid({ trends, showBenchmarks = true }: DiagnosticRatiosGridProps) {
  const years = [...trends].sort((a, b) => a.fiscal_year - b.fiscal_year)

  if (years.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[rgba(201,184,165,.6)]">
        Aucune donnée disponible pour calculer les ratios.
      </p>
    )
  }

  const gridTemplate = `1.6fr repeat(${years.length}, .6fr) .68fr .6fr`

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-2 px-[18px] pb-2 pt-1.5 text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-[rgba(201,184,165,.45)]"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <span>Ratio</span>
        {years.map((y) => (
          <span key={y.fiscal_year} className="text-right">
            {y.fiscal_year}
          </span>
        ))}
        <span className="text-right">Tendance</span>
        <span className="text-right">Secteur</span>
      </div>

      {RATIO_DEFINITIONS.map((def) => {
        const values = years.map((y) => def.get(y))
        const numeric = values.filter((v): v is number => v !== null && Number.isFinite(v))
        const last = numeric.length > 0 ? numeric[numeric.length - 1] : null
        const benchValue = def.benchmark(DEFAULT_BENCHMARK)
        const ok =
          last === null ? true : def.higherIsBetter ? last >= benchValue : last <= benchValue

        const min = numeric.length ? Math.min(...numeric) : 0
        const max = numeric.length ? Math.max(...numeric) : 1
        const range = max - min || 1
        const points = values
          .map((v, i) =>
            v === null
              ? null
              : `${(i * (56 / Math.max(1, values.length - 1))).toFixed(1)},${(
                  14 -
                  ((v - min) / range) * 12
                ).toFixed(1)}`
          )
          .filter(Boolean)
          .join(" ")

        return (
          <div
            key={def.key}
            className="grid items-center gap-2 border-t border-[rgba(230,214,195,.06)] px-[18px] py-2"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <span className="flex items-center gap-[7px] text-[11.5px] font-medium leading-tight text-[rgba(230,214,195,.88)]">
              <span
                aria-hidden
                className="h-1.5 w-1.5 flex-none rounded-full"
                style={{ background: ok ? "#34D399" : "#F5B544" }}
              />
              {def.label}
            </span>

            {values.map((v, i) => (
              <span
                key={`${def.key}-${i}`}
                className="text-right font-mono text-[11.5px] font-medium tabular-nums"
                style={{
                  color:
                    i === values.length - 1
                      ? ok
                        ? "#34D399"
                        : "#F5B544"
                      : "rgba(201,184,165,.72)",
                }}
              >
                {v === null ? "—" : def.format(v)}
              </span>
            ))}

            <span className="text-right">
              <svg viewBox="0 0 56 16" preserveAspectRatio="none" className="inline-block h-3.5 w-14">
                <polyline
                  points={points}
                  fill="none"
                  stroke={ok ? "rgba(52,211,153,.8)" : "rgba(245,181,68,.8)"}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>

            <span className="text-right font-mono text-[11.5px] font-medium text-[rgba(201,184,165,.5)] tabular-nums">
              {showBenchmarks ? def.formatBenchmark(DEFAULT_BENCHMARK) : "—"}
            </span>
          </div>
        )
      })}
    </div>
  )
}
