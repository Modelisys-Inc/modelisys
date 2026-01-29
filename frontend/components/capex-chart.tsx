"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, ChevronDown, TrendingUp, TrendingDown } from "lucide-react"

interface CapexChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  displayMode?: "cost" | "book_value" | "capex"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper functions to generate data (same logic as CapexDetail)
const getDetailData = (period: "monthly" | "quarterly" | "annual", view: "current" | "12months" | "24months" | "years") => {
  // Simplified data generation - same structure as CapexDetail
  if (view === "12months") {
    return {
      currentFixedAssets: 960000,
      priorFixedAssets: 900000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 12 }, (_, i) => ({
        fixedAssets: 900000 + (i * 5000),
        revenue: 242000 + (i * 2750)
      }))
    }
  }
  if (view === "24months") {
    return {
      currentFixedAssets: 960000,
      priorFixedAssets: 900000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 24 }, (_, i) => ({
        fixedAssets: 900000 + (i * 2500),
        revenue: 242000 + (i * 1375)
      }))
    }
  }
  if (view === "years") {
    return {
      currentFixedAssets: 11520000,
      priorFixedAssets: 10800000,
      currentRevenue: 3300000,
      priorRevenue: 2864000,
      trendValues: Array.from({ length: 6 }, (_, i) => ({
        fixedAssets: 10800000 + (i * 120000),
        revenue: 2864000 + (i * 72800)
      }))
    }
  }
  return {
    currentFixedAssets: period === "monthly" ? 960000 : period === "quarterly" ? 2880000 : 11520000,
    priorFixedAssets: period === "monthly" ? 900000 : period === "quarterly" ? 2700000 : 10800000,
    currentRevenue: period === "monthly" ? 275000 : period === "quarterly" ? 825000 : 3300000,
    priorRevenue: period === "monthly" ? 242000 : period === "quarterly" ? 716000 : 2864000,
    trendValues: undefined
  }
}

type RatioType = "depreciation" | "revenue" | "ebitda" | "cashflow"

export function CapexChart({
  period,
  view,
  displayMode = "cost",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: CapexChartProps) {
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>("total")
  const [selectedRatio, setSelectedRatio] = useState<RatioType>("depreciation")

  // Get fixed assets cost
  const getFixedAssetsCost = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.fixedAssets || 0
    } else {
      return isPrior ? data.priorFixedAssets : data.currentFixedAssets
    }
  }

  // Calculate accumulated depreciation (cumulative)
  const calculateAccumulatedDepreciation = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    const annualRate = 0.08
    
    // For trend data, calculate cumulative depreciation
    if (trendIndex !== undefined && data.trendValues) {
      let accumulated = 0
      for (let i = 0; i <= trendIndex; i++) {
        const assets = data.trendValues[i]?.fixedAssets || 0
        if (period === "monthly") {
          accumulated += assets * (annualRate / 12)
        } else if (period === "quarterly") {
          accumulated += assets * (annualRate / 4)
        } else {
          accumulated += assets * annualRate
        }
      }
      return accumulated
    }
    
    // For current/prior, estimate based on age (assume 3 years average)
    const assets = isPrior ? data.priorFixedAssets : data.currentFixedAssets
    const years = 3
    return assets * annualRate * years
  }

  // Calculate book value (cost - accumulated depreciation)
  const getBookValue = (isPrior: boolean, trendIndex?: number): number => {
    const cost = getFixedAssetsCost(isPrior, trendIndex)
    const accumulatedDepreciation = calculateAccumulatedDepreciation(isPrior, trendIndex)
    return cost - accumulatedDepreciation
  }

  // Calculate Capex (variation in fixed assets)
  const calculateCapex = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    
    if (trendIndex !== undefined && data.trendValues) {
      const current = data.trendValues[trendIndex]?.fixedAssets || 0
      const prior = trendIndex > 0 ? (data.trendValues[trendIndex - 1]?.fixedAssets || 0) : data.priorFixedAssets
      return current - prior
    } else {
      return data.currentFixedAssets - data.priorFixedAssets
    }
  }

  // Calculate Depreciation (typically 8% of fixed assets per year)
  const calculateDepreciation = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    
    let totalAssets = 0
    if (trendIndex !== undefined && data.trendValues) {
      totalAssets = data.trendValues[trendIndex]?.fixedAssets || 0
    } else {
      totalAssets = isPrior ? data.priorFixedAssets : data.currentFixedAssets
    }
    
    // Assume 8% annual depreciation rate, adjust for period
    const annualRate = 0.08
    if (period === "monthly") {
      return totalAssets * (annualRate / 12)
    } else if (period === "quarterly") {
      return totalAssets * (annualRate / 4)
    } else {
      return totalAssets * annualRate
    }
  }

  // Calculate Revenue
  const getRevenue = (isPrior: boolean, trendIndex?: number): number => {
    const data = getDetailData(period, view)
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.revenue || 0
    }
    return isPrior ? data.priorRevenue : data.currentRevenue
  }

  // Calculate EBITDA (20% of revenue)
  const calculateEBITDA = (isPrior: boolean, trendIndex?: number): number => {
    const revenue = getRevenue(isPrior, trendIndex)
    return revenue * 0.20
  }

  // Calculate Operating Cash Flow
  const calculateOperatingCashFlow = (isPrior: boolean, trendIndex?: number): number => {
    const ebitda = calculateEBITDA(isPrior, trendIndex)
    const depreciation = calculateDepreciation(isPrior, trendIndex)
    return ebitda - depreciation
  }

  // Get denominator based on selected ratio
  const getDenominator = (isPrior: boolean, trendIndex?: number): number => {
    switch (selectedRatio) {
      case "depreciation":
        return calculateDepreciation(isPrior, trendIndex)
      case "revenue":
        return getRevenue(isPrior, trendIndex)
      case "ebitda":
        return calculateEBITDA(isPrior, trendIndex)
      case "cashflow":
        return calculateOperatingCashFlow(isPrior, trendIndex)
      default:
        return calculateDepreciation(isPrior, trendIndex)
    }
  }

  // Get chart title based on display mode
  const getChartTitle = (): string => {
    if (displayMode === "cost") {
      return "Coût / Amortissement"
    } else if (displayMode === "book_value") {
      return "Valeur comptable"
    } else {
      // displayMode === "capex"
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
  }

  // Get ratio label (for capex mode only)
  const getRatioLabel = (): string => {
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

  // Get denominator label
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

  // Get value for specific asset category based on display mode
  const getValueForAsset = (accountId: string | "total", isPrior: boolean, trendIndex?: number): number => {
    if (displayMode === "cost") {
      const cost = getFixedAssetsCost(isPrior, trendIndex)
      if (accountId === "total") {
        return cost
      }
      const multipliers: Record<string, number> = {
        land_buildings: 0.47,
        equipment: 0.36,
        vehicles: 0.10,
        other_fixed: 0.06,
        fixed_assets: 0.67,
        patents: 0.50,
        software: 0.33,
        goodwill: 0.17,
        intangible_assets: 0.33,
      }
      return cost * (multipliers[accountId] || 1)
    } else if (displayMode === "book_value") {
      const bookValue = getBookValue(isPrior, trendIndex)
      if (accountId === "total") {
        return bookValue
      }
      const multipliers: Record<string, number> = {
        land_buildings: 0.47,
        equipment: 0.36,
        vehicles: 0.10,
        other_fixed: 0.06,
        fixed_assets: 0.67,
        patents: 0.50,
        software: 0.33,
        goodwill: 0.17,
        intangible_assets: 0.33,
      }
      return bookValue * (multipliers[accountId] || 1)
    } else {
      // displayMode === "capex"
      if (accountId === "total") {
        return calculateCapex(isPrior, trendIndex)
      }
      const total = calculateCapex(isPrior, trendIndex)
      const multipliers: Record<string, number> = {
        land_buildings: 0.47,
        equipment: 0.36,
        vehicles: 0.10,
        other_fixed: 0.06,
        fixed_assets: 0.67,
        patents: 0.50,
        software: 0.33,
        goodwill: 0.17,
        intangible_assets: 0.33,
      }
      return total * (multipliers[accountId] || 1)
    }
  }

  // Calculate Capex for specific asset category (for capex mode)
  const calculateCapexForAsset = (accountId: string | "total", isPrior: boolean, trendIndex?: number): number => {
    if (accountId === "total") {
      return calculateCapex(isPrior, trendIndex)
    }
    // For specific assets, use a fraction of total
    const total = calculateCapex(isPrior, trendIndex)
    const multipliers: Record<string, number> = {
      land_buildings: 0.47,
      equipment: 0.36,
      vehicles: 0.10,
      other_fixed: 0.06,
      fixed_assets: 0.67,
      patents: 0.50,
      software: 0.33,
      goodwill: 0.17,
      intangible_assets: 0.33,
    }
    return total * (multipliers[accountId] || 1)
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
    capex: number
    denominator: number
    ratio: number
  }> = []

  if (view === "12months") {
    const monthLabels = getMonthLabels(12)
    monthLabels.forEach((_, idx) => {
      const value = getValueForAsset(selectedAssetCategory, false, idx)
      const depreciation = displayMode === "cost" ? calculateDepreciation(false, idx) : displayMode === "capex" ? calculateDepreciation(false, idx) : 0
      const denominator = displayMode === "capex" ? getDenominator(false, idx) : displayMode === "cost" ? depreciation : 0
      const ratio = displayMode === "book_value" ? 0 : (denominator !== 0 ? (value / denominator) * 100 : 0)
      chartDataPoints.push({
        period: monthLabels[idx],
        capex: value,
        denominator: denominator,
        ratio: ratio,
      })
    })
  } else if (view === "24months") {
    const monthLabels = getMonthLabels(24)
    monthLabels.forEach((_, idx) => {
      const value = getValueForAsset(selectedAssetCategory, false, idx)
      const depreciation = displayMode === "cost" ? calculateDepreciation(false, idx) : displayMode === "capex" ? calculateDepreciation(false, idx) : 0
      const denominator = displayMode === "capex" ? getDenominator(false, idx) : displayMode === "cost" ? depreciation : 0
      const ratio = displayMode === "book_value" ? 0 : (denominator !== 0 ? (value / denominator) * 100 : 0)
      chartDataPoints.push({
        period: monthLabels[idx],
        capex: value,
        denominator: denominator,
        ratio: ratio,
      })
    })
  } else if (view === "years") {
    const yearLabels = getYearLabels()
    yearLabels.forEach((_, idx) => {
      const value = getValueForAsset(selectedAssetCategory, false, idx)
      const depreciation = displayMode === "cost" ? calculateDepreciation(false, idx) : displayMode === "capex" ? calculateDepreciation(false, idx) : 0
      const denominator = displayMode === "capex" ? getDenominator(false, idx) : displayMode === "cost" ? depreciation : 0
      const ratio = displayMode === "book_value" ? 0 : (denominator !== 0 ? (value / denominator) * 100 : 0)
      chartDataPoints.push({
        period: yearLabels[idx],
        capex: value,
        denominator: denominator,
        ratio: ratio,
      })
    })
  } else if (view === "current") {
    const valueCurrent = getValueForAsset(selectedAssetCategory, false)
    const depreciationCurrent = displayMode === "cost" ? calculateDepreciation(false) : displayMode === "capex" ? calculateDepreciation(false) : 0
    const denominatorCurrent = displayMode === "capex" ? getDenominator(false) : displayMode === "cost" ? depreciationCurrent : 0
    const ratioCurrent = displayMode === "book_value" ? 0 : (denominatorCurrent !== 0 ? (valueCurrent / denominatorCurrent) * 100 : 0)
    
    const valuePrior = getValueForAsset(selectedAssetCategory, true)
    const depreciationPrior = displayMode === "cost" ? calculateDepreciation(true) : displayMode === "capex" ? calculateDepreciation(true) : 0
    const denominatorPrior = displayMode === "capex" ? getDenominator(true) : displayMode === "cost" ? depreciationPrior : 0
    const ratioPrior = displayMode === "book_value" ? 0 : (denominatorPrior !== 0 ? (valuePrior / denominatorPrior) * 100 : 0)
    
    chartDataPoints = [
      {
        period: "Passé",
        capex: valuePrior,
        denominator: denominatorPrior,
        ratio: ratioPrior,
      },
      {
        period: "Courant",
        capex: valueCurrent,
        denominator: denominatorCurrent,
        ratio: ratioCurrent,
      },
    ]
  }

  if (chartDataPoints.length === 0) return null

  // Calculate averages
  const avgCapex = chartDataPoints.reduce((sum, d) => sum + d.capex, 0) / chartDataPoints.length
  const avgDenominator = chartDataPoints.reduce((sum, d) => sum + d.denominator, 0) / chartDataPoints.length
  const avgRatio = chartDataPoints.reduce((sum, d) => sum + d.ratio, 0) / chartDataPoints.length

  // Calculate total denominator for current period
  const totalDenominator = chartDataPoints.length > 0 
    ? chartDataPoints[chartDataPoints.length - 1].denominator 
    : avgDenominator
  
  // Calculate variation for denominator
  const denominatorVariation = chartDataPoints.length > 1
    ? ((chartDataPoints[chartDataPoints.length - 1].denominator - chartDataPoints[chartDataPoints.length - 2].denominator) / chartDataPoints[chartDataPoints.length - 2].denominator) * 100
    : 0

  // Calculate variation for main value
  const mainValueVariation = chartDataPoints.length > 1
    ? ((chartDataPoints[chartDataPoints.length - 1].capex - chartDataPoints[chartDataPoints.length - 2].capex) / chartDataPoints[chartDataPoints.length - 2].capex) * 100
    : 0

  // Get labels based on display mode
  const getMainValueLabel = (): string => {
    if (displayMode === "cost") {
      return "Coût total"
    } else if (displayMode === "book_value") {
      return "Valeur comptable"
    } else {
      return "Capex moyen"
    }
  }

  const getMainValueUnitLabel = (): string => {
    if (displayMode === "cost") {
      return "Coût"
    } else if (displayMode === "book_value") {
      return "Valeur comptable"
    } else {
      return "Capex"
    }
  }

  const denominatorLabel = displayMode === "cost" ? "Amortissement" : displayMode === "book_value" ? "" : getDenominatorLabel()
  const ratioLabel = getChartTitle()

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "current" && period === "monthly") return "Courant"
    if (view === "current" && period === "quarterly") return "Trimestriel"
    if (view === "current" && period === "annual") return "Annuel"
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "5 ans"
    return "Courant"
  }

  const chartConfig = {
    capex: {
      label: displayMode === "cost" ? "Coût" : displayMode === "book_value" ? "Valeur comptable" : "Capex",
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

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg mb-6 overflow-hidden relative z-10">
      {/* Header Section */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                {displayMode === "capex" ? (
              <Select value={selectedRatio} onValueChange={(value) => setSelectedRatio(value as RatioType)}>
                    <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 [&>svg:last-child]:hidden">
                      <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{getChartTitle()}</h3>
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="depreciation">Capex / Amortissement</SelectItem>
                  <SelectItem value="revenue">Capex / Revenus</SelectItem>
                  <SelectItem value="ebitda">Capex / BAIIA</SelectItem>
                  <SelectItem value="cashflow">Capex / Flux de trésorerie</SelectItem>
                </SelectContent>
              </Select>
                ) : (
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{getChartTitle()}</h3>
                )}
              <Select value={selectedAssetCategory} onValueChange={setSelectedAssetCategory}>
                  <SelectTrigger className="h-7 px-2 text-xs bg-white border-slate-300 shadow-sm hover:shadow-md transition-shadow">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="land_buildings">Terrains et constructions</SelectItem>
                  <SelectItem value="equipment">Matériel et équipement</SelectItem>
                  <SelectItem value="vehicles">Véhicules</SelectItem>
                  <SelectItem value="other_fixed">Autres immobilisations corporelles</SelectItem>
                  <SelectItem value="fixed_assets">Total Immobilisations corporelles</SelectItem>
                  <SelectItem value="patents">Brevets et licences</SelectItem>
                  <SelectItem value="software">Logiciels et développement</SelectItem>
                  <SelectItem value="goodwill">Fonds commercial</SelectItem>
                  <SelectItem value="intangible_assets">Total Immobilisations incorporelles</SelectItem>
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

      {/* Chart Section - Two Column Layout */}
      <div className="px-8 py-6 bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Key Metrics */}
          <div className="lg:col-span-1">
            {/* Main Value (Cost, Book Value, or Denominator) */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">
                {displayMode === "book_value" ? getMainValueLabel() : displayMode === "cost" ? getMainValueLabel() : `${denominatorLabel} total`}
              </div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(displayMode === "book_value" || displayMode === "cost" ? chartDataPoints.length > 0 ? chartDataPoints[chartDataPoints.length - 1].capex : avgCapex : totalDenominator)}
              </div>
              {chartDataPoints.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs">
                  {((displayMode === "book_value" || displayMode === "cost") ? mainValueVariation : denominatorVariation) >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={`font-medium ${((displayMode === "book_value" || displayMode === "cost") ? mainValueVariation : denominatorVariation) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {((displayMode === "book_value" || displayMode === "cost") ? mainValueVariation : denominatorVariation) >= 0 ? '+' : ''}{((displayMode === "book_value" || displayMode === "cost") ? mainValueVariation : denominatorVariation).toFixed(1)}%
                  </span>
                  <span className="text-slate-500">vs période précédente</span>
                </div>
              )}
            </div>
            
            {/* Separator */}
            {displayMode !== "book_value" && <div className="border-b border-slate-200 my-3"></div>}
            
            {/* Second Metric */}
            {displayMode === "cost" && (
              <>
                <div className="pb-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Amortissement moyen</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {formatCurrency(avgDenominator)}
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">
                      {avgRatio.toFixed(0)}% du coût
                    </span>
                  </div>
                </div>
                <div className="border-b border-slate-200 my-3"></div>
              </>
            )}
            
            {displayMode === "capex" && (
              <>
                <div className="pb-3">
                  <div className="text-xs font-medium text-slate-500 mb-1">Capex moyen</div>
                  <div className="text-xl font-semibold text-slate-900 mb-1.5">
                    {formatCurrency(avgCapex)}
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-500">
                      {avgRatio.toFixed(0)}% des {denominatorLabel.toLowerCase()}
                    </span>
                  </div>
                </div>
                <div className="border-b border-slate-200 my-3"></div>
              </>
            )}
            
            {/* Ratio Average (only for cost and capex modes) */}
            {displayMode !== "book_value" && (
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
            )}
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
            {displayMode !== "book_value" && (
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
                          <span className="text-xs font-medium text-slate-600">{getMainValueUnitLabel()}</span>
                        </div>
                        <span className="font-mono font-bold text-sm text-emerald-600">{formatCurrency(data.capex)}</span>
                      </div>
                      {displayMode !== "book_value" && (
                        <div className="flex items-center justify-between gap-6">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                            <span className="text-xs font-medium text-slate-600">{denominatorLabel}</span>
                          </div>
                          <span className="font-mono font-bold text-sm text-blue-600">{formatCurrency(data.denominator)}</span>
                        </div>
                      )}
                      {displayMode !== "book_value" && (
                        <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 bg-amber-500"></div>
                            <span className="text-xs font-medium text-slate-600">{ratioLabel}</span>
                          </div>
                          <span className="font-mono font-bold text-sm text-amber-600">{data.ratio.toFixed(1)}%</span>
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
                      {/* Main Value */}
                      <div className="flex items-center gap-2.5 min-w-fit">
                        <div className="w-4 h-4 rounded-md shadow-sm bg-emerald-500 flex-shrink-0"></div>
                        <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{getMainValueUnitLabel()}</span>
                      </div>
                      
                      {/* Denominator (only for cost and capex modes) */}
                      {displayMode !== "book_value" && (
                        <div className="flex items-center gap-2.5 min-w-fit">
                          <div className="w-4 h-4 rounded-md shadow-sm bg-blue-500 flex-shrink-0"></div>
                          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{denominatorLabel}</span>
                        </div>
                      )}
                      
                      {/* Ratio (only for cost and capex modes) */}
                      {displayMode !== "book_value" && (
                        <div className="flex items-center gap-2.5 min-w-fit">
                          <div className="w-8 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{ratioLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }}
              wrapperStyle={{ paddingTop: "25px", width: "100%", paddingLeft: "0", paddingRight: "0" }}
            />
            {/* Capex bar with gradient */}
            <defs>
              <linearGradient id="capexGradient" x1="0" y1="0" x2="0" y2="1">
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
              dataKey="capex"
              fill="url(#capexGradient)"
              name="Capex"
              radius={[6, 6, 0, 0]}
              stroke="#059669"
              strokeWidth={0.5}
            />
            {displayMode !== "book_value" && (
            <Bar
              yAxisId="left"
              dataKey="denominator"
              fill="url(#denominatorGradient)"
              name={denominatorLabel}
              radius={[6, 6, 0, 0]}
              stroke="#2563eb"
              strokeWidth={0.5}
            />
            )}
            {/* Ratio line with enhanced styling (only for cost and capex modes) */}
            {displayMode !== "book_value" && (
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
            )}
          </ComposedChart>
        </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

