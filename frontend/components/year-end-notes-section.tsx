"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { StickyNote, FileText, Calendar, Building2, Trash2, Edit2, ExternalLink } from "lucide-react"
import { Note, deleteNote, getNotes } from "@/lib/notes-storage"
import { formatCurrency } from "@/lib/financial-utils"
import { NoteModal } from "@/components/note-modal"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const pageLabels: Record<string, string> = {
  "income-statement": "États des résultats",
  "balance-sheet": "Bilan",
  "cash-flow": "Flux de trésorerie",
  "product-margin": "Marge par produits",
  "capex": "Capex",
}

const periodLabels: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  annual: "Annuel",
}

const viewLabels: Record<string, string> = {
  current: "Courant",
  comparison: "Comparaison",
  ytd: "Année en cours",
  ddm: "Même jour du mois dernier",
  "12months": "12 derniers mois",
  quarters: "5 derniers trimestres",
  years: "6 dernières années",
}

const pageRoutes: Record<string, string> = {
  "income-statement": "/financial-statements/income-statement",
  "balance-sheet": "/financial-statements/balance-sheet",
  "cash-flow": "/financial-statements/cash-flow",
  "product-margin": "/analysis/product-margin",
  "capex": "/analysis/capex",
}

export function YearEndNotesSection() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = () => {
    const allNotes = getNotes()
    setNotes(allNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
  }

  const handleDelete = (note: Note) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) {
      deleteNote(note.id)
      loadNotes()
    }
  }

  const handleEdit = (note: Note) => {
    setSelectedNote(note)
    setIsModalOpen(true)
  }

  const filteredNotes =
    filter === "all"
      ? notes
      : notes.filter((n) => n.page === filter)

  return (
    <div className="w-full bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      {/* Header */}
      <div className="bg-white px-8 py-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-1 h-12 bg-emerald-500 rounded-full flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Notes</h2>
            <p className="text-sm text-slate-600">
              Consultez et gérez toutes vos notes d'analyse créées pour expliquer les variations dans vos états financiers.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Toutes ({notes.length})
          </button>
          <button
            onClick={() => setFilter("income-statement")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "income-statement"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            États des résultats ({notes.filter((n) => n.page === "income-statement").length})
          </button>
          <button
            onClick={() => setFilter("balance-sheet")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "balance-sheet"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Bilan ({notes.filter((n) => n.page === "balance-sheet").length})
          </button>
          <button
            onClick={() => setFilter("cash-flow")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "cash-flow"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Flux de trésorerie ({notes.filter((n) => n.page === "cash-flow").length})
          </button>
          <button
            onClick={() => setFilter("product-margin")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "product-margin"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Marge par produits ({notes.filter((n) => n.page === "product-margin").length})
          </button>
          <button
            onClick={() => setFilter("capex")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "capex"
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            Capex ({notes.filter((n) => n.page === "capex").length})
          </button>
        </div>

        {/* Notes List */}
        {filteredNotes.length === 0 ? (
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-12 text-center">
              <StickyNote className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune note</h3>
              <p className="text-slate-600 mb-6">
                {filter === "all"
                  ? "Vous n'avez pas encore créé de notes. Créez-en une depuis la vue Détail des états financiers."
                  : `Vous n'avez pas encore créé de notes pour ${pageLabels[filter] || filter}.`}
              </p>
              {filter !== "all" && (
                <Link href={pageRoutes[filter] || "/financial-statements/income-statement"}>
                  <Button className="bg-slate-800 text-white hover:bg-slate-700">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Aller à {pageLabels[filter] || filter}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-slate-600" />
                          <h3 className="text-lg font-semibold text-slate-900">{note.rowLabel}</h3>
                        </div>
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                          {pageLabels[note.page] || note.page}
                        </span>
                      </div>

                      {/* Financial Data Summary */}
                      {((note.currentAmount !== null && note.currentAmount !== undefined) || (note.priorAmount !== null && note.priorAmount !== undefined)) && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {note.currentAmount !== null && note.currentAmount !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Montant actuel</p>
                                <p className="text-sm font-mono font-semibold text-slate-900">
                                  {formatCurrency(note.currentAmount)}
                                </p>
                              </div>
                            )}
                            {note.priorAmount !== null && note.priorAmount !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Montant passé</p>
                                <p className="text-sm font-mono font-semibold text-slate-600">
                                  {formatCurrency(note.priorAmount)}
                                </p>
                              </div>
                            )}
                            {note.variationPercent !== null && note.variationPercent !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Variation %</p>
                                <p
                                  className={cn(
                                    "text-sm font-mono font-semibold",
                                    note.variationPercent >= 0 ? "text-emerald-600" : "text-red-600"
                                  )}
                                >
                                  {note.variationPercent >= 0 ? "+" : ""}
                                  {note.variationPercent.toFixed(1)}%
                                </p>
                              </div>
                            )}
                            {note.variationAmount !== null && note.variationAmount !== undefined && (
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Variation $</p>
                                <p
                                  className={cn(
                                    "text-sm font-mono font-semibold",
                                    note.variationAmount >= 0 ? "text-emerald-600" : "text-red-600"
                                  )}
                                >
                                  {note.variationAmount >= 0 ? "+" : ""}
                                  {formatCurrency(note.variationAmount)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-slate-700 mb-4 whitespace-pre-wrap">{note.content}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span>{periodLabels[note.period] || note.period}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>•</span>
                          <span>{viewLabels[note.view] || note.view}</span>
                        </div>
                        {(note.companyName || note.divisionName || note.subDivisionName) && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" />
                            <span className="flex items-center gap-1">
                              {note.subDivisionName ? (
                                <>
                                  <span>{note.companyName}</span>
                                  <span>•</span>
                                  <span>{note.divisionName}</span>
                                  <span>•</span>
                                  <span className="font-medium">{note.subDivisionName}</span>
                                </>
                              ) : note.divisionName ? (
                                <>
                                  <span>{note.companyName}</span>
                                  <span>•</span>
                                  <span className="font-medium">{note.divisionName}</span>
                                </>
                              ) : (
                                <span className="font-medium">{note.companyName}</span>
                              )}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span>
                            {new Date(note.updatedAt).toLocaleDateString("fr-CA", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={pageRoutes[note.page] || "/financial-statements/income-statement"}>
                        <Button variant="outline" size="sm" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Voir
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(note)}
                        className="border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(note)}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {selectedNote && (
          <NoteModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedNote(null)
            }}
            rowId={selectedNote.rowId}
            rowLabel={selectedNote.rowLabel}
            page={selectedNote.page}
            period={selectedNote.period}
            view={selectedNote.view}
            companyId={selectedNote.companyId}
            companyName={selectedNote.companyName}
            divisionId={selectedNote.divisionId}
            divisionName={selectedNote.divisionName}
            subDivisionId={selectedNote.subDivisionId}
            subDivisionName={selectedNote.subDivisionName}
            currentAmount={selectedNote.currentAmount}
            priorAmount={selectedNote.priorAmount}
            variationPercent={selectedNote.variationPercent}
            variationAmount={selectedNote.variationAmount}
            onSave={() => {
              loadNotes()
              setIsModalOpen(false)
              setSelectedNote(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

