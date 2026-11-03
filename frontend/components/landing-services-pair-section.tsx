"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const SERVICES = [
  {
    index: "01",
    title: "Accompagnement financier fractionnaire",
    lead: "Bénéficiez d’une expertise financière auprès de la direction, sans avoir à embaucher un directeur financier à temps plein.",
    points: [
      "Analyse périodique de la performance financière.",
      "Suivi des marges et des indicateurs clés.",
      "Prévisions financières et gestion de la trésorerie.",
      "Analyse des divisions et des lignes d’affaires.",
      "Évaluation des leviers de rentabilité et de création de valeur.",
      "Rencontres périodiques avec la direction.",
    ],
    notes: [],
    href: "/accompagnement-financier",
    linkLabel: "Découvrir l’accompagnement financier",
  },
  {
    index: "02",
    title: "Solutions Excel sur mesure",
    lead: "Des outils de gestion conçus selon vos processus, vos données et les besoins de votre entreprise.",
    points: [
      "Automatisation des rapports et tâches répétitives.",
      "Tableaux de bord et indicateurs de performance.",
      "Consolidation de données provenant de plusieurs fichiers.",
      "Suivi de la rentabilité par projet ou division.",
      "Budgets, projections et modèles financiers.",
      "Optimisation et développement de fichiers existants.",
    ],
    notes: [
      "Chaque solution est conçue selon vos besoins et fait l’objet d’une proposition personnalisée.",
      "Des outils développés et utilisés auprès d’entreprises de 1 M$ à 100 M$ de revenus.",
    ],
    href: "/solutions-excel",
    linkLabel: "Découvrir les solutions Excel",
  },
] as const

export function LandingServicesPairSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.12, rootMargin: "0px 0px -80px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      id="ce-que-nous-faisons"
      ref={sectionRef}
      className="relative z-10 scroll-mt-28 overflow-x-clip bg-[#222732]"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `linear-gradient(rgb(255 255 255 / 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgb(255 255 255 / 0.03) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 65% at 20% 20%, black 8%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 20% 20%, black 8%, transparent 72%)",
          }}
        />
        <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <div
          className={`py-16 transition-all duration-1000 sm:py-20 lg:py-24 xl:py-28 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
            Ce que nous faisons
          </p>
          <h2 className="mt-6 max-w-4xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-7 sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            Deux expertises. Un objectif : améliorer la performance de votre entreprise.
          </h2>

          <div className="mt-14 grid gap-px bg-white/10 lg:mt-16 lg:grid-cols-2">
            {SERVICES.map((service, index) => (
              <article
                key={service.index}
                className={`bg-[#222732] py-10 sm:py-12 lg:py-14 ${
                  index === 0 ? "lg:pr-12 xl:pr-16" : "lg:pl-12 xl:pl-16"
                }`}
              >
                <p className="font-mono text-[13px] tabular-nums text-[#E0742D]">{service.index}</p>
                <h3 className="mt-5 max-w-md text-[1.45rem] font-semibold leading-[1.2] tracking-tight text-[#E6D6C3] sm:text-[1.7rem]">
                  {service.title}
                </h3>
                <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-[#C9B8A5]/82 sm:text-base">
                  {service.lead}
                </p>
                <ul className="mt-7 max-w-xl space-y-3">
                  {service.points.map((point) => (
                    <li key={point} className="flex gap-3 text-[15px] leading-relaxed text-[#C9B8A5]/78">
                      <span className="mt-[0.7rem] h-px w-3 shrink-0 bg-[#E0742D]" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                {service.notes.length > 0 ? (
                  <div className="mt-7 max-w-xl space-y-3 border-t border-white/10 pt-6">
                    {service.notes.map((note) => (
                      <p key={note} className="text-[15px] leading-[1.7] text-[#E6D6C3]/88">
                        {note}
                      </p>
                    ))}
                  </div>
                ) : null}
                <Link
                  href={service.href}
                  className="group mt-8 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-[#E6D6C3] transition hover:text-white"
                >
                  {service.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden className="relative h-16 overflow-hidden bg-[#222732] sm:h-20">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#F8FAFC"
          />
        </svg>
      </div>
    </section>
  )
}
