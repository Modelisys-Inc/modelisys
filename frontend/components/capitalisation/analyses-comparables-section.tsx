"use client"

import { ComparableMultiplesChart } from "@/components/capitalisation/comparable-multiples-chart"
import { ComparableMultiplesSection } from "@/components/capitalisation/comparable-multiples-section"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import {
  buildComparableMetricChartPoints,
  type ComparableMultiplesConfig,
} from "@/lib/ebitda-capitalisation"

export type AnalysesComparablesSectionProps = {
  number?: string
  comparableMultiples: ComparableMultiplesConfig
  onComparableMultiplesChange: (next: ComparableMultiplesConfig) => void
  veOverRevenue: { low: number | null; high: number | null; mid: number | null }
  veOverBaiia: { low: number | null; high: number | null; mid: number | null }
}

export function AnalysesComparablesSection({
  number = "2.",
  comparableMultiples,
  onComparableMultiplesChange,
  veOverRevenue,
  veOverBaiia,
}: AnalysesComparablesSectionProps) {
  const revenuePoints = buildComparableMetricChartPoints(
    "veOverRevenue",
    veOverRevenue,
    comparableMultiples,
  )
  const baiiaPoints = buildComparableMetricChartPoints(
    "veOverBaiia",
    veOverBaiia,
    comparableMultiples,
  )

  return (
    <NetTangibleReportSection
      id="comparables"
      number={number}
      title="Analyses des comparables"
    >
      <ComparableMultiplesSection
        value={comparableMultiples}
        onChange={onComparableMultiplesChange}
      />

      <div
        className="mt-8 space-y-3"
        data-testid="capitalisation-comparable-charts"
      >
        <p className="text-sm font-medium text-[#2A2F3A]">
          Comparaison réel vs multiples
        </p>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <ComparableMultiplesChart metric="veOverRevenue" points={revenuePoints} />
          <ComparableMultiplesChart metric="veOverBaiia" points={baiiaPoints} />
        </div>
      </div>
    </NetTangibleReportSection>
  )
}
