"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { ServicesPillarArticle } from "@/components/services-pillar-article"
import { getLandingNavOffset } from "@/lib/approche-navigation"
import {
  SERVICES_PAGE_CLOSING,
  SERVICES_PAGE_INTRO,
  SERVICES_PAGE_PILLARS,
  getServicePagePath,
  type ServicesPagePillarId,
} from "@/lib/services-page-content"
import { cn } from "@/lib/utils"

function scrollToPillar(id: ServicesPagePillarId) {
  if (typeof window === "undefined") return
  const el = document.getElementById(`services-${id}`)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - getLandingNavOffset()
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  const nextHash = `#services-${id}`
  if (window.location.hash !== nextHash) {
    window.history.pushState(null, "", `${window.location.pathname}${nextHash}`)
  }
}

export function ServicesPageSection() {
  const [activeId, setActiveId] = useState<ServicesPagePillarId>("mandats")

  useEffect(() => {
    const fromHash = () => {
      const raw = window.location.hash.replace(/^#/, "")
      if (!raw.startsWith("services-")) return
      const id = raw.slice("services-".length) as ServicesPagePillarId
      if (SERVICES_PAGE_PILLARS.some((p) => p.id === id)) {
        setActiveId(id)
        scrollToPillar(id)
      }
    }
    fromHash()
    window.addEventListener("hashchange", fromHash)
    return () => window.removeEventListener("hashchange", fromHash)
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[#F8FAFC]" />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgb(42 47 58 / 0.045) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(42 47 58 / 0.045) 1px, transparent 1px)
            `,
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 70% 65% at 28% 18%, black 12%, transparent 72%)",
          }}
        />
        <div className="absolute -top-24 right-[-8%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-32 lg:px-12 xl:px-16 2xl:px-20">
        <header className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            {SERVICES_PAGE_INTRO.eyebrow}
          </p>
          <h1 className="mt-6 text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            {SERVICES_PAGE_INTRO.title}
          </h1>

          <nav
            className="mt-10 flex flex-wrap gap-x-1 gap-y-2 border-b border-[#2A2F3A]/10 pb-px"
            aria-label="Types de services"
          >
            {SERVICES_PAGE_PILLARS.map((pillar) => {
              const isActive = activeId === pillar.id
              return (
                <Link
                  key={pillar.id}
                  href={getServicePagePath(pillar.id)}
                  onClick={() => setActiveId(pillar.id)}
                  className={cn(
                    "relative px-3 py-3 text-[11px] font-semibold tracking-[0.08em] transition-colors duration-300 sm:px-4 sm:text-xs",
                    isActive ? "text-[#2A2F3A]" : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  {pillar.label}
                  <span
                    className={cn(
                      "absolute inset-x-3 -bottom-px h-px transition-colors duration-300 sm:inset-x-4",
                      isActive ? "bg-[#E0742D]" : "bg-transparent",
                    )}
                    aria-hidden
                  />
                </Link>
              )
            })}
          </nav>
        </header>

        <div className="mt-4 divide-y divide-[#2A2F3A]/10">
          {SERVICES_PAGE_PILLARS.map((pillar) => (
            <div key={pillar.id}>
              <ServicesPillarArticle pillar={pillar} />
              <div className="-mt-6 pb-14 sm:-mt-8 sm:pb-16 lg:pb-20">
                <Link
                  href={getServicePagePath(pillar.id)}
                  className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#9A4A1A]"
                >
                  Découvrir
                  <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <section className="border-t border-[#2A2F3A]/10 pt-14 sm:pt-16 lg:pt-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-[#2A2F3A] sm:text-[1.75rem]">
            {SERVICES_PAGE_CLOSING.title}
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            {SERVICES_PAGE_CLOSING.body}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SERVICES_PAGE_CLOSING.choices.map((choice) => (
              <Link
                key={choice.id}
                href={getServicePagePath(choice.id)}
                className="rounded-2xl border border-[#2A2F3A]/10 bg-white/80 p-5 text-left transition hover:border-[#E0742D]/40 hover:bg-white"
              >
                <p className="text-sm font-semibold text-[#2A2F3A]">{choice.label}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{choice.detail}</p>
              </Link>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/#demo"
              className="group inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#9A4A1A]"
            >
              PRENDRE RENDEZ-VOUS
              <ArrowRight className="h-4 w-4 text-[#E0742D] transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="hidden h-px w-10 bg-[#2A2F3A]/15 sm:block" aria-hidden />
            <Link
              href="/#approche-modelisys"
              className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-slate-500 transition hover:text-[#2A2F3A]"
            >
              VOIR L&apos;APPROCHE
              <span className="inline-block h-px w-8 bg-[#E0742D]/80" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
