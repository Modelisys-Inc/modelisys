"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, ChevronDown, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { dashboardCardFrameClass, dashboardCardRingClass } from "@/lib/dashboard-card-style"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import {
  aggregateToQuarters,
  aggregateToYears,
  findRow,
  getPeriodLabels,
  getRowAmounts,
  reverseSeriesOrderForDisplay,
} from "@/lib/series-utils"
import { getHorizonModeLabel } from "@/lib/financial-statement-horizon-labels"

export interface BalanceSheetChartDataPoint {
  period: string
  currentAssets: number
  nonCurrentAssets: number
  totalAssets: number
  currentLiabilities: number
  nonCurrentLiabilities: number
  totalLiabilities: number
  equity: number
  debtToEquityRatio: number
}

interface BalanceSheetChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  fiscalYear?: number
  chartData?: BalanceSheetChartDataPoint[]
  loading?: boolean
}

type ChartViewType = "assets_liabilities_equity" | "current_noncurrent" | "debt_equity_ratio"

const dashboardStyleCard = cn(dashboardCardFrameClass, "z-10 transition-all duration-500 ease-out")
const dashboardStyleCardAccent = dashboardCardRingClass

export function BalanceSheetChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  fiscalYear,
  chartData,
  loading = false,
}: BalanceSheetChartProps) {
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>("assets_liabilities_equity")

  // Series data for multi-period chart views
  const isMultiPeriod = view === "12months" || view === "quarters" || view === "years"
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !chartData,
  })

  // Transform series data into chart data points
  const seriesChartData = useMemo((): BalanceSheetChartDataPoint[] => {
    if (!seriesRows.length || !periods.length) return []

    const currentAssetsRow = findRow(seriesRows, "actifs courants")
    const nonCurrentAssetsRow = findRow(seriesRows, "actifs non courants")
    const totalAssetsRow = findRow(seriesRows, "total des actifs")
    const currentLiabilitiesRow = findRow(seriesRows, "passifs courants") || findRow(seriesRows, "passif courant")
    const nonCurrentLiabilitiesRow = findRow(seriesRows, "passifs non courants") || findRow(seriesRows, "passif non courant")
    const totalLiabilitiesRow = findRow(seriesRows, "total des passifs")
    const equityRow = findRow(seriesRows, "capitaux propres") || findRow(seriesRows, "total capitaux propres")

    const getAmounts = (row: typeof currentAssetsRow) => row ? getRowAmounts(row, periods) : periods.map(() => 0)

    const currentAssetsAmounts = getAmounts(currentAssetsRow)
    const nonCurrentAssetsAmounts = getAmounts(nonCurrentAssetsRow)
    const totalAssetsAmounts = getAmounts(totalAssetsRow)
    const currentLiabilitiesAmounts = getAmounts(currentLiabilitiesRow)
    const nonCurrentLiabilitiesAmounts = getAmounts(nonCurrentLiabilitiesRow)
    const totalLiabilitiesAmounts = getAmounts(totalLiabilitiesRow)
    const equityAmounts = getAmounts(equityRow)

    // Decide whether to aggregate
    if (view === "quarters") {
      const labels = aggregateToQuarters(currentAssetsAmounts, periods, "last").labels
      const ca = aggregateToQuarters(currentAssetsAmounts, periods, "last").amounts
      const nca = aggregateToQuarters(nonCurrentAssetsAmounts, periods, "last").amounts
      const ta = aggregateToQuarters(totalAssetsAmounts, periods, "last").amounts
      const cl = aggregateToQuarters(currentLiabilitiesAmounts, periods, "last").amounts
      const ncl = aggregateToQuarters(nonCurrentLiabilitiesAmounts, periods, "last").amounts
      const tl = aggregateToQuarters(totalLiabilitiesAmounts, periods, "last").amounts
      const eq = aggregateToQuarters(equityAmounts, periods, "last").amounts

      return reverseSeriesOrderForDisplay(
        labels.map((label, i) => ({
          period: label,
          currentAssets: ca[i],
          nonCurrentAssets: nca[i],
          totalAssets: ta[i],
          currentLiabilities: cl[i],
          nonCurrentLiabilities: ncl[i],
          totalLiabilities: tl[i],
          equity: eq[i],
          debtToEquityRatio: eq[i] !== 0 ? (tl[i] / eq[i]) * 100 : 0,
        }))
      )
    }

    if (view === "years") {
      const labels = aggregateToYears(currentAssetsAmounts, periods, "last").labels
      const ca = aggregateToYears(currentAssetsAmounts, periods, "last").amounts
      const nca = aggregateToYears(nonCurrentAssetsAmounts, periods, "last").amounts
      const ta = aggregateToYears(totalAssetsAmounts, periods, "last").amounts
      const cl = aggregateToYears(currentLiabilitiesAmounts, periods, "last").amounts
      const ncl = aggregateToYears(nonCurrentLiabilitiesAmounts, periods, "last").amounts
      const tl = aggregateToYears(totalLiabilitiesAmounts, periods, "last").amounts
      const eq = aggregateToYears(equityAmounts, periods, "last").amounts

      return reverseSeriesOrderForDisplay(
        labels.map((label, i) => ({
          period: label,
          currentAssets: ca[i],
          nonCurrentAssets: nca[i],
          totalAssets: ta[i],
          currentLiabilities: cl[i],
          nonCurrentLiabilities: ncl[i],
          totalLiabilities: tl[i],
          equity: eq[i],
          debtToEquityRatio: eq[i] !== 0 ? (tl[i] / eq[i]) * 100 : 0,
        }))
      )
    }

    // 12months - monthly
    const labels = getPeriodLabels(periods)
    return reverseSeriesOrderForDisplay(
      labels.map((label, i) => ({
        period: label,
        currentAssets: currentAssetsAmounts[i],
        nonCurrentAssets: nonCurrentAssetsAmounts[i],
        totalAssets: totalAssetsAmounts[i],
        currentLiabilities: currentLiabilitiesAmounts[i],
        nonCurrentLiabilities: nonCurrentLiabilitiesAmounts[i],
        totalLiabilities: totalLiabilitiesAmounts[i],
        equity: equityAmounts[i],
        debtToEquityRatio: equityAmounts[i] !== 0 ? (totalLiabilitiesAmounts[i] / equityAmounts[i]) * 100 : 0,
      }))
    )
  }, [seriesRows, periods, view])

  // Use series chart data when no chartData prop provided
  const effectiveChartData = chartData || (seriesChartData.length > 0 ? seriesChartData : undefined)
  const effectiveLoading = loading || (!chartData && seriesLoading)

  // Loading state
  if (effectiveLoading) {
    return (
      <div className={cn("relative mb-6 flex h-64 items-center justify-center", dashboardStyleCard)}>
        <div className={dashboardStyleCardAccent} aria-hidden />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  // Empty state
  if (!effectiveChartData || effectiveChartData.length === 0) {
    return (
      <div className={cn("relative mb-6 flex h-64 items-center justify-center", dashboardStyleCard)}>
        <div className={dashboardStyleCardAccent} aria-hidden />
        <p className="relative text-sm text-[#5C5F66]">Aucune donnée disponible</p>
      </div>
    )
  }

  // Calculate averages
  const avgAssets = effectiveChartData.reduce((sum, d) => sum + (d.totalAssets || 0), 0) / effectiveChartData.length
  const avgLiabilities = effectiveChartData.reduce((sum, d) => sum + (d.totalLiabilities || 0), 0) / effectiveChartData.length
  const avgEquity = effectiveChartData.reduce((sum, d) => sum + (d.equity || 0), 0) / effectiveChartData.length

  const getHorizonText = (): string => getHorizonModeLabel(view, period)

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
    <div className={cn("group mb-6", dashboardStyleCard)}>
      <div className={dashboardStyleCardAccent} aria-hidden />
      {/* Header Section */}
      <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <BarChart3 className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <Select value={selectedChartView} onValueChange={(value) => setSelectedChartView(value as ChartViewType)}>
                <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 mb-1 [&>svg:last-child]:hidden">
                  <h3 className="text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">{getBaseTitle()}</h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assets_liabilities_equity">Structure du bilan</SelectItem>
                  <SelectItem value="current_noncurrent">Structure de l'actif et du passif</SelectItem>
                  <SelectItem value="debt_equity_ratio">Capitaux propres</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5F66]">
                <span className="font-medium text-slate-700">{getHorizonText()}</span>
                <span className="text-slate-300">•</span>
                {subDivisionId && divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-300">•</span>
                    <span>{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-[#2A2F3A]">
                      {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}
                    </span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-[#2A2F3A]">
                      {companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}
                    </span>
                  </>
                ) : companyId ? (
                  <span className="font-semibold text-[#2A2F3A]">
                    {companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}
                  </span>
                ) : (
                  <span className="truncate">{getEntityText()}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section - Two Column Layout */}
      <div className="relative bg-white px-6 py-6 sm:px-7">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Key Metrics */}
          <div className="lg:col-span-1">
            {/* Total Assets */}
            <div className="pb-3">
              <div className="mb-1 text-xs font-medium text-[#5C5F66]">Actifs totaux</div>
              <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">
                {formatCurrency(effectiveChartData.reduce((sum, d) => sum + (d.totalAssets || 0), 0))}
              </div>
              {(() => {
                const lastData = effectiveChartData[effectiveChartData.length - 1]
                const previousData = effectiveChartData.length > 1 ? effectiveChartData[effectiveChartData.length - 2] : null
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
              <div className="mb-1 text-xs font-medium text-[#5C5F66]">Passifs totaux</div>
              <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">
                {formatCurrency(effectiveChartData.reduce((sum, d) => sum + (d.totalLiabilities || 0), 0))}
              </div>
              {(() => {
                const lastData = effectiveChartData[effectiveChartData.length - 1]
                const previousData = effectiveChartData.length > 1 ? effectiveChartData[effectiveChartData.length - 2] : null
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
              <div className="mb-1 text-xs font-medium text-[#5C5F66]">Capitaux propres</div>
              <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">
                {formatCurrency(effectiveChartData.reduce((sum, d) => sum + (d.equity || 0), 0))}
              </div>
              {(() => {
                const lastData = effectiveChartData[effectiveChartData.length - 1]
                const previousData = effectiveChartData.length > 1 ? effectiveChartData[effectiveChartData.length - 2] : null
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
          <ComposedChart data={effectiveChartData} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="period"
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
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
            {/* assets_liabilities_equity view — no fragment wrapper (React 19 compat) */}
            {selectedChartView === "assets_liabilities_equity" && <Bar dataKey="currentAssets" fill="#3b82f6" name="Actif à court terme" stackId="assets" radius={[0, 0, 0, 0]} />}
            {selectedChartView === "assets_liabilities_equity" && <Bar dataKey="nonCurrentAssets" fill="#60a5fa" name="Actif à long terme" stackId="assets" radius={[4, 4, 0, 0]} />}
            {selectedChartView === "assets_liabilities_equity" && <Bar dataKey="currentLiabilities" fill="#ef4444" name="Passif à court terme" stackId="liabilities" radius={[0, 0, 0, 0]} />}
            {selectedChartView === "assets_liabilities_equity" && <Bar dataKey="nonCurrentLiabilities" fill="#f87171" name="Passif à long terme" stackId="liabilities" radius={[4, 4, 0, 0]} />}
            {selectedChartView === "assets_liabilities_equity" && <Bar dataKey="equity" fill="#10b981" name="Capitaux propres" radius={[4, 4, 0, 0]} />}
            {/* current_noncurrent view */}
            {selectedChartView === "current_noncurrent" && <Bar dataKey="currentAssets" fill="#3b82f6" name="Actifs courants" radius={[4, 4, 0, 0]} />}
            {selectedChartView === "current_noncurrent" && <Bar dataKey="nonCurrentAssets" fill="#60a5fa" name="Actifs non courants" radius={[4, 4, 0, 0]} />}
            {selectedChartView === "current_noncurrent" && <Bar dataKey="currentLiabilities" fill="#ef4444" name="Passifs courants" radius={[4, 4, 0, 0]} />}
            {selectedChartView === "current_noncurrent" && <Bar dataKey="nonCurrentLiabilities" fill="#f87171" name="Passifs non courants" radius={[4, 4, 0, 0]} />}
            {/* debt_equity_ratio view */}
            {selectedChartView === "debt_equity_ratio" && <defs><linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/></linearGradient></defs>}
            {selectedChartView === "debt_equity_ratio" && <Area type="monotone" dataKey="equity" stroke="#10b981" strokeWidth={3} fill="url(#equityGradient)" fillOpacity={0.6} dot={{ fill: "#10b981", r: 5 }} activeDot={{ r: 7 }} name="Capitaux propres" />}
            {selectedChartView === "debt_equity_ratio" && <ReferenceLine y={avgEquity} stroke="#10b981" strokeDasharray="6 4" strokeWidth={2} strokeOpacity={0.6} label={{ value: `Moyenne: ${formatCurrency(avgEquity)}`, position: "right", fill: "#10b981", fontSize: 11 }} />}
          </ComposedChart>
        </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

