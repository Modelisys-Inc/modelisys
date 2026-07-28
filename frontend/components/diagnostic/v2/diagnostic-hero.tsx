"use client"

import type { ReactNode } from "react"
import type { CompanyDiagnostic } from "@/lib/api"
import { formatDateFr, formatPercent, lifecycleLabel } from "@/components/diagnostic/diagnostic-format"
import {
  computeHealthIndex,
  quartileLabel,
  buildSignals,
  type DiagnosticSignal,
} from "@/lib/diagnostic-derive"
import { signalColor } from "@/lib/diagnostic-theme"
import { useCountUp } from "@/components/diagnostic/v2/use-count-up"

export type DiagnosticPeriod = "5A" | "3A"

interface DiagnosticHeroProps {
  diagnostic: CompanyDiagnostic
  period: DiagnosticPeriod
  onPeriodChange: (p: DiagnosticPeriod) => void
  divisionId: string | null
  onDivisionChange: (id: string | null) => void
  /** Sélecteur de société, affiché avec les autres commandes globales. */
  companySelector?: ReactNode
}

const PERIODS: DiagnosticPeriod[] = ["5A", "3A"]

function pillClass(active: boolean): string {
  return [
    "cursor-pointer rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors",
    active ? "bg-[#E0742D] text-[#14171D]" : "bg-transparent text-[rgba(201,184,165,.62)] hover:text-[#E6D6C3]",
  ].join(" ")
}

function lifecycleChipClass(stage: string): string {
  if (stage === "croissance")
    return "bg-[rgba(52,211,153,.14)] text-[#34D399] shadow-[inset_0_0_0_1px_rgba(52,211,153,.32)]"
  if (stage === "décroissance")
    return "bg-[rgba(241,106,92,.14)] text-[#F16A5C] shadow-[inset_0_0_0_1px_rgba(241,106,92,.32)]"
  return "bg-[rgba(230,214,195,.10)] text-[rgba(230,214,195,.85)] shadow-[inset_0_0_0_1px_rgba(230,214,195,.2)]"
}

/**
 * En-tête du rapport : identité de la société, indice de santé 0-100 et
 * commandes globales (période, filtre division).
 *
 * Remplace `diagnostic-header.tsx` + le bandeau de `app/modules/diagnostic/page.tsx`.
 */
export function DiagnosticHero({
  diagnostic,
  period,
  onPeriodChange,
  divisionId,
  onDivisionChange,
  companySelector,
}: DiagnosticHeroProps) {
  const health = computeHealthIndex(diagnostic)
  const signals = buildSignals(diagnostic)
  const t = useCountUp(900)
  const displayedScore = Math.round(health.score * t)

  return (
    <div className="relative overflow-hidden border-b border-[rgba(230,214,195,.09)] bg-[linear-gradient(160deg,#232935_0%,#191E27_55%,#14171D_100%)]">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[120px] -top-[160px] h-[520px] w-[520px] rounded-full bg-[rgba(224,116,45,.10)] blur-[70px]"
      />

      <div className="relative grid gap-9 px-7 pb-[22px] pt-6 xl:grid-cols-[1fr_470px]">
        {/* Colonne gauche : identité, résumé, filtres */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.22em] text-[rgba(201,184,165,.65)]">
              Phase 1 · Diagnostic
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-[rgba(201,184,165,.35)]" aria-hidden />
            <span className="text-[11px] text-[rgba(201,184,165,.55)]">
              Exercice {diagnostic.latest_fiscal_year} · {diagnostic.currency} · généré le{" "}
              {formatDateFr(diagnostic.generated_at)}
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3.5">
            <h1 className="m-0 text-[34px] font-semibold leading-none tracking-[-.02em] text-[#E6D6C3]">
              {diagnostic.company_name}
            </h1>
            <span
              data-testid="lifecycle-badge"
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.06em] ${lifecycleChipClass(
                diagnostic.summary.lifecycle_stage
              )}`}
            >
              {lifecycleLabel(diagnostic.summary.lifecycle_stage)}
            </span>
          </div>

          <p className="m-0 max-w-[660px] text-[13.5px] leading-relaxed text-[rgba(201,184,165,.82)] [text-wrap:pretty]">
            TCAC 5 ans du chiffre d&apos;affaires :{" "}
            <span className="font-semibold text-[#E6D6C3]">
              {formatPercent(diagnostic.summary.revenue_cagr_5y)}
            </span>
            . Marge EBITDA {formatPercent(diagnostic.summary.latest_ebitda_margin_pct)}, marge nette{" "}
            {formatPercent(diagnostic.summary.latest_net_margin_pct)}.
          </p>

          {signals.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signals.slice(0, 4).map((s: DiagnosticSignal, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-[7px] rounded-md bg-white/[.04] py-1.5 pl-2.5 pr-3 text-[11.5px] font-medium leading-tight text-[rgba(230,214,195,.9)] shadow-[inset_0_0_0_1px_rgba(230,214,195,.10)]"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 flex-none rounded-full"
                    style={{ background: signalColor(s.tone) }}
                  />
                  {s.text}
                </span>
              ))}
            </div>
          )}

          <div className="mt-0.5 flex flex-wrap items-center gap-3.5">
            <div className="flex gap-[3px] rounded-[9px] bg-black/[.28] p-[3px] shadow-[inset_0_0_0_1px_rgba(230,214,195,.09)]">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={period === p}
                  onClick={() => onPeriodChange(p)}
                  className={pillClass(period === p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-[3px] rounded-[9px] bg-black/[.28] p-[3px] shadow-[inset_0_0_0_1px_rgba(230,214,195,.09)]">
              <button
                type="button"
                aria-pressed={divisionId === null}
                onClick={() => onDivisionChange(null)}
                className={pillClass(divisionId === null)}
              >
                Toutes
              </button>
              {diagnostic.divisions.map((d) => (
                <button
                  key={d.division_id}
                  type="button"
                  aria-pressed={divisionId === d.division_id}
                  onClick={() => onDivisionChange(d.division_id)}
                  className={`${pillClass(divisionId === d.division_id)} max-w-[160px] truncate`}
                  title={d.division_name}
                >
                  {d.division_name}
                </button>
              ))}
            </div>

            {companySelector}
          </div>
        </div>

        {/* Colonne droite : indice de santé */}
        <div className="flex flex-col gap-3 rounded-[14px] bg-black/[.26] px-[18px] py-4 shadow-[inset_0_0_0_1px_rgba(230,214,195,.10)]">
          <div className="flex items-center gap-[18px]">
            <div className="relative h-[132px] w-[132px] flex-none">
              <svg viewBox="0 0 132 132" className="block h-[132px] w-[132px] -rotate-90">
                <circle cx="66" cy="66" r="55" fill="none" stroke="rgba(230,214,195,.10)" strokeWidth="12" />
                <circle
                  cx="66"
                  cy="66"
                  r="55"
                  fill="none"
                  stroke="url(#diagScoreGrad)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={`${(health.score / 100) * t} 1`}
                />
                <defs>
                  <linearGradient id="diagScoreGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#E0742D" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-px">
                <span className="font-mono text-[38px] font-semibold leading-none tracking-[-.03em] text-[#E6D6C3] tabular-nums">
                  {displayedScore}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[.16em] text-[rgba(201,184,165,.55)]">
                  sur 100
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight text-[#E6D6C3]">
                Indice de santé Modelisys
              </div>
              <div className="mt-1 text-[11.5px] leading-relaxed text-[rgba(201,184,165,.7)]">
                Positionne la société dans le{" "}
                <span className="font-semibold text-[#34D399]">{quartileLabel(health.score)}</span> de son
                secteur ({health.benchmark.label}).
              </div>
              {health.deltaVsPreviousYear !== null && (
                <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#34D399] tabular-nums">
                  {health.deltaVsPreviousYear >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(health.deltaVsPreviousYear)} pts vs exercice précédent
                  <span className="font-sans text-[rgba(201,184,165,.45)]">
                    · médiane secteur {health.benchmark.health_score}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[7px] border-t border-[rgba(230,214,195,.09)] pt-3">
            {health.pillars.map((p) => (
              <div key={p.key} className="grid grid-cols-[112px_1fr_34px] items-center gap-2.5">
                <span className="text-[11.5px] font-medium leading-none text-[rgba(201,184,165,.78)]">
                  {p.label}
                </span>
                <span className="relative block h-1.5 overflow-hidden rounded-full bg-[rgba(230,214,195,.09)]">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${p.score * t}%`,
                      background:
                        p.score >= p.benchmark
                          ? "linear-gradient(90deg,#0F8F68,#3FE0A8)"
                          : "linear-gradient(90deg,#C2543C,#F5B544)",
                    }}
                  />
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-[#E0742D]"
                    style={{ left: `${p.benchmark}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[11.5px] font-semibold leading-none text-[#E6D6C3] tabular-nums">
                  {Math.round(p.score * t)}
                </span>
              </div>
            ))}
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[rgba(201,184,165,.45)]">
              <span className="inline-block h-2.5 w-0.5 bg-[#E0742D]" aria-hidden />
              médiane du secteur
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
