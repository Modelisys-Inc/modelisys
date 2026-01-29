"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"

type ProductType = "total" | "product_a" | "product_b" | "service_c"

interface SeasonalitySummaryProps {
  period: "monthly" | "quarterly" | "annual"
  view: "12months" | "24months" | "years"
  columnMode?: "variations" | "percentage"
  analysisType?: "revenue" | "expenses"
  selectedProduct?: ProductType
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

interface SummaryRow {
  label: string
  current: number
  prior: number
  indent?: boolean
  isBold?: boolean
  isSubtotal?: boolean
  isSection?: boolean
  isResult?: boolean
  trendValues?: number[]
  accountId?: string
}

export function SeasonalitySummary({
  period,
  view,
  columnMode = "variations",
  analysisType = "revenue",
  selectedProduct = "total",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: SeasonalitySummaryProps) {
  // Helper function to generate month labels
  const getMonthLabels = (monthsCount: number = 12): string[] => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const currentDate = new Date()
    const labels: string[] = []
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
  }

  // Helper function to generate year labels
  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      labels.push(`${currentYear - i}`)
    }
    return labels
  }

  // Helper function to get horizon text
  const getHorizonText = (): string => {
    if (view === "12months") return "12 mois"
    if (view === "24months") return "24 mois"
    if (view === "years") return "Années"
    return "12 mois"
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

  // Helper function to generate seasonality data with patterns
  const generateSeasonalityData = (base: number, seasonalPattern: number[]): number[] => {
    const currentDate = new Date()
    const data: number[] = []
    
    if (view === "12months") {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthIndex = date.getMonth()
        const seasonalMultiplier = seasonalPattern[monthIndex] || 1
        const trend = 1 + (0.02 * (11 - i))
        data.push(Math.round(base * seasonalMultiplier * trend * (0.95 + Math.random() * 0.1)))
      }
    } else if (view === "24months") {
      for (let i = 23; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthIndex = date.getMonth()
        const seasonalMultiplier = seasonalPattern[monthIndex] || 1
        const trend = 1 + (0.02 * (23 - i) / 12)
        data.push(Math.round(base * seasonalMultiplier * trend * (0.95 + Math.random() * 0.1)))
      }
    } else if (view === "years") {
      for (let i = 5; i >= 0; i--) {
        const yearValue = base * (1 + 0.05 * (5 - i)) * (0.95 + Math.random() * 0.1)
        data.push(Math.round(yearValue))
      }
    }
    
    return data
  }

  // Seasonal patterns
  const revenueSeasonalPattern = [0.85, 0.80, 0.90, 1.00, 1.10, 1.15, 1.20, 1.15, 1.05, 1.00, 0.95, 1.05]
  const expenseSeasonalPattern = [1.00, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20, 1.15, 1.10, 1.05, 1.00, 1.10]

  // Generate data for revenue by product/service
  const getRevenueByProductData = (): SummaryRow[] => {
    const baseProduct1 = 120000
    const baseProduct2 = 90000
    const baseProduct3 = 65000
    
    const product1Trend = generateSeasonalityData(baseProduct1, revenueSeasonalPattern)
    const product2Trend = generateSeasonalityData(baseProduct2, revenueSeasonalPattern)
    const product3Trend = generateSeasonalityData(baseProduct3, revenueSeasonalPattern)
    
    const totalRevenueTrend = product1Trend.map((_, idx) => 
      product1Trend[idx] + product2Trend[idx] + product3Trend[idx]
    )
    
    if (selectedProduct === "product_a") {
      return [
        { label: "REVENUS - PRODUIT A", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Produit A", current: baseProduct1, prior: baseProduct1 * 0.9, indent: true, trendValues: product1Trend, accountId: "product_a" },
        { label: "Total Revenus - Produit A", current: baseProduct1, prior: baseProduct1 * 0.9, isBold: true, isSubtotal: true, trendValues: product1Trend },
      ]
    } else if (selectedProduct === "product_b") {
      return [
        { label: "REVENUS - PRODUIT B", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Produit B", current: baseProduct2, prior: baseProduct2 * 0.9, indent: true, trendValues: product2Trend, accountId: "product_b" },
        { label: "Total Revenus - Produit B", current: baseProduct2, prior: baseProduct2 * 0.9, isBold: true, isSubtotal: true, trendValues: product2Trend },
      ]
    } else if (selectedProduct === "service_c") {
      return [
        { label: "REVENUS - SERVICE C", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Service C", current: baseProduct3, prior: baseProduct3 * 0.9, indent: true, trendValues: product3Trend, accountId: "service_c" },
        { label: "Total Revenus - Service C", current: baseProduct3, prior: baseProduct3 * 0.9, isBold: true, isSubtotal: true, trendValues: product3Trend },
      ]
    }
    
    return [
      { label: "REVENUS PAR PRODUITS/SERVICES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Produit A", current: baseProduct1, prior: baseProduct1 * 0.9, indent: true, trendValues: product1Trend, accountId: "product_a" },
      { label: "Produit B", current: baseProduct2, prior: baseProduct2 * 0.9, indent: true, trendValues: product2Trend, accountId: "product_b" },
      { label: "Service C", current: baseProduct3, prior: baseProduct3 * 0.9, indent: true, trendValues: product3Trend, accountId: "service_c" },
      { label: "Total Revenus par produits/services", current: baseProduct1 + baseProduct2 + baseProduct3, prior: (baseProduct1 + baseProduct2 + baseProduct3) * 0.9, isBold: true, isSubtotal: true, trendValues: totalRevenueTrend },
    ]
  }

  // Generate data for variable costs by product/service
  const getVariableCostsByProductData = (): SummaryRow[] => {
    const baseProduct1Revenue = 120000
    const baseProduct2Revenue = 90000
    const baseProduct3Revenue = 65000
    
    const product1CostRatio = 0.55
    const product2CostRatio = 0.50
    const product3CostRatio = 0.35
    
    const baseProduct1Cost = baseProduct1Revenue * product1CostRatio
    const baseProduct2Cost = baseProduct2Revenue * product2CostRatio
    const baseProduct3Cost = baseProduct3Revenue * product3CostRatio
    
    const product1CostTrend = generateSeasonalityData(baseProduct1Cost, revenueSeasonalPattern)
    const product2CostTrend = generateSeasonalityData(baseProduct2Cost, revenueSeasonalPattern)
    const product3CostTrend = generateSeasonalityData(baseProduct3Cost, revenueSeasonalPattern)
    
    const totalVariableCostTrend = product1CostTrend.map((_, idx) => 
      product1CostTrend[idx] + product2CostTrend[idx] + product3CostTrend[idx]
    )
    
    if (selectedProduct === "product_a") {
      return [
        { label: "COÛTS VARIABLES - PRODUIT A", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Produit A", current: baseProduct1Cost, prior: baseProduct1Cost * 0.9, indent: true, trendValues: product1CostTrend, accountId: "variable_cost_product_a" },
        { label: "Total Coûts variables - Produit A", current: baseProduct1Cost, prior: baseProduct1Cost * 0.9, isBold: true, isSubtotal: true, trendValues: product1CostTrend },
      ]
    } else if (selectedProduct === "product_b") {
      return [
        { label: "COÛTS VARIABLES - PRODUIT B", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Produit B", current: baseProduct2Cost, prior: baseProduct2Cost * 0.9, indent: true, trendValues: product2CostTrend, accountId: "variable_cost_product_b" },
        { label: "Total Coûts variables - Produit B", current: baseProduct2Cost, prior: baseProduct2Cost * 0.9, isBold: true, isSubtotal: true, trendValues: product2CostTrend },
      ]
    } else if (selectedProduct === "service_c") {
      return [
        { label: "COÛTS VARIABLES - SERVICE C", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Service C", current: baseProduct3Cost, prior: baseProduct3Cost * 0.9, indent: true, trendValues: product3CostTrend, accountId: "variable_cost_service_c" },
        { label: "Total Coûts variables - Service C", current: baseProduct3Cost, prior: baseProduct3Cost * 0.9, isBold: true, isSubtotal: true, trendValues: product3CostTrend },
      ]
    }
    
    return [
      { label: "COÛTS VARIABLES PAR PRODUITS/SERVICES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Produit A", current: baseProduct1Cost, prior: baseProduct1Cost * 0.9, indent: true, trendValues: product1CostTrend, accountId: "variable_cost_product_a" },
      { label: "Produit B", current: baseProduct2Cost, prior: baseProduct2Cost * 0.9, indent: true, trendValues: product2CostTrend, accountId: "variable_cost_product_b" },
      { label: "Service C", current: baseProduct3Cost, prior: baseProduct3Cost * 0.9, indent: true, trendValues: product3CostTrend, accountId: "variable_cost_service_c" },
      { label: "Total Coûts variables par produits/services", current: baseProduct1Cost + baseProduct2Cost + baseProduct3Cost, prior: (baseProduct1Cost + baseProduct2Cost + baseProduct3Cost) * 0.9, isBold: true, isSubtotal: true, trendValues: totalVariableCostTrend },
    ]
  }

  // Generate data for margins by product/service
  const getMarginsByProductData = (): SummaryRow[] => {
    const baseProduct1Revenue = 120000
    const baseProduct2Revenue = 90000
    const baseProduct3Revenue = 65000
    
    const product1CostRatio = 0.55
    const product2CostRatio = 0.50
    const product3CostRatio = 0.35
    
    const baseProduct1Margin = baseProduct1Revenue * (1 - product1CostRatio)
    const baseProduct2Margin = baseProduct2Revenue * (1 - product2CostRatio)
    const baseProduct3Margin = baseProduct3Revenue * (1 - product3CostRatio)
    
    const product1RevenueTrend = generateSeasonalityData(baseProduct1Revenue, revenueSeasonalPattern)
    const product2RevenueTrend = generateSeasonalityData(baseProduct2Revenue, revenueSeasonalPattern)
    const product3RevenueTrend = generateSeasonalityData(baseProduct3Revenue, revenueSeasonalPattern)
    
    const product1CostTrend = generateSeasonalityData(baseProduct1Revenue * product1CostRatio, revenueSeasonalPattern)
    const product2CostTrend = generateSeasonalityData(baseProduct2Revenue * product2CostRatio, revenueSeasonalPattern)
    const product3CostTrend = generateSeasonalityData(baseProduct3Revenue * product3CostRatio, revenueSeasonalPattern)
    
    const product1MarginTrend = product1RevenueTrend.map((rev, idx) => rev - product1CostTrend[idx])
    const product2MarginTrend = product2RevenueTrend.map((rev, idx) => rev - product2CostTrend[idx])
    const product3MarginTrend = product3RevenueTrend.map((revenue, idx) => revenue - product3CostTrend[idx])
    
    const totalMarginTrend = product1MarginTrend.map((_, idx) => 
      product1MarginTrend[idx] + product2MarginTrend[idx] + product3MarginTrend[idx]
    )
    
    if (selectedProduct === "product_a") {
      return [
        { label: "MARGES - PRODUIT A", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Produit A", current: baseProduct1Margin, prior: baseProduct1Margin * 0.9, indent: true, trendValues: product1MarginTrend, accountId: "margin_product_a" },
        { label: "Total Marges - Produit A", current: baseProduct1Margin, prior: baseProduct1Margin * 0.9, isBold: true, isSubtotal: true, trendValues: product1MarginTrend },
      ]
    } else if (selectedProduct === "product_b") {
      return [
        { label: "MARGES - PRODUIT B", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Produit B", current: baseProduct2Margin, prior: baseProduct2Margin * 0.9, indent: true, trendValues: product2MarginTrend, accountId: "margin_product_b" },
        { label: "Total Marges - Produit B", current: baseProduct2Margin, prior: baseProduct2Margin * 0.9, isBold: true, isSubtotal: true, trendValues: product2MarginTrend },
      ]
    } else if (selectedProduct === "service_c") {
      return [
        { label: "MARGES - SERVICE C", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Service C", current: baseProduct3Margin, prior: baseProduct3Margin * 0.9, indent: true, trendValues: product3MarginTrend, accountId: "margin_service_c" },
        { label: "Total Marges - Service C", current: baseProduct3Margin, prior: baseProduct3Margin * 0.9, isBold: true, isSubtotal: true, trendValues: product3MarginTrend },
      ]
    }
    
    return [
      { label: "MARGES PAR PRODUITS/SERVICES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Produit A", current: baseProduct1Margin, prior: baseProduct1Margin * 0.9, indent: true, trendValues: product1MarginTrend, accountId: "margin_product_a" },
      { label: "Produit B", current: baseProduct2Margin, prior: baseProduct2Margin * 0.9, indent: true, trendValues: product2MarginTrend, accountId: "margin_product_b" },
      { label: "Service C", current: baseProduct3Margin, prior: baseProduct3Margin * 0.9, indent: true, trendValues: product3MarginTrend, accountId: "margin_service_c" },
      { label: "Total Marges par produits/services", current: baseProduct1Margin + baseProduct2Margin + baseProduct3Margin, prior: (baseProduct1Margin + baseProduct2Margin + baseProduct3Margin) * 0.9, isBold: true, isSubtotal: true, trendValues: totalMarginTrend },
    ]
  }

  // Generate data for expenses
  const getExpenseData = (): SummaryRow[] => {
    const baseCOGS = 165000
    const baseSalaries = 55000
    const baseRent = 12000
    const baseMarketing = 18000
    const baseOther = 15000
    
    const cogsTrend = generateSeasonalityData(baseCOGS, expenseSeasonalPattern)
    const salariesTrend = generateSeasonalityData(baseSalaries, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])
    const rentTrend = generateSeasonalityData(baseRent, [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0])
    const marketingTrend = generateSeasonalityData(baseMarketing, expenseSeasonalPattern)
    const otherTrend = generateSeasonalityData(baseOther, expenseSeasonalPattern)
    
    const totalExpenseTrend = cogsTrend.map((_, idx) => 
      cogsTrend[idx] + salariesTrend[idx] + rentTrend[idx] + marketingTrend[idx] + otherTrend[idx]
    )
    
    return [
      { label: "DÉPENSES", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Coût des ventes", current: baseCOGS, prior: baseCOGS * 0.9, indent: true, trendValues: cogsTrend, accountId: "cogs" },
      { label: "Salaires et avantages", current: baseSalaries, prior: baseSalaries * 0.9, indent: true, trendValues: salariesTrend, accountId: "salaries" },
      { label: "Loyer et services publics", current: baseRent, prior: baseRent * 0.9, indent: true, trendValues: rentTrend, accountId: "rent" },
      { label: "Marketing et publicité", current: baseMarketing, prior: baseMarketing * 0.9, indent: true, trendValues: marketingTrend, accountId: "marketing" },
      { label: "Autres dépenses", current: baseOther, prior: baseOther * 0.9, indent: true, trendValues: otherTrend, accountId: "other_expenses" },
      { label: "Total Dépenses", current: baseCOGS + baseSalaries + baseRent + baseMarketing + baseOther, prior: (baseCOGS + baseSalaries + baseRent + baseMarketing + baseOther) * 0.9, isBold: true, isSubtotal: true, trendValues: totalExpenseTrend },
    ]
  }

  // Combine all data - Summary view always shows the three main sections
  const getSummaryData = (): SummaryRow[] => {
    return [
      ...getRevenueByProductData(),
      { label: "", current: 0, prior: 0 },
      ...getVariableCostsByProductData(),
      { label: "", current: 0, prior: 0 },
      ...getMarginsByProductData(),
    ]
  }

  const data = getSummaryData()

  // Calculate total revenue for each period
  const getTotalRevenueForPeriod = (periodIndex: number): number => {
    if (analysisType === "revenue") {
      const revenueRows = data.filter((r) => r.accountId && (r.accountId.startsWith("product_") || r.accountId.startsWith("service_")))
      return revenueRows.reduce((sum, row) => {
        if (row.trendValues && row.trendValues[periodIndex] !== undefined) {
          return sum + row.trendValues[periodIndex]
        }
        return sum
      }, 0)
    } else {
      const baseProduct1 = 120000
      const baseProduct2 = 90000
      const baseProduct3 = 65000
      const product1Trend = generateSeasonalityData(baseProduct1, revenueSeasonalPattern)
      const product2Trend = generateSeasonalityData(baseProduct2, revenueSeasonalPattern)
      const product3Trend = generateSeasonalityData(baseProduct3, revenueSeasonalPattern)
      return product1Trend[periodIndex] + product2Trend[periodIndex] + product3Trend[periodIndex]
    }
  }

  const entityText = getEntityText()

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-5 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 rounded-full flex-shrink-0 bg-emerald-400"></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white tracking-tight mb-1">Sommaire</h2>
              <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-500">•</span>
                <span>Revenus • Coûts variables • Marges</span>
                <span className="text-slate-500">•</span>
                <span>{columnMode === "percentage" ? "Aperçu en %" : "Aperçu en $"}</span>
                <span className="text-slate-500">•</span>
                {entityText.parts}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Compte</th>
              {view === "12months" && (
                <>
                  {getMonthLabels(12).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "24months" && (
                <>
                  {getMonthLabels(24).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getYearLabels().map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isSpacer = row.label === ""
              const shouldHideAmounts = isSpacer || !!row.isSection
              const displayLabel = row.isSection ? row.label.toUpperCase() : row.label
              
              const nextRowIsSubtotal = idx < data.length - 1 && data[idx + 1].isSubtotal
              const nextRowIsResult = idx < data.length - 1 && data[idx + 1].isResult

              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b",
                    row.label === "" ? "h-2 border-slate-200" : "",
                    (nextRowIsSubtotal || nextRowIsResult) ? "border-slate-900 border-b-2" : "border-slate-200"
                  )}
                >
                  <td
                    className={`px-6 py-3 ${row.isBold ? "font-bold text-slate-900" : "text-slate-700"} ${row.indent ? "pl-12" : ""}`}
                  >
                    {displayLabel}
                  </td>
                  {view === "12months" && (
                    <>
                      {!shouldHideAmounts && row.trendValues ? (
                        <>
                          {row.trendValues.map((value, valIdx) => {
                            if (columnMode === "percentage") {
                              const totalRevenue = getTotalRevenueForPeriod(valIdx)
                              const percentage = totalRevenue !== 0 ? (value / totalRevenue) * 100 : 0
                              return (
                                <td key={valIdx} className="px-4 py-3 text-right font-mono text-emerald-600">
                                  {percentage.toFixed(1)}%
                                </td>
                              )
                            } else {
                              return (
                                <td key={valIdx} className="px-4 py-3 text-right font-mono text-emerald-600">
                                  {formatCurrency(value)}
                                </td>
                              )
                            }
                          })}
                        </>
                      ) : (
                        <>
                          {Array.from({ length: 12 }).map((_, valIdx) => (
                            <td key={valIdx} className="px-4 py-3 text-right font-mono text-white">-</td>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  {view === "24months" && (
                    <>
                      {!shouldHideAmounts && row.trendValues ? (
                        <>
                          {row.trendValues.map((value, valIdx) => {
                            if (columnMode === "percentage") {
                              const totalRevenue = getTotalRevenueForPeriod(valIdx)
                              const percentage = totalRevenue !== 0 ? (value / totalRevenue) * 100 : 0
                              return (
                                <td key={valIdx} className="px-4 py-3 text-right font-mono text-emerald-600">
                                  {percentage.toFixed(1)}%
                                </td>
                              )
                            } else {
                              return (
                                <td key={valIdx} className="px-4 py-3 text-right font-mono text-emerald-600">
                                  {formatCurrency(value)}
                                </td>
                              )
                            }
                          })}
                        </>
                      ) : (
                        <>
                          {Array.from({ length: 24 }).map((_, valIdx) => (
                            <td key={valIdx} className="px-4 py-3 text-right font-mono text-white">-</td>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  {view === "years" && (
                    <>
                      {!shouldHideAmounts && row.trendValues ? (
                        <>
                          {row.trendValues.map((value, valIdx) => {
                            if (columnMode === "percentage") {
                              const totalRevenue = getTotalRevenueForPeriod(valIdx)
                              const percentage = totalRevenue !== 0 ? (value / totalRevenue) * 100 : 0
                              return (
                                <td key={valIdx} className="px-4 py-3 text-right font-mono text-emerald-600">
                                  {percentage.toFixed(1)}%
                                </td>
                              )
                            } else {
                              return (
                                <td key={valIdx} className="px-4 py-3 text-right font-mono text-emerald-600">
                                  {formatCurrency(value)}
                                </td>
                              )
                            }
                          })}
                        </>
                      ) : (
                        <>
                          {Array.from({ length: 6 }).map((_, valIdx) => (
                            <td key={valIdx} className="px-4 py-3 text-right font-mono text-white">-</td>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="bg-slate-50 px-8 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          Note: L'analyse de saisonnalité permet d'identifier les variations périodiques dans les revenus et dépenses. 
          Les données affichées sont à titre informatif.
        </p>
      </div>
    </div>
  )
}

