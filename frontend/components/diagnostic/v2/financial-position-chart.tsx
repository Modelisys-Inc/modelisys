"use client"

import { useMemo } from "react"
import { Bar, CartesianGrid, ComposedChart, Legend, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatMoney } from "@/components/diagnostic/diagnostic-format"
import type { FinancialPositionPoint } from "@/lib/financial-position"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

const ASSET_COLORS = {
  act: "#3b82f6",
  alt: "#10b981",
} as const

const LIABILITY_COLORS = {
  pct: "#f59e0b",
  plt: "#8b5cf6",
  cap: "#06b6d4",
} as const

interface FinancialPositionChartProps {
  points: FinancialPositionPoint[]
  currency: string
  view: string
  className?: string
}

function GroupedBarPanel({
  title,
  description,
  data,
  series,
  currency,
  testId,
}: {
  title: string
  description: string
  data: FinancialPositionPoint[]
  series: Array<{ key: keyof FinancialPositionPoint; label: string; color: string }>
  currency: string
  testId: string
}) {
  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {}
    for (const s of series) {
      cfg[s.key] = { label: s.label, color: s.color }
    }
    return cfg
  }, [series])

  const displayData = useMemo(() => [...data].reverse(), [data])

  return (
    <div data-testid={testId} className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h4 className="text-sm font-semibold text-[#2A2F3A]">{title}</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className="px-2 py-4 sm:px-4">
        <ChartContainer config={chartConfig} className="aspect-[16/9] min-h-[260px] w-full">
          <ComposedChart data={displayData} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => formatMoney(Number(v), currency)}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0]?.payload as FinancialPositionPoint | undefined
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                    <p className="mb-2 text-sm font-semibold text-slate-900">{row?.period}</p>
                    {payload.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-slate-600">{entry.name}:</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(Number(entry.value))}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => <span className="text-slate-600">{value}</span>}
            />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  )
}

export function FinancialPositionChart({
  points,
  currency,
  view,
  className,
}: FinancialPositionChartProps) {
  if (!points.length) return null

  const horizonLabel = view === "years" ? "cinq exercices" : "vingt-quatre mois"

  return (
    <div data-testid="financial-position-chart" className={cn("relative bg-white", className)}>
      <div className="px-6 py-6 sm:px-7">
        <div className="mb-5">
          <p className="text-xs leading-relaxed text-slate-500">
            Évolution de la structure du bilan sur les {horizonLabel} (société de référence).
            Montants agrégés à partir des familles ACT, ALT, PCT, PLT et CAP du mapping comptable.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <GroupedBarPanel
            title="Actif"
            description="Histogramme groupé : actif à court terme (ACT) et actif à long terme (ALT) par période."
            data={points}
            currency={currency}
            testId="financial-position-chart-assets"
            series={[
              { key: "act", label: "Actif court terme", color: ASSET_COLORS.act },
              { key: "alt", label: "Actif long terme", color: ASSET_COLORS.alt },
            ]}
          />
          <GroupedBarPanel
            title="Passif et capitaux propres"
            description="Histogramme groupé : passif court terme (PCT), passif long terme (PLT) et capitaux propres (CAP) par période."
            data={points}
            currency={currency}
            testId="financial-position-chart-liabilities"
            series={[
              { key: "pct", label: "Passif court terme", color: LIABILITY_COLORS.pct },
              { key: "plt", label: "Passif long terme", color: LIABILITY_COLORS.plt },
              { key: "cap", label: "Capitaux propres", color: LIABILITY_COLORS.cap },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
