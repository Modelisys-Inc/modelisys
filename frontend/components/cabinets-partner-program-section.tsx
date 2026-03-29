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
    title: "Partage de revenus",
    description:
      "Des rémunérations compétitives sur les opportunités que vous apportez ou que vous influencez dans le pipeline commercial.",
  },
  {
    icon: GraduationCap,
    title: "Formation et certification",
    description:
      "Outillez vos équipes en positionnement, connaissance produit et cadres de délivrance pour réussir sur le terrain.",
  },
  {
    icon: Users,
    title: "Appui à la vente conjointe",
    description:
      "Collaborez avec notre équipe sur les dossiers en cours, la conception de solutions et les comptes stratégiques.",
  },
  {
    icon: Megaphone,
    title: "Co-marketing",
    description:
      "Accroissez la visibilité de votre cabinet grâce à des campagnes jointes, des webinaires, des événements et des contenus de réflexion.",
  },
  {
    icon: LayoutDashboard,
    title: "Portail partenaire",
    description:
      "Accédez à tout moment aux supports commerciaux, environnements de démonstration, messages clés et ressources d'habilitation.",
  },
  {
    icon: Briefcase,
    title: "Développer votre cabinet",
    description:
      "Recevez des références lorsque les clients ont besoin d'implantation ou de conseil — pour faire croître votre pratique.",
  },
]

export function CabinetsPartnerProgramSection() {
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
      id="cabinet-partner-program"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 border-t border-emerald-200/60 bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 py-20 sm:py-28 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgb(16 185 129 / 0.12) 0%, transparent 45%),
            radial-gradient(circle at 80% 80%, rgb(148 163 184 / 0.15) 0%, transparent 40%)`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div
            className={`mb-10 max-w-xl text-center transition-all duration-1000 lg:col-span-5 lg:mb-0 lg:pt-2 lg:text-left ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/90">Programme partenaire</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Les avantages de devenir{" "}
              <span className="text-emerald-800/90">partenaire Modelisys</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              Un programme conçu pour soutenir votre croissance : rémunération, formation, vente et marketing, ressources
              dédiées et opportunités de mandats.
            </p>
          </div>

          <div
            className={`transition-all duration-1000 delay-150 lg:col-span-7 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-emerald-200/90 bg-white/90 p-6 shadow-sm backdrop-blur-sm sm:p-8">
              <ul className="space-y-0">
                {programItems.map((item, index) => {
                  const Icon = item.icon
                  const isLast = index === programItems.length - 1
                  return (
                    <li key={item.title} className="flex gap-4 sm:gap-5">
                      <div className="flex shrink-0 flex-col items-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-900/10">
                          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                        </span>
                        {!isLast ? (
                          <div
                            className="mt-2 w-0.5 flex-1 min-h-[1.25rem] bg-gradient-to-b from-emerald-200 to-emerald-100"
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
