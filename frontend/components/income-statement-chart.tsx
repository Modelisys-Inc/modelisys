"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react"

interface IncomeStatementChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  comparisonType?: "lastMonth" | "pastMonth" | "budget"
  selectedBudgetId?: string | null
  selectedBudgetName?: string | null
}

// Helper functions to generate data
const getChartData = (
  period: "monthly" | "quarterly" | "annual", 
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years",
  chartView?: "revenue_ebita_margin" | "cogs_grossprofit_margin",
  comparisonType?: "lastMonth" | "pastMonth" | "budget",
  selectedBudgetId?: string | null
) => {
  if (view === "12months") {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (11 - i), 1)
      // Use same base formula as quarters but for monthly values (divide by 3)
      // For quarters: baseRevenue = (242000 + (i * 2750)) * 3
      // For months: baseRevenue = 242000 + (i * 2750)
      const baseRevenue = 242000 + (i * 2750)
      const baseCOGS = 110000 + (i * 1250)
      const baseGrossProfit = baseRevenue - baseCOGS
      const baseAdmin = 52700 + (i * 500)
      const baseSales = 32300 + (i * 300)
      const baseOther = -3500
      const baseTotalExpenses = baseAdmin + baseSales + baseOther
      const baseEBITA = baseGrossProfit - baseTotalExpenses
      const grossMarginPercent = (baseGrossProfit / baseRevenue) * 100
      const revenueBudget = baseRevenue * 1.1
      
      return {
        period: months[date.getMonth()],
        revenue: baseRevenue,
        cogs: baseCOGS,
        grossProfit: baseGrossProfit,
        ebita: baseEBITA,
        grossMarginPercent: grossMarginPercent,
        revenueBudget: revenueBudget
      }
    })
  }
  if (view === "quarters") {
    const currentDate = new Date()
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - (4 - i) * 3, 1)
      const quarter = Math.floor(date.getMonth() / 3) + 1
      const baseRevenue = (242000 + (i * 2750)) * 3
      const baseCOGS = (110000 + (i * 1250)) * 3
      const baseGrossProfit = baseRevenue - baseCOGS
      const baseAdmin = (52700 + (i * 500)) * 3
      const baseSales = (32300 + (i * 300)) * 3
      const baseOther = -3500 * 3
      const baseTotalExpenses = baseAdmin + baseSales + baseOther
      const baseEBITA = baseGrossProfit - baseTotalExpenses
      const grossMarginPercent = (baseGrossProfit / baseRevenue) * 100
      const revenueBudget = baseRevenue * 1.1
      return {
        period: `T${quarter} ${date.getFullYear()}`,
        revenue: baseRevenue,
        cogs: baseCOGS,
        grossProfit: baseGrossProfit,
        ebita: baseEBITA,
        grossMarginPercent: grossMarginPercent,
        revenueBudget: revenueBudget
      }
    })
  }
  if (view === "years") {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => {
      const year = currentYear - (5 - i)
      const baseRevenue = (242000 + (i * 2750)) * 12
      const baseCOGS = (110000 + (i * 1250)) * 12
      const baseGrossProfit = baseRevenue - baseCOGS
      const baseAdmin = (52700 + (i * 500)) * 12
      const baseSales = (32300 + (i * 300)) * 12
      const baseOther = -3500 * 12
      const baseTotalExpenses = baseAdmin + baseSales + baseOther
      const baseEBITA = baseGrossProfit - baseTotalExpenses
      const grossMarginPercent = (baseGrossProfit / baseRevenue) * 100
      const revenueBudget = baseRevenue * 1.1
      return {
        period: `${year}`,
        revenue: baseRevenue,
        cogs: baseCOGS,
        grossProfit: baseGrossProfit,
        ebita: baseEBITA,
        grossMarginPercent: grossMarginPercent,
        revenueBudget: revenueBudget
      }
    })
  }
  // Helper function to get comparison prior value based on comparisonType
  const getComparisonPriorValue = (basePrior: number): number => {
    if (comparisonType === "lastMonth") {
      return basePrior
    } else if (comparisonType === "pastMonth") {
      return Math.round(basePrior * 0.92)
    } else if (comparisonType === "budget" && selectedBudgetId) {
      // For budget, use a higher value (typically budgets are optimistic)
      return Math.round(basePrior * 1.15)
    }
    return basePrior
  }

  // For comparison, YTD, and DDM views, return current and prior period
  if (view === "ytd" || view === "ddm" || view === "comparison") {
    // Base values for current period
    let currentRevenue: number
    let currentCOGS: number
    let currentAdmin: number
    let currentSales: number
    let currentOther: number

    if (view === "ytd") {
      currentRevenue = 1650000 // Cumulative YTD
      currentCOGS = 750000
      currentAdmin = 351000
      currentSales = 216000
      currentOther = -21000
    } else if (view === "ddm") {
      currentRevenue = 275000 // Same day last month
      currentCOGS = 125000
      currentAdmin = 58500
      currentSales = 36000
      currentOther = -3500
    } else {
      // comparison view
      currentRevenue = period === "monthly" ? 275000 : period === "quarterly" ? 825000 : 3300000
      currentCOGS = period === "monthly" ? 125000 : period === "quarterly" ? 375000 : 1500000
      currentAdmin = period === "monthly" ? 58500 : period === "quarterly" ? 175500 : 702000
      currentSales = period === "monthly" ? 36000 : period === "quarterly" ? 108000 : 432000
      currentOther = period === "monthly" ? -3500 : period === "quarterly" ? -10500 : -42000
    }

    // Base prior values
    let basePriorRevenue: number
    let basePriorCOGS: number
    let basePriorAdmin: number
    let basePriorSales: number
    let basePriorOther: number

    if (view === "ytd") {
      basePriorRevenue = 1452000
      basePriorCOGS = 660000
      basePriorAdmin = 316200
      basePriorSales = 193800
      basePriorOther = -21000
    } else if (view === "ddm") {
      basePriorRevenue = 242000
      basePriorCOGS = 110000
      basePriorAdmin = 52700
      basePriorSales = 32300
      basePriorOther = -3500
    } else {
      // comparison view
      basePriorRevenue = period === "monthly" ? 242000 : period === "quarterly" ? 726000 : 2904000
      basePriorCOGS = period === "monthly" ? 110000 : period === "quarterly" ? 330000 : 1320000
      basePriorAdmin = period === "monthly" ? 52700 : period === "quarterly" ? 158100 : 632400
      basePriorSales = period === "monthly" ? 32300 : period === "quarterly" ? 96900 : 387600
      basePriorOther = period === "monthly" ? -3500 : period === "quarterly" ? -10500 : -42000
    }

    // Apply comparison type adjustment to prior values
    const priorRevenue = getComparisonPriorValue(basePriorRevenue)
    const priorCOGS = getComparisonPriorValue(basePriorCOGS)
    const priorGrossProfit = priorRevenue - priorCOGS
    const priorAdmin = getComparisonPriorValue(basePriorAdmin)
    const priorSales = getComparisonPriorValue(basePriorSales)
    const priorOther = basePriorOther // Usually same
    const priorTotalExpenses = priorAdmin + priorSales + priorOther
    const priorEBITA = priorGrossProfit - priorTotalExpenses
    const priorGrossMarginPercent = (priorGrossProfit / priorRevenue) * 100
    const priorRevenueBudget = priorRevenue * 1.1

    const currentGrossProfit = currentRevenue - currentCOGS
    const currentTotalExpenses = currentAdmin + currentSales + currentOther
    const currentEBITA = currentGrossProfit - currentTotalExpenses
    const currentGrossMarginPercent = (currentGrossProfit / currentRevenue) * 100
    const currentRevenueBudget = currentRevenue * 1.1

    // Determine period label for prior
    let priorPeriodLabel: string
    if (view === "ytd") {
      if (comparisonType === "lastMonth") priorPeriodLabel = "YTD précédent"
      else if (comparisonType === "pastMonth") priorPeriodLabel = "YTD passé"
      else if (comparisonType === "budget") priorPeriodLabel = "YTD budgeté"
      else priorPeriodLabel = "YTD précédent"
    } else if (view === "ddm") {
      if (comparisonType === "lastMonth") priorPeriodLabel = "DDM précédent"
      else if (comparisonType === "pastMonth") priorPeriodLabel = "DDM passé"
      else if (comparisonType === "budget") priorPeriodLabel = "DDM budgeté"
      else priorPeriodLabel = "DDM précédent"
    } else {
      // comparison view
      if (period === "monthly") {
        if (comparisonType === "lastMonth") priorPeriodLabel = "Mois précédent"
        else if (comparisonType === "pastMonth") priorPeriodLabel = "Mois passé"
        else if (comparisonType === "budget") priorPeriodLabel = "Mois budgeté"
        else priorPeriodLabel = "Mois précédent"
      } else if (period === "quarterly") {
        if (comparisonType === "lastMonth") priorPeriodLabel = "Trimestre précédent"
        else if (comparisonType === "pastMonth") priorPeriodLabel = "Trimestre passé"
        else if (comparisonType === "budget") priorPeriodLabel = "Trimestre budgeté"
        else priorPeriodLabel = "Trimestre précédent"
      } else {
        if (comparisonType === "lastMonth") priorPeriodLabel = "Année précédente"
        else if (comparisonType === "pastMonth") priorPeriodLabel = "Année passée"
        else if (comparisonType === "budget") priorPeriodLabel = "Année budgetée"
        else priorPeriodLabel = "Année précédente"
      }
    }

    let currentPeriodLabel: string
    if (view === "ytd") {
      currentPeriodLabel = "YTD courant"
    } else if (view === "ddm") {
      currentPeriodLabel = "DDM courant"
    } else {
      currentPeriodLabel = period === "monthly" ? "Mois courant" : period === "quarterly" ? "Trimestre courant" : "Année courante"
    }

    return [
      {
        period: currentPeriodLabel,
        revenue: currentRevenue,
        cogs: currentCOGS,
        grossProfit: currentGrossProfit,
        ebita: currentEBITA,
        grossMarginPercent: currentGrossMarginPercent,
        revenueBudget: currentRevenueBudget
      },
      {
        period: priorPeriodLabel,
        revenue: priorRevenue,
        cogs: priorCOGS,
        grossProfit: priorGrossProfit,
        ebita: priorEBITA,
        grossMarginPercent: priorGrossMarginPercent,
        revenueBudget: priorRevenueBudget
      }
    ]
  }

  // This should never be reached, but keeping for type safety
  return []
}

type ChartViewType = "revenue_ebita_margin" | "cogs_grossprofit_margin"

export function IncomeStatementChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  comparisonType = "lastMonth",
  selectedBudgetId = null,
  selectedBudgetName = null,
}: IncomeStatementChartProps) {
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>("revenue_ebita_margin")
  const [showRevenue, setShowRevenue] = useState(true)
  const [showEBITA, setShowEBITA] = useState(true)
  const [showGrossMargin, setShowGrossMargin] = useState(true)
  
  const chartData = getChartData(period, view, selectedChartView, comparisonType, selectedBudgetId)

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

  const getComparisonLabel = (): string => {
    if (comparisonType === "lastMonth") {
      if (view === "ytd") return "YTD précédent"
      if (view === "ddm") return "DDM précédent"
      if (period === "monthly") return "Mois précédent"
      if (period === "quarterly") return "Trimestre précédent"
      return "Année précédente"
    }
    if (comparisonType === "pastMonth") {
      if (view === "ytd") return "YTD passé"
      if (view === "ddm") return "DDM passé"
      if (period === "monthly") return "Mois passé"
      if (period === "quarterly") return "Trimestre passé"
      return "Année passée"
    }
    if (comparisonType === "budget") {
      if (selectedBudgetName) {
        if (view === "ytd") return `Budget ${selectedBudgetName} (YTD)`
        if (view === "ddm") return `Budget ${selectedBudgetName} (DDM)`
        if (period === "monthly") return `Budget ${selectedBudgetName}`
        if (period === "quarterly") return `Budget ${selectedBudgetName} (Trimestre)`
        return `Budget ${selectedBudgetName} (Année)`
      }
      if (view === "ytd") return "YTD budgeté"
      if (view === "ddm") return "DDM budgeté"
      if (period === "monthly") return "Mois budgeté"
      if (period === "quarterly") return "Trimestre budgeté"
      return "Année budgetée"
    }
    return "Mois précédent"
  }

  const getBaseTitle = (): string => {
    if (view === "comparison") {
      const comparisonLabel = getComparisonLabel()
      switch (selectedChartView) {
        case "revenue_ebita_margin":
          return `Revenus, BAIIA et Marge brute - Mois courant vs ${comparisonLabel}`
        case "cogs_grossprofit_margin":
          return `CMV, Bénéfice Brut et Marge brute - Mois courant vs ${comparisonLabel}`
        default:
          return `Revenus, BAIIA et Marge brute - Mois courant vs ${comparisonLabel}`
      }
    }
    switch (selectedChartView) {
      case "revenue_ebita_margin":
        return "Revenus, BAIIA et Marge brute"
      case "cogs_grossprofit_margin":
        return "CMV, Bénéfice Brut et Marge brute"
      default:
        return "Revenus, BAIIA et Marge brute"
    }
  }

  const chartConfig = {
    revenue: {
      label: "Revenus",
      color: "#3b82f6",
    },
    cogs: {
      label: "CMV",
      color: "#ef4444",
    },
    grossProfit: {
      label: "Bénéfice Brut",
      color: "#10b981",
    },
    ebita: {
      label: "BAIIA",
      color: "#10b981",
    },
    grossMarginPercent: {
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
              <Select value={selectedChartView} onValueChange={(value) => setSelectedChartView(value as ChartViewType)}>
                <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 mb-1 [&>svg:last-child]:hidden">
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{getBaseTitle()}</h3>
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue_ebita_margin">Revenus, BAIIA et Marge brute</SelectItem>
                  <SelectItem value="cogs_grossprofit_margin">CMV, Bénéfice Brut et Marge brute</SelectItem>
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
          {/* Legend Toggles - Only show for revenue_ebita_margin view */}
          {selectedChartView === "revenue_ebita_margin" && (
            <div className="flex items-center gap-4 ml-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggle-revenue"
                  checked={showRevenue}
                  onChange={(e) => setShowRevenue(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="toggle-revenue" className="text-sm text-slate-700 cursor-pointer">
                  Revenus
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggle-ebita"
                  checked={showEBITA}
                  onChange={(e) => setShowEBITA(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="toggle-ebita" className="text-sm text-slate-700 cursor-pointer">
                  BAIIA
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="toggle-margin"
                  checked={showGrossMargin}
                  onChange={(e) => setShowGrossMargin(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 focus:ring-2 cursor-pointer"
                />
                <label htmlFor="toggle-margin" className="text-sm text-slate-700 cursor-pointer">
                  Marge brute (%)
                </label>
              </div>
            </div>
          )}
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
                {formatCurrency(chartData.reduce((sum, d) => sum + (d.revenue || 0), 0))}
              </div>
              {(() => {
                const lastData = chartData[chartData.length - 1]
                const hasPrevious = 'revenuePrevious' in lastData && (lastData as any).revenuePrevious
                const variation = hasPrevious 
                  ? lastData.revenue - (lastData as any).revenuePrevious
                  : chartData.length > 1 
                    ? lastData.revenue - chartData[chartData.length - 2].revenue
                    : 0
                const variationPercent = hasPrevious && (lastData as any).revenuePrevious > 0
                  ? ((lastData.revenue - (lastData as any).revenuePrevious) / (lastData as any).revenuePrevious * 100)
                  : chartData.length > 1 && chartData[chartData.length - 2].revenue > 0
                  ? ((lastData.revenue - chartData[chartData.length - 2].revenue) / chartData[chartData.length - 2].revenue * 100)
                  : 0
                const isPositive = variation >= 0
                return (
                  <div className="flex items-center gap-1.5 text-xs">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{variationPercent.toFixed(1)}%
                    </span>
                    <span className="text-slate-500">vs période précédente</span>
                  </div>
                )
              })()}
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* BAIIA */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">BAIIA moyen</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(chartData.reduce((sum, d) => sum + (d.ebita || 0), 0) / chartData.length)}
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  {((chartData.reduce((sum, d) => sum + (d.ebita || 0), 0) / chartData.length) / 
                    (chartData.reduce((sum, d) => sum + (d.revenue || 0), 0) / chartData.length) * 100).toFixed(0)}% des revenus
                </span>
              </div>
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Gross Margin */}
            <div>
              <div className="text-xs font-medium text-slate-500 mb-1">Marge brute</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(
                  (chartData.reduce((sum, d) => sum + (d.grossProfit || 0), 0) / chartData.length)
                )}
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  {(chartData.reduce((sum, d) => sum + (d.grossMarginPercent || 0), 0) / chartData.length).toFixed(0)}% des revenus
                </span>
              </div>
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
            {(selectedChartView === "revenue_ebita_margin" || selectedChartView === "cogs_grossprofit_margin") && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={{ stroke: "#cbd5e1" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
            )}
            <ChartTooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                      <p className="text-sm font-semibold text-slate-900 mb-2">{payload[0].payload.period}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                          <span className="text-sm text-slate-600">{entry.name}:</span>
                          <span className="text-sm font-bold text-slate-900">
                            {entry.dataKey === "grossMarginPercent" 
                              ? `${(entry.value as number).toFixed(1)}%`
                              : entry.dataKey === "cogs" || entry.dataKey === "grossProfit"
                              ? formatCurrency(entry.value as number)
                              : formatCurrency(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <ChartLegend
              content={({ payload }) => {
                // Default legend for all views
                return (
                  <div className="flex justify-center gap-6 mt-4">
                    {payload?.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-sm text-slate-600">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                )
              }}
            />
            {/* Conditional rendering based on selected chart view */}
            {selectedChartView === "revenue_ebita_margin" && (
              <>
                {/* Revenus - Bar */}
                {showRevenue && (
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill={chartConfig.revenue.color}
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                    name={chartConfig.revenue.label}
                  />
                )}
                {/* BAIIA - Bar */}
                {showEBITA && (
                  <Bar
                    yAxisId="left"
                    dataKey="ebita"
                    fill={chartConfig.ebita.color}
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                    name={chartConfig.ebita.label}
                  />
                )}
                {/* Marge brute % - Line */}
                {showGrossMargin && (
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="grossMarginPercent"
                    stroke={chartConfig.grossMarginPercent.color}
                    strokeWidth={3}
                    dot={{ fill: chartConfig.grossMarginPercent.color, r: 5 }}
                    activeDot={{ r: 7 }}
                    name={chartConfig.grossMarginPercent.label}
                  />
                )}
              </>
            )}
            {selectedChartView === "cogs_grossprofit_margin" && (
              <>
                {/* CMV - Stacked Bar (bottom) */}
                <Bar
                  yAxisId="left"
                  dataKey="cogs"
                  fill={chartConfig.cogs.color}
                  radius={[0, 0, 0, 0]}
                  opacity={0.8}
                  name={chartConfig.cogs.label}
                  stackId="revenue"
                />
                {/* Bénéfice Brut - Stacked Bar (top) */}
                <Bar
                  yAxisId="left"
                  dataKey="grossProfit"
                  fill={chartConfig.grossProfit.color}
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                  name={chartConfig.grossProfit.label}
                  stackId="revenue"
                />
                {/* Marge brute % - Line */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="grossMarginPercent"
                  stroke={chartConfig.grossMarginPercent.color}
                  strokeWidth={3}
                  dot={{ fill: chartConfig.grossMarginPercent.color, r: 5 }}
                  activeDot={{ r: 7 }}
                  name={chartConfig.grossMarginPercent.label}
                />
              </>
            )}
            <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          </ComposedChart>
        </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

