"use client"

import { useEffect, useRef } from "react"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import { useCapexHypothesisAssumptions } from "@/hooks/use-capex-hypothesis-assumptions"
import { cn } from "@/lib/utils"

export type CapexHypothesisAssumptionsSectionProps = {
  companyId?: string | null
  projectionId?: string | null
  projectionYears: number
  forecastBaseYear: number
  referenceMonth: number
  divisionId?: string | null
  subDivisionId?: string | null
}

export function CapexHypothesisAssumptionsSection({
  companyId,
  projectionId,
  projectionYears,
  forecastBaseYear,
  referenceMonth,
  divisionId,
  subDivisionId,
}: CapexHypothesisAssumptionsSectionProps) {
  const { rows, loading, refresh } = useCapexHypothesisAssumptions({
    companyId,
    projectionId,
    projectionYears,
    forecastBaseYear,
    refMonth: referenceMonth,
    divisionId,
    subDivisionId,
    enabled: !!companyId,
  })

  const sectionRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) refresh()
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [refresh])

  return (
    <div ref={sectionRef}>
      <NetTangibleReportSection id="hypotheses" number="3." title="Hypothèses">
        <p className="mb-5 text-pretty text-sm leading-relaxed text-slate-500">
          Synthèse des ajouts Capex, de la saisonnalité et des notes retenus par poste et par année
          projetée.
        </p>

        {loading && rows.length === 0 ? (
          <p className="text-sm text-slate-500" data-testid="capex-hypothesis-assumptions-loading">
            Chargement des hypothèses…
          </p>
        ) : rows.length === 0 ? (
          <p
            className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500"
            data-testid="capex-hypothesis-assumptions-empty"
          >
            Aucune hypothèse Capex n&apos;a encore été définie pour ce scénario.
          </p>
        ) : (
          <div className="overflow-x-auto" data-testid="capex-hypothesis-assumptions-list">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b-2 border-[#2A2F3A] text-left">
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Poste
                  </th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Année
                  </th>
                  <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ajustement
                  </th>
                  <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Saisonnalité
                  </th>
                  <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-200 align-top"
                    data-testid={`capex-hypothesis-assumption-${row.id}`}
                  >
                    <td className="py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]">{row.poste}</td>
                    <td className="py-2.5 pr-4 font-mono text-sm tabular-nums text-[#2A2F3A]">
                      {row.yearLabel}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                      {row.ajustement}
                    </td>
                    <td className="py-2.5 pr-4 text-sm text-slate-600">{row.saisonnalite}</td>
                    <td
                      className={cn(
                        "py-2.5 text-sm",
                        row.note ? "text-slate-600" : "text-slate-400",
                      )}
                    >
                      {row.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </NetTangibleReportSection>
    </div>
  )
}
