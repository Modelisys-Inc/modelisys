"use client"

import type { RatioDataPoint } from "@/components/financial-ratios"
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Company } from "@/components/entity-selector"

interface FinancialRatiosChartProps {
  ratioData: RatioDataPoint[]
  loading?: boolean
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

export function FinancialRatiosChart({
  ratioData,
  loading = false,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: FinancialRatiosChartProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/80 shadow-lg mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (ratioData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/80 shadow-lg mb-6">
        <p className="text-slate-400">Aucune donnée disponible</p>
      </div>
    )
  }

  // Key metrics for the left panel
  const latestData = ratioData[ratioData.length - 1]
  const avgCurrentRatio =
    ratioData.filter((d) => d.currentRatio !== null).reduce((s, d) => s + (d.currentRatio || 0), 0) /
    (ratioData.filter((d) => d.currentRatio !== null).length || 1)
  const avgGrossMargin =
    ratioData.filter((d) => d.grossMargin !== null).reduce((s, d) => s + (d.grossMargin || 0), 0) /
    (ratioData.filter((d) => d.grossMargin !== null).length || 1)
  const avgNetMargin =
    ratioData.filter((d) => d.netMargin !== null).reduce((s, d) => s + (d.netMargin || 0), 0) /
    (ratioData.filter((d) => d.netMargin !== null).length || 1)

  const chartConfig = {
    currentRatio: { label: "Ratio de liquidité", color: "#10b981" },
    grossMargin: { label: "Marge brute (%)", color: "#3b82f6" },
    netMargin: { label: "Marge nette (%)", color: "#f59e0b" },
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg mb-6 overflow-hidden relative z-10">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">
                Ratios de liquidité et de rentabilité
              </h3>
              <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span>
                      {companies
                        .find((c) => c.id === companyId)
                        ?.divisions.find((d) => d.id === divisionId)?.name || "Division"}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-emerald-600 font-semibold">
                      {companies
                        .find((c) => c.id === companyId)
                        ?.divisions.find((d) => d.id === divisionId)
                        ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                    </span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-emerald-600 font-semibold">
                      {companies
                        .find((c) => c.id === companyId)
                        ?.divisions.find((d) => d.id === divisionId)?.name || "Division"}
                    </span>
                  </>
                ) : companyId ? (
                  <span className="text-emerald-600 font-semibold">
                    {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                  </span>
                ) : (
                  <span className="truncate">Toutes les sociétés</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Metrics */}
      <div className="px-8 py-6 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Key Metrics */}
          <div className="lg:col-span-1">
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Ratio de liquidité</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {latestData.currentRatio !== null ? `${latestData.currentRatio.toFixed(2)}x` : "\u2014"}
              </div>
              <div className="text-xs text-slate-500">
                Moyenne: {avgCurrentRatio.toFixed(2)}x
              </div>
            </div>

            <div className="border-b border-slate-200 my-3"></div>

            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Marge brute moyenne</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {avgGrossMargin.toFixed(1)}&nbsp;%
              </div>
              <div className="text-xs text-slate-500">
                Dernière: {latestData.grossMargin !== null ? `${latestData.grossMargin.toFixed(1)}\u00A0%` : "\u2014"}
              </div>
            </div>

            <div className="border-b border-slate-200 my-3"></div>

            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Marge nette moyenne</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {avgNetMargin.toFixed(1)}&nbsp;%
              </div>
              <div className="text-xs text-slate-500">
                Dernière: {latestData.netMargin !== null ? `${latestData.netMargin.toFixed(1)}\u00A0%` : "\u2014"}
              </div>
            </div>
          </div>

          {/* Right Panel - Chart */}
          <div className="lg:col-span-4">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ComposedChart data={ratioData} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(v) => `${v.toFixed(1)}x`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0]?.payload as RatioDataPoint
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                        <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">
                          {label}
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-6 min-w-[220px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                              <span className="text-xs font-medium text-slate-600">Liquidité</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-emerald-600">
                              {data.currentRatio !== null ? `${data.currentRatio.toFixed(2)}x` : "\u2014"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-0.5 bg-blue-500"></div>
                              <span className="text-xs font-medium text-slate-600">Marge brute</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-blue-600">
                              {data.grossMargin !== null ? `${data.grossMargin.toFixed(1)}\u00A0%` : "\u2014"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-0.5 bg-amber-500"></div>
                              <span className="text-xs font-medium text-slate-600">Marge nette</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-amber-600">
                              {data.netMargin !== null ? `${data.netMargin.toFixed(1)}\u00A0%` : "\u2014"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <ChartLegend
                  content={() => (
                    <div className="w-full pt-6 pb-2">
                      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-fit">
                          <div className="w-4 h-4 rounded-md shadow-sm bg-emerald-500 flex-shrink-0"></div>
                          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                            Ratio de liquidité
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 min-w-fit">
                          <div className="w-8 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                            Marge brute (%)
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 min-w-fit">
                          <div className="w-8 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
                            Marge nette (%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  wrapperStyle={{ paddingTop: "25px", width: "100%", paddingLeft: "0", paddingRight: "0" }}
                />
                <defs>
                  <linearGradient id="ratioBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar
                  yAxisId="left"
                  dataKey="currentRatio"
                  fill="url(#ratioBarGradient)"
                  name="Ratio de liquidité"
                  radius={[6, 6, 0, 0]}
                  stroke="#059669"
                  strokeWidth={0.5}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="grossMargin"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2.5, stroke: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 2.5, stroke: "#fff", fill: "#3b82f6" }}
                  name="Marge brute (%)"
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="netMargin"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: "#f59e0b", r: 5, strokeWidth: 2.5, stroke: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 2.5, stroke: "#fff", fill: "#f59e0b" }}
                  name="Marge nette (%)"
                  connectNulls
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
