"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Activity, ArrowRight, TrendingUp } from "lucide-react"
import type { Company } from "@/components/entity-selector"
import {
  StatementChart,
  EmbeddedHorizonToggle,
  type ChartHorizonToggleValue,
} from "@/components/statement-chart"
import { WorkingCapitalAnalysis } from "@/components/working-capital-analysis"
import { CapexAnalysis } from "@/components/capex-analysis"
import { useStatementChartSlots } from "@/hooks/use-statement-chart-slots"
import type { DiagnosticReportSlotBundle } from "@/hooks/use-diagnostic-report-slot-bundles"
import { EmptyState } from "@/components/diagnostic/report/report-components"
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
  | "capex-only"

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
  if (reportView === "capex") {
    return {
      statementType: "income-statement",
      narrativeScope: "capex-only",
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
  /** Rapport imprimé : graphique seul ou lecture seule. */
  printSegment?: "chart" | "narrative"
  /** Slots pré-chargés (rapport imprimé) — évite des requêtes dupliquées. */
  slotBundle?: DiagnosticReportSlotBundle | null
  /** Pagination lecture rapport (0 = première page). */
  narrativePageIndex?: number
  /** Nombre total de pages lecture (déterminé par la page 0). */
  onNarrativePageCount?: (count: number) => void
  /** Rapport : segment graphique (pont / seuil de rentabilité). */
  printChartPart?: import("@/lib/report-narrative-pagination").ReportPrintChartPart
  /** Rapport : nombre de pages graphiques. */
  onPrintChartPageCount?: (count: number) => void
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
  printSegment,
  slotBundle,
  narrativePageIndex,
  onNarrativePageCount,
  printChartPart,
  onPrintChartPageCount,
}: DiagnosticReportChartSectionProps) {
  const [horizonView, setHorizonView] = useState<ChartHorizonToggleValue>("years")
  const isWorkingCapitalView = reportView === "working-capital"
  const isCapexView = reportView === "capex"
  const isReportPrint = printSegment != null
  const { statementType, narrativeScope } = resolveReportChartConfig(reportView)
  const slotStatementType: StatementType =
    reportView === "margin-by-revenue"
      ? "diagnostic-revenue"
      : reportView === "expenses-by-division"
        ? "diagnostic-expenses"
        : reportView === "financial-position"
          ? "diagnostic-financial-position"
          : statementType

  const internalSlots = useStatementChartSlots(
    slotBundle || isWorkingCapitalView || isCapexView ? null : companyId,
    slotStatementType,
  )

  const slots = slotBundle?.slots ?? internalSlots.slots
  const loading = slotBundle?.loading ?? internalSlots.loading
  const slotError = slotBundle?.error ?? internalSlots.error
  const activeSlot =
    slotBundle?.activeSlot ??
    slots.find((s) => s.chartInstanceId === internalSlots.activeSlotId) ??
    slots[0] ??
    null

  const chartInstanceOptions = useMemo(
    () =>
      slots.map((s, i) => {
        const title = s.config.chartTitle.trim()
        const label = title || defaultChartCardTitle(slotStatementType) || `Graphique ${i + 1}`
        return { id: s.chartInstanceId, label }
      }),
    [slots, slotStatementType],
  )

  const setActiveSlotId = internalSlots.setActiveSlotId
  const refresh = internalSlots.refresh

  const chartView = horizonView === "years" ? "years" : "24months"
  const analysisView = horizonView === "years" ? "years" : "12months"
  const companyName = companies.find((c) => c.id === companyId)?.name ?? "Société sélectionnée"

  if (isWorkingCapitalView) {
    if (isReportPrint) {
      return (
        <WorkingCapitalAnalysis
          appearance="report"
          printSegment={printSegment}
          period="monthly"
          view={analysisView}
          companyId={companyId}
          companies={companies}
          fiscalYear={referenceYear}
          referenceMonth={referenceMonth}
          showStructureSettings={false}
          narrativePageIndex={narrativePageIndex}
          onNarrativePageCount={onNarrativePageCount}
        />
      )
    }

    const workingCapitalHref = `/analysis/working-capital?companyId=${companyId}&refYear=${referenceYear}&refMonth=${referenceMonth}`

    return (
      <section
        id={DIAGNOSTIC_REPORT_ANCHOR_ID}
        data-testid="working-capital-report"
        className={`${CARD_CLASS} scroll-mt-28`}
      >
        <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <TrendingUp className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1 text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">
                  Fonds de roulement
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5F66]">
                  <EmbeddedHorizonToggle
                    value={horizonView}
                    onChange={setHorizonView}
                    variant="diagnostic"
                  />
                  <span className="text-slate-300" aria-hidden>
                    •
                  </span>
                  <span className="font-semibold text-[#2A2F3A]">{companyName}</span>
                  <span className="text-slate-300" aria-hidden>
                    •
                  </span>
                  <span className="text-xs text-slate-500">
                    Structure fonds de roulement (bilan + TTM résultat)
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={workingCapitalHref}
              className="inline-flex flex-none items-center gap-1 text-[11px] font-medium text-[#E0742D] transition-colors hover:text-[#F08F4F]"
            >
              Voir l&apos;analyse détaillée
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </div>

        <WorkingCapitalAnalysis
          appearance="diagnostic"
          period="monthly"
          view={analysisView}
          companyId={companyId}
          companies={companies}
          fiscalYear={referenceYear}
          referenceMonth={referenceMonth}
          showStructureSettings={false}
        />
      </section>
    )
  }

  if (isCapexView) {
    if (isReportPrint) {
      return (
        <CapexAnalysis
          appearance="report"
          printSegment={printSegment}
          period="monthly"
          view={analysisView}
          companyId={companyId}
          companies={companies}
          fiscalYear={referenceYear}
          referenceMonth={referenceMonth}
          showStructureSettings={false}
          narrativePageIndex={narrativePageIndex}
          onNarrativePageCount={onNarrativePageCount}
        />
      )
    }

    const capexHref = `/analysis/capex?companyId=${companyId}&refYear=${referenceYear}&refMonth=${referenceMonth}`

    return (
      <section
        id={DIAGNOSTIC_REPORT_ANCHOR_ID}
        data-testid="capex-report"
        className={`${CARD_CLASS} scroll-mt-28`}
      >
        <div className="relative border-b border-slate-200 bg-white/90 px-6 py-5 sm:px-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Activity className="h-7 w-7 text-[#2A2F3A]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-1 text-xl font-semibold leading-tight tracking-tight text-[#2A2F3A] text-balance">
                  Capex
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[#5C5F66]">
                  <EmbeddedHorizonToggle
                    value={horizonView}
                    onChange={setHorizonView}
                    variant="diagnostic"
                  />
                  <span className="text-slate-300" aria-hidden>
                    •
                  </span>
                  <span className="font-semibold text-[#2A2F3A]">{companyName}</span>
                  <span className="text-slate-300" aria-hidden>
                    •
                  </span>
                  <span className="text-xs text-slate-500">Structure investissements (bilan + CDR)</span>
                </div>
              </div>
            </div>
            <Link
              href={capexHref}
              className="inline-flex flex-none items-center gap-1 text-[11px] font-medium text-[#E0742D] transition-colors hover:text-[#F08F4F]"
            >
              Voir l&apos;analyse détaillée
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
        </div>

        <CapexAnalysis
          key={analysisView}
          appearance="diagnostic"
          period="monthly"
          view={analysisView}
          companyId={companyId}
          companies={companies}
          fiscalYear={referenceYear}
          referenceMonth={referenceMonth}
          showStructureSettings={false}
        />
      </section>
    )
  }

  if (printSegment === "narrative") {
    if (loading && !activeSlot) {
      return (
        <div className="report-chart-loading flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
        </div>
      )
    }
    if (!activeSlot) {
      return (
        <EmptyState
          message={
            slotError
              ? `Impossible de charger la configuration du graphique : ${slotError}`
              : "Configuration du graphique indisponible pour cette analyse."
          }
        />
      )
    }
    return (
      <StatementChart
        key={`${reportView}-narrative-${chartView}`}
        statementType={statementType}
        chartConfigStatementType={
          reportView === "margin-by-revenue"
            ? "diagnostic-revenue"
            : reportView === "financial-position"
              ? "diagnostic-financial-position"
              : undefined
        }
        slot={activeSlot}
        period="monthly"
        view={chartView}
        companyId={companyId}
        companies={companies}
        currency={currency}
        fiscalYear={referenceYear}
        referenceMonth={referenceMonth}
        structureVersion={0}
        loading={loading}
        cardAppearance="report"
        narrativeScope={narrativeScope}
        printSegment="narrative"
        narrativePageIndex={narrativePageIndex}
        onNarrativePageCount={onNarrativePageCount}
      />
    )
  }

  const statementChartCommon = activeSlot
    ? {
        statementType,
        chartConfigStatementType:
          reportView === "margin-by-revenue"
            ? ("diagnostic-revenue" as const)
            : reportView === "financial-position"
              ? ("diagnostic-financial-position" as const)
              : undefined,
        slot: activeSlot,
        period: "monthly" as const,
        view: chartView,
        companyId,
        companies,
        currency,
        fiscalYear: referenceYear,
        referenceMonth,
        structureVersion: 0,
        loading,
        narrativeScope,
      }
    : null

  if (printSegment === "chart") {
    if (loading && !activeSlot) {
      return (
        <div className="report-chart-loading flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#E0742D]" />
        </div>
      )
    }
    if (!statementChartCommon) {
      return (
        <EmptyState
          message={
            slotError
              ? `Impossible de charger la configuration du graphique : ${slotError}`
              : "Configuration du graphique indisponible pour cette analyse."
          }
        />
      )
    }
    return (
      <StatementChart
        key={`${reportView}-chart-${activeSlot!.chartInstanceId}-${chartView}-${printChartPart ?? "main"}`}
        {...statementChartCommon}
        cardAppearance="report"
        printSegment="chart"
        printChartPart={printChartPart}
        onPrintChartPageCount={onPrintChartPageCount}
      />
    )
  }

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
                : undefined
          }
          slot={activeSlot}
          chartSlotNumber={slots.findIndex((s) => s.chartInstanceId === activeSlot.chartInstanceId) + 1}
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
          embeddedHorizon={{ value: horizonView, onChange: setHorizonView, variant: "diagnostic" }}
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
