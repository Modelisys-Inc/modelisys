"use client"

import { useMemo, useRef, useState } from "react"
import { InlineTextArea } from "@/components/cmpc/editable"
import { Button } from "@/components/ui/button"
import {
  MAX_NOTE_ATTACHMENTS,
  MAX_NOTE_FILE_BYTES,
  downloadNoteAttachment,
  fileToAttachment,
} from "@/components/income-statement-note-panel"
import { NetTangibleReportSection } from "@/components/net-tangible/report-section"
import {
  CAPITALISATION_SOURCE_DEFS,
  averageComparableMultipleBand,
  type CapitalisationSourceEntry,
  type CapitalisationSourceId,
  type ComparableMultiplesConfig,
} from "@/lib/ebitda-capitalisation"
import {
  formatCmpcPct,
  type CmpcDebtCapacityInputs,
  type CmpcRepaymentCapacityInputs,
} from "@/lib/cmpc-wacc"
import type { NoteAttachmentData } from "@/lib/api"
import { Download, Paperclip, X } from "lucide-react"

export type CapitalisationSourcesSectionProps = {
  number?: string
  sources: CapitalisationSourceEntry[]
  onChange: (next: CapitalisationSourceEntry[]) => void
  comparableMultiples: ComparableMultiplesConfig
  repaymentCapacity: CmpcRepaymentCapacityInputs
  debtCapacity: CmpcDebtCapacityInputs
}

function formatMultipleOrDash(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

function formatComparableSourceValue(
  config: ComparableMultiplesConfig,
  sourceId: "empirical" | "ai" | "comparables",
): string {
  const rev = averageComparableMultipleBand(config[sourceId].veOverRevenue)
  const baiia = averageComparableMultipleBand(config[sourceId].veOverBaiia)
  return `Rev. ${formatMultipleOrDash(rev)} · BAIIA ${formatMultipleOrDash(baiia)}`
}

function formatSourceValue(
  id: CapitalisationSourceId,
  comparableMultiples: ComparableMultiplesConfig,
  repaymentCapacity: CmpcRepaymentCapacityInputs,
  debtCapacity: CmpcDebtCapacityInputs,
): string {
  switch (id) {
    case "multiples-empirical":
      return formatComparableSourceValue(comparableMultiples, "empirical")
    case "multiples-ai":
      return formatComparableSourceValue(comparableMultiples, "ai")
    case "multiples-comparables":
      return formatComparableSourceValue(comparableMultiples, "comparables")
    case "repayment-rate":
      return formatCmpcPct(repaymentCapacity.annualInterestRate)
    case "repayment-duration": {
      const n = repaymentCapacity.durationYears
      if (!Number.isFinite(n)) return "—"
      return `${n} an${n === 1 ? "" : "s"}`
    }
    case "debt-baiia-empirical":
      return formatMultipleOrDash(debtCapacity.debtBaiiaEmpirical)
    case "debt-baiia-ai":
      return formatMultipleOrDash(debtCapacity.debtBaiiaAi)
    case "debt-baiia-comparables":
      return formatMultipleOrDash(debtCapacity.debtBaiiaComparables)
    default:
      return "—"
  }
}

function CompactRowAttachments({
  id,
  attachments,
  error,
  onFiles,
  onRemove,
}: {
  id: CapitalisationSourceId
  attachments: NoteAttachmentData[]
  error: string | null
  onFiles: (files: FileList | null) => void
  onRemove: (index: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="mt-1.5 space-y-1.5" data-print-hide>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          ref={inputRef}
          id={`capitalisation-source-files-${id}`}
          type="file"
          multiple
          className="sr-only"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.doc,.docx,application/pdf,image/*"
          onChange={(e) => {
            onFiles(e.target.files)
            e.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-1.5 text-xs text-slate-500 hover:text-[#2A2F3A]"
          disabled={attachments.length >= MAX_NOTE_ATTACHMENTS}
          onClick={() => inputRef.current?.click()}
          aria-label="Joindre un fichier"
          data-testid={`capitalisation-source-attach-${id}`}
        >
          <Paperclip className="size-3.5" aria-hidden />
          Pièce jointe
        </Button>
        {attachments.length > 0 ? (
          <span className="text-[11px] text-slate-400">
            {attachments.length}/{MAX_NOTE_ATTACHMENTS}
          </span>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {attachments.length > 0 ? (
        <ul className="space-y-1">
          {attachments.map((att, idx) => (
            <li
              key={`${att.filename}-${idx}`}
              className="flex items-center gap-1.5 text-xs text-slate-600"
            >
              <span className="min-w-0 truncate font-medium">{att.filename}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-slate-500"
                onClick={() => downloadNoteAttachment(att)}
                title="Télécharger"
              >
                <Download className="size-3" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-slate-500 hover:text-red-600"
                onClick={() => onRemove(idx)}
                title="Retirer"
              >
                <X className="size-3" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function CapitalisationSourcesSection({
  number = "5.",
  sources,
  onChange,
  comparableMultiples,
  repaymentCapacity,
  debtCapacity,
}: CapitalisationSourcesSectionProps) {
  const [attachmentErrorById, setAttachmentErrorById] = useState<
    Partial<Record<CapitalisationSourceId, string | null>>
  >({})

  const byId = useMemo(() => {
    const map = new Map<CapitalisationSourceId, CapitalisationSourceEntry>()
    for (const entry of sources) map.set(entry.id, entry)
    return map
  }, [sources])

  const updateEntry = (
    id: CapitalisationSourceId,
    patch: Partial<Pick<CapitalisationSourceEntry, "content" | "attachments">>,
  ) => {
    onChange(
      CAPITALISATION_SOURCE_DEFS.map((def) => {
        const current = byId.get(def.id) ?? {
          id: def.id,
          content: "",
          attachments: [],
        }
        if (def.id !== id) return current
        return { ...current, ...patch }
      }),
    )
  }

  const handleFiles = async (id: CapitalisationSourceId, fileList: FileList | null) => {
    if (!fileList?.length) return
    const entry = byId.get(id) ?? { id, content: "", attachments: [] }
    const nextAttachments = [...entry.attachments]
    let error: string | null = null
    for (const file of Array.from(fileList)) {
      if (nextAttachments.length >= MAX_NOTE_ATTACHMENTS) {
        error = `Maximum ${MAX_NOTE_ATTACHMENTS} fichiers par source.`
        break
      }
      if (file.size > MAX_NOTE_FILE_BYTES) {
        error = `${file.name} dépasse 4 Mo.`
        continue
      }
      try {
        nextAttachments.push(await fileToAttachment(file))
      } catch {
        error = `Impossible de lire ${file.name}.`
      }
    }
    setAttachmentErrorById((prev) => ({ ...prev, [id]: error }))
    updateEntry(id, { attachments: nextAttachments })
  }

  return (
    <NetTangibleReportSection
      id="sources"
      number={number}
      title="Sommaire des hypothèses et sources"
    >
      <div className="overflow-x-auto" data-testid="capitalisation-sources-list">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr className="border-b-2 border-[#2A2F3A] text-left">
              <th className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paramètre
              </th>
              <th className="py-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Valeur
              </th>
              <th className="py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Source / justification
              </th>
            </tr>
          </thead>
          <tbody>
            {CAPITALISATION_SOURCE_DEFS.map((def) => {
              const entry = byId.get(def.id) ?? {
                id: def.id,
                content: "",
                attachments: [],
              }
              const value = formatSourceValue(
                def.id,
                comparableMultiples,
                repaymentCapacity,
                debtCapacity,
              )
              return (
                <tr
                  key={def.id}
                  className="border-b border-slate-200 align-top"
                  data-testid={`capitalisation-source-${def.id}`}
                >
                  <td className="py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]">
                    {def.label}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-sm tabular-nums text-[#2A2F3A]">
                    {value}
                  </td>
                  <td className="py-2.5">
                    <InlineTextArea
                      value={entry.content}
                      onChange={(content) => updateEntry(def.id, { content })}
                      ariaLabel={`Source / justification — ${def.label}`}
                      placeholder="Source / justification"
                      testId={`capitalisation-source-content-${def.id}`}
                      rows={2}
                    />
                    <CompactRowAttachments
                      id={def.id}
                      attachments={entry.attachments}
                      error={attachmentErrorById[def.id] ?? null}
                      onFiles={(files) => void handleFiles(def.id, files)}
                      onRemove={(attIndex) =>
                        updateEntry(def.id, {
                          attachments: entry.attachments.filter((_, i) => i !== attIndex),
                        })
                      }
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </NetTangibleReportSection>
  )
}
