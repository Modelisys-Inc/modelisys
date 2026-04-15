"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { HERO_FEATURE_LABELS, type HeroFeatureLabel } from "@/lib/hero-features"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const features = HERO_FEATURE_LABELS

  type Feature = HeroFeatureLabel

  const [activeFeature, setActiveFeature] = useState<Feature>("Consolidation")

  const featureContent: Record<
    typeof activeFeature,
    { title: string; description: string; keyPoints: string[]; footer: string }
  > = {
    Consolidation: {
      title: "Consolidation multi-entités.",
      description:
        "Une vue consolidée pour expliquer vos écarts, suivre votre trésorerie et partager la même lecture avec vos équipes et actionnaires.",
      keyPoints: ["Consolidation multi-entités", "Éliminations & intercos", "Tableaux consolidés & ratios"],
      footer: "Conçu pour des lectures claires en comité de direction.",
    },
    "Reporting financier": {
      title: "Reporting financier.",
      description:
        "Des rapports propres, cohérents et rapides à produire, avec une lecture uniforme d’un mois à l’autre.",
      keyPoints: ["États financiers & annexes", "Périodes & comparatifs", "Exports & diffusion"],
      footer: "Du reporting prêt à présenter, sans friction.",
    },
    "Analyse financière": {
      title: "Analyse financière.",
      description: "Comprenez la performance en un coup d’œil: marges, ratios, écarts et explications actionnables.",
      keyPoints: ["Ratios & KPI", "Analyse d’écarts", "Performance par segment"],
      footer: "Des insights concrets, plus vite.",
    },
    Projections: {
      title: "Projections & scénarios.",
      description:
        "Anticipez la trésorerie, testez des hypothèses, et construisez des plans robustes pour décider sereinement.",
      keyPoints: ["Budgets & scénarios", "Prévisions de trésorerie", "Sensibilités & hypothèses"],
      footer: "Décider avec des scénarios, pas des intuitions.",
    },
    Valorisation: {
      title: "Valorisation.",
      description: "Structurez vos hypothèses et présentez une valorisation argumentée, cohérente et traçable.",
      keyPoints: ["Hypothèses structurées", "Multiples & DCF", "Synthèse pour partenaires/banque"],
      footer: "Une valorisation défendable, documentée.",
    },
    Documentation: {
      title: "Documentation structurée.",
      description:
        "Centralisez les pièces, justifications et versions pour sécuriser vos analyses et accélérer vos revues.",
      keyPoints: ["Pièces & justificatifs", "Historique & versions", "Traçabilité des changements"],
      footer: "Moins de recherche, plus de certitude.",
    },
    Collaboration: {
      title: "Collaboration.",
      description: "Travaillez en équipe sur la même donnée, avec une lecture commune et des échanges fluides.",
      keyPoints: ["Partage & accès", "Commentaires & suivis", "Lecture commune des KPI"],
      footer: "Aligner les équipes autour des chiffres.",
    },
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveFeature((current) => {
        const idx = features.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % features.length
        return features[nextIdx]
      })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [features])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Split background (inspired by provided reference) */}
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

      <div className="relative z-10 max-w-[1920px] mx-auto px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24 pointer-events-auto">
        <div className="relative py-16 sm:py-24 lg:py-28 xl:py-32 min-h-0 lg:min-h-[min(88vh,920px)] flex flex-col gap-12 sm:gap-14 lg:gap-0 lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-12 2xl:gap-14 lg:items-stretch">
          {/* Left — col 1 desktop */}
          <div
            className={`order-1 lg:order-none lg:col-start-1 lg:row-start-1 max-w-xl lg:max-w-none lg:pr-2 xl:pr-6 2xl:pr-8 transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              Plateforme d&apos;intelligence financière
            </p>

            <h1 className="mt-8 sm:mt-10 flex flex-col font-semibold leading-[0.92] tracking-tight text-[#E6D6C3]">
              <span className="text-[2.5rem] leading-none sm:text-5xl">Analysez.</span>
              <span className="mt-2 sm:mt-2.5 text-5xl leading-none sm:text-6xl">Projetez.</span>
              <span className="mt-2 sm:mt-2.5 text-[2.75rem] leading-none sm:text-7xl">Valorisez.</span>
            </h1>

            <p className="mt-8 sm:mt-10 text-sm sm:text-[15px] leading-[1.65] text-[#C9B8A5]/85 max-w-[28rem]">
              Comprenez votre performance actuelle, projetez vos budgets et flux futurs, simulez différents scénarios et
              mesurez l&apos;impact de chaque décision sur la valeur de votre entreprise.
            </p>

            <div className="mt-9 sm:mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                type="button"
                onClick={() => {
                  const demoSection = document.getElementById("demo")
                  demoSection?.scrollIntoView({ behavior: "smooth" })
                }}
                className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                RÉSERVER UNE DÉMO
                <ArrowRight className="w-4 h-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
              </button>

              <span className="hidden sm:block h-px w-10 shrink-0 bg-white/[0.12]" aria-hidden />

              <button
                type="button"
                onClick={() => {
                  const target = document.getElementById("features")
                  target?.scrollIntoView({ behavior: "smooth" })
                }}
                className="inline-flex items-center gap-2 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                EN SAVOIR PLUS
                <span className="inline-block h-px w-10 bg-[#E0742D]/90" />
              </button>
            </div>
          </div>

          {/* Right — flex order 3 mobile; col 3 desktop */}
          <div
            className={`order-3 lg:order-none lg:col-start-3 lg:row-start-1 relative lg:pl-2 xl:pl-6 2xl:pl-8 transition-all duration-1000 delay-150 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="absolute -top-8 right-0 hidden xl:block text-[64px] xl:text-[76px] 2xl:text-[84px] font-semibold tracking-tight text-white/[0.045] select-none pointer-events-none">
              modelisys<span className="text-[#E0742D]/30">.</span>
            </div>

            <div className="max-w-md mx-auto lg:mx-0 lg:max-w-none lg:w-full">
              <div className="flex items-center justify-end pb-4">
                <button
                  type="button"
                  onClick={() => {
                    const target = document.getElementById("features")
                    target?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="group inline-flex items-center gap-3 rounded-md px-1 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/45"
                >
                  TOUTES LES FONCTIONS
                  <span className="relative h-px w-12 bg-[#E0742D]/75 transition group-hover:w-14 group-hover:bg-[#E0742D]" />
                </button>
              </div>

              <h2 className="mt-7 lg:mt-10 text-base sm:text-[17px] font-semibold leading-snug tracking-tight text-[#E6D6C3]">
                {featureContent[activeFeature].title}
              </h2>
              <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-[#C9B8A5]/80">
                {featureContent[activeFeature].description}
              </p>

              <div className="mt-8 grid grid-cols-1 min-[420px]:grid-cols-[1fr_160px] gap-4 sm:gap-5 items-stretch">
                <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 sm:p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6D6C3]/95">Points clés</p>
                  <div className="mt-4 space-y-0 text-xs leading-snug text-[#C9B8A5]/85">
                    {featureContent[activeFeature].keyPoints.map((point, i) => (
                      <div
                        key={point}
                        className={`flex items-center justify-between gap-3 py-2.5 ${
                          i < featureContent[activeFeature].keyPoints.length - 1 ? "border-b border-white/[0.06]" : ""
                        }`}
                      >
                        <span className="pr-2">{point}</span>
                        <span className="shrink-0 rounded bg-[#E0742D]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#E6B08C]">
                          OK
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.09] bg-[#141823] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.45)] overflow-hidden">
                  <div className="p-3.5 sm:p-4">
                    <div className="h-[5.25rem] rounded-xl bg-white/[0.04] relative overflow-hidden ring-1 ring-white/[0.05]">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#E0742D]/18 to-transparent" />
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 h-1.5 rounded-full bg-white/[0.08]">
                        <div className="h-full w-2/3 rounded-full bg-[#E0742D]" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold tracking-wide text-[#E6D6C3]">Démo</span>
                      <button
                        type="button"
                        onClick={() => {
                          const demoSection = document.getElementById("demo")
                          demoSection?.scrollIntoView({ behavior: "smooth" })
                        }}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-[#E0742D] transition hover:border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/45"
                        aria-label="Ouvrir la démo"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-8 border-t border-white/[0.06] pt-6 text-[11px] leading-relaxed text-[#C9B8A5]/65">
                {featureContent[activeFeature].footer}
              </p>
            </div>
          </div>

          {/* Feature card — flex order 2 mobile; col 2 desktop */}
          <div
            className={`order-2 lg:order-none lg:col-start-2 lg:row-start-1 relative z-20 mx-auto flex w-full max-w-[280px] sm:max-w-[300px] md:max-w-[320px] min-h-[440px] sm:min-h-[480px] md:min-h-[500px] lg:min-h-[min(62vh,620px)] xl:min-h-[min(65vh,680px)] lg:h-full lg:w-full lg:max-w-[min(100%,340px)] xl:max-w-[360px] shrink-0 lg:justify-self-center lg:px-2 xl:px-3 lg:pt-1 pointer-events-auto select-none transition-all duration-1000 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="relative mx-auto flex h-full min-h-0 w-full flex-1 flex-col">
              <div className="pointer-events-none absolute inset-0 -z-20 rounded-[40px] sm:rounded-[44px] bg-black/50 blur-2xl scale-[1.02]" />

              <div className="pointer-events-none absolute inset-0 -z-10 rounded-[40px] sm:rounded-[44px] p-px wow-border">
                <div className="h-full w-full rounded-[39px] sm:rounded-[43px] bg-[#141823]" />
              </div>

              <div className="group relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[38px] sm:rounded-[42px] border border-[#E6D6C3]/45 bg-[#141823] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(230,214,195,0.12)_inset]">
                <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />

                <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6D6C3]/25" />
                <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6B08C]/12" />
                <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/10" />

                <div className="flex h-full min-h-0 flex-1 flex-col px-5 py-7 sm:px-6 sm:py-8">
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="shrink-0 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">Fonctionnalités</p>
                      <p className="mt-2 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">Tout ce qu’il faut pour piloter.</p>
                    </div>

                    <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3.5 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                      <div className="relative min-h-[260px] flex-1 sm:min-h-[300px] lg:min-h-0">
                        <div className="pointer-events-none absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                        <ul className="flex h-full min-h-[240px] flex-col justify-between gap-1 py-1 sm:min-h-[280px] lg:min-h-0">
                          {features.map((item, idx) => {
                            const isActive = activeFeature === item
                            return (
                              <li
                                key={item}
                                className="wow-item"
                                style={
                                  { ["--d" as never]: `${120 + idx * 70}ms` } as never
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => setActiveFeature(item)}
                                  className={`w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left transition sm:py-2.5 ${
                                    isActive
                                      ? "bg-white/[0.07] border border-white/[0.12] shadow-sm"
                                      : "border border-transparent hover:bg-white/[0.04]"
                                  }`}
                                  aria-pressed={isActive}
                                >
                                  <span className="relative inline-flex h-5 w-5 items-center justify-center">
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
                                    {item}
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

        .wow-item {
          opacity: 0;
          transform: translateY(8px);
          animation: wowIn 700ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          animation-delay: var(--d);
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

        @keyframes wowIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wow-border,
          .wow-shimmer,
          .wow-item {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </section>
  )
}
