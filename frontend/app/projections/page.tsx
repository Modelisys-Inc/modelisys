"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EntitySelector } from "@/components/entity-selector"
import { Plus, FolderOpen, ArrowRight, FileText, Trash2 } from "lucide-react"
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
import { createProjection, deleteProjection, listProjections, type ProjectionData } from "@/lib/api"

interface SavedProjection {
  id: string
  name: string
  companyId: string | null
  divisionId: string | null
  subDivisionId: string | null
  projectionYears: 3 | 4 | 5
  projectionMode: "gl" | "account"
  projectionHorizon: "annual" | "monthly"
  startYear: number | null
  startMonth: number | null
  createdAt: string
  updatedAt: string
}

function mapApiProjection(p: ProjectionData): SavedProjection {
  return {
    id: p.id,
    name: p.name,
    companyId: p.company_id,
    divisionId: p.division_id,
    subDivisionId: p.sub_division_id,
    projectionYears: (p.projection_years as 3 | 4 | 5) || 5,
    projectionMode: (p.projection_mode as "gl" | "account") || "gl",
    projectionHorizon: ((p.projection_horizon as "annual" | "monthly") || "annual"),
    startYear: (p.start_year ?? null),
    startMonth: (p.start_month ?? null),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

export default function ProjectionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { companies } = useCompanies()

  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId = companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null
  const [selectedProjectionId, setSelectedProjectionId] = useState<string | null>(null)

  const [savedProjections, setSavedProjections] = useState<SavedProjection[]>([])
  const [loading, setLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [newProjectionName, setNewProjectionName] = useState("")
  const [newProjectionCompanyId, setNewProjectionCompanyId] = useState<string | null>(null)
  const [newProjectionDivisionId, setNewProjectionDivisionId] = useState<string | null>(null)
  const [newProjectionSubDivisionId, setNewProjectionSubDivisionId] = useState<string | null>(null)
  const [newProjectionYears, setNewProjectionYears] = useState<3 | 4 | 5>(5)
  const [newProjectionHorizon, setNewProjectionHorizon] = useState<"annual" | "monthly">("annual")
  const [newProjectionStartYear, setNewProjectionStartYear] = useState<number>(() => new Date().getFullYear())
  const [newProjectionStartMonth, setNewProjectionStartMonth] = useState<number>(() => new Date().getMonth() + 1)

  const startYearOptions = Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 2 + i)
  const monthOptions = [
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

  useEffect(() => {
    if (!newProjectionCompanyId && companies.length > 0) {
      setNewProjectionCompanyId(lockedCompanyId || companies[0]!.id)
    }
  }, [companies, lockedCompanyId, newProjectionCompanyId])

  useEffect(() => {
    setSelectedProjectionId((prev) => {
      if (prev && savedProjections.some((p) => p.id === prev)) return prev
      return savedProjections[0]?.id ?? null
    })
  }, [savedProjections])

  useEffect(() => {
    const load = async () => {
      if (companies.length === 0) return
      setLoading(true)
      try {
        const all: SavedProjection[] = []
        for (const company of companies) {
          if (lockedCompanyId && company.id !== lockedCompanyId) continue
          const projections = await listProjections(company.id)
          all.push(...projections.map(mapApiProjection))
        }
        const mapped = all
        mapped.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        setSavedProjections(mapped)
      } catch (e) {
        console.error("Error loading projections:", e)
        setSavedProjections([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [companies, lockedCompanyId])

  const selectedProjection = selectedProjectionId ? savedProjections.find((p) => p.id === selectedProjectionId) ?? null : null
  const monthLabel = (m: number | null) => {
    if (!m) return null
    const labels = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    return labels[m - 1] ?? null
  }

  const canDelete =
    !!selectedProjection &&
    !!selectedProjection.companyId &&
    deleteConfirmText.trim() === selectedProjection.name.trim()

  const handleOpenProjection = (p: SavedProjection) => {
    const params = new URLSearchParams()
    params.set("projectionId", p.id)
    if (p.companyId) params.set("companyId", p.companyId)
    router.push(`/projections/pro-forma?${params.toString()}`)
  }

  const handleDeleteProjection = async () => {
    if (!selectedProjection?.companyId) return
    if (!canDelete) return
    try {
      setDeleting(true)
      await deleteProjection(selectedProjection.companyId, selectedProjection.id)
      setSavedProjections((prev) => prev.filter((p) => p.id !== selectedProjection.id))
      setDeleteOpen(false)
      setDeleteConfirmText("")
      setSelectedProjectionId((prev) => {
        if (prev !== selectedProjection.id) return prev
        const remaining = savedProjections.filter((p) => p.id !== selectedProjection.id)
        return remaining[0]?.id ?? null
      })
    } catch (e) {
      console.error("Error deleting projection:", e)
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateProjection = async () => {
    if (!newProjectionName.trim() || !newProjectionCompanyId) return
    try {
      const created = await createProjection(newProjectionCompanyId, {
        name: newProjectionName.trim(),
        projection_years: newProjectionHorizon === "monthly" ? 1 : newProjectionYears,
        projection_mode: "account",
        projection_horizon: newProjectionHorizon,
        start_year: newProjectionStartYear,
        start_month: newProjectionHorizon === "monthly" ? newProjectionStartMonth : null,
        division_id: newProjectionDivisionId || null,
        sub_division_id: newProjectionSubDivisionId || null,
      })
      const mapped = mapApiProjection(created)
      setSavedProjections((prev) => [mapped, ...prev])
      setCreateOpen(false)
      setNewProjectionName("")
      handleOpenProjection(mapped)
    } catch (e) {
      console.error("Error creating projection:", e)
    }
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
              <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Projections</h2>
              <p className="text-base text-[#C9B8A5]/90 mb-6 max-w-4xl">
                Créez un scénario ou sélectionnez une projection existante, puis continuez vers votre Pro Forma.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="h-10 bg-[#E0742D] text-white hover:bg-[#c96526]"
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden />
                  Nouveau scénario
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
                  <h2 className="text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">Mes projections</h2>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    Sélectionnez un scénario à gauche pour afficher ses détails.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-8 text-sm text-slate-600 sm:px-8">Chargement des projections…</div>
            ) : savedProjections.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
                <FolderOpen className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
                <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune projection créée</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">Créez votre premier scénario pour commencer.</p>
                <Button onClick={() => setCreateOpen(true)} className="mt-6 bg-[#E0742D] text-white hover:bg-[#c96526]">
                  <Plus className="w-4 h-4 mr-2" aria-hidden />
                  Nouveau scénario
                </Button>
              </div>
            ) : (
              <div className="grid min-h-[min(70vh,640px)] grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
                <aside
                  className={cn(
                    "flex min-h-[220px] min-w-0 flex-col border-slate-200 bg-gradient-to-b from-slate-50/95 to-white",
                    "border-b lg:min-h-0 lg:border-r lg:border-b-0 lg:border-t-0",
                    "lg:shadow-[inset_-1px_0_0_0_rgba(226,232,240,0.85)]",
                  )}
                >
                  <div className="border-b border-slate-200/90 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Projections ({savedProjections.length})
                    </p>
                  </div>
                  <ScrollArea className="h-[min(45vh,380px)] lg:h-[min(70vh,640px)]">
                    <ul className="p-2">
                      {savedProjections.map((p) => {
                        const selected = p.id === selectedProjectionId
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedProjectionId(p.id)}
                              className={cn(
                                "mb-1 flex w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                                selected ? "bg-[#E0742D]/10 shadow-sm ring-1 ring-[#E0742D]/40" : "hover:bg-slate-100/90",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span className={cn("block truncate text-sm font-semibold leading-tight text-slate-900", selected && "text-[#2A2F3A]")}>
                                  {p.name}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {p.projectionYears} ans · {p.projectionMode === "gl" ? "Par GL" : "Par Compte"}
                                </span>
                                {selected ? <span className="mt-2 block h-0.5 w-8 rounded-full bg-[#E0742D]" aria-hidden /> : null}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                </aside>

                <section className={cn("flex min-h-[320px] min-w-0 flex-col bg-white", "border-t border-slate-200/90 lg:border-t-0")}>
                  {selectedProjection ? (
                    <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-7">
                      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E0742D]">Résumé projection</p>
                            <h3 className="mt-1 text-xl font-semibold leading-snug text-[#2A2F3A] sm:text-2xl truncate">
                              {selectedProjection.name}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                              Paramètres du scénario et accès direct au Pro Forma.
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
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Période</p>
                          <p className="text-sm font-medium text-slate-800">
                            {selectedProjection.projectionHorizon === "monthly" ? "Mensuel" : "Annuel"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Projection</p>
                          <p className="text-sm font-medium text-slate-800">
                            {selectedProjection.projectionHorizon === "monthly" ? "12 mois" : `${selectedProjection.projectionYears} ans`}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Mode</p>
                          <p className="text-sm font-medium text-slate-800">
                            {selectedProjection.projectionMode === "gl" ? "Par GL (Grand Livre)" : "Par Compte"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Date de référence
                          </p>
                          <p className="text-sm font-medium text-slate-800">
                            {selectedProjection.startYear ? (
                              selectedProjection.projectionHorizon === "monthly" ? (
                                `${monthLabel(selectedProjection.startMonth) ?? "—"} ${selectedProjection.startYear}`
                              ) : (
                                String(selectedProjection.startYear)
                              )
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="my-6 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Entité</p>
                        <p className="text-sm text-slate-700">
                          {selectedProjection.companyId
                            ? companies.find((c) => c.id === selectedProjection.companyId)?.name || "—"
                            : "—"}
                        </p>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <Button
                          type="button"
                          onClick={() => handleOpenProjection(selectedProjection)}
                          className="bg-[#E0742D] text-white shadow-sm hover:bg-[#c96526]"
                        >
                          Ouvrir le Pro Forma
                          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-sm text-slate-600">
                      Sélectionnez une projection à gauche.
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
            <AlertDialogTitle>Supprimer la projection</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Pour confirmer, saisissez exactement le nom de la projection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Projection: <span className="font-semibold text-slate-900">{selectedProjection?.name ?? "—"}</span>
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Tapez le nom de la projection pour confirmer"
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmText("")
              }}
              disabled={deleting}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteProjection()
              }}
              className={cn("bg-red-600 text-white hover:bg-red-700", !canDelete && "pointer-events-none opacity-50")}
            >
              {deleting ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-[min(50vw,960px)] max-w-none overflow-hidden p-0">
          <div className="relative">
            <div className="h-1 w-full bg-gradient-to-r from-[#E0742D] via-[#E0742D]/35 to-transparent" />
            <div className="border-b border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80 px-6 py-5 sm:px-8">
              <DialogHeader>
                <DialogTitle className="text-xl sm:text-2xl tracking-tight text-[#2A2F3A]">
                  Nouveau scénario de projection
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Donnez un nom, choisissez l’entité, puis définissez la durée et le mode. Vous serez ensuite redirigé
                  vers le Pro Forma.
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8">
            <div className="space-y-7">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nom</p>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Nom de la projection</label>
                  <Input
                    value={newProjectionName}
                    onChange={(e) => setNewProjectionName(e.target.value)}
                    placeholder="Ex: Scénario réaliste, Scénario optimiste…"
                    className="w-full"
                    autoFocus
                  />
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Entité</p>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={newProjectionCompanyId}
                  selectedDivisionId={newProjectionDivisionId}
                  selectedSubDivisionId={newProjectionSubDivisionId}
                  onCompanyChange={(id) => {
                    if (lockedCompanyId) return
                    setNewProjectionCompanyId(id)
                  }}
                  onDivisionChange={setNewProjectionDivisionId}
                  onSubDivisionChange={setNewProjectionSubDivisionId}
                  disableCompanySelection={!!lockedCompanyId}
                />
              </div>

              <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Paramètres</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Période</label>
                    <Select value={newProjectionHorizon} onValueChange={(v) => setNewProjectionHorizon(v as "annual" | "monthly")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Annuel</SelectItem>
                        <SelectItem value="monthly">Mensuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">Nombre d'années</label>
                    {newProjectionHorizon === "annual" ? (
                      <Select value={newProjectionYears.toString()} onValueChange={(v) => setNewProjectionYears(parseInt(v) as 3 | 4 | 5)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 ans</SelectItem>
                          <SelectItem value="4">4 ans</SelectItem>
                          <SelectItem value="5">5 ans</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-700">
                        12 mois
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-slate-700">
                      {newProjectionHorizon === "monthly" ? "Début (année)" : "Année de référence (début)"}
                    </label>
                    <Select value={String(newProjectionStartYear)} onValueChange={(v) => setNewProjectionStartYear(parseInt(v))}>
                      <SelectTrigger className="w-full">
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
                  {newProjectionHorizon === "monthly" && (
                    <div className="grid gap-2 md:col-span-2">
                      <label className="text-sm font-medium text-slate-700">Début (mois)</label>
                      <Select value={String(newProjectionStartMonth)} onValueChange={(v) => setNewProjectionStartMonth(parseInt(v))}>
                        <SelectTrigger className="w-full md:w-[320px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                onClick={handleCreateProjection}
                disabled={!newProjectionName.trim() || !newProjectionCompanyId}
                className={cn("bg-[#E0742D] text-white hover:bg-[#c96526]")}
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

