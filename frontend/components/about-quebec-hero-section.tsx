"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight } from "lucide-react"
import { AboutHeroMarquee } from "@/components/about-hero-marquee"

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
      className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 scroll-mt-28 overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-3">
          <div className="bg-[#2A2F3A]" />
          <div className="bg-[#262B36] lg:border-x lg:border-white/5" />
          <div className="bg-[#1F2430]" />
        </div>
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-28 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-14 xl:px-20 2xl:px-24">
        <div
          className={`py-16 sm:py-24 lg:py-28 xl:py-32 min-h-0 lg:min-h-[min(72vh,820px)] flex flex-col justify-center transition-all duration-1000 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-slate-300/95">
            À propos
          </p>
          <p className="mt-6 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#E6B08C]/85">
            Une entreprise 100 % québécoise
          </p>
          <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight text-[#E6D6C3] sm:text-4xl md:text-[2.5rem] md:leading-tight lg:text-5xl">
            Fondée, développée et opérée{" "}
            <span className="text-[#C9B8A5]/95">au Québec</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-[1.65] text-[#C9B8A5]/85 sm:text-lg">
            Nous croyons que les PME québécoises méritent des outils financiers conçus par des gens qui comprennent leur
            réalité : leur langue, leurs normes comptables, leur structure fiscale, leur rapport aux banques et aux
            cabinets comptables locaux. Choisir Modelisys, c&apos;est aussi choisir d&apos;investir dans l&apos;écosystème
            technologique québécois — et de travailler avec une équipe joignable, imputable et ancrée ici.
          </p>

          <div className="mt-9 sm:mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2.5 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-100 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              ÉCHANGER AVEC NOUS
              <ArrowRight className="h-4 w-4 shrink-0 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
            </Link>

            <span className="hidden sm:block h-px w-10 shrink-0 bg-white/[0.12]" aria-hidden />

            <a
              href="#histoire"
              className="inline-flex items-center gap-2 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              NOTRE HISTOIRE
              <span className="inline-block h-px w-10 bg-[#E0742D]/90" />
            </a>

            <a
              href="#equipe"
              className="inline-flex items-center gap-2 rounded-lg px-1 py-1.5 -mx-1 text-xs font-semibold tracking-wide text-slate-200 transition hover:text-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E0742D]/50"
            >
              L&apos;ÉQUIPE FONDATRICE
              <span className="inline-block h-px w-10 bg-[#E0742D]/90" />
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-20">
        <AboutHeroMarquee />
      </div>

      <div aria-hidden className="relative z-10 h-16 overflow-hidden bg-[#1F2430] sm:h-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-8 left-1/3 h-56 w-56 rounded-full bg-[#E6D6C3]/10 blur-3xl" />
        </div>
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-full w-full text-slate-100"
        >
          <path
            d="M0,30 C180,95 360,95 540,60 C720,25 900,25 1080,60 C1230,90 1335,95 1440,75 L1440,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </section>
  )
}
