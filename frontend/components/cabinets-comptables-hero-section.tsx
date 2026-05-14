"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, Handshake } from "lucide-react"

/** Bande sous la hero — actions concrètes sur la plateforme (même style que la barre Insights) */
const CABINET_HERO_MARQUEE = [
  "Accédez aux données financières de vos clients en temps réel.",
  "Soyez proactif avec des analyses toujours à jour.",
  "Intervenez directement dans les données et les projections de vos clients.",
  "Collaborez avec vos clients sur une vision financière commune.",
  "Identifiez rapidement les leviers qui impactent la valeur d'entreprise.",
  "Accompagnez vos clients avec des insights concrets et continus.",
  "Réalisez des mises à jour régulières de la valeur d'entreprise.",
  "Simulez des scénarios financiers et leur impact sur la valeur.",
] as const

export function CabinetsComptablesHeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  const valuePoints = [
    "Portail sécurisé pour vos clients",
    "Analyses à jour, traçables et partagées",
    "Documentation & notes sur les écarts",
    "Prévisions, scénarios & valorisation intégrés",
    "Collaboration cabinet ↔ direction en continu",
  ] as const

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
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

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Split background (same language as landing hero) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-3">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#262B36] lg:border-x lg:border-white/5" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="absolute inset-0">
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
              Partenaires comptables
            </p>

            <h1 className="mt-8 sm:mt-10 flex flex-col font-semibold leading-[0.92] tracking-tight text-[#E6D6C3]">
              <span className="text-5xl leading-none sm:text-6xl">Conseil plus stratégique</span>
            </h1>

            <p className="mt-8 sm:mt-10 text-sm sm:text-[15px] leading-[1.65] text-[#C9B8A5]/85 max-w-[28rem]">
              Centralisez la donnée, structurez l&apos;analyse, et intervenez sur la performance, les budgets, les scénarios
              et la valeur — dans un espace partagé, traçable et sécuritaire.
            </p>

            <div className="mt-9 sm:mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href="/contact"
                className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                CONTACTER L&apos;ÉQUIPE
                <ArrowRight className="w-4 h-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
              </a>

              <span className="hidden sm:block h-px w-10 shrink-0 bg-white/[0.12]" aria-hidden />

              <a
                href="/#demo"
                className="inline-flex items-center gap-2 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                RÉSERVER UNE DÉMO
                <span className="inline-block h-px w-10 bg-[#E0742D]/90" />
              </a>
            </div>
          </div>

          {/* Right — col 3 desktop */}
          <div
            className={`order-3 lg:order-none lg:col-start-3 lg:row-start-1 relative lg:pl-2 xl:pl-6 2xl:pl-8 transition-all duration-1000 delay-150 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="absolute -top-10 right-0 hidden xl:block text-[64px] xl:text-[76px] 2xl:text-[84px] font-semibold tracking-tight text-white/[0.045] select-none pointer-events-none">
              modelisys<span className="text-[#E0742D]/30">.</span>
            </div>

            <div className="max-w-md mx-auto lg:mx-0 lg:max-w-none lg:w-full">
              <div className="flex items-center justify-end pb-4">
                <a
                  href="/contact"
                  className="group inline-flex items-center gap-3 rounded-md px-1 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/45"
                >
                  DISCUTER PARTENARIAT
                  <span className="relative h-px w-12 bg-[#E0742D]/75 transition group-hover:w-14 group-hover:bg-[#E0742D]" />
                </a>
              </div>

              <h2 className="mt-7 lg:mt-10 text-base sm:text-[17px] font-semibold leading-snug tracking-tight text-[#E6D6C3]">
                Certification. Services-conseils. Base de données. IA.
              </h2>
              <p className="mt-3.5 text-xs sm:text-sm leading-relaxed text-[#C9B8A5]/80">
                Un cadre commun pour produire des analyses cohérentes, suivre les décisions dans le temps, et accélérer la
                création de valeur avec vos clients.
              </p>

              <div className="mt-8 grid grid-cols-1 min-[420px]:grid-cols-[1fr_160px] gap-4 sm:gap-5 items-stretch">
                <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-4 sm:p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E6D6C3]/95">Ce que vous gagnez</p>
                  <div className="mt-4 space-y-0 text-xs leading-snug text-[#C9B8A5]/85">
                    {["Meilleurs conseils", "Meilleure productivité", "Meilleure base de données"].map((point, i) => (
                      <div
                        key={point}
                        className={`flex items-center justify-between gap-3 py-2.5 ${
                          i < 2 ? "border-b border-white/[0.06]" : ""
                        }`}
                      >
                        <span className="pr-2">{point}</span>
                        <span
                          className="shrink-0 rounded bg-[#E0742D]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#E6B08C]"
                          aria-hidden
                        >
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
                      <span className="text-[11px] font-semibold tracking-wide text-[#E6D6C3]">Contact</span>
                      <a
                        href="/contact"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-[#E0742D] transition hover:border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/45"
                        aria-label="Nous contacter"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-8 border-t border-white/[0.06] pt-6 text-[11px] leading-relaxed text-[#C9B8A5]/65">
                Conçu pour des échanges structurés, des analyses défendables, et une collaboration durable.
              </p>
            </div>
          </div>

          {/* Center — col 2 desktop */}
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
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">
                        Partenaires comptables
                      </p>
                      <p className="mt-2 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">
                        Un espace commun avec vos clients.
                      </p>
                    </div>

                    <div className="mt-6 flex min-h-0 flex-1 flex-col rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3.5 sm:p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
                      <div className="relative min-h-[260px] flex-1 sm:min-h-[300px] lg:min-h-0">
                        <div className="pointer-events-none absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                        <ul className="flex h-full min-h-[240px] flex-col justify-between gap-1 py-1 sm:min-h-[280px] lg:min-h-0">
                          {valuePoints.map((item, idx) => (
                            <li
                              key={item}
                              className="wow-item"
                              style={{ ["--d" as never]: `${120 + idx * 70}ms` } as never}
                            >
                              <div className="w-full flex items-center gap-3 rounded-xl px-2 py-2 text-left border border-white/[0.12] bg-white/[0.07] shadow-sm">
                                <span className="relative inline-flex h-5 w-5 items-center justify-center">
                                  <span className="absolute h-2 w-2 rounded-full bg-[#E0742D]" />
                                  <span className="absolute h-5 w-5 rounded-full border border-white/10 bg-white/[0.02]" />
                                </span>
                                <span className="text-[11px] font-medium tracking-wide text-[#E6D6C3]/90">{item}</span>
                              </div>
                            </li>
                          ))}
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

      <div
        className="relative z-20 isolate overflow-hidden bg-[#141823]"
        aria-label="Ce que vous pouvez faire sur la plateforme"
        role="region"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="relative">
          <div className="cabinet-marquee-mask">
            <div className="cabinet-marquee-track">
              <div
                className="cabinet-marquee-row"
                aria-label="Actions possibles avec Modelisys pour les cabinets partenaires"
              >
                {CABINET_HERO_MARQUEE.map((text) => (
                  <div key={text} className="cabinet-marquee-item">
                    <span className="cabinet-marquee-dot" />
                    <span className="cabinet-marquee-text">{text}</span>
                  </div>
                ))}
              </div>
              <div className="cabinet-marquee-row" aria-hidden="true">
                {CABINET_HERO_MARQUEE.map((text) => (
                  <div key={`dup-${text}`} className="cabinet-marquee-item">
                    <span className="cabinet-marquee-dot" />
                    <span className="cabinet-marquee-text">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden bg-[#141823] md:block md:w-[min(12rem,42vw)]"
            aria-hidden
          />

          <div className="pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-2.5 text-[#E6D6C3]/80 sm:left-10 md:flex">
            <Handshake className="h-5 w-5 text-[#E6B08C]" aria-hidden />
            <span className="text-sm font-semibold tracking-wide">Partenaires</span>
          </div>
        </div>
      </div>

      {/* Courbe de transition — même path que la home ; couleur du panneau gauche du split (#2A2F3A) */}
      <div aria-hidden className="relative z-20 h-20 overflow-hidden bg-slate-50 sm:h-24">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-12 left-1/3 h-72 w-72 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
        </div>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-full w-full scale-y-[-1]"
        >
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#2A2F3A"
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

        /* Masque / style type Insights ; vitesse alignée sur frontend/components/footer.tsx */
        .cabinet-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }

        .cabinet-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: cabinetMarqueeLeft 48s linear infinite;
        }

        .cabinet-marquee-row {
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 20px 32px;
        }

        .cabinet-marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
        }

        .cabinet-marquee-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(230, 176, 140, 0.9);
          box-shadow: 0 0 0 4px rgba(230, 176, 140, 0.12);
        }

        .cabinet-marquee-text {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(230, 214, 195, 0.9);
        }

        @keyframes cabinetMarqueeLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
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
          .cabinet-marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
