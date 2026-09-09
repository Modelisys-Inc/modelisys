"use client"

import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  COMPARABLE_MULTIPLE_METRIC_LABELS,
  averageComparableSourceMids,
  type ComparableMetricChartPoint,
  type ComparableMultipleMetric,
} from "@/lib/ebitda-capitalisation"
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ErrorBar,
  Line,
  XAxis,
  YAxis,
} from "recharts"

const ACTUAL_FILL = "#2A2F3A"
const SOURCE_FILL = "#E0742D"
const AVERAGE_STROKE = "#0F766E"
const ERROR_STROKE = "#64748b"

export type ComparableMultiplesChartProps = {
  metric: ComparableMultipleMetric
  points: ComparableMetricChartPoint[]
}

function formatMultipleTick(value: number): string {
  if (!Number.isFinite(value)) return ""
  return `${value.toFixed(1)}×`
}

function formatTooltipMultiple(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

export function ComparableMultiplesChart({
  metric,
  points,
}: ComparableMultiplesChartProps) {
  const sourcesAverage = averageComparableSourceMids(points)
  const plotPoints = points
    .filter((p) => p.mid != null && Number.isFinite(p.mid))
    .map((p) => ({
      ...p,
      mid: p.mid as number,
      error: p.error ?? undefined,
      sourcesAverage: sourcesAverage ?? undefined,
    }))

  const title = COMPARABLE_MULTIPLE_METRIC_LABELS[metric]

  if (plotPoints.length === 0) {
    return (
      <div
        className="flex h-56 flex-col justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center"
        data-testid={`capitalisation-comparable-chart-${metric}-empty`}
      >
        <p className="text-sm font-medium text-[#2A2F3A]">{title}</p>
        <p className="mt-1 text-sm text-slate-500">
          Saisissez des bornes ou calculez la VE pour afficher la comparaison.
        </p>
      </div>
    )
  }

  return (
    <div data-testid={`capitalisation-comparable-chart-${metric}`}>
      <p className="mb-2 text-sm font-medium text-[#2A2F3A]">{title}</p>
      <ChartContainer
        config={{
          mid: { label: "Moyen", color: SOURCE_FILL },
          sourcesAverage: {
            label: "Moyenne des comparables",
            color: AVERAGE_STROKE,
          },
        }}
        className="aspect-auto h-56 w-full"
      >
        <ComposedChart
          data={plotPoints}
          margin={{ top: 12, right: 8, left: 0, bottom: 8 }}
          barCategoryGap="28%"
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="shortLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            tickFormatter={formatMultipleTick}
            tick={{ fill: "#64748b", fontSize: 11 }}
          />
          <ChartTooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload as ComparableMetricChartPoint & {
                mid: number
                sourcesAverage?: number
              }
              return (
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-medium text-[#2A2F3A]">{row.label}</p>
                  <p className="mt-1 tabular-nums text-slate-600">
                    Moyen&nbsp;: {formatTooltipMultiple(row.mid)}
                  </p>
                  <p className="tabular-nums text-slate-600">
                    Bas – haut&nbsp;: {formatTooltipMultiple(row.low)} –{" "}
                    {formatTooltipMultiple(row.high)}
                  </p>
                  {row.sourcesAverage != null ? (
                    <p className="mt-1 tabular-nums text-teal-800">
                      Moyenne des comparables&nbsp;:{" "}
                      {formatTooltipMultiple(row.sourcesAverage)}
                    </p>
                  ) : null}
                </div>
              )
            }}
          />
          <Bar dataKey="mid" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {plotPoints.map((p) => (
              <Cell
                key={p.id}
                fill={p.isActual ? ACTUAL_FILL : SOURCE_FILL}
                fillOpacity={p.isActual ? 1 : 0.85}
              />
            ))}
            <ErrorBar
              dataKey="error"
              width={8}
              strokeWidth={1.5}
              stroke={ERROR_STROKE}
              direction="y"
            />
          </Bar>
          {sourcesAverage != null ? (
            <Line
              type="monotone"
              dataKey="sourcesAverage"
              name="Moyenne des comparables"
              stroke={AVERAGE_STROKE}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 3.5, fill: AVERAGE_STROKE, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ) : null}
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}
