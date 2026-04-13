"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, Download, FileText, Paperclip, Save, StickyNote, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { NoteAttachmentData } from "@/lib/api"
import { Note, saveNote, updateNote, deleteNote, getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

export const MAX_NOTE_ATTACHMENTS = 5
export const MAX_NOTE_FILE_BYTES = 4 * 1024 * 1024

export async function fileToAttachment(file: File): Promise<NoteAttachmentData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.includes(",") ? result.split(",")[1]! : result
      const mediaType = file.type || "application/octet-stream"
      resolve({ filename: file.name, media_type: mediaType, data: base64 })
    }
    reader.onerror = () => reject(new Error("read"))
    reader.readAsDataURL(file)
  })
}

export function downloadNoteAttachment(att: NoteAttachmentData) {
  const bin = atob(att.data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: att.media_type || "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = att.filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function NoteAttachmentsBlock({
  attachments,
  attachmentError,
  onFileChange,
  onRemove,
  inputId,
}: {
  attachments: NoteAttachmentData[]
  attachmentError: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (index: number) => void
  inputId: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pièces justificatives</p>
      <p className="text-xs text-slate-500">
        PDF, images, Excel ou Word (max. {MAX_NOTE_ATTACHMENTS} fichiers, 4 Mo chacun).
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.doc,.docx,application/pdf,image/*"
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-200 text-slate-700 hover:bg-slate-50"
        disabled={attachments.length >= MAX_NOTE_ATTACHMENTS}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Joindre un fichier
      </Button>
      {attachmentError && <p className="text-xs text-red-600">{attachmentError}</p>}
      {attachments.length > 0 && (
        <ul className="space-y-2 pt-1">
          {attachments.map((att, idx) => {
            const approxBytes = Math.ceil((att.data.length * 3) / 4)
            return (
              <li
                key={`${att.filename}-${idx}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/80 px-2.5 py-2 text-xs"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="truncate font-medium text-slate-800">{att.filename}</span>
                  <span className="shrink-0 text-slate-400">({formatFileSize(approxBytes)})</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600"
                    onClick={() => downloadNoteAttachment(att)}
                    title="Télécharger"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-red-600"
                    onClick={() => onRemove(idx)}
                    title="Retirer"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export interface IncomeStatementNotePanelProps {
  rowId: string
  rowLabel: string
  page: string
  period: "monthly" | "quarterly" | "annual"
  view: string
  companyId?: string | null
  companyName?: string | null
  divisionId?: string | null
  divisionName?: string | null
  subDivisionId?: string | null
  subDivisionName?: string | null
  currentAmount?: number | null
  priorAmount?: number | null
  variationPercent?: number | null
  variationAmount?: number | null
  /** Mois (1–12) et année calendaire de la date de référence (URL états financiers) — enregistrés sur la note */
  referenceMonth?: number | null
  referenceYear?: number | null
  /** Fermeture du panneau autonome (non utilisé en mode intégré). */
  onClose?: () => void
  onSaved?: () => void
  hideCloseButton?: boolean
  /** Vue étroite : fermer le panneau avant scroll vers la ligne */
  isNarrow: boolean
  /** Section intégrée sous l’analyse (pas d’en-tête complet ni doublon des montants) */
  embedded?: boolean
}

export function IncomeStatementNotePanel({
  rowId,
  rowLabel,
  page,
  period,
  view,
  companyId,
  companyName,
  divisionId,
  divisionName,
  subDivisionId,
  subDivisionName,
  currentAmount,
  priorAmount,
  variationPercent,
  variationAmount,
  referenceMonth,
  referenceYear,
  onClose = () => {},
  onSaved,
  hideCloseButton,
  isNarrow,
  embedded = false,
}: IncomeStatementNotePanelProps) {
  useNotesCache(companyId ?? null)
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<NoteAttachmentData[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [existingNote, setExistingNote] = useState<Note | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const note = getNoteByRowId(rowId, page, period, view, companyId, divisionId, subDivisionId)
    if (note) {
      setExistingNote(note)
      setContent(note.content)
      setAttachments(note.attachments?.length ? [...note.attachments] : [])
    } else {
      setExistingNote(null)
      setContent("")
      setAttachments([])
    }
    setAttachmentError(null)
  }, [rowId, page, period, view, companyId, divisionId, subDivisionId])

  const goBackToPoste = () => {
    const el = document.getElementById(`income-statement-detail-row-${rowId}`)
    const scroll = () => el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    if (isNarrow) {
      onClose()
      window.setTimeout(scroll, 220)
    } else {
      scroll()
    }
  }

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setAttachmentError(null)
    const next = [...attachments]
    for (const file of Array.from(files)) {
      if (file.size > MAX_NOTE_FILE_BYTES) {
        setAttachmentError(`« ${file.name} » dépasse 4 Mo.`)
        continue
      }
      if (next.length >= MAX_NOTE_ATTACHMENTS) {
        setAttachmentError(`Maximum ${MAX_NOTE_ATTACHMENTS} fichiers.`)
        break
      }
      try {
        const att = await fileToAttachment(file)
        next.push(att)
      } catch {
        setAttachmentError("Impossible de lire ce fichier.")
      }
    }
    setAttachments(next)
    e.target.value = ""
  }

  const handleSave = async () => {
    if (!content.trim() || isSaving) return
    setIsSaving(true)
    try {
      const refPayload =
        referenceMonth != null && referenceYear != null
          ? { referenceMonth, referenceYear }
          : {}
      if (existingNote) {
        await updateNote(
          existingNote.id,
          {
            content: content.trim(),
            currentAmount: existingNote.currentAmount ?? currentAmount,
            priorAmount: existingNote.priorAmount ?? priorAmount,
            variationPercent: existingNote.variationPercent ?? variationPercent,
            variationAmount: existingNote.variationAmount ?? variationAmount,
            attachments,
            ...refPayload,
          },
          companyId
        )
      } else {
        await saveNote({
          rowId,
          rowLabel,
          page,
          period,
          view,
          companyId,
          companyName,
          divisionId,
          divisionName,
          subDivisionId,
          subDivisionName,
          currentAmount,
          priorAmount,
          variationPercent,
          variationAmount,
          content: content.trim(),
          attachments,
          ...refPayload,
        })
      }
      const loaded = getNoteByRowId(rowId, page, period, view, companyId, divisionId, subDivisionId)
      if (loaded) {
        setExistingNote(loaded)
        setContent(loaded.content)
        setAttachments(loaded.attachments?.length ? [...loaded.attachments] : [])
      }
      onSaved?.()
    } catch (err) {
      console.error("Error saving note:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existingNote || !confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return
    setIsDeleting(true)
    try {
      await deleteNote(existingNote.id, companyId)
      setExistingNote(null)
      setContent("")
      setAttachments([])
      onSaved?.()
    } catch (err) {
      console.error("Error deleting note:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  const showFinancial =
    !embedded &&
    ((currentAmount !== null && currentAmount !== undefined) ||
      (priorAmount !== null && priorAmount !== undefined))

  const attachmentInputId = embedded ? `income-note-files-embedded-${rowId}` : `income-note-files-${rowId}`

  if (embedded) {
    return (
      <div className="space-y-4 border-t border-slate-200/90 pt-5">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-500">
            <StickyNote className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />
            Note d&apos;analyse
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Expliquez la variation ou le contexte — les montants figurent dans la section ci-dessus.
          </p>
        </div>

        <div>
          <label htmlFor={`income-note-textarea-${rowId}`} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Explication de la variation
          </label>
          <Textarea
            id={`income-note-textarea-${rowId}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Expliquez la variation observée, les facteurs ou événements pertinents…"
            className="mt-2 min-h-[140px] resize-none border-slate-200/90 text-sm text-slate-900 focus-visible:ring-amber-500/30"
          />
        </div>

        <NoteAttachmentsBlock
          attachments={attachments}
          attachmentError={attachmentError}
          onFileChange={handleFilesSelected}
          onRemove={(idx) => {
            setAttachments((prev) => prev.filter((_, i) => i !== idx))
            setAttachmentError(null)
          }}
          inputId={attachmentInputId}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <div className="flex flex-col gap-2">
            {existingNote?.createdByName ? (
              <p className="text-xs text-slate-500">
                Créée par <span className="font-medium text-slate-700">{existingNote.createdByName}</span>
              </p>
            ) : null}
            {existingNote && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Supprimer
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? "Enregistrement…" : existingNote ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-slate-200/90 pb-4">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={goBackToPoste}
            className="mb-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-[#2A2F3A]"
          >
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Retour au poste
          </button>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-500">
            <StickyNote className="h-3.5 w-3.5 shrink-0 text-sky-500" aria-hidden />
            Note d&apos;analyse
          </p>
          <h3 className="mt-2 text-base font-semibold leading-snug text-[#2A2F3A]">{rowLabel}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Documentez la variation ou le contexte pour votre clôture et vos analyses.
          </p>
        </div>
        {!hideCloseButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            onClick={onClose}
            aria-label="Fermer le panneau de note"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-4 py-4">
        {showFinancial && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Données financières</p>
            <div className="mt-2 rounded-lg border border-slate-200/90 bg-white/90 p-3 shadow-sm">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {currentAmount !== null && currentAmount !== undefined && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Montant actuel</p>
                    <p className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                      {formatCurrency(currentAmount)}
                    </p>
                  </div>
                )}
                {priorAmount !== null && priorAmount !== undefined && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Montant passé</p>
                    <p className="mt-0.5 font-mono font-semibold tabular-nums text-slate-600">
                      {formatCurrency(priorAmount)}
                    </p>
                  </div>
                )}
                {variationPercent !== null && variationPercent !== undefined && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Variation %</p>
                    <p
                      className={cn(
                        "mt-0.5 font-mono font-semibold tabular-nums",
                        variationPercent >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {variationPercent >= 0 ? "+" : ""}
                      {variationPercent.toFixed(1)}%
                    </p>
                  </div>
                )}
                {variationAmount !== null && variationAmount !== undefined && (
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Variation $</p>
                    <p
                      className={cn(
                        "mt-0.5 font-mono font-semibold tabular-nums",
                        variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                      )}
                    >
                      {variationAmount >= 0 ? "+" : ""}
                      {formatCurrency(variationAmount)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor={`income-note-textarea-${rowId}`} className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Explication de la variation
          </label>
          <Textarea
            id={`income-note-textarea-${rowId}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Expliquez la variation observée, les facteurs ou événements pertinents…"
            className="mt-2 min-h-[160px] resize-none border-slate-200/90 text-sm text-slate-900 focus-visible:ring-amber-500/30"
          />
        </div>

        <NoteAttachmentsBlock
          attachments={attachments}
          attachmentError={attachmentError}
          onFileChange={handleFilesSelected}
          onRemove={(idx) => {
            setAttachments((prev) => prev.filter((_, i) => i !== idx))
            setAttachmentError(null)
          }}
          inputId={attachmentInputId}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4">
          <div className="flex flex-col gap-2">
            {existingNote?.createdByName ? (
              <p className="text-xs text-slate-500">
                Créée par <span className="font-medium text-slate-700">{existingNote.createdByName}</span>
              </p>
            ) : null}
            {existingNote && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Supprimer
              </Button>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? "Enregistrement…" : existingNote ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </>
  )
}
