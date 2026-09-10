"use client"

import { InlineNumber } from "@/components/cmpc/editable"
import {
  COMPARABLE_MULTIPLE_METRIC_LABELS,
  COMPARABLE_MULTIPLE_SOURCE_LABELS,
  averageComparableMultipleBand,
  type ComparableMultipleMetric,
  type ComparableMultipleSourceId,
  type ComparableMultiplesConfig,
} from "@/lib/ebitda-capitalisation"

const SOURCES: ComparableMultipleSourceId[] = ["empirical", "ai", "comparables"]
const METRICS: ComparableMultipleMetric[] = ["veOverRevenue", "veOverBaiia"]

export type ComparableMultiplesSectionProps = {
  value: ComparableMultiplesConfig
  onChange: (next: ComparableMultiplesConfig) => void
}

function formatMid(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

export function ComparableMultiplesSection({
  value,
  onChange,
}: ComparableMultiplesSectionProps) {
  const updateBand = (
    sourceId: ComparableMultipleSourceId,
    metric: ComparableMultipleMetric,
    side: "low" | "high",
    nextValue: number,
  ) => {
    const parsed = Number.isFinite(nextValue) ? nextValue : null
    onChange({
      ...value,
      [sourceId]: {
        ...value[sourceId],
        [metric]: {
          ...value[sourceId][metric],
          [side]: parsed,
        },
      },
    })
  }

  return (
    <div className="space-y-3" data-testid="capitalisation-comparable-multiples">
      <p className="text-sm font-medium text-[#2A2F3A]">Multiples comparables</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[24%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <th className="pb-2 pr-4 font-medium">Source</th>
              <th className="pb-2 pr-4 font-medium">Métrique</th>
              <th className="pb-2 pr-4 text-right font-medium">Bas</th>
              <th className="pb-2 pr-4 text-right font-medium">Haut</th>
              <th className="pb-2 text-right font-medium">Moyen</th>
            </tr>
          </thead>
          <tbody>
            {SOURCES.flatMap((sourceId) =>
              METRICS.map((metric, metricIndex) => {
                const band = value[sourceId][metric]
                const mid = averageComparableMultipleBand(band)
                return (
                  <tr
                    key={`${sourceId}-${metric}`}
                    className="border-t border-slate-200"
                    data-testid={`capitalisation-comparable-${sourceId}-${metric}`}
                  >
                    <td className="py-2 pr-4 text-[#2A2F3A]">
                      {metricIndex === 0 ? COMPARABLE_MULTIPLE_SOURCE_LABELS[sourceId] : null}
                    </td>
                    <td className="py-2 pr-4 text-[#2A2F3A]">
                      {COMPARABLE_MULTIPLE_METRIC_LABELS[metric]}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <InlineNumber
                        value={band.low ?? Number.NaN}
                        onChange={(n) => updateBand(sourceId, metric, "low", n)}
                        unit="×"
                        step={0.05}
                        min={0}
                        width="w-16"
                        ariaLabel={`${COMPARABLE_MULTIPLE_SOURCE_LABELS[sourceId]} — ${COMPARABLE_MULTIPLE_METRIC_LABELS[metric]} bas`}
                        testId={`capitalisation-comparable-${sourceId}-${metric}-low`}
                      />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <InlineNumber
                        value={band.high ?? Number.NaN}
                        onChange={(n) => updateBand(sourceId, metric, "high", n)}
                        unit="×"
                        step={0.05}
                        min={0}
                        width="w-16"
                        ariaLabel={`${COMPARABLE_MULTIPLE_SOURCE_LABELS[sourceId]} — ${COMPARABLE_MULTIPLE_METRIC_LABELS[metric]} haut`}
                        testId={`capitalisation-comparable-${sourceId}-${metric}-high`}
                      />
                    </td>
                    <td
                      className="py-2 text-right font-mono tabular-nums text-[#E0742D]"
                      data-testid={`capitalisation-comparable-${sourceId}-${metric}-mid`}
                    >
                      {formatMid(mid)}
                    </td>
                  </tr>
                )
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
