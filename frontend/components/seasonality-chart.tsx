"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3 } from "lucide-react"

type ProductType = "total" | "product_a" | "product_b" | "service_c"

interface SeasonalityChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "12months" | "24months" | "years"
  analysisType?: "revenue" | "expenses"
  selectedProduct?: ProductType
  onProductChange?: (product: ProductType) => void
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper function to generate month labels
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

// Helper function to generate year labels
const getYearLabels = (): string[] => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => `${currentYear - 5 + i}`)
}

// Generate seasonal pattern (example: higher in Q4, lower in Q1)
const getSeasonalPattern = (): number[] => {
  // Pattern for 12 months: higher in Nov-Dec, lower in Jan-Feb
  return [0.85, 0.80, 0.90, 0.95, 1.0, 1.05, 1.10, 1.05, 1.0, 0.95, 1.15, 1.20]
}

type ChartViewType = "revenue_vs_costs" | "revenue_by_type" | "variable_costs_detail"

export function SeasonalityChart({
  period,
  view,
  analysisType = "revenue",
  selectedProduct = "total",
  onProductChange,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: SeasonalityChartProps) {
  const [chartView, setChartView] = useState<ChartViewType>("revenue_vs_costs")
  
  const handleProductChange = (product: ProductType) => {
    if (onProductChange) {
      onProductChange(product)
    }
  }
  
  // Base values for each product/service (matching seasonality-detail.tsx)
  const baseProduct1 = 120000
  const baseProduct2 = 90000
  const baseProduct3 = 65000
  
  // Variable cost ratios
  const product1CostRatio = 0.55 // 55% of revenue
  const product2CostRatio = 0.50 // 50% of revenue
  const product3CostRatio = 0.35 // 35% of revenue (service)
  
  // Get base values based on selected product
  const getBaseRevenue = (): number => {
    if (analysisType === "revenue") {
      switch (selectedProduct) {
        case "product_a":
          return baseProduct1
        case "product_b":
          return baseProduct2
        case "service_c":
          return baseProduct3
        case "total":
        default:
          return baseProduct1 + baseProduct2 + baseProduct3
      }
    } else {
      return 70000
    }
  }
  
  const getBaseCost = (): number => {
    if (analysisType === "revenue") {
      switch (selectedProduct) {
        case "product_a":
          return baseProduct1 * product1CostRatio
        case "product_b":
          return baseProduct2 * product2CostRatio
        case "service_c":
          return baseProduct3 * product3CostRatio
        case "total":
        default:
          return baseProduct1 * product1CostRatio + baseProduct2 * product2CostRatio + baseProduct3 * product3CostRatio
      }
    } else {
      return 0
    }
  }
  
  const getBaseMargin = (): number => {
    return getBaseRevenue() - getBaseCost()
  }
  
  const baseRevenue = getBaseRevenue()
  const baseCost = getBaseCost()
  const baseMargin = getBaseMargin()
  
  // Generate chart data
  let chartDataPoints: Array<{
    period: string
    revenue?: number
    cost?: number
    margin?: number
    value?: number
    average?: number
  }> = []

  const seasonalPattern = getSeasonalPattern()
  
  // Helper function to generate data for a given base value
  const generateDataForBase = (base: number, pattern: number[]): number[] => {
    const data: number[] = []
    if (view === "12months") {
      const monthLabels = getMonthLabels(12)
      monthLabels.forEach((_, idx) => {
        const monthIndex = (new Date().getMonth() - (11 - idx) + 12) % 12
        const seasonalMultiplier = pattern[monthIndex] || 1
        const trend = 1 + (0.02 * idx)
        const value = Math.round(base * seasonalMultiplier * trend * (0.95 + Math.random() * 0.1))
        data.push(value)
      })
    } else if (view === "24months") {
      const monthLabels = getMonthLabels(24)
      monthLabels.forEach((_, idx) => {
        const monthIndex = (new Date().getMonth() - (23 - idx) + 24) % 12
        const seasonalMultiplier = pattern[monthIndex] || 1
        const trend = 1 + (0.01 * idx)
        const value = Math.round(base * seasonalMultiplier * trend * (0.95 + Math.random() * 0.1))
        data.push(value)
      })
    } else if (view === "years") {
      const yearLabels = getYearLabels()
      yearLabels.forEach((_, idx) => {
        const trend = 1 + (0.05 * idx)
        const value = Math.round(base * 12 * trend * (0.95 + Math.random() * 0.1))
        data.push(value)
      })
    }
    return data
  }

  // Generate data based on chart view
  const getLabels = (): string[] => {
    if (view === "12months") return getMonthLabels(12)
    if (view === "24months") return getMonthLabels(24)
    if (view === "years") return getYearLabels()
    return []
  }
  
  const labels = getLabels()
  
  if (chartView === "revenue_by_type") {
    // Histogram by revenue type (only when Total is selected)
    const product1Values = generateDataForBase(baseProduct1, seasonalPattern)
    const product2Values = generateDataForBase(baseProduct2, seasonalPattern)
    const product3Values = generateDataForBase(baseProduct3, seasonalPattern)
    
    labels.forEach((label, idx) => {
      chartDataPoints.push({
        period: label,
        productA: product1Values[idx],
        productB: product2Values[idx],
        serviceC: product3Values[idx],
      })
    })
  } else if (chartView === "variable_costs_detail") {
    // Variable costs breakdown by component (Achats, Main-d'oeuvre, Transport) with revenue curve
    const transportRatio = 0.05 // 5% for all
    
    if (selectedProduct === "total") {
      // Cumulative values for all products/services
      const product1PurchasesRatio = 0.30
      const product1LaborRatio = 0.20
      const product2PurchasesRatio = 0.25
      const product2LaborRatio = 0.20
      const product3PurchasesRatio = 0.15
      const product3LaborRatio = 0.15
      
      const baseProduct1Revenue = baseProduct1
      const baseProduct2Revenue = baseProduct2
      const baseProduct3Revenue = baseProduct3
      
      const baseProduct1Purchases = baseProduct1Revenue * product1PurchasesRatio
      const baseProduct1Labor = baseProduct1Revenue * product1LaborRatio
      const baseProduct1Transport = baseProduct1Revenue * transportRatio
      
      const baseProduct2Purchases = baseProduct2Revenue * product2PurchasesRatio
      const baseProduct2Labor = baseProduct2Revenue * product2LaborRatio
      const baseProduct2Transport = baseProduct2Revenue * transportRatio
      
      const baseProduct3Purchases = baseProduct3Revenue * product3PurchasesRatio
      const baseProduct3Labor = baseProduct3Revenue * product3LaborRatio
      const baseProduct3Transport = baseProduct3Revenue * transportRatio
      
      // Cumulative base values
      const basePurchasesTotal = baseProduct1Purchases + baseProduct2Purchases + baseProduct3Purchases
      const baseLaborTotal = baseProduct1Labor + baseProduct2Labor + baseProduct3Labor
      const baseTransportTotal = baseProduct1Transport + baseProduct2Transport + baseProduct3Transport
      const baseRevenueTotal = baseProduct1Revenue + baseProduct2Revenue + baseProduct3Revenue
      
      const revenueValues = generateDataForBase(baseRevenueTotal, seasonalPattern)
      const purchasesValues = generateDataForBase(basePurchasesTotal, seasonalPattern)
      const laborValues = generateDataForBase(baseLaborTotal, seasonalPattern)
      const transportValues = generateDataForBase(baseTransportTotal, seasonalPattern)
      
      labels.forEach((label, idx) => {
        chartDataPoints.push({
          period: label,
          revenue: revenueValues[idx],
          purchases: purchasesValues[idx],
          labor: laborValues[idx],
          transport: transportValues[idx],
        })
      })
    } else {
      // Individual product/service values
      let purchasesRatio = 0
      let laborRatio = 0
      
      if (selectedProduct === "product_a") {
        purchasesRatio = 0.30
        laborRatio = 0.20
      } else if (selectedProduct === "product_b") {
        purchasesRatio = 0.25
        laborRatio = 0.20
      } else if (selectedProduct === "service_c") {
        purchasesRatio = 0.15
        laborRatio = 0.15
      }
      
      const baseRevenue = getBaseRevenue()
      const basePurchases = baseRevenue * purchasesRatio
      const baseLabor = baseRevenue * laborRatio
      const baseTransport = baseRevenue * transportRatio
      
      const revenueValues = generateDataForBase(baseRevenue, seasonalPattern)
      const purchasesValues = generateDataForBase(basePurchases, seasonalPattern)
      const laborValues = generateDataForBase(baseLabor, seasonalPattern)
      const transportValues = generateDataForBase(baseTransport, seasonalPattern)
      
      labels.forEach((label, idx) => {
        chartDataPoints.push({
          period: label,
          revenue: revenueValues[idx],
          purchases: purchasesValues[idx],
          labor: laborValues[idx],
          transport: transportValues[idx],
        })
      })
    }
  } else if (chartView === "revenue_vs_costs") {
    // Revenue vs variable costs with gross margin
    const revenues = generateDataForBase(baseRevenue, seasonalPattern)
    const costs = generateDataForBase(baseCost, seasonalPattern)
    const margins = revenues.map((rev, idx) => rev - costs[idx])
    labels.forEach((label, idx) => {
      chartDataPoints.push({
        period: label,
        revenue: revenues[idx],
        cost: costs[idx],
        margin: margins[idx],
      })
    })
  }

  if (chartDataPoints.length === 0) return null

  const valueLabel = analysisType === "revenue" ? "Revenus" : "Dépenses"

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "Années"
    return "12 mois"
  }

  // Helper function to get base title
  const getBaseTitle = (): string => {
    if (analysisType === "expenses") {
      return "Saisonnalité des dépenses"
    }
    
    // Different titles based on chart view
    if (chartView === "revenue_by_type") {
      return "Revenus par type"
    } else if (chartView === "variable_costs_detail") {
      return "Détail des coûts variables"
    } else if (chartView === "revenue_vs_costs") {
      return "Revenus vs coûts variables"
    }
    
    return "Saisonnalité des revenus"
  }

  // Helper function to get entity text
  const getEntityText = (): { parts: JSX.Element[] } => {
    if (subDivisionId && divisionId && companyId) {
      const company = companies.find((c) => c.id === companyId)
      const division = company?.divisions.find((d) => d.id === divisionId)
      const subDivision = division?.subDivisions.find((sd) => sd.id === subDivisionId)
      return {
        parts: [
          <span key="company">{company?.name || "Société"}</span>,
          <span key="sep1" className="text-slate-500">•</span>,
          <span key="division">{division?.name || "Division"}</span>,
          <span key="sep2" className="text-slate-500">•</span>,
          <span key="subdivision" className="text-blue-400 font-semibold">{subDivision?.name || "Sous-division"}</span>,
        ],
      }
    } else if (divisionId && companyId) {
      const company = companies.find((c) => c.id === companyId)
      const division = company?.divisions.find((d) => d.id === divisionId)
      return {
        parts: [
          <span key="company">{company?.name || "Société"}</span>,
          <span key="sep" className="text-slate-500">•</span>,
          <span key="division" className="text-blue-400 font-semibold">{division?.name || "Division"}</span>,
        ],
      }
    } else if (companyId) {
      const company = companies.find((c) => c.id === companyId)
      return {
        parts: [<span key="company" className="text-blue-400 font-semibold">{company?.name || "Société sélectionnée"}</span>],
      }
    } else {
      return {
        parts: [<span key="all" className="truncate">Toutes les sociétés</span>],
      }
    }
  }

  const entityText = getEntityText()

  const chartConfig = {
    value: {
      label: valueLabel,
      color: analysisType === "revenue" ? "#10b981" : "#ef4444",
    },
    revenue: {
      label: "Revenus",
      color: "#10b981",
    },
    cost: {
      label: "Coûts variables",
      color: "#ef4444",
    },
    margin: {
      label: "Marge",
      color: "#f59e0b",
    },
    average: {
      label: "Moyenne",
      color: "#3b82f6",
    },
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg mb-6 overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-5 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-1 h-12 rounded-full flex-shrink-0 ${analysisType === "revenue" ? "bg-emerald-400" : "bg-red-400"}`}></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white tracking-tight mb-1">{getBaseTitle()}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-500">•</span>
                {entityText.parts}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      {analysisType === "revenue" && (
        <div className="px-8 py-5 bg-white/50 border-b border-slate-200/60">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Produit/Service</span>
                <Select value={selectedProduct} onValueChange={(value) => handleProductChange(value as ProductType)}>
                  <SelectTrigger className="w-[220px] bg-white border-slate-300 shadow-sm hover:shadow-md transition-shadow">
                    <SelectValue placeholder="Sélectionner un produit/service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total</SelectItem>
                    <SelectItem value="product_a">Produit A</SelectItem>
                    <SelectItem value="product_b">Produit B</SelectItem>
                    <SelectItem value="service_c">Service C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vue</span>
                <Select value={chartView} onValueChange={(value) => setChartView(value as ChartViewType)}>
                  <SelectTrigger className="w-[250px] bg-white border-slate-300 shadow-sm hover:shadow-md transition-shadow">
                    <SelectValue placeholder="Sélectionner une vue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue_vs_costs">Revenus vs coûts variables</SelectItem>
                    {selectedProduct === "total" && (
                      <>
                        <SelectItem value="revenue_by_type">Revenus par type</SelectItem>
                        <SelectItem value="variable_costs_detail">Détail des coûts variables</SelectItem>
                      </>
                    )}
                    {selectedProduct !== "total" && (
                      <SelectItem value="variable_costs_detail">Détail des coûts variables</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="px-8 py-6 bg-white">
        <ChartContainer config={chartConfig} className="h-[450px] w-full">
          <ComposedChart data={chartDataPoints} margin={{ top: 25, right: 25, left: 10, bottom: chartDataPoints.length > 6 ? 80 : 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
            <XAxis
              dataKey="period"
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              tickLine={{ stroke: "#cbd5e1" }}
              angle={chartDataPoints.length > 6 ? -45 : 0}
              textAnchor={chartDataPoints.length > 6 ? "end" : "middle"}
              height={chartDataPoints.length > 6 ? 80 : 50}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              tickLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const data = payload[0]?.payload
                
                // Tooltip for revenue by type view
                if (chartView === "revenue_by_type") {
                  const total = (data.productA || 0) + (data.productB || 0) + (data.serviceC || 0)
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                      <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</div>
                      <div className="space-y-2.5">
                        {data.productA !== undefined && (
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                              <span className="text-xs font-medium text-slate-600">Produit A</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-emerald-600">
                              {formatCurrency(data.productA)}
                            </span>
                          </div>
                        )}
                        {data.productB !== undefined && (
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                              <span className="text-xs font-medium text-slate-600">Produit B</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-blue-600">
                              {formatCurrency(data.productB)}
                            </span>
                          </div>
                        )}
                        {data.serviceC !== undefined && (
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-purple-500"></div>
                              <span className="text-xs font-medium text-slate-600">Service C</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-purple-600">
                              {formatCurrency(data.serviceC)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-6 pt-2 border-t border-slate-200">
                          <span className="text-xs font-semibold text-slate-700">Total</span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                
                // Tooltip for variable costs detail view
                if (chartView === "variable_costs_detail") {
                  const total = (data.purchases || 0) + (data.labor || 0) + (data.transport || 0)
                  return (
                    <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                      <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</div>
                      <div className="space-y-2.5">
                        {data.revenue !== undefined && (
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-1.5 bg-slate-600 rounded-full flex-shrink-0"></div>
                              <span className="text-xs font-medium text-slate-600">Revenus</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-slate-700">
                              {formatCurrency(data.revenue)}
                            </span>
                          </div>
                        )}
                        {data.purchases !== undefined && (
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                              <span className="text-xs font-medium text-slate-600">Achats</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-emerald-600">
                              {formatCurrency(data.purchases)}
                            </span>
                          </div>
                        )}
                        {data.labor !== undefined && (
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                              <span className="text-xs font-medium text-slate-600">Main-d'oeuvre</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-blue-600">
                              {formatCurrency(data.labor)}
                            </span>
                          </div>
                        )}
                        {data.transport !== undefined && (
                          <div className="flex items-center justify-between gap-6 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                              <span className="text-xs font-medium text-slate-600">Transport</span>
                            </div>
                            <span className="font-mono font-bold text-sm text-amber-600">
                              {formatCurrency(data.transport)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-6 pt-2 border-t border-slate-200">
                          <span className="text-xs font-semibold text-slate-700">Total coûts variables</span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                
                // Default tooltip for revenue_vs_costs view
                return (
                  <div className="rounded-xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-xl">
                    <div className="font-bold text-sm text-slate-900 mb-3 pb-2 border-b border-slate-100">{label}</div>
                    <div className="space-y-2.5">
                      {data.revenue !== undefined && (
                        <div className="flex items-center justify-between gap-6 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-emerald-500"></div>
                            <span className="text-xs font-medium text-slate-600">Revenus</span>
                          </div>
                          <span className="font-mono font-bold text-sm text-emerald-600">
                            {formatCurrency(data.revenue)}
                          </span>
                        </div>
                      )}
                      {data.cost !== undefined && (
                        <div className="flex items-center justify-between gap-6 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                            <span className="text-xs font-medium text-slate-600">Coûts variables</span>
                          </div>
                          <span className="font-mono font-bold text-sm text-red-600">
                            {formatCurrency(data.cost)}
                          </span>
                        </div>
                      )}
                      {data.margin !== undefined && (
                        <div className="flex items-center justify-between gap-6 min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-amber-500"></div>
                            <span className="text-xs font-medium text-slate-600">Marge brute</span>
                          </div>
                          <span className="font-mono font-bold text-sm text-amber-600">
                            {formatCurrency(data.margin)}
                          </span>
                        </div>
                      )}
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
                      {chartView === "revenue_by_type" ? (
                        <>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0" style={{ backgroundColor: "#10b981" }}></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Produit A</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0" style={{ backgroundColor: "#3b82f6" }}></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Produit B</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0" style={{ backgroundColor: "#8b5cf6" }}></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Service C</span>
                          </div>
                        </>
                      ) : chartView === "variable_costs_detail" ? (
                        <>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-8 h-1.5 bg-slate-600 rounded-full flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Revenus</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0 bg-emerald-500"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Achats</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0 bg-blue-500"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Main-d'oeuvre</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0 bg-amber-500"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Transport</span>
                          </div>
                        </>
                      ) : chartView === "revenue_vs_costs" ? (
                        <>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0 bg-emerald-500"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Revenus</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-4 h-4 rounded-md shadow-sm flex-shrink-0 bg-red-500"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Coûts variables</span>
                          </div>
                          <div className="flex items-center gap-2.5 min-w-fit">
                            <div className="w-8 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Marge brute</span>
                          </div>
                        </>
                      ) : null}
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
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.9} />
              </linearGradient>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={analysisType === "revenue" ? "#10b981" : "#ef4444"} stopOpacity={1} />
                <stop offset="100%" stopColor={analysisType === "revenue" ? "#059669" : "#dc2626"} stopOpacity={0.9} />
              </linearGradient>
            </defs>
            {chartView === "revenue_by_type" && (
              <>
                <Bar
                  dataKey="productA"
                  stackId="revenue"
                  fill="#10b981"
                  name="Produit A"
                  radius={[0, 0, 0, 0]}
                  stroke="#059669"
                  strokeWidth={0.5}
                />
                <Bar
                  dataKey="productB"
                  stackId="revenue"
                  fill="#3b82f6"
                  name="Produit B"
                  radius={[0, 0, 0, 0]}
                  stroke="#2563eb"
                  strokeWidth={0.5}
                />
                <Bar
                  dataKey="serviceC"
                  stackId="revenue"
                  fill="#8b5cf6"
                  name="Service C"
                  radius={[6, 6, 0, 0]}
                  stroke="#7c3aed"
                  strokeWidth={0.5}
                />
              </>
            )}
            {chartView === "variable_costs_detail" && (
              <>
                <Bar
                  dataKey="purchases"
                  stackId="costs"
                  fill="#10b981"
                  name="Achats"
                  radius={[0, 0, 0, 0]}
                  stroke="#059669"
                  strokeWidth={0.5}
                />
                <Bar
                  dataKey="labor"
                  stackId="costs"
                  fill="#3b82f6"
                  name="Main-d'oeuvre"
                  radius={[0, 0, 0, 0]}
                  stroke="#2563eb"
                  strokeWidth={0.5}
                />
                <Bar
                  dataKey="transport"
                  stackId="costs"
                  fill="#f59e0b"
                  name="Transport"
                  radius={[6, 6, 0, 0]}
                  stroke="#d97706"
                  strokeWidth={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#475569"
                  strokeWidth={3}
                  dot={{ fill: "#475569", r: 5, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: "#475569" }}
                  name="Revenus"
                />
              </>
            )}
            {chartView === "revenue_vs_costs" && (
              <>
                <Bar
                  dataKey="revenue"
                  fill="url(#revenueGradient)"
                  name="Revenus"
                  radius={[6, 6, 0, 0]}
                  stroke="#059669"
                  strokeWidth={0.5}
                />
                <Bar
                  dataKey="cost"
                  fill="url(#costGradient)"
                  name="Coûts variables"
                  radius={[6, 6, 0, 0]}
                  stroke="#dc2626"
                  strokeWidth={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="margin"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: "#f59e0b", r: 5, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: "#fff", fill: "#f59e0b" }}
                  name="Marge brute"
                />
              </>
            )}
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  )
}

