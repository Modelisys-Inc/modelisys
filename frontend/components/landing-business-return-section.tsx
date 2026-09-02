"use client"

import { useEffect, useRef, useState } from "react"
import { BusinessReturnWaterfall } from "@/components/business-return-waterfall"

function ReturnFormulaIntro() {
  return (
    <div className="mt-6 max-w-xl">
      <p className="text-base leading-[1.65] text-[#C9B8A5]/88 sm:text-lg">
        Une entreprise n&apos;est pas seulement une source de revenus. C&apos;est aussi un actif dont la valeur évolue
        dans le temps. Le rendement qu&apos;elle génère provient de ces deux sources&nbsp;:
      </p>

      <div className="mt-6 space-y-2 border-t border-white/[0.08] pt-6 text-sm sm:text-[15px]">
        <div>
          <p className="font-semibold text-[#E6D6C3]">Création de valeur</p>
          <p className="mt-0.5 text-[#C9B8A5]/78">
            <span className="text-[#E6B08C]/90" aria-hidden>
              ↑{" "}
            </span>
            Valeur de votre participation
          </p>
        </div>

        <p className="py-0.5 font-mono text-base text-[#E0742D]/70" aria-hidden>
          +
        </p>

        <div>
          <p className="font-semibold text-[#E6D6C3]">Distributions</p>
          <p className="mt-0.5 text-[#C9B8A5]/78">
            <span className="text-[#E6B08C]/90" aria-hidden>
              ↓{" "}
            </span>
            Dividendes et sommes versées
          </p>
        </div>

        <p className="border-t border-white/[0.06] pt-3 font-semibold text-[#E6D6C3]">
          <span className="text-[#E0742D]/80" aria-hidden>
            ={" "}
          </span>
          Rendement total
        </p>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-[#C9B8A5]/82 sm:text-[15px]">
        Modelisys mesure le rendement généré par votre entreprise, année après année — et projette sa valeur à partir de
        vos hypothèses pour visualiser ce que l&apos;avenir pourrait donner.
      </p>
    </div>
  )
}

function ReturnDriversPanel({ isVisible }: { isVisible: boolean }) {
  return (
    <div
      className={`transition-all duration-1000 delay-150 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C9B8A5]/70 sm:text-xs">
            Pont de valeur
          </p>
        </div>
        <h3 className="mt-3 max-w-md text-xl font-semibold tracking-tight text-[#E6D6C3] sm:text-2xl">
          D&apos;où vient votre rendement
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[#C9B8A5]/78 sm:text-[15px]">
          Chaque décision laisse une trace — de la valeur de départ au rendement total, levier par levier.
        </p>
      </div>

      <BusinessReturnWaterfall />

      <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#E6D6C3]/88 sm:text-[15px]">
        Comprenez non seulement combien votre entreprise vaut, mais aussi le rendement qu&apos;elle génère pour vous —
        et <span className="text-[#E6B08C]/95">les décisions</span> qui l&apos;expliquent.
      </p>
    </div>
  )
}

export function LandingBusinessReturnSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)

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

  return (
    <section id="rendement" ref={sectionRef} className="relative scroll-mt-36 z-10 overflow-x-clip">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="bg-[#2A2F3A] lg:border-r lg:border-white/5" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/4 left-0 h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-[#E0742D]/[0.06] blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24 pointer-events-auto">
        <div
          className={`flex flex-col gap-12 sm:gap-14 lg:grid lg:grid-cols-2 lg:gap-10 xl:gap-14 2xl:gap-16 lg:items-start pt-10 pb-12 sm:pt-14 sm:pb-14 lg:pt-16 lg:pb-16 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:pl-4 xl:pl-8 2xl:pl-10">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
              Rendement
            </p>
            <h2 className="mt-5 max-w-full text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight">
              Mesurez le rendement de votre entreprise
            </h2>
            <ReturnFormulaIntro />
          </div>

          <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:pr-4 xl:pr-8 2xl:pr-10">
            <ReturnDriversPanel isVisible={isVisible} />
          </div>
        </div>
      </div>

      <div aria-hidden className="relative h-16 overflow-hidden bg-[#2A2F3A] sm:h-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -bottom-8 left-1/3 h-56 w-56 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
        </div>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#F8FAFC"
          />
        </svg>
      </div>
    </section>
  )
}
