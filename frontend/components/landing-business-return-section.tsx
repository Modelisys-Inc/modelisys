"use client"

import { useEffect, useRef, useState } from "react"
import { BusinessReturnWaterfall } from "@/components/business-return-waterfall"

function ReturnFormulaIntro() {
  return (
    <div className="mt-7 max-w-lg">
      <p className="text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:text-base">
        En tant qu&apos;actionnaire, votre rendement combine deux mouvements&nbsp;: la variation de
        valeur de votre participation, et ce que l&apos;entreprise vous a versé en chemin.
      </p>

      <div className="mt-8 space-y-0 border-t border-white/[0.08] pt-7">
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <div>
            <p className="text-[13px] font-semibold text-[#E6D6C3]">Création de valeur</p>
            <p className="mt-0.5 text-[12px] text-[#C9B8A5]/65">Variation du prix de l&apos;entreprise</p>
          </div>
          <span className="font-mono text-sm text-[#E0742D]/80" aria-hidden>
            ↑
          </span>
        </div>

        <div className="flex items-center gap-3 py-1" aria-hidden>
          <span className="h-px flex-1 bg-white/[0.06]" />
          <span className="font-mono text-xs text-[#E0742D]/55">+</span>
          <span className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <div>
            <p className="text-[13px] font-semibold text-[#E6D6C3]">Distributions</p>
            <p className="mt-0.5 text-[12px] text-[#C9B8A5]/65">Dividendes et sommes versées</p>
          </div>
          <span className="font-mono text-sm text-[#E6B08C]/80" aria-hidden>
            ↓
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-white/[0.08] pt-4">
          <p className="text-[13px] font-semibold tracking-tight text-[#E6D6C3]">Rendement total</p>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#C9B8A5]/50">
            Actionnaire
          </span>
        </div>
      </div>
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
      <div className="mb-7 sm:mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/65">
          Pont de valeur
        </p>
        <h3 className="mt-4 max-w-md text-xl font-semibold tracking-tight text-[#E6D6C3] sm:text-2xl">
          D&apos;où vient votre rendement
        </h3>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#C9B8A5]/75">
          De la valeur de départ au résultat final — levier par levier, réalisé ou projeté.
        </p>
      </div>

      <BusinessReturnWaterfall />

      <p className="mt-7 max-w-lg text-[15px] leading-relaxed text-[#C9B8A5]/78">
        Pas seulement «&nbsp;combien ça vaut&nbsp;», mais{" "}
        <span className="text-[#E6D6C3]">ce que ça vous a rapporté</span> — et ce qui l&apos;explique.
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
    <section id="rendement" ref={sectionRef} className="relative z-10 scroll-mt-36 overflow-x-clip">
      {/* Même scène continue que la hero */}
      <div className="pointer-events-none absolute inset-0 bg-[#222732]">
        <div
          className="absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(rgb(255 255 255 / 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgb(255 255 255 / 0.03) 1px, transparent 1px)`,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 65% 70% at 70% 40%, black 8%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 70% at 70% 40%, black 8%, transparent 70%)",
          }}
        />
        <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
        <div className="absolute bottom-0 left-[-6%] h-[22rem] w-[22rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
        <div
          className={`grid grid-cols-1 items-start gap-14 py-16 sm:gap-16 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24 xl:gap-20 xl:py-28 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="order-1 lg:order-2 lg:pl-2 xl:pl-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
              Rendement
            </p>
            <h2 className="mt-6 max-w-lg text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-7 sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
              Ce que l&apos;entreprise vous rapporte vraiment
            </h2>
            <ReturnFormulaIntro />
          </div>

          <div className="order-2 lg:order-1 lg:pr-2 xl:pr-6">
            <ReturnDriversPanel isVisible={isVisible} />
          </div>
        </div>
      </div>

      <div aria-hidden className="relative h-16 overflow-hidden bg-[#222732] sm:h-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-8 left-1/3 h-56 w-56 rounded-full bg-[#E6D6C3]/[0.08] blur-3xl" />
        </div>
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-full w-full">
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="#F0F4F8"
          />
        </svg>
      </div>
    </section>
  )
}
