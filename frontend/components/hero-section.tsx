"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const features = [
    "Consolidation",
    "Reporting financier",
    "Analyse financière",
    "Projections",
    "Valorisation",
    "Documentation",
    "Collaboration",
  ] as const

  type Feature = (typeof features)[number]

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
      <div className="absolute inset-0">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[560px] w-[560px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20">
        <div className="relative py-20 sm:py-28 lg:py-32 min-h-[82vh] flex items-center">
          {/* Center visual (overlapping both columns) */}
          <div
            className={`absolute left-1/2 top-28 bottom-10 sm:top-32 sm:bottom-12 -translate-x-1/2 w-[240px] sm:w-[280px] md:w-[320px] lg:w-[360px] pointer-events-auto select-none transition-all duration-1000 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="relative mx-auto h-full">
              {/* Outer glow */}
              <div className="absolute inset-0 -z-20 rounded-[44px] bg-black/45 blur-2xl" />

              {/* Animated gradient border */}
              <div className="absolute inset-0 -z-10 rounded-[44px] p-[1px] wow-border">
                <div className="h-full w-full rounded-[43px] bg-[#141823]" />
              </div>

              <div className="group relative h-full overflow-hidden rounded-[42px] border-2 border-[#E6D6C3]/55 bg-[#141823] shadow-2xl">
                {/* subtle moving highlight */}
                <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
                {/* noise overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />

                {/* subtle full-beige glow/contour */}
                <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6D6C3]/30" />
                <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6B08C]/15" />
                <div className="pointer-events-none absolute inset-0 rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/12" />

                <div className="h-full px-5 py-6">
                  <div className="mt-1 h-full flex flex-col">
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-wide text-[#E6D6C3]/95">Fonctionnalités</p>
                      <p className="mt-1 text-[10px] text-[#C9B8A5]/70">Tout ce qu’il faut pour piloter.</p>
                    </div>

                    <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="relative h-full">
                        <div className="pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-[#E6D6C3]/35 via-white/10 to-[#E6B08C]/30" />
                        <ul className="h-full flex flex-col justify-between py-1">
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
                                  className={`w-full flex items-center gap-3 rounded-xl px-2 py-1 transition ${
                                    isActive ? "bg-white/[0.06] border border-white/10" : "hover:bg-white/[0.03]"
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

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
            {/* Left panel */}
            <div
              className={`max-w-xl transition-all duration-1000 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <p className="text-sm font-semibold tracking-wide text-slate-200">
                Plateforme d&apos;intelligence financière
              </p>

              <h1 className="mt-10 text-5xl sm:text-6xl font-semibold leading-[0.95] tracking-tight text-[#E6D6C3]">
                La performance
                <br />
                financière
                <br />à portée.
              </h1>

              <p className="mt-10 text-sm sm:text-base leading-relaxed text-[#C9B8A5]/80 max-w-md">
                Transformez vos données comptables en analyse stratégique pour mieux piloter, projetez et créer de la
                valeur dans votre entreprise.
              </p>

              <div className="mt-10 flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => {
                    const demoSection = document.getElementById("demo")
                    demoSection?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                >
                  RÉSERVER UNE DÉMO
                  <ArrowRight className="w-4 h-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </button>

                <span className="h-px w-12 bg-white/10" />

                <button
                  type="button"
                  onClick={() => {
                    const target = document.getElementById("features")
                    target?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                >
                  EN SAVOIR PLUS
                  <span className="inline-block h-px w-10 bg-[#E0742D]" />
                </button>
              </div>
            </div>

            {/* Right panel */}
            <div
              className={`relative transition-all duration-1000 delay-150 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
            >
              <div className="absolute -top-10 right-0 hidden lg:block text-[88px] font-semibold tracking-tight text-white/[0.055] select-none">
                modelisys<span className="text-[#E0742D]/35">.</span>
              </div>

              <div className="max-w-md ml-auto">
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      const target = document.getElementById("features")
                      target?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="group inline-flex items-center gap-3 text-[11px] font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                  >
                    TOUTES LES FONCTIONS
                    <span className="relative h-px w-14 bg-[#E0742D]/80 group-hover:bg-[#E0742D] transition" />
                  </button>
                </div>

                <h2 className="mt-16 text-sm font-semibold text-[#E6D6C3]">
                  {featureContent[activeFeature].title}
                </h2>
                <p className="mt-4 text-xs leading-relaxed text-[#C9B8A5]/75">
                  {featureContent[activeFeature].description}
                </p>

                <div className="mt-10 grid grid-cols-[1fr_160px] gap-4 items-stretch">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-semibold text-[#E6D6C3]">Points clés</p>
                    <div className="mt-3 space-y-2 text-xs text-[#C9B8A5]/80">
                      {featureContent[activeFeature].keyPoints.map((point) => (
                        <div key={point} className="flex items-center justify-between gap-3">
                          <span>{point}</span>
                          <span className="text-[#E6B08C]">OK</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#141823] overflow-hidden">
                    <div className="p-3">
                      <div className="h-20 rounded-xl bg-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#E0742D]/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 h-1.5 rounded-full bg-white/10">
                          <div className="h-full w-2/3 rounded-full bg-[#E0742D]" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#E6D6C3]">Démo</span>
                        <button
                          type="button"
                          onClick={() => {
                            const demoSection = document.getElementById("demo")
                            demoSection?.scrollIntoView({ behavior: "smooth" })
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition"
                          aria-label="Ouvrir la démo"
                        >
                          <ArrowRight className="w-4 h-4 text-[#E0742D]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-10 text-[11px] text-[#C9B8A5]/70">{featureContent[activeFeature].footer}</p>
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
