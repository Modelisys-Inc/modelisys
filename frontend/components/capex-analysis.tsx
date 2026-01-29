"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CapexAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  displayMode?: "cost" | "book_value" | "capex"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper functions to get data (same logic as CapexDetail)
const getDetailData = (period: "monthly" | "quarterly" | "annual", view: "current" | "12months" | "24months" | "years") => {
  if (view === "12months") {
    return {
      currentFixedAssets: 960000,
      priorFixedAssets: 900000,
      currentIntangibleAssets: 300000,
      priorIntangibleAssets: 276000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 12 }, (_, i) => ({
        fixedAssets: 900000 + (i * 5000),
        intangibleAssets: 276000 + (i * 2000),
        revenue: 242000 + (i * 2750)
      }))
    }
  }
  if (view === "24months") {
    return {
      currentFixedAssets: 960000,
      priorFixedAssets: 900000,
      currentIntangibleAssets: 300000,
      priorIntangibleAssets: 276000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: Array.from({ length: 24 }, (_, i) => ({
        fixedAssets: 900000 + (i * 2500),
        intangibleAssets: 276000 + (i * 1000),
        revenue: 242000 + (i * 1375)
      }))
    }
  }
  if (view === "years") {
    return {
      currentFixedAssets: 11520000,
      priorFixedAssets: 10800000,
      currentIntangibleAssets: 3600000,
      priorIntangibleAssets: 3312000,
      currentRevenue: 3300000,
      priorRevenue: 2864000,
      trendValues: Array.from({ length: 6 }, (_, i) => ({
        fixedAssets: 10800000 + (i * 120000),
        intangibleAssets: 3312000 + (i * 57600),
        revenue: 2864000 + (i * 72800)
      }))
    }
  }
  // Current view
  if (period === "monthly") {
    return {
      currentFixedAssets: 960000,
      priorFixedAssets: 900000,
      currentIntangibleAssets: 300000,
      priorIntangibleAssets: 276000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: undefined
    }
  } else if (period === "quarterly") {
    return {
      currentFixedAssets: 2880000,
      priorFixedAssets: 2700000,
      currentIntangibleAssets: 900000,
      priorIntangibleAssets: 828000,
      currentRevenue: 825000,
      priorRevenue: 716000,
      trendValues: undefined
    }
  } else {
    return {
      currentFixedAssets: 11520000,
      priorFixedAssets: 10800000,
      currentIntangibleAssets: 3600000,
      priorIntangibleAssets: 3312000,
      currentRevenue: 3300000,
      priorRevenue: 2864000,
      trendValues: undefined
    }
  }
}

export function CapexAnalysis({
  period,
  view,
  displayMode = "cost",
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: CapexAnalysisProps) {
  const [selectedAssetCategory, setSelectedAssetCategory] = useState<string>("total")
  const data = getDetailData(period, view)

  // Calculate total fixed assets
  const calculateTotalFixedAssets = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const trend = data.trendValues[trendIndex]
      return trend.fixedAssets + trend.intangibleAssets
    }
    const fixedAssets = isPrior ? data.priorFixedAssets : data.currentFixedAssets
    const intangibleAssets = isPrior ? data.priorIntangibleAssets : data.currentIntangibleAssets
    return fixedAssets + intangibleAssets
  }

  // Get value for specific asset category based on display mode
  const getValueForAsset = (accountId: string | "total", isPrior: boolean, trendIndex?: number): number => {
    const totalAssets = calculateTotalFixedAssets(isPrior, trendIndex)
    
    if (accountId === "total") {
      return totalAssets
    }
    
    // Multipliers for different asset categories (same as CapexChart)
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
    
    return totalAssets * (multipliers[accountId] || 1)
  }

  // Calculate Capex (variation in fixed assets)
  const calculateCapex = (isPrior: boolean, trendIndex?: number): number => {
    if (displayMode === "capex") {
      return getValueForAsset(selectedAssetCategory, isPrior, trendIndex)
    } else {
      if (trendIndex !== undefined) {
        const current = getValueForAsset(selectedAssetCategory, false, trendIndex)
        const prior = trendIndex > 0 
          ? getValueForAsset(selectedAssetCategory, false, trendIndex - 1)
          : getValueForAsset(selectedAssetCategory, true)
        return current - prior
      } else {
        const current = getValueForAsset(selectedAssetCategory, false)
        const prior = getValueForAsset(selectedAssetCategory, true)
        return current - prior
      }
    }
  }

  // Calculate Depreciation (typically 8% of fixed assets per year)
  const calculateDepreciation = (isPrior: boolean, trendIndex?: number): number => {
    const assetValue = getValueForAsset(selectedAssetCategory, isPrior, trendIndex)
    // Assume 8% annual depreciation rate, adjust for period
    const annualRate = 0.08
    if (period === "monthly") {
      return assetValue * (annualRate / 12)
    } else if (period === "quarterly") {
      return assetValue * (annualRate / 4)
    } else {
      return assetValue * annualRate
    }
  }

  // Calculate Revenue
  const getRevenue = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex].revenue
    }
    return isPrior ? data.priorRevenue : data.currentRevenue
  }

  // Calculate percentage of revenue
  const getRevenuePercentage = (value: number, isPrior: boolean, trendIndex?: number): number => {
    const revenue = getRevenue(isPrior, trendIndex)
    if (revenue === 0) return 0
    return (value / revenue) * 100
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

  // Helper to get month labels
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

  // Helper to get year labels
  const getYearLabels = (): string[] => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${currentYear - 5 + i}`)
  }

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

  // Helper function to get entity text
  const getEntityText = (): string => {
    if (subDivisionId && divisionId && companyId) {
      const company = companies.find((c) => c.id === companyId)
      const division = company?.divisions.find((d) => d.id === divisionId)
      const subDivision = division?.subDivisions.find((sd) => sd.id === subDivisionId)
      return `${company?.name || ""} • ${division?.name || ""} • ${subDivision?.name || ""}`
    } else if (divisionId && companyId) {
      const company = companies.find((c) => c.id === companyId)
      const division = company?.divisions.find((d) => d.id === divisionId)
      return `${company?.name || ""} • ${division?.name || ""}`
    } else if (companyId) {
      return companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"
    }
    return "Toutes les sociétés"
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Analyse des Capex</h3>
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-b from-slate-50 to-slate-100/50 border-b-2 border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Métrique</th>
              <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Moyenne</th>
              {view === "current" && (
                <>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Courant</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Passé</th>
                </>
              )}
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
            {/* Capex */}
            <tr className="border-b border-slate-100 hover:bg-emerald-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const capexCurrent = calculateCapex(false)
                const capexPrior = calculateCapex(true)
                const average = (capexCurrent + capexPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateCapex(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateCapex(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateCapex(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right text-slate-500">
                    {formatCurrency(calculateCapex(false))}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-500">
                    {formatCurrency(calculateCapex(true))}
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm text-slate-500">
                        {formatCurrency(capex)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm text-slate-500">
                        {formatCurrency(capex)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm text-slate-500">
                        {formatCurrency(capex)}
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* Amortissement */}
            <tr className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Amortissement</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const depCurrent = calculateDepreciation(false)
                const depPrior = calculateDepreciation(true)
                const average = (depCurrent + depPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateDepreciation(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateDepreciation(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateDepreciation(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right text-slate-500">
                    {formatCurrency(calculateDepreciation(false))}
                  </td>
                  <td className="px-6 py-3.5 text-right text-slate-500">
                    {formatCurrency(calculateDepreciation(true))}
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const depreciation = calculateDepreciation(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm text-slate-500">
                        {formatCurrency(depreciation)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const depreciation = calculateDepreciation(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm text-slate-500">
                        {formatCurrency(depreciation)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const depreciation = calculateDepreciation(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm text-slate-500">
                        {formatCurrency(depreciation)}
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* Capex en % des revenus */}
            <tr className="border-b border-slate-100 hover:bg-purple-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex / Revenus</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const capex = calculateCapex(false)
                const percentage = getRevenuePercentage(capex, false)
                const capexPrior = calculateCapex(true)
                const percentagePrior = getRevenuePercentage(capexPrior, true)
                const average = (percentage + percentagePrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  return getRevenuePercentage(capex, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  return getRevenuePercentage(capex, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  return getRevenuePercentage(capex, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (() => {
                const capex = calculateCapex(false)
                const percentage = getRevenuePercentage(capex, false)
                const capexPrior = calculateCapex(true)
                const percentagePrior = getRevenuePercentage(capexPrior, true)
                return (
                  <>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      {percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      {percentagePrior.toFixed(1)}%
                    </td>
                  </>
                )
              })()}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const percentage = getRevenuePercentage(capex, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const percentage = getRevenuePercentage(capex, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const percentage = getRevenuePercentage(capex, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* Capex / BAIIA */}
            <tr className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex / BAIIA</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const capex = calculateCapex(false)
                const ebitda = calculateEBITDA(false)
                const ratio = ebitda !== 0 ? (capex / ebitda) * 100 : 0
                const ratioPrior = (() => {
                  const capexPrior = calculateCapex(true)
                  const ebitdaPrior = calculateEBITDA(true)
                  return ebitdaPrior !== 0 ? (capexPrior / ebitdaPrior) * 100 : 0
                })()
                const average = (ratio + ratioPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  const ebitda = calculateEBITDA(false, idx)
                  return ebitda !== 0 ? (capex / ebitda) * 100 : 0
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  const ebitda = calculateEBITDA(false, idx)
                  return ebitda !== 0 ? (capex / ebitda) * 100 : 0
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  const ebitda = calculateEBITDA(false, idx)
                  return ebitda !== 0 ? (capex / ebitda) * 100 : 0
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (() => {
                const capex = calculateCapex(false)
                const ebitda = calculateEBITDA(false)
                const ratio = ebitda !== 0 ? (capex / ebitda) * 100 : 0
                const ratioPrior = (() => {
                  const capexPrior = calculateCapex(true)
                  const ebitdaPrior = calculateEBITDA(true)
                  return ebitdaPrior !== 0 ? (capexPrior / ebitdaPrior) * 100 : 0
                })()
                return (
                  <>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      {ratio.toFixed(1)}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      {ratioPrior.toFixed(1)}%
                    </td>
                  </>
                )
              })()}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const ebitda = calculateEBITDA(false, idx)
                    const ratio = ebitda !== 0 ? (capex / ebitda) * 100 : 0
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {ratio.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const ebitda = calculateEBITDA(false, idx)
                    const ratio = ebitda !== 0 ? (capex / ebitda) * 100 : 0
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {ratio.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const ebitda = calculateEBITDA(false, idx)
                    const ratio = ebitda !== 0 ? (capex / ebitda) * 100 : 0
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {ratio.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* Capex / Flux de trésorerie reliés aux opérations */}
            <tr className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Capex / Flux de trésorerie reliés aux opérations</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const capex = calculateCapex(false)
                const ocf = calculateOperatingCashFlow(false)
                const ratio = ocf !== 0 ? (capex / ocf) * 100 : 0
                const ratioPrior = (() => {
                  const capexPrior = calculateCapex(true)
                  const ocfPrior = calculateOperatingCashFlow(true)
                  return ocfPrior !== 0 ? (capexPrior / ocfPrior) * 100 : 0
                })()
                const average = (ratio + ratioPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  const ocf = calculateOperatingCashFlow(false, idx)
                  return ocf !== 0 ? (capex / ocf) * 100 : 0
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  const ocf = calculateOperatingCashFlow(false, idx)
                  return ocf !== 0 ? (capex / ocf) * 100 : 0
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => {
                  const capex = calculateCapex(false, idx)
                  const ocf = calculateOperatingCashFlow(false, idx)
                  return ocf !== 0 ? (capex / ocf) * 100 : 0
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (() => {
                const capex = calculateCapex(false)
                const ocf = calculateOperatingCashFlow(false)
                const ratio = ocf !== 0 ? (capex / ocf) * 100 : 0
                const ratioPrior = (() => {
                  const capexPrior = calculateCapex(true)
                  const ocfPrior = calculateOperatingCashFlow(true)
                  return ocfPrior !== 0 ? (capexPrior / ocfPrior) * 100 : 0
                })()
                return (
                  <>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      {ratio.toFixed(1)}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-slate-500">
                      {ratioPrior.toFixed(1)}%
                    </td>
                  </>
                )
              })()}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const ocf = calculateOperatingCashFlow(false, idx)
                    const ratio = ocf !== 0 ? (capex / ocf) * 100 : 0
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {ratio.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const ocf = calculateOperatingCashFlow(false, idx)
                    const ratio = ocf !== 0 ? (capex / ocf) * 100 : 0
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {ratio.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const capex = calculateCapex(false, idx)
                    const ocf = calculateOperatingCashFlow(false, idx)
                    const ratio = ocf !== 0 ? (capex / ocf) * 100 : 0
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-slate-500">
                        {ratio.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

