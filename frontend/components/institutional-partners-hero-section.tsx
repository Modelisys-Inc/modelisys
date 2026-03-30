"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Building2, Check } from "lucide-react"

/** Bande sous la hero — même principe que la page cabinets comptables */
const FINANCIAL_PARTNERS_HERO_MARQUEE = [
  "Structurez et suivez le financement sur une base de données commune avec la PME.",
  "Alignez états, indicateurs et pièces pour vos analyses et vos comités.",
  "Accélérez la diligence avec une IA encadrée sur des données déjà structurées.",
  "Réduisez les silos entre équipes crédit, risque et relation client.",
  "Offrez une vision traçable du dossier, de la structuration au suivi dans le temps.",
  "Renforcez la clarté décisionnelle pour vos processus internes.",
  "Documentez les hypothèses et l’historique pour une gouvernance plus solide.",
  "Facilitez la collaboration entre vos équipes et le dirigeant sur une vision partagée.",
] as const

export function InstitutionalPartnersHeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  const valuePoints = [
    "Données structurées & portail sécurisé",
    "Suivi du financement & de la situation",
    "Analyses, scénarios & valorisation",
    "Infos financières à jour en tout temps",
    "IA encadrée pour accélérer l’analyse",
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
      <div className="absolute inset-0">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="absolute inset-y-0 left-1/2 hidden w-px bg-white/5 lg:block" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -right-28 -bottom-28 h-[560px] w-[560px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 sm:px-12 lg:px-16 xl:px-20">
        <div className="relative flex min-h-[82vh] items-center py-20 sm:py-28 lg:py-32">
          <div
            className={`pointer-events-auto absolute top-28 bottom-10 left-1/2 w-[240px] -translate-x-1/2 select-none transition-all duration-1000 sm:top-32 sm:bottom-12 sm:w-[280px] md:w-[320px] lg:w-[360px] ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="relative mx-auto h-full">
              <div className="absolute inset-0 -z-20 rounded-[44px] bg-black/45 blur-2xl" />
              <div className="wow-border absolute inset-0 -z-10 rounded-[44px] p-[1px]">
                <div className="h-full w-full rounded-[43px] bg-[#141823]" />
              </div>

              <div className="group relative h-full overflow-hidden rounded-[42px] border-2 border-[#E6D6C3]/55 bg-[#141823] shadow-2xl">
                <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />
                <div className="pointer-events-none absolute inset-0 rounded-[42px] ring-1 ring-[#E6D6C3]/30" />
                <div className="pointer-events-none absolute inset-0 rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/12" />

                <div className="h-full px-5 py-6">
                  <div className="mt-1 flex h-full flex-col">
                    <div className="text-center">
                      <p className="text-xs font-semibold tracking-wide text-[#E6D6C3]/95">
                        Partenaires financiers
                      </p>
                      <p className="mt-1 text-[10px] text-[#C9B8A5]/70">Une vision commune avec vos clientèles PME.</p>
                    </div>

                    <div className="mt-4 flex-1 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                      <div className="relative h-full">
                        <div className="pointer-events-none absolute top-2 bottom-2 left-[18px] w-px bg-gradient-to-b from-[#E6D6C3]/35 via-white/10 to-[#E6B08C]/30" />
                        <ul className="flex h-full flex-col justify-between py-1">
                          {valuePoints.map((item, idx) => (
                            <li
                              key={item}
                              className="wow-item"
                              style={{ ["--d" as never]: `${120 + idx * 70}ms` } as never}
                            >
                              <div className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5">
                                <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                                  <span className="absolute h-2 w-2 rounded-full bg-[#E0742D]" />
                                  <span className="absolute h-5 w-5 rounded-full border border-white/10 bg-white/[0.02]" />
                                </span>
                                <span
                                  className="min-w-0 flex-1 text-[11px] font-medium tracking-wide whitespace-nowrap text-[#E6D6C3]/90 overflow-hidden text-ellipsis"
                                  title={item}
                                >
                                  {item}
                                </span>
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

          <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div
              className={`max-w-xl transition-all duration-1000 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <p className="text-sm font-semibold tracking-wide text-slate-200">Partenaires financiers</p>

              <h1 className="mt-10 text-5xl font-semibold leading-[0.95] tracking-tight text-[#E6D6C3] sm:text-6xl">
                Une vision financière
                <br />
                partagée avec vos
                <br />
                clientèles PME.
              </h1>

              <p className="mt-10 max-w-md text-sm leading-relaxed text-[#C9B8A5]/80 sm:text-base">
                Du montage et du suivi du financement ou d&apos;un investissement à l&apos;analyse et au suivi dans le
                temps : états financiers, indicateurs, scénarios et documentation sur une même plateforme — avec de
                l&apos;IA encadrée pour accélérer l&apos;analyse sans perdre le contrôle.
              </p>

              <div className="mt-10 flex items-center gap-6">
                <a
                  href="/contact"
                  className="group inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                >
                  CONTACTER L&apos;ÉQUIPE
                  <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </a>

                <span className="h-px w-12 bg-white/10" />

                <a
                  href="/#demo"
                  className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                >
                  RÉSERVER UNE DÉMO
                  <span className="inline-block h-px w-10 bg-[#E0742D]" />
                </a>
              </div>
            </div>

            <div
              className={`relative transition-all duration-1000 delay-150 ${
                isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
              }`}
            >
              <div className="absolute -top-10 right-0 hidden select-none text-[88px] font-semibold tracking-tight text-white/[0.055] lg:block">
                modelisys<span className="text-[#E0742D]/35">.</span>
              </div>

              <div className="ml-auto max-w-md">
                <div className="flex items-center justify-end">
                  <a
                    href="/contact"
                    className="group inline-flex items-center gap-3 text-[11px] font-semibold tracking-wide text-slate-200 transition hover:text-slate-100"
                  >
                    DISCUTER PARTENARIAT
                    <span className="relative h-px w-14 bg-[#E0742D]/80 transition group-hover:bg-[#E0742D]" />
                  </a>
                </div>

                <h2 className="mt-16 text-sm font-semibold text-[#E6D6C3]">
                  Analyse. Financement. Investissement. Surveillance.
                </h2>
                <p className="mt-4 text-xs leading-relaxed text-[#C9B8A5]/75">
                  Un cadre commun pour structurer les dossiers, suivre la situation dans le temps, et renforcer la clarté
                  pour vos comités et votre relation de confiance avec le dirigeant.
                </p>

                <div className="mt-10 grid grid-cols-[1fr_160px] items-stretch gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs font-semibold text-[#E6D6C3]">Ce que vous gagnez</p>
                    <div className="mt-3 space-y-2 text-xs text-[#C9B8A5]/80">
                      {["Dossiers plus cohérents", "Décisions mieux documentées", "Moins de friction opérationnelle"].map(
                        (point) => (
                          <div key={point} className="flex items-center justify-between gap-3">
                            <span>{point}</span>
                            <span
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#E6B08C]/40 bg-[#E6B08C]/10 text-[#E6B08C]"
                              aria-hidden
                            >
                              <Check className="h-3 w-3" strokeWidth={2.5} />
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#141823]">
                    <div className="p-3">
                      <div className="relative h-20 overflow-hidden rounded-xl bg-white/5">
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#E0742D]/20 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 h-1.5 rounded-full bg-white/10">
                          <div className="h-full w-2/3 rounded-full bg-[#E0742D]" />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#E6D6C3]">Contact</span>
                        <a
                          href="/contact"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
                          aria-label="Nous contacter"
                        >
                          <ArrowRight className="h-4 w-4 text-[#E0742D]" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-10 text-[11px] text-[#C9B8A5]/70">
                  Banques, assureurs, financement, gestion d&apos;actifs : une approche commune pour vos équipes et vos
                  clientèles.
                </p>
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
          <div className="financial-marquee-mask">
            <div className="financial-marquee-track">
              <div className="financial-marquee-row" aria-label="Enjeux pour les partenaires financiers">
                {FINANCIAL_PARTNERS_HERO_MARQUEE.map((text) => (
                  <div key={text} className="financial-marquee-item">
                    <span className="financial-marquee-dot" />
                    <span className="financial-marquee-text">{text}</span>
                  </div>
                ))}
              </div>
              <div className="financial-marquee-row" aria-hidden="true">
                {FINANCIAL_PARTNERS_HERO_MARQUEE.map((text) => (
                  <div key={`dup-${text}`} className="financial-marquee-item">
                    <span className="financial-marquee-dot" />
                    <span className="financial-marquee-text">{text}</span>
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
            <Building2 className="h-5 w-5 text-[#E6B08C]" aria-hidden />
            <span className="text-sm font-semibold tracking-wide">Financiers</span>
          </div>
        </div>
      </div>

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

        .financial-marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }

        .financial-marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: financialMarqueeLeft 32s linear infinite;
        }

        .financial-marquee-row {
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 20px 32px;
        }

        .financial-marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
        }

        .financial-marquee-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(230, 176, 140, 0.9);
          box-shadow: 0 0 0 4px rgba(230, 176, 140, 0.12);
        }

        .financial-marquee-text {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(230, 214, 195, 0.9);
        }

        @keyframes financialMarqueeLeft {
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
          .financial-marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
