"use client"

import { useEffect, useRef, useState } from "react"

const READINGS = [
  {
    title: "Rentabilité et performance",
    body: "Où se créent vos marges ? Quelles divisions contribuent réellement à vos résultats ? Quels écarts nécessitent une intervention ?",
  },
  {
    title: "Liquidités et financement",
    body: "Votre entreprise génère-t-elle suffisamment de liquidités ? Quels seront ses besoins au cours des prochains mois ? Dispose-t-elle des ressources nécessaires pour soutenir sa croissance ?",
  },
  {
    title: "Valeur et décisions stratégiques",
    body: "Quels investissements amélioreront votre rentabilité ? Quelle est la contribution de vos actifs à la performance ? Comment vos décisions influencent-elles la valeur de votre entreprise ?",
  },
] as const

export function LandingHomeObjectifSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      id="notre-objectif"
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F0F4F8] py-20 sm:py-28"
    >
      <div
        className={`mx-auto max-w-[1920px] px-5 transition-all duration-1000 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Vision financière</p>
        <h2 className="mt-5 max-w-4xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
          Au-delà des chiffres, comprendre ce qui fait progresser votre entreprise.
        </h2>
        <div className="mt-8 max-w-2xl space-y-4">
          <p className="text-lg font-medium leading-snug text-[#2A2F3A]">
            Les états financiers racontent une partie de l’histoire.
          </p>
          <p className="text-[15px] leading-[1.75] text-[#5C5F66] sm:text-base">
            Pour prendre les bonnes décisions, il faut aller plus loin : analyser les différentes
            sources de revenus, les marges, comprendre les sources de rentabilité, suivre les
            liquidités, mesurer la performance de chaque ligne d’affaires ou département et
            comprendre l’impact de chaque décision sur la valeur de votre entreprise.
          </p>
        </div>

        <div className="mt-14 grid gap-10 sm:mt-16 lg:grid-cols-3 lg:gap-12 xl:gap-16">
          {READINGS.map((item) => (
            <article key={item.title} className="border-t border-[#2A2F3A]/15 pt-6">
              <h3 className="text-xl font-semibold tracking-tight text-[#2A2F3A]">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.7] text-[#5C5F66]">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
