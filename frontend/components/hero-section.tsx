"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { HeroValueDriversCard } from "@/components/hero-value-drivers-card"
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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
          <div className="relative bg-[#2A2F3A]">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.45]"
              aria-hidden
              style={{
                backgroundImage: `linear-gradient(rgb(255 255 255 / 0.055) 1px, transparent 1px),
                  linear-gradient(90deg, rgb(255 255 255 / 0.055) 1px, transparent 1px)`,
                backgroundSize: "44px 44px",
                maskImage: "radial-gradient(ellipse 90% 85% at 30% 45%, black 20%, transparent 78%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 90% 85% at 30% 45%, black 20%, transparent 78%)",
              }}
            />
          </div>
          <div className="bg-[#1F2430] lg:border-l lg:border-white/5" />
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[560px] w-[560px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20 pointer-events-auto">
        <div className="relative flex min-h-0 flex-col gap-10 py-12 sm:gap-12 sm:py-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-12 lg:pt-[6.5rem] lg:pb-12 xl:gap-16 xl:pt-28 xl:pb-14 2xl:gap-20 2xl:py-20">
          <div
            className={`order-1 lg:col-start-1 max-w-xl lg:max-w-none lg:pr-4 xl:pr-10 transition-all duration-1000 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <p className="max-w-[34rem] text-sm font-medium leading-relaxed text-slate-300/95 sm:text-base">
              Combien vaut votre entreprise&nbsp;? Et comment augmenter sa valeur&nbsp;?
            </p>

            <h1 className="mt-6 max-w-[34rem] text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-[#E6D6C3] sm:mt-8 sm:max-w-[36rem] sm:text-[2.15rem] sm:leading-[1.18] lg:max-w-[32rem] lg:text-[2rem] xl:max-w-[38rem] xl:text-[2.35rem] 2xl:text-[2.65rem]">
              La plateforme de gestion et de création de valeur pour les entreprises privées.
            </h1>

            <p className="mt-6 max-w-[32rem] text-sm leading-[1.7] text-[#C9B8A5]/85 sm:mt-8 sm:max-w-[34rem] sm:text-base lg:max-w-[30rem] xl:max-w-[36rem]">
              Modelisys aide les propriétaires d&apos;entreprise à comprendre ce qui crée la valeur,
              à bâtir un plan pour l&apos;augmenter et à suivre leur progression dans le temps.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4 sm:mt-10 lg:mt-9 xl:mt-11">
              <button
                type="button"
                onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
                className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                RÉSERVER UNE DÉMO
                <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
              </button>

              <span className="hidden h-px w-10 shrink-0 bg-white/[0.12] sm:block" aria-hidden />

              <button
                type="button"
                onClick={() => scrollToApprocheSection()}
                className="inline-flex items-center gap-2 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
              >
                EN SAVOIR PLUS
                <span className="inline-block h-px w-10 bg-[#E0742D]/90" />
              </button>
            </div>
          </div>

          <div
            className={`order-2 lg:col-start-2 lg:min-w-0 lg:pl-2 xl:pl-6 transition-all duration-1000 delay-100 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <HeroValueDriversCard compact />
          </div>
        </div>
      </div>
    </section>
  )
}
