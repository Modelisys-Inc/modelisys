"use client"

import { useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, aggregateToYears, findRow } from "@/lib/series-utils"

interface WorkingCapitalAnalysisProps {
  period: "monthly" | "quarterly" | "annual"
  view: "current" | "12months" | "24months" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
}

interface AnalysisData {
  currentAssets: number
  priorAssets: number
  currentLiabilities: number
  priorLiabilities: number
  currentRevenue: number
  priorRevenue: number
  currentCash: number
  priorCash: number
  trendValues?: Array<{
    assets: number
    liabilities: number
    revenue: number
    cash: number
  }>
}

export function WorkingCapitalAnalysis({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
}: WorkingCapitalAnalysisProps) {
  // Fetch balance-sheet and income-statement series data
  const currentYear = new Date().getFullYear()
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: bsRows, periods: bsPeriods, loading: bsLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const { rows: isRows, periods: isPeriods, loading: isLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const loading = bsLoading || isLoading

  // Compute the analysis data from real API rows
  const data: AnalysisData = useMemo(() => {
    const empty: AnalysisData = {
      currentAssets: 0, priorAssets: 0,
      currentLiabilities: 0, priorLiabilities: 0,
      currentRevenue: 0, priorRevenue: 0,
      currentCash: 0, priorCash: 0,
      trendValues: undefined,
    }

    if (bsRows.length === 0 && isRows.length === 0) return empty

    // Find relevant rows
    const totalCurrentAssetsRow = findRow(bsRows, "total actifs courants")
    const totalCurrentLiabilitiesRow = findRow(bsRows, "total passifs courants")
    const totalRevenueRow = findRow(isRows, "total revenus") || findRow(isRows, "revenus")
    const cashRow = findRow(bsRows, "encaisse") || findRow(bsRows, "trésorerie") || findRow(bsRows, "cash")

    // Extract raw amounts arrays
    const assetsAmounts = totalCurrentAssetsRow ? getRowAmounts(totalCurrentAssetsRow, bsPeriods) : []
    const liabilitiesAmounts = totalCurrentLiabilitiesRow ? getRowAmounts(totalCurrentLiabilitiesRow, bsPeriods) : []
    const revenueAmounts = totalRevenueRow ? getRowAmounts(totalRevenueRow, isPeriods) : []
    const cashAmounts = cashRow ? getRowAmounts(cashRow, bsPeriods) : []

    const isMultiPeriod = view === "12months" || view === "24months" || view === "years"

    if (isMultiPeriod) {
      let finalAssets: number[]
      let finalLiabilities: number[]
      let finalRevenue: number[]
      let finalCash: number[]

      if (view === "years") {
        const aggAssets = aggregateToYears(assetsAmounts, bsPeriods)
        const aggLiabilities = aggregateToYears(liabilitiesAmounts, bsPeriods)
        const aggRevenue = aggregateToYears(revenueAmounts, isPeriods)
        const aggCash = aggregateToYears(cashAmounts, bsPeriods)
        finalAssets = aggAssets.amounts
        finalLiabilities = aggLiabilities.amounts
        finalRevenue = aggRevenue.amounts
        finalCash = aggCash.amounts
      } else {
        finalAssets = assetsAmounts
        finalLiabilities = liabilitiesAmounts
        finalRevenue = revenueAmounts
        finalCash = cashAmounts
      }

      const len = finalAssets.length
      const trendValues = Array.from({ length: len }, (_, i) => ({
        assets: finalAssets[i] || 0,
        liabilities: finalLiabilities[i] || 0,
        revenue: finalRevenue[i] || 0,
        cash: finalCash[i] || 0,
      }))

      return {
        currentAssets: len > 0 ? finalAssets[len - 1] : 0,
        priorAssets: len > 1 ? finalAssets[len - 2] : 0,
        currentLiabilities: len > 0 ? finalLiabilities[len - 1] : 0,
        priorLiabilities: len > 1 ? finalLiabilities[len - 2] : 0,
        currentRevenue: len > 0 ? finalRevenue[len - 1] : 0,
        priorRevenue: len > 1 ? finalRevenue[len - 2] : 0,
        currentCash: len > 0 ? finalCash[len - 1] : 0,
        priorCash: len > 1 ? finalCash[len - 2] : 0,
        trendValues,
      }
    }

    // Current view - take last and second-to-last values
    const aLen = assetsAmounts.length
    const lLen = liabilitiesAmounts.length
    const rLen = revenueAmounts.length
    const cLen = cashAmounts.length

    return {
      currentAssets: aLen > 0 ? assetsAmounts[aLen - 1] : 0,
      priorAssets: aLen > 1 ? assetsAmounts[aLen - 2] : 0,
      currentLiabilities: lLen > 0 ? liabilitiesAmounts[lLen - 1] : 0,
      priorLiabilities: lLen > 1 ? liabilitiesAmounts[lLen - 2] : 0,
      currentRevenue: rLen > 0 ? revenueAmounts[rLen - 1] : 0,
      priorRevenue: rLen > 1 ? revenueAmounts[rLen - 2] : 0,
      currentCash: cLen > 0 ? cashAmounts[cLen - 1] : 0,
      priorCash: cLen > 1 ? cashAmounts[cLen - 2] : 0,
      trendValues: undefined,
    }
  }, [bsRows, isRows, bsPeriods, isPeriods, view])

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
  const calculateWorkingCapitalExCash = (isPrior: boolean, trendIndex?: number): number => {
    if (trendIndex !== undefined && data.trendValues) {
      const assets = data.trendValues[trendIndex]?.assets || 0
      const cash = data.trendValues[trendIndex]?.cash || 0
      const liabilities = data.trendValues[trendIndex]?.liabilities || 0
      return assets - cash - liabilities
    }
    const assets = isPrior ? data.priorAssets : data.currentAssets
    const cash = isPrior ? data.priorCash : data.currentCash
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
    const assets = getCurrentAssets(isPrior, trendIndex)
    let cash = 0
    if (trendIndex !== undefined && data.trendValues) {
      cash = data.trendValues[trendIndex]?.cash || 0
    } else {
      cash = isPrior ? data.priorCash : data.currentCash
    }
    const liabilities = getCurrentLiabilities(isPrior, trendIndex)
    if (liabilities === 0) return 0
    return (assets - cash) / liabilities
  }

  // Get period labels from API data or fallback to generated labels
  const getPeriodColumnLabels = (count: number): string[] => {
    // Use real labels from balance-sheet periods when available
    if (bsPeriods.length > 0) {
      if (view === "years") {
        const dummyAmounts = bsPeriods.map(() => 0)
        const agg = aggregateToYears(dummyAmounts, bsPeriods)
        return agg.labels
      }
      return bsPeriods.map((p) => p.label)
    }
    // Fallback to generated labels
    if (view === "years") {
      const cy = new Date().getFullYear()
      return Array.from({ length: 6 }, (_, i) => `${cy - 5 + i}`)
    }
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]
    const labels: string[] = []
    const currentDate = new Date()
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      labels.push(`${months[date.getMonth()]} ${date.getFullYear()}`)
    }
    return labels
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

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* No company selected */}
      {!companyId && !loading && (
        <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
          Sélectionnez une société
        </div>
      )}

      {/* No data available */}
      {companyId && !loading && data.currentAssets === 0 && data.priorAssets === 0 && data.currentLiabilities === 0 && !data.trendValues && (
        <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
          Aucune donnée
        </div>
      )}

      {/* Table */}
      {!loading && (companyId ? (data.currentAssets !== 0 || data.priorAssets !== 0 || data.currentLiabilities !== 0 || !!data.trendValues) : false) && (
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
                  {getPeriodColumnLabels(12).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "24months" && (
                <>
                  {getPeriodColumnLabels(24).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {getPeriodColumnLabels(0).map((label, idx) => (
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
                const values = Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => calculateWorkingCapital(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => calculateWorkingCapital(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => calculateWorkingCapital(false, idx))
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
                  {Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => calculateWorkingCapitalExCash(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => calculateWorkingCapitalExCash(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {formatCurrency(average)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => calculateWorkingCapitalExCash(false, idx))
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
                  {Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => calculateFDRRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => calculateFDRRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => calculateFDRRatio(false, idx))
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
                  {Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
                const values = Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => calculateFdRHCRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "24months" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => calculateFdRHCRatio(false, idx))
                const average = values.reduce((sum, val) => sum + val, 0) / values.length
                return (
                  <td className="px-6 py-3.5 text-right text-sm font-semibold font-bold font-semibold text-slate-800 bg-gradient-to-b from-slate-50 to-slate-100/50">
                    {average.toFixed(2)}
                  </td>
                )
              })()}
              {view === "years" && (() => {
                const values = Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => calculateFdRHCRatio(false, idx))
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
                  {Array.from({ length: data.trendValues?.length || 12 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 24 }).map((_, idx) => {
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
                  {Array.from({ length: data.trendValues?.length || 6 }).map((_, idx) => {
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
      )}
    </div>
  )
}

