"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react"

interface BalanceSheetChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper functions to generate data
const getChartData = (
  period: "monthly" | "quarterly" | "annual", 
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years",
  chartView?: "assets_liabilities_equity" | "current_noncurrent" | "debt_equity_ratio"
) => {
  if (view === "12months") {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (11 - i), 1)
      const baseCurrentAssets = 850000 + (i * 10000)
      const baseNonCurrentAssets = 1200000 + (i * 15000)
      const baseTotalAssets = baseCurrentAssets + baseNonCurrentAssets
      const baseCurrentLiabilities = 450000 + (i * 5000)
      const baseNonCurrentLiabilities = 600000 + (i * 8000)
      const baseTotalLiabilities = baseCurrentLiabilities + baseNonCurrentLiabilities
      const baseEquity = baseTotalAssets - baseTotalLiabilities
      const debtToEquityRatio = (baseTotalLiabilities / baseEquity) * 100
      return {
        period: `${months[date.getMonth()]} ${date.getFullYear()}`,
        currentAssets: baseCurrentAssets,
        nonCurrentAssets: baseNonCurrentAssets,
        totalAssets: baseTotalAssets,
        currentLiabilities: baseCurrentLiabilities,
        nonCurrentLiabilities: baseNonCurrentLiabilities,
        totalLiabilities: baseTotalLiabilities,
        equity: baseEquity,
        debtToEquityRatio: debtToEquityRatio
      }
    })
  }
  if (view === "quarters") {
    const currentDate = new Date()
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (4 - i) * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      const baseCurrentAssets = (850000 + (i * 10000)) * 1.1
      const baseNonCurrentAssets = (1200000 + (i * 15000)) * 1.1
      const baseTotalAssets = baseCurrentAssets + baseNonCurrentAssets
      const baseCurrentLiabilities = (450000 + (i * 5000)) * 1.1
      const baseNonCurrentLiabilities = (600000 + (i * 8000)) * 1.1
      const baseTotalLiabilities = baseCurrentLiabilities + baseNonCurrentLiabilities
      const baseEquity = baseTotalAssets - baseTotalLiabilities
      const debtToEquityRatio = (baseTotalLiabilities / baseEquity) * 100
      return {
        period: `T${quarter} ${date.getFullYear()}`,
        currentAssets: baseCurrentAssets,
        nonCurrentAssets: baseNonCurrentAssets,
        totalAssets: baseTotalAssets,
        currentLiabilities: baseCurrentLiabilities,
        nonCurrentLiabilities: baseNonCurrentLiabilities,
        totalLiabilities: baseTotalLiabilities,
        equity: baseEquity,
        debtToEquityRatio: debtToEquityRatio
      }
    })
  }
  if (view === "years") {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => {
      const year = currentYear - (5 - i)
      const baseCurrentAssets = (850000 + (i * 10000)) * 1.2
      const baseNonCurrentAssets = (1200000 + (i * 15000)) * 1.2
      const baseTotalAssets = baseCurrentAssets + baseNonCurrentAssets
      const baseCurrentLiabilities = (450000 + (i * 5000)) * 1.2
      const baseNonCurrentLiabilities = (600000 + (i * 8000)) * 1.2
      const baseTotalLiabilities = baseCurrentLiabilities + baseNonCurrentLiabilities
      const baseEquity = baseTotalAssets - baseTotalLiabilities
      const debtToEquityRatio = (baseTotalLiabilities / baseEquity) * 100
      return {
        period: `${year}`,
        currentAssets: baseCurrentAssets,
        nonCurrentAssets: baseNonCurrentAssets,
        totalAssets: baseTotalAssets,
        currentLiabilities: baseCurrentLiabilities,
        nonCurrentLiabilities: baseNonCurrentLiabilities,
        totalLiabilities: baseTotalLiabilities,
        equity: baseEquity,
        debtToEquityRatio: debtToEquityRatio
      }
    })
  }
  // For comparison view, return current and prior period
  const currentCurrentAssets = period === "monthly" ? 900000 : period === "quarterly" ? 2700000 : 10800000
  const priorCurrentAssets = period === "monthly" ? 850000 : period === "quarterly" ? 2550000 : 10200000
  const currentNonCurrentAssets = period === "monthly" ? 1300000 : period === "quarterly" ? 3900000 : 15600000
  const priorNonCurrentAssets = period === "monthly" ? 1200000 : period === "quarterly" ? 3600000 : 14400000
  const currentTotalAssets = currentCurrentAssets + currentNonCurrentAssets
  const priorTotalAssets = priorCurrentAssets + priorNonCurrentAssets
  const currentCurrentLiabilities = period === "monthly" ? 480000 : period === "quarterly" ? 1440000 : 5760000
  const priorCurrentLiabilities = period === "monthly" ? 450000 : period === "quarterly" ? 1350000 : 5400000
  const currentNonCurrentLiabilities = period === "monthly" ? 650000 : period === "quarterly" ? 1950000 : 7800000
  const priorNonCurrentLiabilities = period === "monthly" ? 600000 : period === "quarterly" ? 1800000 : 7200000
  const currentTotalLiabilities = currentCurrentLiabilities + currentNonCurrentLiabilities
  const priorTotalLiabilities = priorCurrentLiabilities + priorNonCurrentLiabilities
  const currentEquity = currentTotalAssets - currentTotalLiabilities
  const priorEquity = priorTotalAssets - priorTotalLiabilities
  const currentDebtToEquityRatio = (currentTotalLiabilities / currentEquity) * 100
  const priorDebtToEquityRatio = (priorTotalLiabilities / priorEquity) * 100

  return [
    {
      period: period === "monthly" ? "Mois courant" : period === "quarterly" ? "Trimestre courant" : "Année courante",
      currentAssets: currentCurrentAssets,
      nonCurrentAssets: currentNonCurrentAssets,
      totalAssets: currentTotalAssets,
      currentLiabilities: currentCurrentLiabilities,
      nonCurrentLiabilities: currentNonCurrentLiabilities,
      totalLiabilities: currentTotalLiabilities,
      equity: currentEquity,
      debtToEquityRatio: currentDebtToEquityRatio
    },
    {
      period: period === "monthly" ? "Mois précédent" : period === "quarterly" ? "Trimestre précédent" : "Année précédente",
      currentAssets: priorCurrentAssets,
      nonCurrentAssets: priorNonCurrentAssets,
      totalAssets: priorTotalAssets,
      currentLiabilities: priorCurrentLiabilities,
      nonCurrentLiabilities: priorNonCurrentLiabilities,
      totalLiabilities: priorTotalLiabilities,
      equity: priorEquity,
      debtToEquityRatio: priorDebtToEquityRatio
    }
  ]
}

type ChartViewType = "assets_liabilities_equity" | "current_noncurrent" | "debt_equity_ratio"

export function BalanceSheetChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: BalanceSheetChartProps) {
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>("assets_liabilities_equity")
  
  const chartData = getChartData(period, view, selectedChartView)
  
  // Calculate averages
  const avgAssets = chartData.reduce((sum, d) => sum + (d.totalAssets || 0), 0) / chartData.length
  const avgLiabilities = chartData.reduce((sum, d) => sum + (d.totalLiabilities || 0), 0) / chartData.length
  const avgEquity = chartData.reduce((sum, d) => sum + (d.equity || 0), 0) / chartData.length

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

  // Helper function to get entity text
  const getEntityText = (): string => {
    if (subDivisionId && divisionId && companyId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      const selectedSubDivision = selectedDivision?.subDivisions.find((sd) => sd.id === subDivisionId)
      return `${selectedCompany?.name || "Société"} • ${selectedDivision?.name || "Division"} • ${selectedSubDivision?.name || "Sous-division"}`
    } else if (divisionId && companyId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      const selectedDivision = selectedCompany?.divisions.find((d) => d.id === divisionId)
      return `${selectedCompany?.name || "Société"} • ${selectedDivision?.name || "Division"}`
    } else if (companyId) {
      const selectedCompany = companies.find((c) => c.id === companyId)
      return selectedCompany?.name || "Société sélectionnée"
    } else {
      return "Toutes les sociétés"
    }
  }

  const getBaseTitle = (): string => {
    switch (selectedChartView) {
      case "assets_liabilities_equity":
        return "Structure du bilan"
      case "current_noncurrent":
        return "Structure de l'actif et du passif"
      case "debt_equity_ratio":
        return "Capitaux propres"
      default:
        return "Structure du bilan"
    }
  }

  const chartConfig = {
    totalAssets: {
      label: "Actifs totaux",
      color: "#3b82f6",
    },
    totalLiabilities: {
      label: "Passifs totaux",
      color: "#ef4444",
    },
    equity: {
      label: "Capitaux propres",
      color: "#10b981",
    },
    currentAssets: {
      label: "Actif à court terme",
      color: "#3b82f6",
    },
    nonCurrentAssets: {
      label: "Actif à long terme",
      color: "#60a5fa",
    },
    currentLiabilities: {
      label: "Passif à court terme",
      color: "#ef4444",
    },
    nonCurrentLiabilities: {
      label: "Passif à long terme",
      color: "#f87171",
    },
    debtToEquityRatio: {
      label: "Ratio d'endettement (%)",
      color: "#f59e0b",
    },
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg mb-6 overflow-hidden">
      {/* Header Section */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <Select value={selectedChartView} onValueChange={(value) => setSelectedChartView(value as ChartViewType)}>
                <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 mb-1 [&>svg:last-child]:hidden">
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{getBaseTitle()}</h3>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assets_liabilities_equity">Structure du bilan</SelectItem>
                  <SelectItem value="current_noncurrent">Structure de l'actif et du passif</SelectItem>
                  <SelectItem value="debt_equity_ratio">Capitaux propres</SelectItem>
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
                  <span className="truncate">{getEntityText()}</span>
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
            {/* Total Assets */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Actifs totaux</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(chartData.reduce((sum, d) => sum + (d.totalAssets || 0), 0))}
              </div>
              {(() => {
                const lastData = chartData[chartData.length - 1]
                const previousData = chartData.length > 1 ? chartData[chartData.length - 2] : null
                const currentValue = lastData.totalAssets || 0
                const previousValue = previousData?.totalAssets || 0
                const variation = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0
                const isPositive = variation >= 0
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{variation.toFixed(1)}%
                    </span>
                    <span className="text-slate-500">vs période précédente</span>
                  </div>
                )
              })()}
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Total Liabilities */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Passifs totaux</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(chartData.reduce((sum, d) => sum + (d.totalLiabilities || 0), 0))}
              </div>
              {(() => {
                const lastData = chartData[chartData.length - 1]
                const previousData = chartData.length > 1 ? chartData[chartData.length - 2] : null
                const currentValue = lastData.totalLiabilities || 0
                const previousValue = previousData?.totalLiabilities || 0
                const variation = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0
                const isPositive = variation >= 0
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{variation.toFixed(1)}%
                    </span>
                    <span className="text-slate-500">vs période précédente</span>
                  </div>
                )
              })()}
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Equity */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Capitaux propres</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(chartData.reduce((sum, d) => sum + (d.equity || 0), 0))}
              </div>
              {(() => {
                const lastData = chartData[chartData.length - 1]
                const previousData = chartData.length > 1 ? chartData[chartData.length - 2] : null
                const currentValue = lastData.equity || 0
                const previousValue = previousData?.equity || 0
                const variation = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0
                const isPositive = variation >= 0
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{variation.toFixed(1)}%
                    </span>
                    <span className="text-slate-500">vs période précédente</span>
                  </div>
                )
              })()}
            </div>
          </div>
          
          {/* Right Panel - Chart */}
          <div className="lg:col-span-4">
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ComposedChart data={chartData} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
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
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white border-2 border-slate-300 rounded-lg shadow-xl p-4 min-w-[280px]">
                      <div className="font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
                        {payload[0].payload.period}
                      </div>
                      {payload.map((entry, index) => {
                        const label = chartConfig[entry.dataKey as keyof typeof chartConfig]?.label || entry.name
                        return (
                          <div key={index} className="flex items-center justify-between gap-4 text-sm mb-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: entry.color }}
                              ></div>
                              <span className="text-slate-600">{label}:</span>
                            </div>
                            <span className="font-semibold text-slate-900 font-mono">
                              {formatCurrency(Number(entry.value))}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
                return null
              }}
            />
            <ChartLegend
              content={<ChartLegendContent />}
              className="-mt-2"
            />
            {selectedChartView === "assets_liabilities_equity" && (
              <>
                {/* Histogramme 1 : Actif (empilé) */}
                <Bar
                  yAxisId="left"
                  dataKey="currentAssets"
                  fill="#3b82f6"
                  name="Actif à court terme"
                  stackId="assets"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="nonCurrentAssets"
                  fill="#60a5fa"
                  name="Actif à long terme"
                  stackId="assets"
                  radius={[4, 4, 0, 0]}
                />
                {/* Histogramme 2 : Passif (empilé) */}
                <Bar
                  yAxisId="left"
                  dataKey="currentLiabilities"
                  fill="#ef4444"
                  name="Passif à court terme"
                  stackId="liabilities"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="nonCurrentLiabilities"
                  fill="#f87171"
                  name="Passif à long terme"
                  stackId="liabilities"
                  radius={[4, 4, 0, 0]}
                />
                {/* Histogramme 3 : Capitaux propres (seul) */}
                <Bar
                  yAxisId="left"
                  dataKey="equity"
                  fill="#10b981"
                  name="Capitaux propres"
                  radius={[4, 4, 0, 0]}
                />
              </>
            )}
            {selectedChartView === "current_noncurrent" && (
              <>
                <Bar
                  yAxisId="left"
                  dataKey="currentAssets"
                  fill="#3b82f6"
                  name="Actifs courants"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="nonCurrentAssets"
                  fill="#60a5fa"
                  name="Actifs non courants"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="currentLiabilities"
                  fill="#ef4444"
                  name="Passifs courants"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="nonCurrentLiabilities"
                  fill="#f87171"
                  name="Passifs non courants"
                  radius={[4, 4, 0, 0]}
                />
              </>
            )}
            {selectedChartView === "debt_equity_ratio" && (
              <>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#equityGradient)"
                  fillOpacity={0.6}
                  dot={{ fill: "#10b981", r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Capitaux propres"
                />
                <ReferenceLine
                  yAxisId="left"
                  y={avgEquity}
                  stroke="#10b981"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  strokeOpacity={0.6}
                  label={{ value: `Moyenne: ${formatCurrency(avgEquity)}`, position: "right", fill: "#10b981", fontSize: 11 }}
                />
              </>
            )}
          </ComposedChart>
        </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

