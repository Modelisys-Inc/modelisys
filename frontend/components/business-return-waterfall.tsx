"use client"

import type { ReactNode } from "react"
import {
  Coins,
  Percent,
  ShieldCheck,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  buildReturnWaterfallForView,
  computeReturnNarrative,
  computeReturnProjection,
  formatMillionsCompactFr,
  formatPercentFr,
  RETURN_HORIZON_YEARS,
  RETURN_WATERFALL_COLORS,
  type ReturnWaterfallStep,
  type ReturnWaterfallView,
} from "@/lib/landing-business-return"

const BAR_HEIGHT = 14
const RIBBON_HEIGHT = 20
const TOTAL_RIBBON_HEIGHT = 22

const DRIVER_ICONS: Record<string, LucideIcon> = {
  revenus: TrendingUp,
  marge: Percent,
  bfr: Wallet,
  risque: ShieldCheck,
  distributions: Coins,
}

function driverIconId(stepId: string): string {
  const match = stepId.match(/(revenus|marge|bfr|risque|distributions)$/)
  return match?.[1] ?? stepId
}

type LayoutRow = {
  step: ReturnWaterfallStep
  startPct: number
  widthPct: number
  rowIndex: number
}

function waterfallLayout(steps: ReturnWaterfallStep[], maxM: number): LayoutRow[] {
  let runningM = 0
  let rowIndex = 0

  return steps.map((step) => {
    if (step.kind === "anchor") {
      runningM = step.amountM
      return {
        step,
        startPct: 0,
        widthPct: (step.amountM / maxM) * 100,
        rowIndex: rowIndex++,
      }
    }

    if (step.kind === "add") {
      const startPct = (runningM / maxM) * 100
      const widthPct = (step.amountM / maxM) * 100
      runningM += step.amountM
      return { step, startPct, widthPct, rowIndex: rowIndex++ }
    }

    if (step.kind === "subtotal") {
      runningM = step.amountM
      return {
        step,
        startPct: 0,
        widthPct: (step.amountM / maxM) * 100,
        rowIndex: rowIndex++,
      }
    }

    runningM = step.amountM
    return {
      step,
      startPct: 0,
      widthPct: (step.amountM / maxM) * 100,
      rowIndex: rowIndex++,
    }
  })
}

function ribbonPath(widthPct: number, height: number, arrowW = 8): string {
  const w = Math.max(widthPct, 36)
  const tip = Math.min(arrowW, w * 0.07)
  return `M 0 0 L ${w - tip} 0 L ${w} ${height / 2} L ${w - tip} ${height} L 0 ${height} Z`
}

function BarSvg({
  step,
  startPct,
  widthPct,
  maxBarWidth = 100,
}: {
  step: ReturnWaterfallStep
  startPct: number
  widthPct: number
  maxBarWidth?: number
}) {
  if (step.kind === "section") return null

  const scale = (pct: number) => (pct / 100) * maxBarWidth

  if (step.kind === "anchor") {
    const w = Math.max(scale(widthPct), 12)
    return (
      <svg viewBox={`0 0 ${maxBarWidth} ${BAR_HEIGHT}`} className="h-[14px] w-full" preserveAspectRatio="none" aria-hidden>
        <rect x={0} y={0} width={w} height={BAR_HEIGHT} rx={3} fill={`url(#wf-anchor)`} />
      </svg>
    )
  }

  if (step.kind === "add") {
    const w = Math.max(scale(widthPct), 3)
    const x = scale(startPct)
    const gradientId = step.tone === "distribution" ? "wf-distribution" : "wf-value"
    return (
      <svg viewBox={`0 0 ${maxBarWidth} ${BAR_HEIGHT}`} className="h-[14px] w-full" preserveAspectRatio="none" aria-hidden>
        <line
          x1={x}
          y1={0}
          x2={x}
          y2={BAR_HEIGHT}
          stroke="rgba(230,214,195,0.2)"
          strokeWidth={0.6}
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        />
        <rect x={x} y={0} width={w} height={BAR_HEIGHT} rx={3} fill={`url(#${gradientId})`} />
      </svg>
    )
  }

  if (step.kind === "subtotal") {
    const w = Math.max(scale(widthPct), 40)
    return (
      <svg viewBox={`0 0 ${maxBarWidth} ${RIBBON_HEIGHT}`} className="h-5 w-full" preserveAspectRatio="none" aria-hidden>
        <path d={ribbonPath(w, RIBBON_HEIGHT)} fill="url(#wf-subtotal)" />
      </svg>
    )
  }

  const w = Math.max(scale(widthPct), 44)
  const gradientId = step.variant === "projected" ? "wf-projected-total" : "wf-realized-total"
  return (
    <svg viewBox={`0 0 ${maxBarWidth} ${TOTAL_RIBBON_HEIGHT}`} className="h-[22px] w-full" preserveAspectRatio="none" aria-hidden>
      <path d={ribbonPath(w, TOTAL_RIBBON_HEIGHT, 10)} fill={`url(#${gradientId})`} />
    </svg>
  )
}

function stepValue(step: ReturnWaterfallStep): ReactNode {
  if (step.kind === "section") return null
  if (step.kind === "anchor") return formatMillionsCompactFr(step.amountM)
  if (step.kind === "add") return formatPercentFr(step.annualizedPct)
  if (step.kind === "subtotal") {
    return (
      <>
        <span className="shrink-0 font-semibold text-white">{formatMillionsCompactFr(step.amountM)}</span>
        <span className="shrink-0 text-white/75">{formatPercentFr(step.growthPct, 0)}</span>
      </>
    )
  }
  return (
    <>
      <span className="shrink-0 font-bold">{formatPercentFr(step.totalReturnPct, 0)}</span>
      <span className="shrink-0 opacity-85">{formatPercentFr(step.annualizedCagrPct)}&nbsp;/&nbsp;an</span>
    </>
  )
}

function stepLabel(step: ReturnWaterfallStep): ReactNode {
  if (step.kind === "section") {
    return (
      <span
        className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
          step.variant === "projected" ? "text-[#8BB4F7]/90" : "text-[#E6B08C]/90"
        }`}
      >
        {step.label}
      </span>
    )
  }

  if (step.kind === "add") {
    const iconId = driverIconId(step.id)
    const Icon = DRIVER_ICONS[iconId]
    return (
      <span className="flex min-w-0 items-center gap-2">
        {Icon ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.05] ring-1 ring-white/[0.08]">
            <Icon className="h-3 w-3 text-[#C9B8A5]/65" strokeWidth={2} />
          </span>
        ) : null}
        <span className="min-w-0 text-[13px] leading-snug text-[#C9B8A5]/88 sm:truncate sm:text-xs">{step.label}</span>
      </span>
    )
  }

  if (step.kind === "subtotal" || step.kind === "total") {
    const suffix = step.kind === "total" ? ` · ${RETURN_HORIZON_YEARS} ans` : ""
    return (
      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#E6D6C3] sm:text-[11px]">
        {step.label}
        {suffix}
      </span>
    )
  }

  return <span className="text-[11px] font-medium text-[#E6D6C3]/92 sm:text-xs">{step.label}</span>
}

function KpiStrip({ view }: { view: ReturnWaterfallView }) {
  const realized = computeReturnNarrative()
  const projected = computeReturnProjection()

  const items =
    view === "realized"
      ? [
          { label: "Il y a 3 ans", value: formatMillionsCompactFr(realized.valueThreeYearsAgoM), accent: false },
          { label: "Aujourd'hui", value: formatMillionsCompactFr(realized.currentValueM), accent: false },
          { label: "Rendement total", value: formatPercentFr(realized.totalReturnPct, 0), accent: "realized" as const },
        ]
      : [
          { label: "Aujourd'hui", value: formatMillionsCompactFr(projected.valueStartM), accent: false },
          { label: "Valeur projetée", value: formatMillionsCompactFr(projected.projectedValueM), accent: false },
          { label: "Rendement projeté", value: formatPercentFr(projected.totalReturnPct, 0), accent: "projected" as const },
        ]

  return (
    <div className="grid grid-cols-3 gap-3 border-y border-white/[0.08] py-4 sm:gap-8 sm:py-5">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <p className="text-[9px] font-medium uppercase leading-tight tracking-[0.08em] text-[#C9B8A5]/55 sm:text-[10px] sm:tracking-[0.16em]">
            {item.label}
          </p>
          <p
            className={`mt-1.5 font-mono text-lg font-semibold tabular-nums tracking-tight sm:text-xl ${
              item.accent === "realized"
                ? "text-[#E0742D]"
                : item.accent === "projected"
                  ? "text-[#6BA3F5]"
                  : "text-[#E6D6C3]"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ReturnWaterfallView
  onChange: (view: ReturnWaterfallView) => void
}) {
  const options: { id: ReturnWaterfallView; label: string }[] = [
    { id: "realized", label: "Réalisé" },
    { id: "projected", label: "Projeté" },
  ]

  return (
    <div
      className="inline-flex gap-1 border-b border-white/[0.08] pb-px"
      role="tablist"
      aria-label="Période du rendement"
    >
      {options.map((option) => {
        const isActive = view === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={`relative px-3 py-2 text-[11px] font-semibold tracking-[0.08em] transition-colors duration-300 sm:px-4 sm:text-xs ${
              isActive
                ? "text-[#E6D6C3]"
                : "text-[#C9B8A5]/55 hover:text-[#C9B8A5]/90"
            }`}
          >
            {option.label}
            <span
              className={`absolute inset-x-3 -bottom-px h-px transition-colors duration-300 sm:inset-x-4 ${
                isActive
                  ? option.id === "realized"
                    ? "bg-[#E0742D]"
                    : "bg-[#6BA3F5]"
                  : "bg-transparent"
              }`}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}

export function BusinessReturnWaterfall() {
  const realized = computeReturnNarrative()
  const projected = computeReturnProjection()
  const [view, setView] = useState<ReturnWaterfallView>("realized")
  const { steps, maxM, sectionLabel } = buildReturnWaterfallForView(view)
  const layout = waterfallLayout(steps, maxM)
  const containerRef = useRef<HTMLDivElement>(null)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    setAnimate(false)
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [view])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setAnimate(true)
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="relative max-w-xl">
      <svg width={0} height={0} className="absolute" aria-hidden>
        <defs>
          <linearGradient id="wf-anchor" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RETURN_WATERFALL_COLORS.anchor.from} />
            <stop offset="100%" stopColor={RETURN_WATERFALL_COLORS.anchor.to} />
          </linearGradient>
          <linearGradient id="wf-value" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RETURN_WATERFALL_COLORS.valueAdd.from} />
            <stop offset="100%" stopColor={RETURN_WATERFALL_COLORS.valueAdd.to} />
          </linearGradient>
          <linearGradient id="wf-distribution" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RETURN_WATERFALL_COLORS.distribution.from} />
            <stop offset="100%" stopColor={RETURN_WATERFALL_COLORS.distribution.to} />
          </linearGradient>
          <linearGradient id="wf-subtotal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RETURN_WATERFALL_COLORS.subtotal.from} />
            <stop offset="100%" stopColor={RETURN_WATERFALL_COLORS.subtotal.to} />
          </linearGradient>
          <linearGradient id="wf-realized-total" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RETURN_WATERFALL_COLORS.realizedTotal.from} />
            <stop offset="100%" stopColor={RETURN_WATERFALL_COLORS.realizedTotal.to} />
          </linearGradient>
          <linearGradient id="wf-projected-total" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={RETURN_WATERFALL_COLORS.projectedTotal.from} />
            <stop offset="100%" stopColor={RETURN_WATERFALL_COLORS.projectedTotal.to} />
          </linearGradient>
        </defs>
      </svg>

      <div className="relative overflow-hidden border border-white/[0.08] bg-white/[0.02]">
        <div className="border-b border-white/[0.07] px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <ViewToggle view={view} onChange={setView} />
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#C9B8A5]/45 sm:text-right">
              {sectionLabel}
            </p>
          </div>
          <div className="mt-5">
            <KpiStrip view={view} />
          </div>
        </div>

        <div className="px-4 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9B8A5]/55">
            Décomposition · {RETURN_HORIZON_YEARS} ans
          </p>
          <p className="mt-2 text-[15px] font-medium leading-snug text-[#E6D6C3]/90">
            {view === "realized" ? (
              <>
                Voici pourquoi votre entreprise a généré{" "}
                <span className="font-semibold text-[#E0742D]">{formatPercentFr(realized.annualizedCagrPct)} / an</span>
              </>
            ) : (
              <>
                Selon vos projections, un rendement de{" "}
                <span className="font-semibold text-[#6BA3F5]">{formatPercentFr(projected.annualizedCagrPct)} / an</span>{" "}
                est attendu
              </>
            )}
          </p>

          <div
            key={view}
            className="relative mt-5"
            aria-label={sectionLabel}
          >
            {/* Grille de fond */}
            <div
              className="pointer-events-none absolute inset-0 left-[38%] right-[10rem] hidden sm:block"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px)",
                backgroundSize: "25% 100%",
              }}
              aria-hidden
            />

            <div className="space-y-0">
              {layout.map(({ step, startPct, widthPct, rowIndex }) => {
                const delay = animate ? rowIndex * 0.05 : 0
                const rowStyle = animate
                  ? { animation: `wf-row-in 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s both` }
                  : undefined

                const isRibbon = step.kind === "subtotal" || step.kind === "total"
                const valueColor =
                  step.kind === "total"
                    ? step.variant === "projected"
                      ? "text-[#A8C9FA]"
                      : "text-[#FDE68A]"
                    : isRibbon
                      ? "text-white"
                      : "text-[#E6D6C3]/90"

                return (
                  <div
                    key={step.id}
                    className="grid grid-cols-1 gap-1.5 border-b border-white/[0.05] py-2.5 last:border-b-0 sm:h-8 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)_10rem] sm:items-center sm:gap-x-3 sm:border-0 sm:py-0"
                    style={rowStyle}
                  >
                    <div className="flex min-w-0 items-center sm:h-full">{stepLabel(step)}</div>

                    <div className="flex min-w-0 items-center gap-3 sm:contents">
                      <div className="flex min-w-0 flex-1 items-center sm:h-full">
                        <BarSvg step={step} startPct={startPct} widthPct={widthPct} />
                      </div>

                      <div
                        className={`flex shrink-0 items-center justify-end gap-1.5 whitespace-nowrap text-right font-mono text-[11px] tabular-nums sm:h-full sm:text-[11px] ${valueColor}`}
                      >
                        {stepValue(step)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4">
            <span className="flex items-center gap-1.5 text-[9px] text-[#C9B8A5]/55 sm:text-[10px]">
              <span
                className="h-2 w-4 rounded-sm"
                style={{
                  background: `linear-gradient(to right, ${RETURN_WATERFALL_COLORS.valueAdd.from}, ${RETURN_WATERFALL_COLORS.valueAdd.to})`,
                }}
              />
              Création de valeur
            </span>
            <span className="flex items-center gap-1.5 text-[9px] text-[#C9B8A5]/55 sm:text-[10px]">
              <span
                className="h-2 w-4 rounded-sm"
                style={{
                  background: `linear-gradient(to right, ${RETURN_WATERFALL_COLORS.distribution.from}, ${RETURN_WATERFALL_COLORS.distribution.to})`,
                }}
              />
              Distributions
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wf-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
