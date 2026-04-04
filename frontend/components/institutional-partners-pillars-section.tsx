"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Brain,
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  FileStack,
  FileText,
  Landmark,
  Layers,
  Lightbulb,
  LineChart,
  Link2,
  Scale,
  Target,
  Users,
  Zap,
} from "lucide-react"

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
  const [activeCategory, setActiveCategory] = useState<string>("analyse")
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
      id: "analyse",
      name: "Analyse",
      icon: LineChart,
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
            "Croisement des comptes, périodes et entités : l'IA aide à faire remonter ruptures et incohérences à investiguer — sans remplacer la revue humaine ni les politiques internes de votre organisation.",
          solution:
            "Optimisez le temps d'analyste sur les zones à risque plutôt que sur la compilation.",
        },
        {
          icon: BarChart3,
          title: "Synthèses et indicateurs pour cadrer l'analyse",
          description:
            "Regroupez les lectures clés (ratios, tendances, postes sensibles) pour préparer plus vite vos mémos, vos questions au client et vos supports de comité — sans reconstituer des extraits dans des classeurs parallèles.",
          solution:
            "Gagnez en cohérence entre équipes : une même lecture des signaux financiers, à la même date et sur les mêmes périmètres.",
        },
      ],
    },
    {
      id: "financement",
      name: "Financement",
      icon: Landmark,
      challenges: [
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
          icon: FileText,
          title: "Dossier de financement structuré par période",
          description:
            "États, budgets, écarts commentés et pièces utiles au montage sont rattachés au bon contexte temporel : moins de requalification des chiffres entre relationship, risque et conformité.",
          solution:
            "Présentez une proposition ou une renégociation à partir d'un dossier unique, lisible et audit-ready.",
        },
        {
          icon: Link2,
          title: "Hypothèses de structure partagées avec la PME",
          description:
            "Les hypothèses qui sous-tendent le plan de financement (trésorerie, dette, garanties, dividendes) peuvent être discutées et documentées sur la même base que celle utilisée par le dirigeant et ses conseils.",
          solution:
            "Réduisez les malentendus sur les chiffres : un fil clair entre ce que la PME modélise et ce que votre organisation retient.",
        },
        {
          icon: Users,
          title: "Alignement relationship, risque et conformité",
          description:
            "Un espace commun sur la situation financière du client limite les versions parallèles du dossier et accélère les arbitrages internes avant décision.",
          solution:
            "Facilitez les échanges entre métiers sur des données et des notes déjà contextualisées.",
        },
      ],
    },
    {
      id: "investissement",
      name: "Investissement",
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
        {
          icon: BadgeCheck,
          title: "Diligence et thèses d'investissement documentées",
          description:
            "Consignez les questions ouvertes, les réponses du management et les pièces obtenues dans le fil du dossier — utile pour les comités, les suivis post-closing et les transferts d'équipe.",
          solution:
            "Capitalisez sur une trace structurée entre décision, conditions suspensives et réalisation.",
        },
        {
          icon: Target,
          title: "Suivi des leviers après investissement",
          description:
            "Suivez dans le temps les indicateurs et engagements liés à votre mandat (plan de création de valeur, tableaux de bord convenus) à partir des mises à jour comptables et des commentaires de la PME.",
          solution:
            "Alignez le dialogue avec le dirigeant sur des chiffres et des écarts déjà expliqués dans la plateforme.",
        },
      ],
    },
    {
      id: "surveillance",
      name: "Surveillance",
      icon: Activity,
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
        {
          icon: Users,
          title: "Coordination réseau, risque et client",
          description:
            "Un espace partagé avec la PME pour les échanges et les documents : moins d'opacité entre relationship manager, risque et client, plus de cohérence dans les messages et les décisions.",
          solution:
            "Facilitez l'alignement interne et externe autour d'une vision financière unique.",
        },
        {
          icon: Zap,
          title: "Signaux et ruptures à investiguer",
          description:
            "Mettez en évidence les variations marquantes, les ruptures de tendance ou les postes qui sortent des plages habituelles — pour prioriser les revues et les échanges avec le client.",
          solution:
            "Concentrez le temps des équipes sur les dossiers et les périodes qui méritent une attention renforcée.",
        },
        {
          icon: ClipboardList,
          title: "Revues périodiques et pièces par période",
          description:
            "Préparez les revues covenant, les suivis trimestriels ou annuels avec les mêmes états, notes et pièces que la PME — rattachés à la période concernée.",
          solution:
            "Réduisez les allers-retours pour obtenir la bonne version du bon trimestre.",
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
      id="financial-pillars"
      ref={sectionRef}
      className="scroll-mt-24 relative z-10 overflow-hidden bg-slate-100/50 py-24 sm:py-32"
    >
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

      <div className="relative mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div
          className={`mb-12 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mb-6">
            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold tracking-wide text-slate-500">Financiers</p>
              <h2 className="mb-4 text-3xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-4xl md:text-5xl">
                Modelisys au service de votre <span className="text-[#5C5F66]">organisation financière</span>.
              </h2>
              <p className="max-w-3xl text-lg leading-relaxed text-[#5C5F66] sm:text-xl">
                Les enjeux ci-dessous concernent souvent les banques, les assureurs, les financeurs, les sociétés de gestion
                et les grands organismes qui accompagnent des PME — et qui veulent une donnée fiable, partagée avec le client,
                avec des usages d&apos;intelligence artificielle utiles et encadrés. Choisissez un axe pour parcourir les
                réponses concrètes que Modelisys rend possibles.
              </p>
              <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/70 via-slate-300/50 to-transparent" />
            </div>
            <div
              className={`flex flex-col gap-4 transition-all duration-1000 delay-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <div className="min-w-0 flex-1 border-b border-slate-200/90 pb-3">
                <div
                  role="tablist"
                  aria-label="Axes financiers"
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
              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={prevCards}
                  disabled={carouselIndex === 0}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/90 bg-white/95
                    transition-all duration-200
                    ${
                      carouselIndex === 0
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:border-slate-400 hover:bg-slate-50"
                    }
                  `}
                  aria-label="Précédent"
                >
                  <ChevronLeft className="h-5 w-5 text-[#2A2F3A]" />
                </button>
                <button
                  type="button"
                  onClick={nextCards}
                  disabled={carouselIndex >= maxIndex}
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/90 bg-white/95
                    transition-all duration-200
                    ${
                      carouselIndex >= maxIndex
                        ? "cursor-not-allowed opacity-40"
                        : "cursor-pointer hover:border-slate-400 hover:bg-slate-50"
                    }
                  `}
                  aria-label="Suivant"
                >
                  <ChevronRight className="h-5 w-5 text-[#2A2F3A]" />
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
                    className="w-full shrink-0 px-3 py-2 sm:w-1/2 lg:w-1/3"
                  >
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
                        <div className="mb-4 text-center">
                          <p className="text-xs font-semibold tracking-wide text-slate-600">Enjeu</p>
                          <p className="mt-1 text-[10px] tracking-wide text-slate-500">{activeCategoryData.name}</p>
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

                        <p className="mb-5 flex-1 text-sm leading-relaxed text-[#5C5F66]">{challenge.description}</p>

                        <div
                          className={`
                          mt-auto rounded-2xl border border-slate-200/90 bg-slate-50/95 p-4
                          transition-colors duration-300
                          ${isHovered ? "border-slate-300/90 bg-slate-50" : ""}
                        `}
                        >
                          <div className="relative">
                            <div className="pointer-events-none absolute bottom-2 left-[18px] top-2 w-px bg-gradient-to-b from-slate-300/90 via-slate-200/60 to-[#E0742D]/40" />
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
                            href="/#demo"
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
