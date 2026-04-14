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
    ctaTarget: "/cabinets-comptables",
  },
  financiers: {
    title: "Analyse & diligence. Crédit & surveillance. Investissement & valorisation. IA.",
    description:
      "Des informations à jour et exploitables pour vos revues, échanges et décisions avec les PME.",
    acteurs: ["Prêteurs", "Firmes d’investissement", "Autres acteurs financiers"],
    ctaKind: "route",
    ctaTarget: "/partenaires-financiers",
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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-3">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#262B36] lg:border-x lg:border-white/5" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24 pointer-events-auto">
        <div
          className={`pt-10 pb-10 sm:pt-14 sm:pb-12 lg:pt-16 lg:pb-14 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">Pour qui</p>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Une plateforme pensée pour{" "}
            <span className="text-[#C9B8A5]/95">tous les acteurs</span> autour de la finance d’entreprise
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-[1.65] text-[#C9B8A5]/85 sm:text-lg">
            Modelisys s’adresse à trois familles d’utilisateurs qui partagent le besoin de chiffres fiables,
            structurés et exploitables ensemble.
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
        </div>

        <div
          className={`flex flex-col gap-12 sm:gap-14 lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-12 2xl:gap-14 lg:items-stretch pb-12 sm:pb-14 lg:pb-16 transition-all duration-1000 delay-150 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Colonne 1 — texte profil (desktop ; masqué sur mobile pour alléger) */}
          <div className="order-1 hidden lg:col-start-1 lg:row-start-1 lg:block lg:order-none lg:pr-2 xl:pr-6 2xl:pr-8">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              Profil sélectionné
            </p>
            <h3 className="mt-6 text-2xl font-semibold leading-snug tracking-tight text-[#E6D6C3] sm:text-[1.65rem]">
              {audienceLabels[activeAudience]}
            </h3>
            <p className="mt-4 max-w-[28rem] text-sm sm:text-[15px] leading-[1.65] text-[#C9B8A5]/85">
              {active.description}
            </p>
            <div className="mt-9">
              {active.ctaKind === "hash" ? (
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById(active.ctaTarget)?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                >
                  {AUDIENCE_CTA_LABEL}
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <Link
                  href={active.ctaTarget}
                  className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                >
                  {AUDIENCE_CTA_LABEL}
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Colonne 3 — détail + Acteurs (DOM avant carte pour grille lg; order mobile 3) */}
          <div
            className="order-3 lg:order-none lg:col-start-3 lg:row-start-1 relative lg:pl-2 xl:pl-6 2xl:pl-8"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="absolute -top-6 right-0 hidden xl:block text-[52px] xl:text-[64px] font-semibold tracking-tight text-white/[0.04] select-none pointer-events-none">
              modelisys<span className="text-[#E0742D]/25">.</span>
            </div>

            <div className="max-w-md mx-auto lg:mx-0 lg:max-w-none lg:w-full">
              <div className="hidden items-center justify-end border-b border-white/[0.06] pb-4 lg:flex">
                <button
                  type="button"
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                  className="group inline-flex items-center gap-3 rounded-md px-1 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/45"
                >
                  FONCTIONNALITÉS
                  <span className="relative h-px w-12 bg-[#E0742D]/75 transition group-hover:w-14 group-hover:bg-[#E0742D]" />
                </button>
              </div>

              <p className="mt-6 text-sm leading-[1.65] text-[#C9B8A5]/85 lg:mt-0 lg:hidden">{active.description}</p>

              <h3 className="mt-6 text-base font-semibold leading-snug tracking-tight text-[#E6D6C3] sm:text-[17px] lg:mt-10">
                {active.title}
              </h3>

              <div className="mt-8 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 sm:p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6D6C3]/95">Acteurs</p>
                <ul className="mt-4 space-y-0 text-xs leading-snug text-[#C9B8A5]/85">
                  {active.acteurs.map((acteur, i) => (
                    <li
                      key={acteur}
                      className={`flex items-center gap-3 py-2.5 ${
                        i < active.acteurs.length - 1 ? "border-b border-white/[0.06]" : ""
                      }`}
                    >
                      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                        <span className="absolute h-2 w-2 rounded-full bg-[#E6B08C]" />
                        <span className="absolute h-5 w-5 rounded-full border border-white/10 bg-white/[0.02]" />
                      </span>
                      <span className="font-medium tracking-wide text-[#E6D6C3]/95">{acteur}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Colonne 2 — carte Profils (alignée carte Fonctionnalités du hero) */}
          <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 flex w-full justify-center lg:justify-self-center lg:self-start lg:px-2 xl:px-3">
            <div className="relative flex w-full max-w-[280px] sm:max-w-[300px] md:max-w-[320px] h-auto min-h-0 lg:max-w-[min(100%,340px)] xl:max-w-[360px] flex-col">
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">Profils</p>
                    <p className="mt-2 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">Qui utilise Modelisys.</p>
                  </div>

                  <div className="mt-4 sm:mt-5 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                      <ul className="flex flex-col gap-1.5 py-0.5 sm:gap-2">
                        {AUDIENCE_ORDER.map((id) => {
                          const isActive = activeAudience === id
                          return (
                            <li key={id} id={`audience-${id}`} className="scroll-mt-28">
                              <button
                                type="button"
                                onClick={() => setActiveAudience(id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition sm:py-2.5 ${
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
