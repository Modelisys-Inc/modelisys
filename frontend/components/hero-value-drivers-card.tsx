"use client"

import {
  CircleDollarSign,
  Minus,
  Percent,
  Plus,
  ShieldAlert,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import {
  HERO_VALUE_DRIVER_IDS,
  HERO_VALUE_DRIVERS,
  heroValueDriverById,
  type HeroValueDriver,
  type HeroValueDriverId,
} from "@/lib/hero-value-drivers"

const ROTATE_MS = 5200
const INSIGHT_FLIP_MS = 3800
const DIAGRAM_SIZE = 300
const CENTER = DIAGRAM_SIZE / 2
const SPOKE_RADIUS = 98

const DRIVER_ICONS: Record<HeroValueDriverId, LucideIcon> = {
  croissance: TrendingUp,
  rentabilite: Percent,
  tresorerie: Wallet,
  efficacite: CircleDollarSign,
  risque: ShieldAlert,
}

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(rad),
    y: CENTER + radius * Math.sin(rad),
  }
}

function nodePositionPercent(angleDeg: number, radiusPercent = 41) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    left: 50 + radiusPercent * Math.cos(rad),
    top: 50 + radiusPercent * Math.sin(rad),
  }
}

type Props = {
  className?: string
  compact?: boolean
}

function DriverDetailPanel({ driver }: { driver: HeroValueDriver }) {
  return (
    <div key={driver.id} className="animate-in fade-in-0 slide-in-from-right-2 duration-500">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
        <p className="text-lg font-semibold tracking-tight text-[#E6D6C3] sm:text-xl">{driver.label}</p>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-[#C9B8A5]/85">{driver.comment}</p>

      <div className="mt-5 space-y-2.5">
        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-400/80">
            Améliore la valeur
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[#E6D6C3]/90 xl:text-xs">{driver.improves}</p>
        </div>
        <div className="rounded-lg border border-[#E0742D]/20 bg-[#E0742D]/[0.06] px-3 py-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#E6B08C]/90">
            Détériore la valeur
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[#E6D6C3]/90 xl:text-xs">{driver.deteriorates}</p>
        </div>
      </div>
    </div>
  )
}

function HeroDriverInsightPanel({ driver }: { driver: HeroValueDriver }) {
  const [showImprove, setShowImprove] = useState(true)

  useEffect(() => {
    setShowImprove(true)
    const interval = window.setInterval(() => {
      setShowImprove((current) => !current)
    }, INSIGHT_FLIP_MS)
    return () => window.clearInterval(interval)
  }, [driver.id])

  const insight = showImprove
    ? { tone: "improve" as const, label: "Améliore la valeur", text: driver.improves }
    : { tone: "deteriorate" as const, label: "Détériore la valeur", text: driver.deteriorates }

  return (
    <div key={driver.id} className="flex h-full min-h-[220px] flex-col justify-center animate-in fade-in-0 duration-500">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E0742D]/85">Levier actif</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[#E6D6C3] xl:text-[1.65rem] 2xl:text-3xl">
        {driver.label}
      </h3>

      <blockquote className="relative mt-5 border-l-2 border-[#E0742D]/50 pl-4">
        <p className="text-[15px] font-medium leading-relaxed text-[#E6D6C3]/92 xl:text-base 2xl:text-lg">
          {driver.comment}
        </p>
      </blockquote>

      <div className="relative mt-8 min-h-[5.5rem]">
        <div
          key={`${driver.id}-${insight.tone}`}
          className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
        >
          <div
            className={`rounded-xl border px-4 py-3.5 backdrop-blur-sm ${
              insight.tone === "improve"
                ? "border-emerald-500/20 bg-emerald-500/[0.07]"
                : "border-[#E0742D]/25 bg-[#E0742D]/[0.07]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  insight.tone === "improve" ? "bg-emerald-500/15 text-emerald-400" : "bg-[#E0742D]/15 text-[#E6B08C]"
                }`}
              >
                {insight.tone === "improve" ? (
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                ) : (
                  <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                )}
              </span>
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                  insight.tone === "improve" ? "text-emerald-400/85" : "text-[#E6B08C]/90"
                }`}
              >
                {insight.label}
              </p>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-[#C9B8A5]/88">{insight.text}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroValueDriversCard({ className = "", compact = false }: Props) {
  const [activeId, setActiveId] = useState<HeroValueDriverId>("croissance")
  const [autoRotate, setAutoRotate] = useState(true)
  const [progress, setProgress] = useState(0)
  const active = heroValueDriverById(activeId)
  const activeIndex = HERO_VALUE_DRIVER_IDS.indexOf(activeId)
  const ActiveIcon = DRIVER_ICONS[activeId]

  const selectDriver = useCallback((id: HeroValueDriverId) => {
    setActiveId(id)
    setAutoRotate(false)
    setProgress(0)
  }, [])

  useEffect(() => {
    if (!autoRotate) return

    setProgress(0)
    const progressInterval = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + 100 / (ROTATE_MS / 40)))
    }, 40)

    const rotateInterval = window.setInterval(() => {
      setActiveId((current) => {
        const idx = HERO_VALUE_DRIVER_IDS.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % HERO_VALUE_DRIVER_IDS.length
        return HERO_VALUE_DRIVER_IDS[nextIdx]
      })
      setProgress(0)
    }, ROTATE_MS)

    return () => {
      window.clearInterval(progressInterval)
      window.clearInterval(rotateInterval)
    }
  }, [autoRotate])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      setAutoRotate(false)
      setProgress(0)
      setActiveId((current) => {
        const idx = HERO_VALUE_DRIVER_IDS.indexOf(current)
        const delta = event.key === "ArrowRight" ? 1 : -1
        const nextIdx = (idx + delta + HERO_VALUE_DRIVER_IDS.length) % HERO_VALUE_DRIVER_IDS.length
        return HERO_VALUE_DRIVER_IDS[nextIdx]
      })
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <div className={className} aria-live="polite" aria-atomic="true">
      <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
        <div className="pointer-events-none absolute -inset-6 -z-20 rounded-[40px] bg-[#E0742D]/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute inset-0 -z-20 rounded-[28px] bg-black/40 blur-2xl scale-[1.02]" />

        <div className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] p-px drivers-wow-border">
          <div className="h-full w-full rounded-[27px] bg-[#141823]" />
        </div>

        <div className="relative overflow-hidden rounded-[26px] border border-[#E6D6C3]/40 bg-[#141823] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(230,214,195,0.1)_inset]">
          <div className="pointer-events-none absolute inset-0 opacity-60 drivers-wow-shimmer" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay drivers-wow-noise" />
          <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-[#E6D6C3]/20" />
          <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br from-[#E6D6C3]/[0.07] via-transparent to-[#E6B08C]/[0.06]" />

          <div
            className={`relative border-b border-white/[0.07] ${
              compact ? "px-5 py-4 sm:px-6 xl:py-5" : "px-5 py-5 sm:px-6 sm:py-6"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9B8A5]/70">
                  Leviers de création de valeur
                </p>
                <p
                  className={`max-w-md font-medium leading-snug text-[#E6D6C3] ${
                    compact ? "mt-2 text-[15px] xl:text-base" : "mt-3 text-[15px] sm:text-base"
                  }`}
                >
                  La valeur de votre entreprise n&apos;est pas qu&apos;un chiffre.
                </p>
                {!compact ? (
                  <p className="mt-2 max-w-lg text-xs leading-relaxed text-[#C9B8A5]/75 sm:text-[13px]">
                    Elle résulte de cinq dimensions interconnectées — chacune influence directement votre
                    valorisation.
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#E0742D]/90">
                {String(activeIndex + 1).padStart(2, "0")}/05
              </span>
            </div>

            <div className={`relative overflow-hidden rounded-full bg-white/[0.06] ${compact ? "mt-3 h-0.5" : "mt-4 h-0.5"}`}>
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E0742D] to-[#E6B08C] transition-[width] duration-75 ease-linear"
                style={{
                  width: `${autoRotate ? progress : ((activeIndex + 1) / HERO_VALUE_DRIVER_IDS.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div
            className={`relative grid ${
              compact
                ? "lg:grid-cols-[minmax(0,1.15fr)_1px_minmax(0,0.85fr)] xl:grid-cols-[minmax(0,1.2fr)_1px_minmax(0,0.8fr)]"
                : "lg:grid-cols-[minmax(0,0.88fr)_1px_minmax(0,1.12fr)] xl:grid-cols-[minmax(0,0.95fr)_1px_minmax(0,1.05fr)]"
            }`}
          >
            <div
              className={`flex flex-col items-center ${
                compact ? "px-4 py-5 sm:px-5 xl:py-8 2xl:py-10" : "px-4 py-7 sm:px-5 sm:py-8"
              }`}
            >
              <div
                className={`relative aspect-square w-full ${
                  compact
                    ? "max-w-[min(100%,200px)] sm:max-w-[220px] xl:max-w-[min(100%,260px)] 2xl:max-w-[min(100%,280px)]"
                    : "max-w-[min(100%,300px)]"
                }`}
                role="group"
                aria-label="Sélectionnez un levier de valeur"
              >
                <svg viewBox={`0 0 ${DIAGRAM_SIZE} ${DIAGRAM_SIZE}`} className="absolute inset-0 h-full w-full" aria-hidden>
                  <defs>
                    <radialGradient id="value-hub-glow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(224,116,45,0.35)" />
                      <stop offset="70%" stopColor="rgba(224,116,45,0.08)" />
                      <stop offset="100%" stopColor="rgba(224,116,45,0)" />
                    </radialGradient>
                    <linearGradient id="active-spoke" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(224,116,45,0.15)" />
                      <stop offset="100%" stopColor="rgba(224,116,45,0.85)" />
                    </linearGradient>
                    <filter id="spoke-glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={SPOKE_RADIUS + 14}
                    fill="none"
                    stroke="rgba(255,255,255,0.04)"
                    strokeWidth="1"
                    className="drivers-orbit-slow"
                  />
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={SPOKE_RADIUS + 4}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                    strokeDasharray="3 6"
                    className="drivers-orbit-reverse"
                  />

                  {HERO_VALUE_DRIVERS.map((driver) => {
                    const node = polarToCartesian(driver.angleDeg, SPOKE_RADIUS)
                    const isActive = driver.id === activeId
                    return (
                      <line
                        key={`spoke-${driver.id}`}
                        x1={CENTER}
                        y1={CENTER}
                        x2={node.x}
                        y2={node.y}
                        stroke={isActive ? "url(#active-spoke)" : "rgba(255,255,255,0.07)"}
                        strokeWidth={isActive ? 2.5 : 1}
                        strokeLinecap="round"
                        filter={isActive ? "url(#spoke-glow)" : undefined}
                        className="transition-all duration-500"
                      />
                    )
                  })}

                  <circle cx={CENTER} cy={CENTER} r={56} fill="url(#value-hub-glow)" className="drivers-hub-pulse" />
                  <circle cx={CENTER} cy={CENTER} r={42} fill="rgba(16,20,30,0.95)" stroke="rgba(230,214,195,0.28)" strokeWidth="1" />
                </svg>

                <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex w-[5.5rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
                  <span
                    className={`flex items-center justify-center rounded-full border border-[#E0742D]/30 bg-[#E0742D]/10 ${
                      compact ? "mb-1.5 h-7 w-7" : "mb-2 h-8 w-8"
                    }`}
                  >
                    <ActiveIcon className="h-3.5 w-3.5 text-[#E6B08C]" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#C9B8A5]/55">Valeur</span>
                  <span className="mt-0.5 text-[10px] font-semibold leading-tight text-[#E6D6C3]">{active.shortLabel}</span>
                </div>

                {HERO_VALUE_DRIVERS.map((driver) => {
                  const pos = nodePositionPercent(driver.angleDeg, 41)
                  const isActive = driver.id === activeId
                  const Icon = DRIVER_ICONS[driver.id]

                  return (
                    <button
                      key={driver.id}
                      type="button"
                      onClick={() => selectDriver(driver.id)}
                      className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5 outline-none transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-[#E0742D]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141823] rounded-lg"
                      style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                      aria-pressed={isActive}
                      aria-label={`${driver.label} — levier de valeur`}
                    >
                      <span
                        className={`relative flex items-center justify-center rounded-full border transition-all duration-500 ${
                          compact ? "h-9 w-9 xl:h-10 xl:w-10" : "h-9 w-9 sm:h-10 sm:w-10"
                        } ${
                          isActive
                            ? "scale-110 border-[#E0742D]/70 bg-[#E0742D]/20 shadow-[0_0_24px_rgba(224,116,45,0.35)]"
                            : "border-white/[0.12] bg-[#1a1f2b]/90 hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 transition-colors duration-500 sm:h-4 sm:w-4 ${
                            isActive ? "text-[#E6D6C3]" : "text-[#C9B8A5]/70"
                          }`}
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        {isActive ? (
                          <span
                            className="absolute -inset-1 rounded-full border border-[#E0742D]/25 drivers-active-ring"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                      <span
                        className={`max-w-[4.5rem] text-center text-[8px] font-medium uppercase leading-tight tracking-[0.06em] transition-colors duration-500 sm:max-w-[5rem] sm:text-[9px] ${
                          isActive ? "text-[#E6D6C3]" : "text-[#C9B8A5]/65"
                        }`}
                      >
                        {driver.shortLabel}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className={`flex items-center gap-2 ${compact ? "mt-4 xl:mt-6" : "mt-6"}`} role="tablist" aria-label="Leviers">
                {HERO_VALUE_DRIVERS.map((driver) => {
                  const isActive = driver.id === activeId
                  return (
                    <button
                      key={`dot-${driver.id}`}
                      type="button"
                      role="tab"
                      onClick={() => selectDriver(driver.id)}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        isActive ? "w-6 bg-[#E0742D]" : "w-1.5 bg-white/15 hover:bg-white/25"
                      }`}
                      aria-selected={isActive}
                      aria-label={driver.label}
                    />
                  )
                })}
              </div>
            </div>

            <div className="hidden bg-gradient-to-b from-transparent via-white/[0.07] to-transparent lg:block" aria-hidden />

            <div
              className={`border-t border-white/[0.07] lg:border-t-0 ${
                compact ? "px-5 py-6 sm:px-6 xl:py-8 xl:pr-7 2xl:py-10" : "px-5 py-6 sm:px-6 sm:py-7 lg:py-8 lg:pr-7"
              }`}
            >
              {compact ? <HeroDriverInsightPanel driver={active} /> : <DriverDetailPanel driver={active} />}
            </div>
          </div>

          <div
            className={`relative border-t border-white/[0.07] bg-gradient-to-r from-[#E0742D]/[0.08] via-transparent to-transparent ${
              compact ? "px-5 py-3 sm:px-6" : "px-5 py-4 sm:px-6"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#E0742D]/30 bg-[#E0742D]/10">
                <span className="h-1 w-1 rounded-full bg-[#E0742D]" aria-hidden />
              </span>
              <p className="text-xs font-medium leading-snug text-[#E6D6C3]/90 xl:text-sm">
                Chaque décision financière a un impact sur la valeur.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .drivers-wow-border {
          background: conic-gradient(
            from 120deg,
            rgba(230, 214, 195, 0.85),
            rgba(230, 176, 140, 0.85),
            rgba(255, 255, 255, 0.2),
            rgba(230, 214, 195, 0.85)
          );
          filter: drop-shadow(0 18px 55px rgba(0, 0, 0, 0.45));
          animation: driversWowSpin 12s linear infinite;
        }

        .drivers-wow-shimmer {
          background: radial-gradient(600px 280px at 18% 12%, rgba(230, 214, 195, 0.12), transparent 58%),
            radial-gradient(480px 220px at 88% 38%, rgba(230, 176, 140, 0.1), transparent 52%),
            linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.04) 40%, transparent 72%);
          transform: translateX(-20%);
          animation: driversWowShimmer 7s ease-in-out infinite;
        }

        .drivers-wow-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
          background-size: 160px 160px;
        }

        .drivers-hub-pulse {
          animation: driversHubPulse 3s ease-in-out infinite;
        }

        .drivers-active-ring {
          animation: driversActiveRing 2s ease-in-out infinite;
        }

        .drivers-orbit-slow {
          transform-origin: ${CENTER}px ${CENTER}px;
          animation: driversOrbitSlow 24s linear infinite;
        }

        .drivers-orbit-reverse {
          transform-origin: ${CENTER}px ${CENTER}px;
          animation: driversOrbitReverse 18s linear infinite;
        }

        @keyframes driversWowSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes driversWowShimmer {
          0% {
            transform: translateX(-22%);
            opacity: 0.45;
          }
          50% {
            transform: translateX(10%);
            opacity: 0.65;
          }
          100% {
            transform: translateX(-22%);
            opacity: 0.45;
          }
        }

        @keyframes driversHubPulse {
          0%,
          100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes driversActiveRing {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.08);
          }
        }

        @keyframes driversOrbitSlow {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes driversOrbitReverse {
          to {
            transform: rotate(-360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .drivers-wow-border,
          .drivers-wow-shimmer,
          .drivers-hub-pulse,
          .drivers-active-ring,
          .drivers-orbit-slow,
          .drivers-orbit-reverse {
            animation: none;
          }

          .drivers-wow-shimmer {
            opacity: 0.4;
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
