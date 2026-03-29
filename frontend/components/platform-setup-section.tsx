"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { CheckCircle2, ClipboardList, Database, Rocket, SlidersHorizontal } from "lucide-react"

const steps: {
  step: number
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}[] = [
  {
    step: 1,
    icon: ClipboardList,
    title: "Cadrage et diagnostic",
    description:
      "Nous clarifions vos objectifs de pilotage, votre organisation et le périmètre fonctionnel : entités, flux comptables et usages attendus par les équipes.",
  },
  {
    step: 2,
    icon: Database,
    title: "Intégration des données",
    description:
      "Connexion de vos sources comptables, définition des périmètres et des règles de consolidation pour alimenter la plateforme avec des données fiables.",
  },
  {
    step: 3,
    icon: SlidersHorizontal,
    title: "Paramétrage sur mesure",
    description:
      "Configuration des axes d’analyse, des indicateurs, des reportings et des droits utilisateurs selon vos processus et votre gouvernance.",
  },
  {
    step: 4,
    icon: CheckCircle2,
    title: "Recette et validation",
    description:
      "Phases de test avec vos équipes finance et contrôle de gestion : contrôles, ajustements et validation avant passage en environnement de production.",
  },
  {
    step: 5,
    icon: Rocket,
    title: "Mise en production et accompagnement",
    description:
      "Go-live encadré, formation des utilisateurs, documentation et support pour une adoption progressive et durable.",
  },
]

export function PlatformSetupSection() {
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
      id="platform-setup"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 border-t border-slate-200/90 bg-gradient-to-b from-slate-100/80 via-slate-50/95 to-white py-20 sm:py-28 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `radial-gradient(circle at 85% 15%, rgb(224 116 45 / 0.06) 0%, transparent 45%),
              radial-gradient(circle at 15% 85%, rgb(148 163 184 / 0.12) 0%, transparent 48%)`,
          }}
        />
        {/* Cadrillage léger — même principe que la section « Pourquoi » */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-1000 sm:mb-16 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Mise en place</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
            Comment nous déployons{" "}
            <span className="text-[#5C5F66]">la plateforme chez vous</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
            Un parcours structuré en plusieurs étapes pour intégrer Modelisys à votre réalité : de la prise de besoin au
            suivi après le go-live, avec une équipe dédiée à vos équipes financières.
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
        </div>

        <div
          className={`mb-10 hidden transition-all duration-1000 delay-100 lg:mb-14 lg:block ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="grid grid-cols-5 gap-3">
            {steps.map((item) => (
              <div key={item.step} className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2A2F3A] text-sm font-bold text-white shadow-md ring-4 ring-white/80">
                  {item.step}
                </span>
                <span className="line-clamp-3 text-[11px] font-medium leading-snug text-slate-600 lg:text-xs">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-3 pt-1">
            <div className="min-w-0">
              <div className="rounded-t-xl border-l-2 border-r-2 border-t-2 border-[#E0742D]/45 bg-gradient-to-b from-[#E0742D]/[0.07] to-transparent px-3 pb-3 pt-3 text-center shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.6)]">
                <p className="text-xs font-semibold tracking-tight text-[#2A2F3A] sm:text-sm">1–2 jours</p>
                <p className="mx-auto mt-1.5 max-w-[11rem] text-[10px] leading-snug text-[#5C5F66] sm:text-[11px]">
                  Appel de cadrage
                </p>
              </div>
            </div>
            {/* Bloc visuel : trait supérieur + côtés = les étapes 2 à 5 forment un seul cycle (~4 sem.) */}
            <div className="col-span-4 min-w-0">
              <div className="relative rounded-t-xl border-l-2 border-r-2 border-t-2 border-[#E0742D]/45 bg-gradient-to-b from-[#E0742D]/[0.07] to-transparent px-4 pb-3 pt-3 text-center shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.6)]">
                <p className="text-xs font-semibold tracking-tight text-[#2A2F3A] sm:text-sm">
                  Environ 4 semaines
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-[10px] leading-snug text-[#5C5F66] sm:text-[11px]">
                  Durée cumulée pour les étapes <span className="font-semibold text-[#2A2F3A]/90">2 à 5</span>, menées
                  ensemble
                </p>
              </div>
            </div>
          </div>
        </div>

        <ol
          className={`mx-auto max-w-4xl space-y-0 border-t border-slate-200/90 transition-all duration-1000 delay-200 lg:max-w-none ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {steps.map((item, index) => {
            const Icon = item.icon
            const isLast = index === steps.length - 1
            return (
              <li
                key={item.step}
                className={`grid gap-6 border-b border-slate-200/80 py-8 sm:grid-cols-[auto_1fr] sm:gap-8 sm:py-10 ${
                  isLast ? "border-b-0" : ""
                }`}
              >
                <div className="flex items-start gap-4 sm:flex-col sm:items-stretch sm:gap-3">
                  <span className="font-mono text-4xl font-bold leading-none tabular-nums text-[#E0742D]/20 sm:text-5xl">
                    {String(item.step).padStart(2, "0")}
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-[#2A2F3A] shadow-sm sm:h-14 sm:w-14">
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.5} />
                  </span>
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-[#5C5F66] sm:text-[17px]">{item.description}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
