"use client"

import type { CSSProperties, ReactNode } from "react"
import { TrendingUp } from "lucide-react"
import { HERO_INSIGHT_MARQUEE_ITEMS } from "@/lib/hero-narrative-metrics"

export function HeroMarquee({
  label = "Insights",
  items = HERO_INSIGHT_MARQUEE_ITEMS,
  ariaLabel = "Insights — leviers de création de valeur",
  icon,
  duration = "90s",
  tone = "dark",
  coverClassName = "md:w-[min(12rem,42vw)]",
}: {
  label?: string
  items?: readonly string[]
  ariaLabel?: string
  icon?: ReactNode
  duration?: string
  tone?: "dark" | "light"
  coverClassName?: string
} = {}) {
  const mark = icon ?? (
    <TrendingUp className={tone === "light" ? "h-5 w-5 text-[#E0742D]" : "h-5 w-5 text-[#E6B08C]"} />
  )
  const light = tone === "light"

  return (
    <section
      className={
        light
          ? "relative isolate z-0 overflow-hidden border-y border-[#2A2F3A]/10 bg-white"
          : "relative isolate z-0 overflow-hidden border-y border-white/20 bg-[#222732]"
      }
      style={{ "--hero-marquee-duration": duration } as CSSProperties}
    >

      <div className="relative">
        <div className={`hero-marquee-mask${light ? " is-light" : ""}`}>
          <div className="hero-marquee-track">
            <div className="hero-marquee-row" aria-label={ariaLabel}>
              {items.map((text) => (
                <div key={text} className="hero-marquee-item">
                  <span className="hero-marquee-dot" />
                  <span className="hero-marquee-text">{text}</span>
                </div>
              ))}
            </div>

            <div className="hero-marquee-row" aria-hidden="true">
              {items.map((text) => (
                <div key={`dup-${text}`} className="hero-marquee-item">
                  <span className="hero-marquee-dot" />
                  <span className="hero-marquee-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Au-dessus du défilement : même fond que la bande pour ne pas voir le texte sous « Insights » */}
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-20 hidden md:block ${coverClassName} ${light ? "bg-white" : "bg-[#222732]"}`}
          aria-hidden
        />

        <div
          className={`pointer-events-none absolute left-6 top-1/2 z-30 hidden -translate-y-1/2 items-center gap-2.5 sm:left-10 md:flex ${light ? "text-[#222732]" : "text-[#E6D6C3]/80"}`}
        >
          {mark}
          <span className="text-sm font-semibold tracking-wide">{label}</span>
        </div>
      </div>
    </section>
  )
}
