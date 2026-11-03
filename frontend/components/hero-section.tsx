"use client"

import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { HeroValueSystem } from "@/components/hero-value-system"
import { scrollToApprocheSection } from "@/lib/approche-navigation"

function scrollToDemo() {
  const demo = document.getElementById("demo")
  if (demo) {
    demo.scrollIntoView({ behavior: "smooth" })
    return
  }
  window.location.assign("/#demo")
}

function HeroMarkPanel() {
  return (
    <p
      className="select-none text-center text-[clamp(16rem,34vw,28rem)] font-semibold leading-none tracking-tight text-[#E6D6C3]/35"
      aria-hidden
    >
          m<span className="text-[#E0742D]/70">.</span>
    </p>
  )
}

function scrollToServices() {
  const services = document.getElementById("ce-que-nous-faisons")
  if (!services) {
    window.location.assign("/#ce-que-nous-faisons")
    return
  }
  const nav = document.querySelector("nav")
  const offset = nav ? Math.ceil(nav.getBoundingClientRect().height) + 16 : 96
  const top = services.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
}

export function HeroSection({ variant = "accompagnement" }: { variant?: "accompagnement" | "services" }) {
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
        <div
          className={`grid grid-cols-1 items-center gap-14 py-16 sm:gap-16 sm:py-24 lg:py-28 xl:gap-20 xl:py-32 ${
            variant === "services"
              ? "lg:min-h-[min(88vh,48rem)] lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-20"
              : "lg:min-h-[min(88vh,52rem)] lg:grid-cols-2 lg:gap-16"
          }`}
        >
          {variant === "services" ? (
            <>
              <div
                className={`max-w-xl transition-all duration-1000 lg:max-w-none ${
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
                }`}
              >
                <p className="text-sm text-[#C9B8A5]/75">Pour les dirigeants de PME</p>
                <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-none lg:text-[2.35rem] xl:text-[2.5rem]">
                  Pour une gestion financière plus éclairée, plus structurée et plus performante.
                </h1>
                <div className="mt-7 max-w-xl space-y-3 text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
                  <p>
                    Obtenez une vision claire de la performance de votre entreprise, anticipez vos
                    besoins financiers et identifiez les leviers qui contribueront à sa rentabilité et
                    à sa croissance.
                  </p>
                  <p>
                    Modelisys offre aux dirigeants de PME un accompagnement financier et des solutions
                    de gestion sur mesure pour transformer leurs données en décisions concrètes.
                  </p>
                </div>
                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={scrollToDemo}
                    className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    Prendre rendez-vous
                  </button>
                  <button
                    type="button"
                    onClick={scrollToServices}
                    className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                  >
                    Découvrir nos services
                  </button>
                </div>
              </div>
              <div
                className={`flex min-w-0 items-center justify-center transition-all duration-1000 delay-150 ${
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                }`}
              >
                <HeroMarkPanel />
              </div>
            </>
          ) : (
            <>
              <div
                className={`max-w-xl transition-all duration-1000 lg:max-w-[34rem] xl:max-w-[38rem] ${
                  isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
                }`}
              >
                <p className="text-sm text-[#C9B8A5]/75">Accompagnement financier fractionnaire</p>
                <h1 className="mt-6 max-w-[20rem] text-[1.85rem] font-medium leading-[1.22] tracking-[-0.02em] text-balance text-[#E6D6C3] sm:max-w-[36rem] sm:text-[2.15rem] lg:max-w-none lg:text-[2.35rem] xl:text-[2.5rem]">
                  Gestion de la performance et création de valeur pour les PME
                </h1>
                <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#C9B8A5]/82 sm:text-base">
                  Modelisys accompagne les PME qui veulent aller au-delà des états financiers :
                  comprendre leur performance financière, anticiper leur trésorerie, mesurer leurs
                  décisions et augmenter la valeur de leur entreprise.
                </p>
                <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={scrollToDemo}
                    className="group inline-flex items-center gap-2 rounded-full border border-[#E6D6C3]/75 px-5 py-2.5 text-sm text-[#E6D6C3] transition hover:border-[#E6D6C3] hover:bg-[#E6D6C3] hover:text-[#222732] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
                  >
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    Prendre rendez-vous
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToApprocheSection()}
                    className="px-1 py-2 text-sm text-[#C9B8A5]/90 transition hover:text-[#E6D6C3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
                  >
                    En savoir plus
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
            </>
          )}
        </div>
      </div>
    </section>
  )
}
