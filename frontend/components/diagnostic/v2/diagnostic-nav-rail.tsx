"use client"

import { useEffect, useState } from "react"

export interface RailSection {
  id: string
  label: string
}

export type DiagnosticReportView =
  | "sommaire"
  | "performance"
  | "revenue"
  | "margin-by-revenue"
  | "expenses"
  | "expenses-by-division"
  | "financial-position"
  | "working-capital"

export interface DiagnosticReportViewOption {
  id: DiagnosticReportView
  label: string
  /** Indentation visuelle sous une section parente du rapport. */
  indent?: boolean
}

interface DiagnosticNavRailProps {
  reportViews: DiagnosticReportViewOption[]
  activeReportView: DiagnosticReportView
  onReportViewChange: (view: DiagnosticReportView) => void
  reportAnchorId: string
  /** Ancre du sommaire exécutif (première entrée du rapport). */
  summaryAnchorId?: string
  sections: RailSection[]
  signalCount?: number
  signalSummary?: string
}

/**
 * Rail de navigation collant avec scroll spy.
 *
 * Sous « Rapport », les vues (Performance financière, Revenus) remplacent la carte
 * du haut ; les autres entrées font défiler vers les sections du rapport.
 */
export function DiagnosticNavRail({
  reportViews,
  activeReportView,
  onReportViewChange,
  reportAnchorId,
  summaryAnchorId,
  sections,
  signalCount,
  signalSummary,
}: DiagnosticNavRailProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? reportAnchorId)

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const observedIds = [
      ...(summaryAnchorId ? [summaryAnchorId] : []),
      reportAnchorId,
      ...sections.map((s) => s.id),
    ]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveSection(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    )
    observedIds.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections, reportAnchorId, summaryAnchorId])

  return (
    <aside className="sticky top-0 flex flex-col gap-0.5 self-start border-r border-slate-200 px-3.5 pb-7 pt-5">
      <div className="px-2.5 pb-2.5 text-[9.5px] font-semibold uppercase tracking-[.16em] text-slate-400">
        Rapport
      </div>

      {reportViews.map((view) => {
        const isActive = activeReportView === view.id
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => {
              onReportViewChange(view.id)
              const anchor =
                view.id === "sommaire" && summaryAnchorId ? summaryAnchorId : reportAnchorId
              document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })
            }}
            aria-current={isActive ? "true" : undefined}
            className={[
              "flex w-full items-center gap-[9px] rounded-md py-[7px] text-left text-xs font-medium leading-snug transition-colors",
              view.indent ? "pl-6 pr-2.5" : "px-2.5",
              isActive ? "bg-slate-100 text-[#2A2F3A]" : "text-slate-500 hover:text-[#2A2F3A]",
            ].join(" ")}
          >
            <span
              aria-hidden
              className="h-[5px] w-[5px] flex-none rounded-full"
              style={{ background: isActive ? "#E0742D" : "#cbd5e1" }}
            />
            {view.label}
          </button>
        )
      })}

      <div className="my-2 border-t border-slate-100" aria-hidden />

      {sections.map((s) => {
        const isActive = activeSection === s.id
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={isActive ? "true" : undefined}
            className={[
              "flex items-center gap-[9px] rounded-md px-2.5 py-[7px] text-xs font-medium leading-snug transition-colors",
              isActive ? "bg-slate-100 text-[#2A2F3A]" : "text-slate-500 hover:text-[#2A2F3A]",
            ].join(" ")}
          >
            <span
              aria-hidden
              className="h-[5px] w-[5px] flex-none rounded-full"
              style={{ background: isActive ? "#E0742D" : "#cbd5e1" }}
            />
            {s.label}
          </a>
        )
      })}

      {signalCount ? (
        <div className="mt-4 rounded-[10px] border border-orange-200 bg-orange-50 p-3">
          <div className="text-[11px] font-semibold leading-snug text-[#E0742D]">
            {signalCount} {signalCount > 1 ? "signaux" : "signal"} à traiter
          </div>
          {signalSummary && (
            <div className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500">{signalSummary}</div>
          )}
        </div>
      ) : null}
    </aside>
  )
}
