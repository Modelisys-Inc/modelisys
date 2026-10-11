"use client"

/**
 * Hero visual — composition typographique institutionnelle.
 * Un chiffre dominant, cinq leviers en légende, beaucoup d’air.
 * Pas de carte-rapport, pas de barres de progression.
 */

import { useCallback, useEffect, useId, useState } from "react"
import {
  HERO_VALUE_DRIVER_IDS,
  HERO_VALUE_DRIVERS,
  heroValueDriverById,
  type HeroValueDriverId,
} from "@/lib/hero-value-drivers"
import { cn } from "@/lib/utils"

const ROTATE_MS = 5000
/** Points orbitaux figés (évite un mismatch d’arrondi Math.cos/sin SSR vs client). */
const SPOKE_POINTS = [
  { x: "309.03", y: "100.01" },
  { x: "345.20", y: "270.20" },
  { x: "194.53", y: "357.19" },
  { x: "65.23", y: "240.77" },
  { x: "136.00", y: "81.83" },
] as const

type Props = {
  className?: string
}

export function HeroValueSystem({ className = "" }: Props) {
  const uid = useId().replace(/:/g, "")
  const [activeId, setActiveId] = useState<HeroValueDriverId>("croissance")
  const [autoRotate, setAutoRotate] = useState(true)
  const active = heroValueDriverById(activeId)

  const selectDriver = useCallback((id: HeroValueDriverId) => {
    setActiveId(id)
    setAutoRotate(false)
  }, [])

  useEffect(() => {
    if (!autoRotate) return
    const timer = window.setInterval(() => {
      setActiveId((current) => {
        const idx = HERO_VALUE_DRIVER_IDS.indexOf(current)
        return HERO_VALUE_DRIVER_IDS[(idx + 1) % HERO_VALUE_DRIVER_IDS.length]
      })
    }, ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [autoRotate])

  const activeIndex = HERO_VALUE_DRIVER_IDS.indexOf(activeId)

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-lg flex-col justify-center lg:mx-0 lg:max-w-none lg:min-h-[28rem] xl:min-h-[32rem]",
        className,
      )}
      aria-live="polite"
    >
      {/* Atmosphere */}
      <div
        className="pointer-events-none absolute left-1/2 top-[38%] h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6D6C3]/[0.06] blur-3xl sm:h-[26rem] sm:w-[26rem]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-1/4 h-48 w-48 rounded-full bg-[#E0742D]/[0.07] blur-3xl"
        aria-hidden
      />

      {/* Quiet orbital lines — relation visuelle des 5 leviers */}
      <svg
        viewBox="0 0 420 420"
        className="pointer-events-none absolute left-1/2 top-[42%] hidden h-[min(100%,28rem)] w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 opacity-80 md:block"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-orbit`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(230,214,195,0.5)" />
            <stop offset="100%" stopColor="rgba(224,116,45,0.38)" />
          </linearGradient>
          <filter id={`${uid}-spoke-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx="210"
          cy="210"
          r="148"
          fill="none"
          stroke={`url(#${uid}-orbit)`}
          strokeWidth="1.15"
          className="hero-orbit-slow"
          style={{ transformOrigin: "210px 210px" }}
        />
        <circle
          cx="210"
          cy="210"
          r="108"
          fill="none"
          stroke="rgba(230,214,195,0.22)"
          strokeWidth="0.8"
          strokeDasharray="2 6"
          className="hero-orbit-reverse"
          style={{ transformOrigin: "210px 210px" }}
        />
        {HERO_VALUE_DRIVERS.map((driver, i) => {
          const point = SPOKE_POINTS[i]
          const isActive = driver.id === activeId
          return (
            <g key={driver.id}>
              <line
                x1="210"
                y1="210"
                x2={point.x}
                y2={point.y}
                stroke={isActive ? "rgba(224,116,45,0.95)" : "rgba(230,214,195,0.14)"}
                strokeWidth={isActive ? 2.25 : 0.7}
                strokeLinecap="round"
                {...(isActive ? { filter: `url(#${uid}-spoke-glow)` } : {})}
                className="transition-all duration-700"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 6.5 : 3}
                fill={isActive ? "#E0742D" : "rgba(230,214,195,0.28)"}
                stroke={isActive ? "rgba(230,214,195,0.55)" : "rgba(230,214,195,0.12)"}
                strokeWidth={isActive ? 1.4 : 0.6}
                className="transition-all duration-700"
              />
            </g>
          )
        })}
        <circle cx="210" cy="210" r="5" fill="#E0742D" stroke="rgba(230,214,195,0.45)" strokeWidth="1.2" />
      </svg>

      <div className="relative z-10 px-1 sm:px-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/65">
          Valeur d&apos;entreprise
        </p>

        <p className="mt-4 font-mono text-[4.25rem] font-semibold leading-none tracking-tight text-[#E6D6C3] sm:text-[5rem] xl:text-[5.5rem]">
          8,4
          <span className="ml-2 text-[1.35rem] font-medium tracking-normal text-[#C9B8A5]/70 sm:text-[1.5rem]">
            M$
          </span>
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#C9B8A5]/70">
          <span className="font-mono tabular-nums text-[#E6D6C3]/90">4,75×</span>
          <span className="h-3 w-px bg-white/15" aria-hidden />
          <span>Multiple BAIIA</span>
          <span className="h-3 w-px bg-white/15" aria-hidden />
          <span className="font-mono tabular-nums">7,6 – 9,1 M$</span>
        </div>

        <div className="mt-10 h-px w-24 bg-gradient-to-r from-[#E0742D]/80 to-transparent" aria-hidden />

        {/* Cinq leviers — légende éditoriale */}
        <nav className="mt-8" aria-label="Leviers de valeur">
          <ul className="flex flex-wrap gap-x-1 gap-y-2">
            {HERO_VALUE_DRIVERS.map((driver, i) => {
              const isActive = driver.id === activeId
              return (
                <li key={driver.id} className="flex items-center">
                  {i > 0 ? (
                    <span className="mx-2.5 text-[#C9B8A5]/25" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => selectDriver(driver.id)}
                    className={cn(
                      "relative pb-1 text-[13px] tracking-wide transition-colors duration-500",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E0742D]/45",
                      isActive
                        ? "font-semibold text-[#E6D6C3]"
                        : "font-medium text-[#C9B8A5]/55 hover:text-[#C9B8A5]/90",
                    )}
                    aria-pressed={isActive}
                  >
                    {driver.shortLabel}
                    <span
                      className={cn(
                        "absolute inset-x-0 -bottom-0.5 h-[2px] origin-left bg-[#E0742D] shadow-[0_0_8px_rgba(224,116,45,0.55)] transition-transform duration-500",
                        isActive ? "scale-x-100" : "scale-x-0",
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-7 min-h-[4.5rem] max-w-md">
          <p
            key={active.id}
            className="text-[15px] leading-relaxed text-[#C9B8A5]/88 animate-in fade-in-0 slide-in-from-bottom-1 duration-500 sm:text-base"
          >
            {active.comment}
          </p>
          <p className="mt-3 font-mono text-[10px] tabular-nums tracking-[0.14em] text-[#E0742D]/75">
            {String(activeIndex + 1).padStart(2, "0")} — 05
          </p>
        </div>
      </div>
    </div>
  )
}
