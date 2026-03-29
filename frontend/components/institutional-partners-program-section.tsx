"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import {
  Briefcase,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Percent,
  Users,
} from "lucide-react"

const programItems: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}[] = [
  {
    icon: Percent,
    title: "Modèles de rémunération adaptés",
    description:
      "Structuration du partage de revenus ou des référencements sur les opportunités que vous portez ou co-portez avec Modelisys (financement, services adjacents, programmes d'accompagnement).",
  },
  {
    icon: GraduationCap,
    title: "Habilitation des équipes",
    description:
      "Parcours de formation ciblés risque, conformité, analyse financière et usage produit — pour vos analystes, chargés d'affaires, réseaux et fonctions transverses.",
  },
  {
    icon: Users,
    title: "Co-vente et dossiers stratégiques",
    description:
      "Appui sur les segments PME prioritaires, cadrage des démonstrations et accompagnement sur les phases critiques (lancement, déploiement, montée en charge).",
  },
  {
    icon: Megaphone,
    title: "Co-marketing institutionnel",
    description:
      "Contenus, événements et campagnes conjointes pour valoriser votre institution auprès des dirigeants, des intermédiaires et de votre écosystème.",
  },
  {
    icon: LayoutDashboard,
    title: "Portail partenaire",
    description:
      "Accès aux supports, environnements de démonstration, argumentaires sectoriels et ressources de mise en marché à jour.",
  },
  {
    icon: Briefcase,
    title: "Alignement avec vos directions métiers",
    description:
      "Points réguliers avec vos équipes pour prioriser les cas d'usage, les intégrations et la feuille de route — selon vos objectifs commerciaux et de conformité.",
  },
]

export function InstitutionalPartnersProgramSection() {
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
      id="institutional-partner-program"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 overflow-hidden border-t border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-white py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-0 h-72 w-72 rounded-full bg-emerald-100/25 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-slate-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div
            className={`mb-10 max-w-xl text-center transition-all duration-1000 lg:col-span-5 lg:mb-0 lg:pt-2 lg:text-left ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Programme partenaire</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Les avantages de devenir{" "}
              <span className="text-emerald-700">partenaire institutionnel Modelisys</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Un programme conçu pour les banques, les assureurs, les financeurs, les sociétés de gestion et les grands
              organismes qui accompagnent les PME : rémunération, formation, co-développement commercial et ressources
              dédiées.
            </p>
          </div>

          <div
            className={`transition-all duration-1000 delay-150 lg:col-span-7 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
              <ul className="space-y-0">
                {programItems.map((item, index) => {
                  const Icon = item.icon
                  const isLast = index === programItems.length - 1
                  return (
                    <li key={item.title} className="flex gap-4 sm:gap-5">
                      <div className="flex shrink-0 flex-col items-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/80">
                          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                        </span>
                        {!isLast ? (
                          <div
                            className="mt-2 w-0.5 flex-1 min-h-[1.25rem] bg-gradient-to-b from-emerald-100 to-emerald-50/90"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <div className={`min-w-0 flex-1 ${!isLast ? "pb-8 sm:pb-10" : ""}`}>
                        <h3 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">{item.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[15px]">{item.description}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
