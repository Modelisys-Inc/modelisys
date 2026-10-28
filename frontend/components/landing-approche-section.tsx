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
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F8FAFC]"
    >
      {/* Scène claire — même fond que Fonctionnalités */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#F8FAFC]" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(42 47 58 / 0.045) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(42 47 58 / 0.045) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 65% at 30% 20%, black 12%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 65% at 30% 20%, black 12%, transparent 72%)",
          }}
        />
        <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
        <div className="absolute bottom-0 left-[-6%] h-[22rem] w-[22rem] rounded-full bg-[#2A2F3A]/[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 pb-16 sm:px-10 sm:pb-20 lg:px-12 lg:pb-24 xl:px-16 xl:pb-28 2xl:px-20">
        <div
          id={APPROCHE_SCROLL_TARGET_ID}
          className="scroll-mt-[7.5rem] h-0 sm:scroll-mt-32"
          aria-hidden
        />

        <div
          className={`pt-16 transition-all duration-1000 sm:pt-20 lg:pt-24 xl:pt-28 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            L&apos;approche Modelisys
          </p>

          <h2 className="mt-6 max-w-2xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:mt-7 sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            Comprendre → Planifier → Exécuter
          </h2>

          <p className="mt-6 max-w-xl text-[15px] leading-[1.75] text-slate-600 sm:mt-7 sm:text-base">
            Voici comment nous procédons avec les dirigeants : comprendre ce qui impacte la valeur,
            planifier les leviers, puis exécuter et ajuster — une méthode concrète, pas une simple
            suite d&apos;outils.
          </p>

          <div className="mt-8 max-w-2xl border-l-2 border-[#E0742D] pl-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]">
              Accompagnement financier fractionnaire
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-[#2A2F3A] sm:text-base">
              C’est le cadre dans lequel cette approche se vit. Modelisys est à vos côtés, au
              rythme de votre entreprise, pour comprendre, planifier et exécuter — sans embauche à
              temps plein.
            </p>
          </div>

          <nav
            className="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-[#2A2F3A]/10 pb-px"
            aria-label="Phases de l'approche Modelisys"
          >
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
                  className={`relative inline-flex items-center gap-2 px-3 py-3 text-[11px] font-semibold tracking-[0.08em] transition-colors duration-300 sm:px-4 sm:text-xs ${
                    isActive ? "text-[#2A2F3A]" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <span className={`font-mono tabular-nums ${isActive ? "text-[#E0742D]" : "text-slate-400"}`}>
                    {phase.phaseNumber}
                  </span>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                  {phase.shortTitle}
                  <span
                    className={`absolute inset-x-3 -bottom-px h-px transition-colors duration-300 sm:inset-x-4 ${
                      isActive ? "bg-[#E0742D]" : "bg-transparent"
                    }`}
                    aria-hidden
                  />
                </button>
              )
            })}
          </nav>
        </div>

        <div className="divide-y divide-[#2A2F3A]/10">
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
