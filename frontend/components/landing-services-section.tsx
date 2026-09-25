"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  SERVICE_LABELS,
  SERVICE_MARKETING_CONTENT,
  SERVICE_MARKETING_ORDER,
  type ServiceId,
} from "@/lib/service-marketing-content"
import { getServicePagePath } from "@/lib/services-page-content"
import { cn } from "@/lib/utils"

export function LandingServicesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [activeService, setActiveService] = useState<ServiceId>("mandats")

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold: 0.08, rootMargin: "0px 0px -80px 0px" },
    )
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [])

  return (
    <section
      id="nos-services"
      ref={sectionRef}
      className="relative z-10 scroll-mt-24 overflow-hidden bg-[#F8FAFC]"
    >
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

      <div className="relative z-10 mx-auto max-w-[1920px] px-5 pb-16 sm:px-10 sm:pb-20 lg:px-12 lg:pb-24 xl:px-16 2xl:px-20">
        <div
          className={`pt-16 sm:pt-20 lg:pt-24 xl:pt-28 transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
            Nos services
          </p>

          <h2 className="mt-6 max-w-2xl text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-[#2A2F3A] sm:mt-7 sm:text-[2.35rem] sm:leading-[1.12] xl:text-[2.55rem]">
            Le bon niveau d&apos;intervention, au bon moment
          </h2>

          <p className="mt-6 max-w-2xl text-[15px] leading-[1.75] text-slate-600 sm:mt-7 sm:text-base">
            Une question précise, un partenaire dans le temps, un moteur autonome ou un modèle sur
            mesure — Modelisys s&apos;adapte à vos besoins.
          </p>

          <div
            className={`mt-12 transition-all duration-1000 delay-100 lg:mt-14 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {SERVICE_MARKETING_ORDER.map((id, index) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveService(id)}
                  className="flex flex-col items-center gap-2 text-center transition hover:opacity-90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2A2F3A] text-sm font-bold text-white shadow-md ring-4 ring-white/80 sm:h-10 sm:w-10">
                    {index + 1}
                  </span>
                  <span className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-600 sm:text-xs">
                    {SERVICE_LABELS[id]}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 pt-1 sm:gap-3 lg:grid-cols-4">
              {SERVICE_MARKETING_ORDER.map((id) => {
                const content = SERVICE_MARKETING_CONTENT[id]
                const isActive = activeService === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveService(id)}
                    aria-label={content.label}
                    className={cn(
                      "min-w-0 rounded-t-xl border-l-2 border-r-2 border-t-2 bg-gradient-to-b from-[#E0742D]/[0.07] to-transparent px-2 pb-3 pt-2.5 text-center transition sm:px-3 sm:pb-3.5 sm:pt-3",
                      isActive
                        ? "border-[#E0742D]/70 shadow-[inset_0_1px_0_0_rgb(255_255_255_/0.6)]"
                        : "border-[#E0742D]/45 hover:border-[#E0742D]/60",
                    )}
                  >
                    <p className="mx-auto max-w-[16rem] text-[11px] font-semibold leading-snug tracking-tight text-[#2A2F3A] sm:text-xs md:text-sm">
                      {content.tagline}
                    </p>
                    <p className="mx-auto mt-2.5 max-w-[18rem] text-[10px] font-normal leading-relaxed text-slate-600 sm:mt-3 sm:text-[11px] md:text-xs">
                      {content.intro}
                    </p>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3 lg:grid-cols-4">
              {SERVICE_MARKETING_ORDER.map((id) => (
                <div key={id} className="flex justify-center">
                  <Link
                    href={getServicePagePath(id)}
                    className="group inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-[#2A2F3A] transition hover:text-[#9A4A1A] sm:text-xs"
                  >
                    Découvrir
                    <ArrowRight className="h-3.5 w-3.5 text-[#E0742D] transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
