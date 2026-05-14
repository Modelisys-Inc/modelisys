"use client"

import { useEffect, useRef, useState } from "react"

const BENEFIT_IDS = ["commun", "revues", "groupes", "donnees", "ia", "cadre"] as const
type BenefitId = (typeof BENEFIT_IDS)[number]

const benefits: Record<
  BenefitId,
  {
    listLabel: string
    title: string
    description: string
    highlights: readonly [string, string, string]
  }
> = {
  commun: {
    listLabel: "Base commune",
    title: "Une base commune avec la PME",
    description:
      "Vos équipes métiers, risque et relation client s'appuient sur les mêmes états, ratios et scénarios que le dirigeant : les arbitrages portent sur le fond (risque, capacité de remboursement, plan d'action) plutôt que sur la réconciliation de fichiers.",
    highlights: [
      "Un seul référentiel financier partagé avec la PME pour cadrer les échanges.",
      "Moins de débats sur « quelle version des chiffres » : plus de temps sur la décision.",
      "Des comités et instances internes nourris par la même matière que le client.",
    ],
  },
  revues: {
    listLabel: "Revues & comités",
    title: "Revues et comités mieux préparés",
    description:
      "Historiques, budgets, écarts commentés et pièces rattachées : accélérez les revues de dossier, le suivi d'engagements et la production de synthèses pour vos instances internes ou réglementaires.",
    highlights: [
      "Pièces et notes rattachées au bon contexte (période, compte, sujet).",
      "Historiques, comparatifs et écarts prêts pour les revues périodiques et le suivi.",
      "Synthèses prêtes à partager pour risque, crédit ou investissement.",
    ],
  },
  groupes: {
    listLabel: "Groupes & filiales",
    title: "Groupes, filiales et périmètres complexes",
    description:
      "Vues consolidées, comparaisons entre entités et signaux utiles au pilotage du risque et de la performance — pour les grandes PME, les holdings et les dossiers multi-établissements.",
    highlights: [
      "Lecture groupe sans reconstituer des consolidations manuelles à chaque fois.",
      "Signaux par entité et au niveau consolidé pour structurer le risque.",
      "Cohérence des analyses d'un établissement ou d'une ligne métier à l'autre.",
    ],
  },
  donnees: {
    listLabel: "Données structurées",
    title: "Données structurées, moins de ressaisie",
    description:
      "Une source unique alimente analyses, modèles internes et livrables : vos équipes capitalisent sur l'information au fil des interactions avec la PME, sans multiplier les versions hors outil.",
    highlights: [
      "Exports et réutilisation des indicateurs sans ressaisie depuis des classeurs parallèles.",
      "Continuité du dossier entre mandats, équipes et exercices.",
      "Moins de friction entre la donnée « officielle » et vos outils internes.",
    ],
  },
  ia: {
    listLabel: "IA",
    title: "IA au service de vos analystes",
    description:
      "Suggestions et synthèses à partir des données réellement dans Modelisys — pour prioriser les questions, préparer les revues et documenter sans déconnecter le jugement professionnel ni la responsabilité de votre organisation.",
    highlights: [
      "Pistes et synthèses ancrées dans les états et l'historique du dossier client.",
      "Priorisation des zones à creuser sans remplacer la validation métier.",
      "Préparation de revues plus rapide, avec traçabilité des hypothèses.",
    ],
  },
  cadre: {
    listLabel: "Cadre & conformité",
    title: "Cadre compatible avec vos exigences",
    description:
      "Traçabilité, habilitations et documentation structurée pour soutenir vos politiques internes, de sous-traitance et de maîtrise des risques — tout en restant alignés sur la réalité opérationnelle du client.",
    highlights: [
      "Documentation et habilitations compatibles avec vos cadres internes.",
      "Piste d'audit plus lisible entre données, notes et décisions.",
      "Alignement risque / conformité / relation client sur une base commune.",
    ],
  },
}

export function InstitutionalPartnersBenefitsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeBenefit, setActiveBenefit] = useState<BenefitId>("commun")

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
    <section id="financial-partner-benefits" ref={sectionRef} className="scroll-mt-24 relative z-10 overflow-visible">
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
              Ce que gagnent les partenaires financiers avec{" "}
              <span className="text-[#C9B8A5]/95">Modelisys</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
              Renforcer la qualité de l&apos;analyse, fluidifier la relation avec les PME et déployer une offre
              différenciante — avec une plateforme conçue pour la donnée financière structurée, la collaboration et les
              usages encadrés d&apos;intelligence artificielle.
            </p>
            <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
          </div>

          <div
            className={`grid grid-cols-1 items-start gap-12 transition-all duration-1000 delay-150 lg:grid-cols-2 lg:items-start lg:gap-16 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="flex w-full justify-center">
              <div className="relative w-full max-w-[320px] sm:max-w-[340px]">
                <div className="absolute inset-0 -z-20 rounded-[44px] bg-black/45 blur-2xl" />

                <div className="wow-border absolute inset-0 -z-10 rounded-[44px] p-[1px]">
                  <div className="h-full w-full rounded-[43px] bg-[#141823]" />
                </div>

                <div className="relative overflow-hidden rounded-[42px] border-2 border-[#E6D6C3]/55 bg-[#141823] shadow-[0_28px_72px_-18px_rgba(0,0,0,0.62),0_0_0_1px_rgba(230,214,195,0.14)_inset]">
                  <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
                  <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />
                  <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6D6C3]/30" />
                  <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6B08C]/15" />
                  <div className="pointer-events-none absolute inset-0 rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/12" />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#E0742D]/55 to-transparent" />

                  <div className="px-5 py-6">
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-wide text-[#E6D6C3]/95">Bénéfices</p>
                      <p className="mt-1 text-[10px] text-[#C9B8A5]/70">Ce que vous en retirez.</p>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                      <div className="relative min-h-[220px] sm:min-h-[240px]">
                        <div className="pointer-events-none absolute bottom-2 left-[18px] top-2 w-px bg-gradient-to-b from-[#E6D6C3]/35 via-white/10 to-[#E6B08C]/30" />
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
                                    isActive
                                      ? "border border-white/[0.12] bg-white/[0.07] shadow-sm"
                                      : "border border-transparent hover:bg-white/[0.04]"
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

            <div className="relative flex w-full justify-center lg:min-h-[380px]">
              <div className="relative z-10 w-full max-w-lg" aria-live="polite" aria-atomic="true">
                <div className="relative isolate lg:mt-4">
                  <div className="relative">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute bottom-0 -left-3 hidden select-none text-[clamp(14rem,min(64vw,48vh),27.5rem)] font-semibold leading-none tracking-tight text-white/[0.055] sm:-left-4 sm:text-[clamp(17rem,min(56vw,52vh),28rem)] lg:block"
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

                <div className="mt-6 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 sm:p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C9B8A5]/70">
                    Points concrets
                  </p>
                  <ul className="mt-4 space-y-0 text-xs leading-snug text-[#E6D6C3]/90">
                    {active.highlights.map((line, idx) => (
                      <li
                        key={line}
                        className={`flex items-start justify-between gap-3 py-2.5 ${
                          idx < active.highlights.length - 1 ? "border-b border-white/[0.06]" : ""
                        }`}
                      >
                        <span className="pr-2 text-[11px] sm:text-xs font-medium leading-relaxed tracking-wide text-[#E6D6C3]/95">
                          {line}
                        </span>
                        <span
                          className="mt-0.5 inline-flex shrink-0 items-center rounded bg-[#E0742D]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#E6B08C]"
                          aria-hidden
                        >
                          OK
                        </span>
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
