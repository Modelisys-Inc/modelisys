"use client"

import { useEffect, useRef, useState } from "react"
import { APPROCHE_SCROLL_TARGET_ID, APPROCHE_SECTION_ID } from "@/lib/approche-navigation"

const STEPS = [
  {
    index: "01",
    title: "Comprendre",
    body: "Nous analysons vos états financiers, vos fichiers, vos divisions et vos processus afin de comprendre votre réalité d’affaires.",
  },
  {
    index: "02",
    title: "Planifier",
    body: "Nous établissons des projections, évaluons différents scénarios et définissons les priorités financières avec la direction.",
  },
  {
    index: "03",
    title: "Exécuter",
    body: "Nous assurons un suivi périodique des résultats, mesurons les écarts et adaptons les recommandations à l’évolution de votre entreprise.",
  },
] as const

export function LandingHomeApprocheSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

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

  return (
    <section
      id={APPROCHE_SECTION_ID}
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F8FAFC]"
    >
      <div className="relative z-10 mx-auto max-w-[1920px] px-5 py-16 sm:px-10 sm:py-20 lg:px-12 lg:py-24 xl:px-16 xl:py-28 2xl:px-20">
        <div id={APPROCHE_SCROLL_TARGET_ID} className="scroll-mt-[7.5rem] h-0 sm:scroll-mt-32" aria-hidden />

        <div
          className={`transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            L&apos;approche Modelisys
          </p>
          <h2 className="mt-6 max-w-3xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            Une approche structurée, adaptée à votre entreprise.
          </h2>

          <ol className="mt-12 border-t border-[#2A2F3A]/10 sm:mt-14">
            {STEPS.map((step) => (
              <li
                key={step.index}
                className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-[#2A2F3A]/10 py-7 sm:grid-cols-[5.5rem_minmax(0,16rem)_1fr] sm:gap-x-8 sm:py-8"
              >
                <span className="font-mono text-[13px] tabular-nums text-[#E0742D]">{step.index}</span>
                <h3 className="text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">{step.title}</h3>
                <p className="col-start-2 mt-2 max-w-xl text-[15px] leading-[1.7] text-[#5C5F66] sm:col-start-3 sm:mt-0">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-10 max-w-2xl border-l-2 border-[#E0742D] pl-5 text-[15px] leading-[1.75] text-[#2A2F3A] sm:text-base">
            Les solutions Excel peuvent être intégrées à cette démarche ou réalisées indépendamment,
            selon vos besoins.
          </p>
        </div>
      </div>
    </section>
  )
}
