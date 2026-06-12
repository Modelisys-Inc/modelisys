"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { CheckCircle2, ClipboardList, Database, Info, Rocket, SlidersHorizontal } from "lucide-react"

const steps: {
  step: number
  icon: ComponentType<{ className?: string }>
  title: string
  approachPhase: string
  description: string
}[] = [
  {
    step: 1,
    icon: ClipboardList,
    title: "Cadrage du déploiement",
    approachPhase: "Périmètre & usages",
    description:
      "Nous clarifions le périmètre du déploiement : objectifs de pilotage, organisation, entités, flux comptables et usages attendus par vos équipes. Ce cadrage technique pose les bases — sans réaliser à votre place le diagnostic financier ni l'évaluation de valeur.",
  },
  {
    step: 2,
    icon: Database,
    title: "Intégration des données",
    approachPhase: "Données comptables",
    description:
      "Connexion de vos sources comptables, définition des périmètres et des règles de consolidation pour alimenter la plateforme avec des données fiables et actualisées.",
  },
  {
    step: 3,
    icon: SlidersHorizontal,
    title: "Paramétrage sur mesure",
    approachPhase: "Structure de la plateforme",
    description:
      "Configuration des axes d'analyse, des indicateurs, des reportings et des droits utilisateurs selon vos processus et votre gouvernance. L'environnement est prêt à accueillir vos scénarios et objectifs — définis par vos équipes ou dans le cadre d'un accompagnement stratégique.",
  },
  {
    step: 4,
    icon: CheckCircle2,
    title: "Recette et validation",
    approachPhase: "Validation technique",
    description:
      "Tests avec vos équipes finance et contrôle de gestion : cohérence des données, fonctionnement des reportings et des indicateurs avant passage en environnement de production.",
  },
  {
    step: 5,
    icon: Rocket,
    title: "Mise en production et support",
    approachPhase: "Go-live & formation",
    description:
      "Go-live encadré, formation des utilisateurs, documentation et support technique pour une adoption progressive. L'accompagnement stratégique — diagnostic, valorisation, projections, analyse des écarts — s'active en option selon le plan choisi.",
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
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Mise en place
          </p>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Comment nous déployons{" "}
            <span className="text-[#5C5F66]">la plateforme chez vous</span>
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#5C5F66] sm:text-lg">
            Cinq étapes pour installer Modelisys chez vous : connexion des données comptables, paramétrage de la
            plateforme et validation technique avec vos équipes. La plateforme est conçue pour supporter l&apos;approche
            Modelisys en cinq phases — l&apos;évaluation initiale, les projections, l&apos;analyse des écarts et le suivi
            stratégique relèvent, eux, d&apos;un plan d&apos;accompagnement optionnel.
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
                  <span className="inline-flex items-center gap-1.5">
                    En moyenne 4–6 semaines
                    <span className="group relative inline-flex">
                      <span
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#E0742D]/25 bg-white/60 text-[#E0742D] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/40"
                        role="button"
                        tabIndex={0}
                        aria-label="Informations sur la durée"
                      >
                        <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                      </span>
                      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-[11px] font-medium leading-relaxed text-slate-700 shadow-lg opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                        Durée indicative. Elle varie selon votre structure (entités, intercos) et votre périmètre
                        (modules, intégrations, gouvernance).
                      </span>
                    </span>
                  </span>
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-[10px] leading-snug text-[#5C5F66] sm:text-[11px]">
                  Durée cumulée pour les étapes <span className="font-semibold text-[#2A2F3A]/90">2 à 5</span>, selon
                  votre structure et votre périmètre.
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]/90">
                    {item.approachPhase}
                  </p>
                  <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">{item.title}</h3>
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
