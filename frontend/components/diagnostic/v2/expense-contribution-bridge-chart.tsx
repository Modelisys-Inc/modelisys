"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatMoney } from "@/components/diagnostic/diagnostic-format"
import { DIAG } from "@/lib/diagnostic-theme"
import { EXPENSE_BRIDGE_CHART_COLORS, EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL } from "@/lib/expense-bridge-chart-theme"
import type { ExpenseContributionBridgePoint } from "@/lib/expense-contribution-bridge"
import {
  buildExpenseBridgeStackPercentSeries,
  formatBridgePercent,
  toExpenseBridgeStackPercentPoint,
  type ExpenseBridgeStackPercentPoint,
} from "@/lib/expense-bridge-stack-percent"
import { cn } from "@/lib/utils"

const BRIDGE_COLORS = EXPENSE_BRIDGE_CHART_COLORS
const DEFAULT_CHART_HEIGHT_PX = 400

interface ExpenseContributionBridgeChartProps {
  points: ExpenseContributionBridgePoint[]
  currency: string
  variableCostAccountCount: number
  fixedCostAccountCount: number
  className?: string
  printMode?: boolean
  /** Même hauteur que le graphique Performance (statement-chart). */
  chartHeightClass?: string
  chartHeightPx?: number
}

function stackedTotal(row: ExpenseBridgeStackPercentPoint): number {
  return row.variableCostsStackPct + row.fixedCostsStackPct + row.operatingProfitStackPct
}

type BridgeSideSegment = {
  label: string
  pct: number
  stackPct: number
  amount: number
  color: string
}

function buildSideSegments(row: ExpenseBridgeStackPercentPoint): BridgeSideSegment[] {
  return [
    {
      label: "Coûts variables",
      pct: row.variableCostsPct,
      stackPct: row.variableCostsStackPct,
      amount: row.variableCosts,
      color: BRIDGE_COLORS.variableCosts,
    },
    {
      label: "Coûts fixes",
      pct: row.fixedCostsPct,
      stackPct: row.fixedCostsStackPct,
      amount: row.fixedCosts,
      color: BRIDGE_COLORS.fixedCosts,
    },
    {
      label: EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL,
      pct: row.operatingProfitPct,
      stackPct: row.operatingProfitStackPct,
      amount: row.operatingProfit,
      color: BRIDGE_COLORS.operatingProfit,
    },
  ]
}

function BridgeStackMiniBar({ segments }: { segments: BridgeSideSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.stackPct, 0)
  if (total <= 0) return null
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      aria-hidden
    >
      {segments.map((segment) =>
        segment.stackPct > 0 ? (
          <div
            key={segment.label}
            style={{
              width: `${(segment.stackPct / total) * 100}%`,
              backgroundColor: segment.color,
            }}
          />
        ) : null,
      )}
    </div>
  )
}

export function ExpenseContributionBridgeChart({
  points,
  currency,
  variableCostAccountCount,
  fixedCostAccountCount,
  className,
  printMode = false,
  chartHeightClass = "h-[400px]",
  chartHeightPx = DEFAULT_CHART_HEIGHT_PX,
}: ExpenseContributionBridgeChartProps) {
  const chartAreaRef = useRef<HTMLDivElement>(null)
  const [chartAreaReady, setChartAreaReady] = useState(false)

  useLayoutEffect(() => {
    const node = chartAreaRef.current
    if (!node) return

    const sync = () => {
      const { width, height } = node.getBoundingClientRect()
      setChartAreaReady(width > 1 && height > 1)
    }

    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => observer.disconnect()
  }, [printMode, chartHeightPx])

  const chartData = useMemo(() => buildExpenseBridgeStackPercentSeries(points), [points])

  const yMax = useMemo(() => {
    if (!chartData.length) return 100
    const peak = Math.max(...chartData.map((row) => stackedTotal(row)))
    return Math.max(100, Math.ceil(peak / 5) * 5)
  }, [chartData])

  const latest = points[0]
  const prior = points[1]
  const latestStack = latest ? toExpenseBridgeStackPercentPoint(latest) : null
  const priorStack = prior ? toExpenseBridgeStackPercentPoint(prior) : null
  const sideSegments = latestStack ? buildSideSegments(latestStack) : []
  const baiiaPtsDelta =
    latestStack && priorStack
      ? latestStack.operatingProfitPct - priorStack.operatingProfitPct
      : null

  const chartConfig = {
    variableCostsStackPct: { label: "Coûts variables", color: BRIDGE_COLORS.variableCosts },
    fixedCostsStackPct: { label: "Coûts fixes", color: BRIDGE_COLORS.fixedCosts },
    operatingProfitStackPct: { label: EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL, color: BRIDGE_COLORS.operatingProfit },
  }

  const chartMargins = printMode
    ? { top: 20, right: 50, left: 20, bottom: 5 }
    : { top: 20, right: 24, left: 20, bottom: 5 }

  return (
    <div
      data-testid="expense-contribution-bridge-chart"
      className={cn("relative bg-white", printMode && "h-full", className)}
    >
      <div className={cn(!printMode && "px-6 py-6 sm:px-7")}>
        {!printMode ? (
          <div className="mb-4">
            <p className="text-xs leading-relaxed text-slate-500">
              Répartition du chiffre d&apos;affaires en % : chaque barre totalise 100 % du CA, ventilé entre
              coûts variables, coûts fixes et {EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL} (
              {variableCostAccountCount} compte{variableCostAccountCount > 1 ? "s" : ""} en coûts variables,{" "}
              {fixedCostAccountCount} compte{fixedCostAccountCount > 1 ? "s" : ""} en coûts fixes).
            </p>
          </div>
        ) : null}

        <div
          className={cn(
            printMode
              ? "report-chart-print-grid h-full"
              : "grid grid-cols-1 gap-6 lg:grid-cols-5",
          )}
        >
          <div
            className={
              printMode ? "report-chart-print-side space-y-3" : "space-y-3 lg:col-span-1"
            }
          >
            {latestStack ? (
              <>
                <div className={printMode ? "pb-1" : ""}>
                  <div className="mb-1 text-xs font-medium text-[#5C5F66]">Chiffre d&apos;affaires</div>
                  <div className="mb-1 text-xl font-semibold text-[#2A2F3A]">
                    {formatMoney(latestStack.revenue, currency)}
                  </div>
                  <div className="text-[10px] text-slate-400">Base 100 % · {latestStack.period}</div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Répartition du CA
                  </div>
                  <BridgeStackMiniBar segments={sideSegments} />
                </div>

                {sideSegments.map((segment, index) => {
                  const isBaiia = segment.label === EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL
                  const negativePct = segment.pct < 0
                  return (
                    <div
                      key={segment.label}
                      className={index === 0 ? "pt-3" : "border-t border-slate-200 pt-3"}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: segment.color }}
                          aria-hidden
                        />
                        <span className="text-xs font-medium text-[#5C5F66]">{segment.label}</span>
                      </div>
                      <div
                        className={cn(
                          "mb-1 text-xl font-semibold tabular-nums",
                          negativePct ? "text-red-700" : "text-[#2A2F3A]",
                        )}
                      >
                        {formatBridgePercent(segment.pct)}
                      </div>
                      <div className="text-xs text-slate-500">{formatMoney(segment.amount, currency)}</div>
                      {isBaiia && baiiaPtsDelta !== null && Math.abs(baiiaPtsDelta) >= 0.05 ? (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                          {baiiaPtsDelta >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span
                            className={cn(
                              "font-medium",
                              baiiaPtsDelta >= 0 ? "text-emerald-600" : "text-red-600",
                            )}
                          >
                            {baiiaPtsDelta >= 0 ? "+" : ""}
                            {baiiaPtsDelta.toFixed(1).replace(".", ",")} pt
                          </span>
                          <span className="text-slate-500">vs période précédente</span>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </>
            ) : null}
          </div>

          <div
            ref={chartAreaRef}
            className={cn(
              "min-w-0 w-full",
              printMode ? "report-chart-print-canvas" : cn("lg:col-span-4", chartHeightClass),
            )}
            style={
              printMode
                ? undefined
                : { height: chartHeightPx, minHeight: chartHeightPx }
            }
          >
            {chartAreaReady && chartData.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className={cn(printMode ? chartHeightClass : "h-full w-full", "w-full")}
              >
                <BarChart
                  data={chartData}
                  margin={chartMargins}
                  barCategoryGap="24%"
                  barGap={2}
                  maxBarSize={56}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={DIAG.gridLine} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: DIAG.axisText, fontSize: 12 }}
                    tickLine={{ stroke: DIAG.gridLine }}
                    axisLine={{ stroke: DIAG.gridLine }}
                  />
                  <YAxis
                    domain={[0, yMax]}
                    tick={{ fill: DIAG.axisText, fontSize: 12 }}
                    tickLine={{ stroke: DIAG.gridLine }}
                    axisLine={{ stroke: DIAG.gridLine }}
                    tickFormatter={(value) =>
                      Number.isFinite(value) ? formatBridgePercent(value, 0) : ""
                    }
                  />
                  <ReferenceLine y={100} stroke={DIAG.gridLine} strokeDasharray="4 4" />
                  {!printMode ? (
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const row = payload[0]?.payload as ExpenseBridgeStackPercentPoint
                        if (!row) return null
                        return (
                          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                            <p className="mb-2 text-sm font-semibold text-slate-900">{row.period}</p>
                            {[
                              { label: "Revenus", value: row.revenue, pct: 100, color: BRIDGE_COLORS.revenue },
                              {
                                label: "Coûts variables",
                                value: row.variableCosts,
                                pct: row.variableCostsPct,
                                color: BRIDGE_COLORS.variableCosts,
                              },
                              {
                                label: "Coûts fixes",
                                value: row.fixedCosts,
                                pct: row.fixedCostsPct,
                                color: BRIDGE_COLORS.fixedCosts,
                              },
                              {
                                label: EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL,
                                value: row.operatingProfit,
                                pct: row.operatingProfitPct,
                                color: BRIDGE_COLORS.operatingProfit,
                              },
                            ].map((item) => (
                              <div
                                key={item.label}
                                className="flex items-center justify-between gap-4 py-0.5"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className="h-2.5 w-2.5 rounded-sm"
                                    style={{ background: item.color }}
                                    aria-hidden
                                  />
                                  <span className="text-sm text-slate-600">{item.label}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold text-slate-900">
                                    {formatMoney(item.value, currency)}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {formatBridgePercent(item.pct)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }}
                    />
                  ) : null}
                  <Legend
                    wrapperStyle={{ paddingTop: printMode ? 8 : 16 }}
                    formatter={(value) => (
                      <span className="text-sm text-slate-600">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="operatingProfitStackPct"
                    name={EXPENSE_BRIDGE_OPERATING_PROFIT_LABEL}
                    stackId="bridge"
                    fill={BRIDGE_COLORS.operatingProfit}
                    stroke="#047857"
                    strokeWidth={1}
                  />
                  <Bar
                    dataKey="fixedCostsStackPct"
                    name="Coûts fixes"
                    stackId="bridge"
                    fill={BRIDGE_COLORS.fixedCosts}
                    stroke="#4338CA"
                    strokeWidth={1}
                  />
                  <Bar
                    dataKey="variableCostsStackPct"
                    name="Coûts variables"
                    stackId="bridge"
                    fill={BRIDGE_COLORS.variableCosts}
                    stroke="#B91C1C"
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
