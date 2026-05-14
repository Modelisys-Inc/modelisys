"use client"

import { useState, useEffect, useMemo, type ChangeEvent } from "react"
import {
  StickyNote,
  Calendar,
  Building2,
  Trash2,
  Edit2,
  ExternalLink,
  FileText,
  Download,
  Paperclip,
  ChevronRight,
  User,
  Save,
} from "lucide-react"
import type { NoteAttachmentData } from "@/lib/api"
import { Note, deleteNote, getNotes, updateNote, useNotesCache } from "@/lib/notes-storage"
import { formatCurrency } from "@/lib/financial-utils"
import {
  downloadNoteAttachment,
  NoteAttachmentsBlock,
  fileToAttachment,
  MAX_NOTE_ATTACHMENTS,
  MAX_NOTE_FILE_BYTES,
} from "@/components/income-statement-note-panel"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const pageLabels: Record<string, string> = {
  "income-statement": "États des résultats",
  "balance-sheet": "Bilan",
  "cash-flow": "Flux de trésorerie",
  "product-margin": "Marge par produits",
  "capex": "Capex",
}

/** Ordre d’affichage des filtres ; seules les pages avec au moins une note sont proposées. */
const PAGE_FILTER_ORDER: { key: string; shortLabel: string }[] = [
  { key: "income-statement", shortLabel: "Résultats" },
  { key: "balance-sheet", shortLabel: "Bilan" },
  { key: "cash-flow", shortLabel: "Trésorerie" },
  { key: "product-margin", shortLabel: "Marge" },
  { key: "capex", shortLabel: "Capex" },
]

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

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatListTime(iso: string) {
  return new Date(iso).toLocaleDateString("fr-CA", {
    day: "2-digit",
    month: "short",
  })
}

function refPeriodKey(month: number, year: number) {
  return `${month}-${year}`
}

/** Libellé du mois de référence (ex. « avril 2025 ») */
function formatReferencePeriodFr(month: number, year: number): string {
  const d = new Date(year, month - 1, 1)
  const s = d.toLocaleDateString("fr-CA", { month: "long", year: "numeric" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatAttachmentSizeFromBase64(data: string): string {
  const bytes = Math.ceil((data.length * 3) / 4)
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

interface YearEndNotesSectionProps {
  companyId?: string | null
}

export function YearEndNotesSection({ companyId }: YearEndNotesSectionProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [editingNoteContent, setEditingNoteContent] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [editingAttachments, setEditingAttachments] = useState<NoteAttachmentData[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [filterFiscal, setFilterFiscal] = useState<string>("all")
  const [filterAuthor, setFilterAuthor] = useState<string>("all")
  const [filterRef, setFilterRef] = useState<string>("all")

  const { version } = useNotesCache(companyId ?? null)

  const loadNotes = () => {
    const allNotes = getNotes()
    setNotes(
      allNotes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    )
  }

  useEffect(() => {
    loadNotes()
  }, [version])

  const notesByPage = useMemo(
    () => (filter === "all" ? notes : notes.filter((n) => n.page === filter)),
    [notes, filter],
  )

  const fullyFilteredNotes = useMemo(() => {
    let list = notesByPage
    if (filterFiscal !== "all") {
      const fy = parseInt(filterFiscal, 10)
      if (Number.isFinite(fy)) list = list.filter((n) => n.fiscalYear === fy)
    }
    if (filterAuthor !== "all") {
      list = list.filter((n) => n.createdById === filterAuthor)
    }
    if (filterRef !== "all") {
      const parts = filterRef.split("-")
      const rm = parseInt(parts[0]!, 10)
      const ry = parseInt(parts[1]!, 10)
      list = list.filter((n) => n.referenceMonth === rm && n.referenceYear === ry)
    }
    return list
  }, [notesByPage, filterFiscal, filterAuthor, filterRef])

  useEffect(() => {
    if (filterFiscal !== "all") {
      const fy = parseInt(filterFiscal, 10)
      if (!notes.some((n) => n.fiscalYear === fy)) setFilterFiscal("all")
    }
  }, [notes, filterFiscal])

  useEffect(() => {
    if (filterAuthor !== "all" && !notes.some((n) => n.createdById === filterAuthor)) {
      setFilterAuthor("all")
    }
  }, [notes, filterAuthor])

  useEffect(() => {
    if (filterRef !== "all") {
      const parts = filterRef.split("-")
      const rm = parseInt(parts[0]!, 10)
      const ry = parseInt(parts[1]!, 10)
      if (!notes.some((n) => n.referenceMonth === rm && n.referenceYear === ry)) setFilterRef("all")
    }
  }, [notes, filterRef])

  useEffect(() => {
    if (fullyFilteredNotes.length === 0) {
      setSelectedId(null)
      return
    }
    const exists = fullyFilteredNotes.some((n) => n.id === selectedId)
    if (!exists) setSelectedId(fullyFilteredNotes[0]!.id)
  }, [fullyFilteredNotes, selectedId])

  const activeNote = useMemo(
    () => fullyFilteredNotes.find((n) => n.id === selectedId) ?? null,
    [fullyFilteredNotes, selectedId],
  )

  useEffect(() => {
    setIsEditingNote(false)
    setEditingNoteContent("")
    setEditingAttachments([])
    setAttachmentError(null)
  }, [activeNote?.id])

  const fiscalYearOptions = useMemo(() => {
    const s = new Set<number>()
    for (const n of notes) {
      if (n.fiscalYear != null) s.add(n.fiscalYear)
    }
    return [...s].sort((a, b) => b - a)
  }, [notes])

  const authorOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const n of notes) {
      if (n.createdById && n.createdByName) m.set(n.createdById, n.createdByName)
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"))
  }, [notes])

  const referencePeriodOptions = useMemo(() => {
    const keys = new Set<string>()
    for (const n of notes) {
      if (n.referenceMonth != null && n.referenceYear != null) {
        keys.add(refPeriodKey(n.referenceMonth, n.referenceYear))
      }
    }
    return [...keys]
      .map((k) => {
        const [ms, ys] = k.split("-")
        const rm = parseInt(ms!, 10)
        const ry = parseInt(ys!, 10)
        return { key: k, label: formatReferencePeriodFr(rm, ry), sort: ry * 100 + rm }
      })
      .sort((a, b) => b.sort - a.sort)
  }, [notes])

  const handleDelete = async (note: Note) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return
    await deleteNote(note.id, companyId)
    loadNotes()
    if (selectedId === note.id) {
      setSelectedId(null)
      setIsEditingNote(false)
      setEditingNoteContent("")
      setEditingAttachments([])
      setAttachmentError(null)
    }
  }

  const beginEditNote = () => {
    if (!activeNote) return
    setEditingNoteContent(activeNote.content)
    setEditingAttachments(
      (activeNote.attachments ?? []).map((a) => ({
        filename: a.filename,
        media_type: a.media_type,
        data: a.data,
      })),
    )
    setAttachmentError(null)
    setIsEditingNote(true)
  }

  const cancelEditNote = () => {
    setIsEditingNote(false)
    setEditingNoteContent("")
    setEditingAttachments([])
    setAttachmentError(null)
  }

  const handleYearEndAttachmentFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setAttachmentError(null)
    const next = [...editingAttachments]
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
    setEditingAttachments(next)
    e.target.value = ""
  }

  const saveNoteEdit = async () => {
    if (!activeNote || !editingNoteContent.trim() || isSavingNote) return
    setIsSavingNote(true)
    try {
      const refPayload =
        activeNote.referenceMonth != null && activeNote.referenceYear != null
          ? { referenceMonth: activeNote.referenceMonth, referenceYear: activeNote.referenceYear }
          : {}
      await updateNote(
        activeNote.id,
        {
          content: editingNoteContent.trim(),
          currentAmount: activeNote.currentAmount ?? null,
          priorAmount: activeNote.priorAmount ?? null,
          variationPercent: activeNote.variationPercent ?? null,
          variationAmount: activeNote.variationAmount ?? null,
          attachments: editingAttachments,
          ...refPayload,
        },
        companyId,
      )
      loadNotes()
      setIsEditingNote(false)
      setEditingNoteContent("")
      setEditingAttachments([])
      setAttachmentError(null)
    } catch (err) {
      console.error("Error saving note:", err)
    } finally {
      setIsSavingNote(false)
    }
  }

  const filterOptions = useMemo(() => {
    const countByPage = new Map<string, number>()
    for (const n of notes) {
      countByPage.set(n.page, (countByPage.get(n.page) ?? 0) + 1)
    }
    const knownListed: { key: string; label: string; count: number }[] = []
    const knownKeys = new Set(PAGE_FILTER_ORDER.map((p) => p.key))
    for (const { key, shortLabel } of PAGE_FILTER_ORDER) {
      const count = countByPage.get(key) ?? 0
      if (count > 0) knownListed.push({ key, label: shortLabel, count })
    }
    const extras: { key: string; label: string; count: number }[] = []
    for (const [page, count] of countByPage) {
      if (count > 0 && !knownKeys.has(page)) {
        extras.push({
          key: page,
          label: pageLabels[page] ?? page,
          count,
        })
      }
    }
    extras.sort((a, b) => a.label.localeCompare(b.label, "fr"))
    return [
      { key: "all", label: "Toutes", count: notes.length },
      ...knownListed,
      ...extras,
    ]
  }, [notes])

  useEffect(() => {
    if (filter === "all") return
    const stillValid = filterOptions.some((o) => o.key === filter && o.count > 0)
    if (!stillValid) setFilter("all")
  }, [filter, filterOptions])

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      {/* En-tête carte */}
      <div className="border-b border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80 px-6 py-4 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">Notes d’analyse</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                Sélectionnez une note dans le panneau de gauche pour afficher le détail à droite.
              </p>
            </div>
          </div>
        </div>
        {notes.length > 0 && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex min-w-[160px] flex-[1.1] flex-col gap-1 sm:max-w-[260px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Source</span>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-9 border-slate-200 bg-white text-left text-sm">
                  <SelectValue placeholder="Toutes les analyses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les analyses</SelectItem>
                  {filterOptions
                    .filter((o) => o.key !== "all")
                    .map((o) => (
                      <SelectItem key={o.key} value={o.key}>
                        {pageLabels[o.key] ?? o.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[220px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Exercice financier
              </span>
              <Select value={filterFiscal} onValueChange={setFilterFiscal}>
                <SelectTrigger className="h-9 border-slate-200 bg-white text-left text-sm">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les exercices</SelectItem>
                  {fiscalYearOptions.map((fy) => (
                    <SelectItem key={fy} value={String(fy)}>
                      {fy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[140px] flex-1 flex-col gap-1 sm:max-w-[220px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Auteur</span>
              <Select value={filterAuthor} onValueChange={setFilterAuthor}>
                <SelectTrigger className="h-9 border-slate-200 bg-white text-left text-sm">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les auteurs</SelectItem>
                  {authorOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[160px] flex-[1.2] flex-col gap-1 sm:max-w-[260px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Période de référence
              </span>
              <Select value={filterRef} onValueChange={setFilterRef}>
                <SelectTrigger className="h-9 border-slate-200 bg-white text-left text-sm">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  {referencePeriodOptions.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <StickyNote className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
          <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune note</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            {filter === "all"
              ? "Créez des notes depuis le détail des états financiers ou des analyses."
              : `Aucune note pour ${pageLabels[filter] ?? filter}.`}
          </p>
          {filter !== "all" && (
            <Link href={pageRoutes[filter] || "/financial-statements/income-statement"} className="mt-6">
              <Button className="bg-[#2A2F3A] text-[#E6D6C3] hover:bg-[#1F2430]">
                <ExternalLink className="mr-2 h-4 w-4" />
                Ouvrir {pageLabels[filter] ?? filter}
              </Button>
            </Link>
          )}
        </div>
      ) : notesByPage.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <StickyNote className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
          <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune note dans cette section</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            {`Aucune note pour ${pageLabels[filter] ?? filter}.`}
          </p>
          <Link href={pageRoutes[filter] || "/financial-statements/income-statement"} className="mt-6">
            <Button className="bg-[#2A2F3A] text-[#E6D6C3] hover:bg-[#1F2430]">
              <ExternalLink className="mr-2 h-4 w-4" />
              Ouvrir {pageLabels[filter] ?? filter}
            </Button>
          </Link>
        </div>
      ) : fullyFilteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <StickyNote className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
          <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucun résultat</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Aucune note ne correspond aux filtres choisis (source, exercice financier, auteur ou période de référence).
            Ajustez les listes ci-dessus ou réinitialisez les filtres.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-6 border-slate-200"
            onClick={() => {
              setFilter("all")
              setFilterFiscal("all")
              setFilterAuthor("all")
              setFilterRef("all")
            }}
          >
            Réinitialiser tous les filtres
          </Button>
        </div>
      ) : (
        <div className="grid min-h-[min(70vh,640px)] grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          {/* Liste — gauche (même traitement visuel que le panneau Analyse & note du compte de résultat) */}
          <aside
            className={cn(
              "flex min-h-[220px] min-w-0 flex-col border-slate-200 bg-gradient-to-b from-slate-50/95 to-white",
              "border-b lg:min-h-0 lg:border-r lg:border-b-0 lg:border-t-0",
              "lg:shadow-[inset_-1px_0_0_0_rgba(226,232,240,0.85)]",
            )}
          >
            <div className="border-b border-slate-200/90 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Notes ({fullyFilteredNotes.length})
              </p>
            </div>
            <ScrollArea className="h-[min(50vh,420px)] lg:h-[min(70vh,600px)]">
              <ul className="p-2">
                {fullyFilteredNotes.map((note) => {
                  const selected = note.id === selectedId
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(note.id)}
                        className={cn(
                          "mb-1 flex w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                          selected
                            ? "bg-[#E0742D]/10 shadow-sm ring-1 ring-[#E0742D]/40"
                            : "hover:bg-slate-100/90",
                        )}
                      >
                        <span className="mr-3 w-11 shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-slate-400">
                          {formatListTime(note.updatedAt)}
                        </span>
                        <span className="min-w-0 flex-1 border-l border-slate-200/90 pl-3">
                          <span
                            className={cn(
                              "block truncate text-sm font-semibold leading-tight text-slate-900",
                              selected && "text-[#2A2F3A]",
                            )}
                          >
                            {note.rowLabel}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {pageLabels[note.page] || note.page}
                          </span>
                          {note.createdByName ? (
                            <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                              Par {note.createdByName}
                            </span>
                          ) : null}
                          {note.referenceMonth != null && note.referenceYear != null ? (
                            <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                              Réf. {formatReferencePeriodFr(note.referenceMonth, note.referenceYear)}
                              {note.fiscalYear != null ? ` · Ex. ${note.fiscalYear}` : ""}
                            </span>
                          ) : null}
                          {selected && (
                            <span className="mt-2 block h-0.5 w-8 rounded-full bg-[#E0742D]" aria-hidden />
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          </aside>

          {/* Détail — droite */}
          <section
            className={cn(
              "flex min-h-[320px] min-w-0 flex-col bg-white",
              "border-t border-slate-200/90 lg:border-t-0",
            )}
          >
            {activeNote ? (
              <>
                <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-7">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E0742D]">
                        {pageLabels[activeNote.page] || activeNote.page}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold leading-snug text-[#2A2F3A] sm:text-2xl">
                        {activeNote.rowLabel}
                      </h3>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                        <span>
                          <span className="text-slate-400">Mis à jour</span>{" "}
                          {formatShortDate(activeNote.updatedAt)}
                        </span>
                        {activeNote.createdByName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-slate-300">·</span>
                            <User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span className="text-slate-400">Créée par</span>{" "}
                            <span className="font-medium text-slate-700">{activeNote.createdByName}</span>
                          </span>
                        ) : null}
                      </p>
                      {((activeNote.referenceMonth != null && activeNote.referenceYear != null) ||
                        activeNote.fiscalYear != null) && (
                        <>
                          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                            {activeNote.referenceMonth != null && activeNote.referenceYear != null ? (
                              <span>
                                <span className="text-slate-400">Période de référence</span>{" "}
                                <span className="font-medium text-slate-700">
                                  {formatReferencePeriodFr(activeNote.referenceMonth, activeNote.referenceYear)}
                                </span>
                              </span>
                            ) : null}
                            {activeNote.fiscalYear != null ? (
                              <span className="inline-flex items-center gap-1.5">
                                {(activeNote.referenceMonth != null && activeNote.referenceYear != null) && (
                                  <span className="text-slate-300" aria-hidden>
                                    ·
                                  </span>
                                )}
                                <span className="text-slate-400">Exercice financier</span>{" "}
                                <span className="font-medium text-slate-700">{activeNote.fiscalYear}</span>
                              </span>
                            ) : null}
                          </p>
                          {/* Aligné sur la ligne sous « Informations / Détails de la société » (Configuration société) */}
                          <div
                            className="mt-3 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-white/15 to-transparent"
                            role="separator"
                            aria-hidden
                          />
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isEditingNote ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={cancelEditNote}
                          className="border-slate-200 text-[#2A2F3A] hover:bg-slate-50"
                        >
                          Annuler
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={beginEditNote}
                          className="border-slate-200 text-[#2A2F3A] hover:bg-slate-50"
                        >
                          <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                          Modifier
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(activeNote)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {((activeNote.currentAmount != null && activeNote.currentAmount !== undefined) ||
                    (activeNote.priorAmount != null && activeNote.priorAmount !== undefined)) && (
                    <div className="mb-5 rounded-xl border border-slate-200/90 bg-slate-50/80 p-4">
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Données financières
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {activeNote.currentAmount != null && activeNote.currentAmount !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500">Actuel</p>
                            <p className="font-mono text-sm font-semibold text-[#2A2F3A]">
                              {formatCurrency(activeNote.currentAmount)}
                            </p>
                          </div>
                        )}
                        {activeNote.priorAmount != null && activeNote.priorAmount !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500">Comparatif</p>
                            <p className="font-mono text-sm font-semibold text-slate-600">
                              {formatCurrency(activeNote.priorAmount)}
                            </p>
                          </div>
                        )}
                        {activeNote.variationPercent != null && activeNote.variationPercent !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500">Var. %</p>
                            <p
                              className={cn(
                                "font-mono text-sm font-semibold",
                                activeNote.variationPercent >= 0 ? "text-emerald-600" : "text-red-600",
                              )}
                            >
                              {activeNote.variationPercent >= 0 ? "+" : ""}
                              {activeNote.variationPercent.toFixed(1)}%
                            </p>
                          </div>
                        )}
                        {activeNote.variationAmount != null && activeNote.variationAmount !== undefined && (
                          <div>
                            <p className="text-xs text-slate-500">Var. $</p>
                            <p
                              className={cn(
                                "font-mono text-sm font-semibold",
                                activeNote.variationAmount >= 0 ? "text-emerald-600" : "text-red-600",
                              )}
                            >
                              {activeNote.variationAmount >= 0 ? "+" : ""}
                              {formatCurrency(activeNote.variationAmount)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="min-h-0 flex-1">
                    {isEditingNote ? (
                      <label
                        htmlFor="year-end-note-textarea"
                        className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-[#E0742D]"
                      >
                        Note d’analyse
                      </label>
                    ) : (
                      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#E0742D]">
                        Note d’analyse
                      </p>
                    )}
                    <div className="flex gap-4 sm:gap-5">
                      <div
                        className="w-px shrink-0 self-stretch rounded-full bg-gradient-to-b from-[#E0742D] to-[#c96526]"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        {isEditingNote ? (
                          <>
                            <Textarea
                              id="year-end-note-textarea"
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              placeholder="Expliquez la variation ou le contexte…"
                              className="min-h-[160px] resize-y border-slate-200/90 text-sm text-slate-900 focus-visible:ring-[#E0742D]/35"
                            />
                            <NoteAttachmentsBlock
                              attachments={editingAttachments}
                              attachmentError={attachmentError}
                              onFileChange={handleYearEndAttachmentFiles}
                              onRemove={(idx) => {
                                setEditingAttachments((prev) => prev.filter((_, i) => i !== idx))
                                setAttachmentError(null)
                              }}
                              inputId="year-end-note-attachments"
                            />
                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/80 pt-3">
                              <Button
                                type="button"
                                size="sm"
                                onClick={saveNoteEdit}
                                disabled={!editingNoteContent.trim() || isSavingNote}
                                className="bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50"
                              >
                                <Save className="mr-1.5 h-3.5 w-3.5" />
                                {isSavingNote ? "Enregistrement…" : "Mettre à jour"}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                            {activeNote.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {!isEditingNote && (
                    <div className="mt-6">
                      <div
                        className="h-px w-full bg-gradient-to-r from-[#E0742D]/90 via-slate-400/55 to-slate-300/90"
                        role="separator"
                        aria-hidden
                      />
                      <div className="pt-5">
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <Paperclip className="h-3.5 w-3.5 text-[#E0742D]" aria-hidden />
                          Pièces justificatives
                        </div>
                        {activeNote.attachments?.length ? (
                          <ul className="space-y-2">
                            {activeNote.attachments.map((att, idx) => (
                              <li
                                key={`${att.filename}-${idx}`}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-sm"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                                  <span className="min-w-0 truncate font-medium text-[#2A2F3A]">{att.filename}</span>
                                  <span className="shrink-0 text-xs text-slate-400">
                                    ({formatAttachmentSizeFromBase64(att.data)})
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-slate-600"
                                  title="Télécharger"
                                  onClick={() => downloadNoteAttachment(att)}
                                >
                                  <Download className="h-3.5 w-3.5" aria-hidden />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-500">Aucune pièce jointe.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {periodLabels[activeNote.period] || activeNote.period}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
                      {viewLabels[activeNote.view] || activeNote.view}
                    </div>
                    {(activeNote.companyName || activeNote.divisionName || activeNote.subDivisionName) && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-600">
                          {activeNote.subDivisionName ? (
                            <>
                              {activeNote.companyName}
                              <span className="text-slate-300"> · </span>
                              {activeNote.divisionName}
                              <span className="text-slate-300"> · </span>
                              <span className="font-medium text-[#2A2F3A]">{activeNote.subDivisionName}</span>
                            </>
                          ) : activeNote.divisionName ? (
                            <>
                              {activeNote.companyName}
                              <span className="text-slate-300"> · </span>
                              <span className="font-medium text-[#2A2F3A]">{activeNote.divisionName}</span>
                            </>
                          ) : (
                            <span className="font-medium text-[#2A2F3A]">{activeNote.companyName}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
                <p className="text-sm">Sélectionnez une note dans la liste à gauche.</p>
              </div>
            )}
          </section>
        </div>
      )}

    </div>
  )
}
