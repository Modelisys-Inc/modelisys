"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { BarChart3, Globe2, Layers, Shield, Sparkles, TrendingUp } from "lucide-react"

const benefits: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}[] = [
  {
    icon: TrendingUp,
    title: "Une base commune avec la PME",
    description:
      "Vos équipes métiers, risque et relation client s'appuient sur les mêmes états, ratios et scénarios que le dirigeant : les arbitrages portent sur le fond (risque, capacité de remboursement, plan d'action) plutôt que sur la réconciliation de fichiers.",
  },
  {
    icon: BarChart3,
    title: "Revues et comités mieux préparés",
    description:
      "Historiques, budgets, écarts commentés et pièces rattachées : accélérez les revues de dossier, le suivi d'engagements et la production de synthèses pour vos instances internes ou réglementaires.",
  },
  {
    icon: Globe2,
    title: "Groupes, filiales et périmètres complexes",
    description:
      "Vues consolidées, comparaisons entre entités et signaux utiles au pilotage du risque et de la performance — pour les grandes PME, les holdings et les dossiers multi-établissements.",
  },
  {
    icon: Layers,
    title: "Données structurées, moins de ressaisie",
    description:
      "Une source unique alimente analyses, modèles internes et livrables : vos équipes capitalisent sur l'information au fil des interactions avec la PME, sans multiplier les versions hors outil.",
  },
  {
    icon: Sparkles,
    title: "IA au service de vos analystes",
    description:
      "Suggestions et synthèses à partir des données réellement dans Modelisys — pour prioriser les questions, préparer les revues et documenter sans déconnecter le jugement professionnel ni la responsabilité de l'institution.",
  },
  {
    icon: Shield,
    title: "Cadre compatible avec vos exigences",
    description:
      "Traçabilité, habilitations et documentation structurée pour soutenir vos politiques internes, de sous-traitance et de maîtrise des risques — tout en restant alignés sur la réalité opérationnelle du client.",
  },
]

export function InstitutionalPartnersBenefitsSection() {
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
      id="institutional-partner-benefits"
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
            Ce que gagnent les institutions partenaires avec{" "}
            <span className="text-slate-600">Modelisys</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">
            Renforcer la qualité de l&apos;analyse, fluidifier la relation avec les PME et déployer une offre différenciante
            — avec une plateforme conçue pour la donnée financière structurée, la collaboration et les usages encadrés
            d&apos;intelligence artificielle.
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
