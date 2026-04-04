"use client"

import { useEffect, useRef, useState } from "react"
import {
  Clock,
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  DollarSign,
  Calendar,
  Building2,
  BarChart3,
  Briefcase,
  FileText,
  AlertTriangle,
  MessageSquare,
  UserCog,
  History,
  PieChart,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Presentation,
} from "lucide-react"

interface Challenge {
  icon: any
  title: string
  description: string
  solution: string
}

interface Category {
  id: string
  name: string
  challenges: Challenge[]
}

export function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("consolidation")
  const [hoveredChallenge, setHoveredChallenge] = useState<number | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
      },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  /** Aligné sur la liste « Fonctionnalités » du hero (même ordre). Cartes réorganisées par thème. */
  const categories: Category[] = [
    {
      id: "consolidation",
      name: "Consolidation",
      challenges: [
        {
          icon: LayoutDashboard,
          title: "Manque de vision consolidée",
          description:
            "Absence de consolidation multi-entités en temps réel, rendant difficile la gestion globale du groupe et l'analyse comparative.",
          solution:
            "Tableau de bord unifié consolidant automatiquement toutes vos entités, divisions et sous-divisions pour une vision globale instantanée.",
        },
        {
          icon: FileSpreadsheet,
          title: "Élimination intercos complexe",
          description:
            "Les opérations intercompagnies sont difficiles à repérer et à éliminer de façon fiable, ce qui peut fausser les résultats consolidés.",
          solution:
            "Règles d'élimination intercos structurées avec contrôles automatiques pour fiabiliser les écritures de consolidation et accélérer les clôtures.",
        },
        {
          icon: BarChart3,
          title: "Prise en compte des taux de change insuffisante",
          description:
            "La conversion multi-devises est souvent manuelle et incohérente, créant des écarts de consolidation et des analyses moins fiables.",
          solution:
            "Gestion des taux de change par période avec conversion automatisée et suivi des impacts pour une consolidation multi-devises cohérente.",
        },
      ],
    },
    {
      id: "reporting-financier",
      name: "Reporting financier",
      icon: Presentation,
      challenges: [
        {
          icon: Clock,
          title: "Informations financières trop tardives",
          description:
            "Décisions stratégiques prises sur des données comptables obsolètes, impactant la réactivité opérationnelle et la prise de décision.",
          solution:
            "Synchronisation automatique avec votre logiciel comptable pour des données financières actualisées en continu et accessibles en temps réel.",
        },
        {
          icon: FileText,
          title: "Perte de temps à produire des rapports",
          description:
            "Temps considérable consacré à la production manuelle de rapports financiers récurrents, réduisant le temps disponible pour l'analyse stratégique.",
          solution:
            "Production instantanée de rapports financiers conformes aux standards comptables (États financiers, analyses) avec personnalisation et export facilité.",
        },
        {
          icon: BarChart3,
          title: "Comparaisons historiques et budgétaires limitées",
          description:
            "Difficulté à comparer rapidement la performance actuelle avec les périodes passées ou le budget, ce qui ralentit l'interprétation des écarts.",
          solution:
            "Comparaison instantanée réel vs passé et réel vs budget avec visualisation des écarts pour accélérer l'analyse et la prise de décision.",
        },
        {
          icon: History,
          title: "Historique financier inexploitable",
          description:
            "Données historiques mal structurées, limitant les analyses comparatives et les tendances, réduisant la capacité d'apprentissage organisationnel.",
          solution:
            "Archivage automatique et structuré de vos données financières pour analyses comparatives et tendances avec visualisations temporelles détaillées.",
        },
      ],
    },
    {
      id: "analyse-financiere",
      name: "Analyse financière",
      challenges: [
        {
          icon: DollarSign,
          title: "Incapacité à mesurer la rentabilité",
          description:
            "Impossibilité d'identifier précisément les sources de profitabilité par division, produit ou client, limitant l'optimisation des performances.",
          solution:
            "Reconstruction automatique de la rentabilité par division, produit, client ou projet avec allocation précise des coûts et visualisation détaillée des marges.",
        },
        {
          icon: Calendar,
          title: "Manque de suivi des Capex",
          description:
            "Difficulté à planifier et prioriser les investissements, avec une visibilité limitée sur les impacts financiers à court et moyen terme.",
          solution:
            "Analyse dédiée des capex avec suivi des scénarios, impacts sur la trésorerie et priorisation des projets d'investissement.",
        },
        {
          icon: DollarSign,
          title: "Fonds de roulement mal maîtrisé",
          description:
            "Manque de suivi structuré des leviers du fonds de roulement (clients, fournisseurs, inventaires), ce qui réduit la liquidité disponible.",
          solution:
            "Module fonds de roulement pour suivre les cycles d'encaissement et de décaissement, et identifier les leviers d'optimisation.",
        },
        {
          icon: PieChart,
          title: "Ratios financiers non exploités",
          description:
            "Absence de lecture continue des ratios clés (liquidité, solvabilité, rentabilité), limitant l'anticipation des risques et la prise de décision.",
          solution:
            "Bibliothèque de ratios financiers avec suivi temporel, comparatifs et alertes pour orienter les décisions financières.",
        },
        {
          icon: FileSpreadsheet,
          title: "Dépendance aux fichiers Excel instables",
          description:
            "Risques d'erreurs, formules brisées et versions multiples compromettant l'intégrité des données financières et la fiabilité des analyses.",
          solution:
            "Remplacement d'Excel par une plateforme cloud sécurisée, éliminant les risques de perte de données et garantissant la cohérence des informations.",
        },
      ],
    },
    {
      id: "projections",
      name: "Projections",
      challenges: [
        {
          icon: Calendar,
          title: "Budget mensuel difficile à piloter",
          description:
            "Le suivi budgétaire mensuel est souvent manuel, dispersé et peu réactif, ce qui ralentit les ajustements en cours d'année.",
          solution:
            "Budget mensuel structuré avec suivi des écarts en continu pour ajuster rapidement vos actions opérationnelles.",
        },
        {
          icon: History,
          title: "Projections 2-5 ans limitées",
          description:
            "La planification à moyen terme manque de structure, rendant difficile l'anticipation des besoins financiers et des trajectoires de croissance.",
          solution:
            "Projections financières sur 2 à 5 ans avec hypothèses claires et vues synthétiques pour soutenir les décisions stratégiques.",
        },
        {
          icon: PieChart,
          title: "Création de scénarios possibles insuffisante",
          description:
            "L'absence de scénarios comparatifs limite la capacité à tester les impacts d'options stratégiques avant de prendre des décisions.",
          solution:
            "Création rapide de scénarios (prudent, réaliste, ambitieux) avec comparaison des impacts pour éclairer vos choix.",
        },
      ],
    },
    {
      id: "valorisation",
      name: "Valorisation",
      challenges: [
        {
          icon: Building2,
          title: "Manque de suivi de la valeur d'entreprise",
          description:
            "Absence de suivi continu de la valorisation et des multiples, impactant les décisions stratégiques et les opportunités de croissance.",
          solution:
            "Suivi en temps réel de la valeur d'entreprise avec calcul automatique des multiples et analyse des déterminants pour optimiser la valorisation.",
        },
        {
          icon: Briefcase,
          title: "Évaluation du modèle d'affaires insuffisante",
          description:
            "Le modèle d'affaires est rarement évalué de manière structurée, ce qui limite la compréhension des forces, faiblesses et axes d'amélioration.",
          solution:
            "Cadre d'évaluation du modèle d'affaires avec indicateurs clés et lecture synthétique pour guider les décisions de positionnement.",
        },
        {
          icon: BarChart3,
          title: "Leviers créant de la valeur peu identifiés",
          description:
            "Les principaux leviers de création de valeur ne sont pas clairement quantifiés, rendant difficile la priorisation des initiatives stratégiques.",
          solution:
            "Identification des leviers créant de la valeur avec scénarios comparatifs pour estimer les impacts et orienter les priorités.",
        },
      ],
    },
    {
      id: "documentation",
      name: "Documentation",
      challenges: [
        {
          icon: MessageSquare,
          title: "Possibilité de prendre des notes sur les écarts",
          description:
            "Les explications d'écarts sont souvent dispersées dans des courriels ou fichiers non centralisés, ce qui nuit au suivi et à la compréhension collective.",
          solution:
            "Ajout de notes directement sur les écarts pour documenter les causes, conserver l'historique et faciliter les revues mensuelles.",
        },
        {
          icon: FileSpreadsheet,
          title: "Dépôt des documents comptables par GL limité",
          description:
            "Le classement des pièces justificatives n'est pas toujours lié aux bons comptes GL, ce qui ralentit les validations et la clôture annuelle.",
          solution:
            "Dépôt des documents comptables par GL pour centraliser les preuves, accélérer la revue et faciliter la clôture annuelle.",
        },
        {
          icon: UserCog,
          title: "Traçabilité des mises à jour insuffisante",
          description:
            "Il est difficile de savoir qui a modifié quoi et quand, ce qui réduit la transparence et complique les contrôles internes.",
          solution:
            "Journal des modifications indiquant qui a effectué les dernières mises à jour et à quel moment, pour une traçabilité complète.",
        },
      ],
    },
    {
      id: "collaboration",
      name: "Collaboration",
      challenges: [
        {
          icon: Users,
          title: "Risque lié aux employés clés",
          description:
            "Concentration des connaissances financières sur une seule personne, créant un risque opérationnel et une dépendance critique pour l'organisation.",
          solution:
            "Processus financiers standardisés et documentés, garantissant la continuité opérationnelle et la transmission des connaissances au sein de l'équipe.",
        },
        {
          icon: MessageSquare,
          title: "Communication avec son comptable difficile",
          description:
            "Les échanges avec le cabinet comptable sont souvent fragmentés, ce qui ralentit le traitement des demandes et la validation des informations.",
          solution:
            "Espace partagé centralisant les échanges et documents avec votre comptable pour fluidifier la collaboration et réduire les délais.",
        },
        {
          icon: Building2,
          title: "Communication avec sa banque limitée",
          description:
            "Les informations financières demandées par la banque ne sont pas toujours prêtes ou bien structurées, ce qui peut nuire aux discussions de financement.",
          solution:
            "Production rapide d'informations financières claires et partageables pour améliorer les échanges avec votre institution bancaire.",
        },
        {
          icon: UserCog,
          title: "Suivi interne des modifications insuffisant",
          description:
            "L'équipe manque de visibilité sur les changements récents, ce qui complique les validations internes et le contrôle de qualité.",
          solution:
            "Historique des modifications avec utilisateur, date et détail des changements pour renforcer la coordination et la gouvernance interne.",
        },
      ],
    },
  ]

  const activeCategoryData = categories.find(cat => cat.id === activeCategory) || categories[0]
  const totalChallenges = activeCategoryData.challenges.length
  const maxIndex = Math.max(0, totalChallenges - 3)

  // Reset carousel index when category changes
  useEffect(() => {
    setCarouselIndex(0)
  }, [activeCategory])

  const nextCards = () => {
    setCarouselIndex((prev) => Math.min(prev + 1, maxIndex))
  }

  const prevCards = () => {
    setCarouselIndex((prev) => Math.max(prev - 1, 0))
  }

  return (
    <section
      id="problem-solution"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 overflow-hidden bg-slate-100/50 py-24 sm:py-32"
    >
      {/* Fond : dégradé + cadrillage léger + accents (sans split deux colonnes) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/80" />
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
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 42%, black 15%, transparent 72%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/30 via-transparent to-slate-100/35" />
        <div className="absolute left-1/2 top-1/2 h-[min(72vh,520px)] w-[min(92vw,880px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/20 blur-3xl" />
      </div>
      <div className="relative max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        {/* Header */}
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="mb-6">
            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Pourquoi</p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl mb-4 font-semibold leading-tight tracking-tight text-[#2A2F3A]">
                Les enjeux financiers du quotidien et ce que nous changeons concrètement
              </h2>
              <p className="text-lg sm:text-xl text-[#5C5F66] max-w-3xl leading-relaxed">
                Retards d&apos;information, silos de données et outils peu robustes freinent vos décisions. Modelisys
                centralise vos données et structure vos analyses pour vous rendre plus rapide, plus efficace et plus
                stratégique. Parce qu&apos;au bout de chaque décision financière, un seul enjeu compte : créer et
                maximiser la valeur de votre entreprise.
              </p>
              <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
            </div>
            {/* Choix en ligne horizontale — points + libellés (comme Fonctionnalités, sans icônes) */}
            <div className={`flex flex-col gap-4 transition-all duration-1000 delay-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <div className="min-w-0 flex-1 border-b border-slate-200/90 pb-3">
                <div
                  role="tablist"
                  aria-label="Thématiques"
                  className="flex flex-nowrap items-center gap-1 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
                >
                  {categories.map((category) => {
                    const isActive = activeCategory === category.id
                    return (
                      <button
                        key={category.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setActiveCategory(category.id)}
                        className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl border px-2 py-2 transition ${
                          isActive
                            ? "border-slate-300/90 bg-white shadow-sm"
                            : "border-transparent hover:bg-slate-100/90"
                        }`}
                      >
                        <span className="relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <span className="absolute inset-0 rounded-full border border-slate-200/90 bg-white/90" />
                          <span
                            className={`absolute left-1/2 top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                              isActive ? "bg-[#E0742D]" : "bg-slate-400"
                            }`}
                          />
                        </span>
                        <span
                          className={`whitespace-nowrap text-[11px] font-medium tracking-wide ${
                            isActive ? "text-[#2A2F3A]" : "text-slate-600"
                          }`}
                        >
                          {category.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* Navigation Arrows */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={prevCards}
                  disabled={carouselIndex === 0}
                  className={`
                    w-10 h-10 rounded-full border border-slate-300/90 bg-white/95
                    flex items-center justify-center
                    transition-all duration-200
                    ${carouselIndex === 0 
                      ? "opacity-40 cursor-not-allowed" 
                      : "hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                    }
                  `}
                  aria-label="Précédent"
                >
                  <ChevronLeft className="w-5 h-5 text-[#2A2F3A]" />
                </button>
                <button
                  onClick={nextCards}
                  disabled={carouselIndex >= maxIndex}
                  className={`
                    w-10 h-10 rounded-full border border-slate-300/90 bg-white/95
                    flex items-center justify-center
                    transition-all duration-200
                    ${carouselIndex >= maxIndex 
                      ? "opacity-40 cursor-not-allowed" 
                      : "hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                    }
                  `}
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-5 h-5 text-[#2A2F3A]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Container - Full Width */}
        <div className="relative -mx-8 sm:-mx-12 lg:-mx-16 xl:-mx-20">
          <div 
            ref={carouselRef}
            className="overflow-hidden py-2"
          >
            <div
              className={`
                flex transition-transform duration-700 ease-out
                ${isVisible ? "opacity-100" : "opacity-0"}
                pl-8 sm:pl-12 lg:pl-16 xl:pl-20 pr-8 sm:pr-12 lg:pr-16 xl:pr-20
              `}
              style={{
                transform: `translateX(-${carouselIndex * (100 / 3)}%)`
              }}
            >
              {activeCategoryData.challenges.map((challenge, index) => {
                const Icon = challenge.icon
                const isHovered = hoveredChallenge === index

                return (
                  <div
                    key={`${activeCategory}-${challenge.title}`}
                    onMouseEnter={() => setHoveredChallenge(index)}
                    onMouseLeave={() => setHoveredChallenge(null)}
                    className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 px-3 py-2"
                  >
                    {/* Carte — présentation proche de « Profils » (en-tête centré, panneau intérieur, tons clairs) */}
                    <div
                      className={`
                        relative flex h-full flex-col overflow-hidden
                        rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50
                        shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/70
                        transition-all duration-500 ease-out
                        hover:shadow-xl hover:shadow-slate-900/[0.07]
                        ${isHovered ? "scale-[1.015] shadow-2xl ring-slate-300/80" : ""}
                      `}
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />

                      <div className="relative flex flex-1 flex-col px-5 py-6 sm:px-6">
                        {/* Bloc titre type « Profils / sous-ligne » */}
                        <div className="mb-4 text-center">
                          <p className="text-xs font-semibold tracking-wide text-slate-600">Enjeu</p>
                          <p className="mt-1 text-[10px] tracking-wide text-slate-500">
                            {activeCategoryData.name}
                          </p>
                        </div>

                        <div className="mb-4 flex gap-3">
                          <div
                            className={`
                            flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100
                            text-black transition-transform duration-300
                            ${isHovered ? "scale-105" : ""}
                          `}
                          >
                            <Icon className="h-5 w-5" strokeWidth={1.75} />
                          </div>
                          <h3 className="text-lg font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-xl">
                            {challenge.title}
                          </h3>
                        </div>

                        <p className="mb-5 flex-1 text-sm leading-relaxed text-[#5C5F66]">
                          {challenge.description}
                        </p>

                        {/* Panneau intérieur (équivalent liste Profils) */}
                        <div
                          className={`
                          mt-auto rounded-2xl border border-slate-200/90 bg-slate-50/95 p-4
                          transition-colors duration-300
                          ${isHovered ? "border-slate-300/90 bg-slate-50" : ""}
                        `}
                        >
                          <div className="relative">
                            <div className="pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-300/90 via-slate-200/60 to-[#E0742D]/40" />
                            <div className="flex items-start gap-2.5 pl-7">
                              <div className="flex flex-shrink-0 text-[#E0742D]">
                                <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold text-[#2A2F3A]">Notre solution</span>
                                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#2A2F3A] ring-1 ring-slate-200/90">
                                    Modelisys
                                  </span>
                                </div>
                                <p className="text-xs leading-relaxed text-[#4A4F5C]">{challenge.solution}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-slate-200/80 pt-3">
                          <a
                            href="#demo"
                            className={`
                            inline-flex items-center gap-2 text-xs font-semibold transition-colors duration-300
                            ${isHovered ? "text-[#2A2F3A]" : "text-[#5C5F66] hover:text-[#E0742D]"}
                          `}
                          >
                            Découvrir Modelisys en action
                            <ArrowRight
                              className={`h-3.5 w-3.5 text-[#E0742D] transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`}
                            />
                          </a>
                        </div>
                      </div>

                      <div className="pointer-events-none absolute inset-0 opacity-[0.03]">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(42 47 58) 1px, transparent 0)`,
                            backgroundSize: "24px 24px",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
