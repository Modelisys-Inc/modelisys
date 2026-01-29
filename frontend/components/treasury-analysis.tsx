"use client"

import { useState } from "react"
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

// Generate sample data based on the image description
const generateTreasuryData = (): TreasuryData[] => {
  return [
    { month: "FEVR.", treasuryStart: 9567895, receipts: 5648916, disbursements: 4500000, treasuryEnd: 10716811, isProjected: false, receiptsForecast: 5600000, disbursementsForecast: 4500000 },
    { month: "MARS", treasuryStart: 9534405, receipts: 5639844, disbursements: 4800000, treasuryEnd: 10374249, isProjected: false, receiptsForecast: 5600000, disbursementsForecast: 4800000 },
    { month: "AVR.", treasuryStart: 10536227, receipts: 5735000, disbursements: 5200000, treasuryEnd: 11071227, isProjected: false, receiptPercentage: 67, receiptsForecast: 5700000, disbursementsForecast: 5200000 },
    { month: "MAI", treasuryStart: 10434612, receipts: 5835540, disbursements: 5400000, treasuryEnd: 10870152, isProjected: true, receiptsForecast: 5800000, disbursementsForecast: 5400000 },
    { month: "JUIN", treasuryStart: 9432997, receipts: 5635000, disbursements: 5100000, treasuryEnd: 9967997, isProjected: true, receiptsForecast: 5600000, disbursementsForecast: 5100000 },
    { month: "JUIL.", treasuryStart: 9931292, receipts: 5335670, disbursements: 4900000, treasuryEnd: 10366962, isProjected: true, receiptsForecast: 5300000, disbursementsForecast: 4900000 },
    { month: "AOÛT", treasuryStart: 10129587, receipts: 6735060, disbursements: 5500000, treasuryEnd: 11364647, isProjected: true, receiptsForecast: 6700000, disbursementsForecast: 5500000 },
    { month: "SEPT.", treasuryStart: 10227882, receipts: 5935200, disbursements: 5300000, treasuryEnd: 10863082, isProjected: true, receiptsForecast: 5900000, disbursementsForecast: 5300000 },
    { month: "OCT.", treasuryStart: 10126377, receipts: 5835560, disbursements: 5200000, treasuryEnd: 10761937, isProjected: true, receiptsForecast: 5800000, disbursementsForecast: 5200000 },
    { month: "NOV.", treasuryStart: 10524872, receipts: 5635870, disbursements: 5100000, treasuryEnd: 11060742, isProjected: true, receiptsForecast: 5600000, disbursementsForecast: 5100000 },
    { month: "DÉC.", treasuryStart: 11223367, receipts: 5645670, disbursements: 5200000, treasuryEnd: 11669037, isProjected: true, receiptsForecast: 5600000, disbursementsForecast: 5200000 },
    { month: "JANV.", treasuryStart: 10561862, receipts: 5567677, disbursements: 5000000, treasuryEnd: 11129539, isProjected: true, receiptsForecast: 5550000, disbursementsForecast: 5000000 },
    { month: "FEVR.", treasuryStart: 11021862, receipts: 5676200, disbursements: 5100000, treasuryEnd: 11598062, isProjected: true, receiptsForecast: 5650000, disbursementsForecast: 5100000 },
    { month: "MARS", treasuryStart: 0, receipts: 0, disbursements: 0, treasuryEnd: 0, isProjected: true },
  ]
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

export function TreasuryAnalysis() {
  const [selectedProject, setSelectedProject] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("jan-dec")
  const [selectedScenario, setSelectedScenario] = useState("main")
  const [selectedView, setSelectedView] = useState("consolidated")
  
  const data = generateTreasuryData()
  
  // Calculate treasury trend for chart (normalized to 0-250K range for visualization)
  const treasuryTrend = data.map((item, index) => {
    if (item.treasuryStart === 0) return 0
    const trendValues = [
      80000,  // FEVR
      100000, // MARS
      100000, // AVR
      95000,  // MAI
      90000,  // JUIN
      95000,  // JUIL
      100000, // AOÛT
      105000, // SEPT
      110000, // OCT
      115000, // NOV
      120000, // DÉC
      130000, // JANV
      140000, // FEVR
      150000, // MARS
    ]
    return trendValues[index] || 0
  })

  // Format data for chart
  const chartData = data.map((item, index) => ({
    ...item,
    treasuryTrend: treasuryTrend[index],
    treasuryTrendSolid: index < 3 ? treasuryTrend[index] : null,
    receiptsChart: item.receipts / 1000,
    disbursementsChart: item.disbursements / 1000,
  }))

  // Y-axis settings
  const yAxisMaxTreasury = 250000
  const yAxisMaxBars = 7000

  // Calculate column widths for perfect alignment
  const columnCount = data.length

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
            <SelectItem value="project1">Projet 1</SelectItem>
            <SelectItem value="project2">Projet 2</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Janv. → Déc." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jan-dec">Janv. → Déc.</SelectItem>
            <SelectItem value="custom">Période personnalisée</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedScenario} onValueChange={setSelectedScenario}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Scénario principal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="main">Scénario principal</SelectItem>
            <SelectItem value="optimistic">Scénario optimiste</SelectItem>
            <SelectItem value="pessimistic">Scénario pessimiste</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedView} onValueChange={setSelectedView}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Vue consolidée" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="consolidated">Vue consolidée</SelectItem>
            <SelectItem value="detailed">Vue détaillée</SelectItem>
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
                  +3,15 M€
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
                  {[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000].map((value) => (
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

