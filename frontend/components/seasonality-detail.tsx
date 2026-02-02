"use client"

import { useState } from "react"
import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"

type ProductType = "total" | "product_a" | "product_b" | "service_c"

interface SeasonalityDetailProps {
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

interface DetailRow {
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

export function SeasonalityDetail({
  period,
  view,
  columnMode = "variations",
  analysisType = "revenue",
  selectedProduct = "total",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: SeasonalityDetailProps) {
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
  
  // Only show detail view for revenue analysis type
  if (analysisType !== "revenue") {
    return null
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

  // Deterministic pseudo-random to avoid SSR/client hydration mismatch
  const seededRandom = (seed: number): number => {
    const x = Math.sin(seed * 9301 + 49297) * 233280
    return (x - Math.floor(x)) * 0.1 + 0.95 // Returns 0.95 to 1.05
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
        data.push(Math.round(base * seasonalMultiplier * trend * seededRandom(base + i)))
      }
    } else if (view === "24months") {
      for (let i = 23; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthIndex = date.getMonth()
        const seasonalMultiplier = seasonalPattern[monthIndex] || 1
        const trend = 1 + (0.01 * (23 - i) / 12)
        data.push(Math.round(base * seasonalMultiplier * trend * seededRandom(base + i)))
      }
    } else if (view === "years") {
      for (let i = 5; i >= 0; i--) {
        const yearValue = base * (1 + 0.05 * (5 - i)) * seededRandom(base + i)
        data.push(Math.round(yearValue))
      }
    }

    return data
  }

  // Seasonal patterns
  const revenueSeasonalPattern = [0.85, 0.80, 0.90, 1.00, 1.10, 1.15, 1.20, 1.15, 1.05, 1.00, 0.95, 1.05]

  // Generate detailed variable costs breakdown by product/service
  const getVariableCostsDetailData = (): DetailRow[] => {
    // Base revenue values
    const baseProduct1Revenue = 120000
    const baseProduct2Revenue = 90000
    const baseProduct3Revenue = 65000
    
    // Variable cost breakdown ratios for each product
    // Product A: 55% total (Achats: 30%, Main-d'oeuvre: 20%, Transport: 5%)
    // Product B: 50% total (Achats: 25%, Main-d'oeuvre: 20%, Transport: 5%)
    // Service C: 35% total (Achats: 15%, Main-d'oeuvre: 15%, Transport: 5%)
    
    const getProductCostBreakdown = (productRevenue: number, productType: "product_a" | "product_b" | "service_c") => {
      let purchasesRatio = 0
      let laborRatio = 0
      let transportRatio = 0.05 // 5% for all
      
      if (productType === "product_a") {
        purchasesRatio = 0.30
        laborRatio = 0.20
      } else if (productType === "product_b") {
        purchasesRatio = 0.25
        laborRatio = 0.20
      } else if (productType === "service_c") {
        purchasesRatio = 0.15
        laborRatio = 0.15
      }
      
      const basePurchases = productRevenue * purchasesRatio
      const baseLabor = productRevenue * laborRatio
      const baseTransport = productRevenue * transportRatio
      const baseTotal = basePurchases + baseLabor + baseTransport
      
      const purchasesTrend = generateSeasonalityData(basePurchases, revenueSeasonalPattern)
      const laborTrend = generateSeasonalityData(baseLabor, revenueSeasonalPattern)
      const transportTrend = generateSeasonalityData(baseTransport, revenueSeasonalPattern)
      const totalTrend = purchasesTrend.map((_, idx) => purchasesTrend[idx] + laborTrend[idx] + transportTrend[idx])
      
      return {
        purchases: { base: basePurchases, trend: purchasesTrend },
        labor: { base: baseLabor, trend: laborTrend },
        transport: { base: baseTransport, trend: transportTrend },
        total: { base: baseTotal, trend: totalTrend },
      }
    }
    
    const product1Breakdown = getProductCostBreakdown(baseProduct1Revenue, "product_a")
    const product2Breakdown = getProductCostBreakdown(baseProduct2Revenue, "product_b")
    const product3Breakdown = getProductCostBreakdown(baseProduct3Revenue, "service_c")
    
    // Filter based on selected product
    if (selectedProduct === "product_a") {
      return [
        { label: "COÛTS VARIABLES - PRODUIT A", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Achats", current: product1Breakdown.purchases.base, prior: product1Breakdown.purchases.base * 0.9, indent: true, trendValues: product1Breakdown.purchases.trend, accountId: "purchases_product_a" },
        { label: "Main-d'oeuvre", current: product1Breakdown.labor.base, prior: product1Breakdown.labor.base * 0.9, indent: true, trendValues: product1Breakdown.labor.trend, accountId: "labor_product_a" },
        { label: "Transport", current: product1Breakdown.transport.base, prior: product1Breakdown.transport.base * 0.9, indent: true, trendValues: product1Breakdown.transport.trend, accountId: "transport_product_a" },
        { label: "Total Coûts variables - Produit A", current: product1Breakdown.total.base, prior: product1Breakdown.total.base * 0.9, isBold: true, isSubtotal: true, trendValues: product1Breakdown.total.trend },
      ]
    } else if (selectedProduct === "product_b") {
      return [
        { label: "COÛTS VARIABLES - PRODUIT B", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Achats", current: product2Breakdown.purchases.base, prior: product2Breakdown.purchases.base * 0.9, indent: true, trendValues: product2Breakdown.purchases.trend, accountId: "purchases_product_b" },
        { label: "Main-d'oeuvre", current: product2Breakdown.labor.base, prior: product2Breakdown.labor.base * 0.9, indent: true, trendValues: product2Breakdown.labor.trend, accountId: "labor_product_b" },
        { label: "Transport", current: product2Breakdown.transport.base, prior: product2Breakdown.transport.base * 0.9, indent: true, trendValues: product2Breakdown.transport.trend, accountId: "transport_product_b" },
        { label: "Total Coûts variables - Produit B", current: product2Breakdown.total.base, prior: product2Breakdown.total.base * 0.9, isBold: true, isSubtotal: true, trendValues: product2Breakdown.total.trend },
      ]
    } else if (selectedProduct === "service_c") {
      return [
        { label: "COÛTS VARIABLES - SERVICE C", current: 0, prior: 0, isBold: true, isSection: true },
        { label: "Achats", current: product3Breakdown.purchases.base, prior: product3Breakdown.purchases.base * 0.9, indent: true, trendValues: product3Breakdown.purchases.trend, accountId: "purchases_service_c" },
        { label: "Main-d'oeuvre", current: product3Breakdown.labor.base, prior: product3Breakdown.labor.base * 0.9, indent: true, trendValues: product3Breakdown.labor.trend, accountId: "labor_service_c" },
        { label: "Transport", current: product3Breakdown.transport.base, prior: product3Breakdown.transport.base * 0.9, indent: true, trendValues: product3Breakdown.transport.trend, accountId: "transport_service_c" },
        { label: "Total Coûts variables - Service C", current: product3Breakdown.total.base, prior: product3Breakdown.total.base * 0.9, isBold: true, isSubtotal: true, trendValues: product3Breakdown.total.trend },
      ]
    }
    
    // Total - show all products with their breakdowns
    return [
      { label: "COÛTS VARIABLES - PRODUIT A", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Achats", current: product1Breakdown.purchases.base, prior: product1Breakdown.purchases.base * 0.9, indent: true, trendValues: product1Breakdown.purchases.trend, accountId: "purchases_product_a" },
      { label: "Main-d'oeuvre", current: product1Breakdown.labor.base, prior: product1Breakdown.labor.base * 0.9, indent: true, trendValues: product1Breakdown.labor.trend, accountId: "labor_product_a" },
      { label: "Transport", current: product1Breakdown.transport.base, prior: product1Breakdown.transport.base * 0.9, indent: true, trendValues: product1Breakdown.transport.trend, accountId: "transport_product_a" },
      { label: "Total Coûts variables - Produit A", current: product1Breakdown.total.base, prior: product1Breakdown.total.base * 0.9, isBold: true, isSubtotal: true, trendValues: product1Breakdown.total.trend },
      { label: "", current: 0, prior: 0 },
      { label: "COÛTS VARIABLES - PRODUIT B", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Achats", current: product2Breakdown.purchases.base, prior: product2Breakdown.purchases.base * 0.9, indent: true, trendValues: product2Breakdown.purchases.trend, accountId: "purchases_product_b" },
      { label: "Main-d'oeuvre", current: product2Breakdown.labor.base, prior: product2Breakdown.labor.base * 0.9, indent: true, trendValues: product2Breakdown.labor.trend, accountId: "labor_product_b" },
      { label: "Transport", current: product2Breakdown.transport.base, prior: product2Breakdown.transport.base * 0.9, indent: true, trendValues: product2Breakdown.transport.trend, accountId: "transport_product_b" },
      { label: "Total Coûts variables - Produit B", current: product2Breakdown.total.base, prior: product2Breakdown.total.base * 0.9, isBold: true, isSubtotal: true, trendValues: product2Breakdown.total.trend },
      { label: "", current: 0, prior: 0 },
      { label: "COÛTS VARIABLES - SERVICE C", current: 0, prior: 0, isBold: true, isSection: true },
      { label: "Achats", current: product3Breakdown.purchases.base, prior: product3Breakdown.purchases.base * 0.9, indent: true, trendValues: product3Breakdown.purchases.trend, accountId: "purchases_service_c" },
      { label: "Main-d'oeuvre", current: product3Breakdown.labor.base, prior: product3Breakdown.labor.base * 0.9, indent: true, trendValues: product3Breakdown.labor.trend, accountId: "labor_service_c" },
      { label: "Transport", current: product3Breakdown.transport.base, prior: product3Breakdown.transport.base * 0.9, indent: true, trendValues: product3Breakdown.transport.trend, accountId: "transport_service_c" },
      { label: "Total Coûts variables - Service C", current: product3Breakdown.total.base, prior: product3Breakdown.total.base * 0.9, isBold: true, isSubtotal: true, trendValues: product3Breakdown.total.trend },
    ]
  }

  const data = getVariableCostsDetailData()

  // Calculate total variable costs for each period (for percentage calculations)
  const getTotalVariableCostsForPeriod = (periodIndex: number): number => {
    const totalRows = data.filter((r) => r.isSubtotal && r.trendValues)
    return totalRows.reduce((sum, row) => {
      if (row.trendValues && row.trendValues[periodIndex] !== undefined) {
        return sum + row.trendValues[periodIndex]
      }
      return sum
    }, 0)
  }

  const entityText = getEntityText()

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-5 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-1 h-12 rounded-full flex-shrink-0 ${analysisType === "revenue" ? "bg-emerald-400" : "bg-red-400"}`}></div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white tracking-tight mb-1">Détail</h2>
              <div className="flex items-center gap-3 text-sm text-slate-300 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-500">•</span>
                <span>Coûts variables</span>
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
              const variation = row.current && row.prior ? calculateVariation(row.current, row.prior) : null
              const variationAmount = row.current && row.prior ? row.current - row.prior : 0
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
                              const totalVariableCosts = getTotalVariableCostsForPeriod(valIdx)
                              const percentage = totalVariableCosts !== 0 ? (value / totalVariableCosts) * 100 : 0
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
                              const totalVariableCosts = getTotalVariableCostsForPeriod(valIdx)
                              const percentage = totalVariableCosts !== 0 ? (value / totalVariableCosts) * 100 : 0
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
                              const totalVariableCosts = getTotalVariableCostsForPeriod(valIdx)
                              const percentage = totalVariableCosts !== 0 ? (value / totalVariableCosts) * 100 : 0
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

