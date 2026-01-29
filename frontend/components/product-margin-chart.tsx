"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react"

export type ProductType = "total" | "product_a" | "product_b" | "service_c"

type ChartViewType = "revenue_grossprofit_margin" | "revenue_by_product" | "gross_margin_by_product"

interface ProductMarginChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  selectedProduct: ProductType
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper functions to generate data
const getProductData = (period: "monthly" | "quarterly" | "annual", view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years", product: ProductType) => {
  // Base values for products
  const baseRevenueA = 120000
  const baseRevenueB = 95000
  const baseRevenueC = 60000
  
  const baseCostsA = 72000 // 60% of revenue
  const baseCostsB = 66500 // 70% of revenue
  const baseCostsC = 36000 // 60% of revenue
  
  const baseGrossProfitA = baseRevenueA - baseCostsA
  const baseGrossProfitB = baseRevenueB - baseCostsB
  const baseGrossProfitC = baseRevenueC - baseCostsC
  
  const baseGrossMarginA = (baseGrossProfitA / baseRevenueA) * 100
  const baseGrossMarginB = (baseGrossProfitB / baseRevenueB) * 100
  const baseGrossMarginC = (baseGrossProfitC / baseRevenueC) * 100

  if (view === "12months") {
    const trendValues = Array.from({ length: 12 }, (_, i) => {
      const multiplier = 1 + (i * 0.02) // 2% growth per month
      return {
        revenue: product === "total" 
          ? (baseRevenueA + baseRevenueB + baseRevenueC) * multiplier
          : product === "product_a" ? baseRevenueA * multiplier
          : product === "product_b" ? baseRevenueB * multiplier
          : baseRevenueC * multiplier,
        costs: product === "total"
          ? (baseCostsA + baseCostsB + baseCostsC) * multiplier
          : product === "product_a" ? baseCostsA * multiplier
          : product === "product_b" ? baseCostsB * multiplier
          : baseCostsC * multiplier,
      }
    })
    return { trendValues }
  }
  
  if (view === "quarters") {
    const trendValues = Array.from({ length: 5 }, (_, i) => {
      const multiplier = 1 + (i * 0.03) // 3% growth per quarter
      return {
        revenue: product === "total" 
          ? (baseRevenueA + baseRevenueB + baseRevenueC) * multiplier * 3
          : product === "product_a" ? baseRevenueA * multiplier * 3
          : product === "product_b" ? baseRevenueB * multiplier * 3
          : baseRevenueC * multiplier * 3,
        costs: product === "total"
          ? (baseCostsA + baseCostsB + baseCostsC) * multiplier * 3
          : product === "product_a" ? baseCostsA * multiplier * 3
          : product === "product_b" ? baseCostsB * multiplier * 3
          : baseCostsC * multiplier * 3,
      }
    })
    return { trendValues }
  }
  
  if (view === "years") {
    const trendValues = Array.from({ length: 6 }, (_, i) => {
      const multiplier = 1 + (i * 0.08) // 8% growth per year
      return {
        revenue: product === "total" 
          ? (baseRevenueA + baseRevenueB + baseRevenueC) * multiplier * 12
          : product === "product_a" ? baseRevenueA * multiplier * 12
          : product === "product_b" ? baseRevenueB * multiplier * 12
          : baseRevenueC * multiplier * 12,
        costs: product === "total"
          ? (baseCostsA + baseCostsB + baseCostsC) * multiplier * 12
          : product === "product_a" ? baseCostsA * multiplier * 12
          : product === "product_b" ? baseCostsB * multiplier * 12
          : baseCostsC * multiplier * 12,
      }
    })
    return { trendValues }
  }
  
  // Current view (comparison, ytd, ddm, current)
  const periodMultiplier = period === "monthly" ? 1 : period === "quarterly" ? 3 : 12
  const currentRevenue = product === "total"
    ? (baseRevenueA + baseRevenueB + baseRevenueC) * periodMultiplier
    : product === "product_a" ? baseRevenueA * periodMultiplier
    : product === "product_b" ? baseRevenueB * periodMultiplier
    : baseRevenueC * periodMultiplier
  
  const priorRevenue = currentRevenue * 0.92
  
  const currentCosts = product === "total"
    ? (baseCostsA + baseCostsB + baseCostsC) * periodMultiplier
    : product === "product_a" ? baseCostsA * periodMultiplier
    : product === "product_b" ? baseCostsB * periodMultiplier
    : baseCostsC * periodMultiplier
  
  const priorCosts = currentCosts * 0.92
  
  return {
    currentRevenue,
    priorRevenue,
    currentCosts,
    priorCosts,
    trendValues: undefined
  }
}

export function ProductMarginChart({
  period,
  view,
  selectedProduct,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: ProductMarginChartProps) {
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>("revenue_grossprofit_margin")

  // Reset to default view when selectedProduct changes from "total" to something else
  useEffect(() => {
    if (selectedProduct !== "total" && (selectedChartView === "revenue_by_product" || selectedChartView === "gross_margin_by_product")) {
      setSelectedChartView("revenue_grossprofit_margin")
    }
  }, [selectedProduct, selectedChartView])

  // Get revenue for selected product
  const getRevenue = (isPrior: boolean, trendIndex?: number): number => {
    const data = getProductData(period, view, selectedProduct)
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.revenue ?? 0
    }
    return isPrior ? (data.priorRevenue ?? 0) : (data.currentRevenue ?? 0)
  }

  // Get costs for selected product
  const getCosts = (isPrior: boolean, trendIndex?: number): number => {
    const data = getProductData(period, view, selectedProduct)
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.costs ?? 0
    }
    return isPrior ? (data.priorCosts ?? 0) : (data.currentCosts ?? 0)
  }

  // Calculate gross profit
  const getGrossProfit = (isPrior: boolean, trendIndex?: number): number => {
    return getRevenue(isPrior, trendIndex) - getCosts(isPrior, trendIndex)
  }

  // Calculate gross margin percentage
  const getGrossMargin = (isPrior: boolean, trendIndex?: number): number => {
    const revenue = getRevenue(isPrior, trendIndex)
    if (revenue === 0) return 0
    return (getGrossProfit(isPrior, trendIndex) / revenue) * 100
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

  const getQuarterLabels = (): string[] => {
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = 4; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      labels.push(`T${quarter} ${date.getFullYear()}`)
    }
    return labels
  }

  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${currentYear - 5 + i}`)
  }

  // Get product label
  const getProductLabel = (): string => {
    switch (selectedProduct) {
      case "product_a":
        return "Produit A"
      case "product_b":
        return "Produit B"
      case "service_c":
        return "Service C"
      default:
        return "Tous les produits"
    }
  }

  // Get data points for chart
  let chartDataPoints: Array<{
    period: string
    revenue: number
    costs: number
    grossProfit: number
    grossMargin: number
  }> = []

  if (view === "12months") {
    const monthLabels = getMonthLabels(12)
    monthLabels.forEach((_, idx) => {
      const revenue = getRevenue(false, idx)
      const costs = getCosts(false, idx)
      const grossProfit = getGrossProfit(false, idx)
      const grossMargin = getGrossMargin(false, idx)
      chartDataPoints.push({
        period: monthLabels[idx],
        revenue,
        costs,
        grossProfit,
        grossMargin,
      })
    })
  } else if (view === "quarters") {
    const quarterLabels = getQuarterLabels()
    quarterLabels.forEach((_, idx) => {
      const revenue = getRevenue(false, idx)
      const costs = getCosts(false, idx)
      const grossProfit = getGrossProfit(false, idx)
      const grossMargin = getGrossMargin(false, idx)
      chartDataPoints.push({
        period: quarterLabels[idx],
        revenue,
        costs,
        grossProfit,
        grossMargin,
      })
    })
  } else if (view === "years") {
    const yearLabels = getYearLabels()
    yearLabels.forEach((_, idx) => {
      const revenue = getRevenue(false, idx)
      const costs = getCosts(false, idx)
      const grossProfit = getGrossProfit(false, idx)
      const grossMargin = getGrossMargin(false, idx)
      chartDataPoints.push({
        period: yearLabels[idx],
        revenue,
        costs,
        grossProfit,
        grossMargin,
      })
    })
  } else {
    // For comparison, ytd, ddm, and current views, show current vs prior
    const revenueCurrent = getRevenue(false)
    const costsCurrent = getCosts(false)
    const grossProfitCurrent = getGrossProfit(false)
    const grossMarginCurrent = getGrossMargin(false)
    
    const revenuePrior = getRevenue(true)
    const costsPrior = getCosts(true)
    const grossProfitPrior = getGrossProfit(true)
    const grossMarginPrior = getGrossMargin(true)
    
    chartDataPoints = [
      {
        period: "Passé",
        revenue: revenuePrior,
        costs: costsPrior,
        grossProfit: grossProfitPrior,
        grossMargin: grossMarginPrior,
      },
      {
        period: "Courant",
        revenue: revenueCurrent,
        costs: costsCurrent,
        grossProfit: grossProfitCurrent,
        grossMargin: grossMarginCurrent,
      },
    ]
  }

  // Calculate averages
  const avgRevenue = chartDataPoints.reduce((sum, d) => sum + d.revenue, 0) / chartDataPoints.length
  const avgCosts = chartDataPoints.reduce((sum, d) => sum + d.costs, 0) / chartDataPoints.length
  const avgGrossProfit = chartDataPoints.reduce((sum, d) => sum + d.grossProfit, 0) / chartDataPoints.length
  const avgGrossMargin = chartDataPoints.reduce((sum, d) => sum + d.grossMargin, 0) / chartDataPoints.length

  // Calculate total revenue for current period
  const totalRevenue = chartDataPoints.length > 0 
    ? chartDataPoints[chartDataPoints.length - 1].revenue 
    : avgRevenue
  
  // Calculate variation for revenue
  const revenueVariation = chartDataPoints.length > 1
    ? ((chartDataPoints[chartDataPoints.length - 1].revenue - chartDataPoints[chartDataPoints.length - 2].revenue) / chartDataPoints[chartDataPoints.length - 2].revenue) * 100
    : 0

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "comparison" && period === "monthly") return "Courant"
    if (view === "comparison" && period === "quarterly") return "Trimestriel"
    if (view === "comparison" && period === "annual") return "Annuel"
    if (view === "ytd") return "YTD"
    if (view === "ddm") return "DDM"
    if (view === "12months") return "12 mois"
    if (view === "quarters") return "Trimestres"
    if (view === "years") return "Années"
    return "Courant"
  }

  const chartConfig = {
    revenue: {
      label: "Revenus",
      color: "#10b981",
    },
    grossProfit: {
      label: "Bénéfice brut",
      color: "#3b82f6",
    },
    grossMargin: {
      label: "Marge brute (%)",
      color: "#f59e0b",
    },
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg mb-6 overflow-hidden relative z-10">
      {/* Header Section */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <Select 
                  value={selectedChartView} 
                  onValueChange={(value) => setSelectedChartView(value as ChartViewType)}
                  disabled={selectedProduct !== "total"}
                >
                  <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 [&>svg:last-child]:hidden disabled:opacity-100 disabled:cursor-pointer">
                    <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
                      {selectedChartView === "revenue_grossprofit_margin" 
                        ? "Revenus, Bénéfice brut et Marge par produit"
                        : selectedChartView === "revenue_by_product"
                        ? "Revenus par produits"
                        : "Bénéfice brut par produit"}
                    </h3>
                    {selectedProduct === "total" && (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue_grossprofit_margin">Revenus, Bénéfice brut et Marge par produit</SelectItem>
                    <SelectItem value="revenue_by_product">Revenus par produits</SelectItem>
                    <SelectItem value="gross_margin_by_product">Bénéfice brut par produit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {/* Chart Section - Two Column Layout - Only shown when revenue_grossprofit_margin is selected */}
      {selectedChartView === "revenue_grossprofit_margin" && (
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
                    {revenueVariation >= 0 ? '+' : ''}{revenueVariation.toFixed(1)}%
                  </span>
                  <span className="text-slate-500">vs période précédente</span>
                </div>
              )}
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Average Gross Profit */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Bénéfice brut moyen</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(avgGrossProfit)}
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  {avgGrossMargin.toFixed(0)}% de marge brute
                </span>
              </div>
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Average Gross Margin */}
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Marge brute moyenne</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {avgGrossMargin.toFixed(1)}%
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
                              <span className="text-xs font-medium text-slate-600">Revenus</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-emerald-600">{formatCurrency(data.revenue)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                              <span className="text-xs font-medium text-slate-600">Bénéfice brut</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-blue-600">{formatCurrency(data.grossProfit)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-0.5 bg-amber-500"></div>
                              <span className="text-xs font-medium text-slate-600">Marge brute (%)</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-amber-600">{data.grossMargin.toFixed(1)}%</span>
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
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm bg-emerald-500 flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Revenus</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm bg-blue-500 flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Bénéfice brut</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-8 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Marge brute (%)</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                  wrapperStyle={{ paddingTop: "25px", width: "100%", paddingLeft: "0", paddingRight: "0" }}
                />
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                  </linearGradient>
                  <linearGradient id="grossProfitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <Bar
                  yAxisId="left"
                  dataKey="revenue"
                  fill="url(#revenueGradient)"
                  name="Revenus"
                  radius={[6, 6, 0, 0]}
                  stroke="#059669"
                  strokeWidth={0.5}
                />
                <Bar
                  yAxisId="left"
                  dataKey="grossProfit"
                  fill="url(#grossProfitGradient)"
                  name="Bénéfice brut"
                  radius={[6, 6, 0, 0]}
                  stroke="#2563eb"
                  strokeWidth={0.5}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="grossMargin"
                  stroke="#f59e0b"
                  strokeWidth={3.5}
                  dot={{ fill: "#f59e0b", r: 6, strokeWidth: 3, stroke: "#fff" }}
                  activeDot={{ r: 8, strokeWidth: 3, stroke: "#fff", fill: "#f59e0b" }}
                  name="Marge brute (%)"
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </div>
      )}

      {/* Revenue by Product Chart - Only shown when "total" is selected and revenue_by_product view is selected */}
      {selectedProduct === "total" && selectedChartView === "revenue_by_product" && (() => {
        // Get revenue data for each product
        const getProductRevenue = (product: "product_a" | "product_b" | "service_c", isPrior: boolean, trendIndex?: number): number => {
          const data = getProductData(period, view, product)
          if (trendIndex !== undefined && data.trendValues) {
            return data.trendValues[trendIndex]?.revenue ?? 0
          }
          return isPrior ? (data.priorRevenue ?? 0) : (data.currentRevenue ?? 0)
        }

        // Generate data points for revenue by product chart
        let revenueByProductData: Array<{
          period: string
          "Produit A": number
          "Produit B": number
          "Service C": number
        }> = []

        if (view === "12months") {
          const monthLabels = getMonthLabels(12)
          monthLabels.forEach((_, idx) => {
            revenueByProductData.push({
              period: monthLabels[idx],
              "Produit A": getProductRevenue("product_a", false, idx),
              "Produit B": getProductRevenue("product_b", false, idx),
              "Service C": getProductRevenue("service_c", false, idx),
            })
          })
        } else if (view === "quarters") {
          const quarterLabels = getQuarterLabels()
          quarterLabels.forEach((_, idx) => {
            revenueByProductData.push({
              period: quarterLabels[idx],
              "Produit A": getProductRevenue("product_a", false, idx),
              "Produit B": getProductRevenue("product_b", false, idx),
              "Service C": getProductRevenue("service_c", false, idx),
            })
          })
        } else if (view === "years") {
          const yearLabels = getYearLabels()
          yearLabels.forEach((_, idx) => {
            revenueByProductData.push({
              period: yearLabels[idx],
              "Produit A": getProductRevenue("product_a", false, idx),
              "Produit B": getProductRevenue("product_b", false, idx),
              "Service C": getProductRevenue("service_c", false, idx),
            })
          })
        } else {
          // For comparison, ytd, ddm, and current views
          revenueByProductData = [
            {
              period: "Passé",
              "Produit A": getProductRevenue("product_a", true),
              "Produit B": getProductRevenue("product_b", true),
              "Service C": getProductRevenue("service_c", true),
            },
            {
              period: "Courant",
              "Produit A": getProductRevenue("product_a", false),
              "Produit B": getProductRevenue("product_b", false),
              "Service C": getProductRevenue("service_c", false),
            },
          ]
        }

        const revenueByProductConfig = {
          "Produit A": {
            label: "Produit A",
            color: "#10b981",
          },
          "Produit B": {
            label: "Produit B",
            color: "#3b82f6",
          },
          "Service C": {
            label: "Service C",
            color: "#f59e0b",
          },
        }

        // Calculate totals and averages for metrics panel
        // Get current period values (last item in array)
        const currentRevenueA = revenueByProductData.length > 0 ? revenueByProductData[revenueByProductData.length - 1]["Produit A"] : 0
        const currentRevenueB = revenueByProductData.length > 0 ? revenueByProductData[revenueByProductData.length - 1]["Produit B"] : 0
        const currentRevenueC = revenueByProductData.length > 0 ? revenueByProductData[revenueByProductData.length - 1]["Service C"] : 0
        
        // Calculate variations if we have prior period
        const revenueAVariation = revenueByProductData.length > 1
          ? ((currentRevenueA - revenueByProductData[revenueByProductData.length - 2]["Produit A"]) / revenueByProductData[revenueByProductData.length - 2]["Produit A"]) * 100
          : 0
        const revenueBVariation = revenueByProductData.length > 1
          ? ((currentRevenueB - revenueByProductData[revenueByProductData.length - 2]["Produit B"]) / revenueByProductData[revenueByProductData.length - 2]["Produit B"]) * 100
          : 0
        const revenueCVariation = revenueByProductData.length > 1
          ? ((currentRevenueC - revenueByProductData[revenueByProductData.length - 2]["Service C"]) / revenueByProductData[revenueByProductData.length - 2]["Service C"]) * 100
          : 0

        return (
          <div className="px-8 py-6 bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Panel - Key Metrics */}
              <div className="lg:col-span-1">
                {/* Produit A */}
                <div className="pb-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Produit A</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {formatCurrency(currentRevenueA)}
                  </div>
                  {revenueByProductData.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {revenueAVariation >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`font-medium ${revenueAVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {revenueAVariation >= 0 ? '+' : ''}{revenueAVariation.toFixed(1)}%
                      </span>
                      <span className="text-slate-500">vs période précédente</span>
                    </div>
                  )}
                </div>
                
                {/* Separator */}
                <div className="border-b border-slate-200 my-3"></div>
                
                {/* Produit B */}
                <div className="pb-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Produit B</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {formatCurrency(currentRevenueB)}
                  </div>
                  {revenueByProductData.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {revenueBVariation >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`font-medium ${revenueBVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {revenueBVariation >= 0 ? '+' : ''}{revenueBVariation.toFixed(1)}%
                      </span>
                      <span className="text-slate-500">vs période précédente</span>
                    </div>
                  )}
                </div>
                
                {/* Separator */}
                <div className="border-b border-slate-200 my-3"></div>
                
                {/* Service C */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Service C</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {formatCurrency(currentRevenueC)}
                  </div>
                  {revenueByProductData.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {revenueCVariation >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`font-medium ${revenueCVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {revenueCVariation >= 0 ? '+' : ''}{revenueCVariation.toFixed(1)}%
                      </span>
                      <span className="text-slate-500">vs période précédente</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Chart */}
              <div className="lg:col-span-4">
                <ChartContainer config={revenueByProductConfig} className="h-[400px] w-full">
                  <ComposedChart data={revenueByProductData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                    <XAxis
                      dataKey="period"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickLine={{ stroke: "#cbd5e1" }}
                      axisLine={{ stroke: "#cbd5e1" }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                            <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</div>
                            <div className="space-y-2.5">
                              {payload.map((entry, index) => {
                                // Get color from entry.color (should be set by Bar component now) or fallback to config
                                const color = entry.color || revenueByProductConfig[entry.dataKey as keyof typeof revenueByProductConfig]?.color || "#64748b"
                                return (
                                  <div key={index} className="flex items-center justify-between gap-6 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }}></div>
                                      <span className="text-xs font-medium text-slate-600">{entry.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-sm" style={{ color: color }}>
                                      {formatCurrency(entry.value as number)}
                                    </span>
                                  </div>
                                )
                              })}
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
                              {payload?.map((entry, index) => {
                                // Get color from entry.color (should be set by Bar component now) or fallback to config
                                const color = entry.color || revenueByProductConfig[entry.dataKey as keyof typeof revenueByProductConfig]?.color || "#64748b"
                                return (
                                  <div key={index} className="flex items-center gap-2.5 min-w-fit">
                                    <div
                                      className="w-4 h-4 rounded-md shadow-sm flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                    ></div>
                                    <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{entry.value}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }}
                      wrapperStyle={{ paddingTop: "25px", width: "100%", paddingLeft: "0", paddingRight: "0" }}
                    />
                    <defs>
                      <linearGradient id="productAGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id="productBGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id="serviceCGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <Bar
                      dataKey="Produit A"
                      fill={revenueByProductConfig["Produit A"].color}
                      name="Produit A"
                      radius={[6, 6, 0, 0]}
                      stroke="#059669"
                      strokeWidth={0.5}
                    />
                    <Bar
                      dataKey="Produit B"
                      fill={revenueByProductConfig["Produit B"].color}
                      name="Produit B"
                      radius={[6, 6, 0, 0]}
                      stroke="#2563eb"
                      strokeWidth={0.5}
                    />
                    <Bar
                      dataKey="Service C"
                      fill={revenueByProductConfig["Service C"].color}
                      name="Service C"
                      radius={[6, 6, 0, 0]}
                      stroke="#d97706"
                      strokeWidth={0.5}
                    />
                  </ComposedChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Gross Margin by Product Chart - Only shown when "total" is selected and gross_margin_by_product view is selected */}
      {selectedProduct === "total" && selectedChartView === "gross_margin_by_product" && (() => {
        // Get revenue and costs data for each product to calculate gross margin
        const getProductRevenue = (product: "product_a" | "product_b" | "service_c", isPrior: boolean, trendIndex?: number): number => {
          const data = getProductData(period, view, product)
          if (trendIndex !== undefined && data.trendValues) {
            return data.trendValues[trendIndex]?.revenue ?? 0
          }
          return isPrior ? (data.priorRevenue ?? 0) : (data.currentRevenue ?? 0)
        }

        const getProductCosts = (product: "product_a" | "product_b" | "service_c", isPrior: boolean, trendIndex?: number): number => {
          const data = getProductData(period, view, product)
          if (trendIndex !== undefined && data.trendValues) {
            return data.trendValues[trendIndex]?.costs ?? 0
          }
          return isPrior ? (data.priorCosts ?? 0) : (data.currentCosts ?? 0)
        }

        const getProductGrossMargin = (product: "product_a" | "product_b" | "service_c", isPrior: boolean, trendIndex?: number): number => {
          const revenue = getProductRevenue(product, isPrior, trendIndex)
          const costs = getProductCosts(product, isPrior, trendIndex)
          if (revenue === 0) return 0
          return ((revenue - costs) / revenue) * 100
        }

        // Helper function to get contribution margin in dollars (revenue - costs)
        const getProductContributionMargin = (product: "product_a" | "product_b" | "service_c", isPrior: boolean, trendIndex?: number): number => {
          const revenue = getProductRevenue(product, isPrior, trendIndex)
          const costs = getProductCosts(product, isPrior, trendIndex)
          return revenue - costs
        }

        // Generate data points for gross margin by product chart
        let grossMarginByProductData: Array<{
          period: string
          "Produit A": number
          "Produit B": number
          "Service C": number
          "Contribution A": number
          "Contribution B": number
          "Contribution C": number
        }> = []

        if (view === "12months") {
          const monthLabels = getMonthLabels(12)
          monthLabels.forEach((_, idx) => {
            grossMarginByProductData.push({
              period: monthLabels[idx],
              "Produit A": getProductGrossMargin("product_a", false, idx),
              "Produit B": getProductGrossMargin("product_b", false, idx),
              "Service C": getProductGrossMargin("service_c", false, idx),
              "Contribution A": getProductContributionMargin("product_a", false, idx),
              "Contribution B": getProductContributionMargin("product_b", false, idx),
              "Contribution C": getProductContributionMargin("service_c", false, idx),
            })
          })
        } else if (view === "quarters") {
          const quarterLabels = getQuarterLabels()
          quarterLabels.forEach((_, idx) => {
            grossMarginByProductData.push({
              period: quarterLabels[idx],
              "Produit A": getProductGrossMargin("product_a", false, idx),
              "Produit B": getProductGrossMargin("product_b", false, idx),
              "Service C": getProductGrossMargin("service_c", false, idx),
              "Contribution A": getProductContributionMargin("product_a", false, idx),
              "Contribution B": getProductContributionMargin("product_b", false, idx),
              "Contribution C": getProductContributionMargin("service_c", false, idx),
            })
          })
        } else if (view === "years") {
          const yearLabels = getYearLabels()
          yearLabels.forEach((_, idx) => {
            grossMarginByProductData.push({
              period: yearLabels[idx],
              "Produit A": getProductGrossMargin("product_a", false, idx),
              "Produit B": getProductGrossMargin("product_b", false, idx),
              "Service C": getProductGrossMargin("service_c", false, idx),
              "Contribution A": getProductContributionMargin("product_a", false, idx),
              "Contribution B": getProductContributionMargin("product_b", false, idx),
              "Contribution C": getProductContributionMargin("service_c", false, idx),
            })
          })
        } else {
          // For comparison, ytd, ddm, and current views
          grossMarginByProductData = [
            {
              period: "Passé",
              "Produit A": getProductGrossMargin("product_a", true),
              "Produit B": getProductGrossMargin("product_b", true),
              "Service C": getProductGrossMargin("service_c", true),
              "Contribution A": getProductContributionMargin("product_a", true),
              "Contribution B": getProductContributionMargin("product_b", true),
              "Contribution C": getProductContributionMargin("service_c", true),
            },
            {
              period: "Courant",
              "Produit A": getProductGrossMargin("product_a", false),
              "Produit B": getProductGrossMargin("product_b", false),
              "Service C": getProductGrossMargin("service_c", false),
              "Contribution A": getProductContributionMargin("product_a", false),
              "Contribution B": getProductContributionMargin("product_b", false),
              "Contribution C": getProductContributionMargin("service_c", false),
            },
          ]
        }

        const grossMarginByProductConfig = {
          "Produit A": {
            label: "Produit A",
            color: "#10b981",
          },
          "Produit B": {
            label: "Produit B",
            color: "#3b82f6",
          },
          "Service C": {
            label: "Service C",
            color: "#f59e0b",
          },
          "Contribution A": {
            label: "Bénéfice brut A ($)",
            color: "#10b981",
          },
          "Contribution B": {
            label: "Bénéfice brut B ($)",
            color: "#3b82f6",
          },
          "Contribution C": {
            label: "Bénéfice brut C ($)",
            color: "#f59e0b",
          },
        }

        // Calculate totals and averages for metrics panel
        // Get current period values (last item in array)
        const currentMarginA = grossMarginByProductData.length > 0 ? grossMarginByProductData[grossMarginByProductData.length - 1]["Produit A"] : 0
        const currentMarginB = grossMarginByProductData.length > 0 ? grossMarginByProductData[grossMarginByProductData.length - 1]["Produit B"] : 0
        const currentMarginC = grossMarginByProductData.length > 0 ? grossMarginByProductData[grossMarginByProductData.length - 1]["Service C"] : 0
        
        // Calculate variations if we have prior period
        const marginAVariation = grossMarginByProductData.length > 1
          ? currentMarginA - grossMarginByProductData[grossMarginByProductData.length - 2]["Produit A"]
          : 0
        const marginBVariation = grossMarginByProductData.length > 1
          ? currentMarginB - grossMarginByProductData[grossMarginByProductData.length - 2]["Produit B"]
          : 0
        const marginCVariation = grossMarginByProductData.length > 1
          ? currentMarginC - grossMarginByProductData[grossMarginByProductData.length - 2]["Service C"]
          : 0

        return (
          <div className="px-8 py-6 bg-white">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Panel - Key Metrics */}
              <div className="lg:col-span-1">
                {/* Produit A */}
                <div className="pb-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Produit A</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {currentMarginA.toFixed(1)}%
                  </div>
                  {grossMarginByProductData.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {marginAVariation >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`font-medium ${marginAVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {marginAVariation >= 0 ? '+' : ''}{marginAVariation.toFixed(1)}pp
                      </span>
                      <span className="text-slate-500">vs période précédente</span>
                    </div>
                  )}
                </div>
                
                {/* Separator */}
                <div className="border-b border-slate-200 my-3"></div>
                
                {/* Produit B */}
                <div className="pb-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Produit B</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {currentMarginB.toFixed(1)}%
                  </div>
                  {grossMarginByProductData.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {marginBVariation >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`font-medium ${marginBVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {marginBVariation >= 0 ? '+' : ''}{marginBVariation.toFixed(1)}pp
                      </span>
                      <span className="text-slate-500">vs période précédente</span>
                    </div>
                  )}
                </div>
                
                {/* Separator */}
                <div className="border-b border-slate-200 my-3"></div>
                
                {/* Service C */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Service C</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {currentMarginC.toFixed(1)}%
                  </div>
                  {grossMarginByProductData.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      {marginCVariation >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-600" />
                      )}
                      <span className={`font-medium ${marginCVariation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {marginCVariation >= 0 ? '+' : ''}{marginCVariation.toFixed(1)}pp
                      </span>
                      <span className="text-slate-500">vs période précédente</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Chart */}
              <div className="lg:col-span-4">
                <ChartContainer config={grossMarginByProductConfig} className="h-[400px] w-full">
                  <ComposedChart data={grossMarginByProductData} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
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
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        // Separate percentage entries from dollar entries
                        const percentageEntries = payload.filter(entry => 
                          entry.dataKey === "Produit A" || entry.dataKey === "Produit B" || entry.dataKey === "Service C"
                        )
                        const dollarEntries = payload.filter(entry => 
                          entry.dataKey === "Contribution A" || entry.dataKey === "Contribution B" || entry.dataKey === "Contribution C"
                        )
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                            <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</div>
                            <div className="space-y-2.5">
                              {/* Dollar gross profit */}
                              {dollarEntries.length > 0 && (
                                <>
                                  {dollarEntries.map((entry, index) => {
                                    const color = entry.color || grossMarginByProductConfig[entry.dataKey as keyof typeof grossMarginByProductConfig]?.color || "#64748b"
                                    const productName = entry.dataKey === "Contribution A" ? "Produit A" : entry.dataKey === "Contribution B" ? "Produit B" : "Service C"
                                    return (
                                      <div key={index} className="flex items-center justify-between gap-6 min-w-[200px]">
                                        <div className="flex items-center gap-2">
                                          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }}></div>
                                          <span className="text-xs font-medium text-slate-600">{productName} (Bénéfice brut $)</span>
                                        </div>
                                        <span className="font-mono font-bold text-sm" style={{ color: color }}>
                                          {formatCurrency(entry.value as number)}
                                        </span>
                                      </div>
                                    )
                                  })}
                                  {percentageEntries.length > 0 && <div className="border-t border-slate-100 pt-2 mt-2"></div>}
                                </>
                              )}
                              {/* Percentage margins */}
                              {percentageEntries.map((entry, index) => {
                                const color = entry.color || grossMarginByProductConfig[entry.dataKey as keyof typeof grossMarginByProductConfig]?.color || "#64748b"
                                return (
                                  <div key={index} className="flex items-center justify-between gap-6 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-0.5" style={{ backgroundColor: color }}></div>
                                      <span className="text-xs font-medium text-slate-600">{entry.name} (%)</span>
                                    </div>
                                    <span className="font-mono font-bold text-sm" style={{ color: color }}>
                                      {(entry.value as number).toFixed(1)}%
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }}
                    />
                    <ChartLegend
                      content={({ payload }) => {
                        // Filter to show only percentage entries in legend (lines)
                        const percentageEntries = payload?.filter(entry => 
                          entry.dataKey === "Produit A" || entry.dataKey === "Produit B" || entry.dataKey === "Service C"
                        )
                        return (
                          <div className="w-full pt-6 pb-2">
                            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4">
                              {percentageEntries?.map((entry, index) => {
                                const color = entry.color || grossMarginByProductConfig[entry.dataKey as keyof typeof grossMarginByProductConfig]?.color || "#64748b"
                                return (
                                  <div key={index} className="flex items-center gap-2.5 min-w-fit">
                                    <div
                                      className="w-8 h-1.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                    ></div>
                                    <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{entry.value} (%)</span>
                                  </div>
                                )
                              })}
                              {/* Add contribution legend */}
                              <div className="flex items-center gap-2.5 min-w-fit">
                                <div className="w-4 h-4 rounded-sm bg-slate-400 flex-shrink-0"></div>
                                <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Bénéfice brut ($)</span>
                              </div>
                            </div>
                          </div>
                        )
                      }}
                      wrapperStyle={{ paddingTop: "25px", width: "100%", paddingLeft: "0", paddingRight: "0" }}
                    />
                    <defs>
                      <linearGradient id="contributionAGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="contributionBGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="contributionCGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    {/* Stacked bars for gross profit in dollars */}
                    <Bar
                      yAxisId="left"
                      dataKey="Contribution A"
                      stackId="contribution"
                      fill="url(#contributionAGradient)"
                      radius={[0, 0, 0, 0]}
                      stroke={grossMarginByProductConfig["Produit A"].color}
                      strokeWidth={0.5}
                      name="Bénéfice brut A"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="Contribution B"
                      stackId="contribution"
                      fill="url(#contributionBGradient)"
                      radius={[0, 0, 0, 0]}
                      stroke={grossMarginByProductConfig["Produit B"].color}
                      strokeWidth={0.5}
                      name="Bénéfice brut B"
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="Contribution C"
                      stackId="contribution"
                      fill="url(#contributionCGradient)"
                      radius={[6, 6, 0, 0]}
                      stroke={grossMarginByProductConfig["Service C"].color}
                      strokeWidth={0.5}
                      name="Bénéfice brut C"
                    />
                    {/* Lines for percentage margins */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="Produit A"
                      stroke={grossMarginByProductConfig["Produit A"].color}
                      strokeWidth={3.5}
                      dot={{ fill: grossMarginByProductConfig["Produit A"].color, r: 6, strokeWidth: 3, stroke: "#fff" }}
                      activeDot={{ r: 8, strokeWidth: 3, stroke: "#fff", fill: grossMarginByProductConfig["Produit A"].color }}
                      name="Produit A"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="Produit B"
                      stroke={grossMarginByProductConfig["Produit B"].color}
                      strokeWidth={3.5}
                      dot={{ fill: grossMarginByProductConfig["Produit B"].color, r: 6, strokeWidth: 3, stroke: "#fff" }}
                      activeDot={{ r: 8, strokeWidth: 3, stroke: "#fff", fill: grossMarginByProductConfig["Produit B"].color }}
                      name="Produit B"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="Service C"
                      stroke={grossMarginByProductConfig["Service C"].color}
                      strokeWidth={3.5}
                      dot={{ fill: grossMarginByProductConfig["Service C"].color, r: 6, strokeWidth: 3, stroke: "#fff" }}
                      activeDot={{ r: 8, strokeWidth: 3, stroke: "#fff", fill: grossMarginByProductConfig["Service C"].color }}
                      name="Service C"
                    />
                  </ComposedChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

