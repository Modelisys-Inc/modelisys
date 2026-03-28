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
  History,
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
  RefreshCw,
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

export function CabinetsPillarsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>("certification")
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
      id: "certification",
      name: "Certification",
      icon: ShieldCheck,
      challenges: [
        {
          icon: FileStack,
          title: "Accès instantané aux états et analyses du client",
          description:
            "Depuis le portail client, vous consultez les états financiers et les analyses clés (ratios, fonds de roulement, capex, projections/budget) par période, avec un historique pouvant aller jusqu'à 5 ans. De quoi préparer plus vite vos contrôles et mieux cadrer la discussion avec la PME.",
          solution:
            "Accédez aux données consolidées et indicateurs au même endroit, avec une lecture rapide par période (jusqu'à 5 ans) pour préparer la certification.",
        },
        {
          icon: ClipboardList,
          title: "Notes mensuelles sur les écarts, déjà prêtes",
          description:
            "La PME produit des notes explicatives mensuelles pour expliquer les écarts (hypothèses, impacts, justification). Vous recevez un dossier plus clair, avec moins de questions et moins de re-saisie.",
          solution:
            "Validez, complétez et consolidez les explications dans votre dossier de fin d'année, avec une historisation fiable.",
        },
        {
          icon: Scale,
          title: "Pièces justificatives par compte (GL) et par période",
          description:
            "Trouvez rapidement les preuves au bon compte GL, au lieu de parcourir des fichiers dispersés. Vous accélérez vos vérifications et sécurisez votre piste d'audit grâce aux documents rattachés.",
          solution:
            "Accédez aux pièces déposées par la PME, rattachées au compte et à la période concernés, directement dans le flux de certification.",
        },
        {
          icon: BadgeCheck,
          title: "Certification plus rapide, meilleure compréhension",
          description:
            "En un seul endroit, vous retrouvez l'essentiel pour la fin d'année : états, analyses, écarts commentés par la PME et preuves rattachées. Résultat : moins d'allers-retours, un contrôle plus fluide et une compréhension plus forte de la trajectoire du client avant la clôture.",
          solution:
            "Préparez vos missions à partir d'un dossier structuré, pour itérer plus vite et produire des livrables facilement auditables.",
        },
      ],
    },
    {
      id: "conseil",
      name: "Services-conseils",
      icon: Briefcase,
      challenges: [
        {
          icon: LineChart,
          title: "Budget cadré rapidement avec votre client PME",
          description:
            "Accédez en un instant aux états et analyses consolidés du client, puis accompagnez la PME dans la construction et l'ajustement du budget : hypothèses, écarts et décisions sont discutés sur la même base.",
          solution:
            "Consolidez les échanges et les justificatifs autour du budget afin de réduire les allers-retours, renforcer la cohérence et accélérer vos rendez-vous.",
        },
        {
          icon: Lightbulb,
          title: "Projections et scénarios directement dans Modelisys",
          description:
            "Construisez des projections et des scénarios (rachat d'actionnaire, financement, restructuration, capex, etc.) à partir des données consolidées. Vous visualisez rapidement l'impact sur les indicateurs clés.",
          solution:
            "Itérez plus vite : lancez plusieurs scénarios, comparez les résultats et exportez des livrables prêts à présenter à la PME.",
        },
        {
          icon: Target,
          title: "Analyse de la valeur d'entreprise et mise à jour annuelle",
          description:
            "Accompagnez votre client dans l'analyse de la valeur de son entreprise : hypothèses, paramètres et résultats restent consultables. Vous pouvez ensuite préparer des mises à jour annuelles, pour discuter de l'évolution de la valeur et des leviers d'amélioration d'une année à l'autre.",
          solution:
            "Suivez la valeur dans le temps : itérez vos scénarios et vos analyses chaque année avec les données consolidées, et exportez des livrables prêts à soutenir votre discussion avec le client.",
        },
        {
          icon: Users,
          title: "Recommandations partagées et actions suivies",
          description:
            "Transformez les analyses en recommandations et échangez avec la PME sur une base à jour : avec les données disponibles en continu, le cabinet peut être plus proactif (pas seulement en fin d'année).",
          solution:
            "Documentez le contexte, les actions proposées et les réponses à partir des données en temps réel, afin d'itérer plus vite, garder une trace claire et faire progresser les décisions d'une rencontre à l'autre.",
        },
      ],
    },
    {
      id: "donnees",
      name: "Base de données",
      icon: Database,
      challenges: [
        {
          icon: Layers,
          title: "Benchmarks et ratios par industrie",
          description:
            "Comparez instantanément la performance et la structure financière de votre client à des références concrètes : ratios et benchmarks tirés de l'ensemble de vos dossiers, par industrie et par période. Idéal pour expliquer les écarts, cadrer vos analyses et soutenir vos recommandations.",
          solution:
            "Générez des comparables, mettez les écarts en perspective et exportez des éléments clairs pour justifier vos conclusions (rapports, analyses, opinions).",
        },
        {
          icon: Link2,
          title: "Analyse rapide d'un groupe multi-entreprises",
          description:
            "Quand un client détient plusieurs entreprises (un groupe), votre cabinet consolide et compare très rapidement : ratios, fonds de roulement, capex et signaux d'évolution par entité et au niveau du groupe.",
          solution:
            "Accédez à des données consolidées standardisées et réutilisables pour alimenter vos dossiers et améliorer vos discussions, sans ressaisie ni va-et-vient.",
        },
        {
          icon: RefreshCw,
          title: "Indicateurs orientés performance et valeur",
          description:
            "Accédez aux données utiles à l'accompagnement : capex, fonds de roulement, ratios, et projections/budget pour cadrer la valeur et les leviers d'amélioration.",
          solution:
            "Passez des chiffres aux indicateurs, puis aux scénarios, pour itérer plus vite et mieux conseiller la PME.",
        },
        {
          icon: FileStack,
          title: "Exports et livrables prêts pour vos dossiers",
          description:
            "Réduisez le temps de compilation : exportez des données et des indicateurs pour produire rapports, benchmarks et sections de dossier.",
          solution:
            "Exportez et réutilisez les informations consolidées pour alimenter vos livrables, sans ressaisie.",
        },
        {
          icon: History,
          title: "Retrouver l'historique de chaque société",
          description:
            "Dans Modelisys, vous accédez facilement à l'historique de n'importe quelle société (y compris les entités d'un groupe) : périodes, analyses, ratios et indicateurs restent disponibles. Vous pouvez revenir sur un dossier précédent et réutiliser les observations pour vos contrôles et vos discussions avec la PME.",
          solution:
            "Un historique conservé et consultable rapidement : moins de ressaisie, plus de continuité dans vos analyses, et des échanges plus structurés d'une année à l'autre.",
        },
      ],
    },
    {
      id: "ia",
      name: "Intelligence artificielle",
      icon: Sparkles,
      challenges: [
        {
          icon: Brain,
          title: "L'intelligence artificielle accélère vos analyses",
          description:
            "L'IA aide à parcourir les variations, les ratios et les tendances sur les données du client : premières explications, pistes d'investigation et brouillons de commentaires — toujours à valider par vos équipes. Vous réduisez le temps passé sur la production pour en consacrer davantage au conseil et à la qualité du service rendu à la PME.",
          solution:
            "Exploitez des suggestions et synthèses assistées sur les écarts et les évolutions, puis ajustez et signez le message professionnel. L'IA soutient l'analyse ; le jugement, la responsabilité et la relation client restent ceux du cabinet — avec des livrables plus vite disponibles et des échanges plus riches.",
        },
        {
          icon: Zap,
          title: "L'IA relie les données et fait remonter l'essentiel",
          description:
            "Au-delà des tableaux bruts, l'intelligence artificielle aide à structurer et croiser la base de données du client : liens entre comptes, périodes, entités et indicateurs. Elle accélère la détection de cohérences, d'écarts et de motifs utiles à vos revues — sans remplacer votre jugement.",
          solution:
            "Optimisez l'exploitation de la donnée : corrélez automatiquement les informations pertinentes, mettez en avant les ruptures et les postes à creuser, et gagnez du temps pour décider quoi approfondir avec la PME. Des analyses plus rapides, une vision plus nette, un dossier mieux préparé.",
        },
        {
          icon: Bot,
          title: "Une IA posée sur vos données Modelisys",
          description:
            "Dans Modelisys, l'assistance intelligente ne fonctionne pas comme un outil généraliste : elle s'appuie sur la balance et les états consolidés, l'historique, les indicateurs et les notes déjà structurés dans la plateforme. Vous obtenez des pistes, des synthèses et des angles d'analyse cohérents avec le dossier réel du client — pour répondre plus vite sans perdre le lien avec la comptabilité et vos missions.",
          solution:
            "Exploitez l'IA sur une seule source de vérité (données synchronisées, analyses et documentation) pour préparer vos revues, vos échanges avec la PME et vos livrables : moins de reprise manuelle hors outil, plus d'alignement entre ce que vous dites et ce que montrent les chiffres.",
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
      id="cabinet-pillars"
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
                Modelisys au service de votre <span className="text-slate-600">cabinet</span>.
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">
                Les irritants ci-dessous concernent souvent les cabinets qui veulent renforcer leurs missions de certification, enrichir leurs
                services-conseils et s&apos;appuyer sur une donnée fiable — avec des usages d&apos;intelligence artificielle utiles et encadrés.
                Parcourez chaque axe pour voir comment Modelisys peut vous aider à répondre.
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
                            href="/landing#demo"
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
