"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface WorkingCapitalChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper functions to generate data
const getDetailData = (period: "monthly" | "quarterly" | "annual", view: "current" | "12months" | "24months" | "years") => {
  if (view === "12months") {
    return {
      currentAssets: 850000,
      priorAssets: 750000,
      currentLiabilities: 450000,
      priorLiabilities: 420000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 12 }, (_, i) => ({
        assets: 750000 + (i * 8333),
        liabilities: 420000 + (i * 2500),
        revenue: 242000 + (i * 2750)
      }))
    }
  }
  if (view === "24months") {
    return {
      currentAssets: 850000,
      priorAssets: 750000,
      currentLiabilities: 450000,
      priorLiabilities: 420000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 24 }, (_, i) => ({
        assets: 750000 + (i * 4167),
        liabilities: 420000 + (i * 1250),
        revenue: 242000 + (i * 1375)
      }))
    }
  }
  if (view === "years") {
    return {
      currentAssets: 10200000,
      priorAssets: 9000000,
      currentLiabilities: 5400000,
      priorLiabilities: 5040000,
      currentRevenue: 3300000,
      priorRevenue: 2864000,
      trendValues: Array.from({ length: 6 }, (_, i) => ({
        assets: 9000000 + (i * 200000),
        liabilities: 5040000 + (i * 60000),
        revenue: 2864000 + (i * 72800)
      }))
    }
  }
  return {
    currentAssets: period === "monthly" ? 850000 : period === "quarterly" ? 2550000 : 10200000,
    priorAssets: period === "monthly" ? 750000 : period === "quarterly" ? 2250000 : 9000000,
    currentLiabilities: period === "monthly" ? 450000 : period === "quarterly" ? 1350000 : 5400000,
    priorLiabilities: period === "monthly" ? 420000 : period === "quarterly" ? 1260000 : 5040000,
    currentRevenue: period === "monthly" ? 275000 : period === "quarterly" ? 825000 : 3300000,
    priorRevenue: period === "monthly" ? 242000 : period === "quarterly" ? 716000 : 2864000,
    trendValues: undefined
  }
}

type RatioType = "revenue" | "revenue_ex_cash"

export function WorkingCapitalChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: WorkingCapitalChartProps) {
  const [selectedRatio, setSelectedRatio] = useState<RatioType>("revenue")

  // Calculate Working Capital (current assets - current liabilities)
  const calculateWorkingCapital = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    
    if (trendIndex !== undefined && data.trendValues) {
      const assets = data.trendValues[trendIndex]?.assets || 0
      const liabilities = data.trendValues[trendIndex]?.liabilities || 0
      return assets - liabilities
    } else {
      const assets = isPrior ? data.priorAssets : data.currentAssets
      const liabilities = isPrior ? data.priorLiabilities : data.currentLiabilities
      return assets - liabilities
    }
  }

  // Calculate Working Capital Ex Cash (current assets - cash - current liabilities)
  // Assuming cash is approximately 23.5% of current assets (200000 / 850000)
  const calculateWorkingCapitalExCash = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    const cashRatio = 0.235
    
    if (trendIndex !== undefined && data.trendValues) {
      const assets = data.trendValues[trendIndex]?.assets || 0
      const cash = assets * cashRatio
      const liabilities = data.trendValues[trendIndex]?.liabilities || 0
      return assets - cash - liabilities
    } else {
      const assets = isPrior ? data.priorAssets : data.currentAssets
      const cash = assets * cashRatio
      const liabilities = isPrior ? data.priorLiabilities : data.currentLiabilities
      return assets - cash - liabilities
    }
  }

  // Calculate Current Assets
  const getCurrentAssets = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.assets || 0
    }
    return isPrior ? data.priorAssets : data.currentAssets
  }

  // Calculate Current Liabilities
  const getCurrentLiabilities = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.liabilities || 0
    }
    return isPrior ? data.priorLiabilities : data.currentLiabilities
  }

  // Calculate Revenue
  const getRevenue = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.revenue || 0
    }
    return isPrior ? data.priorRevenue : data.currentRevenue
  }

  // Get working capital value based on selected ratio
  const getWorkingCapitalValue = (isPrior: boolean, trendIndex?: number): number => {
    switch (selectedRatio) {
      case "revenue":
        return calculateWorkingCapital(isPrior, trendIndex)
      case "revenue_ex_cash":
        return calculateWorkingCapitalExCash(isPrior, trendIndex)
      default:
        return calculateWorkingCapital(isPrior, trendIndex)
    }
  }

  // Get denominator based on selected ratio
  const getDenominator = (isPrior: boolean, trendIndex?: number): number => {
    // All ratios use revenue as denominator
    return getRevenue(isPrior, trendIndex)
  }

  // Get ratio label
  const getRatioLabel = (): string => {
    switch (selectedRatio) {
      case "revenue":
        return "FDR / Revenus"
      case "revenue_ex_cash":
        return "FdRHC / Revenus"
      default:
        return "FDR / Revenus"
    }
  }

  // Get denominator label
  const getDenominatorLabel = (): string => {
    return "Revenus"
  }

  // Helper functions to get labels
  const getMonthLabels = (count: number): string[] => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const labels: string[] = []
    const currentDate = new Date()
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
  }

  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${currentYear - 5 + i}`)
  }

  // Get data points for chart
  let chartDataPoints: Array<{
    period: string
    workingCapital: number
    denominator: number
    ratio: number
  }> = []

  if (view === "12months") {
    const monthLabels = getMonthLabels(12)
    monthLabels.forEach((_, idx) => {
      const workingCapital = getWorkingCapitalValue(false, idx)
      const denominator = getDenominator(false, idx)
      const ratio = denominator !== 0 ? (workingCapital / denominator) * 100 : 0
      chartDataPoints.push({
        period: monthLabels[idx],
        workingCapital: workingCapital,
        denominator: denominator,
        ratio: ratio,
      })
    })
  } else if (view === "24months") {
    const monthLabels = getMonthLabels(24)
    monthLabels.forEach((_, idx) => {
      const workingCapital = getWorkingCapitalValue(false, idx)
      const denominator = getDenominator(false, idx)
      const ratio = denominator !== 0 ? (workingCapital / denominator) * 100 : 0
      chartDataPoints.push({
        period: monthLabels[idx],
        workingCapital: workingCapital,
        denominator: denominator,
        ratio: ratio,
      })
    })
  } else if (view === "years") {
    const yearLabels = getYearLabels()
    yearLabels.forEach((_, idx) => {
      const workingCapital = getWorkingCapitalValue(false, idx)
      const denominator = getDenominator(false, idx)
      const ratio = denominator !== 0 ? (workingCapital / denominator) * 100 : 0
      chartDataPoints.push({
        period: yearLabels[idx],
        workingCapital: workingCapital,
        denominator: denominator,
        ratio: ratio,
      })
    })
  } else if (view === "current") {
    const workingCapitalCurrent = getWorkingCapitalValue(false)
    const denominatorCurrent = getDenominator(false)
    const ratioCurrent = denominatorCurrent !== 0 ? (workingCapitalCurrent / denominatorCurrent) * 100 : 0
    const workingCapitalPrior = getWorkingCapitalValue(true)
    const denominatorPrior = getDenominator(true)
    const ratioPrior = denominatorPrior !== 0 ? (workingCapitalPrior / denominatorPrior) * 100 : 0
    chartDataPoints = [
      {
        period: "Passé",
        workingCapital: workingCapitalPrior,
        denominator: denominatorPrior,
        ratio: ratioPrior,
      },
      {
        period: "Courant",
        workingCapital: workingCapitalCurrent,
        denominator: denominatorCurrent,
        ratio: ratioCurrent,
      },
    ]
  }

  if (chartDataPoints.length === 0) return null

  // Calculate averages
  const avgWorkingCapital = chartDataPoints.reduce((sum, d) => sum + d.workingCapital, 0) / chartDataPoints.length
  const avgDenominator = chartDataPoints.reduce((sum, d) => sum + d.denominator, 0) / chartDataPoints.length
  const avgRatio = chartDataPoints.reduce((sum, d) => sum + d.ratio, 0) / chartDataPoints.length

  const denominatorLabel = getDenominatorLabel()
  const ratioLabel = getRatioLabel()

  // Get working capital label based on selected ratio
  const getWorkingCapitalLabel = (): string => {
    switch (selectedRatio) {
      case "revenue_ex_cash":
        return "FdRHC"
      case "revenue":
      default:
        return "FDR"
    }
  }

  const workingCapitalLabel = getWorkingCapitalLabel()

  const chartConfig = {
    workingCapital: {
      label: workingCapitalLabel,
      color: "#10b981",
    },
    denominator: {
      label: denominatorLabel,
      color: "#3b82f6",
    },
    ratio: {
      label: ratioLabel,
      color: "#f59e0b",
    },
  }

  // Get base title for the chart
  const getBaseTitle = (): string => {
    return ratioLabel
  }

  // Get horizon text
  const getHorizonText = (): string => {
    if (view === "12months") return "12mois"
    if (view === "24months") return "24mois"
    if (view === "years") return "5 ans"
    return "Courant"
  }

  // Calculate key metrics for left panel
  const totalWorkingCapital = chartDataPoints.reduce((sum, d) => sum + d.workingCapital, 0)
  const totalRevenue = chartDataPoints.reduce((sum, d) => sum + d.denominator, 0)

  // Calculate variation for total revenue
  const revenueVariation = chartDataPoints.length > 1 
    ? chartDataPoints[chartDataPoints.length - 1].denominator - chartDataPoints[chartDataPoints.length - 2].denominator
    : 0
  const revenueVariationPercent = chartDataPoints.length > 1 && chartDataPoints[chartDataPoints.length - 2].denominator > 0
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
              <Select value={selectedRatio} onValueChange={(value) => setSelectedRatio(value as RatioType)}>
                <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 mb-1 [&>svg:last-child]:hidden">
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{getBaseTitle()}</h3>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">FDR / Revenus</SelectItem>
                  <SelectItem value="revenue_ex_cash">FdRHC / Revenus</SelectItem>
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
            {/* Total Revenue */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Revenus totaux</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(totalRevenue)}
              </div>
              {chartDataPoints.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  {revenueVariation >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`font-medium ${revenueVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {revenueVariation >= 0 ? '+' : ''}{revenueVariationPercent.toFixed(1)}%
                  </span>
                  <span className="text-slate-500">vs période précédente</span>
                </div>
              )}
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Working Capital Average */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">{workingCapitalLabel} moyen</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(avgWorkingCapital)}
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  {avgRatio.toFixed(0)}% des revenus
                </span>
              </div>
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Ratio Average */}
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">{ratioLabel}</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {avgRatio.toFixed(1)}%
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
                  <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                    <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</div>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-6 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                          <span className="text-xs font-medium text-slate-600">{workingCapitalLabel}</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-emerald-600">{formatCurrency(data.workingCapital)}</span>
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
                          <span className="text-xs font-medium text-slate-600">{ratioLabel}</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-amber-600">{data.ratio.toFixed(1)}%</span>
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
                      {/* Fonds de roulement */}
                      <div className="flex items-center gap-2.5 min-w-fit">
                        <div className="w-4 h-4 rounded-md shadow-sm bg-emerald-500 flex-shrink-0"></div>
                        <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{workingCapitalLabel}</span>
                      </div>
                      
                      {/* Dénominateur */}
                      <div className="flex items-center gap-2.5 min-w-fit">
                        <div className="w-4 h-4 rounded-md shadow-sm bg-blue-500 flex-shrink-0"></div>
                        <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{denominatorLabel}</span>
                      </div>
                      
                      {/* Ratio */}
                      <div className="flex items-center gap-2.5 min-w-fit">
                        <div className="w-8 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{ratioLabel}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
              wrapperStyle={{ paddingTop: "25px", width: "100%", paddingLeft: "0", paddingRight: "0" }}
            />
            {/* Gradients */}
            <defs>
              <linearGradient id="workingCapitalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="denominatorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
              </linearGradient>
            </defs>
            <>
              <Bar
                yAxisId="left"
                dataKey="workingCapital"
                fill="url(#workingCapitalGradient)"
                name={workingCapitalLabel}
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
                name={ratioLabel}
              />
            </>
          </ComposedChart>
        </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

