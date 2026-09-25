"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { FolderOpen, ArrowRight, Trash2 } from "lucide-react"
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
import { projectionPlanOverallProgressPercent } from "@/lib/projection-plan-phases"
import { getProjectionPlanCompletedSteps } from "@/lib/projection-plan-registry"

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

function mapApiProjection(p: ProjectionData): SavedProjection {
  return {
    id: p.id,
    name: p.name,
    companyId: p.company_id,
    divisionId: p.division_id,
    subDivisionId: p.sub_division_id,
    projectionYears: (p.projection_years as 3 | 4 | 5) || 5,
    projectionMode: (p.projection_mode as "gl" | "account") || "gl",
    projectionHorizon: (p.projection_horizon as "annual" | "monthly") || "annual",
    startYear: p.start_year ?? null,
    startMonth: p.start_month ?? null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

export default function ProjectionsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { companies } = useCompanies()

  const companyIdFromUrl = searchParams.get("companyId")
  const lockedCompanyId =
    companyIdFromUrl && companies.some((c) => c.id === companyIdFromUrl) ? companyIdFromUrl : null
  const companyIdForCreate = lockedCompanyId || companies[0]?.id || null
  const companyNameForCreate =
    companies.find((c) => c.id === companyIdForCreate)?.name || "Société"

  const [selectedProjectionId, setSelectedProjectionId] = useState<string | null>(null)
  const [savedProjections, setSavedProjections] = useState<SavedProjection[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [newProjectionName, setNewProjectionName] = useState("")
  const [newProjectionYears, setNewProjectionYears] = useState<3 | 4 | 5>(5)
  const [newProjectionStartYear, setNewProjectionStartYear] = useState<number>(
    () => new Date().getFullYear(),
  )
  const [newProjectionStartMonth, setNewProjectionStartMonth] = useState<number>(
    () => new Date().getMonth() + 1,
  )
  const [heroVisible, setHeroVisible] = useState(false)
  const [progressTick, setProgressTick] = useState(0)
  const heroRef = useRef<HTMLElement>(null)

  const startYearOptions = useMemo(
    () => Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 2 + i),
    [],
  )

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHeroVisible(true)
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
    )
    if (heroRef.current) observer.observe(heroRef.current)
    return () => {
      if (heroRef.current) observer.unobserve(heroRef.current)
    }
  }, [])

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
        all.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
        setSavedProjections(all)
        setProgressTick((t) => t + 1)
      } catch (e) {
        console.error("Error loading projections:", e)
        setSavedProjections([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [companies, lockedCompanyId])

  const selectedProjection = selectedProjectionId
    ? (savedProjections.find((p) => p.id === selectedProjectionId) ?? null)
    : null

  const overallProgress = useMemo(() => {
    void progressTick
    if (!selectedProjection) return 0
    return projectionPlanOverallProgressPercent(
      getProjectionPlanCompletedSteps(selectedProjection.id),
    )
  }, [selectedProjection, progressTick])

  const canDelete =
    !!selectedProjection &&
    !!selectedProjection.companyId &&
    deleteConfirmText.trim() === selectedProjection.name.trim()

  const handleOpenProjection = (p: SavedProjection) => {
    const params = new URLSearchParams()
    if (p.companyId) params.set("companyId", p.companyId)
    const qs = params.toString()
    router.push(qs ? `/projections/${p.id}?${qs}` : `/projections/${p.id}`)
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
    if (!newProjectionName.trim() || !companyIdForCreate) return
    try {
      const created = await createProjection(companyIdForCreate, {
        name: newProjectionName.trim(),
        projection_years: newProjectionYears,
        projection_mode: "account",
        projection_horizon: "annual",
        start_year: newProjectionStartYear,
        start_month: newProjectionStartMonth,
        division_id: null,
        sub_division_id: null,
      })
      const mapped = mapApiProjection(created)
      const params = new URLSearchParams()
      if (mapped.companyId) params.set("companyId", mapped.companyId)
      const qs = params.toString()
      const href = qs ? `/projections/${mapped.id}?${qs}` : `/projections/${mapped.id}`
      router.push(href)
      setSavedProjections((prev) => [mapped, ...prev])
      setNewProjectionName("")
      setCreateOpen(false)
    } catch (e) {
      console.error("Error creating projection:", e)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <section ref={heroRef} className="relative overflow-hidden pb-40 pt-16 sm:pt-20 sm:pb-44">
        <div className="pointer-events-none absolute inset-0 bg-[#222732]">
          <div
            className="absolute inset-0 opacity-[0.4]"
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px),
                linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 70% 75% at 22% 45%, black 10%, transparent 72%)",
            }}
          />
          <div className="absolute -top-32 left-[-10%] h-[34rem] w-[34rem] rounded-full bg-[#E6D6C3]/[0.04] blur-3xl" />
          <div className="absolute top-1/3 right-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#E0742D]/[0.05] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1a1f2a] to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          <div
            className={`max-w-xl lg:max-w-[34rem] xl:max-w-[38rem] transition-all duration-1000 ${
              heroVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/70">
              Prévisions financières
            </p>

            <h1 className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]">
              Projections
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Créez un scénario ou sélectionnez une projection existante, puis ouvrez son tableau
              de bord pour parcourir le plan d&apos;hypothèses.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4 sm:mt-12">
              <button
                type="button"
                data-testid="new-scenario-button"
                onClick={() => setCreateOpen(true)}
                className="group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
              >
                NOUVEAU SCÉNARIO
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="relative -mt-32 mb-12">
        <div className="mx-auto max-w-[1920px] px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          <div className="mb-6 w-full overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]">
            <h2 className="sr-only">Mes projections</h2>

            {loading ? (
              <div className="px-6 py-16 text-center text-sm text-slate-600 sm:px-8">
                Chargement des projections…
              </div>
            ) : savedProjections.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
                <FolderOpen className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
                <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune projection créée</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Créez votre premier scénario pour commencer.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-6 group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8]"
                >
                  NOUVEAU SCÉNARIO
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
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
                  <div className="border-b border-[#E6D6C3]/50 bg-[#222732]/[0.03] px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                      Projections ({savedProjections.length})
                    </p>
                  </div>
                  <ScrollArea className="h-[min(45vh,380px)] lg:h-[min(70vh,640px)]">
                    <ul className="p-2" data-testid="projection-list">
                      {savedProjections.map((p) => {
                        const selected = p.id === selectedProjectionId
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedProjectionId(p.id)}
                              className={cn(
                                "mb-1 flex w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                                selected
                                  ? "bg-[#E6D6C3]/35 shadow-sm ring-1 ring-[#E6D6C3]/70"
                                  : "hover:bg-slate-100/90",
                              )}
                            >
                              <span className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "block truncate text-sm font-semibold leading-tight text-slate-900",
                                    selected && "text-[#2A2F3A]",
                                  )}
                                >
                                  {p.name}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">
                                  {p.startYear
                                    ? `${monthLabel(p.startMonth) ?? "—"} ${p.startYear}`
                                    : `${p.projectionYears} ans`}
                                </span>
                                {selected ? (
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
                  {selectedProjection ? (
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="shrink-0 border-b border-slate-100 px-5 py-5 sm:px-7">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div
                              className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]"
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
                                Résumé projection
                              </p>
                              <h3 className="mt-1.5 truncate text-xl font-semibold leading-snug text-[#2A2F3A] sm:text-2xl">
                                {selectedProjection.name}
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                Progression et paramètres du scénario avant d&apos;ouvrir le
                                parcours.
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

                        <div className="mt-5 grid gap-6 sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              Date de référence
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {selectedProjection.startYear
                                ? `${monthLabel(selectedProjection.startMonth) ?? "—"} ${selectedProjection.startYear}`
                                : "—"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              Société
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {selectedProjection.companyId
                                ? companies.find((c) => c.id === selectedProjection.companyId)
                                    ?.name || "—"
                                : "—"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                              Horizon
                            </p>
                            <p className="text-sm font-medium text-slate-800">
                              {selectedProjection.projectionYears} ans
                            </p>
                          </div>
                        </div>
                      </div>

                      <ScrollArea className="min-h-0 flex-1">
                        <div className="space-y-5 px-5 py-5 sm:px-7">
                          <div>
                            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                                  Avancement du parcours
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  Progression globale des hypothèses.
                                </p>
                              </div>
                              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                                {overallProgress}
                                <span className="text-sm font-medium text-slate-500">%</span>
                              </p>
                            </div>
                            <div
                              className="h-1.5 w-full overflow-hidden rounded-full bg-[#E6D6C3]/40"
                              data-testid="projection-hub-progress-bar"
                            >
                              <div
                                className="h-full rounded-full bg-[#2A2F3A] transition-all duration-500 ease-out"
                                style={{ width: `${overallProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </ScrollArea>

                      <div className="shrink-0 border-t border-slate-100 px-5 py-4 sm:px-7">
                        <button
                          type="button"
                          data-testid="open-projection-button"
                          onClick={() => handleOpenProjection(selectedProjection)}
                          className="group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
                        >
                          OUVRIR LE PARCOURS
                          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
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
              Cette action est irréversible. Pour confirmer, saisissez exactement le nom de la
              projection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Projection:{" "}
              <span className="font-semibold text-slate-900">{selectedProjection?.name ?? "—"}</span>
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
              onClick={() => setDeleteConfirmText("")}
              disabled={deleting}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void handleDeleteProjection()
              }}
              className={cn(
                "bg-red-600 text-white hover:bg-red-700",
                !canDelete && "pointer-events-none opacity-50",
              )}
            >
              {deleting ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          className="w-[calc(100vw-2rem)] overflow-hidden border border-[#E6D6C3]/40 p-0 shadow-[0_24px_60px_-28px_rgba(34,39,50,0.45)] sm:w-[min(36rem,92vw)] sm:max-w-none"
          data-testid="new-scenario-dialog"
        >
          <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-8">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
              <DialogHeader className="space-y-1.5 text-left">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
                  Prévisions financières
                </p>
                <DialogTitle className="text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                  Nouveau scénario de projection
                </DialogTitle>
                <DialogDescription className="max-w-md text-sm leading-relaxed text-slate-600">
                  Indiquez le nom, l&apos;horizon et la date de référence. Vous serez conduit au
                  tableau de bord pour parcourir le plan d&apos;hypothèses
                  {companyNameForCreate ? (
                    <>
                      {" "}
                      de <span className="font-medium text-[#2A2F3A]">{companyNameForCreate}</span>
                    </>
                  ) : null}
                  .
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <div className="space-y-8 px-6 py-6 sm:px-8">
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                Identification
              </p>
              <label htmlFor="new-scenario-name" className="sr-only">
                Nom de la projection
              </label>
              <Input
                id="new-scenario-name"
                data-testid="new-scenario-name"
                value={newProjectionName}
                onChange={(e) => setNewProjectionName(e.target.value)}
                placeholder="Ex. : Scénario réaliste, Scénario optimiste…"
                className="h-11 w-full border-slate-200 bg-white text-[#2A2F3A] placeholder:text-slate-400 focus-visible:ring-[#E6D6C3]/80"
                autoFocus
              />
            </div>

            <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                Paramètres
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-2">
                  <label className="text-sm text-slate-600">Nombre d&apos;années</label>
                  <Select
                    value={newProjectionYears.toString()}
                    onValueChange={(v) => setNewProjectionYears(parseInt(v, 10) as 3 | 4 | 5)}
                  >
                    <SelectTrigger
                      className="h-11 w-full border-slate-200 bg-white"
                      data-testid="new-scenario-years"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 ans</SelectItem>
                      <SelectItem value="4">4 ans</SelectItem>
                      <SelectItem value="5">5 ans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                Date de référence
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm text-slate-600">Mois de référence</label>
                  <Select
                    value={String(newProjectionStartMonth)}
                    onValueChange={(v) => setNewProjectionStartMonth(parseInt(v, 10))}
                  >
                    <SelectTrigger
                      className="h-11 w-full border-slate-200 bg-white"
                      data-testid="new-scenario-start-month"
                    >
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
                <div className="grid gap-1.5">
                  <label className="text-sm text-slate-600">Année de référence</label>
                  <Select
                    value={String(newProjectionStartYear)}
                    onValueChange={(v) => setNewProjectionStartYear(parseInt(v, 10))}
                  >
                    <SelectTrigger
                      className="h-11 w-full border-slate-200 bg-white"
                      data-testid="new-scenario-start-year"
                    >
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

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="inline-flex items-center gap-2 px-1 py-3 text-xs font-semibold tracking-[0.08em] text-slate-500 transition hover:text-[#2A2F3A]"
            >
              ANNULER
            </button>
            <button
              type="button"
              data-testid="new-scenario-submit"
              onClick={() => void handleCreateProjection()}
              disabled={!newProjectionName.trim() || !companyIdForCreate}
              className="group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
            >
              CRÉER ET OUVRIR
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
