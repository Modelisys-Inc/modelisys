"use client"

import type { ReactNode } from "react"
import type { CompanyDiagnostic } from "@/lib/api"
import { formatDateFr, lifecycleLabel, formatReferencePeriod } from "@/components/diagnostic/diagnostic-format"

interface DiagnosticHeroProps {
  diagnostic: CompanyDiagnostic
  /** Bouton ou action affiché à gauche du nom de la société (ex. export PDF). */
  leadingAction?: ReactNode
}

function lifecycleChipClass(stage: string): string {
  if (stage === "croissance")
    return "border border-emerald-200 bg-emerald-50 text-emerald-700"
  if (stage === "décroissance")
    return "border border-red-200 bg-red-50 text-red-700"
  return "border border-slate-200 bg-slate-100 text-slate-600"
}

export function DiagnosticHero({ diagnostic, leadingAction }: DiagnosticHeroProps) {
  return (
    <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[120px] -top-[160px] h-[520px] w-[520px] rounded-full bg-[rgba(224,116,45,.06)] blur-[70px]"
      />

      <div className="relative px-7 pb-[22px] pt-6">
        <div className="flex min-w-0 flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-400">
              Phase 1 · Diagnostic
            </span>
            <span className="h-[3px] w-[3px] rounded-full bg-slate-300" aria-hidden />
            <span className="text-[11px] text-slate-500">
              Réf. {formatReferencePeriod(
                diagnostic.reference_period.calendar_year,
                diagnostic.reference_period.calendar_month,
              )}{" "}
              · Exercice {diagnostic.latest_fiscal_year} · {diagnostic.currency} · généré le{" "}
              {formatDateFr(diagnostic.generated_at)}
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-3.5">
            {leadingAction}
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
        </div>
      </div>
    </div>
  )
}
