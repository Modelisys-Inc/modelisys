"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState, type ComponentType } from "react"
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  Layers,
  Store,
  Target,
  Wallet,
} from "lucide-react"

type CaseStudy = {
  client: string
  tagline: string
  context: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  painPoints: string[]
  outcomes: string[]
}

const CASE_STUDIES: CaseStudy[] = [
  {
    client: "Entreprise de services",
    tagline: "Rentabilité par division enfin lisible",
    context:
      "Entreprise de services avec plusieurs divisions/entités, des frais partagés, et un pilotage budgétaire difficile à comparer au réel.",
    icon: BarChart3,
    painPoints: [
      "Impossible de voir les marges par division : les résultats “bons au total” masquaient une division déficitaire.",
      "Coûts indirects et frais partagés sans règles stables (Excel), donc des analyses qui changent d’une version à l’autre.",
      "Budgets par division/entité difficiles à suivre et à consolider, avec peu de lecture réel vs budget en cours d’année.",
      "Aucun diagnostic clair : difficile de savoir s’il fallait agir sur le pricing, les coûts, le mix, ou la discipline budgétaire.",
    ],
    outcomes: [
      "Vue des marges par division (réel vs historique vs budget) avec des allocations de coûts reproductibles.",
      "Suivi mensuel budget vs réel par division/entité, avec analyse d’écarts actionnable pour corriger plus tôt.",
      "Identification rapide des causes de sous-performance et plan d’actions (pricing, efficacité, coûts indirects, mix).",
      "Amélioration mesurable de la rentabilité et meilleure lecture des leviers qui augmentent la valeur d’entreprise.",
    ],
  },
  {
    client: "Entreprise en croissance",
    tagline: "Suivi de la valeur et du modèle d’affaires",
    context: "Entreprise en croissance, sans cadre de suivi des déterminants de valeur.",
    icon: Briefcase,
    painPoints: [
      "Aucune vue structurée sur la valeur d’entreprise et son évolution.",
      "Hypothèses de croissance et de rentabilité non documentées, difficiles à défendre.",
      "Modèle d’affaires mal formalisé, rendant difficile l’identification des leviers qui créent (ou détruisent) de la valeur.",
    ],
    outcomes: [
      "Cadre d’analyse pour suivre la valeur et ses moteurs (rentabilité, croissance, risque).",
      "Hypothèses centralisées et traçables, faciles à actualiser.",
      "Compréhension claire des leviers à activer pour optimiser la valeur d’entreprise (marge, croissance, risque).",
    ],
  },
  {
    client: "Entreprise cyclique",
    tagline: "Fonds de roulement, capex et cash sous contrôle",
    context:
      "Organisation avec un cycle de conversion de l’encaisse variable (BFR, stocks, délais clients/fournisseurs), des investissements à planifier, et un besoin de visibilité continue sur la trésorerie.",
    icon: Wallet,
    painPoints: [
      "Trésorerie pilotée “à reculons” : manque de visibilité sur les encaissements, les décaissements et les tensions à venir.",
      "Fonds de roulement difficile à suivre (clients, stocks, fournisseurs) et actions correctrices décidées trop tard.",
      "Capex planifiés sans lecture claire des impacts sur le cash et la trajectoire de l’entreprise.",
    ],
    outcomes: [
      "Lecture structurée du fonds de roulement et de ses leviers (clients, stocks, fournisseurs) pour agir plus tôt.",
      "Suivi des capex et de leurs impacts sur la trésorerie, avec priorisation et scénarios.",
      "Budget complet (résultat, variation du fonds de roulement, capex, financement) — et projection des flux de trésorerie pour piloter l’année.",
      "Meilleure visibilité sur les flux et la trajectoire de cash pour sécuriser les décisions et optimiser la valeur d’entreprise.",
    ],
  },
  {
    client: "Groupe de 4 sociétés",
    tagline: "Vision consolidée multi-sociétés",
    context:
      "Groupe de 4 sociétés avec transactions intercos, reporting hétérogène et besoin de suivre la valeur du groupe et de chacune des sociétés.",
    icon: Layers,
    painPoints: [
      "Consolidation lente, éliminations intercos manuelles et risquées.",
      "Reporting financier produit tard, peu comparable entre sociétés.",
      "Difficulté à expliquer les écarts, à piloter la performance et à suivre la valeur d’entreprise (groupe + sociétés).",
    ],
    outcomes: [
      "Vue d’ensemble consolidée et règles d’élimination intercos structurées.",
      "Reporting uniformisé (mêmes périodes, mêmes KPI, mêmes vues).",
      "Suivi de la valeur d’entreprise du groupe et de chaque société, avec lecture des déterminants (marge, croissance, risque).",
      "Clôtures plus rapides et meilleure lecture pour direction, banque et actionnaires.",
    ],
  },
  {
    client: "Cabinet comptable",
    tagline: "Devenir proactif avec des chiffres en temps réel",
    context:
      "Cabinet comptable qui veut passer d’une posture “réactive” à un accompagnement continu : chiffres à jour, suivi mensuel et décisions orientées valeur.",
    icon: FileText,
    painPoints: [
      "Chiffres disponibles trop tard : difficile d’anticiper et d’alerter avant que les écarts ne s’installent.",
      "Peu de visibilité continue sur le fonds de roulement, les capex et les budgets du client.",
      "Accompagnement “ponctuel” plutôt que proactif, alors que l’objectif est d’aider à optimiser la valeur d’entreprise.",
    ],
    outcomes: [
      "Accès aux chiffres en temps réel et à des états financiers mensuels clairs, prêts à commenter.",
      "Suivi structuré du fonds de roulement, des capex et des budgets (réel vs budget) pour anticiper et prioriser les actions.",
      "Analyse de groupe possible en cours d’année (consolidation, intercos, performance), sans attendre la fin d’exercice.",
      "Conseil plus proactif : discussions régulières sur les leviers (marge, croissance, risque) pour optimiser la valeur d’entreprise.",
    ],
  },
  {
    client: "Franchise",
    tagline: "Pilotage multi-sites simple et comparable",
    context: "Réseau de franchises avec plusieurs points de vente et une lecture financière difficile à uniformiser.",
    icon: Store,
    painPoints: [
      "Résultats par site difficilement comparables (plans de comptes, périodicité, KPI).",
      "Suivi des marges et des coûts opérationnels trop lent pour agir (mix produit, promotions, main-d’œuvre).",
      "Manque de visibilité consolidée pour la direction, et de repères pour accompagner les franchisés.",
    ],
    outcomes: [
      "Lecture uniforme par site et consolidée : KPI comparables, vues standardisées, tendances visibles.",
      "Détection rapide des écarts et des causes (marge, coûts, trafic) pour corriger plus tôt.",
      "Meilleure gouvernance du réseau et décisions orientées valeur (performance durable et optimisation).",
    ],
  },
]

export function CaseStudiesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const reduceMotion = useReducedMotion()

  const commonQuote =
    "« Une meilleure vision financière, une meilleure compréhension de la valeur — et surtout, la capacité d’optimiser la valeur d’entreprise. »"

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

  const total = CASE_STUDIES.length
  const active = CASE_STUDIES[activeIndex] ?? CASE_STUDIES[0]
  const ActiveIcon = active.icon

  const contentMotion = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: 18, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -12, filter: "blur(6px)" },
        transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] as const },
      }

  return (
    <section
      id="etudes-de-cas"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 border-t border-slate-200/80 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/70 pt-20 sm:pt-28 pb-12 sm:pb-16 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.055),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(148,163,184,0.12),transparent_65%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-100/35" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mx-auto mb-12 max-w-3xl text-center transition-all duration-1000 sm:mb-16 lg:mx-0 lg:max-w-2xl lg:text-left ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Études de cas</p>
          <h2 className="text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
            Des situations réelles, <span className="text-[#5C5F66]">des gains concrets</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
            Des situations concrètes, vécues par de nombreuses organisations : rentabilité, valorisation,
            consolidation, trésorerie et pilotage budgétaire.
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent lg:mx-0 mx-auto" />
        </div>

        <div
          className={`relative transition-all duration-1000 delay-150 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(280px,360px)_1fr] lg:gap-14">
              {/* Left rail (desktop) */}
              <div className="hidden lg:block">
                <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-1.5 text-[11px] font-semibold tracking-wide text-[#2A2F3A]">
                      <Building2 className="h-4 w-4 text-[#E0742D]" strokeWidth={2} aria-hidden />
                      Études de cas
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide text-slate-500">
                      {String(activeIndex + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="mt-5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
                      <div
                        className="h-full rounded-full bg-[#E0742D] transition-[width] duration-300"
                        style={{ width: `${((activeIndex + 1) / total) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    {CASE_STUDIES.map((cs, i) => {
                      const isActive = i === activeIndex
                      return (
                        <button
                          key={cs.client}
                          type="button"
                          onClick={() => setActiveIndex(i)}
                          className={`group flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                            isActive
                              ? "bg-[#E0742D]/10 ring-1 ring-[#E0742D]/35"
                              : "hover:bg-slate-50 ring-1 ring-transparent"
                          }`}
                          aria-current={isActive ? "true" : undefined}
                        >
                          <span
                            className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
                              isActive ? "bg-[#E0742D]" : "bg-slate-300 group-hover:bg-slate-400"
                            }`}
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[#2A2F3A]">{cs.client}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">{cs.tagline}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <p className="mt-6 text-xs leading-relaxed text-slate-500">Exemples inspirés de situations fréquentes.</p>
                </div>
              </div>

              {/* Main stage */}
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-10 right-0 hidden select-none text-[120px] font-semibold leading-none tracking-tight text-[#2A2F3A]/[0.035] lg:block xl:text-[150px]"
                >
                  étude<span className="text-[#E0742D]/20">.</span>
                </div>

                {/* Mobile selector */}
                <div className="lg:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-4 py-2 text-xs font-semibold text-[#2A2F3A] shadow-sm">
                      <Building2 className="h-4 w-4 text-[#E0742D]" strokeWidth={2} aria-hidden />
                      Études de cas
                    </div>
                    <div className="flex items-center gap-2">
                      {CASE_STUDIES.map((cs, i) => (
                        <button
                          key={cs.client}
                          type="button"
                          onClick={() => setActiveIndex(i)}
                          aria-label={`Voir ${cs.client}`}
                          className={`h-2.5 w-2.5 rounded-full ring-1 transition ${
                            i === activeIndex
                              ? "bg-[#E0742D] ring-[#E0742D]/40"
                              : "bg-white ring-slate-300 hover:ring-slate-400"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 lg:mt-0">
                  <AnimatePresence mode="wait">
                    <motion.div key={active.client} {...contentMotion} className="relative">
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Situation
                          </p>
                          <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl">
                            {active.client}
                          </h3>
                          <p className="mt-3 max-w-3xl text-base font-semibold text-[#E0742D] sm:text-lg">
                            {active.tagline}
                          </p>
                          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5C5F66] sm:text-lg">
                            {active.context}
                          </p>
                        </div>
                        <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm">
                          <ActiveIcon className="h-7 w-7 text-[#2A2F3A]" strokeWidth={1.75} aria-hidden />
                        </div>
                      </div>

                      <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
                        <div className="lg:col-span-5">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Défis</p>
                            <span className="h-px flex-1 mx-4 bg-slate-200/90" aria-hidden />
                          </div>
                          <ul className="mt-5 space-y-4">
                            {active.painPoints.map((x) => (
                              <li key={x}>
                                <div className="flex gap-3">
                                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-hidden />
                                  <p className="text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">{x}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="hidden lg:col-span-1 lg:block">
                          <div className="mx-auto h-full w-px bg-gradient-to-b from-transparent via-slate-200/90 to-transparent" />
                        </div>

                        <div className="lg:col-span-6">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Avec Modelisys
                            </p>
                            <span className="h-px flex-1 mx-4 bg-slate-200/90" aria-hidden />
                          </div>
                          <ul className="mt-5 space-y-4">
                            {active.outcomes.map((x) => (
                              <li key={x} className="flex gap-3">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#E0742D]" strokeWidth={2} />
                                <p className="text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">{x}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-10">
                        <p className="text-sm italic leading-relaxed text-[#E0742D]">{commonQuote}</p>
                        <div className="mt-6 border-t border-slate-200/80 pt-4">
                          <a
                            href="#demo"
                            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#5C5F66] transition hover:text-[#2A2F3A]"
                          >
                            Voir comment ça s’applique à votre cas
                            <ArrowRight className="h-4 w-4 text-[#E0742D]" />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
        </div>
      </div>
    </section>
  )
}

