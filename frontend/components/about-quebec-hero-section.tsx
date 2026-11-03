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
          Une firme d’ici, au service de toutes les sociétés du Québec.
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
      <div className="pointer-events-none absolute inset-0 bg-[#222732]">
        <div
          className="absolute -right-[6%] -top-[22%] h-[70%] w-[55%] rounded-full"
          aria-hidden
          style={{
            background: "radial-gradient(circle, rgba(230,214,195,0.16) 0%, rgba(230,214,195,0) 68%)",
            filter: "blur(36px)",
          }}
        />
        <div
          className="absolute -left-[18%] top-[46%] h-[34%] w-[140%] -rotate-[14deg]"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(230,214,195,0.16) 28%, rgba(224,116,45,0.38) 62%, transparent 88%)",
            filter: "blur(22px)",
          }}
        />
        <div
          className="absolute -left-[10%] bottom-[-6%] h-[16%] w-[120%] -rotate-[12deg]"
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, transparent 8%, rgba(224,116,45,0.42) 46%, rgba(230,214,195,0.22) 68%, transparent 88%)",
            filter: "blur(18px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <div className="grid grid-cols-1 items-start gap-12 py-16 sm:gap-16 sm:py-24 lg:min-h-[min(78vh,44rem)] lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-28 xl:gap-20 xl:py-32">
          <div
            className={`max-w-xl lg:max-w-[34rem] xl:max-w-[38rem] transition-all duration-1000 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <p className="text-sm text-[#C9B8A5]/75">À propos</p>

            <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-none lg:text-[2.35rem] xl:text-[2.5rem]">
              Notre vision
            </h1>

            <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
              Améliorer la compréhension de la valeur auprès des propriétaires de
              PME. Nous agissons en support pour les aider à mieux lire leur
              comptabilité et à isoler les leviers qui impactent réellement la
              valeur de leur entreprise.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
              >
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                Échanger avec nous
              </Link>

              <a
                href="#histoire"
                className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                Notre histoire
              </a>

              <a
                href="#equipe"
                className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                Le fondateur
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
