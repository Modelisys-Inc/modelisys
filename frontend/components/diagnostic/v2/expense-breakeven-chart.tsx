"use client"

import { useCallback, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { MousePointer2, TrendingDown, TrendingUp } from "lucide-react"
import { formatMoney } from "@/components/diagnostic/diagnostic-format"
import { DIAG } from "@/lib/diagnostic-theme"
import {
  projectBreakevenScenario,
  type BreakevenAnalysis,
  type BreakevenScenario,
} from "@/lib/expense-breakeven"
import { cn } from "@/lib/utils"

const COLORS = {
  revenue: "#059669",
  revenueStroke: "#047857",
  totalCosts: "#DC2626",
  totalCostsStroke: "#B91C1C",
  fixedCosts: "#94A3B8",
  fixedFill: "#F1F5F9",
  variableFill: "#FEE2E2",
  breakeven: "#1E293B",
  currentRevenue: "#2563EB",
  crosshair: "#64748B",
  hoverBand: "rgba(37, 99, 235, 0.06)",
} as const

const WIDTH = 720
const HEIGHT = 380
const MARGIN = { top: 28, right: 24, bottom: 44, left: 56 }

type HoverState = {
  revenue: number
  svgX: number
}

function formatAxisMoney(value: number, currency: string): string {
  const abs = Math.abs(value)
  const symbol = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$"
  if (abs >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}k`
  return formatMoney(value, currency)
}

function fmtPerDollarRevenue(ratio: number): string {
  return `${ratio.toFixed(2).replace(".", ",")} $ / 1 $ CA`
}

function fmtPctPlain(p: number, digits = 1): string {
  return `${p.toFixed(digits).replace(".", ",")} %`
}

function buildPolyline(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")
}

function buildAreaPath(xs: number[], topYs: number[], bottomY: number): string {
  if (!xs.length) return ""
  const top = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${topYs[i]}`).join(" ")
  const bottom = [...xs].reverse().map((x) => `L ${x} ${bottomY}`).join(" ")
  return `${top} ${bottom} Z`
}

function clientToSvgX(svg: SVGSVGElement, clientX: number): number {
  const rect = svg.getBoundingClientRect()
  return ((clientX - rect.left) / rect.width) * WIDTH
}

function svgXToRevenue(svgX: number, maxRevenue: number): number {
  const plotW = WIDTH - MARGIN.left - MARGIN.right
  const clamped = Math.max(MARGIN.left, Math.min(WIDTH - MARGIN.right, svgX))
  const ratio = (clamped - MARGIN.left) / plotW
  return ratio * maxRevenue
}

function snapRevenue(raw: number, analysis: BreakevenAnalysis): number {
  const threshold = analysis.chartMaxRevenue * 0.018
  const candidates = [0, analysis.revenue, analysis.breakevenRevenue].filter(
    (v): v is number => v !== null && v >= 0,
  )
  for (const candidate of candidates) {
    if (Math.abs(raw - candidate) <= threshold) return candidate
  }
  return raw
}

function scenarioBadge(scenario: BreakevenScenario): { label: string; className: string } {
  if (scenario.badge === "actual") {
    return { label: "Réel", className: "bg-blue-50 text-blue-700" }
  }
  if (scenario.badge === "breakeven") {
    return { label: "Point mort", className: "bg-slate-100 text-slate-700" }
  }
  return { label: "Simulation", className: "bg-amber-50 text-amber-800" }
}

function BreakevenScenarioPanel({
  scenario,
  analysis,
  currency,
  period,
  isHovering,
  printMode = false,
}: {
  scenario: BreakevenScenario
  analysis: BreakevenAnalysis
  currency: string
  period: string
  isHovering: boolean
  printMode?: boolean
}) {
  const badge = scenarioBadge(scenario)
  const profitPositive = scenario.operatingProfit >= 0

  const metrics = [
    {
      label: "Coûts variables",
      value: formatMoney(scenario.variableCosts, currency),
      sub:
        analysis.variableCostRatio !== null
          ? `${fmtPctPlain(analysis.variableCostRatio * 100)} du CA`
          : undefined,
      dot: COLORS.totalCosts,
    },
    {
      label: "Coûts fixes",
      value: formatMoney(scenario.fixedCosts, currency),
      sub: "Structure",
      dot: COLORS.fixedCosts,
    },
    {
      label: "Coûts totaux",
      value: formatMoney(scenario.totalCosts, currency),
      sub: "CV + CF",
    },
    {
      label: "Marge contributive",
      value: formatMoney(scenario.contributiveMargin, currency),
      sub:
        scenario.contributiveMarginPct !== null
          ? `${fmtPctPlain(scenario.contributiveMarginPct)} du CA`
          : undefined,
      dot: "#E0742D",
    },
  ]

  return (
    <div
      data-testid="breakeven-scenario-panel"
      className={cn(
        "flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/60",
        printMode ? "min-h-0" : "min-h-[300px] lg:min-h-0",
      )}
    >
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {isHovering ? "Scénario au survol" : `Période de référence — ${period}`}
            </p>
            <p className="mt-1 truncate text-lg font-semibold tabular-nums text-[#2A2F3A]">
              {formatMoney(scenario.revenue, currency)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">Chiffre d&apos;affaires</p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
              badge.className,
            )}
          >
            {badge.label}
          </span>
        </div>
      </div>

      <div className={cn("flex-1 space-y-3 overflow-hidden px-4 py-3", printMode && "space-y-2 py-2")}>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2"
            >
              <div className="flex items-center gap-1.5">
                {m.dot ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.dot }} />
                ) : null}
                <span className="text-[10px] font-medium text-slate-500">{m.label}</span>
              </div>
              <p className="mt-1 text-sm font-semibold tabular-nums text-[#2A2F3A]">{m.value}</p>
              {m.sub ? <p className="text-[10px] text-slate-400">{m.sub}</p> : null}
            </div>
          ))}
        </div>

        <div
          className={cn(
            "rounded-lg border px-3 py-2.5",
            profitPositive
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-red-200 bg-red-50/70",
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Bénéfice d&apos;exploitation
          </p>
          <p
            className={cn(
              "mt-0.5 text-xl font-semibold tabular-nums",
              profitPositive ? "text-emerald-800" : "text-red-800",
            )}
          >
            {formatMoney(scenario.operatingProfit, currency)}
          </p>
          {scenario.operatingMarginPct !== null ? (
            <p className="text-[11px] text-slate-600">{fmtPctPlain(scenario.operatingMarginPct)} du CA</p>
          ) : null}
        </div>

        {analysis.breakevenRevenue !== null && scenario.gapToBreakeven !== null ? (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] leading-relaxed",
              scenario.isAboveBreakeven
                ? "border-emerald-100 bg-white text-emerald-900"
                : "border-red-100 bg-white text-red-900",
            )}
          >
            {scenario.isAboveBreakeven ? (
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <p>
              {scenario.isAboveBreakeven
                ? `${formatMoney(scenario.gapToBreakeven, currency)} au-dessus du seuil (${formatMoney(analysis.breakevenRevenue, currency)}).`
                : `${formatMoney(Math.abs(scenario.gapToBreakeven), currency)} sous le seuil (${formatMoney(analysis.breakevenRevenue, currency)}).`}
            </p>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div>
            <dt className="text-slate-400">Seuil de rentabilité</dt>
            <dd className="font-semibold tabular-nums text-slate-700">
              {analysis.breakevenRevenue !== null
                ? formatMoney(analysis.breakevenRevenue, currency)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-400">Ratio CV</dt>
            <dd className="font-semibold text-slate-700">
              {analysis.variableCostRatio !== null
                ? fmtPerDollarRevenue(analysis.variableCostRatio)
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{scenario.interpretation}</p>
      </div>
    </div>
  )
}

interface ExpenseBreakevenChartProps {
  analysis: BreakevenAnalysis
  currency: string
  className?: string
  printMode?: boolean
}

export function ExpenseBreakevenChart({
  analysis,
  currency,
  className,
  printMode = false,
}: ExpenseBreakevenChartProps) {
  const patternId = useId().replace(/:/g, "")
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const plot = useMemo(() => {
    const plotW = WIDTH - MARGIN.left - MARGIN.right
    const plotH = HEIGHT - MARGIN.top - MARGIN.bottom
    const maxX = analysis.chartMaxRevenue
    const maxY = analysis.chartMaxY

    const xScale = (v: number) => MARGIN.left + (v / maxX) * plotW
    const yScale = (v: number) => MARGIN.top + plotH - (v / maxY) * plotH
    const revenueAt = (r: number) => r
    const totalCostsAt = (r: number) => analysis.fixedCosts + (analysis.variableCostRatio ?? 0) * r

    const revenuePts = analysis.chartPoints.map((p) => ({
      x: xScale(p.revenue),
      y: yScale(p.revenueLine),
    }))
    const totalCostPts = analysis.chartPoints.map((p) => ({
      x: xScale(p.revenue),
      y: yScale(p.totalCosts),
    }))
    const fixedY = yScale(analysis.fixedCosts)

    const xs = analysis.chartPoints.map((p) => xScale(p.revenue))
    const totalYs = analysis.chartPoints.map((p) => yScale(p.totalCosts))

    const variableArea = buildAreaPath(xs, totalYs, fixedY)
    const fixedArea = buildAreaPath(xs, xs.map(() => fixedY), yScale(0))

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxY)
    const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxX)

    const breakeven =
      analysis.breakevenRevenue !== null
        ? { x: xScale(analysis.breakevenRevenue), y: yScale(analysis.breakevenRevenue) }
        : null

    const currentRevenueX = xScale(Math.min(analysis.revenue, maxX))

    const labelX = xScale(maxX * 0.52)
    const revenueLabelY = yScale(maxX * 0.52)
    const totalCostLabelY = yScale(totalCostsAt(maxX * 0.52))
    const fixedLabelY = fixedY

    return {
      revenuePts,
      totalCostPts,
      fixedY,
      variableArea,
      fixedArea,
      yTicks,
      xTicks,
      breakeven,
      currentRevenueX,
      labelX,
      revenueLabelY,
      totalCostLabelY,
      fixedLabelY,
      xScale,
      yScale,
      revenueAt,
      totalCostsAt,
    }
  }, [analysis])

  const activeScenario = useMemo(() => {
    const revenue = hover ? hover.revenue : analysis.revenue
    return projectBreakevenScenario(analysis, revenue)
  }, [analysis, hover])

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGRectElement>) => {
      const svg = svgRef.current
      if (!svg) return
      const svgX = clientToSvgX(svg, event.clientX)
      const rawRevenue = svgXToRevenue(svgX, analysis.chartMaxRevenue)
      const revenue = snapRevenue(rawRevenue, analysis)
      setHover({
        revenue,
        svgX: plot.xScale(revenue),
      })
    },
    [analysis, plot],
  )

  const handlePointerLeave = useCallback(() => setHover(null), [])

  const hoverGeometry = useMemo(() => {
    if (!hover) return null
    const r = hover.revenue
    const revenueY = plot.yScale(plot.revenueAt(r))
    const totalY = plot.yScale(plot.totalCostsAt(r))
    const fixedY = plot.yScale(analysis.fixedCosts)
    const profit = r - plot.totalCostsAt(r)
    return { revenueY, totalY, fixedY, profit }
  }, [hover, plot, analysis.fixedCosts])

  return (
    <div
      data-testid="expense-breakeven-chart"
      className={cn(
        "border-t border-slate-200 bg-white",
        printMode && "h-full border-t-0",
        className,
      )}
    >
      <div className={cn("px-6 py-6 sm:px-7", printMode && "flex h-full flex-col px-0 py-0")}>
        {!printMode ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Seuil de rentabilité
            </h4>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
              Analyse coût-volume-profit pour {analysis.period}. Survolez le graphique pour explorer un niveau de chiffre d&apos;affaires — le détail s&apos;affiche dans le panneau à droite.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
            <MousePointer2 className="h-3 w-3" aria-hidden />
            Survol interactif
          </div>
        </div>
        ) : null}

        <div
          className={cn(
            printMode
              ? "report-chart-print-row min-h-0 flex-1"
              : "flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5",
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className={cn("w-full aspect-[720/380]", printMode && "aspect-auto h-full")}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              preserveAspectRatio="xMidYMid meet"
              className="block h-full w-full touch-none select-none"
              role="img"
              aria-label="Graphique interactif du seuil de rentabilité"
            >
              <defs>
                <pattern
                  id={`grid-${patternId}`}
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke={DIAG.gridLine}
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>

              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={WIDTH - MARGIN.left - MARGIN.right}
                height={HEIGHT - MARGIN.top - MARGIN.bottom}
                fill={`url(#grid-${patternId})`}
              />

              {plot.fixedArea ? (
                <path d={plot.fixedArea} fill={COLORS.fixedFill} opacity={0.9} />
              ) : null}
              {plot.variableArea ? (
                <path d={plot.variableArea} fill={COLORS.variableFill} opacity={0.85} />
              ) : null}

              <line
                x1={MARGIN.left}
                y1={plot.fixedY}
                x2={WIDTH - MARGIN.right}
                y2={plot.fixedY}
                stroke={COLORS.fixedCosts}
                strokeWidth={2}
                strokeDasharray="6 4"
              />

              <path
                d={buildPolyline(plot.totalCostPts)}
                fill="none"
                stroke={COLORS.totalCosts}
                strokeWidth={2.5}
              />
              <path
                d={buildPolyline(plot.revenuePts)}
                fill="none"
                stroke={COLORS.revenue}
                strokeWidth={2.5}
              />

              {!hover && plot.currentRevenueX > MARGIN.left && plot.currentRevenueX < WIDTH - MARGIN.right ? (
                <line
                  x1={plot.currentRevenueX}
                  y1={MARGIN.top}
                  x2={plot.currentRevenueX}
                  y2={HEIGHT - MARGIN.bottom}
                  stroke={COLORS.currentRevenue}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.45}
                />
              ) : null}

              {plot.breakeven && !hover ? (
                <>
                  <circle
                    cx={plot.breakeven.x}
                    cy={plot.breakeven.y}
                    r={7}
                    fill="white"
                    stroke={COLORS.breakeven}
                    strokeWidth={2.5}
                  />
                  <circle cx={plot.breakeven.x} cy={plot.breakeven.y} r={3} fill={COLORS.breakeven} />
                </>
              ) : null}

              {hover && hoverGeometry ? (
                <g data-testid="breakeven-hover-crosshair">
                  <rect
                    x={hover.svgX - 6}
                    y={MARGIN.top}
                    width={12}
                    height={HEIGHT - MARGIN.top - MARGIN.bottom}
                    fill={COLORS.hoverBand}
                  />
                  <line
                    x1={hover.svgX}
                    y1={MARGIN.top}
                    x2={hover.svgX}
                    y2={HEIGHT - MARGIN.bottom}
                    stroke={COLORS.crosshair}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  {hoverGeometry.profit > 0 ? (
                    <rect
                      x={hover.svgX - 1}
                      y={hoverGeometry.revenueY}
                      width={2}
                      height={hoverGeometry.totalY - hoverGeometry.revenueY}
                      fill={COLORS.revenue}
                      opacity={0.35}
                    />
                  ) : hoverGeometry.profit < 0 ? (
                    <rect
                      x={hover.svgX - 1}
                      y={hoverGeometry.totalY}
                      width={2}
                      height={hoverGeometry.revenueY - hoverGeometry.totalY}
                      fill={COLORS.totalCosts}
                      opacity={0.35}
                    />
                  ) : null}
                  <circle
                    cx={hover.svgX}
                    cy={hoverGeometry.revenueY}
                    r={5}
                    fill="white"
                    stroke={COLORS.revenue}
                    strokeWidth={2}
                  />
                  <circle
                    cx={hover.svgX}
                    cy={hoverGeometry.totalY}
                    r={5}
                    fill="white"
                    stroke={COLORS.totalCosts}
                    strokeWidth={2}
                  />
                </g>
              ) : null}

              {plot.yTicks.map((tick) => (
                <g key={`yt-${tick}`}>
                  <line
                    x1={MARGIN.left}
                    y1={plot.yScale(tick)}
                    x2={WIDTH - MARGIN.right}
                    y2={plot.yScale(tick)}
                    stroke={DIAG.gridLine}
                    strokeWidth={1}
                  />
                  <text
                    x={MARGIN.left - 8}
                    y={plot.yScale(tick) + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill={DIAG.axisText}
                  >
                    {formatAxisMoney(tick, currency)}
                  </text>
                </g>
              ))}

              {plot.xTicks.map((tick) => (
                <text
                  key={`xt-${tick}`}
                  x={plot.xScale(tick)}
                  y={HEIGHT - MARGIN.bottom + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fill={DIAG.axisText}
                >
                  {formatAxisMoney(tick, currency)}
                </text>
              ))}

              <text
                x={(MARGIN.left + WIDTH - MARGIN.right) / 2}
                y={HEIGHT - 6}
                textAnchor="middle"
                fontSize={11}
                fill={DIAG.textMuted}
              >
                Chiffre d&apos;affaires
              </text>

              {!hover ? (
                <>
                  <g transform={`translate(${plot.labelX}, ${plot.revenueLabelY - 14})`}>
                    <rect x={-42} y={-11} width={84} height={20} rx={10} fill="white" stroke={COLORS.revenueStroke} strokeWidth={1} />
                    <text x={0} y={3} textAnchor="middle" fontSize={9} fontWeight={600} fill={COLORS.revenueStroke}>
                      REVENUS
                    </text>
                  </g>
                  <g transform={`translate(${plot.labelX}, ${plot.totalCostLabelY - 14})`}>
                    <rect x={-52} y={-11} width={104} height={20} rx={10} fill="white" stroke={COLORS.totalCostsStroke} strokeWidth={1} />
                    <text x={0} y={3} textAnchor="middle" fontSize={9} fontWeight={600} fill={COLORS.totalCostsStroke}>
                      COÛTS VARIABLES
                    </text>
                  </g>
                  <g transform={`translate(${plot.labelX}, ${plot.fixedLabelY + 18})`}>
                    <rect x={-42} y={-11} width={84} height={20} rx={10} fill="white" stroke={COLORS.fixedCosts} strokeWidth={1} />
                    <text x={0} y={3} textAnchor="middle" fontSize={9} fontWeight={600} fill="#64748B">
                      COÛTS FIXES
                    </text>
                  </g>
                </>
              ) : null}

              <rect
                x={MARGIN.left}
                y={MARGIN.top}
                width={WIDTH - MARGIN.left - MARGIN.right}
                height={HEIGHT - MARGIN.top - MARGIN.bottom}
                fill="transparent"
                className="cursor-crosshair"
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerDown={handlePointerMove}
              />
            </svg>
            </div>
          </div>

          <div className={cn("w-full shrink-0 lg:w-72 xl:w-80", printMode && "flex min-h-0 w-auto flex-col")}>
            <BreakevenScenarioPanel
              scenario={activeScenario}
              analysis={analysis}
              currency={currency}
              period={analysis.period}
              isHovering={hover !== null}
              printMode={printMode}
            />
          </div>
        </div>

        {!printMode ? (
        <p
          data-testid="breakeven-methodology-note"
          className="mt-5 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500"
        >
          Présentée sur une base d&apos;exploitation, cette analyse de seuil de rentabilité s&apos;appuie
          sur le chiffre d&apos;affaires et sur la ventilation des coûts variables et fixes issue du
          mapping comptable. Sont exclus de la lecture : l&apos;amortissement comptable, les charges
          d&apos;intérêts, les impôts sur le revenu, ainsi que tout produit ou charge non directement
          rattaché à l&apos;exploitation courante.
        </p>
        ) : null}
      </div>
    </div>
  )
}
