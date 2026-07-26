"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, ChevronDown, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  dashboardCardAccentClass,
  dashboardCardBodyMutedClass,
  dashboardCardFrameStaticClass,
  dashboardCardHeaderBarClass,
  dashboardCardHeaderIconBoxClass,
  dashboardCardRingClass,
  dashboardCardTitleClass,
} from "@/lib/dashboard-card-style"

export interface CapexChartDataPoint {
  period: string
  capex: number
  denominator: number
  ratio: number
}

interface CapexChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  chartData?: CapexChartDataPoint[]
  loading?: boolean
}

type RatioType = "depreciation" | "revenue" | "ebitda" | "cashflow"

export function CapexChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  chartData,
  loading = false,
}: CapexChartProps) {
  const [selectedRatio, setSelectedRatio] = useState<RatioType>("depreciation")

  if (loading) {
    return (
      <div className={cn("mb-6 flex h-64 items-center justify-center", dashboardCardFrameStaticClass)}>
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={cn("mb-6 flex h-64 items-center justify-center", dashboardCardFrameStaticClass)}>
        <p className={dashboardCardBodyMutedClass}>Aucune donnée disponible</p>
      </div>
    )
  }

  const chartDataPoints = chartData
  const avgCapex = chartDataPoints.reduce((sum, d) => sum + d.capex, 0) / chartDataPoints.length
  const avgDenominator = chartDataPoints.reduce((sum, d) => sum + d.denominator, 0) / chartDataPoints.length
  const avgRatio = chartDataPoints.reduce((sum, d) => sum + d.ratio, 0) / chartDataPoints.length

  const totalDenominator =
    chartDataPoints.length > 0 ? chartDataPoints[chartDataPoints.length - 1].denominator : avgDenominator

  const denominatorVariation =
    chartDataPoints.length > 1 && chartDataPoints[chartDataPoints.length - 2].denominator !== 0
      ? ((chartDataPoints[chartDataPoints.length - 1].denominator -
          chartDataPoints[chartDataPoints.length - 2].denominator) /
          chartDataPoints[chartDataPoints.length - 2].denominator) *
        100
      : 0

  const getChartTitle = (): string => {
    switch (selectedRatio) {
      case "depreciation":
        return "Capex / Amortissement"
      case "revenue":
        return "Capex / Revenus"
      case "ebitda":
        return "Capex / BAIIA"
      case "cashflow":
        return "Capex / Flux de trésorerie"
      default:
        return "Capex / Amortissement"
    }
  }

  const getDenominatorLabel = (): string => {
    switch (selectedRatio) {
      case "depreciation":
        return "Amortissement"
      case "revenue":
        return "Revenus"
      case "ebitda":
        return "BAIIA"
      case "cashflow":
        return "Flux de trésorerie"
      default:
        return "Amortissement"
    }
  }

  const denominatorLabel = getDenominatorLabel()
  const ratioLabel = getChartTitle()

  const getHorizonText = (): string => {
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "5 ans"
    return "Courant"
  }

  const chartConfig = {
    capex: { label: "Capex", color: "#10b981" },
    denominator: { label: denominatorLabel, color: "#3b82f6" },
    ratio: { label: ratioLabel, color: "#f59e0b" },
  }

  return (
    <div className={cn("relative z-10 mb-6", dashboardCardFrameStaticClass)}>
      <div className={dashboardCardRingClass} aria-hidden />
      <div className={cn("px-6 py-5 sm:px-7", dashboardCardHeaderBarClass)}>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className={dashboardCardHeaderIconBoxClass}>
              <BarChart3 className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <Select value={selectedRatio} onValueChange={(value) => setSelectedRatio(value as RatioType)}>
                <SelectTrigger className="mb-1 inline-flex h-auto w-auto items-center gap-2 border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg:last-child]:hidden">
                  <h3 className={cn("text-xl leading-tight", dashboardCardTitleClass)}>{ratioLabel}</h3>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depreciation">Capex / Amortissement</SelectItem>
                  <SelectItem value="revenue">Capex / Revenus</SelectItem>
                  <SelectItem value="ebitda">Capex / BAIIA</SelectItem>
                  <SelectItem value="cashflow">Capex / Flux de trésorerie</SelectItem>
                </SelectContent>
              </Select>
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
      </div>

      <div className="bg-white px-8 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="pb-3">
              <div className="mb-1 text-xs font-medium text-slate-500">{denominatorLabel} total</div>
              <div className="mb-1.5 text-xl font-semibold text-slate-900">
                {formatCurrency(totalDenominator)}
              </div>
              {chartDataPoints.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  {denominatorVariation >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      denominatorVariation >= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {denominatorVariation >= 0 ? "+" : ""}
                    {denominatorVariation.toFixed(1)}%
                  </span>
                  <span className="text-slate-500">vs période précédente</span>
                </div>
              )}
            </div>

            <div className="my-3 border-b border-slate-200" />

            <div className="pb-3">
              <div className="mb-1 text-xs font-medium text-slate-500">Capex moyen</div>
              <div className="mb-1.5 text-xl font-semibold text-slate-900">{formatCurrency(avgCapex)}</div>
              <div className="text-xs text-slate-500">
                {avgRatio.toFixed(0)}% des {denominatorLabel.toLowerCase()}
              </div>
            </div>

            <div className="my-3 border-b border-slate-200" />

            <div>
              <div className="mb-1 text-xs font-medium text-slate-500">{ratioLabel}</div>
              <div className="mb-1.5 text-xl font-semibold text-slate-900">{avgRatio.toFixed(1)}%</div>
              <div className="text-xs text-slate-500">Moyenne</div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ComposedChart data={chartDataPoints} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
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
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0]?.payload
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                        <div className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">
                          {label}
                        </div>
                        <div className="space-y-2.5">
                          <div className="flex min-w-[200px] items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                              <span className="text-xs font-medium text-slate-600">Capex</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-emerald-600">
                              {formatCurrency(data.capex)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-sm bg-blue-500" />
                              <span className="text-xs font-medium text-slate-600">{denominatorLabel}</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-blue-600">
                              {formatCurrency(data.denominator)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-1">
                            <div className="flex items-center gap-2">
                              <div className="h-0.5 w-6 bg-amber-500" />
                              <span className="text-xs font-medium text-slate-600">{ratioLabel}</span>
                            </div>
                            <span className="font-mono text-sm font-bold text-amber-600">
                              {data.ratio.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <defs>
                  <linearGradient id="capexGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="capexDenominatorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar
                  yAxisId="left"
                  dataKey="capex"
                  fill="url(#capexGradient)"
                  name="Capex"
                  radius={[6, 6, 0, 0]}
                  stroke="#059669"
                  strokeWidth={0.5}
                />
                <Bar
                  yAxisId="left"
                  dataKey="denominator"
                  fill="url(#capexDenominatorGradient)"
                  name={denominatorLabel}
                  radius={[6, 6, 0, 0]}
                  stroke="#2563eb"
                  strokeWidth={0.5}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ratio"
                  stroke="#f59e0b"
                  strokeWidth={3.5}
                  dot={{ fill: "#f59e0b", r: 6, strokeWidth: 3, stroke: "#fff" }}
                  activeDot={{ r: 8, strokeWidth: 3, stroke: "#fff", fill: "#f59e0b" }}
                  name={ratioLabel}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
