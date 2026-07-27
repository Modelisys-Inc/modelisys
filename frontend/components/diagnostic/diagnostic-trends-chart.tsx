"use client"

import type { DiagnosticTrendYear } from "@/lib/api"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import {
  formatCompactMoney,
  formatMoney,
  formatPercent,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticTrendsChartProps {
  trends: DiagnosticTrendYear[]
  currency: string
}

const chartConfig = {
  revenue: { label: "Chiffre d'affaires", color: "#10b981" },
  ebitda_margin_pct: { label: "Marge EBITDA (%)", color: "#f59e0b" },
  net_margin_pct: { label: "Marge nette (%)", color: "#475569" },
}

/** Légende manuelle, déterministe (les couleurs suivent chartConfig). */
function TrendsLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
      <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <span className="h-3 w-3 rounded-sm bg-emerald-500" aria-hidden /> Chiffre d&apos;affaires
      </span>
      <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <span className="h-1 w-6 rounded-full bg-amber-500" aria-hidden /> Marge EBITDA (%)
      </span>
      <span className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <span className="h-1 w-6 rounded-full bg-slate-600" aria-hidden /> Marge nette (%)
      </span>
    </div>
  )
}

/** Tendances 5 ans : barres de revenus + marges EBITDA / nette en lignes (axe droit). */
export function DiagnosticTrendsChart({ trends, currency }: DiagnosticTrendsChartProps) {
  if (trends.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Aucune donnée historique disponible pour cette société.
      </p>
    )
  }

  const data = trends.map((t) => ({
    ...t,
    label: String(t.fiscal_year),
  }))

  return (
    <div>
      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <ComposedChart data={data} margin={{ top: 20, right: 40, left: 10, bottom: 5 }}>
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
                <div className="min-w-[220px] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">Chiffre d&apos;affaires</span>
                    <span className="font-mono font-bold text-emerald-600">
                      {formatMoney(d.revenue, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">EBITDA</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatMoney(d.ebitda, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">Bénéfice net</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatMoney(d.net_income, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1.5">
                    <span className="text-slate-600">Marge EBITDA</span>
                    <span className="font-mono font-bold text-amber-600">
                      {formatPercent(d.ebitda_margin_pct)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-slate-600">Marge nette</span>
                    <span className="font-mono font-bold text-slate-700">
                      {formatPercent(d.net_margin_pct)}
                    </span>
                  </div>
                </div>
              </div>
            )
          }}
        />
        <defs>
          <linearGradient id="diagRevenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
          </linearGradient>
        </defs>
        <Bar
          yAxisId="left"
          dataKey="revenue"
          fill="url(#diagRevenueGradient)"
          name="Chiffre d'affaires"
          radius={[6, 6, 0, 0]}
          maxBarSize={64}
          isAnimationActive={false}
          stroke="#059669"
          strokeWidth={0.5}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="ebitda_margin_pct"
          stroke="#f59e0b"
          strokeWidth={3}
          isAnimationActive={false}
          dot={{ fill: "#f59e0b", r: 4, strokeWidth: 2, stroke: "#fff" }}
          name="Marge EBITDA (%)"
          connectNulls
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="net_margin_pct"
          stroke="#475569"
          strokeWidth={3}
          isAnimationActive={false}
          dot={{ fill: "#475569", r: 4, strokeWidth: 2, stroke: "#fff" }}
          name="Marge nette (%)"
          connectNulls
        />
        </ComposedChart>
      </ChartContainer>
      <TrendsLegend />
    </div>
  )
}
