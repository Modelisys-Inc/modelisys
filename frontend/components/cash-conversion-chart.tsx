"use client"

import { useState } from "react"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { formatCurrency } from "@/lib/financial-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"

export interface CashConversionChartDataPoint {
  period: string
  numerator: number
  denominator: number
  ratio: number
}

interface CashConversionChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  chartData?: CashConversionChartDataPoint[]
  loading?: boolean
}

type MetricType = "DSO" | "DIO" | "DPO" | "CCC"

export function CashConversionChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  chartData,
  loading = false,
}: CashConversionChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("DSO")

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/80 shadow-lg mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // Empty state
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/80 shadow-lg mb-6">
        <p className="text-slate-400">Aucune donnée disponible</p>
      </div>
    )
  }

  const chartDataPoints = chartData

  // Get metric full name
  const getMetricFullName = (): string => {
    switch (selectedMetric) {
      case "DSO":
        return "Délai de couvrement des clients"
      case "DIO":
        return "Délai de rotation des stocks"
      case "DPO":
        return "Délai de paiement des fournisseurs"
      case "CCC":
        return "Cycle de conversion de l'encaisse"
      default:
        return "Délai de couvrement des clients"
    }
  }

  // Get labels for numerator and denominator
  const getNumeratorLabel = (): string => {
    switch (selectedMetric) {
      case "DSO":
        return "Comptes clients"
      case "DIO":
        return "Stocks"
      case "DPO":
        return "Comptes fournisseurs"
      case "CCC":
        return "DSO + DIO"
      default:
        return ""
    }
  }

  const getDenominatorLabel = (): string => {
    switch (selectedMetric) {
      case "DSO":
        return "Revenus"
      case "DIO":
      case "DPO":
        return "CMV"
      case "CCC":
        return "DPO"
      default:
        return ""
    }
  }

  // Calculate averages
  const avgNumerator = chartDataPoints.reduce((sum, d) => sum + d.numerator, 0) / chartDataPoints.length
  const avgDenominator = chartDataPoints.reduce((sum, d) => sum + d.denominator, 0) / chartDataPoints.length
  const avgRatio = chartDataPoints.reduce((sum, d) => sum + d.ratio, 0) / chartDataPoints.length

  const numeratorLabel = getNumeratorLabel()
  const denominatorLabel = getDenominatorLabel()

  // Get horizon text
  const getHorizonText = (): string => {
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "years") return "5 ans"
    return "Courant"
  }

  const chartConfig = {
    numerator: {
      label: numeratorLabel,
      color: "#10b981",
    },
    denominator: {
      label: denominatorLabel,
      color: "#3b82f6",
    },
    ratio: {
      label: getMetricFullName(),
      color: "#f59e0b",
    },
  }

  // Get base title for the chart
  const getBaseTitle = (): string => {
    return getMetricFullName()
  }

  // Calculate key metrics for left panel
  const totalNumerator = chartDataPoints.reduce((sum, d) => sum + d.numerator, 0)
  const totalDenominator = chartDataPoints.reduce((sum, d) => sum + d.denominator, 0)

  // Calculate variation for total denominator
  const denominatorVariation = chartDataPoints.length > 1 
    ? chartDataPoints[chartDataPoints.length - 1].denominator - chartDataPoints[chartDataPoints.length - 2].denominator
    : 0
  const denominatorVariationPercent = chartDataPoints.length > 1 && chartDataPoints[chartDataPoints.length - 2].denominator > 0
    ? ((chartDataPoints[chartDataPoints.length - 1].denominator - chartDataPoints[chartDataPoints.length - 2].denominator) / chartDataPoints[chartDataPoints.length - 2].denominator * 100)
    : 0

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg mb-6 overflow-hidden relative z-10">
      {/* Header Section */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
                <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 mb-1 [&>svg:last-child]:hidden">
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{getBaseTitle()}</h3>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DSO">DSO - Délai de couvrement des clients</SelectItem>
                  <SelectItem value="DIO">DIO - Délai de rotation des stocks</SelectItem>
                  <SelectItem value="DPO">DPO - Délai de paiement des fournisseurs</SelectItem>
                  <SelectItem value="CCC">CCC - Cycle de conversion de l'encaisse</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-400">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}</span>
                ) : (
                  <span className="truncate">Toutes les sociétés</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section - Two Column Layout */}
      <div className="px-8 py-6 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Key Metrics */}
          <div className="lg:col-span-1">
            {/* Total Denominator */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">{denominatorLabel}</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(totalDenominator)}
              </div>
              {chartDataPoints.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  {denominatorVariation >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`font-medium ${denominatorVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {denominatorVariation >= 0 ? '+' : ''}{denominatorVariationPercent.toFixed(1)}%
                  </span>
                  <span className="text-slate-500">vs période précédente</span>
                </div>
              )}
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Numerator Average */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">{numeratorLabel} moyen</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(avgNumerator)}
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  {avgRatio.toFixed(1)} j
                </span>
              </div>
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Ratio Average */}
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">{getMetricFullName()}</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {avgRatio.toFixed(1)} j
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  Moyenne
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel - Chart */}
          <div className="lg:col-span-4">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ComposedChart data={chartDataPoints} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                  tickFormatter={(value) => `${value.toFixed(1)} j`}
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const data = payload[0]?.payload
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                        <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</div>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                              <span className="text-xs font-medium text-slate-600">{numeratorLabel}</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-emerald-600">{formatCurrency(data.numerator)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                              <span className="text-xs font-medium text-slate-600">{denominatorLabel}</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-blue-600">{formatCurrency(data.denominator)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-0.5 bg-amber-500"></div>
                              <span className="text-xs font-medium text-slate-600">{getMetricFullName()}</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-amber-600">{data.ratio.toFixed(1)} j</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <ChartLegend
                  content={({ payload }) => {
                    return (
                      <div className="w-full pt-6 pb-2">
                        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4">
                          {/* Numerator */}
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm bg-emerald-500 flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{numeratorLabel}</span>
                          </div>

                          {/* Denominator */}
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm bg-blue-500 flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{denominatorLabel}</span>
                          </div>

                          {/* Ratio */}
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-8 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{getMetricFullName()}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                  wrapperStyle={{ paddingTop: "25px", width: "100%", paddingLeft: "0", paddingRight: "0" }}
                />
                {/* Gradients */}
                <defs>
                  <linearGradient id="numeratorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="denominatorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar
                  yAxisId="left"
                  dataKey="numerator"
                  fill="url(#numeratorGradient)"
                  name={numeratorLabel}
                  radius={[6, 6, 0, 0]}
                  stroke="#059669"
                  strokeWidth={0.5}
                />
                <Bar
                  yAxisId="left"
                  dataKey="denominator"
                  fill="url(#denominatorGradient)"
                  name={denominatorLabel}
                  radius={[6, 6, 0, 0]}
                  stroke="#2563eb"
                  strokeWidth={0.5}
                />
                {/* Ratio line */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ratio"
                  stroke="#f59e0b"
                  strokeWidth={3.5}
                  dot={{ fill: "#f59e0b", r: 6, strokeWidth: 3, stroke: "#fff" }}
                  activeDot={{ r: 8, strokeWidth: 3, stroke: "#fff", fill: "#f59e0b" }}
                  name={getMetricFullName()}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
