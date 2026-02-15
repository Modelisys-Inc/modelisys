"use client"

import { useState, useMemo } from "react"
import { formatCurrency } from "@/lib/financial-utils"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RefreshCw, MoreVertical, Search } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFinancialStatementSeries } from "@/hooks/use-financial-statement-series"
import { getRowAmounts, getPeriodLabels, findRow } from "@/lib/series-utils"

interface TreasuryAnalysisProps {
  companyId?: string | null
  divisionId?: string | null
  subDivisionId?: string | null
  fiscalYear?: number
}

interface TreasuryData {
  month: string
  treasuryStart: number
  receipts: number
  disbursements: number
  treasuryEnd: number
  isProjected: boolean
  receiptPercentage?: number
  receiptsForecast?: number
  disbursementsForecast?: number
}

const chartConfig = {
  treasury: {
    label: "Trésorerie",
    color: "hsl(210, 100%, 70%)",
  },
  receipts: {
    label: "Encaissements",
    color: "hsl(142, 71%, 45%)",
  },
  disbursements: {
    label: "Décaissements",
    color: "hsl(0, 84%, 60%)",
  },
}

// Format currency for display (simplified)
const formatCurrencyDisplay = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} M€`
  }
  return formatCurrency(value).replace("$", "€")
}

export function TreasuryAnalysis({
  companyId,
  divisionId,
  subDivisionId,
  fiscalYear,
}: TreasuryAnalysisProps) {
  const [selectedProject, setSelectedProject] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("jan-dec")
  const [selectedScenario, setSelectedScenario] = useState("main")
  const [selectedView, setSelectedView] = useState("consolidated")

  const currentYear = fiscalYear || new Date().getFullYear()

  // Fetch cash-flow series data
  const { rows: cfRows, periods: cfPeriods, loading: cfLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "cash-flow",
    fiscalYear: currentYear,
    months: 12,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  // Fetch balance-sheet series data (for cash / treasury position)
  const { rows: bsRows, periods: bsPeriods, loading: bsLoading } = useFinancialStatementSeries({
    companyId: companyId || null,
    statementType: "balance-sheet",
    fiscalYear: currentYear,
    months: 12,
    divisionId: divisionId || null,
    subDivisionId: subDivisionId || null,
    enabled: !!companyId,
  })

  const loading = cfLoading || bsLoading

  // Build treasury data from API rows
  const { data, currentTreasury } = useMemo(() => {
    if (!cfPeriods.length || !cfRows.length) {
      return { data: [] as TreasuryData[], currentTreasury: 0 }
    }

    const periodLabels = getPeriodLabels(cfPeriods)

    // Find cash flow rows
    const operatingRow = findRow(cfRows, "exploitation") || findRow(cfRows, "activités opérat")
    const investingRow = findRow(cfRows, "investissement")
    const financingRow = findRow(cfRows, "financement")
    // Net cash flow is the total / result row
    const netCashFlowRow = findRow(cfRows, "variation de trésorerie") || findRow(cfRows, "flux net") || findRow(cfRows, "variation nette")

    // Use the most meaningful rows as receipts/disbursements proxy
    // Operating inflows approximate receipts, investing + financing outflows approximate disbursements
    const operatingAmounts = operatingRow ? getRowAmounts(operatingRow, cfPeriods) : cfPeriods.map(() => 0)
    const investingAmounts = investingRow ? getRowAmounts(investingRow, cfPeriods) : cfPeriods.map(() => 0)
    const financingAmounts = financingRow ? getRowAmounts(financingRow, cfPeriods) : cfPeriods.map(() => 0)
    const netAmounts = netCashFlowRow ? getRowAmounts(netCashFlowRow, cfPeriods) : cfPeriods.map(() => 0)

    // Find treasury position from balance sheet (cash & equivalents)
    const treasuryBsRow = findRow(bsRows, "trésorerie") || findRow(bsRows, "encaisse") || findRow(bsRows, "liquidité")
    const treasuryBsAmounts = treasuryBsRow && bsPeriods.length ? getRowAmounts(treasuryBsRow, bsPeriods) : null

    // Build the treasury data array
    const result: TreasuryData[] = cfPeriods.map((period, i) => {
      // Positive operating cash flow = receipts, negative = disbursement contribution
      const receipts = Math.max(operatingAmounts[i], 0)
      // Disbursements: absolute value of negative operating + negative investing + negative financing
      const disbursements = Math.abs(Math.min(operatingAmounts[i], 0))
        + Math.abs(Math.min(investingAmounts[i], 0))
        + Math.abs(Math.min(financingAmounts[i], 0))

      // Treasury from balance sheet if available
      const treasuryEnd = treasuryBsAmounts ? treasuryBsAmounts[i] : 0
      const treasuryStart = i > 0 && treasuryBsAmounts ? treasuryBsAmounts[i - 1] : 0

      return {
        month: periodLabels[i].toUpperCase(),
        treasuryStart,
        receipts: receipts + Math.max(investingAmounts[i], 0) + Math.max(financingAmounts[i], 0),
        disbursements,
        treasuryEnd,
        isProjected: false,
      }
    })

    const lastTreasury = treasuryBsAmounts && treasuryBsAmounts.length > 0
      ? treasuryBsAmounts[treasuryBsAmounts.length - 1]
      : 0

    return { data: result, currentTreasury: lastTreasury }
  }, [cfRows, cfPeriods, bsRows, bsPeriods])

  // Treasury trend: use treasuryEnd for each period, scaled for chart visualization
  const treasuryTrend = useMemo(() => {
    if (!data.length) return [] as number[]
    const maxVal = Math.max(...data.map(d => Math.abs(d.treasuryEnd)), 1)
    // Normalize to 0-250K range for the chart Y-axis
    return data.map(d => d.treasuryEnd === 0 ? 0 : (d.treasuryEnd / maxVal) * 250000)
  }, [data])

  // Format data for chart
  const chartData = data.map((item, index) => ({
    ...item,
    treasuryTrend: treasuryTrend[index] || 0,
    treasuryTrendSolid: treasuryTrend[index] || 0,
    receiptsChart: item.receipts / 1000,
    disbursementsChart: item.disbursements / 1000,
  }))

  // Y-axis settings
  const yAxisMaxTreasury = 250000
  const yAxisMaxBars = useMemo(() => {
    if (!data.length) return 7000
    const maxBar = Math.max(...data.map(d => Math.max(d.receipts, d.disbursements)))
    // Round up to nearest 1000K
    return Math.ceil(maxBar / 1000 / 1000) * 1000 || 7000
  }, [data])

  // Calculate column widths for perfect alignment
  const columnCount = data.length

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-16 text-center">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Chargement des données de trésorerie...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="w-full space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-16 text-center">
            <p className="text-sm text-slate-500">
              Aucune donnée de trésorerie disponible. Veuillez sélectionner une société et importer les données financières.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Selectors Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Janv. → Déc." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jan-dec">Janv. → Déc.</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedScenario} onValueChange={setSelectedScenario}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Scénario principal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="main">Scénario principal</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedView} onValueChange={setSelectedView}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Vue consolidée" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consolidated">Vue consolidée</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="default" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Rafraîchir calcul
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Exporter</DropdownMenuItem>
            <DropdownMenuItem>Paramètres</DropdownMenuItem>
            <DropdownMenuItem>Imprimer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex gap-6">
            {/* Left Indicator */}
            <div className="flex-shrink-0">
              <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg border-2 border-blue-300 p-5 min-w-[220px] shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm"></div>
                  <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Trésorerie courante</span>
                </div>
                <div className="text-3xl font-bold text-blue-900 mb-1">
                  {formatCurrencyDisplay(currentTreasury)}
                </div>
                <div className="text-xs text-blue-700 font-medium">
                  Trésorerie disponible
                </div>
              </div>
            </div>

            {/* Chart and Table Container with Y-axis outside */}
            <div className="flex-1 min-w-0 flex gap-2">
              {/* Chart and Table wrapper - same width */}
              <div className="flex-1 min-w-0">
                {/* Chart Area - Same width as table, aligned perfectly */}
                <div className="mb-6" style={{ height: "360px" }}>
                  <ChartContainer
                    config={chartConfig}
                    className="h-full w-full"
                  >
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 10, right: 0, left: 200, bottom: 10 }}
                      barCategoryGap="0%"
                      barGap={4}
                    >
                      <defs>
                        {/* Hatched pattern for projected bars */}
                        <pattern
                          id="hatchGreen"
                          patternUnits="userSpaceOnUse"
                          width="4"
                          height="4"
                        >
                          <path
                            d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2"
                            stroke="hsl(142, 71%, 45%)"
                            strokeWidth="0.5"
                          />
                        </pattern>
                        <pattern
                          id="hatchRed"
                          patternUnits="userSpaceOnUse"
                          width="4"
                          height="4"
                        >
                          <path
                            d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2"
                            stroke="hsl(0, 84%, 60%)"
                            strokeWidth="0.5"
                          />
                        </pattern>
                      </defs>
                      
                      {/* Vertical grid lines for column alignment */}
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e2e8f0" 
                        vertical={true}
                        horizontal={false}
                      />
                      
                      {/* Horizontal grid lines */}
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#f1f5f9" 
                        vertical={false}
                        horizontal={true}
                      />
                      
                      {/* XAxis hidden - months only shown in table below */}
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={false}
                        height={0}
                        hide={true}
                      />
                      
                      {/* Left Y-axis for Treasury (0-250K) - positioned in left margin */}
                      <YAxis
                        yAxisId="left"
                        domain={[0, yAxisMaxTreasury]}
                        tickFormatter={(value) => `${value / 1000}K`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        width={45}
                      />
                      
                      {/* Right Y-axis for Bars (0-7K) - hidden, will be shown outside */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, yAxisMaxBars]}
                        tickFormatter={(value) => `${value}K`}
                        axisLine={false}
                        tickLine={false}
                        tick={false}
                        width={0}
                        hide={true}
                      />
                      
                      {/* Enhanced Tooltip */}
                      <ChartTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const dataPoint = chartData.find(d => d.month === label)
                            if (!dataPoint) return null
                            
                            return (
                              <div className="bg-white border-2 border-slate-300 rounded-lg shadow-xl p-4 min-w-[280px]">
                                <div className="font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-200">
                                  {label}
                                </div>
                                
                                {/* Treasury */}
                                {payload.find(p => p.dataKey === "treasuryTrend" || p.dataKey === "treasuryTrendSolid") && (
                                  <div className="space-y-2 mb-3">
                                    <div className="flex items-center justify-between gap-4 text-sm">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                                        <span className="text-slate-600">Trésorerie début:</span>
                                      </div>
                                      <span className="font-semibold text-slate-900 font-mono">
                                        {formatCurrencyDisplay(dataPoint.treasuryStart)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 text-sm">
                                      <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-400 opacity-50"></div>
                                        <span className="text-slate-600">Trésorerie fin:</span>
                                      </div>
                                      <span className="font-semibold text-slate-900 font-mono">
                                        {formatCurrencyDisplay(dataPoint.treasuryEnd)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Receipts */}
                                <div className="space-y-1.5 mb-3">
                                  <div className="flex items-center justify-between gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded" style={{ backgroundColor: dataPoint.isProjected ? "url(#hatchGreen)" : "hsl(142, 71%, 45%)" }}></div>
                                      <span className="text-slate-600">Encaissements:</span>
                                    </div>
                                    <span className="font-semibold text-slate-900 font-mono">
                                      {formatCurrencyDisplay(dataPoint.receipts)}
                                    </span>
                                  </div>
                                  {dataPoint.receiptsForecast && (
                                    <div className="flex items-center justify-between gap-4 text-xs pl-5 text-slate-500">
                                      <span>Prévu:</span>
                                      <span className="font-mono">{formatCurrencyDisplay(dataPoint.receiptsForecast)}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Disbursements */}
                                <div className="space-y-1.5 mb-3">
                                  <div className="flex items-center justify-between gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded" style={{ backgroundColor: dataPoint.isProjected ? "url(#hatchRed)" : "hsl(0, 84%, 60%)" }}></div>
                                      <span className="text-slate-600">Décaissements:</span>
                                    </div>
                                    <span className="font-semibold text-slate-900 font-mono">
                                      {formatCurrencyDisplay(dataPoint.disbursements)}
                                    </span>
                                  </div>
                                  {dataPoint.disbursementsForecast && (
                                    <div className="flex items-center justify-between gap-4 text-xs pl-5 text-slate-500">
                                      <span>Prévu:</span>
                                      <span className="font-mono">{formatCurrencyDisplay(dataPoint.disbursementsForecast)}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Variation */}
                                {dataPoint.receipts > 0 && dataPoint.disbursements > 0 && (
                                  <div className="pt-2 border-t border-slate-200">
                                    <div className="flex items-center justify-between gap-4 text-xs">
                                      <span className="text-slate-600">Variation MoM:</span>
                                      <span className={`font-semibold font-mono ${
                                        (dataPoint.receipts - dataPoint.disbursements) >= 0 ? "text-emerald-600" : "text-red-600"
                                      }`}>
                                        {(dataPoint.receipts - dataPoint.disbursements) >= 0 ? "+" : ""}
                                        {formatCurrencyDisplay(dataPoint.receipts - dataPoint.disbursements)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      
                      {/* Treasury Trend Line - solid for initial months */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="treasuryTrendSolid"
                        stroke="hsl(210, 100%, 70%)"
                        strokeWidth={2.5}
                        dot={{ fill: "hsl(210, 100%, 70%)", r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Trésorerie"
                        connectNulls={false}
                      />
                      
                      {/* Treasury Trend Line - dashed for projected months */}
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="treasuryTrend"
                        stroke="hsl(210, 100%, 70%)"
                        strokeWidth={2.5}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(210, 100%, 70%)", r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Trésorerie (projetée)"
                        connectNulls={true}
                      />
                      
                      {/* Receipts Bars (Green) - Using right Y-axis */}
                      <Bar 
                        yAxisId="right"
                        dataKey="receiptsChart" 
                        name="Encaissements" 
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`receipts-${index}`}
                            fill={entry.isProjected ? "url(#hatchGreen)" : "hsl(142, 71%, 45%)"}
                          />
                        ))}
                      </Bar>
                      
                      {/* Disbursements Bars (Red) - Using right Y-axis */}
                      <Bar 
                        yAxisId="right"
                        dataKey="disbursementsChart" 
                        name="Décaissements" 
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`disbursements-${index}`}
                            fill={entry.isProjected ? "url(#hatchRed)" : "hsl(0, 84%, 60%)"}
                          />
                        ))}
                      </Bar>
                    </ComposedChart>
                  </ChartContainer>
                </div>

                {/* Table - Perfectly aligned with chart columns */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
                      className="flex-1 border-0 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                  
                  {/* Table container - no padding, matches chart exactly */}
                  <div className="overflow-x-auto">
                  <table 
                    className="w-full" 
                    style={{ 
                      tableLayout: "fixed",
                      width: "100%"
                    }}
                  >
                    <colgroup>
                      <col style={{ width: "200px" }} />
                      {data.map((_, index) => (
                        <col key={index} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="border-b-2 border-slate-300">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                          Poste
                        </th>
                        {data.map((item, index) => (
                          <th
                            key={index}
                            className={`text-right py-3 px-3 text-sm font-semibold text-slate-900 whitespace-nowrap ${
                              item.month === "AVR." ? "bg-blue-50" : ""
                            }`}
                          >
                            {item.month}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Trésorerie en début de mois */}
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          Trésorerie en début de mois
                        </td>
                        {data.map((item, index) => (
                          <td
                            key={index}
                            className={`text-right py-3 px-3 text-sm font-mono text-slate-900 ${
                              item.month === "AVR." ? "bg-blue-50" : ""
                            }`}
                          >
                            {item.treasuryStart > 0
                              ? formatCurrencyDisplay(item.treasuryStart)
                              : "-"}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Encaissements */}
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          Encaissements
                        </td>
                        {data.map((item, index) => (
                          <td
                            key={index}
                            className={`text-right py-3 px-3 text-sm font-mono text-slate-900 ${
                              item.month === "AVR." ? "bg-blue-50" : ""
                            }`}
                          >
                            <div className="flex flex-col items-end">
                              {item.receipts > 0
                                ? formatCurrencyDisplay(item.receipts)
                                : "-"}
                              {item.receiptPercentage && (
                                <span className="text-xs text-slate-500 mt-0.5">
                                  {item.receiptPercentage}%
                                </span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                      
                      {/* Décaissements */}
                      <tr className="border-b border-slate-200">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          Décaissements
                        </td>
                        {data.map((item, index) => (
                          <td
                            key={index}
                            className={`text-right py-3 px-3 text-sm font-mono text-slate-900 ${
                              item.month === "AVR." ? "bg-blue-50" : ""
                            }`}
                          >
                            {item.disbursements > 0
                              ? formatCurrencyDisplay(item.disbursements)
                              : "-"}
                          </td>
                        ))}
                      </tr>
                      
                      {/* Variation réelle */}
                      <tr className="border-b-2 border-slate-300">
                        <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                          Variation nette
                        </td>
                        {data.map((item, index) => {
                          const variation = item.receipts - item.disbursements
                          return (
                            <td
                              key={index}
                              className={`text-right py-3 px-3 text-sm font-mono font-semibold ${
                                item.month === "AVR." ? "bg-blue-50" : ""
                              } ${
                                variation >= 0 ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {item.receipts > 0 && item.disbursements > 0
                                ? `${variation >= 0 ? "+" : ""}${formatCurrencyDisplay(variation)}`
                                : "-"}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
              
              {/* Right Y-axis - positioned outside table */}
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: "50px" }}>
                <div className="flex flex-col justify-between h-[360px] py-10" style={{ fontSize: "11px", color: "#64748b" }}>
                  {Array.from({ length: 8 }, (_, i) => Math.round((yAxisMaxBars / 7) * i)).map((value) => (
                    <div key={value} className="text-right font-mono">
                      {value}K
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

