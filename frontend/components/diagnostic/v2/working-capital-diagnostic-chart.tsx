"use client"

import { useMemo } from "react"
import { Bar, CartesianGrid, ComposedChart, Legend, Line, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatMoney } from "@/components/diagnostic/diagnostic-format"
import type { WorkingCapitalDiagnosticPoint } from "@/lib/working-capital-diagnostic"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

const FDR_COLORS = {
  fdr: "#3b82f6",
  fdrhc: "#10b981",
} as const

const CYCLE_COLORS = {
  dso: "#f59e0b",
  dio: "#8b5cf6",
  dpo: "#06b6d4",
  ccc: "#ec4899",
} as const

interface WorkingCapitalDiagnosticChartProps {
  points: WorkingCapitalDiagnosticPoint[]
  currency: string
  view: string
  className?: string
}

function FdrPanel({
  data,
  currency,
}: {
  data: WorkingCapitalDiagnosticPoint[]
  currency: string
}) {
  const chartConfig = useMemo(
    () => ({
      fdr: { label: "Fonds de roulement", color: FDR_COLORS.fdr },
      fdrhc: { label: "Fonds de roulement hors caisse", color: FDR_COLORS.fdrhc },
    }),
    [],
  )

  return (
    <div data-testid="working-capital-chart-fdr" className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h4 className="text-sm font-semibold text-[#2A2F3A]">Fonds de roulement</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Évolution du fonds de roulement et du fonds de roulement hors caisse par période.
        </p>
      </div>
      <div className="px-2 py-4 sm:px-4">
        <ChartContainer config={chartConfig} className="aspect-[16/9] min-h-[260px] w-full">
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
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
                const row = payload[0]?.payload as WorkingCapitalDiagnosticPoint | undefined
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
            <Bar dataKey="fdr" name="Fonds de roulement" fill={FDR_COLORS.fdr} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar
              dataKey="fdrhc"
              name="Fonds de roulement hors caisse"
              fill={FDR_COLORS.fdrhc}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  )
}

function CyclePanel({ data }: { data: WorkingCapitalDiagnosticPoint[] }) {
  const chartConfig = useMemo(
    () => ({
      dso: { label: "DSO", color: CYCLE_COLORS.dso },
      dio: { label: "DIO", color: CYCLE_COLORS.dio },
      dpo: { label: "DPO", color: CYCLE_COLORS.dpo },
      ccc: { label: "CCC", color: CYCLE_COLORS.ccc },
    }),
    [],
  )

  return (
    <div data-testid="working-capital-chart-cycle" className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
        <h4 className="text-sm font-semibold text-[#2A2F3A]">Cycle de trésorerie</h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          DSO, DIO, DPO et cycle de conversion de trésorerie (CCC) en jours.
        </p>
      </div>
      <div className="px-2 py-4 sm:px-4">
        <ChartContainer config={chartConfig} className="aspect-[16/9] min-h-[260px] w-full">
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => `${Number(v).toFixed(0)} j`}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const row = payload[0]?.payload as WorkingCapitalDiagnosticPoint | undefined
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
                          {Number(entry.value).toFixed(1)} jours
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
            <Bar dataKey="dso" name="DSO" fill={CYCLE_COLORS.dso} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="dio" name="DIO" fill={CYCLE_COLORS.dio} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Bar dataKey="dpo" name="DPO" fill={CYCLE_COLORS.dpo} radius={[4, 4, 0, 0]} maxBarSize={32} />
            <Line
              type="monotone"
              dataKey="ccc"
              name="CCC"
              stroke={CYCLE_COLORS.ccc}
              strokeWidth={2.5}
              dot={{ fill: CYCLE_COLORS.ccc, r: 4 }}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  )
}

export function WorkingCapitalDiagnosticChart({
  points,
  currency,
  className,
}: WorkingCapitalDiagnosticChartProps) {
  if (!points.length) return null

  return (
    <div data-testid="working-capital-chart" className={cn("relative bg-white", className)}>
      <div className="px-6 py-6 sm:px-7">
        <div className="mb-5">
          <p className="text-xs leading-relaxed text-slate-500">
            Indicateurs calculés automatiquement à partir de la structure « Fonds de roulement »
            (Analyse → Fonds de roulement). Pour modifier les formules ou les codes de liaison,
            configurez-les sur cette page d&apos;analyse.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <FdrPanel data={points} currency={currency} />
          <CyclePanel data={points} />
        </div>
      </div>
    </div>
  )
}
