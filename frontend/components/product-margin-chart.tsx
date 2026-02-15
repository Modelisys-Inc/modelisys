"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react"

export type ProductType = "total" | "product_a" | "product_b" | "service_c"

export interface ProductMarginChartDataPoint {
  period: string
  revenue: number
  costs: number
  grossProfit: number
  grossMargin: number
}

type ChartViewType = "revenue_grossprofit_margin" | "revenue_by_product" | "gross_margin_by_product"

interface ProductMarginChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "comparison" | "ytd" | "ddm" | "12months" | "24months" | "quarters" | "years"
  selectedProduct: ProductType
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  chartData?: ProductMarginChartDataPoint[]
  loading?: boolean
}

export function ProductMarginChart({
  period,
  view,
  selectedProduct,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  chartData,
  loading = false,
}: ProductMarginChartProps) {
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>("revenue_grossprofit_margin")

  // Reset to default view when selectedProduct changes from "total" to something else
  useEffect(() => {
    if (selectedProduct !== "total" && (selectedChartView === "revenue_by_product" || selectedChartView === "gross_margin_by_product")) {
      setSelectedChartView("revenue_grossprofit_margin")
    }
  }, [selectedProduct, selectedChartView])

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
      {selectedProduct === "total" && selectedChartView === "revenue_by_product" && (
        <div className="flex items-center justify-center h-64 bg-white px-8 py-6">
          <p className="text-slate-400">Aucune donnée disponible pour cette vue</p>
        </div>
      )}

      {/* Gross Margin by Product Chart - Only shown when "total" is selected and gross_margin_by_product view is selected */}
      {selectedProduct === "total" && selectedChartView === "gross_margin_by_product" && (
        <div className="flex items-center justify-center h-64 bg-white px-8 py-6">
          <p className="text-slate-400">Aucune donnée disponible pour cette vue</p>
        </div>
      )}
    </div>
  )
}

