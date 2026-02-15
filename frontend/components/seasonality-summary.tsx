"use client"

import { formatCurrency, calculateVariation } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import { Company } from "@/components/entity-selector"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToYears } from "@/lib/series-utils"

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
  fiscalYear?: number
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
  fiscalYear,
}: SeasonalitySummaryProps) {
  // --- Series hook for real data ---
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "24months" ? 24 : view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  // Convert series rows to SummaryRow[]
  const getSeriesData = (): SummaryRow[] | null => {
    if (seriesRows.length === 0 || periods.length === 0) return null

    const result: SummaryRow[] = []
    for (const row of seriesRows) {
      const amounts = getRowAmounts(row, periods)
      let trendValues: number[]

      if (view === "years") {
        const agg = aggregateToYears(amounts, periods)
        trendValues = agg.amounts
      } else {
        trendValues = amounts
      }

      result.push({
        label: row.label,
        current: trendValues[trendValues.length - 1] || 0,
        prior: trendValues.length > 1 ? trendValues[trendValues.length - 2] : 0,
        indent: !row.isBold && !row.isSection,
        isBold: row.isBold,
        isSubtotal: row.isResult,
        isSection: row.isSection,
        trendValues,
        accountId: row.id,
      })
    }
    return result
  }

  const getSeriesPeriodLabels = (): string[] | null => {
    if (periods.length === 0) return null
    if (view === "years") {
      const amounts = periods.map(() => 0)
      const agg = aggregateToYears(amounts, periods)
      return agg.labels
    }
    return getPeriodLabels(periods)
  }

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

  // Prefer series data when available
  const seriesData = getSeriesData()
  const seriesLabels = getSeriesPeriodLabels()

  const data = seriesData || []

  // Calculate total revenue for each period
  const getTotalRevenueForPeriod = (periodIndex: number): number => {
    const revenueRows = data.filter((r) => r.accountId && (r.accountId.startsWith("product_") || r.accountId.startsWith("service_")))
    return revenueRows.reduce((sum, row) => {
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

      {/* Loading state */}
      {seriesLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}

      {/* Empty state */}
      {!seriesLoading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-slate-500 text-lg font-medium">Aucune donnée disponible</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-2/5">Compte</th>
              {view === "12months" && (
                <>
                  {(seriesLabels || getMonthLabels(12)).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "24months" && (
                <>
                  {(seriesLabels || getMonthLabels(24)).map((label, idx) => (
                    <th key={idx} className="px-4 py-4 text-right font-semibold text-slate-900 text-sm whitespace-nowrap">
                      {label}
                    </th>
                  ))}
                </>
              )}
              {view === "years" && (
                <>
                  {(seriesLabels || getYearLabels()).map((label, idx) => (
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

