"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"
import { ArrowRight, MapPin } from "lucide-react"
import { AboutHeroMarquee } from "@/components/about-hero-marquee"
import { cn } from "@/lib/utils"

function AboutQuebecSignal({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "")

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-md flex-col items-center justify-center lg:mx-0 lg:max-w-none lg:min-h-[22rem]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6D6C3]/[0.06] blur-3xl sm:h-[22rem] sm:w-[22rem]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[10%] top-[20%] h-40 w-40 rounded-full bg-[#E0742D]/[0.07] blur-3xl"
        aria-hidden
      />

      <svg
        viewBox="0 0 420 420"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(100%,24rem)] w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2 opacity-40"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-orbit`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(230,214,195,0.35)" />
            <stop offset="100%" stopColor="rgba(224,116,45,0.2)" />
          </linearGradient>
        </defs>
        <circle
          cx="210"
          cy="210"
          r="150"
          fill="none"
          stroke={`url(#${uid}-orbit)`}
          strokeWidth="0.75"
          strokeDasharray="3 10"
        />
        <circle
          cx="210"
          cy="210"
          r="110"
          fill="none"
          stroke="rgba(230,214,195,0.18)"
          strokeWidth="0.6"
        />
        <circle
          cx="210"
          cy="210"
          r="72"
          fill="none"
          stroke="rgba(224,116,45,0.22)"
          strokeWidth="0.6"
        />
      </svg>

      <div className="relative z-10 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/55">
          Siège
        </p>
        <p className="mt-5 font-mono text-[4.5rem] font-semibold leading-none tracking-tight text-[#E6D6C3] sm:text-[5.5rem]">
          QC
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-[#C9B8A5]/80">
          <MapPin className="h-4 w-4 text-[#E0742D]" strokeWidth={1.75} aria-hidden />
          <span className="text-sm font-medium tracking-wide">Québec, Canada</span>
        </div>
        <p className="mx-auto mt-5 max-w-[16rem] text-[13px] leading-relaxed text-[#C9B8A5]/65">
          Fondée ici. Pratiquée ici.
        </p>
      </div>
    </div>
  )
}

export function AboutQuebecHeroSection() {
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

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

  return (
    <section
      ref={sectionRef}
      id="quebec"
      className="relative overflow-hidden scroll-mt-24"
    >
      {/* Même scène continue que le hero landing */}
      <div className="pointer-events-none absolute inset-0 bg-[#222732]">
        <div
          className="absolute inset-0 opacity-[0.4]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
          }}
        />
        <div className="absolute -top-32 left-[-10%] h-[34rem] w-[34rem] rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
        <div className="absolute top-1/3 right-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1a1f2a] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <div className="grid min-h-[min(78vh,44rem)] grid-cols-1 items-center gap-14 py-20 sm:gap-16 sm:py-24 lg:grid-cols-2 lg:gap-12 lg:py-28 xl:gap-20 xl:py-32">
          <div
            className={`max-w-xl lg:max-w-[34rem] xl:max-w-[38rem] transition-all duration-1000 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
              À propos
            </p>

            <h1 className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]">
              Fondée et pratiquée au Québec
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Notre vision : améliorer la compréhension de la valeur auprès des
              propriétaires. Nous agissons en support pour les aider à mieux lire
              leur comptabilité — et à isoler les leviers qui impactent réellement
              la valeur de leur entreprise.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4 sm:mt-12">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
              >
                ÉCHANGER AVEC NOUS
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <a
                href="#histoire"
                className="inline-flex items-center gap-2 px-1 py-3 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                NOTRE HISTOIRE
                <span className="inline-block h-px w-8 bg-[#E0742D]/90" />
              </a>

              <a
                href="#equipe"
                className="inline-flex items-center gap-2 px-1 py-3 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                L&apos;ÉQUIPE
                <span className="inline-block h-px w-8 bg-[#E0742D]/90" />
              </a>
            </div>
          </div>

          <div
            className={`min-w-0 transition-all duration-1000 delay-150 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <AboutQuebecSignal />
          </div>
        </div>
      </div>

      <div className="relative z-20">
        <AboutHeroMarquee />
      </div>
    </section>
  )
}
