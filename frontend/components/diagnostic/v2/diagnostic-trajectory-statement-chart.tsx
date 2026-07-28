"use client"

import { useMemo, useState } from "react"
import type { Company } from "@/components/entity-selector"
import { StatementChart, type ChartHorizonToggleValue } from "@/components/statement-chart"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
import { defaultChartCardTitle } from "@/lib/statement-chart-config"
import { CARD_CLASS, signalClass, type SignalTone } from "@/lib/diagnostic-theme"

function parseFiscalEndMonth(fiscalYearEnd?: string): number {
  const raw = fiscalYearEnd?.split("-")[0]
  const n = parseInt(raw ?? "12", 10)
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : 12
}

interface DiagnosticTrajectoryStatementChartProps {
  companyId: string
  companies: Company[]
  latestFiscalYear: number
  fiscalYearEnd?: string
  signal?: { tone: SignalTone; text: string } | null
}

/**
 * Même carte « Performance financière » que le tableau de bord du compte de résultat
 * (config partagée, séries, paramètres), avec horizon limité à Annuel 5 ans / Mensuel.
 */
export function DiagnosticTrajectoryStatementChart({
  companyId,
  companies,
  latestFiscalYear,
  fiscalYearEnd,
  signal,
}: DiagnosticTrajectoryStatementChartProps) {
  const [horizonView, setHorizonView] = useState<ChartHorizonToggleValue>("years")

  const { slots, activeSlotId, setActiveSlotId, refresh, loading } = useStatementChartSlots(
    companyId,
    "income-statement",
  )

  const activeSlot = slots.find((s) => s.chartInstanceId === activeSlotId) ?? slots[0]

  const chartInstanceOptions = useMemo(
    () =>
      slots.map((s, i) => {
        const title = s.config.chartTitle.trim()
        const label = title || defaultChartCardTitle("income-statement") || `Graphique ${i + 1}`
        return { id: s.chartInstanceId, label }
      }),
    [slots],
  )

  const referenceMonth = parseFiscalEndMonth(fiscalYearEnd)

  return (
    <div id="diag-trajectoire" className="scroll-mt-28">
      {loading && !activeSlot ? (
        <div className={`${CARD_CLASS} flex h-64 items-center justify-center`}>
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
        </div>
      ) : activeSlot ? (
        <StatementChart
          key={`${activeSlot.chartInstanceId}-${horizonView}`}
          statementType="income-statement"
          slot={activeSlot}
          chartSlotNumber={slots.findIndex((s) => s.chartInstanceId === activeSlotId) + 1}
          chartSlotCount={slots.length}
          chartInstanceOptions={chartInstanceOptions.length > 1 ? chartInstanceOptions : undefined}
          onChartInstanceChange={setActiveSlotId}
          onChartConfigSaved={refresh}
          period="monthly"
          view={horizonView}
          companyId={companyId}
          companies={companies}
          fiscalYear={latestFiscalYear}
          referenceMonth={referenceMonth}
          structureVersion={0}
          loading={loading}
          embeddedHorizon={{ value: horizonView, onChange: setHorizonView }}
        />
      ) : null}

      {signal ? (
        <div className={`${CARD_CLASS} mt-4 px-[18px] py-[14px]`}>
          <p data-testid="diagnostic-signal" className={signalClass(signal.tone)}>
            <span className="font-semibold">Signal</span> — {signal.text}
          </p>
        </div>
      ) : null}
    </div>
  )
}
