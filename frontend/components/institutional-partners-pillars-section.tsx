"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Brain,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  FileStack,
  Landmark,
  Layers,
  Lightbulb,
  LineChart,
  Link2,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react"
import Link from "next/link"

type IconComponent = ComponentType<{ className?: string }>

interface Challenge {
  icon: IconComponent
  title: string
  description: string
  solution: string
}

interface Category {
  id: string
  name: string
  icon: IconComponent
  challenges: Challenge[]
}

export function InstitutionalPartnersPillarsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("diligence")
  const [hoveredChallenge, setHoveredChallenge] = useState<number | null>(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

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

    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  const categories: Category[] = [
    {
      id: "diligence",
      name: "Analyse & diligence",
      icon: ShieldCheck,
      challenges: [
        {
          icon: FileStack,
          title: "Vision consolidée pour vos revues et comités",
          description:
            "États, ratios, fonds de roulement, capex et historiques : vos équipes accèdent à la même base que la PME, pour cadrer les questions et accélérer les analyses en amont d'une décision de financement, de garantie ou de mandat d'accompagnement.",
          solution:
            "Réduisez les allers-retours documentaires : tout est structuré dans Modelisys, avec une lecture par période et par entité lorsque le dossier est un groupe.",
        },
        {
          icon: ClipboardList,
          title: "Notes sur les écarts et traçabilité",
          description:
            "Les explications produites par la PME sur les écarts (hypothèses, impacts) sont disponibles dans le flux : utile pour documenter vos revues internes, vos engagements et vos échanges avec le dirigeant.",
          solution:
            "Capitalisez sur une piste claire entre chiffres, commentaires et pièces — sans reconstituer le dossier dans des fichiers séparés.",
        },
        {
          icon: Scale,
          title: "Pièces et preuves au bon niveau",
          description:
            "Pièces associées au compte et à la période concernés : vos équipes retrouvent plus vite les éléments attendus dans vos grilles d'analyse et vos contrôles.",
          solution:
            "Renforcez la qualité du dossier et la rapidité des contrôles, avec une organisation alignée sur la comptabilité.",
        },
        {
          icon: BadgeCheck,
          title: "Comparables et références internes",
          description:
            "Lorsque vous disposez de plusieurs dossiers, vous pouvez mettre en perspective la performance et la structure financière du client par rapport à des références internes — pour appuyer un dialogue factuel et vos critères d'appétence.",
          solution:
            "Appuyez vos recommandations et vos conditions sur des comparables cohérents, exportables pour vos livrables et instances.",
        },
      ],
    },
    {
      id: "credit",
      name: "Crédit & surveillance",
      icon: Landmark,
      challenges: [
        {
          icon: LineChart,
          title: "Suivi des indicateurs et du budget",
          description:
            "Accès aux états réels, aux budgets et aux écarts commentés : utile pour le suivi d'engagements, le dialogue avec le client et la préparation des revues périodiques (banque, organisme, garantisseur).",
          solution:
            "Alignez le suivi sur des données à jour, avec un historique consultable pour anticiper les tensions de trésorerie ou de structure.",
        },
        {
          icon: Lightbulb,
          title: "Scénarios et sensibilités",
          description:
            "Construisez des projections et des scénarios (croissance, financement, choc de marché) à partir des données consolidées — pour tester des hypothèses avant de formaliser une proposition ou un avenant.",
          solution:
            "Itérez plus vite entre plusieurs cas et comparez l'impact sur les indicateurs clés présentés à la PME.",
        },
        {
          icon: Target,
          title: "Lecture groupe et périmètre multi-entités",
          description:
            "Pour un client qui détient plusieurs sociétés : consolidation rapide des signaux par entité et au niveau groupe — pertinent pour la structuration du risque et le pilotage du portefeuille.",
          solution:
            "Gagnez en clarté sur les interdépendances entre entités sans multiplier les extractions manuelles.",
        },
        {
          icon: Users,
          title: "Coordination réseau, risque et client",
          description:
            "Un espace partagé avec la PME pour les échanges et les documents : moins d'opacité entre relationship manager, risque et client, plus de cohérence dans les messages et les décisions.",
          solution:
            "Facilitez l'alignement interne et externe autour d'une vision financière unique.",
        },
      ],
    },
    {
      id: "investissement",
      name: "Investissement & valorisation",
      icon: Briefcase,
      challenges: [
        {
          icon: LineChart,
          title: "Valorisation et suivi dans le temps",
          description:
            "Hypothèses, paramètres et analyses de valeur peuvent être suivis dans le temps sur les données du dossier — utile pour les sociétés de gestion, les fonds, les participations stratégiques ou les mandats d'évaluation.",
          solution:
            "Documentez l'évolution de la valeur et des leviers d'amélioration d'un cycle à l'autre, sur une base commune avec la PME.",
        },
        {
          icon: Layers,
          title: "Portefeuille et reporting",
          description:
            "Indicateurs, historiques et vues consolidées utiles au pilotage : préparation de synthèses pour comités d'investissement, instances internes ou reporting vers vos contreparties.",
          solution:
            "Réduisez le temps passé à compiler des extraits disparates pour produire des vues cohérentes.",
        },
        {
          icon: Link2,
          title: "Alignement avec la réalité opérationnelle",
          description:
            "Les analyses s'appuient sur la comptabilité et les états réellement dans Modelisys : moins d'écart entre les modèles internes et les chiffres vécus par la PME.",
          solution:
            "Renforcez la crédibilité des échanges et des plans d'action avec le management.",
        },
        {
          icon: FileStack,
          title: "Exports pour vos processus internes",
          description:
            "Exportez données et indicateurs pour alimenter vos modèles, vos mémos et vos livrables — sans ressaisie inutile depuis des fichiers éparpillés.",
          solution:
            "Gagnez en efficacité sur la production documentaire tout en gardant le lien avec la source.",
        },
      ],
    },
    {
      id: "donnees",
      name: "Données & IA",
      icon: Sparkles,
      challenges: [
        {
          icon: Brain,
          title: "IA sur la donnée structurée du client",
          description:
            "L'assistance intelligente s'appuie sur les états, l'historique et les indicateurs déjà dans Modelisys — pour proposer pistes, synthèses et angles d'analyse cohérents avec le dossier réel, dans le respect de vos cadres d'usage.",
          solution:
            "Priorisez les sujets à creuser tout en gardant la validation et la responsabilité du jugement professionnel.",
        },
        {
          icon: Zap,
          title: "Détection de motifs et d'écarts",
          description:
            "Croisement des comptes, périodes et entités : l'IA aide à faire remonter ruptures et incohérences à investiguer — sans remplacer la revue humaine ni les politiques internes de l'institution.",
          solution:
            "Optimisez le temps d'analyste sur les zones à risque plutôt que sur la compilation.",
        },
        {
          icon: Bot,
          title: "Une seule source de vérité",
          description:
            "Balance, états, notes et documentation convergent dans la plateforme : l'IA ne « invente » pas hors contexte — elle s'appuie sur ce que la PME et les partenaires ont structuré.",
          solution:
            "Réduisez les analyses parallèles hors outil et améliorez l'alignement entre équipes.",
        },
        {
          icon: Database,
          title: "Historique et continuité",
          description:
            "Retrouvez l'historique par société et par période pour les suivis longs : diligence initiale, surveillance ou mandat — avec moins de perte d'information entre les étapes.",
          solution:
            "Facilitez la continuité entre équipes et mandats successifs sur un même client.",
        },
      ],
    },
  ]

  const activeCategoryData = categories.find((cat) => cat.id === activeCategory) ?? categories[0]
  const maxIndex = Math.max(0, activeCategoryData.challenges.length - 3)

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
      id="institutional-pillars"
      ref={sectionRef}
      className="scroll-mt-24 py-24 sm:py-32 relative z-10 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-300/10 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="mb-6">
            <div className="mb-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight tracking-tight">
                Modelisys au service de votre{" "}
                <span className="text-slate-600">institution</span>.
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
                Les enjeux ci-dessous concernent souvent les banques, les assureurs, les financeurs, les sociétés de gestion
                et les grands organismes qui accompagnent des PME — et qui veulent une donnée fiable, partagée avec le client,
                avec des usages d&apos;intelligence artificielle utiles et encadrés. Parcourez chaque axe pour voir comment
                Modelisys peut vous aider.
              </p>
            </div>
            <div
              className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-1000 delay-200 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="flex flex-wrap gap-3 sm:gap-4">
                {categories.map((category) => {
                  const Icon = category.icon
                  const isActive = activeCategory === category.id

                  return (
                    <button
                      key={category.id}
                      type="button"
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
                        <Icon
                          className={`w-3.5 h-3.5 transition-transform duration-300 ${
                            isActive ? "scale-110" : "group-hover:scale-110"
                          }`}
                        />
                        <span>{category.name}</span>
                      </div>
                      {isActive ? (
                        <div className="absolute inset-0 rounded-lg bg-slate-900 -z-10 blur-sm opacity-50" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={prevCards}
                  disabled={carouselIndex === 0}
                  className={`
                    w-10 h-10 rounded-full border border-slate-300 bg-white
                    flex items-center justify-center
                    transition-all duration-200
                    ${
                      carouselIndex === 0
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                    }
                  `}
                  aria-label="Précédent"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button
                  type="button"
                  onClick={nextCards}
                  disabled={carouselIndex >= maxIndex}
                  className={`
                    w-10 h-10 rounded-full border border-slate-300 bg-white
                    flex items-center justify-center
                    transition-all duration-200
                    ${
                      carouselIndex >= maxIndex
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

        <div className="relative -mx-8 sm:-mx-12 lg:-mx-16 xl:-mx-20">
          <div className="overflow-hidden py-2">
            <div
              className={`
                flex transition-transform duration-700 ease-out
                ${isVisible ? "opacity-100" : "opacity-0"}
                pl-8 sm:pl-12 lg:pl-16 xl:pl-20 pr-8 sm:pr-12 lg:pr-16 xl:pr-20
              `}
              style={{
                transform: `translateX(-${carouselIndex * (100 / 3)}%)`,
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
                    className="shrink-0 w-full sm:w-1/2 lg:w-1/3 px-3 py-2"
                  >
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
                      <div className="p-6 flex-1 flex flex-col">
                        <div
                          className={`
                          w-12 h-12 rounded-xl mb-4 flex items-center justify-center
                          transition-all duration-300
                          ${
                            isHovered
                              ? "bg-slate-900 text-white scale-110"
                              : "bg-slate-100 text-slate-700"
                          }
                        `}
                        >
                          <Icon className="w-6 h-6" />
                        </div>

                        <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight tracking-tight">
                          {challenge.title}
                        </h3>

                        <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">{challenge.description}</p>

                        <div
                          className={`
                          mt-auto pt-4 border-t border-slate-200
                          transition-all duration-300
                          ${isHovered ? "border-slate-300" : ""}
                        `}
                        >
                          <div className="flex items-start gap-2.5 mb-2">
                            <div
                              className={`
                              w-5 h-5 rounded-full flex items-center justify-center shrink-0
                              transition-all duration-300
                              ${isHovered ? "bg-emerald-500" : "bg-emerald-100"}
                            `}
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${isHovered ? "text-white" : "text-emerald-600"}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-slate-900">Notre solution</span>
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  Modelisys
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">{challenge.solution}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <Link
                            href="/#demo"
                            className={`
                              text-xs font-semibold inline-flex items-center gap-2
                              transition-all duration-300
                              ${
                                isHovered
                                  ? "text-slate-900"
                                  : "text-slate-600 hover:text-slate-900"
                              }
                            `}
                          >
                            Découvrir Modelisys en action
                            <ArrowRight
                              className={`w-3.5 h-3.5 transition-transform duration-300 ${isHovered ? "translate-x-1" : ""}`}
                            />
                          </Link>
                        </div>
                      </div>

                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `radial-gradient(circle at 2px 2px, rgb(15 23 42) 1px, transparent 0)`,
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
