"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, aggregateToQuarters, aggregateToYears, findRow } from "@/lib/series-utils"

export interface CashFlowChartDataPoint {
  period: string
  operating: number
  investing: number
  financing: number
  netCashFlow: number
  cashBalance: number
}

interface CashFlowChartProps {
  period: "monthly" | "quarterly" | "annual"
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years"
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  companies?: Company[]
  fiscalYear?: number
  chartData?: CashFlowChartDataPoint[]
  loading?: boolean
}

type ChartViewType = "operating_investing_financing"

// Helper function to get horizon text
const getHorizonText = (
  view: "comparison" | "ytd" | "ddm" | "12months" | "quarters" | "years",
  period: "monthly" | "quarterly" | "annual"
): string => {
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

export function CashFlowChart({
  period,
  view,
  companyId,
  divisionId,
  subDivisionId,
  companies = [],
  fiscalYear,
  chartData,
  loading = false,
}: CashFlowChartProps) {
  const [selectedChartView] = useState<ChartViewType>("operating_investing_financing")

  // Series data for multi-period chart views
  const isMultiPeriod = view === "12months" || view === "quarters" || view === "years"
  const currentYear = fiscalYear || new Date().getFullYear()
  const monthsNeeded = view === "years" ? 60 : 12

  const { rows: seriesRows, periods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow",
    fiscalYear: currentYear,
    months: monthsNeeded,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: isMultiPeriod,
  })

  // Transform series data into chart data points
  const seriesChartData = useMemo((): CashFlowChartDataPoint[] => {
    if (!seriesRows.length || !periods.length) return []

    const operatingRow = findRow(seriesRows, "exploitation") || findRow(seriesRows, "opérationnel") || findRow(seriesRows, "activités opérationnelles")
    const investingRow = findRow(seriesRows, "investissement") || findRow(seriesRows, "activités d'investissement")
    const financingRow = findRow(seriesRows, "financement") || findRow(seriesRows, "activités de financement")
    const netCashFlowRow = findRow(seriesRows, "flux net") || findRow(seriesRows, "variation de trésorerie") || findRow(seriesRows, "variation nette")

    const getAmounts = (row: typeof operatingRow) => row ? getRowAmounts(row, periods) : periods.map(() => 0)

    const operatingAmounts = getAmounts(operatingRow)
    const investingAmounts = getAmounts(investingRow)
    const financingAmounts = getAmounts(financingRow)
    const netCashFlowAmounts = getAmounts(netCashFlowRow)

    if (view === "quarters") {
      const labels = aggregateToQuarters(operatingAmounts, periods).labels
      const op = aggregateToQuarters(operatingAmounts, periods).amounts
      const inv = aggregateToQuarters(investingAmounts, periods).amounts
      const fin = aggregateToQuarters(financingAmounts, periods).amounts
      const net = aggregateToQuarters(netCashFlowAmounts, periods).amounts

      return labels.map((label, i) => ({
        period: label,
        operating: op[i],
        investing: inv[i],
        financing: fin[i],
        netCashFlow: net[i],
        cashBalance: 0,
      }))
    }

    if (view === "years") {
      const labels = aggregateToYears(operatingAmounts, periods).labels
      const op = aggregateToYears(operatingAmounts, periods).amounts
      const inv = aggregateToYears(investingAmounts, periods).amounts
      const fin = aggregateToYears(financingAmounts, periods).amounts
      const net = aggregateToYears(netCashFlowAmounts, periods).amounts

      return labels.map((label, i) => ({
        period: label,
        operating: op[i],
        investing: inv[i],
        financing: fin[i],
        netCashFlow: net[i],
        cashBalance: 0,
      }))
    }

    // 12months - monthly
    const labels = getPeriodLabels(periods)
    return labels.map((label, i) => ({
      period: label,
      operating: operatingAmounts[i],
      investing: investingAmounts[i],
      financing: financingAmounts[i],
      netCashFlow: netCashFlowAmounts[i],
      cashBalance: 0,
    }))
  }, [seriesRows, periods, view])

  // Use series chart data when in multi-period mode, otherwise use prop
  const effectiveChartData = isMultiPeriod ? seriesChartData : chartData
  const effectiveLoading = loading || (isMultiPeriod && seriesLoading)

  // Loading state
  if (effectiveLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/80 shadow-lg mb-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  // Empty state
  if (!effectiveChartData || effectiveChartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-slate-200/80 shadow-lg mb-6">
        <p className="text-slate-400">Aucune donnée disponible</p>
      </div>
    )
  }

  // Helper function to get base title
  const getBaseTitle = (): string => {
    return "Structure des flux de trésorerie"
  }

  const chartConfig = {
    operating: {
      label: "Flux opérationnels",
      color: "#3b82f6",
    },
    investing: {
      label: "Flux d'investissement",
      color: "#ef4444",
    },
    financing: {
      label: "Flux de financement",
      color: "#10b981",
    },
    netCashFlow: {
      label: "Flux net",
      color: "#8b5cf6",
    },
  }

  // Calculate totals for metrics panel
  const totalOperating = effectiveChartData.reduce((sum, d) => sum + d.operating, 0)
  const totalInvesting = effectiveChartData.reduce((sum, d) => sum + d.investing, 0)
  const totalFinancing = effectiveChartData.reduce((sum, d) => sum + d.financing, 0)

  // Helper function to get entity text
  const getEntityText = (): string => {
    if (subDivisionId && divisionId && companyId) {
      const company = companies.find((c) => c.id === companyId)
      const division = company?.divisions.find((d) => d.id === divisionId)
      const subDivision = division?.subDivisions.find((sd) => sd.id === subDivisionId)
      return `${company?.name || ""} • ${division?.name || ""} • ${subDivision?.name || ""}`
    }
    if (divisionId && companyId) {
      const company = companies.find((c) => c.id === companyId)
      const division = company?.divisions.find((d) => d.id === divisionId)
      return `${company?.name || ""} • ${division?.name || ""}`
    }
    if (companyId) {
      const company = companies.find((c) => c.id === companyId)
      return company?.name || "Société sélectionnée"
    }
    return "Toutes les sociétés"
  }

  return (
    <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border border-slate-200/80 shadow-lg mb-6 overflow-hidden">
      {/* Header Section */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{getBaseTitle()}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-700 flex-wrap">
                <span className="font-medium">{getHorizonText(view, period)}</span>
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
            {/* Operating Cash Flow */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Flux opérationnels</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(totalOperating)}
              </div>
              {(() => {
                const lastData = effectiveChartData[effectiveChartData.length - 1]
                const previousData = effectiveChartData.length > 1 ? effectiveChartData[effectiveChartData.length - 2] : null
                const currentValue = lastData.operating || 0
                const previousValue = previousData?.operating || 0
                const variation = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue) * 100) : 0
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
            
            {/* Investing Cash Flow */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Flux d'investissement</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(totalInvesting)}
              </div>
              {(() => {
                const lastData = effectiveChartData[effectiveChartData.length - 1]
                const previousData = effectiveChartData.length > 1 ? effectiveChartData[effectiveChartData.length - 2] : null
                const currentValue = lastData.investing || 0
                const previousValue = previousData?.investing || 0
                const variation = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue) * 100) : 0
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
            
            {/* Financing Cash Flow */}
            <div className="pb-3">
              <div className="text-xs font-medium text-slate-500 mb-1">Flux de financement</div>
              <div className="text-xl font-semibold text-slate-900 mb-1.5">
                {formatCurrency(totalFinancing)}
              </div>
              {(() => {
                const lastData = effectiveChartData[effectiveChartData.length - 1]
                const previousData = effectiveChartData.length > 1 ? effectiveChartData[effectiveChartData.length - 2] : null
                const currentValue = lastData.financing || 0
                const previousValue = previousData?.financing || 0
                const variation = previousValue !== 0 ? ((currentValue - previousValue) / Math.abs(previousValue) * 100) : 0
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
          <ComposedChart data={effectiveChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                    <div className="bg-slate-900/95 border border-slate-700 rounded-lg shadow-xl p-3 backdrop-blur-md">
                      <p className="text-sm font-semibold text-white mb-2">{payload[0].payload.period}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          ></div>
                          <span className="text-xs text-slate-300">{entry.name}:</span>
                          <span className="text-xs font-bold text-white">
                            {formatCurrency(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              }}
            />
            <ChartLegend content={<ChartLegendContent />} />
            
            {selectedChartView === "operating_investing_financing" && (
              <>
                {/* Operating Cash Flow - Bar */}
                <Bar
                  yAxisId="left"
                  dataKey="operating"
                  fill={chartConfig.operating.color}
                  radius={[4, 4, 0, 0]}
                  name={chartConfig.operating.label}
                />
                {/* Investing Cash Flow - Bar */}
                <Bar
                  yAxisId="left"
                  dataKey="investing"
                  fill={chartConfig.investing.color}
                  radius={[4, 4, 0, 0]}
                  name={chartConfig.investing.label}
                />
                {/* Financing Cash Flow - Bar */}
                <Bar
                  yAxisId="left"
                  dataKey="financing"
                  fill={chartConfig.financing.color}
                  radius={[4, 4, 0, 0]}
                  name={chartConfig.financing.label}
                />
                {/* Net Cash Flow - Line */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="netCashFlow"
                  stroke={chartConfig.netCashFlow.color}
                  strokeWidth={3}
                  dot={{ fill: chartConfig.netCashFlow.color, r: 5 }}
                  activeDot={{ r: 7 }}
                  name={chartConfig.netCashFlow.label}
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

