"use client"

import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  computeHypothesisSummaryDollarYScale,
  type HypothesisSummaryMoneyPoint,
} from "@/lib/forecast-hypothesis-summary-utils"
import { createForecastSeasonalityBandXScale } from "@/lib/forecast-seasonality-utils"
import { cn } from "@/lib/utils"
import { useMemo } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

export type ForecastSummarySeriesKey =
  | "primary"
  | "cashFlow"
  | "balance"
  | "cost"
  | "bookValue"
  | "depreciation"

export type ForecastSummarySeriesDef = {
  key: ForecastSummarySeriesKey
  label: string
  color: string
  lineName: string
  /** false = ligne du tableau seulement (pas sur le graphique ni le tooltip). */
  inChart?: boolean
}

export type ForecastHypothesisSummaryChartProps = {
  points: HypothesisSummaryMoneyPoint[]
  series: readonly ForecastSummarySeriesDef[]
  visible: Partial<Record<ForecastSummarySeriesKey, boolean>>
  onToggleVisible: (key: ForecastSummarySeriesKey) => void
  formatValue: (n: number) => string
  chartAriaLabel: string
}

const HIST_COL_COUNT = 12
const GRID_TEMPLATE = `minmax(7rem, 9.75rem) repeat(${HIST_COL_COUNT}, minmax(2.25rem, 1fr))`

function seriesValue(pt: HypothesisSummaryMoneyPoint, key: ForecastSummarySeriesKey): number {
  switch (key) {
    case "primary":
      return Number(pt.primary) || 0
    case "cashFlow":
      return Number(pt.cashFlow) || 0
    case "balance":
      return Number(pt.balance) || 0
    case "cost":
      return Number(pt.cost) || 0
    case "bookValue":
      return Number(pt.bookValue) || 0
    case "depreciation":
      return Number(pt.depreciation) || 0
    default:
      return 0
  }
}

export function ForecastHypothesisSummaryChart({
  points,
  series,
  visible,
  onToggleVisible,
  formatValue,
  chartAriaLabel,
}: ForecastHypothesisSummaryChartProps) {
  const chartSeries = series.filter((s) => s.inChart !== false)
  const maxDollar = points.length
    ? Math.max(1, ...points.flatMap((p) => chartSeries.map((s) => seriesValue(p, s.key))))
    : 1
  const { yMax: chartYMax, ticks: yTicksLeft } = useMemo(
    () => computeHypothesisSummaryDollarYScale(maxDollar),
    [maxDollar]
  )
  const xBandScale = useMemo(() => createForecastSeasonalityBandXScale(), [])

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(chartSeries.map((s) => [s.key, { label: s.lineName, color: s.color }])) as Record<
        string,
        { label: string; color: string }
      >,
    [chartSeries]
  )

  if (points.length === 0) return null

  return (
    <div className="overflow-x-auto overflow-y-visible rounded-md border border-slate-200/80 bg-white">
      <div
        className="min-w-0 w-full"
        style={{ minWidth: `max(100%, calc(9.75rem + ${HIST_COL_COUNT} * 2.75rem))` }}
      >
        <div
          className="grid min-w-0 divide-x divide-slate-200 border-b border-slate-200 bg-white"
          style={{ gridTemplateColumns: GRID_TEMPLATE }}
        >
          <div className="flex h-52 w-full shrink-0 flex-col items-stretch justify-between overflow-visible bg-white px-2 py-3 sm:h-56 sm:px-2.5">
            <div className="flex w-full min-w-0 flex-1 flex-col justify-between py-0.5">
              {yTicksLeft.map((tick) => (
                <span
                  key={`sum-y-${tick}`}
                  className="block w-full min-w-0 text-right text-[9px] tabular-nums leading-none text-slate-500 sm:text-[10px]"
                >
                  {formatValue(tick)}
                </span>
              ))}
            </div>
          </div>
          <div className="h-52 min-h-0 min-w-0 overflow-visible bg-white sm:h-56" style={{ gridColumn: "2 / span 12" }}>
            <ChartContainer
              config={chartConfig}
              className="h-full w-full min-w-0 overflow-visible !aspect-auto !justify-start [&_.recharts-responsive-container]:overflow-visible [&_.recharts-wrapper]:overflow-visible [&_.recharts-surface]:overflow-visible [&_.recharts-responsive-container]:w-full"
              aria-label={chartAriaLabel}
            >
              <LineChart accessibilityLayer data={points} margin={{ top: 8, right: 6, left: 4, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="axisLabel"
                  type="category"
                  scale={xBandScale}
                  tick={false}
                  tickLine={false}
                  axisLine={false}
                  height={0}
                  interval={0}
                />
                <YAxis domain={[0, chartYMax]} hide width={0} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const row = payload[0]?.payload as HypothesisSummaryMoneyPoint | undefined
                    if (!row) return null
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                        <p className="font-semibold text-slate-900">{row.monthName}</p>
                        {chartSeries.map((s, idx) =>
                          visible[s.key] !== false ? (
                            <p
                              key={s.key}
                              className={cn("tabular-nums text-slate-700", idx === 0 ? "mt-1" : "")}
                              style={{ color: s.color }}
                            >
                              {s.label} : {formatValue(seriesValue(row, s.key))}
                            </p>
                          ) : null
                        )}
                      </div>
                    )
                  }}
                />
                {chartSeries.map(
                  (s) =>
                    visible[s.key] !== false ? (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.lineName}
                        stroke={`var(--color-${s.key})`}
                        strokeWidth={2.2}
                        dot={{
                          r: 3,
                          strokeWidth: 1.5,
                          fill: `var(--color-${s.key})`,
                          stroke: "#fff",
                        }}
                        activeDot={{ r: 5 }}
                      />
                    ) : null
                )}
              </LineChart>
            </ChartContainer>
          </div>
        </div>

        <div
          className="grid min-w-0 divide-x divide-slate-200 border-b border-slate-200 bg-white"
          style={{ gridTemplateColumns: GRID_TEMPLATE }}
        >
          <div className="flex w-full shrink-0 items-start justify-end overflow-visible bg-white px-2 py-2.5 sm:px-2.5">
            <span className="text-right text-[9px] font-medium leading-snug text-slate-400 sm:text-[10px]">Mois</span>
          </div>
          {points.map((pt, colIdx) => (
            <div
              key={`sum-hdr-${pt.axisLabel}-${colIdx}`}
              className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-2.5 sm:px-1"
            >
              <span
                className="w-full text-center text-[10px] font-semibold leading-tight text-slate-700"
                title={pt.monthName}
              >
                {pt.axisLabel}
              </span>
            </div>
          ))}
        </div>

        {series.map((s) => (
          <div
            key={`sum-row-${s.key}`}
            className={cn(
              "grid min-w-0 divide-x divide-slate-200 border-b border-slate-200 bg-white transition-opacity last:border-b-0",
              visible[s.key] === false && "opacity-40"
            )}
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            <div className="flex min-h-[2.75rem] shrink-0 items-center justify-end overflow-visible bg-white px-2 py-2 sm:px-2.5">
              <button
                type="button"
                aria-pressed={visible[s.key] !== false}
                title={
                  s.inChart === false
                    ? `Afficher ou masquer la ligne ${s.label}`
                    : `Afficher ou masquer la courbe ${s.label}`
                }
                className={cn(
                  "max-w-full rounded-md text-right text-[10px] font-semibold leading-snug outline-none ring-offset-2 transition hover:underline focus-visible:ring-2 sm:text-xs",
                  visible[s.key] === false && "line-through opacity-70"
                )}
                style={{ color: s.color }}
                onClick={() => onToggleVisible(s.key)}
              >
                {s.label}
              </button>
            </div>
            {points.map((pt, colIdx) => (
              <div
                key={`sum-${s.key}-${colIdx}`}
                className="flex min-h-[2.75rem] min-w-0 items-center justify-center px-0.5 py-2 sm:px-1"
              >
                <span
                  className="w-full text-center text-[11px] font-medium tabular-nums leading-tight"
                  style={{ color: s.color }}
                >
                  {formatValue(seriesValue(pt, s.key))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
