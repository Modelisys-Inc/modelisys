"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

const AUDIENCE_ORDER = ["entreprises", "conseils", "financiers"] as const
type AudienceId = (typeof AUDIENCE_ORDER)[number]

const audienceLabels: Record<AudienceId, string> = {
  entreprises: "Entreprises",
  conseils: "Partenaires conseils",
  financiers: "Partenaires financiers",
}

const AUDIENCE_CTA_LABEL = "Explorez modelisys pour vos besoins"

const audienceContent: Record<
  AudienceId,
  {
    title: string
    description: string
    acteurs: readonly [string, string, string]
    ctaKind: "hash" | "route"
    ctaTarget: string
  }
> = {
  entreprises: {
    title: "Analysez. Projetez. Valorisez. Documentez. Collaborez.",
    description:
      "Une base partagée pour aligner direction, finance et opérations autour de la réalité de vos chiffres.",
    acteurs: ["Organisations de toute taille", "Tous secteurs d’activité", "Directions, finance & équipes"],
    ctaKind: "hash",
    ctaTarget: "problem-solution",
  },
  conseils: {
    title: "Certification. Services-conseils. Base de données. Intelligence artificielle.",
    description:
      "Une plateforme structurée pour faciliter la collaboration et produire des analyses cohérentes pour vos clients.",
    acteurs: ["Cabinets comptables", "Consultants", "Autres conseils"],
    ctaKind: "route",
    ctaTarget: "/landing/cabinets-comptables",
  },
  financiers: {
    title: "Analyse & diligence. Crédit & surveillance. Investissement & valorisation. IA.",
    description:
      "Des informations à jour et exploitables pour vos revues, échanges et décisions avec les PME.",
    acteurs: ["Prêteurs", "Firmes d’investissement", "Autres institutions"],
    ctaKind: "route",
    ctaTarget: "/landing/partenaires-institutionnels",
  },
}

export function LandingAudiencesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeAudience, setActiveAudience] = useState<AudienceId>("entreprises")

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
    const interval = window.setInterval(() => {
      setActiveAudience((current) => {
        const idx = AUDIENCE_ORDER.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % AUDIENCE_ORDER.length
        return AUDIENCE_ORDER[nextIdx]
      })
    }, 10000)

    return () => window.clearInterval(interval)
  }, [])

  /** Synchronise le profil actif avec l’ancre (#audience-entreprises, etc.) depuis le menu. */
  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash.slice(1)
      if (!raw.startsWith("audience-")) return
      const key = raw.slice("audience-".length)
      if (key === "entreprises" || key === "conseils" || key === "financiers") {
        setActiveAudience(key)
      }
    }
    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
  }, [])

  const active = audienceContent[activeAudience]

  return (
    <section id="pour-qui" ref={sectionRef} className="relative scroll-mt-24 z-10 overflow-hidden">
      <div className="absolute inset-0">
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
        <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -right-28 h-[480px] w-[480px] rounded-full bg-black/25 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 pb-8 pt-10 sm:px-12 sm:pb-12 sm:pt-14 lg:px-16 xl:px-20">
        <div
          className={`mb-12 transition-all duration-1000 sm:mb-16 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-200">Pour qui</p>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Une plateforme pensée pour{" "}
            <span className="text-[#C9B8A5]/95">tous les acteurs</span> autour de la finance d’entreprise
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
            Modelisys s’adresse à trois familles d’utilisateurs qui partagent le besoin de chiffres fiables,
            structurés et exploitables ensemble.
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
        </div>

        <div
          className={`grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center transition-all duration-1000 delay-150 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Carte liste — même principe que la carte Fonctionnalités du hero */}
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
                    <p className="text-xs font-semibold tracking-wide text-[#E6D6C3]/95">Profils</p>
                    <p className="mt-1 text-[10px] text-[#C9B8A5]/70">Qui utilise Modelisys.</p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                    <div className="relative min-h-[168px]">
                      <div className="pointer-events-none absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-[#E6D6C3]/35 via-white/10 to-[#E6B08C]/30" />
                      <ul className="flex flex-col gap-2 py-1">
                        {AUDIENCE_ORDER.map((id) => {
                          const isActive = activeAudience === id
                          return (
                            <li key={id} id={`audience-${id}`} className="scroll-mt-28">
                              <button
                                type="button"
                                onClick={() => setActiveAudience(id)}
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
                                  {audienceLabels[id]}
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

          {/* Panneau droit — centré dans le split droit */}
          <div className="relative flex w-full justify-center lg:min-h-[320px]">
            <div
              className="w-full max-w-md"
              aria-live="polite"
              aria-atomic="true"
            >
              <h2 className="text-lg font-semibold tracking-tight text-[#E6D6C3] sm:text-xl lg:mt-4">
                {audienceLabels[activeAudience]}
              </h2>
              <h3 className="mt-3 text-sm font-semibold text-[#E6D6C3]">{active.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#C9B8A5]/75">{active.description}</p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C9B8A5]/70">
                  Acteurs
                </p>
                <ul className="mt-3 space-y-2.5">
                  {active.acteurs.map((acteur) => (
                    <li
                      key={acteur}
                      className="flex items-center gap-3 text-[11px] font-medium tracking-wide text-[#E6D6C3]/95"
                    >
                      <span className="relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center">
                        <span className="absolute h-2 w-2 rounded-full bg-[#E6B08C]" />
                        <span className="absolute h-5 w-5 rounded-full border border-white/10 bg-white/[0.02]" />
                      </span>
                      {acteur}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {active.ctaKind === "hash" ? (
                  <button
                    type="button"
                    onClick={() => {
                      document.getElementById(active.ctaTarget)?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                  >
                    {AUDIENCE_CTA_LABEL}
                    <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : (
                  <Link
                    href={active.ctaTarget}
                    className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                  >
                    {AUDIENCE_CTA_LABEL}
                    <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden className="relative h-16 overflow-hidden bg-[#1F2430] sm:h-20">
        <div className="absolute inset-0 pointer-events-none">
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
