"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"

const NAME_PILLARS = [
  {
    id: "modelisation" as const,
    label: "Modélisation",
    description:
      "Transformer les chiffres bruts en modèles financiers qui permettent de comprendre le passé, piloter le présent et anticiper l’avenir.",
    footer: "Des données structurées, une lecture partagée.",
  },
  {
    id: "analyse" as const,
    label: "Analyse",
    description:
      "Aller au-delà du reporting pour révéler ce que les données financières disent vraiment — les tendances, les risques, les opportunités cachées.",
    footer: "Voir clair là où d’autres voient seulement des chiffres.",
  },
  {
    id: "ecosysteme" as const,
    label: "Écosystème",
    description:
      "Un environnement financier complet et intégré — états financiers, consolidation, budget, valorisation, trésorerie — dans une seule plateforme cohérente.",
    footer: "Une suite qui parle le même langage partout.",
  },
] as const

type PillarId = (typeof NAME_PILLARS)[number]["id"]

export function AboutHeroSection() {
  const [visible, setVisible] = useState(false)
  const [activePillar, setActivePillar] = useState<PillarId>("modelisation")
  const sectionRef = useRef<HTMLElement>(null)

  const activeContent = NAME_PILLARS.find((p) => p.id === activePillar) ?? NAME_PILLARS[0]

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) setVisible(true)
      },
      { threshold: 0.08, rootMargin: "0px 0px -60px 0px" },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => {
      setActivePillar((cur) => {
        const idx = NAME_PILLARS.findIndex((p) => p.id === cur)
        const next = (idx + 1) % NAME_PILLARS.length
        return NAME_PILLARS[next]!.id
      })
    }, 5500)
    return () => window.clearInterval(t)
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
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
        <div className="relative py-16 sm:py-24 lg:py-28 xl:py-32 min-h-0 lg:min-h-[min(88vh,920px)] flex flex-col gap-12 sm:gap-14 lg:gap-0 lg:grid lg:grid-cols-3 lg:gap-8 xl:gap-12 2xl:gap-14 lg:items-stretch">
          {/* Gauche — col 1 */}
          <div
            className={`order-1 lg:order-none lg:col-start-1 lg:row-start-1 max-w-xl lg:max-w-none lg:pr-2 xl:pr-6 2xl:pr-8 transition-all duration-1000 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              À propos
            </p>

            <h2 className="mt-8 sm:mt-10 max-w-xl text-3xl font-semibold leading-tight tracking-tight text-[#E6D6C3] sm:text-4xl lg:text-[2.35rem] lg:leading-[1.12]">
              Un nom qui dit exactement ce que nous faisons
            </h2>

            <p className="mt-6 max-w-xl text-sm leading-[1.65] text-[#C9B8A5]/88 sm:text-[15px]">
              Modelisys n&apos;est pas un nom inventé au hasard. Chaque syllabe porte un sens — celui de notre
              engagement envers une PME financièrement plus intelligente, plus rigoureuse et plus intégrée.
            </p>

            <div className="mt-9 sm:mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                ÉCHANGER AVEC NOUS
                <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
              </Link>

              <span className="hidden sm:block h-px w-10 shrink-0 bg-white/[0.12]" aria-hidden />

              <a
                href="#histoire"
                className="inline-flex items-center gap-2 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                NOTRE HISTOIRE
                <span className="inline-block h-px w-10 bg-[#E0742D]/90" />
              </a>
            </div>
          </div>

          {/* Droite — ordre 3 mobile ; col 3 desktop */}
          <div
            className={`order-3 lg:order-none lg:col-start-3 lg:row-start-1 relative lg:pl-2 xl:pl-6 2xl:pl-8 transition-all duration-1000 delay-150 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="absolute -top-8 right-0 hidden xl:block text-[64px] xl:text-[76px] 2xl:text-[84px] font-semibold tracking-tight text-white/[0.045] select-none pointer-events-none">
              modelisys<span className="text-[#E0742D]/30">.</span>
            </div>

            <div className="max-w-md mx-auto lg:mx-0 lg:max-w-none lg:w-full">
              <div className="flex items-center justify-end pb-4">
                <a
                  href="#equipe"
                  className="group inline-flex items-center gap-3 rounded-md px-1 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/45"
                >
                  L&apos;ÉQUIPE FONDATRICE
                  <span className="relative h-px w-12 bg-[#E0742D]/75 transition group-hover:w-14 group-hover:bg-[#E0742D]" />
                </a>
              </div>

              <h2 className="mt-7 lg:mt-10 text-base sm:text-[17px] font-semibold leading-snug tracking-tight text-[#E6D6C3]">
                {activeContent.label}.
              </h2>
              <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-[#C9B8A5]/80">{activeContent.description}</p>

              <p className="mt-8 border-t border-white/[0.06] pt-6 text-[11px] leading-relaxed text-[#C9B8A5]/65">
                {activeContent.footer}
              </p>
            </div>
          </div>

          {/* Centre — carte Origine (3 points seulement : hauteur au contenu, pas celle du hero landing) */}
          <div
            className={`order-2 lg:order-none lg:col-start-2 lg:row-start-1 relative z-20 mx-auto flex w-full max-w-[280px] sm:max-w-[300px] md:max-w-[320px] h-auto lg:max-w-[min(100%,340px)] xl:max-w-[360px] shrink-0 lg:justify-self-center lg:self-center lg:px-2 xl:px-3 lg:pt-1 pointer-events-auto select-none transition-all duration-1000 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="relative mx-auto flex h-auto w-full flex-col">
              <div className="pointer-events-none absolute inset-0 -z-20 rounded-[40px] sm:rounded-[44px] bg-black/50 blur-2xl scale-[1.02]" />

              <div className="pointer-events-none absolute inset-0 -z-10 rounded-[40px] sm:rounded-[44px] p-px about-wow-border">
                <div className="h-full w-full rounded-[39px] sm:rounded-[43px] bg-[#141823]" />
              </div>

              <div className="group relative flex flex-col overflow-hidden rounded-[38px] sm:rounded-[42px] border border-[#E6D6C3]/45 bg-[#141823] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(230,214,195,0.12)_inset]">
                <div className="pointer-events-none absolute inset-0 opacity-70 about-wow-shimmer" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay about-wow-noise" />

                <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6D6C3]/25" />
                <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6B08C]/12" />
                <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/10" />

                <div className="flex flex-col px-5 py-6 sm:px-6 sm:py-7">
                  <div className="flex flex-col">
                    <div className="shrink-0 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">
                        L&apos;origine du nom
                      </p>
                      <p className="mt-2 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">
                        Modélisation · Analyse · Écosystème
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 sm:p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                      <div className="relative shrink-0">
                        <div className="pointer-events-none absolute left-[19px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                        <ul className="flex flex-col gap-0.5 py-0.5">
                          {NAME_PILLARS.map((p, idx) => {
                            const isActive = activePillar === p.id
                            return (
                              <li
                                key={p.id}
                                className="about-wow-item"
                                style={{ ["--d" as never]: `${120 + idx * 70}ms` } as never}
                              >
                                <button
                                  type="button"
                                  onClick={() => setActivePillar(p.id)}
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
                                    {p.label}
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>

                    <p className="mt-4 border-t border-white/[0.06] pt-4 text-center text-[10px] leading-relaxed text-[#C9B8A5]/55">
                      Trois syllabes pour dire comment nous pensons la finance des PME.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .about-wow-border {
          background: conic-gradient(
            from 120deg,
            rgba(230, 214, 195, 0.9),
            rgba(230, 176, 140, 0.9),
            rgba(255, 255, 255, 0.25),
            rgba(230, 214, 195, 0.9)
          );
          filter: drop-shadow(0 18px 55px rgba(0, 0, 0, 0.45));
          animation: aboutWowSpin 10s linear infinite;
        }
        .about-wow-shimmer {
          background: radial-gradient(700px 300px at 20% 15%, rgba(230, 214, 195, 0.16), transparent 60%),
            radial-gradient(500px 240px at 85% 40%, rgba(230, 176, 140, 0.12), transparent 55%),
            linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.06) 35%, transparent 70%);
          transform: translateX(-22%);
          animation: aboutWowShimmer 6s ease-in-out infinite;
        }
        .about-wow-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
          background-size: 160px 160px;
        }
        .about-wow-item {
          opacity: 0;
          transform: translateY(8px);
          animation: aboutWowIn 700ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          animation-delay: var(--d);
        }
        @keyframes aboutWowSpin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes aboutWowShimmer {
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
        @keyframes aboutWowIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .about-wow-border,
          .about-wow-shimmer,
          .about-wow-item {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </section>
  )
}
