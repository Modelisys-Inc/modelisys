"use client"

import { useEffect, useState } from "react"
import { HeroPerformanceMetrics, HeroPhaseVisual } from "@/components/hero-phase-visual"
import {
  APPROCHE_PHASE_NAVIGATE_EVENT,
  parseApprochePhaseFromHash,
  type ApprochePhaseId,
} from "@/lib/approche-navigation"
import {
  HERO_PERFORMANCE_PHASES,
  HERO_PERFORMANCE_PHASE_CONTENT,
  heroPerformancePhaseFromApprocheId,
  type HeroPerformancePhase,
} from "@/lib/hero-performance-phases"

type Props = {
  className?: string
  autoRotate?: boolean
}

export function PerformanceTrajectoryCard({ className = "", autoRotate: autoRotateProp = true }: Props) {
  const phases = HERO_PERFORMANCE_PHASES
  const [activePhase, setActivePhase] = useState<HeroPerformancePhase>("Planification")
  const [autoRotate, setAutoRotate] = useState(autoRotateProp)

  const selectPhase = (phase: HeroPerformancePhase) => {
    setActivePhase(phase)
    setAutoRotate(false)
  }

  const selectApprochePhase = (phaseId: ApprochePhaseId) => {
    selectPhase(heroPerformancePhaseFromApprocheId(phaseId))
  }

  const active = HERO_PERFORMANCE_PHASE_CONTENT[activePhase]

  useEffect(() => {
    if (!autoRotate) return

    const interval = window.setInterval(() => {
      setActivePhase((current) => {
        const idx = phases.indexOf(current)
        const nextIdx = idx === -1 ? 0 : (idx + 1) % phases.length
        return phases[nextIdx]
      })
    }, 5000)

    return () => window.clearInterval(interval)
  }, [autoRotate, phases])

  useEffect(() => {
    const onPhaseNavigate = (event: Event) => {
      const phaseId = (event as CustomEvent<{ phaseId: ApprochePhaseId }>).detail?.phaseId
      if (!phaseId) return
      selectApprochePhase(phaseId)
    }

    window.addEventListener(APPROCHE_PHASE_NAVIGATE_EVENT, onPhaseNavigate)
    return () => window.removeEventListener(APPROCHE_PHASE_NAVIGATE_EVENT, onPhaseNavigate)
  }, [])

  useEffect(() => {
    const phaseId = parseApprochePhaseFromHash(window.location.hash)
    if (phaseId) selectApprochePhase(phaseId)
  }, [])

  return (
    <div className={className} aria-live="polite" aria-atomic="true">
      <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
        <div className="pointer-events-none absolute inset-0 -z-20 rounded-[28px] bg-black/50 blur-2xl scale-[1.02]" />

        <div className="pointer-events-none absolute inset-0 -z-10 rounded-[28px] p-px trajectory-wow-border">
          <div className="h-full w-full rounded-[27px] bg-[#141823]" />
        </div>

        <div className="relative overflow-hidden rounded-[26px] border border-[#E6D6C3]/45 bg-[#141823] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.55),0_0_0_1px_rgba(230,214,195,0.12)_inset]">
          <div className="pointer-events-none absolute inset-0 opacity-70 trajectory-wow-shimmer" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-overlay trajectory-wow-noise" />
          <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-[#E6D6C3]/25" />
          <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-[#E6B08C]/12" />
          <div className="pointer-events-none absolute inset-0 rounded-[26px] bg-gradient-to-br from-[#E6D6C3]/10 via-transparent to-[#E6B08C]/10" />

          <div className="relative border-b border-white/[0.08] px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">
                  Trajectoire de performance
                </p>
                <p className="mt-1.5 text-[10px] font-medium tracking-wide text-[#C9B8A5]/72">
                  Diagnostic → Planification → Pilotage
                </p>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-[#E0742D]">{active.step}/03</span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-[#C9B8A5]/72">
              <span>{active.progressStartLabel}</span>
              <span>{active.progressEndLabel}</span>
            </div>
            <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#E0742D] to-[#E6B08C] transition-all duration-700 ease-out"
                style={{ width: `${active.trajectory}%` }}
              />
            </div>
            <HeroPerformanceMetrics phase={activePhase} />
          </div>

          <div className="relative grid lg:grid-cols-[minmax(0,0.82fr)_1px_minmax(0,1.18fr)] xl:grid-cols-[minmax(0,0.78fr)_1px_minmax(0,1.22fr)]">
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E6D6C3]/95">Phases</p>
              <p className="mt-1.5 text-[10px] sm:text-[11px] leading-snug text-[#C9B8A5]/72">
                Comprendre, planifier et piloter.
              </p>

              <div className="mt-4 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:p-3.5">
                <div className="relative">
                  <div className="pointer-events-none absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-[#E6D6C3]/30 via-white/[0.08] to-[#E6B08C]/28" />
                  <ul className="flex flex-col gap-2 py-1">
                    {phases.map((phase) => {
                      const isActive = activePhase === phase
                      const insight = HERO_PERFORMANCE_PHASE_CONTENT[phase]
                      return (
                        <li key={phase}>
                          <button
                            type="button"
                            onClick={() => selectPhase(phase)}
                            className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition sm:px-3 sm:py-3 ${
                              isActive
                                ? "border border-white/[0.12] bg-white/[0.07] shadow-sm"
                                : "border border-transparent hover:bg-white/[0.04]"
                            }`}
                            aria-pressed={isActive}
                            aria-label={`Phase ${insight.step} — ${phase}`}
                          >
                            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
                              <span
                                className={`absolute h-2 w-2 rounded-full ${
                                  isActive ? "bg-[#E0742D]" : "bg-[#E6D6C3]/80"
                                }`}
                              />
                              <span className="absolute h-5 w-5 rounded-full border border-white/10 bg-white/[0.02]" />
                            </span>
                            <span
                              className={`text-[11px] font-medium tracking-wide ${
                                isActive ? "text-[#E6D6C3]" : "text-[#E6D6C3]/90"
                              }`}
                            >
                              {phase}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>

            <div className="hidden bg-white/[0.08] lg:block" aria-hidden />

            <div className="border-t border-white/[0.08] px-5 py-5 sm:px-6 sm:py-6 lg:border-t-0 lg:px-4 lg:py-5 xl:px-5 xl:py-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E0742D]/90">
                {active.panelTitle}
              </p>
              {active.panelSubtitle ? (
                <p className="mt-2 text-xs leading-relaxed text-[#C9B8A5]/80 sm:text-sm">{active.panelSubtitle}</p>
              ) : null}

              <div className="mt-4 min-h-[8rem] w-full min-w-0 sm:min-h-[9rem]">
                <HeroPhaseVisual phase={activePhase} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .trajectory-wow-border {
          background: conic-gradient(
            from 120deg,
            rgba(230, 214, 195, 0.9),
            rgba(230, 176, 140, 0.9),
            rgba(255, 255, 255, 0.25),
            rgba(230, 214, 195, 0.9)
          );
          filter: drop-shadow(0 18px 55px rgba(0, 0, 0, 0.45));
          animation: trajectoryWowSpin 10s linear infinite;
        }

        .trajectory-wow-shimmer {
          background: radial-gradient(700px 300px at 20% 15%, rgba(230, 214, 195, 0.16), transparent 60%),
            radial-gradient(500px 240px at 85% 40%, rgba(230, 176, 140, 0.12), transparent 55%),
            linear-gradient(115deg, transparent 0%, rgba(255, 255, 255, 0.06) 35%, transparent 70%);
          transform: translateX(-22%);
          animation: trajectoryWowShimmer 6s ease-in-out infinite;
        }

        .trajectory-wow-noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E");
          background-size: 160px 160px;
        }

        @keyframes trajectoryWowSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes trajectoryWowShimmer {
          0% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
          50% {
            transform: translateX(12%);
            opacity: 0.75;
          }
          100% {
            transform: translateX(-24%);
            opacity: 0.55;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .trajectory-wow-border,
          .trajectory-wow-shimmer {
            animation: none;
          }

          .trajectory-wow-shimmer {
            opacity: 0.45;
            transform: none;
          }
        }
      `}</style>
    </div>
  )
}
