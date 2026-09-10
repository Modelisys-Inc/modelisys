"use client"

import {
  BalanceSheetSummary,
  type NetTangibleValuationColumnValues,
  type NetTangibleValuationNotes,
} from "@/components/balance-sheet-summary"
import type { FinancialStatementRow, NoteAttachmentData } from "@/lib/api"
import { NetTangibleReportSection } from "./report-section"

export type NetTangibleBilanSectionProps = {
  referenceColumnLabel: string
  companyId: string | null
  companies: { id: string; name: string; divisions?: unknown[] }[]
  fiscalYear: number
  refMonth: number
  refYear: number
  rows: FinancialStatementRow[]
  loading: boolean
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
}

/**
 * Section 2 du rapport VCA — coquille narrative style FDR (section 3),
 * tableau en style buildup (bordures slate, montants mono).
 */
export function NetTangibleBilanSection({
  referenceColumnLabel,
  companyId,
  companies,
  fiscalYear,
  refMonth,
  refYear,
  rows,
  loading,
  valuesByRowId,
  notesByRowId,
  jvmByCodeByRowId,
  jvmNotesByCodeByRowId,
  jvmAttachmentsByCodeByRowId,
  excedentByCodeByRowId,
  excedentNotesByCodeByRowId,
  excedentAttachmentsByCodeByRowId,
  onSaveHypothesis,
}: NetTangibleBilanSectionProps) {
  return (
    <NetTangibleReportSection id="vca" number="2." title="Bilan ajusté (VCA)">
      <div data-testid="net-tangible-bilan-card">
        <p className="text-pretty text-sm leading-relaxed text-slate-500">
          Chaque poste du bilan à la date de référence peut faire l&apos;objet d&apos;une hypothèse
          d&apos;évaluation. Cliquez une cellule{" "}
          <span className="font-medium text-[#2A2F3A]">Ajustements</span>,{" "}
          <span className="font-medium text-[#2A2F3A]">Dettes</span> ou{" "}
          <span className="font-medium text-[#2A2F3A]">Excédent</span> pour ouvrir le moteur
          d&apos;hypothèse (montant, % de la VC, juste valeur, JVM Capex ou excédents d&apos;annexe).
          Les modifications sont enregistrées automatiquement.
        </p>

        <div className="mt-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bilan à la date de référence
          </p>
          <BalanceSheetSummary
            title="VCA"
            period="monthly"
            view="current"
            companyId={companyId}
            companies={companies as never}
            fiscalYear={fiscalYear}
            refMonth={refMonth}
            refYear={refYear}
            rows={rows}
            loading={loading}
            disableRowInteractions
            showBalanceWarning
            netTangibleValuationColumns={{
              referenceColumnLabel,
              valuesByRowId,
              notesByRowId,
              jvmByCodeByRowId,
              jvmNotesByCodeByRowId,
              jvmAttachmentsByCodeByRowId,
              excedentByCodeByRowId,
              excedentNotesByCodeByRowId,
              excedentAttachmentsByCodeByRowId,
              onSaveHypothesis,
            }}
          />
        </div>
      </div>
    </NetTangibleReportSection>
  )
}
