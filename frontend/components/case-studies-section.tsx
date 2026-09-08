"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  CASE_STUDIES_CONTENT,
  CASE_STUDIES_ORDER,
  type CaseStudyId,
} from "@/lib/case-studies-content"
import { getLandingNavOffset } from "@/lib/approche-navigation"
import { cn } from "@/lib/utils"

function scrollToCaseStudy(id: CaseStudyId) {
  if (typeof window === "undefined") return
  const el = document.getElementById(`case-${id}`)
  if (!el) return

  const run = () => {
    const top = el.getBoundingClientRect().top + window.scrollY - getLandingNavOffset()
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  }

  requestAnimationFrame(() => requestAnimationFrame(run))

  const nextHash = `#case-${id}`
  if (window.location.hash !== nextHash) {
    window.history.pushState(null, "", `${window.location.pathname}${nextHash}`)
  }
}

export function CaseStudiesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeId, setActiveId] = useState<CaseStudyId>("services")
  const [highlightedId, setHighlightedId] = useState<CaseStudyId | null>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  useEffect(() => {
    const applyFromHash = () => {
      const raw = window.location.hash.replace(/^#/, "")
      if (!raw.startsWith("case-")) return
      const id = raw.slice("case-".length) as CaseStudyId
      if (!(id in CASE_STUDIES_CONTENT)) return
      setActiveId(id)
      setHighlightedId(id)
      window.setTimeout(() => setHighlightedId(null), 2200)
    }

    applyFromHash()
    window.addEventListener("hashchange", applyFromHash)
    return () => window.removeEventListener("hashchange", applyFromHash)
  }, [])

  const selectStudy = (id: CaseStudyId) => {
    setActiveId(id)
    setHighlightedId(id)
    window.setTimeout(() => setHighlightedId(null), 2200)
    scrollToCaseStudy(id)
  }

  return (
    <section
      id="etudes-de-cas"
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F8FAFC]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#F8FAFC]" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(42 47 58 / 0.045) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(42 47 58 / 0.045) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
          }}
        />
        <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <div
          className={`pt-28 sm:pt-32 lg:pt-36 xl:pt-40 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            Études de cas
          </p>

          <h2 className="mt-6 max-w-2xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:mt-7 sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            Des histoires de valeur — pas des démonstrations de modules
          </h2>

          <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-slate-600 sm:mt-7 sm:text-base">
            Chaque étude suit les trois phases de l&apos;approche :{" "}
            <span className="text-[#2A2F3A]">Diagnostic</span>,{" "}
            <span className="text-[#2A2F3A]">Planification</span>,{" "}
            <span className="text-[#2A2F3A]">Pilotage</span> — appliquées à une
            situation réelle, pour voir concrètement ce que Modelisys lit, projette
            et suit mois après mois.
          </p>

          <nav
            className="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-[#2A2F3A]/10 pb-px"
            aria-label="Catégories d'études de cas"
          >
            {CASE_STUDIES_ORDER.map((id) => {
              const isActive = activeId === id
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => selectStudy(id)}
                  className={cn(
                    "relative px-3 py-3 text-[11px] font-semibold tracking-[0.08em] transition-colors duration-300 sm:px-4 sm:text-xs",
                    isActive ? "text-[#2A2F3A]" : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {CASE_STUDIES_CONTENT[id].label}
                  <span
                    className={cn(
                      "absolute inset-x-3 -bottom-px h-px transition-colors duration-300 sm:inset-x-4",
                      isActive ? "bg-[#E0742D]" : "bg-transparent",
                    )}
                    aria-hidden
                  />
                </button>
              )
            })}
          </nav>
        </div>

        <div className="divide-y divide-[#2A2F3A]/10 pb-16 sm:pb-20 lg:pb-24">
          {CASE_STUDIES_ORDER.map((id) => {
            const study = CASE_STUDIES_CONTENT[id]
            const isHighlighted = highlightedId === id

            return (
              <article
                key={id}
                id={`case-${id}`}
                className={cn(
                  "scroll-mt-28 py-12 sm:py-14 lg:py-16 transition-opacity duration-500",
                  isHighlighted && "opacity-100",
                )}
              >
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                  <div className="lg:col-span-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
                      <span className="font-mono tabular-nums">{study.number}</span>
                      <span className="mx-2 text-[#2A2F3A]/25" aria-hidden>
                        —
                      </span>
                      {study.label}
                    </p>
                    <h3 className="mt-5 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.75rem]">
                      {study.tagline}
                    </h3>
                    <dl className="mt-6 flex flex-wrap gap-x-5 gap-y-3">
                      {study.figures.map((fig) => (
                        <div key={fig.label}>
                          <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                            {fig.label}
                          </dt>
                          <dd className="mt-1 font-mono text-base font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                            {fig.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="space-y-8 lg:col-span-8">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Diagnostic
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        {study.diagnostic}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Planification
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        {study.planification}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Pilotage
                      </p>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                        {study.pilotage}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[#2A2F3A]/10 pb-16 pt-8 sm:pb-20 lg:pb-24">
          <a
            href="/#approche-modelisys"
            className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#9A4A1A]"
          >
            REVOIR L&apos;APPROCHE
            <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
          </a>
          <span className="hidden h-px w-10 bg-[#2A2F3A]/15 sm:block" aria-hidden />
          <a
            href="/#demo"
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-slate-500 transition hover:text-[#2A2F3A]"
          >
            RÉSERVER UNE DÉMO
            <span className="inline-block h-px w-8 bg-[#E0742D]/80" />
          </a>
        </div>
      </div>
    </section>
  )
}
