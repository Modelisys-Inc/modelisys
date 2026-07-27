"use client"

import type { CompanyDiagnostic } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import {
  formatDateFr,
  formatPercent,
  lifecycleBadgeClass,
  lifecycleLabel,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticHeaderProps {
  diagnostic: CompanyDiagnostic
}

/** En-tête du rapport : société, stade de vie, TCAC 5 ans et date de génération. */
export function DiagnosticHeader({ diagnostic }: DiagnosticHeaderProps) {
  const { summary } = diagnostic

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {diagnostic.company_name}
        </h1>
        <Badge
          data-testid="lifecycle-badge"
          className={lifecycleBadgeClass(summary.lifecycle_stage)}
        >
          {lifecycleLabel(summary.lifecycle_stage)}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
        <span>
          TCAC 5 ans du chiffre d&apos;affaires :{" "}
          <span className="font-semibold text-slate-900">
            {formatPercent(summary.revenue_cagr_5y)}
          </span>
        </span>
        <span className="text-slate-300" aria-hidden>
          •
        </span>
        <span>Exercice {diagnostic.latest_fiscal_year}</span>
        <span className="text-slate-300" aria-hidden>
          •
        </span>
        <span className="text-slate-500">
          Rapport généré le {formatDateFr(diagnostic.generated_at)}
        </span>
      </div>
    </div>
  )
}
