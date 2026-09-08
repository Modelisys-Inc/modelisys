"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { HeroValueSystem } from "@/components/hero-value-system"
import { scrollToApprocheSection } from "@/lib/approche-navigation"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -100px 0px" },
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
    <section id="hero" ref={sectionRef} className="relative overflow-hidden scroll-mt-24">
      {/* One continuous stage — no hard left/right panel split */}
      <div className="absolute inset-0 pointer-events-none bg-[#222732]">
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
        <div className="grid min-h-[min(88vh,52rem)] grid-cols-1 items-center gap-14 py-20 sm:gap-16 sm:py-24 lg:grid-cols-2 lg:gap-12 lg:py-28 xl:gap-20 xl:py-32">
          <div
            className={`max-w-xl lg:max-w-[34rem] xl:max-w-[38rem] transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
              Pilotage &amp; évaluation
            </p>

            <h1 className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]">
              La plateforme de gestion et de création de valeur pour les PME
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Vos états financiers racontent le passé. Modelisys en tire ce qu&apos;un acheteur,
              un prêteur ou un partenaire verrait demain — permettant aux propriétaires de
              mesurer, comprendre et augmenter la valeur de leur entreprise.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4 sm:mt-12">
              <button
                type="button"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
              >
                RÉSERVER UNE DÉMO
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => scrollToApprocheSection()}
                className="inline-flex items-center gap-2 px-1 py-3 text-xs font-semibold tracking-[0.08em] text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                EN SAVOIR PLUS
                <span className="inline-block h-px w-8 bg-[#E0742D]/90" />
              </button>
            </div>
          </div>

          <div
            className={`min-w-0 transition-all duration-1000 delay-150 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <HeroValueSystem />
          </div>
        </div>
      </div>
    </section>
  )
}
