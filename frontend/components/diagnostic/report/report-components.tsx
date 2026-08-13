"use client"

import type { ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import { REPORT_THEME } from "@/lib/report-theme"

export type KpiStatus = "positive" | "neutral" | "warning" | "negative"

const KPI_STATUS_CLASS: Record<KpiStatus, string> = {
  positive: "report-kpi-positive",
  neutral: "report-kpi-neutral",
  warning: "report-kpi-warning",
  negative: "report-kpi-negative",
}

export function KpiCard({
  label,
  value,
  trend,
  status = "neutral",
}: {
  label: string
  value: string
  trend?: string
  status?: KpiStatus
}) {
  return (
    <div className={`report-kpi-card ${KPI_STATUS_CLASS[status]}`}>
      <p className="report-kpi-label">{label}</p>
      <p className="report-kpi-value">{value}</p>
      {trend ? <p className="report-kpi-trend">{trend}</p> : null}
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="report-empty-state" data-testid="report-empty-state">
      <p>{message}</p>
    </div>
  )
}

export function HealthGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="report-health-gauge" data-testid="report-health-gauge">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={8}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={REPORT_THEME.colors.primary}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>
      <div className="report-health-gauge-center">
        <span className="report-health-gauge-score">{score}</span>
        <span className="report-health-gauge-max">/100</span>
      </div>
    </div>
  )
}

export interface WaterfallStep {
  label: string
  value: number
  type?: "total" | "delta" | "subtotal"
}

export function WaterfallChart({
  steps,
  currency,
  formatValue,
}: {
  steps: WaterfallStep[]
  currency: string
  formatValue?: (v: number) => string
}) {
  const fmt =
    formatValue ??
    ((v: number) =>
      v.toLocaleString("fr-CA", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }))

  const hasData = steps.some((s) => Math.abs(s.value) > 1e-6)
  if (!hasData) {
    return <EmptyState message="Données non disponibles pour cette période" />
  }

  const maxAbs = Math.max(...steps.map((s) => Math.abs(s.value)), 1)
  let running = 0

  return (
    <div className="report-waterfall" data-testid="report-waterfall">
      {steps.map((step, i) => {
        const isTotal = step.type === "total" || step.type === "subtotal"
        const barHeight = (Math.abs(step.value) / maxAbs) * 100
        if (isTotal) running = step.value
        else running += step.value
        const tone =
          step.value > 0 ? "report-waterfall-pos" : step.value < 0 ? "report-waterfall-neg" : ""
        return (
          <div key={`${step.label}-${i}`} className={`report-waterfall-step ${tone}`}>
            <div className="report-waterfall-bar-wrap">
              <div
                className={`report-waterfall-bar ${isTotal ? "report-waterfall-bar-total" : ""}`}
                style={{ height: `${Math.max(barHeight, 4)}%` }}
              />
            </div>
            <p className="report-waterfall-label">{step.label}</p>
            <p className="report-waterfall-value tabular-nums">{fmt(step.value)}</p>
          </div>
        )
      })}
    </div>
  )
}

export function ReportDisclaimerBox({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="report-disclaimer-box report-avoid-break">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#E9C46A]" aria-hidden />
        <div>
          <p className="report-disclaimer-title">{title}</p>
          <div className="report-disclaimer-body">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ValuationRangeChart({
  low,
  mid,
  high,
  equityValue,
  currency,
}: {
  low: number
  mid: number
  high: number
  equityValue: number | null
  currency: string
}) {
  const fmt = (v: number) =>
    v.toLocaleString("fr-CA", { style: "currency", currency, maximumFractionDigits: 0 })
  const span = high - low || 1
  const midPct = ((mid - low) / span) * 100
  const equityPct =
    equityValue != null ? Math.max(0, Math.min(100, ((equityValue - low) / span) * 100)) : null

  return (
    <div className="report-valuation-range" data-testid="report-valuation-range">
      <div className="report-valuation-track">
        <div className="report-valuation-fill" style={{ left: "0%", right: `${100 - midPct}%` }} />
        {equityPct != null ? (
          <div className="report-valuation-marker" style={{ left: `${equityPct}%` }} title="Equity" />
        ) : null}
      </div>
      <div className="report-valuation-labels">
        <span>{fmt(low)}</span>
        <span className="font-semibold text-[#E85D04]">{fmt(mid)}</span>
        <span>{fmt(high)}</span>
      </div>
    </div>
  )
}
