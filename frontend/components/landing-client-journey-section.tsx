"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  APPROCHE_PHASE_NAVIGATE_EVENT,
  APPROCHE_PHASE_IDS,
  getApprochePhaseHash,
  parseApprochePhaseFromHash,
  type ApprochePhaseId,
} from "@/lib/approche-navigation"

const PHASE_ORDER = APPROCHE_PHASE_IDS
type PhaseId = ApprochePhaseId

const phaseLabels: Record<PhaseId, string> = {
  diagnostic: "Phase 1 — Diagnostic",
  vision: "Phase 2 — Vision",
  planification: "Phase 3 — Planification",
  execution: "Phase 4 — Exécution",
  ajustement: "Phase 5 — Ajustement",
}

const phaseShortLabels: Record<PhaseId, string> = {
  diagnostic: "Diagnostic",
  vision: "Vision",
  planification: "Planification",
  execution: "Exécution",
  ajustement: "Ajustement",
}

type PhaseContent = {
  description: string
  listLabel: string
  items: readonly string[]
  example: { label: string; text: string }
  footer?: string
}

const phaseContent: Record<PhaseId, PhaseContent> = {
  diagnostic: {
    description:
      "Avant de piloter, il faut mesurer. Modelisys structure une première lecture complète de votre entreprise pour ancrer toute la suite dans des chiffres défendables.",
    listLabel: "Étapes",
    items: [
      "Analyse financière",
      "Évaluation initiale",
      "Diagnostic des risques",
      "KPI actuels",
      "Identification des leviers de valeur",
    ],
    example: {
      label: "Exemple",
      text: "L'analyse financière révèle une marge brute stable à 32 %, mais une concentration de 45 % des revenus chez trois clients. L'évaluation initiale situe la valeur de l'entreprise à environ 4,2 M$, fondée sur un multiple de 4,5x le BAIIA normalisé de 935 000 $. Le diagnostic des risques met en évidence une dépendance client élevée et un fonds de roulement sous tension. Les KPI actuels montrent un ratio de liquidité de 1,1 et un délai de recouvrement de 68 jours. Parmi les leviers de valeur identifiés : diversifier la clientèle, réduire le BFR de 15 % et améliorer la marge opérationnelle de 2 points. Ce diagnostic devient le point de référence pour toutes les phases suivantes.",
    },
  },
  vision: {
    description:
      "La valeur ne se construit pas au hasard. Cette phase clarifie l'ambition du dirigeant et transforme une intention en objectif chiffré.",
    listLabel: "Questions clés",
    items: [
      "Voulez-vous vendre ?",
      "Voulez-vous procéder à l'acquisition d'une nouvelle entreprise ?",
      "Voulez-vous fermer une division actuelle de votre société ou bien en développer une nouvelle ?",
      "Quelle valeur cible recherchez-vous ?",
    ],
    example: {
      label: "Exemple",
      text: "Le dirigeant confirme qu'il ne souhaite pas vendre à court terme. La vision retenue : atteindre une valeur cible de 7 M$ dans 3 ans par l'entremise d'une acquisition dans 24 mois et la fermeture d'une division non rentable. Cette ambition chiffrée sera modélisée à l'étape suivante pour en mesurer les impacts concrets sur la performance de l'entreprise.",
    },
  },
  planification: {
    description:
      "Modelisys met à la disposition des dirigeants un outil de projection et de création de scénarios pour modéliser la vision, suivre les flux de trésorerie de près et déterminer si des besoins de financement seront nécessaires à sa réalisation.",
    listLabel: "Éléments modélisés",
    items: [
      "Revenus",
      "Dépenses fixes",
      "Dépenses variables",
      "Fonds de roulement",
      "Flux de trésorerie",
      "Besoins de financement",
      "Valeur d'entreprise",
    ],
    example: {
      label: "Exemple",
      text: "La vision — 7 M$ par l'entremise d'une acquisition dans 24 mois et la fermeture d'une division non rentable — est modélisée dans Modelisys. Le dirigeant projette l'impact sur les revenus, les dépenses fixes, les dépenses variables et le fonds de roulement. Le suivi serré des flux de trésorerie révèle un besoin de financement de 850 000 $ au moment de l'acquisition, avant que la fermeture de la division et l'intégration de la cible ne rééquilibrent la trésorerie. L'outil consolide ces hypothèses pour offrir un aperçu global de la performance projetée et de la trajectoire de valeur vers l'objectif de 7 M$.",
    },
  },
  execution: {
    description:
      "Chaque mois, Modelisys confronte le réel au scénario modélisé en planification et traduit les écarts en impact sur la trésorerie et la valeur projetée — pas seulement en pourcentages isolés.",
    listLabel: "Chaque mois",
    items: [
      "Réel vs passé",
      "Réel vs scénario",
      "Réel vs objectif de valeur",
      "Explication et compréhension des écarts",
    ],
    example: {
      label: "Exemple",
      text: "Le scénario modélisé en planification devient la référence de suivi. Chaque mois, Modelisys confronte le réel à ce qui avait été projeté — revenus, dépenses, trésorerie et valeur. À mi-parcours vers l'acquisition, les ventes dépassent le modèle grâce à l'embauche d'un vendeur, mais les dépenses variables grimpent plus vite que prévu : prix des matériaux en hausse et salaire non budgétisé. L'écart ne se lit plus en pourcentages isolés : Modelisys en traduit l'impact sur la trésorerie et sur la trajectoire vers les 7 M$. La situation se complique au moment où un besoin de financement de 850 000 $ avait déjà été identifié pour réaliser l'acquisition. Le dirigeant comprend immédiatement ce qui dérape, pourquoi cela menace sa vision et ce qu'il doit corriger.",
    },
  },
  ajustement: {
    description:
      "La valeur évolue avec le marché, les décisions et les risques. Modelisys permet de recalibrer le scénario en continu — nouvelles hypothèses, risques et opportunités — sans repartir de zéro.",
    listLabel: "Tous les mois ou trimestres",
    items: [
      "Nouvelles hypothèses",
      "Nouveaux scénarios",
      "Nouveaux risques",
      "Nouvelles opportunités",
    ],
    example: {
      label: "Exemple",
      text: "Les écarts constatés en exécution ne remettent pas en cause la vision — ils mettent à jour le scénario. Dans Modelisys, le dirigeant ajuste ses hypothèses : dépenses variables resserrées, embauche reportée, besoin de financement réévalué à 780 000 $. L'outil recalcule aussitôt l'impact sur la trésorerie, la performance et la trajectoire vers les 7 M$. Chaque mois ou trimestre, le scénario évolue avec la réalité de l'entreprise : nouveaux risques intégrés, nouvelles opportunités testées, cap maintenu. Modelisys devient le lieu où la vision se pilote au quotidien — pas un rapport figé, mais un plan vivant.",
    },
  },
}

function PhaseItemsList({
  label,
  items,
  example,
}: {
  label: string
  items: readonly string[]
  example?: { label: string; text: string }
}) {
  return (
    <div className="mt-8 max-w-lg border-t border-white/[0.08] pt-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9B8A5]/65">{label}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#C9B8A5]/85 sm:text-[15px]">
            <span className="mt-[0.6rem] h-px w-3 shrink-0 bg-[#E0742D]/55" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {example ? (
        <div className="mt-6 border-l border-[#E0742D]/35 pl-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9B8A5]/55">{example.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-[#E6D6C3]/88 sm:text-[15px]">{example.text}</p>
        </div>
      ) : null}
    </div>
  )
}

export function LandingClientJourneySection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activePhase, setActivePhase] = useState<PhaseId>("diagnostic")
  const [autoRotate, setAutoRotate] = useState(true)

  const selectPhase = (id: PhaseId, options?: { updateHash?: boolean }) => {
    setActivePhase(id)
    setAutoRotate(false)
    if (options?.updateHash !== false && typeof window !== "undefined" && window.location.pathname === "/") {
      const hash = getApprochePhaseHash(id)
      if (window.location.hash !== `#${hash}`) {
        window.history.replaceState(null, "", `/#${hash}`)
      }
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.12, rootMargin: "0px 0px -80px 0px" },
    )

    const el = sectionRef.current
    if (el) observer.observe(el)
    return () => {
      if (el) observer.unobserve(el)
    }
  }, [])

  useEffect(() => {
    if (!autoRotate) return

    const interval = window.setInterval(() => {
      setActivePhase((current) => {
        const idx = PHASE_ORDER.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % PHASE_ORDER.length
        return PHASE_ORDER[nextIdx]
      })
    }, 10000)

    return () => window.clearInterval(interval)
  }, [autoRotate])

  useEffect(() => {
    const applyPhase = (id: PhaseId) => {
      setActivePhase(id)
      setAutoRotate(false)
    }

    const onNavigate = (event: Event) => {
      const { phaseId } = (event as CustomEvent<{ phaseId: PhaseId }>).detail
      applyPhase(phaseId)
    }

    const onHashChange = () => {
      const phaseId = parseApprochePhaseFromHash(window.location.hash)
      if (phaseId) applyPhase(phaseId)
    }

    onHashChange()
    window.addEventListener(APPROCHE_PHASE_NAVIGATE_EVENT, onNavigate)
    window.addEventListener("hashchange", onHashChange)
    return () => {
      window.removeEventListener(APPROCHE_PHASE_NAVIGATE_EVENT, onNavigate)
      window.removeEventListener("hashchange", onHashChange)
    }
  }, [])

  const active = phaseContent[activePhase]

  return (
    <section id="approche-modelisys" ref={sectionRef} className="relative z-10 overflow-x-clip">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-[#1F2430] lg:border-r lg:border-white/5" />
          <div className="bg-[#2A2F3A]" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24 pointer-events-auto">
        <div
          id="approche-modelisys-start"
          className="scroll-mt-[7.5rem] sm:scroll-mt-32 h-0"
          aria-hidden
        />
        <div
          className={`flex flex-col gap-12 sm:gap-14 lg:grid lg:grid-cols-2 lg:gap-10 xl:gap-14 2xl:gap-16 lg:items-center pt-10 pb-12 sm:pt-14 sm:pb-14 lg:pt-16 lg:pb-16 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Colonne 1 — intro + carte Phases */}
          <div className="order-1 lg:col-start-1 lg:pr-4 xl:pr-8 2xl:pr-10">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              L&apos;APPROCHE MODELISYS
            </p>
            <h2 className="mt-5 max-w-full text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
              Un plan d&apos;action clair pour{" "}
              <span className="text-[#C9B8A5]/95">comprendre ce qui crée de la valeur</span>
            </h2>
            <p className="mt-4 max-w-full text-base leading-[1.65] text-[#C9B8A5]/85 sm:text-lg">
              Modelisys accompagne les dirigeants à travers cinq phases — du diagnostic initial au suivi continu — pour
              mesurer, piloter et augmenter la valeur de leur entreprise.
            </p>

            <div className="mt-8 flex w-full justify-center sm:mt-10">
              <div className="relative mx-auto flex w-full max-w-[280px] sm:max-w-[300px] md:max-w-[320px] h-auto min-h-0 lg:max-w-[min(100%,340px)] xl:max-w-[360px] flex-col">
                <div className="pointer-events-none absolute inset-0 -z-20 rounded-[40px] sm:rounded-[44px] bg-black/50 blur-2xl scale-[1.02]" />

                <div className="pointer-events-none absolute inset-0 -z-10 rounded-[40px] sm:rounded-[44px] p-px wow-border">
                  <div className="h-full w-full rounded-[39px] sm:rounded-[43px] bg-[#141823]" />
                </div>

                <div className="relative flex h-auto min-h-0 flex-col overflow-hidden rounded-[38px] sm:rounded-[42px] border border-[#E6D6C3]/45 bg-[#141823] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(230,214,195,0.12)_inset]">
                  <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />
                  <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6D6C3]/25" />
                  <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6B08C]/12" />
                  <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/10" />

                  <div className="flex flex-col px-5 py-5 sm:px-6 sm:py-7 lg:py-7">
                    <div className="shrink-0 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">Phases</p>
                      <p className="mt-2 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">
                        Du diagnostic à l&apos;ajustement.
                      </p>
                    </div>

                    <div className="mt-4 sm:mt-5 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 sm:p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                      <div className="relative">
                        <div className="pointer-events-none absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                        <ul className="flex flex-col gap-2 py-2 sm:gap-2.5 sm:py-2.5">
                          {PHASE_ORDER.map((id) => {
                            const isActive = activePhase === id
                            return (
                              <li key={id} data-phase={id}>
                                <button
                                  type="button"
                                  onClick={() => selectPhase(id)}
                                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                                    isActive
                                      ? "border border-white/[0.12] bg-white/[0.07] shadow-sm"
                                      : "border border-transparent hover:bg-white/[0.04]"
                                  }`}
                                  aria-pressed={isActive}
                                >
                                  <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                                    <span
                                      className={`absolute h-2 w-2 rounded-full ${
                                        isActive ? "bg-[#E0742D]" : "bg-[#E6D6C3]/80"
                                      }`}
                                    />
                                    <span className="absolute h-5 w-5 rounded-full border border-white/10 bg-white/[0.02]" />
                                  </span>
                                  <span
                                    className={`text-[11px] font-medium tracking-wide ${
                                      isActive ? "text-[#E6D6C3]" : "text-[#E6D6C3]/90"
                                    }`}
                                  >
                                    {phaseShortLabels[id]}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne 2 — phase sélectionnée */}
          <div
            className="order-2 lg:col-start-2 lg:pl-4 xl:pl-8 2xl:pl-10"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              Phase sélectionnée
            </p>
            <h3 className="mt-5 max-w-xl text-2xl font-semibold leading-snug tracking-tight text-[#E6D6C3] sm:text-[1.65rem]">
              {phaseLabels[activePhase]}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-[1.7] text-[#C9B8A5]/80 sm:text-[15px]">
              {active.description}
            </p>

            <PhaseItemsList label={active.listLabel} items={active.items} example={active.example} />

            {active.footer ? (
              <p className="mt-6 max-w-xl border-t border-white/[0.06] pt-5 text-xs leading-relaxed text-[#C9B8A5]/60">
                {active.footer}
              </p>
            ) : null}

            <div className="mt-8">
              <button
                type="button"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                DÉCOUVRIR LE PARCOURS
                <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .wow-border {
          background: conic-gradient(
            from 120deg,
            rgba(230, 214, 195, 0.9),
            rgba(230, 176, 140, 0.9),
            rgba(255, 255, 255, 0.25),
            rgba(230, 214, 195, 0.9)
          );
          filter: drop-shadow(0 18px 55px rgba(0, 0, 0, 0.45));
          animation: wowSpin 10s linear infinite;
        }

        .wow-shimmer {
          background: radial-gradient(700px 300px at 20% 15%, rgba(230, 214, 195, 0.16), transparent 60%),
            radial-gradient(500px 240px at 85% 40%, rgba(230, 176, 140, 0.12), transparent 55%),
            linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.06) 35%, transparent 70%);
          transform: translateX(-22%);
          animation: wowShimmer 6s ease-in-out infinite;
        }

        .wow-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
          background-size: 160px 160px;
        }

        @keyframes wowSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes wowShimmer {
          0% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
          50% {
            transform: translateX(12%);
            opacity: 0.85;
          }
          100% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wow-border,
          .wow-shimmer {
            animation: none !important;
            transform: none !important;
          }
          .wow-shimmer {
            opacity: 0.65 !important;
          }
        }
      `}</style>
    </section>
  )
}
