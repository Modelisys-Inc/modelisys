"use client"

import type { DiagnosticTrendYear } from "@/lib/api"
import {
  formatCompactMoney,
  formatMoney,
  formatPercent,
} from "@/components/diagnostic/diagnostic-format"
import { useCountUpOnVisible } from "@/components/diagnostic/v2/use-count-up"
import type { DrillDownRequest } from "@/components/diagnostic/v2/types"

interface DiagnosticTrajectoryChartProps {
  trends: DiagnosticTrendYear[]
  currency: string
  /** Facteur appliqué aux montants quand une division est filtrée (part du CA). */
  scale?: number
  onDrillDown: (req: DrillDownRequest) => void
}

const VB_W = 1080
const VB_H = 344
const X0 = 68
const X1 = 1020
const TOP = 30
const PLOT_H = 250

/**
 * Trajectoire 5 ans : barres de chiffre d'affaires avec EBITDA imbriqué,
 * plus deux courbes de marge sur l'axe droit.
 *
 * SVG écrit à la main plutôt que recharts : le graphique doit superposer
 * quatre séries sur deux axes avec des étiquettes de valeur au-dessus de
 * chaque barre et une variation N/N-1 sous l'axe — recharts ne compose pas
 * cela proprement et coûte ~100 kB de bundle sur une page déjà lourde.
 */
export function DiagnosticTrajectoryChart({
  trends,
  currency,
  scale = 1,
  onDrillDown,
}: DiagnosticTrajectoryChartProps) {
  const { ref, t } = useCountUpOnVisible<HTMLDivElement>(800)
  const years = [...trends].sort((a, b) => a.fiscal_year - b.fiscal_year)

  if (years.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Aucune donnée historique disponible pour cette société.
      </p>
    )
  }

  const maxRevenue = Math.max(...years.map((y) => y.revenue * scale)) * 1.18 || 1
  const maxPct = 40
  const step = (X1 - X0) / years.length
  const barWidth = Math.min(88, step * 0.42)

  const yRevenue = (v: number) => TOP + PLOT_H - (v / maxRevenue) * PLOT_H
  const yPct = (v: number) => TOP + PLOT_H - (v / maxPct) * PLOT_H
  const centerX = (i: number) => X0 + step * i + step / 2

  const gridlines = Array.from({ length: 5 }, (_, i) => {
    const v = (maxRevenue / 4) * i
    return { y: yRevenue(v), left: formatCompactMoney(v, currency), right: `${(maxPct / 4) * i} %` }
  })

  const ebitdaLine = years
    .map((y, i) => `${centerX(i)},${yPct(y.ebitda_margin_pct ?? 0)}`)
    .join(" ")
  const netLine = years.map((y, i) => `${centerX(i)},${yPct(y.net_margin_pct ?? 0)}`).join(" ")

  return (
    <div ref={ref}>
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="block h-auto w-full overflow-visible">
        <defs>
          <linearGradient id="diagRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3FE0A8" />
            <stop offset="100%" stopColor="#0F8F68" />
          </linearGradient>
        </defs>

        {gridlines.map((g, i) => (
          <g key={i}>
            <line x1={58} x2={1030} y1={g.y} y2={g.y} stroke="#e2e8f0" />
            <text
              x={50}
              y={g.y + 4}
              textAnchor="end"
              fontSize={11}
              fontFamily="ui-monospace,Menlo,monospace"
              fill="#94a3b8"
            >
              {g.left}
            </text>
            <text
              x={1038}
              y={g.y + 4}
              fontSize={11}
              fontFamily="ui-monospace,Menlo,monospace"
              fill="#94a3b8"
            >
              {g.right}
            </text>
          </g>
        ))}

        {years.map((y, i) => {
          const revenue = y.revenue * scale
          const ebitda = y.ebitda * scale
          const cx = centerX(i)
          const barTop = yRevenue(revenue)
          const ebitdaTop = yRevenue(ebitda)
          const prev = i > 0 ? years[i - 1] : null
          const yoy = prev && prev.revenue !== 0 ? (y.revenue / prev.revenue - 1) * 100 : null

          const openYear = () =>
            onDrillDown({
              kicker: `Exercice ${y.fiscal_year}`,
              title: formatMoney(revenue, currency),
              subtitle: "Chiffre d'affaires de l'exercice",
              stats: [
                { label: "EBITDA", value: formatMoney(ebitda, currency), tone: "positive" },
                { label: "Marge EBITDA", value: formatPercent(y.ebitda_margin_pct) },
                { label: "Bénéfice net", value: formatMoney(y.net_income * scale, currency) },
                { label: "Marge brute", value: formatPercent(y.gross_margin_pct) },
              ],
              series: years.map((z) => ({
                label: String(z.fiscal_year),
                value: z.revenue * scale,
              })),
              formatValue: (v) => formatCompactMoney(v, currency),
            })

          return (
            <g
              key={y.fiscal_year}
              role="button"
              tabIndex={0}
              aria-label={`Exercice ${y.fiscal_year} — ${formatCompactMoney(revenue, currency)}`}
              className="cursor-pointer focus:outline-none [&:focus-visible>rect:first-of-type]:stroke-[#E0742D] [&:focus-visible>rect:first-of-type]:[stroke-width:2]"
              onClick={openYear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  openYear()
                }
              }}
            >
              <rect x={cx - step / 2 + 3} y={18} width={step - 6} height={272} rx={8} fill="transparent" />
              <rect
                x={cx - barWidth / 2}
                y={barTop}
                width={barWidth}
                height={(TOP + PLOT_H - barTop) * t}
                transform={`translate(0 ${(TOP + PLOT_H - barTop) * (1 - t)})`}
                rx={5}
                fill="url(#diagRevenueGradient)"
              />
              <rect
                x={cx - barWidth / 2 + barWidth * 0.22}
                y={ebitdaTop}
                width={barWidth * 0.56}
                height={(TOP + PLOT_H - ebitdaTop) * t}
                transform={`translate(0 ${(TOP + PLOT_H - ebitdaTop) * (1 - t)})`}
                rx={4}
                fill="rgba(224,116,45,.9)"
              />
              <text
                x={cx}
                y={barTop - 9}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fontFamily="ui-monospace,Menlo,monospace"
                fill="#2A2F3A"
              >
                {formatCompactMoney(revenue, currency)}
              </text>
              <text
                x={cx}
                y={312}
                textAnchor="middle"
                fontSize={12}
                fontWeight={600}
                fill={i === years.length - 1 ? "#2A2F3A" : "#64748b"}
              >
                {y.fiscal_year}
              </text>
              <text
                x={cx}
                y={330}
                textAnchor="middle"
                fontSize={10.5}
                fontFamily="ui-monospace,Menlo,monospace"
                fill={yoy === null ? "#cbd5e1" : yoy >= 0 ? "#34D399" : "#F16A5C"}
              >
                {yoy === null ? "—" : `${yoy >= 0 ? "+" : "−"}${formatPercent(Math.abs(yoy))}`}
              </text>
            </g>
          )
        })}

        <polyline
          points={ebitdaLine}
          fill="none"
          stroke="#F5B544"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - t}
        />
        <polyline
          points={netLine}
          fill="none"
          stroke="#8FA3BF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - t}
        />

        {years.map((y, i) => (
          <g key={`dots-${y.fiscal_year}`}>
            <circle
              cx={centerX(i)}
              cy={yPct(y.ebitda_margin_pct ?? 0)}
              r={3.6}
              fill="#F5B544"
              stroke="#ffffff"
              strokeWidth={2}
              opacity={t}
            />
            <circle
              cx={centerX(i)}
              cy={yPct(y.net_margin_pct ?? 0)}
              r={3.6}
              fill="#8FA3BF"
              stroke="#ffffff"
              strokeWidth={2}
              opacity={t}
            />
          </g>
        ))}
      </svg>
    </div>
  )
}
