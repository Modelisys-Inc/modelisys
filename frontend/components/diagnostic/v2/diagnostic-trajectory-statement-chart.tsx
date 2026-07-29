"use client"

import { useMemo, useState } from "react"
import type { Company } from "@/components/entity-selector"
import { StatementChart, type ChartHorizonToggleValue } from "@/components/statement-chart"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
import type { DiagnosticReportView } from "@/components/diagnostic/v2/diagnostic-nav-rail"
import { defaultChartCardTitle, type StatementType } from "@/lib/statement-chart-config"
import { CARD_CLASS, signalClass, type SignalTone } from "@/lib/diagnostic-theme"

export const DIAGNOSTIC_REPORT_ANCHOR_ID = "diag-rapport"

export type DiagnosticChartNarrativeScope =
  | "full"
  | "revenue-only"
  | "margin-by-revenue-only"
  | "expenses-only"

function parseFiscalEndMonth(fiscalYearEnd?: string): number {
  const raw = fiscalYearEnd?.split("-")[0]
  const n = parseInt(raw ?? "12", 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 12
}

function resolveReportChartConfig(reportView: DiagnosticReportView): {
  statementType: StatementType
  narrativeScope: DiagnosticChartNarrativeScope
} {
  if (reportView === "revenue") {
    return { statementType: "diagnostic-revenue", narrativeScope: "revenue-only" }
  }
  if (reportView === "margin-by-revenue") {
    return { statementType: "diagnostic-margin-by-revenue", narrativeScope: "margin-by-revenue-only" }
  }
  if (reportView === "expenses") {
    return { statementType: "diagnostic-expenses", narrativeScope: "expenses-only" }
  }
  return { statementType: "income-statement", narrativeScope: "full" }
}

interface DiagnosticReportChartSectionProps {
  reportView: DiagnosticReportView
  companyId: string
  companies: Company[]
  latestFiscalYear: number
  fiscalYearEnd?: string
  signal?: { tone: SignalTone; text: string } | null
}

/**
 * Carte graphique du haut du rapport Diagnostic (Performance, Revenus, Marge par Revenus, Dépenses).
 * Config, paramètres et lecture narrative sont indépendants par vue.
 */
export function DiagnosticReportChartSection({
  reportView,
  companyId,
  companies,
  latestFiscalYear,
  fiscalYearEnd,
  signal,
}: DiagnosticReportChartSectionProps) {
  const [horizonView, setHorizonView] = useState<ChartHorizonToggleValue>("years")
  const { statementType, narrativeScope } = resolveReportChartConfig(reportView)

  const { slots, activeSlotId, setActiveSlotId, refresh, loading } = useStatementChartSlots(
    companyId,
    statementType,
  )

  const activeSlot = slots.find((s) => s.chartInstanceId === activeSlotId) ?? slots[0]

  const chartInstanceOptions = useMemo(
    () =>
      slots.map((s, i) => {
        const title = s.config.chartTitle.trim()
        const label = title || defaultChartCardTitle(statementType) || `Graphique ${i + 1}`
        return { id: s.chartInstanceId, label }
      }),
    [slots, statementType],
  )

  const referenceMonth = parseFiscalEndMonth(fiscalYearEnd)
  const chartView = horizonView === "years" ? "years" : "24months"

  return (
    <div id={DIAGNOSTIC_REPORT_ANCHOR_ID} className="scroll-mt-28">
      {loading && !activeSlot ? (
        <div className={`${CARD_CLASS} flex h-64 items-center justify-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
        </div>
      ) : activeSlot ? (
        <StatementChart
          key={`${reportView}-${activeSlot.chartInstanceId}-${chartView}`}
          statementType={statementType}
          slot={activeSlot}
          chartSlotNumber={slots.findIndex((s) => s.chartInstanceId === activeSlotId) + 1}
          chartSlotCount={slots.length}
          chartInstanceOptions={chartInstanceOptions.length > 1 ? chartInstanceOptions : undefined}
          onChartInstanceChange={setActiveSlotId}
          onChartConfigSaved={refresh}
          period="monthly"
          view={chartView}
          companyId={companyId}
          companies={companies}
          fiscalYear={latestFiscalYear}
          referenceMonth={referenceMonth}
          structureVersion={0}
          loading={loading}
          embeddedHorizon={{ value: horizonView, onChange: setHorizonView }}
          cardAppearance="diagnostic"
          narrativeScope={narrativeScope}
        />
      ) : null}

      {signal && reportView === "performance" ? (
        <div className={`${CARD_CLASS} mt-4 px-[18px] py-[14px]`}>
          <p data-testid="diagnostic-signal" className={signalClass(signal.tone)}>
            <span className="font-semibold">Signal</span> — {signal.text}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated Utiliser DiagnosticReportChartSection */
export const DiagnosticTrajectoryStatementChart = DiagnosticReportChartSection
