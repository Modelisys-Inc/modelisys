"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { Company } from "@/components/entity-selector"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, findRow, aggregateToQuarters, aggregateToYears } from "@/lib/series-utils"
import { cn } from "@/lib/utils"
import { dashboardCardFrameClass, dashboardCardRingClass } from "@/lib/dashboard-card-style"

export interface IncomeStatementChartDataPoint {
  period: string
  revenue: number
  cogs: number
  grossProfit: number
  ebita: number
  grossMarginPercent: number
}

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
  fiscalYear?: number
  chartData?: IncomeStatementChartDataPoint[]
  loading?: boolean
  structureVersion?: number
}

type ChartViewType = "revenue_ebita_margin" | "cogs_grossprofit_margin"

const dashboardStyleCard = cn(dashboardCardFrameClass, "z-10 transition-all duration-500 ease-out")
const dashboardStyleCardAccent = dashboardCardRingClass

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
  fiscalYear,
  chartData,
  loading = false,
  structureVersion = 0,
}: IncomeStatementChartProps) {
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>("revenue_ebita_margin")
  const [showRevenue, setShowRevenue] = useState(true)
  const [showEBITA, setShowEBITA] = useState(true)
  const [showGrossMargin, setShowGrossMargin] = useState(true)

  // Fetch series data when no chartData prop is provided
  const seriesMonthsNeeded = view === "years" ? 72 : view === "quarters" ? 15 : 12
  const { rows: seriesRows, periods: seriesPeriods, loading: seriesLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "income-statement",
    fiscalYear: fiscalYear || new Date().getFullYear(),
    months: seriesMonthsNeeded,
    divisionId: divisionId || undefined,
    subDivisionId: subDivisionId || undefined,
    enabled: !chartData,
    structureVersion,
  })

  // Build chart data from series API when no chartData prop
  const seriesChartData = useMemo((): IncomeStatementChartDataPoint[] | null => {
    if (chartData || !seriesRows.length || !seriesPeriods.length) return null
    const revenueRow = findRow(seriesRows, "revenus")
    const cogsRow = seriesRows.find(r => r.label.toLowerCase().includes("coût") && r.isResult)
    const grossProfitRow = findRow(seriesRows, "bénéfice brut")
    const ebitaRow = findRow(seriesRows, "baiia")
    if (!revenueRow) return null

    const revenueAmounts = getRowAmounts(revenueRow, seriesPeriods)
    const cogsAmounts = cogsRow ? getRowAmounts(cogsRow, seriesPeriods) : revenueAmounts.map(() => 0)
    const grossProfitAmounts = grossProfitRow ? getRowAmounts(grossProfitRow, seriesPeriods) : revenueAmounts.map((r, i) => r - cogsAmounts[i])
    const ebitaAmounts = ebitaRow ? getRowAmounts(ebitaRow, seriesPeriods) : grossProfitAmounts

    if (view === "quarters") {
      const labels = aggregateToQuarters(revenueAmounts, seriesPeriods).labels
      const rev = aggregateToQuarters(revenueAmounts, seriesPeriods).amounts
      const cogs = aggregateToQuarters(cogsAmounts, seriesPeriods).amounts
      const gp = aggregateToQuarters(grossProfitAmounts, seriesPeriods).amounts
      const eb = aggregateToQuarters(ebitaAmounts, seriesPeriods).amounts
      return labels.map((label, i) => ({
        period: label,
        revenue: rev[i],
        cogs: cogs[i],
        grossProfit: gp[i],
        ebita: eb[i],
        grossMarginPercent: rev[i] !== 0 ? (gp[i] / rev[i]) * 100 : 0,
      }))
    }
    if (view === "years") {
      const labels = aggregateToYears(revenueAmounts, seriesPeriods).labels
      const rev = aggregateToYears(revenueAmounts, seriesPeriods).amounts
      const cogs = aggregateToYears(cogsAmounts, seriesPeriods).amounts
      const gp = aggregateToYears(grossProfitAmounts, seriesPeriods).amounts
      const eb = aggregateToYears(ebitaAmounts, seriesPeriods).amounts
      return labels.map((label, i) => ({
        period: label,
        revenue: rev[i],
        cogs: cogs[i],
        grossProfit: gp[i],
        ebita: eb[i],
        grossMarginPercent: rev[i] !== 0 ? (gp[i] / rev[i]) * 100 : 0,
      }))
    }
    // Monthly
    const labels = getPeriodLabels(seriesPeriods)
    return labels.map((label, i) => ({
      period: label,
      revenue: revenueAmounts[i],
      cogs: cogsAmounts[i],
      grossProfit: grossProfitAmounts[i],
      ebita: ebitaAmounts[i],
      grossMarginPercent: revenueAmounts[i] !== 0 ? (grossProfitAmounts[i] / revenueAmounts[i]) * 100 : 0,
    }))
  }, [chartData, seriesRows, seriesPeriods, view])

  // Use prop data or series-derived data
  const effectiveChartData = chartData || seriesChartData
  const effectiveLoading = loading || (seriesLoading && !chartData)

  // Loading state
  if (effectiveLoading) {
    return (
      <div className={`mb-6 flex h-64 items-center justify-center ${dashboardStyleCard}`}>
        <div className={dashboardStyleCardAccent} aria-hidden />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E0742D]" />
      </div>
    )
  }

  // Empty state
  if (!effectiveChartData || effectiveChartData.length === 0) {
    return (
      <div className={`mb-6 flex h-64 items-center justify-center ${dashboardStyleCard}`}>
        <div className={dashboardStyleCardAccent} aria-hidden />
        <p className="relative text-sm text-[#5C5F66]">Aucune donnée disponible</p>
      </div>
    )
  }

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
          return "Performance financière"
        case "cogs_grossprofit_margin":
          return `CMV, Bénéfice Brut et Marge brute - Mois courant vs ${comparisonLabel}`
        default:
          return "Performance financière"
      }
    }
    switch (selectedChartView) {
      case "revenue_ebita_margin":
        return "Performance financière"
      case "cogs_grossprofit_margin":
        return "CMV, Bénéfice Brut et Marge brute"
      default:
        return "Performance financière"
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
    <div className={`group mb-6 ${dashboardStyleCard}`}>
      <div className={dashboardStyleCardAccent} aria-hidden />
      {/* Header Section */}
      <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <TrendingUp className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <Select value={selectedChartView} onValueChange={(value) => setSelectedChartView(value as ChartViewType)}>
                <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 w-auto inline-flex items-center gap-2 mb-1 [&>svg:last-child]:hidden">
                  <h3 className="text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">{getBaseTitle()}</h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue_ebita_margin">Performance financière</SelectItem>
                  <SelectItem value="cogs_grossprofit_margin">CMV, Bénéfice Brut et Marge brute</SelectItem>
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
                    <span className="font-semibold text-[#2A2F3A]">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.subDivisions.find((sd) => sd.id === subDivisionId)?.name || "Sous-division"}</span>
                  </>
                ) : divisionId && companyId ? (
                  <>
                    <span>{companies.find((c) => c.id === companyId)?.name || "Société"}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-[#2A2F3A]">{companies.find((c) => c.id === companyId)?.divisions.find((d) => d.id === divisionId)?.name || "Division"}</span>
                  </>
                ) : companyId ? (
                  <span className="font-semibold text-[#2A2F3A]">{companies.find((c) => c.id === companyId)?.name || "Société sélectionnée"}</span>
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
      <div className="relative bg-white px-6 py-6 sm:px-7">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Key Metrics */}
          <div className="lg:col-span-1">
            {/* Total Revenue */}
            <div className="pb-3">
              <div className="mb-1 text-xs font-medium text-[#5C5F66]">Revenus totaux</div>
              <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">
                {formatCurrency(effectiveChartData.reduce((sum, d) => sum + (d.revenue || 0), 0))}
              </div>
              {(() => {
                const lastData = effectiveChartData[effectiveChartData.length - 1]
                const hasPrevious = 'revenuePrevious' in lastData && (lastData as any).revenuePrevious
                const variation = hasPrevious
                  ? lastData.revenue - (lastData as any).revenuePrevious
                  : effectiveChartData.length > 1
                    ? lastData.revenue - effectiveChartData[effectiveChartData.length - 2].revenue
                    : 0
                const variationPercent = hasPrevious && (lastData as any).revenuePrevious > 0
                  ? ((lastData.revenue - (lastData as any).revenuePrevious) / (lastData as any).revenuePrevious * 100)
                  : effectiveChartData.length > 1 && effectiveChartData[effectiveChartData.length - 2].revenue > 0
                  ? ((lastData.revenue - effectiveChartData[effectiveChartData.length - 2].revenue) / effectiveChartData[effectiveChartData.length - 2].revenue * 100)
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
                {formatCurrency(effectiveChartData.reduce((sum, d) => sum + (d.ebita || 0), 0) / effectiveChartData.length)}
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  {((effectiveChartData.reduce((sum, d) => sum + (d.ebita || 0), 0) / effectiveChartData.length) /
                    (effectiveChartData.reduce((sum, d) => sum + (d.revenue || 0), 0) / effectiveChartData.length) * 100).toFixed(0)}% des revenus
                </span>
              </div>
            </div>
            
            {/* Separator */}
            <div className="border-b border-slate-200 my-3"></div>
            
            {/* Gross Margin */}
            <div>
              <div className="mb-1 text-xs font-medium text-[#5C5F66]">Marge brute</div>
              <div className="mb-1.5 text-xl font-semibold text-[#2A2F3A]">
                {formatCurrency(
                  (effectiveChartData.reduce((sum, d) => sum + (d.grossProfit || 0), 0) / effectiveChartData.length)
                )}
              </div>
              <div className="text-xs">
                <span className="text-slate-500">
                  {(effectiveChartData.reduce((sum, d) => sum + (d.grossMarginPercent || 0), 0) / effectiveChartData.length).toFixed(0)}% des revenus
                </span>
              </div>
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
            {/* Conditional rendering — no fragment wrappers (React 19 compat: fragments break Recharts child detection) */}
            {selectedChartView === "revenue_ebita_margin" && showRevenue && <Bar yAxisId="left" dataKey="revenue" fill={chartConfig.revenue.color} radius={[4, 4, 0, 0]} opacity={0.8} name={chartConfig.revenue.label} />}
            {selectedChartView === "revenue_ebita_margin" && showEBITA && <Bar yAxisId="left" dataKey="ebita" fill={chartConfig.ebita.color} radius={[4, 4, 0, 0]} opacity={0.8} name={chartConfig.ebita.label} />}
            {selectedChartView === "revenue_ebita_margin" && showGrossMargin && <Line yAxisId="right" type="monotone" dataKey="grossMarginPercent" stroke={chartConfig.grossMarginPercent.color} strokeWidth={3} dot={{ fill: chartConfig.grossMarginPercent.color, r: 5 }} activeDot={{ r: 7 }} name={chartConfig.grossMarginPercent.label} />}
            {selectedChartView === "cogs_grossprofit_margin" && <Bar yAxisId="left" dataKey="cogs" fill={chartConfig.cogs.color} radius={[0, 0, 0, 0]} opacity={0.8} name={chartConfig.cogs.label} stackId="revenue" />}
            {selectedChartView === "cogs_grossprofit_margin" && <Bar yAxisId="left" dataKey="grossProfit" fill={chartConfig.grossProfit.color} radius={[4, 4, 0, 0]} opacity={0.8} name={chartConfig.grossProfit.label} stackId="revenue" />}
            {selectedChartView === "cogs_grossprofit_margin" && <Line yAxisId="right" type="monotone" dataKey="grossMarginPercent" stroke={chartConfig.grossMarginPercent.color} strokeWidth={3} dot={{ fill: chartConfig.grossMarginPercent.color, r: 5 }} activeDot={{ r: 7 }} name={chartConfig.grossMarginPercent.label} />}
            <ReferenceLine yAxisId="left" y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
          </ComposedChart>
        </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

