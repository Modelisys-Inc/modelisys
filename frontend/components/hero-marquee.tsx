"use client"

import type { ReactNode } from "react"
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
    >

      <div className="relative">
        <div className={`marquee-mask${light ? " is-light" : ""}`}>
          <div className="marquee-track">
            <div className="marquee-row" aria-label={ariaLabel}>
              {items.map((text) => (
                <div key={text} className="marquee-item">
                  <span className="marquee-dot" />
                  <span className="marquee-text">{text}</span>
                </div>
              ))}
            </div>

            <div className="marquee-row" aria-hidden="true">
              {items.map((text) => (
                <div key={`dup-${text}`} className="marquee-item">
                  <span className="marquee-dot" />
                  <span className="marquee-text">{text}</span>
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

      <style jsx>{`
        .marquee-mask {
          mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%);
        }

        .marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: marqueeLeft ${duration} linear infinite;
        }

        .marquee-row {
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 20px 32px;
        }

        .marquee-item {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
        }

        .marquee-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(230, 176, 140, 0.9);
          box-shadow: 0 0 0 4px rgba(230, 176, 140, 0.12);
        }

        .marquee-text {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: rgba(230, 214, 195, 0.9);
        }

        .is-light .marquee-dot {
          background: #e0742d;
          box-shadow: 0 0 0 4px rgba(224, 116, 45, 0.14);
        }

        .is-light .marquee-text {
          color: #222732;
        }

        @keyframes marqueeLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}
