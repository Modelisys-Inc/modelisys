"use client"

import type { CompanyDiagnostic, DiagnosticTrendYear } from "@/lib/api"
import { EmptyState } from "@/components/diagnostic/report/report-components"

const PRIMARY = "#E85D04"
const SUCCESS = "#2D6A4F"
const MUTED = "#94A3B8"

function hasSeriesData(values: number[]): boolean {
  return values.some((v) => Math.abs(v) > 1e-6)
}

function fmtShort(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}k`
  return abs.toFixed(0)
}

/** Barres (revenus + EBITDA) + ligne (marge brute %). */
export function PerformanceComboChart({ years }: { years: DiagnosticTrendYear[] }) {
  const revenues = years.map((y) => y.revenue)
  const ebitdas = years.map((y) => y.ebitda)

  if (!hasSeriesData(revenues) && !hasSeriesData(ebitdas)) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  const w = 520
  const h = 220
  const padL = 48
  const padR = 48
  const padT = 24
  const padB = 36
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const maxMoney = Math.max(...revenues, ...ebitdas, 1)
  const maxMargin = Math.max(...years.map((y) => y.gross_margin_pct ?? 0), 1, 50)
  const n = years.length
  const groupW = chartW / Math.max(n, 1)
  const barW = groupW * 0.28

  const marginY = (pct: number) => padT + chartH - (pct / maxMargin) * chartH

  const marginPoints = years
    .map((y, i) => {
      const x = padL + i * groupW + groupW / 2
      return `${x},${marginY(y.gross_margin_pct ?? 0)}`
    })
    .join(" ")

  return (
    <div className="report-print-chart" data-testid="report-performance-combo">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        {years.map((y, i) => {
          const gx = padL + i * groupW + groupW / 2
          const revH = (y.revenue / maxMoney) * chartH
          const ebitdaH = (y.ebitda / maxMoney) * chartH
          return (
            <g key={y.fiscal_year}>
              <rect
                x={gx - barW - 2}
                y={padT + chartH - revH}
                width={barW}
                height={Math.max(revH, 2)}
                fill={PRIMARY}
                opacity={0.85}
                rx={2}
              />
              <rect
                x={gx + 2}
                y={padT + chartH - ebitdaH}
                width={barW}
                height={Math.max(ebitdaH, 2)}
                fill={SUCCESS}
                opacity={0.75}
                rx={2}
              />
              <text x={gx} y={h - 10} textAnchor="middle" fontSize={9} fill={MUTED}>
                {y.fiscal_year}
              </text>
            </g>
          )
        })}
        <polyline
          points={marginPoints}
          fill="none"
          stroke="#E9C46A"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {years.map((y, i) => {
          const x = padL + i * groupW + groupW / 2
          return (
            <circle
              key={`m-${y.fiscal_year}`}
              cx={x}
              cy={marginY(y.gross_margin_pct ?? 0)}
              r={3}
              fill="#E9C46A"
            />
          )
        })}
      </svg>
      <div className="report-chart-legend">
        <span>
          <i className="report-legend-swatch" style={{ background: PRIMARY }} /> Revenus
        </span>
        <span>
          <i className="report-legend-swatch" style={{ background: "#E9C46A" }} /> Contribution marginale %
        </span>
        <span>
          <i className="report-legend-swatch" style={{ background: SUCCESS }} /> EBITDA
        </span>
      </div>
    </div>
  )
}

/** Stacked bars actif / passif. */
export function BalanceSheetStackedChart({ latest }: { latest: DiagnosticTrendYear | null }) {
  if (!latest || latest.total_assets <= 0) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  const ncAssets = Math.max(0, latest.total_assets - latest.current_assets)
  const ncLiab = Math.max(0, latest.total_liabilities - latest.current_liabilities)
  const equity = Math.max(0, latest.equity)

  const segments = [
    { label: "Actif CT", value: latest.current_assets, color: PRIMARY },
    { label: "Actif LT", value: ncAssets, color: "#F4A261" },
    { label: "Passif CT", value: latest.current_liabilities, color: "#E63946" },
    { label: "Passif LT", value: ncLiab, color: "#9B2226" },
    { label: "Capitaux propres", value: equity, color: SUCCESS },
  ].filter((s) => s.value > 0)

  const maxV = Math.max(...segments.map((s) => s.value), 1)
  const w = 520
  const barH = 28
  const gap = 10

  return (
    <div className="report-print-chart" data-testid="report-balance-stacked">
      <svg viewBox={`0 0 ${w} ${segments.length * (barH + gap) + 8}`} className="w-full" aria-hidden>
        {segments.map((seg, i) => {
          const y = i * (barH + gap)
          const barW = (seg.value / maxV) * (w - 120)
          return (
            <g key={seg.label}>
              <text x={0} y={y + barH / 2 + 4} fontSize={10} fill="#475569">
                {seg.label}
              </text>
              <rect x={110} y={y} width={barW} height={barH} fill={seg.color} rx={3} opacity={0.9} />
              <text x={115 + barW + 6} y={y + barH / 2 + 4} fontSize={9} fill={MUTED}>
                {fmtShort(seg.value)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Actif total vs CA (dual scale). */
export function AssetsRevenueDualChart({ years }: { years: DiagnosticTrendYear[] }) {
  const assets = years.map((y) => y.total_assets)
  const revenues = years.map((y) => y.revenue)
  if (!hasSeriesData(assets) && !hasSeriesData(revenues)) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  const w = 520
  const h = 200
  const pad = 40
  const chartW = w - pad * 2
  const chartH = h - pad * 2
  const maxA = Math.max(...assets, 1)
  const maxR = Math.max(...revenues, 1)
  const n = years.length

  const line = (vals: number[], max: number, color: string) => {
    const pts = vals
      .map((v, i) => {
        const x = pad + (i / Math.max(n - 1, 1)) * chartW
        const y = pad + chartH - (v / max) * chartH
        return `${x},${y}`
      })
      .join(" ")
    return <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
  }

  return (
    <div className="report-print-chart" data-testid="report-assets-revenue-dual">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
        {line(assets, maxA, PRIMARY)}
        {line(revenues, maxR, SUCCESS)}
        {years.map((y, i) => (
          <text
            key={y.fiscal_year}
            x={pad + (i / Math.max(n - 1, 1)) * chartW}
            y={h - 8}
            textAnchor="middle"
            fontSize={9}
            fill={MUTED}
          >
            {y.fiscal_year}
          </text>
        ))}
      </svg>
      <div className="report-chart-legend">
        <span>
          <i className="report-legend-swatch" style={{ background: PRIMARY }} /> Actif total
        </span>
        <span>
          <i className="report-legend-swatch" style={{ background: SUCCESS }} /> Chiffre d&apos;affaires
        </span>
      </div>
    </div>
  )
}

/** Mini sparkline pour évolution FDR. */
export function Sparkline({ values, color = PRIMARY }: { values: number[]; color?: string }) {
  if (!values.length || !hasSeriesData(values)) return null
  const w = 120
  const h = 32
  const min = Math.min(...values)
  const max = Math.max(...values, min + 1)
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w
      const y = h - ((v - min) / (max - min)) * (h - 4) - 2
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="report-sparkline" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  )
}

/** Part CA par produit (barres horizontales). */
export function RevenueShareChart({ diagnostic }: { diagnostic: CompanyDiagnostic }) {
  const products = [...diagnostic.products]
    .filter((p) => p.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  if (!products.length) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  const maxRev = products[0]!.revenue
  const w = 520
  const barH = 22
  const gap = 8

  return (
    <div className="report-print-chart" data-testid="report-revenue-share">
      <svg viewBox={`0 0 ${w} ${products.length * (barH + gap)}`} className="w-full" aria-hidden>
        {products.map((p, i) => {
          const y = i * (barH + gap)
          const barW = (p.revenue / maxRev) * (w - 160)
          return (
            <g key={p.product_name}>
              <text x={0} y={y + barH / 2 + 4} fontSize={9} fill="#475569">
                {p.product_name.length > 22 ? `${p.product_name.slice(0, 20)}…` : p.product_name}
              </text>
              <rect x={140} y={y} width={barW} height={barH} fill={PRIMARY} rx={2} opacity={0.85} />
              <text x={145 + barW + 4} y={y + barH / 2 + 4} fontSize={9} fill={MUTED}>
                {p.revenue_share_pct != null ? `${p.revenue_share_pct.toFixed(0)} %` : fmtShort(p.revenue)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
