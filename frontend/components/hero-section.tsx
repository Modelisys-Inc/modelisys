"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { HeroPhaseVisual } from "@/components/hero-phase-visual"
import { navigateToApprochePhase, scrollToApprocheSection } from "@/lib/approche-navigation"
import {
  HERO_FEATURE_LABELS,
  HERO_FEATURE_PHASE_BY_LABEL,
  type HeroFeatureLabel,
} from "@/lib/hero-features"

type Feature = HeroFeatureLabel

type PhaseInsight = {
  step: string
  headline: string
  outcome: string
  metricLabel: string
  metricValue: string
  metricSecondary?: { label: string; value: string }
  trajectory: number
}

const phaseInsights: Record<Feature, PhaseInsight> = {
  Diagnostic: {
    step: "01",
    headline: "Mesurer votre point de départ",
    outcome: "Obtenez une lecture claire de la valeur, des risques et des leviers — la base de tout le reste.",
    metricLabel: "Valeur actuelle",
    metricValue: "4,2 M$",
    trajectory: 18,
  },
  Vision: {
    step: "02",
    headline: "Fixer un cap chiffré",
    outcome: "Transformez une ambition — vendre, acquérir, restructurer — en objectif de valeur concret.",
    metricLabel: "Objectif visé",
    metricValue: "7 M$",
    metricSecondary: { label: "Rend. annualisé souhaité", value: "+18,6 %" },
    trajectory: 38,
  },
  Planification: {
    step: "03",
    headline: "Modéliser vos décisions",
    outcome: "Projetez l'impact de vos choix sur la performance, la trésorerie et les besoins de financement.",
    metricLabel: "Financement anticipé",
    metricValue: "850 k$",
    trajectory: 55,
  },
  Exécution: {
    step: "04",
    headline: "Relier le réel à la valeur",
    outcome: "Chaque écart se traduit en impact sur la trésorerie et la trajectoire — pas en pourcentages isolés.",
    metricLabel: "Écart sur la valeur",
    metricValue: "−80 k$",
    trajectory: 72,
  },
  Ajustement: {
    step: "05",
    headline: "Piloter un plan vivant",
    outcome: "Recalibrez hypothèses et scénarios en continu, sans repartir de zéro.",
    metricLabel: "Scénario",
    metricValue: "Recalibré",
    trajectory: 88,
  },
}

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const features = HERO_FEATURE_LABELS
  const [activeFeature, setActiveFeature] = useState<Feature>("Diagnostic")
  const [autoRotate, setAutoRotate] = useState(true)

  const selectFeature = (feature: Feature) => {
    setActiveFeature(feature)
    setAutoRotate(false)
  }

  const active = phaseInsights[activeFeature]

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" },
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

  useEffect(() => {
    if (!autoRotate) return

    const interval = window.setInterval(() => {
      setActiveFeature((current) => {
        const idx = features.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % features.length
        return features[nextIdx]
      })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [autoRotate, features])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-3">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#262B36] lg:border-x lg:border-white/5" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[560px] w-[560px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24 pointer-events-auto">
        <div className="relative flex min-h-0 flex-col gap-12 py-16 sm:gap-14 sm:py-24 lg:grid lg:grid-cols-3 lg:items-center lg:gap-8 lg:py-28 xl:gap-12 xl:py-32 2xl:gap-14 lg:min-h-[min(88vh,920px)]">
          {/* Colonne 1 — message principal */}
          <div
            className={`order-1 lg:col-start-1 max-w-xl lg:max-w-none lg:pr-2 xl:pr-6 2xl:pr-8 transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300/95 sm:text-xs">
              Plateforme d&apos;intelligence financière
            </p>

            <h1 className="mt-8 max-w-[28rem] text-[1.65rem] font-semibold leading-[1.18] tracking-tight text-[#E6D6C3] sm:mt-10 sm:max-w-[32rem] sm:text-[2rem] sm:leading-[1.16] lg:max-w-[34rem] lg:text-[2.35rem] xl:text-[2.5rem] xl:leading-[1.14]">
              Augmenter la valeur de votre entreprise ne devrait pas être laissé au hasard.
            </h1>

            <p className="mt-8 max-w-[28rem] text-sm leading-[1.65] text-[#C9B8A5]/85 sm:mt-10 sm:text-[15px] lg:max-w-[34rem]">
              Modelisys combine diagnostic, valorisation, planification stratégique et suivi de performance dans une
              méthodologie en cinq phases permettant de mesurer votre valeur actuelle, définir une cible et suivre les
              actions qui contribuent réellement à l&apos;atteindre.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-10">
              <button
                type="button"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                RÉSERVER UNE DÉMO
                <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
              </button>

              <span className="hidden h-px w-10 shrink-0 bg-white/[0.12] sm:block" aria-hidden />

              <button
                type="button"
                onClick={() => scrollToApprocheSection()}
                className="inline-flex items-center gap-2 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                EN SAVOIR PLUS
                <span className="inline-block h-px w-10 bg-[#E0742D]/90" />
              </button>
            </div>
          </div>

          {/* Colonnes 2 & 3 — panneau unifié trajectoire + insight */}
          <div
            className={`order-2 lg:col-span-2 lg:col-start-2 transition-all duration-1000 delay-100 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="pointer-events-none absolute inset-0 -z-20 rounded-[28px] bg-black/50 blur-2xl scale-[1.02]" />

              <div className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] p-px hero-wow-border">
                <div className="h-full w-full rounded-[27px] bg-[#141823]" />
              </div>

              <div className="relative overflow-hidden rounded-[26px] border border-[#E6D6C3]/45 bg-[#141823] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(230,214,195,0.12)_inset]">
                <div className="pointer-events-none absolute inset-0 opacity-70 hero-wow-shimmer" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay hero-wow-noise" />
                <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-[#E6D6C3]/25" />
                <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-[#E6B08C]/12" />
                <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/10" />

                {/* En-tête partagé */}
                <div className="relative border-b border-white/[0.08] px-5 py-5 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">
                      Trajectoire de valeur
                    </p>
                    <span className="font-mono text-[11px] tabular-nums text-[#E0742D]">{active.step}/05</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-[#C9B8A5]/72">
                    <span>4,2 M$</span>
                    <span>7 M$</span>
                  </div>
                  <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E0742D] to-[#E6B08C] transition-all duration-700 ease-out"
                      style={{ width: `${active.trajectory}%` }}
                    />
                  </div>
                </div>

                {/* Corps : sélecteur + insight */}
                <div className="relative grid lg:grid-cols-[minmax(0,0.95fr)_1px_minmax(0,1.05fr)]">
                  {/* Gauche — phases */}
                  <div className="px-5 py-5 sm:px-6 sm:py-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">
                      Phases
                    </p>
                    <p className="mt-1.5 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">
                      Du diagnostic à l&apos;ajustement.
                    </p>

                    <div className="mt-4 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:p-3.5">
                      <div className="relative">
                        <div className="pointer-events-none absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                        <ul className="flex flex-col gap-2 py-1">
                          {features.map((feature) => {
                            const isActive = activeFeature === feature
                            const insight = phaseInsights[feature]
                            return (
                              <li key={feature}>
                                <button
                                  type="button"
                                  onClick={() => selectFeature(feature)}
                                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                                    isActive
                                      ? "border border-white/[0.12] bg-white/[0.07] shadow-sm"
                                      : "border border-transparent hover:bg-white/[0.04]"
                                  }`}
                                  aria-pressed={isActive}
                                  aria-label={`Phase ${insight.step} — ${feature}`}
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
                                    {feature}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Séparateur */}
                  <div className="hidden bg-white/[0.08] lg:block" aria-hidden />

                  {/* Droite — insight + graphique */}
                  <div className="border-t border-white/[0.08] px-5 py-5 sm:px-6 sm:py-6 lg:border-t-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">
                      {active.metricLabel}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-[#E6D6C3] sm:text-[1.65rem]">
                        {active.metricValue}
                      </p>
                      {active.metricSecondary ? (
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C9B8A5]/65">
                            {active.metricSecondary.label}
                          </span>
                          <span className="font-mono text-base font-semibold tabular-nums tracking-tight text-[#E6B08C] sm:text-lg">
                            {active.metricSecondary.value}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-sm font-semibold leading-snug tracking-tight text-[#E6D6C3] sm:text-base">
                      {active.headline}
                    </h2>
                    <p className="mt-2 text-xs leading-relaxed text-[#C9B8A5]/80 sm:text-sm">{active.outcome}</p>

                    <div className="mt-5">
                      <HeroPhaseVisual phase={activeFeature} />
                    </div>
                  </div>
                </div>

                {/* Pied partagé */}
                <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] px-5 py-4 sm:px-6">
                  <Link
                    href={`/#phase-${HERO_FEATURE_PHASE_BY_LABEL[activeFeature]}`}
                    onClick={(e) => {
                      if (typeof window === "undefined" || window.location.pathname !== "/") return
                      e.preventDefault()
                      navigateToApprochePhase(HERO_FEATURE_PHASE_BY_LABEL[activeFeature])
                    }}
                    className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                  >
                    EXPLORER CETTE PHASE
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                    className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                  >
                    Démo
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .hero-wow-border {
          background: conic-gradient(
            from 120deg,
            rgba(230, 214, 195, 0.9),
            rgba(230, 176, 140, 0.9),
            rgba(255, 255, 255, 0.25),
            rgba(230, 214, 195, 0.9)
          );
          filter: drop-shadow(0 18px 55px rgba(0, 0, 0, 0.45));
          animation: heroWowSpin 10s linear infinite;
        }

        .hero-wow-shimmer {
          background: radial-gradient(700px 300px at 20% 15%, rgba(230, 214, 195, 0.16), transparent 60%),
            radial-gradient(500px 240px at 85% 40%, rgba(230, 176, 140, 0.12), transparent 55%),
            linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.06) 35%, transparent 70%);
          transform: translateX(-22%);
          animation: heroWowShimmer 6s ease-in-out infinite;
        }

        .hero-wow-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
          background-size: 160px 160px;
        }

        @keyframes heroWowSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes heroWowShimmer {
          0% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
          50% {
            transform: translateX(12%);
            opacity: 0.75;
          }
          100% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-wow-border,
          .hero-wow-shimmer {
            animation: none;
          }

          .hero-wow-shimmer {
            opacity: 0.45;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
