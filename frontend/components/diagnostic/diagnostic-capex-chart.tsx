"use client"

import type { DiagnosticTrendYear } from "@/lib/api"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  formatCompactMoney,
  formatMoney,
  formatPercent,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticCapexChartProps {
  trends: DiagnosticTrendYear[]
  currency: string
}

const chartConfig = {
  capex: { label: "Capex", color: "#10b981" },
  depreciation: { label: "Amortissement", color: "#3b82f6" },
  capex_revenue_pct: { label: "Capex / CA (%)", color: "#f59e0b" },
}

/** Capex vs amortissement par exercice + Capex en % du CA (ligne, axe droit). */
export function DiagnosticCapexChart({ trends, currency }: DiagnosticCapexChartProps) {
  if (trends.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Aucune donnée d&apos;investissement disponible.
      </p>
    )
  }

  const data = [...trends]
    .sort((a, b) => a.fiscal_year - b.fiscal_year)
    .map((t) => ({
      label: String(t.fiscal_year),
      capex: t.capex,
      depreciation: t.depreciation,
      capex_revenue_pct:
        t.revenue !== 0 ? (t.capex / t.revenue) * 100 : null,
    }))

  return (
    <div>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <ComposedChart data={data} margin={{ top: 20, right: 40, left: 10, bottom: 5 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
        <XAxis
          dataKey="label"
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
            const d = payload[0]?.payload as (typeof data)[number]
            return (
              <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                <div className="mb-2 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
                  Exercice {label}
                </div>
                <div className="min-w-[200px] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">Capex</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatMoney(d.capex, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">Amortissement</span>
                    <span className="font-mono font-bold text-blue-600">
                      {formatMoney(d.depreciation, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1.5">
                    <span className="text-slate-600">Capex / CA</span>
                    <span className="font-mono font-bold text-amber-600">
                      {formatPercent(d.capex_revenue_pct)}
                    </span>
                  </div>
                </div>
              </div>
            )
          }}
        />
        <defs>
          <linearGradient id="diagCapexGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id="diagDepreciationGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <Bar
          yAxisId="left"
          dataKey="capex"
          fill="url(#diagCapexGradient)"
          name="Capex"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          isAnimationActive={false}
          stroke="#059669"
          strokeWidth={0.5}
        />
        <Bar
          yAxisId="left"
          dataKey="depreciation"
          fill="url(#diagDepreciationGradient)"
          name="Amortissement"
          radius={[4, 4, 0, 0]}
          maxBarSize={36}
          isAnimationActive={false}
          stroke="#2563eb"
          strokeWidth={0.5}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="capex_revenue_pct"
          stroke="#f59e0b"
          strokeWidth={3}
          isAnimationActive={false}
          dot={{ fill: "#f59e0b", r: 4, strokeWidth: 2, stroke: "#fff" }}
          name="Capex / CA (%)"
          connectNulls
        />
        </ComposedChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" aria-hidden /> Capex
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="h-3 w-3 rounded-sm bg-blue-500" aria-hidden /> Amortissement
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <span className="h-1 w-6 rounded-full bg-amber-500" aria-hidden /> Capex / CA (%)
        </span>
      </div>
    </div>
  )
}
