"use client"

import { BarChart3 } from "lucide-react"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart"
import type { Company } from "@/components/entity-selector"
import { cn } from "@/lib/utils"
import {
  averageRatioValues,
  formatRatioValue,
  type RatioDataPoint,
  type RatioDisplayView,
} from "@/lib/financial-ratios"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

interface FinancialRatiosChartProps {
  ratioData: RatioDataPoint[]
  view: RatioDisplayView
  loading?: boolean
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

export function FinancialRatiosChart({
  ratioData,
  view,
  loading = false,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: FinancialRatiosChartProps) {
  if (loading) {
    return (
      <div className={cn("mb-6 flex h-64 items-center justify-center", dashboardCardFrameStaticClass)}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  if (ratioData.length === 0) {
    return (
      <div className={cn("mb-6 flex h-64 items-center justify-center", dashboardCardFrameStaticClass)}>
        <p className={dashboardCardBodyMutedClass}>Aucune donnée disponible</p>
      </div>
    )
  }

  const latestData = ratioData[ratioData.length - 1]!
  const currentRatioAvg = averageRatioValues(ratioData.map((d) => d.currentRatio))
  const grossMarginAvg = averageRatioValues(ratioData.map((d) => d.grossMargin))
  const netMarginAvg = averageRatioValues(ratioData.map((d) => d.netMargin))

  const getHorizonText = (): string => {
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "5 ans"
    return "Courant"
  }

  const chartConfig = {
    currentRatio: { label: "Ratio de liquidité", color: "#10b981" },
    grossMargin: { label: "Marge brute (%)", color: "#3b82f6" },
    netMargin: { label: "Marge nette (%)", color: "#f59e0b" },
  }

  return (
    <div className={cn("relative z-10 mb-6", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className={dashboardCardHeaderIconBoxClass}>
            <BarChart3 className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className={cn("mb-1 text-xl leading-tight", dashboardCardTitleClass)}>
              Ratios financiers
            </h3>
            <div className={cn("flex flex-wrap items-center gap-3 text-sm", dashboardCardBodyMutedClass)}>
              <span className="font-medium text-[#2A2F3A]">{getHorizonText()}</span>
              <span className="text-slate-400">•</span>
              {subDivisionId && divisionId && companyId ? (
                <>
                  <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                  <span className="text-slate-400">•</span>
                  <span>
                    {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                      "Division"}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className={cn("font-semibold", dashboardCardAccentClass)}>
                    {companies
                      .find((c) => c.id === companyId)
                      ?.divisions.find((d) => d.id === divisionId)
                      ?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                  </span>
                </>
              ) : divisionId && companyId ? (
                <>
                  <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                  <span className="text-slate-400">•</span>
                  <span className={cn("font-semibold", dashboardCardAccentClass)}>
                    {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name ||
                      "Division"}
                  </span>
                </>
              ) : companyId ? (
                <span className={cn("font-semibold", dashboardCardAccentClass)}>
                  {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                </span>
              ) : (
                <span className="truncate">Toutes les sociétés</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="pb-3">
              <div className="mb-1 text-xs font-medium text-slate-500">Ratio de liquidité</div>
              <div className="mb-1.5 text-xl font-semibold text-slate-900">
                {formatRatioValue(latestData.currentRatio, "ratio")}
              </div>
              <div className="text-xs text-slate-500">
                Moyenne: {formatRatioValue(currentRatioAvg, "ratio")}
              </div>
            </div>

            <div className="my-3 border-b border-slate-200" />

            <div className="pb-3">
              <div className="mb-1 text-xs font-medium text-slate-500">Marge brute moyenne</div>
              <div className="mb-1.5 text-xl font-semibold text-slate-900">
                {formatRatioValue(grossMarginAvg, "percentage")}
              </div>
              <div className="text-xs text-slate-500">
                Dernière: {formatRatioValue(latestData.grossMargin, "percentage")}
              </div>
            </div>

            <div className="my-3 border-b border-slate-200" />

            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">Marge nette moyenne</div>
              <div className="mb-1.5 text-xl font-semibold text-slate-900">
                {formatRatioValue(netMarginAvg, "percentage")}
              </div>
              <div className="text-xs text-slate-500">
                Dernière: {formatRatioValue(latestData.netMargin, "percentage")}
              </div>
            </div>
          </div>

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
                  tickFormatter={(v) => `${Number(v).toFixed(1)}x`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0]?.payload as RatioDataPoint
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                        <div className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
                          {label}
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex min-w-[220px] items-center justify-between gap-6">
                            <span className="text-xs font-medium text-slate-600">Liquidité</span>
                            <span className="font-mono text-sm font-bold text-emerald-600">
                              {formatRatioValue(data.currentRatio, "ratio")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="text-xs font-medium text-slate-600">Marge brute</span>
                            <span className="font-mono text-sm font-bold text-blue-600">
                              {formatRatioValue(data.grossMargin, "percentage")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1">
                            <span className="text-xs font-medium text-slate-600">Marge nette</span>
                            <span className="font-mono text-sm font-bold text-amber-600">
                              {formatRatioValue(data.netMargin, "percentage")}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <ChartLegend
                  content={() => (
                    <div className="w-full px-4 pb-2 pt-6">
                      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
                        <div className="flex min-w-fit items-center gap-2.5">
                          <div className="h-4 w-4 flex-shrink-0 rounded-md bg-emerald-500 shadow-sm" />
                          <span className="whitespace-nowrap text-sm font-medium text-slate-700">
                            Ratio de liquidité
                          </span>
                        </div>
                        <div className="flex min-w-fit items-center gap-2.5">
                          <div className="h-1.5 w-8 flex-shrink-0 rounded-full bg-blue-500" />
                          <span className="whitespace-nowrap text-sm font-medium text-slate-700">
                            Marge brute (%)
                          </span>
                        </div>
                        <div className="flex min-w-fit items-center gap-2.5">
                          <div className="h-1.5 w-8 flex-shrink-0 rounded-full bg-amber-500" />
                          <span className="whitespace-nowrap text-sm font-medium text-slate-700">
                            Marge nette (%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  wrapperStyle={{ paddingTop: "25px", width: "100%" }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="currentRatio"
                  fill="#10b981"
                  name="Ratio de liquidité"
                  radius={[6, 6, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="grossMargin"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 5, strokeWidth: 2.5, stroke: "#fff" }}
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
