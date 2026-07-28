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
  companySelector?: ReactNode
}

const PERIODS: DiagnosticPeriod[] = ["5A", "3A"]

function pillClass(active: boolean): string {
  return [
    "cursor-pointer rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors",
    active
      ? "bg-[#E0742D] text-white"
      : "bg-transparent text-slate-500 hover:text-[#2A2F3A]",
  ].join(" ")
}

function lifecycleChipClass(stage: string): string {
  if (stage === "croissance")
    return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  if (stage === "décroissance")
    return "border border-red-200 bg-red-50 text-red-700"
  return "border border-slate-200 bg-slate-100 text-slate-600"
}

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
    <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[120px] -top-[160px] h-[520px] w-[520px] rounded-full bg-[rgba(224,116,45,.06)] blur-[70px]"
      />

      <div className="relative grid gap-9 px-7 pb-[22px] pt-6 xl:grid-cols-[1fr_470px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-400">
              Phase 1 · Diagnostic
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-slate-300" aria-hidden />
            <span className="text-[11px] text-slate-500">
              Exercice {diagnostic.latest_fiscal_year} · {diagnostic.currency} · généré le{" "}
              {formatDateFr(diagnostic.generated_at)}
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3.5">
            <h1 className="m-0 text-[34px] font-semibold leading-none tracking-[-.02em] text-[#2A2F3A]">
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

          <p className="m-0 max-w-[660px] text-[13.5px] leading-relaxed text-slate-600 [text-wrap:pretty]">
            TCAC 5 ans du chiffre d&apos;affaires :{" "}
            <span className="font-semibold text-[#2A2F3A]">
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
                  className="inline-flex items-center gap-[7px] rounded-md border border-slate-200 bg-white py-1.5 pl-2.5 pr-3 text-[11.5px] font-medium leading-tight text-slate-700 shadow-sm"
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
            <div className="flex gap-[3px] rounded-[9px] border border-slate-200 bg-slate-100 p-[3px]">
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

            <div className="flex flex-wrap gap-[3px] rounded-[9px] border border-slate-200 bg-slate-100 p-[3px]">
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

        <div className="flex flex-col gap-3 rounded-[14px] border border-slate-200 bg-white px-[18px] py-4 shadow-sm">
          <div className="flex items-center gap-[18px]">
            <div className="relative h-[132px] w-[132px] flex-none">
              <svg viewBox="0 0 132 132" className="block h-[132px] w-[132px] -rotate-90">
                <circle cx="66" cy="66" r="55" fill="none" stroke="#e2e8f0" strokeWidth="12" />
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
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-px">
                <span className="font-mono text-[38px] font-semibold leading-none tracking-[-.03em] text-[#2A2F3A] tabular-nums">
                  {displayedScore}
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[.16em] text-slate-400">
                  sur 100
                </span>
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight text-[#2A2F3A]">
                Indice de santé Modelisys
              </div>
              <div className="mt-1 text-[11.5px] leading-relaxed text-slate-500">
                Positionne la société dans le{" "}
                <span className="font-semibold text-emerald-600">{quartileLabel(health.score)}</span> de son
                secteur ({health.benchmark.label}).
              </div>
              {health.deltaVsPreviousYear !== null && (
                <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] font-medium text-emerald-600 tabular-nums">
                  {health.deltaVsPreviousYear >= 0 ? "▲" : "▼"}{" "}
                  {Math.abs(health.deltaVsPreviousYear)} pts vs exercice précédent
                  <span className="font-sans text-slate-400">
                    · médiane secteur {health.benchmark.health_score}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[7px] border-t border-slate-200 pt-3">
            {health.pillars.map((p) => (
              <div key={p.key} className="grid grid-cols-[112px_1fr_34px] items-center gap-2.5">
                <span className="text-[11.5px] font-medium leading-none text-slate-600">
                  {p.label}
                </span>
                <span className="relative block h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${p.score * t}%`,
                      background:
                        p.score >= p.benchmark
                          ? "linear-gradient(90deg,#047857,#10b981)"
                          : "linear-gradient(90deg,#c2543c,#d97706)",
                    }}
                  />
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-[#E0742D]"
                    style={{ left: `${p.benchmark}%` }}
                  />
                </span>
                <span className="text-right font-mono text-[11.5px] font-semibold leading-none text-[#2A2F3A] tabular-nums">
                  {Math.round(p.score * t)}
                </span>
              </div>
            ))}
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="inline-block h-2.5 w-0.5 bg-[#E0742D]" aria-hidden />
              médiane du secteur
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
