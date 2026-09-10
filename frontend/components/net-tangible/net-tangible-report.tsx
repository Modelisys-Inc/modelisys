"use client"

import {
  type NetTangibleValuationColumnValues,
  type NetTangibleValuationNotes,
} from "@/components/balance-sheet-summary"
import { NetTangibleOverviewStrip } from "@/components/net-tangible-overview-strip"
import type { FinancialStatementRow, NoteAttachmentData } from "@/lib/api"
import type { NetTangibleOverviewMetric } from "@/lib/net-tangible-overview"
import { cn } from "@/lib/utils"
import { MethodSection, DisclaimerSection } from "./method-section"
import { FdrSection, type FdrAdjustmentMode } from "./fdr-section"
import { NetTangibleBilanSection } from "./bilan-section"
import {
  SourcesSection,
  buildNetTangibleSourceRows,
  type SourceRow,
} from "./sources-section"

const REPORT_NAV = [
  { id: "methode", label: "1. Méthode", testId: "net-tangible-section-methode" },
  { id: "vca", label: "2. VCA", testId: "net-tangible-section-vca" },
  { id: "fdr-representatif", label: "3. FDR", testId: "net-tangible-section-fdr-representatif" },
  { id: "sources", label: "4. Sources", testId: "net-tangible-section-sources" },
] as const

export type NetTangibleReportProps = {
  companyName: string
  referenceLabel: string
  referenceColumnLabel: string
  companyId: string | null
  companies: { id: string; name: string; divisions?: unknown[] }[]
  fiscalYear: number
  refMonth: number
  refYear: number
  rows: FinancialStatementRow[]
  loading: boolean
  overviewMetrics: NetTangibleOverviewMetric[]
  valuesByRowId: Record<string, NetTangibleValuationColumnValues>
  notesByRowId: Record<string, NetTangibleValuationNotes>
  jvmByCodeByRowId: Record<string, Record<string, number>>
  jvmNotesByCodeByRowId: Record<string, Record<string, string>>
  jvmAttachmentsByCodeByRowId: Record<string, Record<string, NoteAttachmentData[]>>
  excedentByCodeByRowId: Record<string, Record<string, number>>
  excedentNotesByCodeByRowId: Record<string, Record<string, string>>
  excedentAttachmentsByCodeByRowId: Record<string, Record<string, NoteAttachmentData[]>>
  onSaveHypothesis: (
    rowId: string,
    values: NetTangibleValuationColumnValues,
    notes: NetTangibleValuationNotes,
    extras?: {
      jvmByCode?: Record<string, number>
      jvmNotesByCode?: Record<string, string>
      jvmAttachmentsByCode?: Record<string, NoteAttachmentData[]>
      excedentByCode?: Record<string, number>
      excedentNotesByCode?: Record<string, string>
      excedentAttachmentsByCode?: Record<string, NoteAttachmentData[]>
    },
  ) => void
  fdr: {
    fdrBaseLine: number | null
    fdrBasePctOfRevenue: number | null
    revenueTotal: number | null
    fdrAdjMode: FdrAdjustmentMode
    fdrAdjValue: number
    fdrAdjNote: string
    fdrAdjustmentDollarDelta: number | null
    fdrAdjustmentPctOfRevenue: number | null
    fdrAdjustedValue: number | null
    fdrAdjustedPctOfRevenue: number | null
    onAdjValueChange: (value: number) => void
    onAdjNoteChange: (note: string) => void
    onModeChange: (mode: FdrAdjustmentMode) => void
    onSave: () => void
  }
  sourceRows: SourceRow[]
  onSourceNoteChange: (id: string, note: string) => void
}

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

export function NetTangibleReport({
  companyName,
  referenceLabel,
  referenceColumnLabel,
  companyId,
  companies,
  fiscalYear,
  refMonth,
  refYear,
  rows,
  loading,
  overviewMetrics,
  valuesByRowId,
  notesByRowId,
  jvmByCodeByRowId,
  jvmNotesByCodeByRowId,
  jvmAttachmentsByCodeByRowId,
  excedentByCodeByRowId,
  excedentNotesByCodeByRowId,
  excedentAttachmentsByCodeByRowId,
  onSaveHypothesis,
  fdr,
  sourceRows,
  onSourceNoteChange,
}: NetTangibleReportProps) {
  return (
    <article
      data-testid="net-tangible-report"
      data-report-sheet
      className="overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]"
    >
      <NetTangibleOverviewStrip metrics={overviewMetrics} variant="report" />

      <div className="px-6 pb-8 pt-10 sm:px-12 sm:pb-12">
        <div className="mb-6" aria-hidden>
          <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-[#E6D6C3]/50 to-transparent" />
        </div>

        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
              Détail du rapport
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Parcourez les étapes pour documenter la méthode, le bilan, le FDR et les sources.
            </p>
          </div>
        </div>

        <nav
          data-testid="net-tangible-section-menu"
          aria-label="Sommaire du rapport"
          className="flex flex-wrap gap-1 border-b border-slate-200 pb-3"
        >
          {REPORT_NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={item.testId}
              onClick={() => scrollToSection(item.id)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-[#222732]/[0.03] hover:text-[#222732]",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <MethodSection />

        <NetTangibleBilanSection
          referenceColumnLabel={referenceColumnLabel}
          companyId={companyId}
          companies={companies}
          fiscalYear={fiscalYear}
          refMonth={refMonth}
          refYear={refYear}
          rows={rows}
          loading={loading}
          valuesByRowId={valuesByRowId}
          notesByRowId={notesByRowId}
          jvmByCodeByRowId={jvmByCodeByRowId}
          jvmNotesByCodeByRowId={jvmNotesByCodeByRowId}
          jvmAttachmentsByCodeByRowId={jvmAttachmentsByCodeByRowId}
          excedentByCodeByRowId={excedentByCodeByRowId}
          excedentNotesByCodeByRowId={excedentNotesByCodeByRowId}
          excedentAttachmentsByCodeByRowId={excedentAttachmentsByCodeByRowId}
          onSaveHypothesis={onSaveHypothesis}
        />

        <FdrSection
          referenceColumnLabel={referenceColumnLabel}
          fdrBaseLine={fdr.fdrBaseLine}
          fdrBasePctOfRevenue={fdr.fdrBasePctOfRevenue}
          revenueTotal={fdr.revenueTotal}
          fdrAdjMode={fdr.fdrAdjMode}
          fdrAdjValue={fdr.fdrAdjValue}
          fdrAdjNote={fdr.fdrAdjNote}
          fdrAdjustmentDollarDelta={fdr.fdrAdjustmentDollarDelta}
          fdrAdjustmentPctOfRevenue={fdr.fdrAdjustmentPctOfRevenue}
          fdrAdjustedValue={fdr.fdrAdjustedValue}
          fdrAdjustedPctOfRevenue={fdr.fdrAdjustedPctOfRevenue}
          onAdjValueChange={fdr.onAdjValueChange}
          onAdjNoteChange={fdr.onAdjNoteChange}
          onModeChange={fdr.onModeChange}
          onSave={fdr.onSave}
        />

        <SourcesSection rows={sourceRows} onNoteChange={onSourceNoteChange} />

        <DisclaimerSection />

        <footer className="mt-10 border-t border-slate-200 pt-4">
          <p className="text-pretty text-[11px] leading-relaxed text-slate-500">
            Rapport indicatif de détermination de la valeur comptable ajustée · {companyName} ·{" "}
            {referenceLabel}
          </p>
        </footer>
      </div>
    </article>
  )
}

export { buildNetTangibleSourceRows }
export type { SourceRow, FdrAdjustmentMode }
