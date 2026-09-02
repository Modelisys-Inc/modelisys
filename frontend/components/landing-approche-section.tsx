"use client"

import { useEffect, useRef, useState } from "react"
import { LandingApprochePhaseBlock } from "@/components/landing-approche-phase-block"
import {
  APPROCHE_PHASE_NAVIGATE_EVENT,
  APPROCHE_SCROLL_TARGET_ID,
  APPROCHE_SECTION_ID,
  navigateToApprochePhase,
  type ApprochePhaseId,
} from "@/lib/approche-navigation"
import {
  APPROCHE_PHASE_MARKETING_CONTENT,
  APPROCHE_PHASE_ORDER,
} from "@/lib/approche-phase-marketing-content"

export function LandingApprocheSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [highlightedPhase, setHighlightedPhase] = useState<ApprochePhaseId | null>(null)
  const [activePhaseNav, setActivePhaseNav] = useState<ApprochePhaseId>("diagnostic")

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )

    const el = sectionRef.current
    if (el) observer.observe(el)
    return () => {
      if (el) observer.unobserve(el)
    }
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const phaseId = (event as CustomEvent<{ phaseId: ApprochePhaseId }>).detail?.phaseId
      if (!phaseId) return
      setHighlightedPhase(phaseId)
      setActivePhaseNav(phaseId)
      window.setTimeout(() => setHighlightedPhase(null), 2400)
    }

    window.addEventListener(APPROCHE_PHASE_NAVIGATE_EVENT, handler)
    return () => window.removeEventListener(APPROCHE_PHASE_NAVIGATE_EVENT, handler)
  }, [])

  return (
    <section
      id={APPROCHE_SECTION_ID}
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F8FAFC] py-16 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC] via-slate-50/95 to-slate-100/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.045),transparent_55%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
        <div
          id={APPROCHE_SCROLL_TARGET_ID}
          className="scroll-mt-[7.5rem] h-0 sm:scroll-mt-32"
          aria-hidden
        />

        <div
          className={`pb-6 sm:pb-8 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:text-xs">
            L&apos;approche Modelisys
          </p>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Trois phases pour piloter la valeur de votre entreprise
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-[1.65] text-[#5C5F66] sm:text-lg">
            Comprendre, planifier et piloter — chaque phase a un rôle distinct dans la trajectoire de performance.
            Ensemble, elles relient vos décisions financières à l&apos;évolution de la valeur dans le temps.
          </p>

          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Phases de l'approche Modelisys">
            {APPROCHE_PHASE_ORDER.map((phaseId) => {
              const phase = APPROCHE_PHASE_MARKETING_CONTENT[phaseId]
              const isActive = activePhaseNav === phaseId
              return (
                <button
                  key={phaseId}
                  type="button"
                  onClick={() => {
                    setActivePhaseNav(phaseId)
                    navigateToApprochePhase(phaseId)
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition sm:text-[13px] ${
                    isActive
                      ? "border-[#E0742D]/45 bg-white text-[#2A2F3A] shadow-sm ring-1 ring-[#E0742D]/18"
                      : "border-slate-200/85 bg-white/70 text-slate-600 hover:border-slate-300/90 hover:bg-white"
                  }`}
                >
                  <span className={`font-mono text-[11px] ${isActive ? "text-[#E0742D]" : "text-slate-400"}`}>
                    {phase.phaseNumber}
                  </span>
                  <span className="text-slate-300">·</span>
                  {phase.shortTitle}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {APPROCHE_PHASE_ORDER.map((phaseId, index) => (
            <LandingApprochePhaseBlock
              key={phaseId}
              phaseId={phaseId}
              reversed={index % 2 === 1}
              highlighted={highlightedPhase === phaseId}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
