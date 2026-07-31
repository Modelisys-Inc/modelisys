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
  | "expenses-by-division-only"
  | "financial-position-only"
  | "working-capital-only"

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
  if (reportView === "expenses-by-division") {
    return {
      statementType: "diagnostic-expenses-by-division",
      narrativeScope: "expenses-by-division-only",
    }
  }
  if (reportView === "financial-position") {
    return {
      statementType: "diagnostic-financial-position",
      narrativeScope: "financial-position-only",
    }
  }
  if (reportView === "working-capital") {
    return {
      statementType: "diagnostic-working-capital",
      narrativeScope: "working-capital-only",
    }
  }
  return { statementType: "income-statement", narrativeScope: "full" }
}

interface DiagnosticReportChartSectionProps {
  reportView: DiagnosticReportView
  companyId: string
  companies: Company[]
  referenceYear: number
  referenceMonth: number
  currency?: string
  signal?: { tone: SignalTone; text: string } | null
}

/**
 * Carte graphique du haut du rapport Diagnostic (Performance, Revenus, Marge par Revenus, Dépenses).
 * La vue « Marge par Revenus » réutilise la configuration des séries de la vue « Revenus ».
 */
export function DiagnosticReportChartSection({
  reportView,
  companyId,
  companies,
  referenceYear,
  referenceMonth,
  currency,
  signal,
}: DiagnosticReportChartSectionProps) {
  const [horizonView, setHorizonView] = useState<ChartHorizonToggleValue>("years")
  const { statementType, narrativeScope } = resolveReportChartConfig(reportView)
  const slotStatementType: StatementType =
    reportView === "margin-by-revenue"
      ? "diagnostic-revenue"
      : reportView === "expenses-by-division"
        ? "diagnostic-expenses"
        : reportView === "financial-position"
          ? "diagnostic-financial-position"
          : reportView === "working-capital"
            ? "diagnostic-working-capital"
          : statementType

  const { slots, activeSlotId, setActiveSlotId, refresh, loading } = useStatementChartSlots(
    companyId,
    slotStatementType,
  )

  const activeSlot = slots.find((s) => s.chartInstanceId === activeSlotId) ?? slots[0]

  const chartInstanceOptions = useMemo(
    () =>
      slots.map((s, i) => {
        const title = s.config.chartTitle.trim()
        const label = title || defaultChartCardTitle(slotStatementType) || `Graphique ${i + 1}`
        return { id: s.chartInstanceId, label }
      }),
    [slots, slotStatementType],
  )

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
          chartConfigStatementType={
            reportView === "margin-by-revenue"
              ? "diagnostic-revenue"
              : reportView === "financial-position"
                ? "diagnostic-financial-position"
                : reportView === "working-capital"
                  ? "diagnostic-working-capital"
                : undefined
          }
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
          currency={currency}
          fiscalYear={referenceYear}
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
