"use client"

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react"
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  FileSpreadsheet,
  FileText,
  History,
  LayoutDashboard,
  MessageSquare,
  PieChart,
  RefreshCw,
  Target,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react"
import { scrollToApprocheSection } from "@/lib/approche-navigation"
import {
  FEATURE_CATEGORY_IDS,
  FEATURE_CATEGORY_LABELS,
  FEATURE_CATEGORY_NAVIGATE_EVENT,
  getFeatureCategoryHash,
  parseFeatureCategoryFromHash,
  type FeatureCategoryId,
} from "@/lib/feature-category-navigation"

const CATEGORY_ORDER = FEATURE_CATEGORY_IDS
type CategoryId = FeatureCategoryId
const categoryLabels = FEATURE_CATEGORY_LABELS

type Feature = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
  visionLink: string
}

type CategoryBlock = {
  intro: string
  features: Feature[]
}

const categoryContent: Record<CategoryId, CategoryBlock> = {
  valorisation: {
    intro:
      "Mesurer, fixer et suivre la valeur — du point de départ à la trajectoire visée, avec des chiffres défendables à chaque étape du parcours.",
    features: [
      {
        icon: Building2,
        title: "Évaluation de la valeur d'entreprise",
        description:
          "Structure guidée pour normaliser le BAIIA, retenir les multiples et formaliser une lecture de la valeur — un travail méthodique, pas un calcul automatique. Cette base devient le repère pour comparer, suivre et piloter tout le parcours Modelisys.",
        visionLink: "Ancre la trajectoire à un point de départ structuré, ex. 4,2 M$.",
      },
      {
        icon: Target,
        title: "Objectif de valeur chiffré",
        description:
          "Fixez un cap concret — horizon, rendement annualisé souhaité — que toute l'équipe et vos partenaires peuvent comprendre et suivre.",
        visionLink: "Transforme l'ambition en cible mesurable, ex. 7 M$ en 3 ans.",
      },
      {
        icon: BarChart3,
        title: "Leviers de création de valeur",
        description:
          "Scénarios comparatifs pour estimer l'impact des initiatives et prioriser celles qui rapprochent le plus de l'objectif.",
        visionLink: "Quantifie l'effet des décisions sur la valeur projetée.",
      },
      {
        icon: Target,
        title: "Diagnostic des risques",
        description:
          "Concentration client, fonds de roulement, dépendances opérationnelles : Modelisys met en évidence ce qui menace ou soutient la valeur.",
        visionLink: "Identifie les risques qui pèsent sur la trajectoire.",
      },
      {
        icon: TrendingUp,
        title: "Trajectoire et rendement visé",
        description:
          "Visualisez le chemin entre la valeur actuelle et la cible pour valider que l'ambition est réaliste avant de modéliser en détail.",
        visionLink: "Valide la faisabilité de la trajectoire avant les projections.",
      },
    ],
  },
  projections: {
    intro:
      "Modéliser l'avenir : scénarios, trésorerie, budget et recalibrage — pour garder le cap sur votre objectif de valeur tout au long du parcours.",
    features: [
      {
        icon: PieChart,
        title: "Création de scénarios",
        description:
          "Acquisition, fermeture de division, croissance organique : testez l'impact de chaque décision sur la performance et la valeur projetée.",
        visionLink: "Traduit la vision en hypothèses exploitables et comparables.",
      },
      {
        icon: History,
        title: "Projections financières 2 à 5 ans",
        description:
          "Revenus, dépenses fixes et variables, fonds de roulement et capex — structurés dans un scénario unique, lisible et partageable.",
        visionLink: "Projette la trajectoire vers l'objectif de valeur.",
      },
      {
        icon: DollarSign,
        title: "Flux de trésorerie et financement",
        description:
          "Révèle les tensions de liquidité avant qu'elles ne deviennent critiques et quantifie les besoins de financement à chaque étape.",
        visionLink: "Anticipe les besoins, ex. 850 k$ à l'acquisition.",
      },
      {
        icon: Calendar,
        title: "Budget mensuel",
        description:
          "Budget structuré avec suivi des écarts en continu pour ajuster rapidement vos actions opérationnelles en cours d'année.",
        visionLink: "Traduit le scénario en repères de pilotage mensuel.",
      },
      {
        icon: Building2,
        title: "Analyse des Capex",
        description:
          "Suivi des scénarios d'investissement, impacts sur la trésorerie et priorisation des projets à court et moyen terme.",
        visionLink: "Intègre les investissements dans la trajectoire de valeur.",
      },
      {
        icon: BarChart3,
        title: "Fonds de roulement",
        description:
          "Cycles d'encaissement et de décaissement suivis pour identifier les leviers d'optimisation de la liquidité.",
        visionLink: "Alimente les projections de trésorerie du scénario.",
      },
      {
        icon: RefreshCw,
        title: "Recalibrage de scénarios",
        description:
          "Nouvelles hypothèses, dépenses resserrées, embauche reportée : Modelisys recalcule l'impact sur la trésorerie et la valeur en temps réel.",
        visionLink: "Met à jour le plan sans remettre en cause la vision.",
      },
    ],
  },
  analyse: {
    intro:
      "Décortiquer la performance et la rentabilité — une lecture fiable de l'entreprise, alimentée par des données à jour.",
    features: [
      {
        icon: PieChart,
        title: "Analyse financière et KPI",
        description:
          "Marges, liquidité, ratios et performance consolidés en temps réel — plus de fichiers dispersés ni de versions contradictoires.",
        visionLink: "Structure une lecture complète et continue de l'entreprise.",
      },
      {
        icon: DollarSign,
        title: "Rentabilité par division, produit ou client",
        description:
          "Reconstruction automatique des marges avec allocation précise des coûts — pour savoir ce qui crée vraiment de la valeur.",
        visionLink: "Mesure où la valeur se crée dans l'organisation.",
      },
      {
        icon: PieChart,
        title: "Bibliothèque de ratios financiers",
        description:
          "Liquidité, solvabilité, rentabilité : suivi temporel, comparatifs et alertes pour orienter les décisions financières.",
        visionLink: "Complète le diagnostic avec un suivi continu.",
      },
    ],
  },
  reporting: {
    intro:
      "Consolider, synchroniser et confronter le réel au plan — états financiers, écarts et rapports pour piloter mois après mois.",
    features: [
      {
        icon: RefreshCw,
        title: "Réel vs passé vs scénario et vs valeur",
        description:
          "Chaque écart se lit face au passé, au scénario modélisé et à la trajectoire de valeur — traduit en impact concret sur la trésorerie, ex. −80 k$ sur la valeur.",
        visionLink: "Confronte le réel au passé, au plan et à l'objectif — pas en pourcentages isolés.",
      },
      {
        icon: FileText,
        title: "États financiers et reporting",
        description:
          "Production instantanée de rapports conformes aux standards comptables, avec personnalisation et export facilité.",
        visionLink: "Structure le suivi mensuel et les revues de direction.",
      },
      {
        icon: LayoutDashboard,
        title: "Consolidation multi-entités",
        description:
          "Tableau de bord unifié — entités, divisions et sous-divisions — pour une vision groupe instantanée et comparable.",
        visionLink: "Offre une base commune pour reporter l'ensemble du groupe.",
      },
      {
        icon: FileSpreadsheet,
        title: "Élimination intercos",
        description:
          "Règles structurées et contrôles automatiques pour fiabiliser les écritures de consolidation et accélérer les clôtures.",
        visionLink: "Fiabilise les chiffres sur lesquels reposent vos rapports.",
      },
      {
        icon: Clock,
        title: "Synchronisation comptable",
        description:
          "Données actualisées depuis votre logiciel comptable — fini les décisions sur des chiffres obsolètes ou recomposés à la main.",
        visionLink: "Alimente le reporting avec des données fiables et à jour.",
      },
    ],
  },
  documentation: {
    intro:
      "Traçabilité, pièces justificatives et collaboration — pour des décisions documentées, partagées et défendables auprès de vos partenaires.",
    features: [
      {
        icon: MessageSquare,
        title: "Notes sur les écarts",
        description:
          "Documentez les causes directement sur les écarts, conservez l'historique et facilitez les revues mensuelles ou trimestrielles.",
        visionLink: "Capitalise sur ce qui a été appris au fil du parcours.",
      },
      {
        icon: FileSpreadsheet,
        title: "Dépôt de documents par GL",
        description:
          "Pièces justificatives centralisées et liées aux bons comptes pour accélérer la revue et la clôture annuelle.",
        visionLink: "Renforce la traçabilité des ajustements et des clôtures.",
      },
      {
        icon: UserCog,
        title: "Traçabilité des modifications",
        description:
          "Journal des mises à jour — qui, quand, quoi — pour une gouvernance transparente et des contrôles internes solides.",
        visionLink: "Assure la continuité et la confiance dans le plan vivant.",
      },
      {
        icon: Users,
        title: "Collaboration comptable et bancaire",
        description:
          "Espace partagé et informations financières structurées pour fluidifier les échanges avec votre comptable et votre banque.",
        visionLink: "Aligne les partenaires autour de chiffres défendables.",
      },
    ],
  },
}

export function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const carouselViewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryId>("valorisation")
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [slidesPerView, setSlidesPerView] = useState(1)
  const [autoRotate, setAutoRotate] = useState(true)

  const active = categoryContent[activeCategory]
  const totalFeatures = active.features.length
  const maxIndex = Math.max(0, totalFeatures - slidesPerView)
  const slideStepPx = viewportWidth > 0 && slidesPerView > 0 ? viewportWidth / slidesPerView : 0

  const selectCategory = (id: CategoryId, options?: { updateHash?: boolean }) => {
    setActiveCategory(id)
    setAutoRotate(false)
    if (options?.updateHash !== false && typeof window !== "undefined" && window.location.pathname === "/") {
      const hash = getFeatureCategoryHash(id)
      if (window.location.hash !== `#${hash}`) {
        window.history.replaceState(null, "", `/#${hash}`)
      }
    }
  }

  useEffect(() => {
    const applyCategory = (id: CategoryId) => {
      setActiveCategory(id)
      setAutoRotate(false)
    }

    const onNavigate = (event: Event) => {
      const { categoryId } = (event as CustomEvent<{ categoryId: CategoryId }>).detail
      applyCategory(categoryId)
    }

    const onHashChange = () => {
      const categoryId = parseFeatureCategoryFromHash(window.location.hash)
      if (categoryId) applyCategory(categoryId)
    }

    onHashChange()
    window.addEventListener(FEATURE_CATEGORY_NAVIGATE_EVENT, onNavigate)
    window.addEventListener("hashchange", onHashChange)
    return () => {
      window.removeEventListener(FEATURE_CATEGORY_NAVIGATE_EVENT, onNavigate)
      window.removeEventListener("hashchange", onHashChange)
    }
  }, [])

  useEffect(() => {
    const mqLg = window.matchMedia("(min-width: 1024px)")
    const mqSm = window.matchMedia("(min-width: 640px)")
    const updateSlides = () => {
      if (mqLg.matches) setSlidesPerView(3)
      else if (mqSm.matches) setSlidesPerView(2)
      else setSlidesPerView(1)
    }
    updateSlides()
    mqLg.addEventListener("change", updateSlides)
    mqSm.addEventListener("change", updateSlides)
    return () => {
      mqLg.removeEventListener("change", updateSlides)
      mqSm.removeEventListener("change", updateSlides)
    }
  }, [])

  useLayoutEffect(() => {
    const el = carouselViewportRef.current
    if (!el) return
    const apply = (w: number) => {
      if (w > 0) setViewportWidth(w)
    }
    apply(el.getBoundingClientRect().width)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w != null) apply(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [activeCategory, slidesPerView])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
    )
    const el = sectionRef.current
    if (el) observer.observe(el)
    return () => {
      if (el) observer.unobserve(el)
    }
  }, [])

  useEffect(() => {
    setCarouselIndex(0)
  }, [activeCategory])

  useEffect(() => {
    setCarouselIndex((prev) => Math.min(prev, Math.max(0, totalFeatures - slidesPerView)))
  }, [slidesPerView, totalFeatures])

  useEffect(() => {
    if (!autoRotate) return
    const interval = window.setInterval(() => {
      setActiveCategory((current) => {
        const idx = CATEGORY_ORDER.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % CATEGORY_ORDER.length
        return CATEGORY_ORDER[nextIdx]
      })
    }, 12000)
    return () => window.clearInterval(interval)
  }, [autoRotate])

  return (
    <section
      id="problem-solution"
      ref={sectionRef}
      className="relative scroll-mt-24 z-10 overflow-hidden bg-[#F8FAFC] py-16 sm:py-24 lg:py-28"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#F8FAFC] via-slate-50/95 to-slate-100/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_45%_at_50%_-15%,rgba(224,116,45,0.045),transparent_55%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(148 163 184 / 0.08) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(148 163 184 / 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
        {/* En-tête */}
        <div
          className={`mb-10 transition-all duration-1000 sm:mb-12 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Fonctionnalités</p>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-[#2A2F3A] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Les fonctionnalités Modelisys au service de{" "}
            <span className="text-[#5C5F66]">votre trajectoire de valeur</span>
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#5C5F66] sm:text-lg">
            Les modules sont regroupés par usage — valorisation, projections, analyse, reporting et documentation —
            plutôt que par phase, car plusieurs s&apos;inscrivent à différents moments de votre trajectoire de valeur.
          </p>
        </div>

        {/* Contexte de catégorie + sélecteur */}
        <div
          className={`mb-8 transition-all duration-1000 delay-100 lg:mb-10 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="min-w-0 max-w-3xl" aria-live="polite">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E0742D]/90">
              {categoryLabels[activeCategory]}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#5C5F66] sm:text-[15px]">{active.intro}</p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-3">
              <div
                role="tablist"
                aria-label="Catégories de fonctionnalités"
                className="flex flex-wrap gap-1.5 sm:gap-2"
              >
                {CATEGORY_ORDER.map((id) => {
                  const isActive = activeCategory === id
                  return (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => selectCategory(id)}
                      className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition sm:px-3 ${
                        isActive
                          ? "border-[#E0742D]/45 bg-white shadow-sm ring-1 ring-[#E0742D]/18"
                          : "border-slate-200/85 bg-white/70 hover:border-slate-300/90 hover:bg-white"
                      }`}
                    >
                      <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
                        <span
                          className={`absolute h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#E0742D]" : "bg-slate-400"}`}
                        />
                        <span className="absolute h-4 w-4 rounded-full border border-slate-200/90" />
                      </span>
                      <span
                        className={`text-[11px] font-medium tracking-wide ${isActive ? "text-[#2A2F3A]" : "text-slate-600"}`}
                      >
                        {categoryLabels[id]}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={carouselIndex === 0}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/90 bg-white/95 transition ${
                    carouselIndex === 0 ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-slate-50"
                  }`}
                  aria-label="Fonctionnalité précédente"
                >
                  <ChevronLeft className="h-5 w-5 text-[#2A2F3A]" />
                </button>
                <button
                  type="button"
                  onClick={() => setCarouselIndex((prev) => Math.min(prev + 1, maxIndex))}
                  disabled={carouselIndex >= maxIndex}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/90 bg-white/95 transition ${
                    carouselIndex >= maxIndex ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-slate-50"
                  }`}
                  aria-label="Fonctionnalité suivante"
                >
                  <ChevronRight className="h-5 w-5 text-[#2A2F3A]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Carrousel de fonctionnalités */}
        <div className="relative -mx-5 px-5 sm:-mx-10 sm:px-10 lg:-mx-14 lg:px-14 xl:-mx-20 xl:px-20">
          <div ref={carouselViewportRef} className="overflow-hidden">
            <div
              ref={carouselRef}
              className={`flex transition-transform duration-700 ease-out ${isVisible ? "opacity-100" : "opacity-0"}`}
              style={{
                transform: slideStepPx > 0 ? `translateX(-${carouselIndex * slideStepPx}px)` : undefined,
              }}
            >
              {active.features.map((feature, index) => {
                const Icon = feature.icon
                const isHovered = hoveredFeature === index

                return (
                  <div
                    key={`${activeCategory}-${feature.title}`}
                    onMouseEnter={() => setHoveredFeature(index)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    className="box-border flex-shrink-0 px-3 py-2"
                    style={
                      slideStepPx > 0 ? { width: slideStepPx, minWidth: slideStepPx } : { minWidth: "100%" }
                    }
                  >
                    <div
                      className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-slate-900/[0.07] ${
                        isHovered ? "scale-[1.015] shadow-2xl ring-slate-300/80" : ""
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />

                      <div className="relative flex flex-1 flex-col px-5 py-6 sm:px-6">
                        <div className="mb-4 text-center">
                          <p className="text-xs font-semibold tracking-wide text-slate-600">Fonctionnalité</p>
                          <p className="mt-1 text-[10px] tracking-wide text-[#E0742D]/90">
                            {categoryLabels[activeCategory]}
                          </p>
                        </div>

                        <div className="mb-4 flex gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-black transition-transform duration-300 ${
                              isHovered ? "scale-105" : ""
                            }`}
                          >
                            <Icon className="h-5 w-5" strokeWidth={1.75} />
                          </div>
                          <h3 className="text-lg font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-xl">
                            {feature.title}
                          </h3>
                        </div>

                        <p className="mb-4 flex-1 text-sm leading-relaxed text-[#5C5F66]">{feature.description}</p>

                        <div
                          className={`mt-auto hidden rounded-2xl border border-slate-200/90 bg-slate-50/95 p-4 transition-colors duration-300 lg:block ${
                            isHovered ? "border-slate-300/90 bg-slate-50" : ""
                          }`}
                        >
                          <div className="relative">
                            <div className="pointer-events-none absolute bottom-2 left-[18px] top-2 w-px bg-gradient-to-b from-slate-300/90 via-[#E0742D]/30 to-[#E0742D]/50" />
                            <div className="flex items-start gap-2.5 pl-7">
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#E0742D]" strokeWidth={2} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                  Lien avec l&apos;approche Modelisys
                                </p>
                                <p className="mt-1.5 text-xs leading-relaxed text-[#4A4F5C]">{feature.visionLink}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
                          <button
                            type="button"
                            onClick={() => scrollToApprocheSection()}
                            className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors ${
                              isHovered ? "text-[#2A2F3A]" : "text-[#5C5F66] hover:text-[#E0742D]"
                            }`}
                          >
                            Explorer l&apos;approche
                            <ArrowRight
                              className={`h-3.5 w-3.5 text-[#E0742D] transition-transform ${isHovered ? "translate-x-1" : ""}`}
                            />
                          </button>
                          <a
                            href="#demo"
                            className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 transition hover:text-[#E0742D]"
                          >
                            Démo
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Pied de section */}
        <div
          className={`mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 transition-all duration-1000 delay-200 sm:mt-12 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={() => scrollToApprocheSection()}
            className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-wide text-[#2A2F3A] transition hover:text-[#E0742D]"
          >
            VOIR L&apos;APPROCHE MODELISYS
            <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
          </button>
          <span className="hidden h-px w-10 bg-slate-300/60 sm:block" aria-hidden />
          <button
            type="button"
            onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-500 transition hover:text-[#2A2F3A]"
          >
            RÉSERVER UNE DÉMO
            <span className="inline-block h-px w-8 bg-[#E0742D]/70" />
          </button>
        </div>
      </div>
    </section>
  )
}
