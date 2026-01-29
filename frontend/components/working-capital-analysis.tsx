"use client"

import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"

interface WorkingCapitalAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

// Helper functions to get data (same logic as WorkingCapitalDetail)
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
  // Current view
  if (period === "monthly") {
    return {
      currentAssets: 850000,
      priorAssets: 750000,
      currentLiabilities: 450000,
      priorLiabilities: 420000,
      currentRevenue: 275000,
      priorRevenue: 242000,
      trendValues: undefined
    }
  } else if (period === "quarterly") {
    return {
      currentAssets: 2550000,
      priorAssets: 2250000,
      currentLiabilities: 1350000,
      priorLiabilities: 1260000,
      currentRevenue: 825000,
      priorRevenue: 716000,
      trendValues: undefined
    }
  } else {
    return {
      currentAssets: 10200000,
      priorAssets: 9000000,
      currentLiabilities: 5400000,
      priorLiabilities: 5040000,
      currentRevenue: 3300000,
      priorRevenue: 2864000,
      trendValues: undefined
    }
  }
}

export function WorkingCapitalAnalysis({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: WorkingCapitalAnalysisProps) {
  const data = getDetailData(period, view)

  // Calculate Working Capital (current assets - current liabilities)
  const calculateWorkingCapital = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const assets = data.trendValues[trendIndex]?.assets || 0
      const liabilities = data.trendValues[trendIndex]?.liabilities || 0
      return assets - liabilities
    }
    const assets = isPrior ? data.priorAssets : data.currentAssets
    const liabilities = isPrior ? data.priorLiabilities : data.currentLiabilities
    return assets - liabilities
  }

  // Calculate Working Capital Ex Cash (current assets - cash - current liabilities)
  // Assuming cash is approximately 23.5% of current assets
  const calculateWorkingCapitalExCash = (isPrior: boolean, trendIndex?: number): number => {
    const cashRatio = 0.235
    
    if (trendIndex !== undefined && data.trendValues) {
      const assets = data.trendValues[trendIndex]?.assets || 0
      const cash = assets * cashRatio
      const liabilities = data.trendValues[trendIndex]?.liabilities || 0
      return assets - cash - liabilities
    }
    const assets = isPrior ? data.priorAssets : data.currentAssets
    const cash = assets * cashRatio
    const liabilities = isPrior ? data.priorLiabilities : data.currentLiabilities
    return assets - cash - liabilities
  }

  // Calculate Revenue
  const getRevenue = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.revenue || 0
    }
    return isPrior ? data.priorRevenue : data.currentRevenue
  }

  // Calculate percentage of revenue
  const getRevenuePercentage = (value: number, isPrior: boolean, trendIndex?: number): number => {
    const revenue = getRevenue(isPrior, trendIndex)
    if (revenue === 0) return 0
    return (value / revenue) * 100
  }

  // Calculate Current Assets
  const getCurrentAssets = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.assets || 0
    }
    return isPrior ? data.priorAssets : data.currentAssets
  }

  // Calculate Current Liabilities
  const getCurrentLiabilities = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      return data.trendValues[trendIndex]?.liabilities || 0
    }
    return isPrior ? data.priorLiabilities : data.currentLiabilities
  }

  // Calculate FDR Ratio (Current Assets / Current Liabilities)
  const calculateFDRRatio = (isPrior: boolean, trendIndex?: number): number => {
    const assets = getCurrentAssets(isPrior, trendIndex)
    const liabilities = getCurrentLiabilities(isPrior, trendIndex)
    if (liabilities === 0) return 0
    return assets / liabilities
  }

  // Calculate FdRHC Ratio ((Current Assets - Cash) / Current Liabilities)
  const calculateFdRHCRatio = (isPrior: boolean, trendIndex?: number): number => {
    const cashRatio = 0.235
    const assets = getCurrentAssets(isPrior, trendIndex)
    const cash = assets * cashRatio
    const liabilities = getCurrentLiabilities(isPrior, trendIndex)
    if (liabilities === 0) return 0
    return (assets - cash) / liabilities
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Analyse du fonds de roulement</h3>
              <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                <span className="font-medium">{getHorizonText()}</span>
                <span className="text-slate-500">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-emerald-600 font-semibold">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-500">•</span>
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
            {/* FDR */}
            <tr className="border-b border-slate-100 hover:bg-emerald-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">FDR</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const fdrCurrent = calculateWorkingCapital(false)
                const fdrPrior = calculateWorkingCapital(true)
                const average = (fdrCurrent + fdrPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateWorkingCapital(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateWorkingCapital(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateWorkingCapital(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                    {formatCurrency(calculateWorkingCapital(false))}
                  </td>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-600">
                    {formatCurrency(calculateWorkingCapital(true))}
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const fdr = calculateWorkingCapital(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {formatCurrency(fdr)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const fdr = calculateWorkingCapital(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {formatCurrency(fdr)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const fdr = calculateWorkingCapital(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {formatCurrency(fdr)}
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* FdRHC */}
            <tr className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">FdRHC</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const fdrhcCurrent = calculateWorkingCapitalExCash(false)
                const fdrhcPrior = calculateWorkingCapitalExCash(true)
                const average = (fdrhcCurrent + fdrhcPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateWorkingCapitalExCash(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateWorkingCapitalExCash(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateWorkingCapitalExCash(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                    {formatCurrency(calculateWorkingCapitalExCash(false))}
                  </td>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-600">
                    {formatCurrency(calculateWorkingCapitalExCash(true))}
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const fdrhc = calculateWorkingCapitalExCash(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {formatCurrency(fdrhc)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const fdrhc = calculateWorkingCapitalExCash(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {formatCurrency(fdrhc)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const fdrhc = calculateWorkingCapitalExCash(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {formatCurrency(fdrhc)}
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* FDR / Revenus */}
            <tr className="border-b border-slate-100 hover:bg-purple-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">FDR / Revenus</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const fdr = calculateWorkingCapital(false)
                const percentage = getRevenuePercentage(fdr, false)
                const fdrPrior = calculateWorkingCapital(true)
                const percentagePrior = getRevenuePercentage(fdrPrior, true)
                const average = (percentage + percentagePrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => {
                  const fdr = calculateWorkingCapital(false, idx)
                  return getRevenuePercentage(fdr, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => {
                  const fdr = calculateWorkingCapital(false, idx)
                  return getRevenuePercentage(fdr, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => {
                  const fdr = calculateWorkingCapital(false, idx)
                  return getRevenuePercentage(fdr, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (() => {
                const fdr = calculateWorkingCapital(false)
                const percentage = getRevenuePercentage(fdr, false)
                const fdrPrior = calculateWorkingCapital(true)
                const percentagePrior = getRevenuePercentage(fdrPrior, true)
                return (
                  <>
                    <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                      {percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                      {percentagePrior.toFixed(1)}%
                    </td>
                  </>
                )
              })()}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const fdr = calculateWorkingCapital(false, idx)
                    const percentage = getRevenuePercentage(fdr, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const fdr = calculateWorkingCapital(false, idx)
                    const percentage = getRevenuePercentage(fdr, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const fdr = calculateWorkingCapital(false, idx)
                    const percentage = getRevenuePercentage(fdr, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* FdRHC / Revenus */}
            <tr className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">FdRHC / Revenus</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const fdrhc = calculateWorkingCapitalExCash(false)
                const percentage = getRevenuePercentage(fdrhc, false)
                const fdrhcPrior = calculateWorkingCapitalExCash(true)
                const percentagePrior = getRevenuePercentage(fdrhcPrior, true)
                const average = (percentage + percentagePrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => {
                  const fdrhc = calculateWorkingCapitalExCash(false, idx)
                  return getRevenuePercentage(fdrhc, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => {
                  const fdrhc = calculateWorkingCapitalExCash(false, idx)
                  return getRevenuePercentage(fdrhc, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => {
                  const fdrhc = calculateWorkingCapitalExCash(false, idx)
                  return getRevenuePercentage(fdrhc, false, idx)
                })
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(1)}%
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (() => {
                const fdrhc = calculateWorkingCapitalExCash(false)
                const percentage = getRevenuePercentage(fdrhc, false)
                const fdrhcPrior = calculateWorkingCapitalExCash(true)
                const percentagePrior = getRevenuePercentage(fdrhcPrior, true)
                return (
                  <>
                    <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                      {percentage.toFixed(1)}%
                    </td>
                    <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                      {percentagePrior.toFixed(1)}%
                    </td>
                  </>
                )
              })()}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const fdrhc = calculateWorkingCapitalExCash(false, idx)
                    const percentage = getRevenuePercentage(fdrhc, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const fdrhc = calculateWorkingCapitalExCash(false, idx)
                    const percentage = getRevenuePercentage(fdrhc, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const fdrhc = calculateWorkingCapitalExCash(false, idx)
                    const percentage = getRevenuePercentage(fdrhc, false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {percentage.toFixed(1)}%
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* Ratio de FDR */}
            <tr className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Ratio de FDR</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const ratioCurrent = calculateFDRRatio(false)
                const ratioPrior = calculateFDRRatio(true)
                const average = (ratioCurrent + ratioPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateFDRRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateFDRRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateFDRRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                    {calculateFDRRatio(false).toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                    {calculateFDRRatio(true).toFixed(2)}
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const ratio = calculateFDRRatio(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {ratio.toFixed(2)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const ratio = calculateFDRRatio(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {ratio.toFixed(2)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const ratio = calculateFDRRatio(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {ratio.toFixed(2)}
                      </td>
                    )
                  })}
                </>
              )}
            </tr>
            
            {/* Ratio de FdRHC */}
            <tr className="border-b border-slate-100 hover:bg-teal-50/30 transition-colors">
              <td className="px-6 py-3.5 text-slate-900">Ratio de FdRHC</td>
              
              {/* Colonne Moyenne */}
              {view === "current" && (() => {
                const ratioCurrent = calculateFdRHCRatio(false)
                const ratioPrior = calculateFdRHCRatio(true)
                const average = (ratioCurrent + ratioPrior) / 2
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "12months" && (() => {
                const values = Array.from({ length: 12 }).map((_, idx) => calculateFdRHCRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: 24 }).map((_, idx) => calculateFdRHCRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: 6 }).map((_, idx) => calculateFdRHCRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              
              {/* Colonnes de données */}
              {view === "current" && (
                <>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                    {calculateFdRHCRatio(false).toFixed(2)}
                  </td>
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                    {calculateFdRHCRatio(true).toFixed(2)}
                  </td>
                </>
              )}
              
              {view === "12months" && (
                <>
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const ratio = calculateFdRHCRatio(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {ratio.toFixed(2)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "24months" && (
                <>
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const ratio = calculateFdRHCRatio(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {ratio.toFixed(2)}
                      </td>
                    )
                  })}
                </>
              )}
              {view === "years" && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => {
                    const ratio = calculateFdRHCRatio(false, idx)
                    return (
                      <td key={idx} className="px-4 py-3.5 text-right text-sm font-semibold font-bold text-slate-900">
                        {ratio.toFixed(2)}
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

