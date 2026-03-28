"use client"

import { ArrowRight, Building2, Sparkles } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

export function InstitutionalPartnersHeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

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
    <section
      ref={sectionRef}
      className="relative py-24 sm:py-32 min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-slate-700/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-600/10 rounded-full blur-3xl"></div>
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        ></div>
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-8 sm:px-12 lg:px-16 xl:px-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div
            className={`transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="space-y-6 mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 mb-4">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">
                  Banques · Assureurs · Financement · Gestion d&apos;actifs
                </span>
              </div>

              <div className="space-y-2 max-w-3xl">
                <h1 className="text-2xl sm:text-3xl md:text-4xl text-white leading-snug tracking-tight">
                  <span className="font-bold">
                    Offrez à vos équipes et à vos clientèles PME une vision financière partagée, documentée et traçable —{" "}
                  </span>
                  <span className="font-normal text-white/90">
                    du montage et du suivi du financement à l&apos;analyse et au suivi dans le temps.
                  </span>
                </h1>
                <p className="text-base sm:text-lg font-semibold text-emerald-400 tracking-wide leading-snug">
                  Analyse &amp; diligence · Crédit &amp; surveillance · Investissement &amp; valorisation · IA
                </p>
              </div>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-3xl">
                Pour <span className="text-slate-200 font-medium">structurer et suivre le financement</span> et pour{" "}
                <span className="text-slate-200 font-medium">analyser et suivre la situation</span> de vos clientèles PME,
                Modelisys réunit sur une même plateforme les états, indicateurs, scénarios et pièces dont vos équipes ont
                besoin — avec une couche{" "}
                <span className="text-slate-200 font-medium">données structurées et intelligence artificielle encadrée</span>{" "}
                pour accélérer l&apos;analyse sans perdre le contrôle. Moins de silos, plus de clarté pour vos comités, vos
                processus internes et votre <span className="text-slate-200 font-medium">relation de confiance</span> avec
                le dirigeant.
              </p>
            </div>
          </div>

          <div
            className={`flex justify-center lg:justify-end transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <div className="flex w-full max-w-xl flex-col items-center gap-10 sm:max-w-none sm:flex-row sm:items-center sm:gap-10 lg:gap-12">
              <div className="relative shrink-0">
                <div
                  className="absolute left-1/2 top-1/2 h-56 w-56 sm:h-72 sm:w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-3xl"
                  aria-hidden
                />
                <div
                  className="relative z-10 inline-flex h-60 w-60 sm:h-72 sm:w-72 items-center justify-center rounded-full border-2 border-emerald-400/90 bg-slate-800/50 shadow-lg shadow-emerald-500/15 backdrop-blur-sm"
                  aria-hidden
                >
                  <Building2
                    className="h-32 w-32 sm:h-36 sm:w-36 shrink-0 text-emerald-400"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                </div>
              </div>

              <div className="flex max-w-xs flex-col items-center gap-4 text-center sm:max-w-sm sm:items-start sm:text-left">
                <p className="text-xl font-semibold leading-snug text-white sm:text-2xl">
                  Explorer un partenariat avec Modelisys ?
                </p>
                <Link
                  href="/contact"
                  className="group inline-flex items-center gap-1.5 rounded-md text-base font-semibold text-emerald-400 transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                  Nous contacter
                  <ArrowRight
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-6 h-10 border border-slate-600 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-slate-500 rounded-full"></div>
        </div>
      </div>
    </section>
  )
}
