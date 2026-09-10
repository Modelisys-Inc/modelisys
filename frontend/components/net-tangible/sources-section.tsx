"use client"

import { InlineTextArea } from "@/components/cmpc/editable"
import { formatCurrency } from "@/lib/financial-utils"
import type {
  NetTangibleValuationColumnValues,
  NetTangibleValuationNotes,
} from "@/components/balance-sheet-summary"
import { NetTangibleReportSection } from "./report-section"

export type SourceRowGroup = "adjustments" | "debts" | "assets"

export type SourceRow = {
  id: string
  group: SourceRowGroup
  param: string
  valueLabel: string
  note: string
}

/** Poste d’annexe (ALT-B.1…) pour libellés spécifiques au sommaire sources. */
export type NetTangibleAnnexPostRef = {
  code: string
  label: string
  vc: number
}

type SourcesSectionProps = {
  rows: SourceRow[]
  onNoteChange: (id: string, note: string) => void
}

const SOURCE_GROUPS: { id: SourceRowGroup; title: string; empty: string }[] = [
  {
    id: "adjustments",
    title: "Ajustements",
    empty: "Aucun ajustement saisi pour le moment.",
  },
  {
    id: "debts",
    title: "Dettes",
    empty: "Aucune dette à soustraire saisie pour le moment.",
  },
  {
    id: "assets",
    title: "Excédent",
    empty: "Aucun excédent saisi pour le moment.",
  },
]

function formatParentChildParam(parentLabel: string, childLabel: string): string {
  return `${parentLabel} - ${childLabel}`
}

/** Montant d’écart / excédent avec signe explicite (+100 000 $). */
export function formatSignedSourceAmount(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount))
  if (amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

const SOURCE_COL = {
  /** Paramètre — largeur partagée entre Ajustements / Dettes / Excédent. */
  param: "w-[40%] min-w-[11rem]",
  /** Montant — largeur fixe pour aligner les colonnes entre sections. */
  amount: "w-[10.5rem]",
  note: "",
} as const

function SourcesGroupTable({
  groupId,
  rows,
  emptyLabel,
  onNoteChange,
}: {
  groupId: SourceRowGroup
  rows: SourceRow[]
  emptyLabel: string
  onNoteChange: (id: string, note: string) => void
}) {
  return (
    <div className="overflow-x-auto" data-testid={`net-tangible-sources-${groupId}`}>
      <table className="w-full min-w-[560px] table-fixed">
        <colgroup>
          <col className={SOURCE_COL.param} />
          <col className={SOURCE_COL.amount} />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th
              className={`${SOURCE_COL.param} py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500`}
            >
              Paramètre
            </th>
            <th
              className={`${SOURCE_COL.amount} py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500`}
            >
              Montant
            </th>
            <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Source / justification
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="border-b border-slate-200">
              <td colSpan={3} className="py-3 text-sm text-slate-500">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-200 align-top">
                <td className={`${SOURCE_COL.param} py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]`}>
                  {row.param}
                </td>
                <td
                  className={`${SOURCE_COL.amount} py-2.5 pr-4 text-right font-mono text-sm tabular-nums text-[#2A2F3A]`}
                >
                  {row.valueLabel}
                </td>
                <td className="py-2.5">
                  <InlineTextArea
                    value={row.note}
                    onChange={(note) => onNoteChange(row.id, note)}
                    ariaLabel={`Source — ${row.param}`}
                    placeholder="Source / justification"
                    testId={`net-tangible-source-${row.id}`}
                    rows={2}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function SourcesSection({ rows, onNoteChange }: SourcesSectionProps) {
  return (
    <NetTangibleReportSection
      id="sources"
      number="4."
      title="Sommaire des hypothèses et sources"
    >
      <p className="text-pretty text-sm leading-relaxed text-slate-500">
        Les notes et justifications des postes pour lesquels un ajustement, des dettes ou un
        excédent a été saisi (montant ≠ 0), ainsi que l&apos;éventuel écart de FDR représentatif,
        sont recensées ci-dessous par catégorie. Les immobilisations sont détaillées poste par
        poste (ex. Immobilisations corporelles - Terrain).
      </p>

      <div className="mt-5 space-y-8" data-testid="net-tangible-sources-table">
        {SOURCE_GROUPS.map((group, index) => {
          const groupRows = rows.filter((row) => row.group === group.id)
          return (
            <div key={group.id}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="font-mono text-[#E0742D]">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <span className="ml-2 text-[#2A2F3A]">{group.title}</span>
              </p>
              <SourcesGroupTable
                groupId={group.id}
                rows={groupRows}
                emptyLabel={group.empty}
                onNoteChange={onNoteChange}
              />
            </div>
          )
        })}
      </div>
    </NetTangibleReportSection>
  )
}

/** Construit les lignes sources — uniquement les postes avec montant d’ajustement / dettes / excédent (≠ 0). */
export function buildNetTangibleSourceRows(args: {
  rows: { id?: string; label: string; isSection?: boolean; isResult?: boolean }[]
  valuesByRowId: Record<string, NetTangibleValuationColumnValues>
  notesByRowId: Record<string, NetTangibleValuationNotes>
  jvmByCodeByRowId: Record<string, Record<string, number>>
  jvmNotesByCodeByRowId: Record<string, Record<string, string>>
  excedentByCodeByRowId: Record<string, Record<string, number>>
  excedentNotesByCodeByRowId: Record<string, Record<string, string>>
  /** Annexes Capex (ALT-B/C/D) : code → libellé + VC pour lignes spécifiques. */
  annexPostsByParentRowId?: Record<string, NetTangibleAnnexPostRef[]>
  fdrAdjNote: string
  fdrAdjustedValue: number | null
  fdrAdjModeLabel: string
  fdrAdjustmentDollarDelta?: number | null
}): SourceRow[] {
  const out: SourceRow[] = []
  const hasAmount = (n: number | null | undefined) =>
    n != null && Number.isFinite(n) && Math.abs(n) >= 1e-9

  for (const row of args.rows) {
    if (!row.id || row.isSection || !row.label?.trim()) continue
    const values = args.valuesByRowId[row.id]
    const notes = args.notesByRowId[row.id]
    if (!values) continue

    const annexPosts = args.annexPostsByParentRowId?.[row.id] ?? []
    const jvmValues = args.jvmByCodeByRowId[row.id] ?? {}
    const jvmNotes = args.jvmNotesByCodeByRowId[row.id] ?? {}
    const exValues = args.excedentByCodeByRowId[row.id] ?? {}
    const exNotes = args.excedentNotesByCodeByRowId[row.id] ?? {}

    const annexByCode = new Map(annexPosts.map((post) => [post.code, post]))
    // Codes JVM / Excédent persistés + postes d’annexe connus (même sans écart).
    const capexCodes = new Set<string>([
      ...annexPosts.map((post) => post.code),
      ...Object.keys(jvmValues),
      ...Object.keys(exValues),
    ])
    const isCapexAnnexRoot = capexCodes.size > 0

    // —— Ajustements : détail Capex poste par poste (jamais le seul total parent) ——
    let annexAdjCount = 0
    if (isCapexAnnexRoot) {
      for (const code of capexCodes) {
        const post = annexByCode.get(code)
        const vc = post?.vc ?? 0
        const label = post?.label?.trim() || code
        const rawJvm = jvmValues[code]
        // Sans JVM saisie : pas d’écart à lister (évite de fabriquer des lignes à 0).
        if (rawJvm == null || !Number.isFinite(rawJvm)) continue
        const delta = rawJvm - vc
        if (!hasAmount(delta)) continue
        annexAdjCount += 1
        out.push({
          id: `${row.id}-jvm-${code}`,
          group: "adjustments",
          param: formatParentChildParam(row.label, label),
          valueLabel: formatSignedSourceAmount(delta),
          note: jvmNotes[code]?.trim() ?? notes?.adjustments?.trim() ?? "",
        })
      }
    }
    // Repli parent seulement s’il n’y a aucune clé JVM Capex (hypothèse feuille classique).
    if (annexAdjCount === 0 && !Object.keys(jvmValues).length && hasAmount(values.adjustments)) {
      out.push({
        id: `${row.id}-adjustments`,
        group: "adjustments",
        param: row.label,
        valueLabel: formatSignedSourceAmount(values.adjustments),
        note: notes?.adjustments?.trim() ?? "",
      })
    }

    // —— Dettes (postes feuilles / parents non-annexe) ————————
    if (hasAmount(values.debts)) {
      out.push({
        id: `${row.id}-debts`,
        group: "debts",
        param: row.label,
        valueLabel: formatSignedSourceAmount(values.debts),
        note: notes?.debts?.trim() ?? "",
      })
    }

    // —— Excédent : détail Capex poste par poste ————————
    let annexExCount = 0
    if (isCapexAnnexRoot) {
      for (const code of capexCodes) {
        const post = annexByCode.get(code)
        const label = post?.label?.trim() || code
        const excedent = exValues[code] ?? 0
        if (!hasAmount(excedent)) continue
        annexExCount += 1
        out.push({
          id: `${row.id}-excedent-${code}`,
          group: "assets",
          param: formatParentChildParam(row.label, label),
          valueLabel: formatSignedSourceAmount(excedent),
          note: exNotes[code]?.trim() ?? notes?.assets?.trim() ?? "",
        })
      }
    }
    if (annexExCount === 0 && !Object.keys(exValues).length && hasAmount(values.assets)) {
      out.push({
        id: `${row.id}-assets`,
        group: "assets",
        param: row.label,
        valueLabel: formatSignedSourceAmount(values.assets),
        note: notes?.assets?.trim() ?? "",
      })
    }
  }

  if (hasAmount(args.fdrAdjustmentDollarDelta)) {
    out.push({
      id: "fdr-adjustment",
      group: "adjustments",
      param: `FDR représentatif — ${args.fdrAdjModeLabel}`,
      valueLabel:
        args.fdrAdjustedValue == null ? "—" : formatCurrency(args.fdrAdjustedValue),
      note: args.fdrAdjNote,
    })
  }

  return out
}
