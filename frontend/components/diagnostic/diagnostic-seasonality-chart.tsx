"use client"

import type { DiagnosticSeasonalityMonth } from "@/lib/api"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  formatCompactMoney,
  formatMoney,
  formatPercent,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticSeasonalityChartProps {
  seasonality: DiagnosticSeasonalityMonth[]
  currency: string
}

const chartConfig = {
  average_revenue: { label: "Revenu moyen", color: "#10b981" },
  revenue_share_pct: { label: "Part du CA annuel (%)", color: "#f59e0b" },
}

/** Saisonnalité : revenu mensuel moyen (barres) + part du CA annuel (ligne, axe droit). */
export function DiagnosticSeasonalityChart({
  seasonality,
  currency,
}: DiagnosticSeasonalityChartProps) {
  if (seasonality.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Pas assez de données mensuelles pour dégager une saisonnalité.
      </p>
    )
  }

  const data = [...seasonality].sort((a, b) => a.month_number - b.month_number)

  return (
    <div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <ComposedChart data={data} margin={{ top: 20, right: 40, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
        <XAxis
          dataKey="month_label"
          tick={{ fill: "#64748b", fontSize: 12 }}
          tickLine={{ stroke: "#cbd5e1" }}
          axisLine={{ stroke: "#cbd5e1" }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: "#64748b", fontSize: 12 }}
          tickLine={{ stroke: "#cbd5e1" }}
          axisLine={{ stroke: "#cbd5e1" }}
          tickFormatter={(value) => formatCompactMoney(value, currency)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: "#64748b", fontSize: 12 }}
          tickLine={{ stroke: "#cbd5e1" }}
          axisLine={{ stroke: "#cbd5e1" }}
          tickFormatter={(value) => `${value} %`}
        />
        <ChartTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const d = payload[0]?.payload as DiagnosticSeasonalityMonth
            return (
              <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                <div className="mb-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
                  {label}
                </div>
                <div className="min-w-[200px] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">Revenu moyen</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatMoney(d.average_revenue, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">EBITDA moyen</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatMoney(d.average_ebitda, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1.5">
                    <span className="text-slate-600">Part du CA annuel</span>
                    <span className="font-mono font-bold text-amber-600">
                      {formatPercent(d.revenue_share_pct)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">Marge EBITDA</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatPercent(d.ebitda_margin_pct)}
                    </span>
                  </div>
                </div>
              </div>
            )
          }}
        />
        <defs>
          <linearGradient id="diagSeasonalityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <Bar
          yAxisId="left"
          dataKey="average_revenue"
          fill="url(#diagSeasonalityGradient)"
          name="Revenu moyen"
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          isAnimationActive={false}
          stroke="#059669"
          strokeWidth={0.5}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="revenue_share_pct"
          stroke="#f59e0b"
          strokeWidth={3}
          isAnimationActive={false}
          dot={{ fill: "#f59e0b", r: 4, strokeWidth: 2, stroke: "#fff" }}
          name="Part du CA annuel (%)"
          connectNulls
        />
        </ComposedChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" aria-hidden /> Revenu mensuel moyen
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="h-1 w-6 rounded-full bg-amber-500" aria-hidden /> Part du CA annuel (%)
        </span>
      </div>
    </div>
  )
}
