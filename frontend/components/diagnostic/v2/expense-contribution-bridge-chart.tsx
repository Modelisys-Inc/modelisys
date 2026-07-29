"use client"

import { useMemo } from "react"
import { TrendingDown, TrendingUp } from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { formatMoney } from "@/components/diagnostic/diagnostic-format"
import { DIAG } from "@/lib/diagnostic-theme"
import { EXPENSE_BRIDGE_CHART_COLORS } from "@/lib/expense-bridge-chart-theme"
import type { ExpenseContributionBridgePoint } from "@/lib/expense-contribution-bridge"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

const BRIDGE_COLORS = EXPENSE_BRIDGE_CHART_COLORS

interface ExpenseContributionBridgeChartProps {
  points: ExpenseContributionBridgePoint[]
  currency: string
  variableCostAccountCount: number
  fixedCostAccountCount: number
  className?: string
}

function pctOfRevenue(value: number, revenue: number): string | null {
  if (Math.abs(revenue) <= 1e-6) return null
  return `${((value / revenue) * 100).toFixed(1).replace(".", ",")} % du CA`
}

export function ExpenseContributionBridgeChart({
  points,
  currency,
  variableCostAccountCount,
  fixedCostAccountCount,
  className,
}: ExpenseContributionBridgeChartProps) {
  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        operatingProfitStack: p.operatingProfit,
        fixedCostsStack: p.fixedCosts,
        variableCostsStack: p.variableCosts,
      })),
    [points],
  )

  const latest = points[0]
  const prior = points[1]
  const variationPct =
    prior && Math.abs(prior.operatingProfit) > 1e-6
      ? ((latest!.operatingProfit - prior.operatingProfit) / Math.abs(prior.operatingProfit)) * 100
      : null

  const chartConfig = {
    variableCostsStack: { label: "Coûts variables", color: BRIDGE_COLORS.variableCosts },
    fixedCostsStack: { label: "Coûts fixes", color: BRIDGE_COLORS.fixedCosts },
    operatingProfitStack: { label: "Bénéfice d'exploitation", color: BRIDGE_COLORS.operatingProfit },
    revenue: { label: "Revenus", color: BRIDGE_COLORS.revenue },
    contributiveMargin: { label: "Contribution marginale", color: BRIDGE_COLORS.contributiveMargin },
  }

  const kpis = latest
    ? [
        { label: "Revenus", value: latest.revenue, color: BRIDGE_COLORS.revenue },
        { label: "Coûts variables", value: latest.variableCosts, color: BRIDGE_COLORS.variableCosts },
        {
          label: "Contr. marginale",
          value: latest.contributiveMargin,
          color: BRIDGE_COLORS.contributiveMargin,
        },
        { label: "Coûts fixes", value: latest.fixedCosts, color: BRIDGE_COLORS.fixedCosts },
        {
          label: "Bénéfice d'exploitation",
          value: latest.operatingProfit,
          color: BRIDGE_COLORS.operatingProfit,
        },
      ]
    : []

  return (
    <div
      data-testid="expense-contribution-bridge-chart"
      className={cn("relative bg-white", className)}
    >
      <div className="px-6 py-6 sm:px-7">
        <div className="mb-4">
          <p className="text-xs leading-relaxed text-slate-500">
            Pont de rentabilité : chaque barre décompose le chiffre d&apos;affaires en coûts variables,
            coûts fixes et bénéfice d&apos;exploitation (contribution marginale − coûts fixes). Les
            montants proviennent du mapping comptable (
            {variableCostAccountCount} compte{variableCostAccountCount > 1 ? "s" : ""} en coûts variables,{" "}
            {fixedCostAccountCount} compte{fixedCostAccountCount > 1 ? "s" : ""} en coûts fixes).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-1">
            {kpis.map((kpi, index) => (
              <div key={kpi.label} className={index > 0 ? "border-t border-slate-200 pt-3" : "pb-1"}>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: kpi.color }}
                    aria-hidden
                  />
                  <span className="text-xs font-medium text-[#5C5F66]">{kpi.label}</span>
                </div>
                <div className="mb-0.5 text-xl font-semibold text-[#2A2F3A]">
                  {formatMoney(kpi.value, currency)}
                </div>
                {kpi.label === "Bénéfice d'exploitation" && variationPct !== null ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    {variationPct >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span
                      className={cn(
                        "font-medium",
                        variationPct >= 0 ? "text-emerald-600" : "text-red-600",
                      )}
                    >
                      {variationPct >= 0 ? "+" : ""}
                      {variationPct.toFixed(1)}%
                    </span>
                    <span className="text-slate-500">vs période précédente</span>
                  </div>
                ) : null}
                {kpi.label !== "Revenus" && latest ? (
                  <div className="text-[10px] text-slate-400">
                    {pctOfRevenue(kpi.value, latest.revenue) ?? "—"}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="lg:col-span-4">
            <ChartContainer config={chartConfig} className="h-[420px] w-full">
              <ComposedChart data={chartData} margin={{ top: 20, right: 24, left: 8, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={DIAG.gridLine} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: DIAG.axisText, fontSize: 12 }}
                  tickLine={{ stroke: DIAG.gridLine }}
                  axisLine={{ stroke: DIAG.gridLine }}
                />
                <YAxis
                  tick={{ fill: DIAG.axisText, fontSize: 12 }}
                  tickLine={{ stroke: DIAG.gridLine }}
                  axisLine={{ stroke: DIAG.gridLine }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <ReferenceLine y={0} stroke={DIAG.gridLine} strokeDasharray="3 3" />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0]?.payload as ExpenseContributionBridgePoint
                    if (!row) return null
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                        <p className="mb-2 text-sm font-semibold text-slate-900">{row.period}</p>
                        {[
                          { label: "Revenus", value: row.revenue, color: BRIDGE_COLORS.revenue },
                          {
                            label: "Coûts variables",
                            value: row.variableCosts,
                            color: BRIDGE_COLORS.variableCosts,
                          },
                          {
                            label: "Contribution marginale",
                            value: row.contributiveMargin,
                            color: BRIDGE_COLORS.contributiveMargin,
                          },
                          {
                            label: "Coûts fixes",
                            value: row.fixedCosts,
                            color: BRIDGE_COLORS.fixedCosts,
                          },
                          {
                            label: "Bénéfice d'exploitation",
                            value: row.operatingProfit,
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
                            <span className="text-sm font-semibold text-slate-900">
                              {formatMoney(item.value, currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(value) => (
                    <span className="text-sm text-slate-600">{value}</span>
                  )}
                />
                <Bar
                  dataKey="operatingProfitStack"
                  name="Bénéfice d'exploitation"
                  stackId="bridge"
                  fill={BRIDGE_COLORS.operatingProfit}
                  stroke="#047857"
                  strokeWidth={1}
                />
                <Bar
                  dataKey="fixedCostsStack"
                  name="Coûts fixes"
                  stackId="bridge"
                  fill={BRIDGE_COLORS.fixedCosts}
                  stroke="#4338CA"
                  strokeWidth={1}
                />
                <Bar
                  dataKey="variableCostsStack"
                  name="Coûts variables"
                  stackId="bridge"
                  fill={BRIDGE_COLORS.variableCosts}
                  stroke="#B91C1C"
                  strokeWidth={1}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenus (total)"
                  stroke={BRIDGE_COLORS.revenue}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: BRIDGE_COLORS.revenue, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="contributiveMargin"
                  name="Contribution marginale"
                  stroke={BRIDGE_COLORS.contributiveMargin}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: BRIDGE_COLORS.contributiveMargin }}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
