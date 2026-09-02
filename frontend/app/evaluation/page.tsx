"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, FolderOpen, ArrowRight, Trash2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useCompanies } from "@/hooks/use-companies"
import { cn } from "@/lib/utils"
import {
  createValuation,
  listValuationsForCompany,
  removeValuation,
  touchValuation,
  valuationDetailPath,
  type ValuationRecord,
} from "@/lib/valuation-registry"

const MONTH_OPTIONS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
]

function monthLabel(m: number | null | undefined) {
  if (!m) return null
  return MONTH_OPTIONS.find((o) => o.value === m)?.label ?? null
}

export default function EvaluationHubPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { companies } = useCompanies()

  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null
  const companyIdForCreate = lockedCompanyId || companies[0]?.id || null
  const companyNameForCreate =
    companies.find((c) => c.id === companyIdForCreate)?.name || "Société"

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saved, setSaved] = useState<ValuationRecord[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [newName, setNewName] = useState("")
  const [newYear, setNewYear] = useState(() => new Date().getFullYear())
  const [newMonth, setNewMonth] = useState(() => new Date().getMonth() + 1)

  const startYearOptions = useMemo(
    () => Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 2 + i),
    [],
  )

  const reload = () => {
    setSaved(listValuationsForCompany(lockedCompanyId))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCompanyId, companies.length])

  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && saved.some((v) => v.id === prev)) return prev
      return saved[0]?.id ?? null
    })
  }, [saved])

  const selected = selectedId ? saved.find((v) => v.id === selectedId) ?? null : null

  const canDelete =
    !!selected && deleteConfirmText.trim() === selected.title.trim()

  const handleOpen = (v: ValuationRecord) => {
    touchValuation(v.id)
    router.push(valuationDetailPath(v))
  }

  const handleCreate = () => {
    if (!newName.trim() || !companyIdForCreate) return
    const created = createValuation({
      companyId: companyIdForCreate,
      companyName: companyNameForCreate,
      title: newName.trim(),
      referenceYear: newYear,
      referenceMonth: newMonth,
    })
    setCreateOpen(false)
    setNewName("")
    reload()
    handleOpen(created)
  }

  const handleDelete = () => {
    if (!selected || !canDelete) return
    removeValuation(selected.id)
    setDeleteOpen(false)
    setDeleteConfirmText("")
    reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full pt-15 pb-40 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 grid grid-cols-1 lg:grid-cols-2">
            <div className="bg-[#2A2F3A]" />
            <div className="bg-[#2A2F3A]" />
          </div>
          <div className="absolute inset-y-0 left-1/2 hidden lg:block w-px bg-white/5" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-24 -right-28 h-[480px] w-[480px] rounded-full bg-black/20 blur-3xl" />
          </div>
        </div>
        <div className="relative z-10 max-w-[1920px] mx-auto px-6">
          <div className="flex items-start gap-3 mb-8">
            <div className="w-2" />
            <div className="flex-1">
              <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">
                Valorisation
              </h2>
              <p className="text-base text-[#C9B8A5]/90 mb-6 max-w-4xl">
                Créez une valorisation ou sélectionnez une existante, puis ouvrez son tableau de bord
                pour parcourir le plan de valorisation.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  data-testid="new-valuation-button"
                  onClick={() => setCreateOpen(true)}
                  className="h-10 bg-[#E0742D] text-white hover:bg-[#c96526]"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden />
                  Nouvelle valorisation
                </Button>
                <div className="h-px flex-1 bg-gradient-to-r from-[#E0742D]/35 via-white/10 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full py-8 px-6 max-w-[1920px] mx-auto">
        <div className="relative -mt-28">
          <div className="mb-6 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
            <div className="border-b border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80 px-6 py-4 sm:px-8">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">
                    Mes valorisations
                  </h2>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    Sélectionnez une valorisation à gauche pour afficher ses détails.
                  </p>
                </div>
              </div>
            </div>

            {saved.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
                <FolderOpen className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
                <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune valorisation créée</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Créez votre première valorisation pour commencer.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="mt-6 bg-[#E0742D] text-white hover:bg-[#c96526]"
                >
                  <Plus className="w-4 h-4 mr-2" aria-hidden />
                  Nouvelle valorisation
                </Button>
              </div>
            ) : (
              <div className="grid min-h-[min(70vh,640px)] grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
                <aside
                  className={cn(
                    "flex min-h-[220px] min-w-0 flex-col border-slate-200 bg-gradient-to-b from-slate-50/95 to-white",
                    "border-b lg:min-h-0 lg:border-r lg:border-b-0 lg:border-t-0",
                  )}
                >
                  <div className="border-b border-slate-200/90 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Valorisations ({saved.length})
                    </p>
                  </div>
                  <ScrollArea className="h-[min(45vh,380px)] lg:h-[min(70vh,640px)]">
                    <ul className="p-2" data-testid="valuation-list">
                      {saved.map((v) => {
                        const selectedRow = v.id === selectedId
                        return (
                          <li key={v.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(v.id)}
                              className={cn(
                                "mb-1 flex w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                                selectedRow
                                  ? "bg-[#E0742D]/10 shadow-sm ring-1 ring-[#E0742D]/40"
                                  : "hover:bg-slate-100/90",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "block truncate text-sm font-semibold leading-tight text-slate-900",
                                    selectedRow && "text-[#2A2F3A]",
                                  )}
                                >
                                  {v.title}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {monthLabel(v.referenceMonth)} {v.referenceYear}
                                </span>
                                {selectedRow ? (
                                  <span
                                    className="mt-2 block h-0.5 w-8 rounded-full bg-[#E0742D]"
                                    aria-hidden
                                  />
                                ) : null}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                </aside>

                <section
                  className={cn(
                    "flex min-h-[320px] min-w-0 flex-col bg-white",
                    "border-t border-slate-200/90 lg:border-t-0",
                  )}
                >
                  {selected ? (
                    <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-7">
                      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E0742D]">
                              Résumé valorisation
                            </p>
                            <h3 className="mt-1 text-xl font-semibold leading-snug text-[#2A2F3A] sm:text-2xl truncate">
                              {selected.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                              Date de référence et accès aux méthodes d&apos;évaluation.
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeleteConfirmText("")
                            setDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          Supprimer
                        </Button>
                      </div>

                      <div className="grid gap-8 sm:grid-cols-2">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Date de référence
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {monthLabel(selected.referenceMonth)} {selected.referenceYear}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Société
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {companies.find((c) => c.id === selected.companyId)?.name ||
                              selected.companyName}
                          </p>
                        </div>
                      </div>

                      <div className="my-6 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

                      <div className="mt-2 flex flex-wrap gap-3">
                        <Button
                          type="button"
                          data-testid="open-valuation-button"
                          onClick={() => handleOpen(selected)}
                          className="bg-[#E0742D] text-white shadow-sm hover:bg-[#c96526]"
                        >
                          Ouvrir la valorisation
                          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-sm text-slate-600">
                      Sélectionnez une valorisation à gauche.
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la valorisation</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Pour confirmer, saisissez exactement le nom de la
              valorisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Valorisation:{" "}
              <span className="font-semibold text-slate-900">{selected?.title ?? "—"}</span>
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Tapez le nom de la valorisation pour confirmer"
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteConfirmText("")}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className={cn(
                "bg-red-600 text-white hover:bg-red-700",
                !canDelete && "pointer-events-none opacity-50",
              )}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="w-[calc(100vw-2rem)] sm:w-[min(50vw,960px)] max-w-none overflow-hidden p-0"
          data-testid="new-valuation-dialog"
        >
          <div className="relative">
            <div className="h-1 w-full bg-gradient-to-r from-[#E0742D] via-[#E0742D]/35 to-transparent" />
            <div className="border-b border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80 px-6 py-5 sm:px-8">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl tracking-tight text-[#2A2F3A]">
                  Nouvelle valorisation
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Donnez un nom et la date de référence. Vous serez redirigé vers le tableau de bord
                  de la valorisation.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <div className="space-y-7">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Nom
                </p>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">
                    Nom de la valorisation
                  </label>
                  <Input
                    data-testid="new-valuation-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Valorisation 2026, Scénario cession…"
                    className="w-full"
                    autoFocus
                  />
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Date de référence
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Mois</label>
                    <Select
                      value={String(newMonth)}
                      onValueChange={(v) => setNewMonth(parseInt(v, 10))}
                    >
                      <SelectTrigger className="w-full" data-testid="new-valuation-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={String(m.value)}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Année</label>
                    <Select
                      value={String(newYear)}
                      onValueChange={(v) => setNewYear(parseInt(v, 10))}
                    >
                      <SelectTrigger className="w-full" data-testid="new-valuation-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {startYearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 border-t border-slate-200 bg-gradient-to-r from-white to-slate-50/80 px-6 py-4 sm:px-8">
            <DialogFooter className="gap-2 sm:gap-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                data-testid="new-valuation-submit"
                onClick={handleCreate}
                disabled={!newName.trim() || !companyIdForCreate}
                className="bg-[#E0742D] text-white hover:bg-[#c96526]"
              >
                Créer et ouvrir
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
