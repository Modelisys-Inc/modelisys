"use client"

import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { scrollToApprocheSection } from "@/lib/approche-navigation"

const AUDIENCE_ORDER = ["entreprises", "conseils", "financiers"] as const
type AudienceId = (typeof AUDIENCE_ORDER)[number]

const audienceLabels: Record<AudienceId, string> = {
  entreprises: "Entreprises",
  conseils: "Partenaires comptables",
  financiers: "Partenaires financiers",
}

type AudienceContent = {
  description: string
  listLabel: string
  items: readonly string[]
  example: { label: string; text: string }
  ctaKind: "hash" | "route"
  ctaTarget: string
  ctaLabel: string
}

const audienceContent: Record<AudienceId, AudienceContent> = {
  entreprises: {
    description:
      "Les dirigeants structurent un parcours clair pour mesurer, piloter et augmenter la valeur de leur entreprise — du diagnostic initial au suivi continu.",
    listLabel: "Dans le parcours",
    items: [
      "Diagnostic & évaluation de la valeur",
      "Vision & objectif chiffré",
      "Planification de scénarios",
      "Exécution & suivi mensuel",
      "Ajustement continu",
    ],
    example: {
      label: "Exemple",
      text: "Un dirigeant ancre son parcours à 4,2 M$, fixe un objectif de 7 M$ en 3 ans, modélise une acquisition et une fermeture de division, puis suit chaque mois l'écart entre le réel et le scénario — pour ajuster sans repartir de zéro.",
    },
    ctaKind: "hash",
    ctaTarget: "approche-modelisys",
    ctaLabel: "DÉCOUVRIR LE PARCOURS",
  },
  conseils: {
    description:
      "Les cabinets accompagnent leurs clients PME sur le même parcours en trois phases — avec des chiffres structurés, défendables et exploitables ensemble.",
    listLabel: "Au service du client",
    items: [
      "Diagnostic & évaluation initiale",
      "Vision, scénarios et planification",
      "Pilotage, écarts et recalibrage",
    ],
    example: {
      label: "Exemple",
      text: "Le cabinet structure le diagnostic d'un client, l'aide à formaliser sa vision de valeur, puis collabore sur les projections et le suivi mensuel — un langage commun autour de la trésorerie, des risques et de la trajectoire.",
    },
    ctaKind: "route",
    ctaTarget: "/cabinets-comptables",
    ctaLabel: "EXPLORER L'OFFRE CABINETS",
  },
  financiers: {
    description:
      "Les partenaires financiers s'appuient sur un parcours documenté pour analyser, financer et suivre la valeur des PME — avec des données à jour et des scénarios explicites.",
    listLabel: "Dans la relation",
    items: [
      "Lecture du diagnostic & des risques",
      "Compréhension de la vision",
      "Analyse des projections",
      "Surveillance de l'exécution",
      "Suivi des ajustements",
    ],
    example: {
      label: "Exemple",
      text: "Un investisseur consulte le diagnostic et la vision chiffrée d'une PME, évalue la trajectoire de valeur et le potentiel de rendement à l'acquisition, puis suit l'évolution réelle versus le scénario modélisé — pour investir avec des chiffres, pas des intuitions.",
    },
    ctaKind: "route",
    ctaTarget: "/partenaires-financiers",
    ctaLabel: "EXPLORER L'OFFRE FINANCIERS",
  },
}

function AudienceItemsList({
  label,
  items,
  example,
}: {
  label: string
  items: readonly string[]
  example: { label: string; text: string }
}) {
  return (
    <div className="mt-8 max-w-xl border-t border-white/[0.08] pt-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9B8A5]/65">{label}</p>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#C9B8A5]/85 sm:text-[15px]">
            <span className="mt-[0.6rem] h-px w-3 shrink-0 bg-[#E0742D]/55" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-l border-[#E0742D]/35 pl-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#C9B8A5]/55">{example.label}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#E6D6C3]/88 sm:text-[15px]">{example.text}</p>
      </div>
    </div>
  )
}

export function LandingAudiencesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeAudience, setActiveAudience] = useState<AudienceId>("entreprises")
  const [autoRotate, setAutoRotate] = useState(true)

  const selectAudience = (id: AudienceId) => {
    setActiveAudience(id)
    setAutoRotate(false)
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
      setActiveAudience((current) => {
        const idx = AUDIENCE_ORDER.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % AUDIENCE_ORDER.length
        return AUDIENCE_ORDER[nextIdx]
      })
    }, 10000)

    return () => window.clearInterval(interval)
  }, [autoRotate])

  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash.slice(1)
      if (!raw.startsWith("audience-")) return
      const key = raw.slice("audience-".length)
      if (key === "entreprises" || key === "conseils" || key === "financiers") {
        selectAudience(key)
      }
    }
    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
  }, [])

  const active = audienceContent[activeAudience]

  return (
    <section id="pour-qui" ref={sectionRef} className="relative scroll-mt-36 z-10 overflow-x-clip">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-[#2A2F3A] lg:border-r lg:border-white/5" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24 pointer-events-auto">
        <div
          className={`flex flex-col gap-12 sm:gap-14 lg:grid lg:grid-cols-2 lg:gap-10 xl:gap-14 2xl:gap-16 lg:items-start pt-10 pb-12 sm:pt-14 sm:pb-14 lg:pt-16 lg:pb-16 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Colonne 2 — intro + carte Profils */}
          <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:pl-4 xl:pl-8 2xl:pl-10">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              Pour qui
            </p>
            <h2 className="mt-5 max-w-full text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
              Le même parcours en trois phases,{" "}
              <span className="text-[#C9B8A5]/95">quel que soit votre rôle</span>
            </h2>
            <p className="mt-4 max-w-full text-base leading-[1.65] text-[#C9B8A5]/85 sm:text-lg">
              Modelisys accompagne dirigeants, cabinets et partenaires financiers autour d&apos;un langage commun —
              mesurer, piloter et augmenter la valeur de l&apos;entreprise.
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">Profils</p>
                      <p className="mt-2 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">
                        Qui utilise Modelisys.
                      </p>
                    </div>

                    <div className="mt-4 sm:mt-5 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 sm:p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                      <div className="relative">
                        <div className="pointer-events-none absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                        <ul className="flex flex-col gap-2 py-2 sm:gap-2.5 sm:py-2.5">
                          {AUDIENCE_ORDER.map((id) => {
                            const isActive = activeAudience === id
                            return (
                              <li key={id} id={`audience-${id}`} className="scroll-mt-28">
                                <button
                                  type="button"
                                  onClick={() => selectAudience(id)}
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

          {/* Colonne 1 — profil sélectionné */}
          <div
            className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:pr-4 xl:pr-8 2xl:pr-10"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              Profil sélectionné
            </p>
            <h3 className="mt-5 max-w-xl text-2xl font-semibold leading-snug tracking-tight text-[#E6D6C3] sm:text-[1.65rem]">
              {audienceLabels[activeAudience]}
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-[1.7] text-[#C9B8A5]/80 sm:text-[15px]">{active.description}</p>

            <AudienceItemsList label={active.listLabel} items={active.items} example={active.example} />

            <div className="mt-8">
              {active.ctaKind === "hash" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (active.ctaTarget === "approche-modelisys") {
                      scrollToApprocheSection()
                      return
                    }
                    document.getElementById(active.ctaTarget)?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                >
                  {active.ctaLabel}
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </button>
              ) : (
                <Link
                  href={active.ctaTarget}
                  className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                >
                  {active.ctaLabel}
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden className="relative h-16 overflow-hidden bg-[#2A2F3A] sm:h-20">
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
