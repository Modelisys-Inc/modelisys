"use client"

import { ArrowRight, Quote } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

export function PostFeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const citationCardRef = useRef<HTMLDivElement>(null)
  const mFiligraneRef = useRef<HTMLSpanElement>(null)
  const [mTopPx, setMTopPx] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.12, rootMargin: "0px 0px -80px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  useLayoutEffect(() => {
    if (typeof window === "undefined") return

    const alignMToCard = () => {
      const mq = window.matchMedia("(min-width: 1024px)")
      if (!mq.matches) {
        setMTopPx(null)
        return
      }

      const section = sectionRef.current
      const card = citationCardRef.current
      const mEl = mFiligraneRef.current
      if (!section || !card || !mEl) return

      const s = section.getBoundingClientRect()
      const c = card.getBoundingClientRect()
      const m = mEl.getBoundingClientRect()
      if (m.height < 1) return

      const cardTopInSection = c.top - s.top
      setMTopPx(cardTopInSection - m.height)
    }

    alignMToCard()
    const afterReveal = window.setTimeout(alignMToCard, 1200)

    const section = sectionRef.current
    const card = citationCardRef.current
    const ro = new ResizeObserver(alignMToCard)
    if (section) ro.observe(section)
    if (card) ro.observe(card)

    window.addEventListener("resize", alignMToCard)
    window.addEventListener("scroll", alignMToCard, { passive: true })

    return () => {
      window.clearTimeout(afterReveal)
      ro.disconnect()
      window.removeEventListener("resize", alignMToCard)
      window.removeEventListener("scroll", alignMToCard)
    }
  }, [isVisible])

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative isolate z-10 scroll-mt-24 overflow-hidden"
    >
      {/* Transition depuis le Blog : courbe (mobile = arc simple pour éviter l’étirement bizarre) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[5.25rem] overflow-hidden bg-[#F8FAFC] sm:h-28 md:h-32"
      >
        {/* Mobile : une seule courbe douce, symétrique — se comporte mieux avec preserveAspectRatio="none" */}
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-full w-full sm:hidden"
        >
          <path
            d="M0,50 C480,16 960,16 1440,50 L1440,120 L0,120 Z"
            fill="#1F2430"
          />
        </svg>
        {/* sm+ : courbe d’origine (plus de relief horizontal) */}
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 hidden h-full w-full sm:block"
        >
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#1F2430"
          />
        </svg>
      </div>

      <div className="absolute inset-0 z-0">
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

        {/* Filigrane m. — moitié droite ; bas du « m » aligné sur le haut de la carte citation (mesure JS) */}
        <div
          className="pointer-events-none absolute inset-y-0 left-1/2 right-0 z-[1] hidden overflow-x-hidden overflow-y-visible lg:block"
          aria-hidden
        >
          <span
            ref={mFiligraneRef}
            className="absolute left-1/2 select-none text-[clamp(16rem,min(52vw,68vh),48rem)] font-semibold leading-none tracking-tight text-white/[0.055] xl:text-[clamp(18rem,min(48vw,72vh),56rem)]"
            style={{
              top: mTopPx != null ? `${mTopPx}px` : "50%",
              transform: mTopPx != null ? "translateX(-50%)" : "translate(-50%, -50%)",
            }}
          >
            m<span className="text-[#E0742D]/35">.</span>
          </span>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-8 pb-12 pt-32 sm:px-12 sm:pb-16 sm:pt-36 md:pt-40 lg:px-16 lg:pb-20 lg:pt-44 xl:px-20">
        <div
          className={`relative z-20 mb-12 transition-all duration-1000 sm:mb-16 lg:mb-20 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <p className="mb-3 text-sm font-semibold tracking-wide text-slate-200">Valeur</p>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
            Comprenez ce qui impacte la{" "}
            <span className="text-[#C9B8A5]/95">valeur de votre entreprise</span>.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#C9B8A5]/80 sm:text-lg">
            Comprendre → Planifier → Exécuter
          </p>
          <div className="mt-8 h-px max-w-md bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent" />
        </div>

        <div
          className={`-mt-8 flex w-full justify-center sm:-mt-10 lg:-mt-12 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          } transition-all duration-1000 delay-150`}
        >
          <div className="relative z-20 w-full max-w-[960px]">
            <div className="pointer-events-none absolute inset-0 -z-20 rounded-[40px] sm:rounded-[44px] bg-black/50 blur-2xl scale-[1.02]" />
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-[40px] sm:rounded-[44px] p-px wow-border">
              <div className="h-full w-full rounded-[39px] sm:rounded-[43px] bg-[#141823]" />
            </div>
            <div className="relative overflow-hidden rounded-[38px] sm:rounded-[42px] border border-[#E6D6C3]/45 bg-[#141823] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(230,214,195,0.12)_inset]">
              <div className="pointer-events-none absolute inset-0 opacity-70 wow-shimmer" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay wow-noise" />
              <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6D6C3]/25" />
              <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] ring-1 ring-[#E6B08C]/12" />
              <div className="pointer-events-none absolute inset-0 rounded-[38px] sm:rounded-[42px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/10" />

              <div className="relative px-4 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7">
                <div
                  ref={citationCardRef}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5 lg:rounded-2xl lg:border lg:bg-white/[0.035] lg:p-6 max-lg:border-0 max-lg:bg-transparent max-lg:p-0"
                >
                  {/* Mobile uniquement : citation type « pull quote » — moins de cadres, lignes courtes */}
                  <div className="flex flex-col items-center gap-5 text-center sm:hidden">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E0742D]/18 ring-1 ring-[#E0742D]/30">
                      <Quote className="h-5 w-5 text-[#E6B08C]" aria-hidden />
                    </div>
                    <blockquote className="max-w-[22rem] text-[1.0625rem] font-normal leading-[1.55] text-[#E6D6C3]">
                      <div className="mx-auto h-px w-10 bg-gradient-to-r from-transparent via-[#E0742D]/50 to-transparent" aria-hidden />
                      <span className="mt-4 block italic text-[#C9B8A5]">
                        « Modelisys accompagne les propriétaires de PME dans l&apos;optimisation de leur performance,
                        de leur rendement et de la valeur de leur entreprise grâce à une approche intégrée de gestion
                        de la performance et de création de valeur. »
                      </span>
                    </blockquote>
                    <div className="w-full max-w-[22rem] border-t border-white/10 pt-5">
                      <p className="text-sm font-semibold text-[#E6D6C3]">Tristan Bellerose, CPA, CBV</p>
                      <p className="mt-1 text-xs text-[#C9B8A5]/70">Président et fondateur</p>
                      <button
                        type="button"
                        onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                        className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold tracking-wide text-slate-100 transition hover:border-white/20 hover:bg-white/[0.07]"
                      >
                        Échanger sur votre cas
                        <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tablette et desktop : icône + texte en ligne */}
                  <div className="hidden gap-3 sm:gap-4 sm:flex">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E0742D]/20 ring-1 ring-[#E0742D]/35 sm:h-11 sm:w-11">
                      <Quote className="h-4 w-4 text-[#E6B08C] sm:h-5 sm:w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <blockquote className="text-sm italic leading-relaxed text-[#C9B8A5]/95 sm:text-[0.9375rem] sm:leading-[1.6] lg:text-base lg:leading-[1.65]">
                        « Modelisys accompagne les propriétaires de PME dans l&apos;optimisation de leur performance, de leur
                        rendement et de la valeur de leur entreprise grâce à une approche intégrée de gestion de la
                        performance et de création de valeur. »
                      </blockquote>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#E6D6C3]">Tristan Bellerose, CPA, CBV</p>
                          <p className="mt-0.5 text-xs text-[#C9B8A5]/65">Président et fondateur</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                          className="group inline-flex shrink-0 items-center justify-end gap-2 self-end text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-100 sm:self-auto"
                        >
                          Échanger sur votre cas
                          <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden className="relative h-16 overflow-hidden bg-[#1F2430] sm:h-20">
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
