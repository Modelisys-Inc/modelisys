"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { Handshake, Layers, Shield, Sparkles, Users, Zap } from "lucide-react"

const benefits: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}[] = [
  {
    icon: Handshake,
    title: "Renforcer votre rôle de conseiller",
    description:
      "Vous intervenez sur des analyses, budgets et scénarios à partir des mêmes données que votre client : des échanges plus factuels et des recommandations mieux ancrées dans sa réalité financière.",
  },
  {
    icon: Zap,
    title: "Gagner en productivité sur les missions",
    description:
      "Moins de ressaisie, moins de fichiers éparpillés : états consolidés, historiques et indicateurs exploitables pour accélérer certification, revues et livrables.",
  },
  {
    icon: Users,
    title: "Collaborer clairement avec la PME",
    description:
      "Un espace partagé pour les échanges, les notes et les pièces : moins d'allers-retours opaques, plus de traçabilité pour votre cabinet et votre client.",
  },
  {
    icon: Layers,
    title: "Une base de données au service du cabinet",
    description:
      "Données structurées, benchmarks internes et vues groupe quand vos clients ont plusieurs entités : vous capitalisez sur l'information au fil des mandats.",
  },
  {
    icon: Sparkles,
    title: "L'IA au bon endroit",
    description:
      "Suggestions et synthèses à partir des données réellement dans Modelisys — pas un gadget isolé : l'assistance soutient vos analyses et reste sous votre responsabilité professionnelle.",
  },
  {
    icon: Shield,
    title: "Moderniser l'image de votre cabinet",
    description:
      "Répondre aux attentes des dirigeants en matière d'outils et de réactivité, tout en gardant le contrôle sur la qualité du service et la relation de confiance.",
  },
]

export function CabinetsPartnerBenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )

    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      id="cabinet-partner-benefits"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 border-t border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-slate-50 py-20 sm:py-28 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 right-0 h-72 w-72 rounded-full bg-emerald-100/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-slate-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mb-14 max-w-3xl text-left transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Ce que gagne votre cabinet avec{" "}
            <span className="text-slate-600">Modelisys</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">
            Rejoindre l&apos;écosystème Modelisys, c&apos;est offrir à votre cabinet des leviers concrets : meilleure efficacité sur les dossiers,
            relation client plus fluide et services d&apos;accompagnement financier plus solides — sans sacrifier les standards de la profession.
          </p>
        </div>

        <div
          className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 transition-all duration-1000 delay-150 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {benefits.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.title}
                className="flex flex-col rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-sm transition-shadow duration-300 hover:border-slate-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/80">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-lg font-bold leading-snug text-slate-900">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{item.description}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
