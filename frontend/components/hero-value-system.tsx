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
        className="pointer-events-none absolute left-1/2 top-[42%] h-[min(100%,28rem)] w-[min(100%,28rem)] -translate-x-1/2 -translate-y-1/2 opacity-40"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${uid}-orbit`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(230,214,195,0.35)" />
            <stop offset="100%" stopColor="rgba(224,116,45,0.2)" />
          </linearGradient>
        </defs>
        <circle
          cx="210"
          cy="210"
          r="148"
          fill="none"
          stroke={`url(#${uid}-orbit)`}
          strokeWidth="0.75"
          className="hero-orbit-slow"
          style={{ transformOrigin: "210px 210px" }}
        />
        <circle
          cx="210"
          cy="210"
          r="108"
          fill="none"
          stroke="rgba(230,214,195,0.12)"
          strokeWidth="0.6"
          strokeDasharray="2 6"
          className="hero-orbit-reverse"
          style={{ transformOrigin: "210px 210px" }}
        />
        {/* Spokes to active — subtle */}
        {HERO_VALUE_DRIVERS.map((driver, i) => {
          const angle = (-90 + i * 72) * (Math.PI / 180)
          const x = 210 + Math.cos(angle) * 148
          const y = 210 + Math.sin(angle) * 148
          const isActive = driver.id === activeId
          return (
            <line
              key={driver.id}
              x1="210"
              y1="210"
              x2={x}
              y2={y}
              stroke={isActive ? "rgba(224,116,45,0.55)" : "rgba(230,214,195,0.08)"}
              strokeWidth={isActive ? 1.25 : 0.6}
              className="transition-all duration-700"
            />
          )
        })}
        <circle cx="210" cy="210" r="3" fill="rgba(230,214,195,0.55)" />
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
                        "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-[#E0742D] transition-transform duration-500",
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
