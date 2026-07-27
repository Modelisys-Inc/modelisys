"use client"

import type { DiagnosticValuation } from "@/lib/api"
import { Info } from "lucide-react"
import {
  formatMoney,
  formatMultiple,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticValuationSectionProps {
  valuation: DiagnosticValuation
  notes: string[]
  currency: string
}

/** Valorisation indicative : EBITDA normalisé, fourchette de multiples, VE et justification. */
export function DiagnosticValuationSection({
  valuation,
  notes,
  currency,
}: DiagnosticValuationSectionProps) {
  const figures = [
    {
      label: "EBITDA normalisé",
      value: formatMoney(valuation.normalized_ebitda, currency),
    },
    {
      label: "Fourchette de multiples",
      value: `${formatMultiple(valuation.multiple_low)} – ${formatMultiple(valuation.multiple_high)}`,
    },
    {
      label: "Capitaux propres comptables",
      value: formatMoney(valuation.book_equity, currency),
    },
  ]

  const range = [
    { label: "VE basse", value: valuation.enterprise_value_low, emphasis: false },
    { label: "VE moyenne", value: valuation.enterprise_value_mid, emphasis: true },
    { label: "VE haute", value: valuation.enterprise_value_high, emphasis: false },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {figures.map((f) => (
          <div
            key={f.label}
            className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-3"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              {f.label}
            </div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{f.value}</div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">
          Fourchette de valeur d&apos;entreprise
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {range.map((r) => (
            <div
              key={r.label}
              className={
                r.emphasis
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                  : "rounded-xl border border-slate-200/80 bg-white px-4 py-3"
              }
            >
              <div
                className={
                  r.emphasis
                    ? "text-[11px] font-medium uppercase tracking-wide text-emerald-700"
                    : "text-[11px] font-medium uppercase tracking-wide text-slate-500"
                }
              >
                {r.label}
              </div>
              <div
                className={
                  r.emphasis
                    ? "mt-1 text-xl font-bold text-emerald-800"
                    : "mt-1 text-lg font-semibold text-slate-900"
                }
              >
                {formatMoney(r.value, currency)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {valuation.rationale.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Justification</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {valuation.rationale.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {notes.length > 0 && (
        <div
          data-testid="valuation-notes"
          className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        >
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden />
          <div className="space-y-1 text-xs leading-relaxed text-slate-500">
            {notes.map((note, idx) => (
              <p key={idx}>{note}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
