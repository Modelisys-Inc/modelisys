"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { Handshake, Layers, Shield, Sparkles, Users, Zap } from "lucide-react"

const BENEFIT_IDS = ["conseiller", "productivite", "collaboration", "donnees", "ia", "image"] as const
type BenefitId = (typeof BENEFIT_IDS)[number]

const benefits: Record<
  BenefitId,
  {
    icon: ComponentType<{ className?: string }>
    listLabel: string
    title: string
    description: string
    /** Complète le paragraphe : angles concrets pour le cabinet */
    highlights: readonly [string, string, string]
  }
> = {
  conseiller: {
    icon: Handshake,
    listLabel: "Conseiller",
    title: "Renforcer votre rôle de conseiller",
    description:
      "Vous intervenez sur des analyses, budgets et scénarios à partir des mêmes données que votre client : des échanges plus factuels et des recommandations mieux ancrées dans sa réalité financière.",
    highlights: [
      "Une seule base de vérité avec la PME pour cadrer budgets et scénarios.",
      "Des recommandations appuyées sur des chiffres et hypothèses déjà alignées.",
      "Des discussions de comité plus directes, avec moins de requalification des données.",
    ],
  },
  productivite: {
    icon: Zap,
    listLabel: "Productivité",
    title: "Gagner en productivité sur les missions",
    description:
      "Moins de ressaisie, moins de fichiers éparpillés : états consolidés, historiques et indicateurs exploitables pour accélérer certification, revues et livrables.",
    highlights: [
      "Accès aux états, ratios et historiques sans reconstituer des classeurs.",
      "Comparatifs et périodes prêts pour certification et revues intermédiaires.",
      "Plus de temps sur l’analyse et la conclusion, moins sur la collecte.",
    ],
  },
  collaboration: {
    icon: Users,
    listLabel: "Collaboration",
    title: "Collaborer clairement avec la PME",
    description:
      "Un espace partagé pour les échanges, les notes et les pièces : moins d'allers-retours opaques, plus de traçabilité pour votre cabinet et votre client.",
    highlights: [
      "Notes et pièces rattachées au bon contexte (période, compte, sujet).",
      "Fil d’échanges lisible pour votre équipe et le dirigeant.",
      "Moins de demandes « dans le vide » : le dossier porte déjà la matière.",
    ],
  },
  donnees: {
    icon: Layers,
    listLabel: "Données & mandats",
    title: "Une base de données au service du cabinet",
    description:
      "Données structurées, benchmarks internes et vues groupe quand vos clients ont plusieurs entités : vous capitalisez sur l'information au fil des mandats.",
    highlights: [
      "Lectures cohérentes d’un mandat à l’autre, sans tout reconstruire.",
      "Vues multi-entités lorsque le client est en structure groupe.",
      "Réutilisation de l’historique pour benchmarks et revues récurrentes.",
    ],
  },
  ia: {
    icon: Sparkles,
    listLabel: "IA",
    title: "L'IA au service de vos missions",
    description:
      "L'IA dans Modelisys vous fait gagner du temps sur ce qui pèse dans un mandat : repérer des écarts, résumer des évolutions, proposer des pistes d'analyse à partir des données du client — pour arriver plus vite à des questions pertinentes et à des livrables utiles, sans remplacer votre expertise.",
    highlights: [
      "Moins de temps à compiler et à relire : l'IA met en avant écarts, tendances et zones à creuser.",
      "Préparation de missions plus rapide : synthèses et angles d'analyse issus des chiffres réellement dans le dossier.",
      "Utile en certification comme en conseil : même base, moins de friction entre la donnée et votre jugement métier.",
    ],
  },
  image: {
    icon: Shield,
    listLabel: "Image & confiance",
    title: "Moderniser l'image de votre cabinet",
    description:
      "Répondre aux attentes des dirigeants en matière d'outils et de réactivité, tout en gardant le contrôle sur la qualité du service et la relation de confiance.",
    highlights: [
      "Une expérience à la hauteur des attentes en matière d’outils financiers.",
      "Réponses plus rapides sur les questions chiffrées, sans bricolage.",
      "Qualité du conseil et relation de confiance : vous gardez la main.",
    ],
  },
}

export function CabinetsPartnerBenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const panelWrapperRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const mFiligraneRef = useRef<HTMLSpanElement>(null)
  const [mTopPx, setMTopPx] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeBenefit, setActiveBenefit] = useState<BenefitId>("conseiller")

  const active = benefits[activeBenefit]

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )

    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveBenefit((current) => {
        const idx = BENEFIT_IDS.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % BENEFIT_IDS.length
        return BENEFIT_IDS[nextIdx]
      })
    }, 10000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <section id="cabinet-partner-benefits" ref={sectionRef} className="scroll-mt-24 relative z-10 overflow-visible">
      {/* Même fond que la section « Cabinet » (cabinets-pillars) pour une couleur continue */}
      <div aria-hidden className="relative z-20 h-16 overflow-hidden sm:h-20">
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
          <div className="absolute left-1/2 top-1/2 h-[min(8rem,50vw)] w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/20 blur-3xl" />
        </div>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-full w-full"
        >
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#2A2F3A"
          />
        </svg>
      </div>

      <div className="relative overflow-visible pt-10 sm:pt-14">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="relative bg-[#2A2F3A]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.45]"
                aria-hidden
                style={{
                  backgroundImage: `linear-gradient(rgb(255 255 255 / 0.055) 1px, transparent 1px),
                    linear-gradient(90deg, rgb(255 255 255 / 0.055) 1px, transparent 1px)`,
                  backgroundSize: "44px 44px",
                }}
              />
            </div>
            <div className="relative bg-[#1F2430]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.4]"
                aria-hidden
                style={{
                  backgroundImage: `linear-gradient(rgb(255 255 255 / 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgb(255 255 255 / 0.05) 1px, transparent 1px)`,
                  backgroundSize: "44px 44px",
                }}
              />
            </div>
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-20 -right-28 h-[480px] w-[480px] rounded-full bg-black/25 blur-3xl" />
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-8 pb-8 sm:px-12 sm:pb-12 lg:px-16 xl:px-20">
          <div
            className={`mb-12 transition-all duration-1000 sm:mb-16 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <p className="mb-3 text-sm font-semibold tracking-wide text-slate-200">Bénéfices</p>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
              Ce que gagne votre cabinet avec{" "}
              <span className="text-[#C9B8A5]/95">Modelisys</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
              Rejoindre l&apos;écosystème Modelisys, c&apos;est offrir à votre cabinet des leviers concrets : meilleure
              efficacité sur les dossiers, relation client plus fluide et services d&apos;accompagnement financier plus
              solides — sans sacrifier les standards de la profession.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
          </div>

          <div
            className={`grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start transition-all duration-1000 delay-150 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            {/* Carte liste — même principe que « Profils » (Pour qui) */}
            <div className="flex w-full justify-center">
              <div className="relative w-full max-w-[320px] sm:max-w-[340px]">
                <div className="absolute inset-0 -z-20 rounded-[44px] bg-black/45 blur-2xl" />

                <div className="absolute inset-0 -z-10 rounded-[44px] p-[1px] wow-border">
                  <div className="h-full w-full rounded-[43px] bg-[#141823]" />
                </div>

                <div className="relative overflow-hidden rounded-[42px] border-2 border-[#E6D6C3]/55 bg-[#141823] shadow-2xl">
                  <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />
                  <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6D6C3]/30" />
                  <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6B08C]/15" />
                  <div className="pointer-events-none absolute inset-0 rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/12" />

                  <div className="px-5 py-6">
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-wide text-[#E6D6C3]/95">Bénéfices</p>
                      <p className="mt-1 text-[10px] text-[#C9B8A5]/70">Ce que le cabinet en retire.</p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="relative min-h-[220px] sm:min-h-[240px]">
                        <div className="pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-[#E6D6C3]/35 via-white/10 to-[#E6B08C]/30" />
                        <ul className="flex flex-col gap-2 py-1">
                          {BENEFIT_IDS.map((id) => {
                            const isActive = activeBenefit === id
                            const { listLabel } = benefits[id]
                            return (
                              <li key={id} className="scroll-mt-28">
                                <button
                                  type="button"
                                  onClick={() => setActiveBenefit(id)}
                                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition ${
                                    isActive ? "border border-white/10 bg-white/[0.06]" : "hover:bg-white/[0.03]"
                                  }`}
                                  aria-pressed={isActive}
                                >
                                  <span className="relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
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
                                    {listLabel}
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

            {/* Panneau droit — filigrane m. : même principe que login (bas du m = bas du titre h2, -left-3 / sm:-left-4) */}
            <div className="relative flex w-full justify-center lg:min-h-[380px]">
              <div className="relative z-10 w-full max-w-lg" aria-live="polite" aria-atomic="true">
                <div className="relative isolate lg:mt-4">
                  <div className="relative">
                    {/* Hauteur = celle du h2 : le bas du filigrane est aligné sur le bas du libellé (Productivité, etc.) — taille ~2× login */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute bottom-0 -left-3 hidden select-none font-semibold leading-none tracking-tight text-white/[0.055] sm:-left-4 lg:block text-[clamp(14rem,min(64vw,48vh),27.5rem)] sm:text-[clamp(17rem,min(56vw,52vh),28rem)]"
                    >
                      m<span className="text-[#E0742D]/35">.</span>
                    </div>
                    <h2 className="relative z-10 text-lg font-semibold tracking-tight text-[#E6D6C3] sm:text-xl">
                      {active.listLabel}
                    </h2>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-semibold leading-snug text-[#E6D6C3]">{active.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#C9B8A5]/80">{active.description}</p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C9B8A5]/70">Points concrets</p>
                  <ul className="mt-3 space-y-3">
                    {active.highlights.map((line) => (
                      <li key={line} className="flex items-start gap-3 text-[11px] font-medium leading-relaxed tracking-wide text-[#E6D6C3]/95 sm:text-xs">
                        <span className="relative mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
                          <span className="absolute h-2 w-2 rounded-full bg-[#E6B08C]" />
                          <span className="absolute h-5 w-5 rounded-full border border-white/10 bg-white/[0.02]" />
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden className="relative z-20 h-16 overflow-hidden bg-[#1F2430] sm:h-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -bottom-8 left-1/3 h-56 w-56 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
          </div>
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-full w-full"
          >
            <path
              d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
              fill="#F8FAFC"
            />
          </svg>
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
