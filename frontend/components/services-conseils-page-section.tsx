"use client"

import { useEffect, useState } from "react"
import { getLandingNavOffset } from "@/lib/approche-navigation"
import {
  SERVICES_CONSEILS_LINES,
  SERVICES_CONSEILS_PAGE,
  type ServicesConseilsLineId,
} from "@/lib/services-conseils-content"
import { ServicesOtherServicesSection } from "@/components/services-other-services-section"
import { cn } from "@/lib/utils"

function scrollToLine(id: ServicesConseilsLineId) {
  if (typeof window === "undefined") return
  const el = document.getElementById(`conseils-${id}`)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - getLandingNavOffset()
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  const nextHash = `#conseils-${id}`
  if (window.location.hash !== nextHash) {
    window.history.pushState(null, "", `${window.location.pathname}${nextHash}`)
  }
}

export function ServicesConseilsPageSection() {
  const [activeId, setActiveId] = useState<ServicesConseilsLineId>("diagnostic")

  useEffect(() => {
    const fromHash = () => {
      const raw = window.location.hash.replace(/^#/, "")
      if (!raw.startsWith("conseils-")) return
      const id = raw.slice("conseils-".length) as ServicesConseilsLineId
      if (SERVICES_CONSEILS_LINES.some((line) => line.id === id)) {
        setActiveId(id)
        scrollToLine(id)
      }
    }
    fromHash()
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
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

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-32 lg:px-12 xl:px-16 2xl:px-20">
        <header className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            {SERVICES_CONSEILS_PAGE.eyebrow}
          </p>
          <h1 className="mt-6 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            {SERVICES_CONSEILS_PAGE.title}
          </h1>
          <p className="mt-6 text-[15px] leading-[1.75] text-slate-600 sm:text-base">
            {SERVICES_CONSEILS_PAGE.intro}
          </p>

          <nav
            className="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-[#2A2F3A]/10 pb-px"
            aria-label="Lignes de mandats ponctuels"
          >
            {SERVICES_CONSEILS_LINES.map((line) => {
              const isActive = activeId === line.id
              return (
                <button
                  key={line.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveId(line.id)
                    scrollToLine(line.id)
                  }}
                  className={cn(
                    "relative px-3 py-3 text-[11px] font-semibold tracking-[0.08em] transition-colors duration-300 sm:px-4 sm:text-xs",
                    isActive ? "text-[#2A2F3A]" : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {line.title}
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
        </header>

        <div className="mt-2 divide-y divide-[#2A2F3A]/10">
          {SERVICES_CONSEILS_LINES.map((line) => {
            const study = line.caseStudy
            return (
              <section
                key={line.id}
                id={`conseils-${line.id}`}
                className="scroll-mt-28 py-14 sm:py-16 lg:py-20"
              >
                {/* Offre */}
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
                  <div className="lg:col-span-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9A4A1A]">
                      <span className="font-mono tabular-nums">{line.number}</span>
                      <span className="mx-2 text-[#2A2F3A]/25" aria-hidden>
                        —
                      </span>
                      {line.title}
                    </p>
                    <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.75rem]">
                      {line.lead}
                    </h2>
                  </div>
                  <div className="space-y-6 lg:col-span-8">
                    <p className="text-[15px] leading-relaxed text-slate-600">{line.body}</p>
                    {line.examples ? (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                          Exemples
                        </p>
                        <ul className="mt-3 space-y-2">
                          {line.examples.map((ex) => (
                            <li
                              key={ex}
                              className="flex gap-3 text-[15px] leading-relaxed text-slate-600"
                            >
                              <span
                                className="mt-[0.65rem] h-px w-3 shrink-0 bg-[#E0742D]"
                                aria-hidden
                              />
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Cas illustratif — panneau distinct de la fiche service */}
                <aside
                  className="mt-10 rounded-2xl border border-[#2A2F3A]/[0.08] bg-[#2A2F3A]/[0.03] p-5 sm:mt-12 sm:p-7 lg:ml-[calc(33.333%+3.5rem)]"
                  aria-label={`Cas — ${line.title}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E0742D]">
                      Cas · {line.title}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500">{study.profile}</p>
                  </div>
                  <h3 className="mt-3 max-w-2xl text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">
                    {study.title}
                  </h3>

                  <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 border-b border-[#2A2F3A]/10 pb-5">
                    {study.figures.map((fig) => (
                      <div key={fig.label}>
                        <dt className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                          {fig.label}
                        </dt>
                        <dd className="mt-1 font-mono text-sm font-semibold tabular-nums tracking-tight text-[#2A2F3A] sm:text-base">
                          {fig.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-5 grid gap-5 sm:grid-cols-3 sm:gap-6">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        Situation
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
                        {study.situation}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        Intervention
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
                        {study.intervention}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                        Résultat
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed text-slate-600 sm:text-[14px]">
                        {study.result}
                      </p>
                    </div>
                  </div>
                </aside>
              </section>
            )
          })}
        </div>

        <ServicesOtherServicesSection currentId="mandats" />
      </div>
    </div>
  )
}
