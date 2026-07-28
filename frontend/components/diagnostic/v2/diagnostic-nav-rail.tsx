"use client"

import { useEffect, useState } from "react"

export interface RailSection {
  id: string
  label: string
}

interface DiagnosticNavRailProps {
  sections: RailSection[]
  /** Nombre de signaux « risque » ou « vigilance » à traiter. */
  signalCount?: number
  signalSummary?: string
}

/**
 * Rail de navigation collant avec scroll spy.
 *
 * Le rapport fait ~4 000 px de haut ; sans rail, l'utilisateur perd le fil.
 * Le lecteur n'est pas obligé de scroller pour savoir ce que contient la page.
 */
export function DiagnosticNavRail({ sections, signalCount, signalSummary }: DiagnosticNavRailProps) {
  const [active, setActive] = useState(sections[0]?.id ?? "")

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <aside className="sticky top-0 flex flex-col gap-0.5 self-start border-r border-[rgba(230,214,195,.09)] px-3.5 pb-7 pt-5">
      <div className="px-2.5 pb-2.5 text-[9.5px] font-semibold uppercase tracking-[.16em] text-[rgba(201,184,165,.45)]">
        Rapport
      </div>

      {sections.map((s) => {
        const isActive = active === s.id
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={isActive ? "true" : undefined}
            className={[
              "flex items-center gap-[9px] rounded-md px-2.5 py-[7px] text-xs font-medium leading-snug transition-colors",
              isActive ? "bg-white/[.05] text-[#E6D6C3]" : "text-[rgba(201,184,165,.68)] hover:text-[#E6D6C3]",
            ].join(" ")}
          >
            <span
              aria-hidden
              className="h-[5px] w-[5px] flex-none rounded-full"
              style={{ background: isActive ? "#E0742D" : "rgba(201,184,165,.28)" }}
            />
            {s.label}
          </a>
        )
      })}

      {signalCount ? (
        <div className="mt-4 rounded-[10px] bg-[rgba(224,116,45,.08)] p-3 shadow-[inset_0_0_0_1px_rgba(224,116,45,.22)]">
          <div className="text-[11px] font-semibold leading-snug text-[#E0742D]">
            {signalCount} {signalCount > 1 ? "signaux" : "signal"} à traiter
          </div>
          {signalSummary && (
            <div className="mt-1.5 text-[10.5px] leading-relaxed text-[rgba(201,184,165,.7)]">
              {signalSummary}
            </div>
          )}
        </div>
      ) : null}
    </aside>
  )
}
