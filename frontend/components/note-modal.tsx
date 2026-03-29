"use client"

import { useState, useEffect } from "react"
import { X, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Note, saveNote, updateNote, deleteNote, getNoteByRowId, useNotesCache } from "@/lib/notes-storage"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"

interface NoteModalProps {
  isOpen: boolean
  onClose: () => void
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
  // Financial data
  currentAmount?: number | null
  priorAmount?: number | null
  variationPercent?: number | null
  variationAmount?: number | null
  onSave?: () => void
}

export function NoteModal({
  isOpen,
  onClose,
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
  onSave,
}: NoteModalProps) {
  const [content, setContent] = useState("")
  const [existingNote, setExistingNote] = useState<Note | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize notes cache for this company
  useNotesCache(companyId ?? null)

  useEffect(() => {
    if (isOpen) {
      const note = getNoteByRowId(rowId, page, period, view, companyId, divisionId, subDivisionId)
      if (note) {
        setExistingNote(note)
        setContent(note.content)
      } else {
        setExistingNote(null)
        setContent("")
      }
    }
  }, [isOpen, rowId, page, period, view, companyId, divisionId, subDivisionId])

  const handleSave = async () => {
    if (!content.trim() || isSaving) return
    setIsSaving(true)

    try {
      if (existingNote) {
        await updateNote(existingNote.id, {
          content: content.trim(),
          currentAmount: existingNote.currentAmount ?? currentAmount,
          priorAmount: existingNote.priorAmount ?? priorAmount,
          variationPercent: existingNote.variationPercent ?? variationPercent,
          variationAmount: existingNote.variationAmount ?? variationAmount,
        }, companyId)
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
        })
      }

      onSave?.()
      onClose()
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
      onSave?.()
      onClose()
    } catch (err) {
      console.error("Error deleting note:", err)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Note d'analyse</h2>
            <p className="text-sm text-slate-300">{rowLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Financial Data Summary */}
          {((currentAmount !== null && currentAmount !== undefined) || (priorAmount !== null && priorAmount !== undefined)) && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Données financières</h3>
              <div className="grid grid-cols-2 gap-4">
                {currentAmount !== null && currentAmount !== undefined && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Montant actuel</p>
                    <p className="text-sm font-mono font-semibold text-slate-900">{formatCurrency(currentAmount)}</p>
                  </div>
                )}
                {priorAmount !== null && priorAmount !== undefined && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Montant passé</p>
                    <p className="text-sm font-mono font-semibold text-slate-600">{formatCurrency(priorAmount)}</p>
                  </div>
                )}
                {variationPercent !== null && variationPercent !== undefined && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Variation %</p>
                    <p
                      className={cn(
                        "text-sm font-mono font-semibold",
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
                    <p className="text-xs text-slate-500 mb-1">Variation $</p>
                    <p
                      className={cn(
                        "text-sm font-mono font-semibold",
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
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Explication de la variation</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Expliquez la variation observée pour cette ligne. Vous pouvez mentionner les facteurs qui ont contribué à cette variation, les événements importants, ou toute autre information pertinente."
              className="w-full min-h-[200px] px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none text-slate-900"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between bg-slate-50">
          <div>
            {existingNote && (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-700 hover:bg-slate-100">
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Enregistrement..." : existingNote ? "Mettre à jour" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

