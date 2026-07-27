"use client"

import type { DiagnosticDivisionPerformance } from "@/lib/api"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import { cn } from "@/lib/utils"
import {
  formatMoney,
  formatPercent,
} from "@/components/diagnostic/diagnostic-format"

interface DiagnosticDivisionsSectionProps {
  divisions: DiagnosticDivisionPerformance[]
  currency: string
}

const chartConfig = {
  revenue_share_pct: { label: "Part du CA (%)", color: "#10b981" },
}

/** Rentabilité par division : tableau (divisions déficitaires en rouge) + part du CA en barres. */
export function DiagnosticDivisionsSection({
  divisions,
  currency,
}: DiagnosticDivisionsSectionProps) {
  if (divisions.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Aucune division configurée pour cette société.
      </p>
    )
  }

  const chartData = divisions.map((d) => ({
    name: d.division_name,
    revenue_share_pct: d.revenue_share_pct ?? 0,
    profitable: d.profitable,
  }))

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Division</TableHead>
              <TableHead className="text-right">Chiffre d&apos;affaires</TableHead>
              <TableHead className="text-right">Part du CA</TableHead>
              <TableHead className="text-right">Marge brute</TableHead>
              <TableHead className="text-right">EBITDA</TableHead>
              <TableHead className="text-right">Bénéfice net</TableHead>
              <TableHead className="text-right">TCAC 5 ans</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.map((d) => (
              <TableRow
                key={d.division_id}
                data-testid={`division-row-${d.division_id}`}
                data-profitable={d.profitable ? "true" : "false"}
                className={cn(!d.profitable && "bg-red-50 hover:bg-red-100/70")}
              >
                <TableCell
                  className={cn(
                    "font-medium",
                    d.profitable ? "text-slate-900" : "text-red-700"
                  )}
                >
                  {d.division_name}
                  {!d.profitable && (
                    <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                      Déficitaire
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatMoney(d.revenue, currency)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatPercent(d.revenue_share_pct)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatPercent(d.gross_margin_pct)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatMoney(d.ebitda, currency)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-mono text-sm",
                    d.net_income < 0 && "font-semibold text-red-600"
                  )}
                >
                  {formatMoney(d.net_income, currency)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatPercent(d.revenue_cagr_5y)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">
          Répartition du chiffre d&apos;affaires par division
        </h3>
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#cbd5e1" }}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickFormatter={(value) => `${value} %`}
            />
            <ChartTooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0]?.payload as (typeof chartData)[number]
                return (
                  <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
                    <div className="text-sm font-bold text-slate-900">{label}</div>
                    <div className="mt-1 text-xs text-slate-600">
                      Part du CA :{" "}
                      <span className="font-mono font-bold text-emerald-600">
                        {formatPercent(d.revenue_share_pct)}
                      </span>
                    </div>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="revenue_share_pct"
              name="Part du CA (%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={72}
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.profitable ? "#10b981" : "#ef4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}
