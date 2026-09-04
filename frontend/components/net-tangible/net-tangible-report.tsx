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
      className="rounded-xl border border-slate-200 bg-white px-6 py-8 shadow-lg sm:px-12 sm:py-12"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E0742D]">
          Détermination de la valeur
        </p>
        <h2 className="mt-2 text-balance text-2xl font-semibold leading-tight tracking-tight text-[#2A2F3A] sm:text-3xl">
          Valeur comptable ajustée d&apos;une société privée
        </h2>
        <p className="mt-3 max-w-3xl text-pretty text-sm leading-relaxed text-slate-500">
          Le présent rapport établit la valeur comptable ajustée (VCA), l&apos;actif net tangible
          (ACN) et le fonds de roulement représentatif de{" "}
          <span className="font-medium text-[#2A2F3A]">{companyName}</span>, en date du{" "}
          <span className="font-medium text-[#2A2F3A]">{referenceLabel}</span>, à partir du bilan de
          référence et des hypothèses d&apos;évaluation documentées ci-après.
        </p>
      </header>

      <NetTangibleOverviewStrip metrics={overviewMetrics} variant="report" />

      <nav
        data-testid="net-tangible-section-menu"
        aria-label="Sommaire du rapport"
        className="mt-8 flex flex-wrap gap-1 border-b border-slate-200 pb-3"
      >
        {REPORT_NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={item.testId}
            onClick={() => scrollToSection(item.id)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-[#2A2F3A]",
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
    </article>
  )
}

export { buildNetTangibleSourceRows }
export type { SourceRow, FdrAdjustmentMode }
