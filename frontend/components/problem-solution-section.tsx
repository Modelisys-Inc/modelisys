"use client"

import { useEffect, useRef, useState } from "react"
import { 
  Clock, LayoutDashboard, FileSpreadsheet, Users, DollarSign, Calendar, 
  Building2, BarChart3, Briefcase, FileText, AlertTriangle, MessageSquare, 
  UserCog, History, PieChart, CheckCircle2, ArrowRight, TrendingUp, 
  Zap, Target, Shield, Sparkles, ChevronLeft, ChevronRight
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
  icon: any
  challenges: Challenge[]
}

export function ProblemSolutionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("operations")
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

  const categories: Category[] = [
    {
      id: "operations",
      name: "Opérations",
      icon: Zap,
      challenges: [
        {
          icon: Clock,
          title: "Informations financières trop tardives",
          description: "Décisions stratégiques prises sur des données comptables obsolètes, impactant la réactivité opérationnelle et la prise de décision.",
          solution: "Synchronisation automatique avec votre logiciel comptable pour des données financières actualisées en continu et accessibles en temps réel."
        },
        {
          icon: LayoutDashboard,
          title: "Manque de vision consolidée",
          description: "Absence de consolidation multi-entités en temps réel, rendant difficile la gestion globale du groupe et l'analyse comparative.",
          solution: "Tableau de bord unifié consolidant automatiquement toutes vos entités, divisions et sous-divisions pour une vision globale instantanée."
        },
        {
          icon: FileSpreadsheet,
          title: "Dépendance aux fichiers Excel instables",
          description: "Risques d'erreurs, formules brisées et versions multiples compromettant l'intégrité des données financières et la fiabilité des analyses.",
          solution: "Remplacement d'Excel par une plateforme cloud sécurisée, éliminant les risques de perte de données et garantissant la cohérence des informations."
        },
        {
          icon: Users,
          title: "Risque lié aux employés clés",
          description: "Concentration des connaissances financières sur une seule personne, créant un risque opérationnel et une dépendance critique pour l'organisation.",
          solution: "Processus financiers standardisés et documentés, garantissant la continuité opérationnelle et la transmission des connaissances au sein de l'équipe."
        },
      ]
    },
    {
      id: "profitability",
      name: "Rentabilité",
      icon: TrendingUp,
      challenges: [
        {
          icon: DollarSign,
          title: "Incapacité à mesurer la rentabilité",
          description: "Impossibilité d'identifier précisément les sources de profitabilité par division, produit ou client, limitant l'optimisation des performances.",
          solution: "Reconstruction automatique de la rentabilité par division, produit, client ou projet avec allocation précise des coûts et visualisation détaillée des marges."
        },
        {
          icon: BarChart3,
          title: "Indicateurs clés absents ou peu fiables",
          description: "KPI financiers non standardisés ou calculés manuellement, réduisant la fiabilité des analyses et la qualité des décisions stratégiques.",
          solution: "Bibliothèque complète d'indicateurs financiers standards (ratios, marges, cycles) calculés automatiquement et mis à jour en temps réel."
        },
        {
          icon: PieChart,
          title: "Absence d'analyses financières avancées",
          description: "Manque d'analyses approfondies du fonds de roulement, des capex et des flux de trésorerie, limitant la compréhension de la santé financière.",
          solution: "Modules dédiés pour le fonds de roulement, les capex, les flux de trésorerie et les ratios financiers avec analyses prédictives et recommandations."
        },
      ]
    },
    {
      id: "planning",
      name: "Planification",
      icon: Target,
      challenges: [
        {
          icon: Calendar,
          title: "Budgets et prévisions rudimentaires",
          description: "Processus de budgétisation manuel et fragile, limitant la capacité de projection stratégique et la réactivité face aux changements.",
          solution: "Prévisions multi-scénarios basées sur vos moteurs de revenus réels avec ajustements dynamiques et alertes automatiques sur les écarts significatifs."
        },
        {
          icon: Building2,
          title: "Manque de suivi de la valeur d'entreprise",
          description: "Absence de suivi continu de la valorisation et des multiples, impactant les décisions stratégiques et les opportunités de croissance.",
          solution: "Suivi en temps réel de la valeur d'entreprise avec calcul automatique des multiples et analyse des déterminants pour optimiser la valorisation."
        },
        {
          icon: History,
          title: "Historique financier inexploitable",
          description: "Données historiques mal structurées, limitant les analyses comparatives et les tendances, réduisant la capacité d'apprentissage organisationnel.",
          solution: "Archivage automatique et structuré de vos données financières pour analyses comparatives et tendances avec visualisations temporelles détaillées."
        },
      ]
    },
    {
      id: "efficiency",
      name: "Efficacité",
      icon: Sparkles,
      challenges: [
        {
          icon: Briefcase,
          title: "Dépendance excessive aux consultants",
          description: "Coûts récurrents élevés pour des analyses financières qui pourraient être automatisées, impactant négativement la rentabilité de l'entreprise.",
          solution: "Réduction significative des coûts d'analyse grâce à l'automatisation des calculs et rapports financiers, tout en maintenant une qualité professionnelle élevée."
        },
        {
          icon: FileText,
          title: "Perte de temps à produire des rapports",
          description: "Temps considérable consacré à la production manuelle de rapports financiers récurrents, réduisant le temps disponible pour l'analyse stratégique.",
          solution: "Production instantanée de rapports financiers conformes aux standards comptables (États financiers, analyses) avec personnalisation et export facilité."
        },
        {
          icon: AlertTriangle,
          title: "Détection tardive des anomalies",
          description: "Identification tardive des écarts budgétaires et anomalies financières, limitant la réactivité et augmentant les risques opérationnels.",
          solution: "Système d'alertes automatiques pour identifier immédiatement les écarts budgétaires et anomalies avec notifications personnalisables et priorités."
        },
        {
          icon: MessageSquare,
          title: "Communication difficile avec le cabinet comptable",
          description: "Échanges de documents multiples et risques d'erreurs dans la transmission d'informations financières, compliquant la collaboration efficace.",
          solution: "Espace de travail partagé permettant la collaboration en temps réel avec votre cabinet comptable, avec accès sécurisé et traçabilité complète."
        },
        {
          icon: UserCog,
          title: "Manque de ressources pour un CFO analytique",
          description: "Coût prohibitif d'un CFO expérimenté pour les PME, limitant l'accès à l'expertise financière avancée et aux analyses stratégiques approfondies.",
          solution: "Accès à des fonctionnalités d'analyse financière avancée à une fraction du coût d'un CFO à temps plein, avec support et formation inclus."
        },
      ]
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

  // Get color for category - Professional colors
  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case "operations":
        return "bg-blue-600"
      case "profitability":
        return "bg-emerald-600"
      case "planning":
        return "bg-indigo-600"
      case "efficiency":
        return "bg-slate-700"
      default:
        return "bg-slate-600"
    }
  }

  return (
    <section id="problem-solution" ref={sectionRef} className="py-24 sm:py-32 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      {/* Subtle Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl"></div>
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
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
                Modelisys s'adresse aux entreprises concernées par l'un de ces{" "}
                <span className="text-slate-600">enjeux</span>.
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
                Notre plateforme est conçue spécifiquement pour les PME qui reconnaissent ces enjeux financiers. Si vous ne vous identifiez à aucun d'entre eux, Modelisys n'est probablement pas la solution qu'il vous faut.
              </p>
            </div>
            {/* Category Tabs - Below Title and Description */}
            <div className={`flex items-center justify-between gap-4 transition-all duration-1000 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}>
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {categories.map((category) => {
                  const Icon = category.icon
                  const isActive = activeCategory === category.id
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`
                        group relative px-4 py-2 rounded-lg font-medium text-sm
                        transition-all duration-300 ease-out
                        ${
                          isActive
                            ? "bg-slate-900 text-white shadow-lg"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-3.5 h-3.5 transition-transform duration-300 ${
                          isActive ? "scale-110" : "group-hover:scale-110"
                        }`} />
                        <span>{category.name}</span>
                      </div>
                      {isActive && (
                        <div className="absolute inset-0 rounded-lg bg-slate-900 -z-10 blur-sm opacity-50"></div>
                      )}
                    </button>
                  )
                })}
              </div>
              {/* Navigation Arrows */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={prevCards}
                  disabled={carouselIndex === 0}
                  className={`
                    w-10 h-10 rounded-full border border-slate-300 bg-white
                    flex items-center justify-center
                    transition-all duration-200
                    ${carouselIndex === 0 
                      ? "opacity-40 cursor-not-allowed" 
                      : "hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                    }
                  `}
                  aria-label="Précédent"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button
                  onClick={nextCards}
                  disabled={carouselIndex >= maxIndex}
                  className={`
                    w-10 h-10 rounded-full border border-slate-300 bg-white
                    flex items-center justify-center
                    transition-all duration-200
                    ${carouselIndex >= maxIndex 
                      ? "opacity-40 cursor-not-allowed" 
                      : "hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                    }
                  `}
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-5 h-5 text-slate-700" />
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
                    key={index}
                    onMouseEnter={() => setHoveredChallenge(index)}
                    onMouseLeave={() => setHoveredChallenge(null)}
                    className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 px-3 py-2"
                  >
                    {/* Card - Professional Style */}
                    <div
                      className={`
                        relative h-full flex flex-col
                        bg-gradient-to-br from-white to-slate-50
                        rounded-2xl border-2 border-slate-200
                        shadow-sm hover:shadow-xl
                        transition-all duration-500 ease-out
                        overflow-hidden
                        ${
                          isHovered
                            ? "scale-[1.015] border-slate-400 shadow-2xl"
                            : "hover:border-slate-300"
                        }
                      `}
                    >
                      {/* Card Content */}
                      <div className="p-6 flex-1 flex flex-col">
                        {/* Icon */}
                        <div className={`
                          w-12 h-12 rounded-xl mb-4 flex items-center justify-center
                          transition-all duration-300
                          ${
                            isHovered
                              ? "bg-slate-900 text-white scale-110"
                              : "bg-slate-100 text-slate-700"
                          }
                        `}>
                          <Icon className="w-6 h-6" />
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight tracking-tight">
                          {challenge.title}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
                          {challenge.description}
                        </p>

                        {/* Solution Section */}
                        <div className={`
                          mt-auto pt-4 border-t border-slate-200
                          transition-all duration-300
                          ${isHovered ? "border-slate-300" : ""}
                        `}>
                          <div className="flex items-start gap-2.5 mb-2">
                            <div className={`
                              w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0
                              transition-all duration-300
                              ${isHovered ? "bg-emerald-500" : "bg-emerald-100"}
                            `}>
                              <CheckCircle2 className={`w-3.5 h-3.5 ${isHovered ? "text-white" : "text-emerald-600"}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs font-semibold text-slate-900">Notre solution</span>
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Modelisys
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">
                                {challenge.solution}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* CTA Link */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <a
                            href="#demo"
                            className={`
                              text-xs font-semibold inline-flex items-center gap-2
                              transition-all duration-300
                              ${isHovered 
                                ? "text-slate-900" 
                                : "text-slate-600 hover:text-slate-900"
                              }
                            `}
                          >
                            Découvrir Modelisys en action
                            <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`} />
                          </a>
                        </div>
                      </div>

                      {/* Subtle Background Pattern */}
                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                        <div className="absolute inset-0" style={{
                          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(15 23 42) 1px, transparent 0)`,
                          backgroundSize: '24px 24px'
                        }}></div>
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
