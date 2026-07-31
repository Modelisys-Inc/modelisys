"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Check,
  ClipboardList,
  FolderOpen,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EntitySelector } from "@/components/entity-selector"
import { useCompanies } from "@/hooks/use-companies"
import { useCompanyDiagnostic } from "@/hooks/use-company-diagnostic"
import { formatDateFr, formatMoney, formatPercent, formatReferencePeriod } from "@/components/diagnostic/diagnostic-format"
import { lifecycleLabel } from "@/components/diagnostic/diagnostic-format"
import {
  createDiagnostic,
  listDiagnosticsForCompany,
  removeDiagnostic,
  syncDiagnosticCompanyName,
  type DiagnosticRecord,
} from "@/lib/diagnostic-registry"
import { cn } from "@/lib/utils"
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

interface DiagnosticPortalPageProps {
  /** Société courante (query `companyId`) — même principe que Projections. */
  lockedCompanyId?: string | null
}

function formatShortDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MesDiagnosticsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80 px-6 py-4 sm:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">
              Mes diagnostics
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
              Créez un rapport ou rouvrez un diagnostic déjà généré.
            </p>
          </div>
        </div>
      </div>
      {children}
    </div>
  )
}

export function DiagnosticPortalPage({ lockedCompanyId = null }: DiagnosticPortalPageProps) {
  const router = useRouter()
  const { companies, loading: companiesLoading } = useCompanies()
  const [diagnostics, setDiagnostics] = useState<DiagnosticRecord[]>([])
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [newCompanyId, setNewCompanyId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newReferenceYear, setNewReferenceYear] = useState(() => new Date().getFullYear())
  const [newReferenceMonth, setNewReferenceMonth] = useState(() => new Date().getMonth() + 1)
  const [creating, setCreating] = useState(false)

  const referenceYearOptions = Array.from({ length: 9 }, (_, i) => new Date().getFullYear() - 2 + i)
  const referenceMonthOptions = [
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

  const lockedCompany = lockedCompanyId
    ? companies.find((c) => c.id === lockedCompanyId) ?? null
    : null

  const refreshDiagnostics = useCallback(() => {
    setDiagnostics(listDiagnosticsForCompany(lockedCompanyId))
  }, [lockedCompanyId])

  useEffect(() => {
    refreshDiagnostics()
  }, [refreshDiagnostics])

  useEffect(() => {
    for (const company of companies) {
      syncDiagnosticCompanyName(company.id, company.name)
    }
    refreshDiagnostics()
  }, [companies, refreshDiagnostics])

  useEffect(() => {
    if (!newCompanyId && companies.length > 0) {
      setNewCompanyId(lockedCompanyId || companies[0]!.id)
    }
  }, [companies, lockedCompanyId, newCompanyId])

  useEffect(() => {
    if (diagnostics.length === 0) {
      setSelectedDiagnosticId(null)
      return
    }
    setSelectedDiagnosticId((prev) => {
      if (prev && diagnostics.some((d) => d.id === prev)) return prev
      return diagnostics[0]!.id
    })
  }, [diagnostics])

  const selectedDiagnostic = diagnostics.find((d) => d.id === selectedDiagnosticId) ?? null
  const selectedCompanyId = selectedDiagnostic?.companyId ?? null
  const selectedReference = selectedDiagnostic
    ? {
        referenceYear: selectedDiagnostic.referenceYear,
        referenceMonth: selectedDiagnostic.referenceMonth,
      }
    : null
  const { data: preview, loading: previewLoading } = useCompanyDiagnostic(
    selectedCompanyId,
    selectedReference,
  )

  const canDelete =
    !!selectedDiagnostic && deleteConfirmText.trim() === selectedDiagnostic.title.trim()

  const openDiagnostic = (diag: DiagnosticRecord) => {
    const params = new URLSearchParams()
    if (diag.companyId) params.set("companyId", diag.companyId)
    const qs = params.toString()
    router.push(`/modules/diagnostic/${diag.id}${qs ? `?${qs}` : ""}`)
  }

  const handleCreateDiagnostic = () => {
    const targetCompanyId = lockedCompanyId || newCompanyId
    const company = companies.find((c) => c.id === targetCompanyId)
    if (!company || creating) return
    setCreating(true)
    try {
      const record = createDiagnostic({
        companyId: company.id,
        companyName: company.name,
        title: newTitle.trim() || undefined,
        referenceYear: newReferenceYear,
        referenceMonth: newReferenceMonth,
      })
      refreshDiagnostics()
      setIsDialogOpen(false)
      setNewTitle("")
      openDiagnostic(record)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteDiagnostic = () => {
    if (!selectedDiagnostic || !canDelete) return
    removeDiagnostic(selectedDiagnostic.id)
    refreshDiagnostics()
    setDeleteOpen(false)
    setDeleteConfirmText("")
    setSelectedDiagnosticId((prev) => {
      if (prev !== selectedDiagnostic.id) return prev
      const remaining = diagnostics.filter((d) => d.id !== selectedDiagnostic.id)
      return remaining[0]?.id ?? null
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <div className="relative w-full overflow-hidden pt-15 pb-40">
        <div className="absolute inset-0 bg-[#2A2F3A]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-28 h-[420px] w-[420px] rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1920px] px-6">
          <div className="mb-8 flex items-start gap-3">
            <div className="w-2" />
            <div className="flex-1">
              <h2 className="mb-2 text-4xl font-semibold tracking-tight text-[#E6D6C3]">Diagnostic</h2>
              <p className="mb-6 text-base text-[#C9B8A5]/90">
                Créez et consultez vos rapports de diagnostic d&apos;entreprise.
              </p>
              <p className="mb-6 max-w-4xl text-base leading-relaxed text-[#C9B8A5]/80">
                {lockedCompany
                  ? `Créez un diagnostic ou sélectionnez un rapport existant pour ${lockedCompany.name}.`
                  : "Créez un rapport ou sélectionnez un diagnostic existant pour continuer l'analyse."}
              </p>
              <Button
                onClick={() => {
                  setNewCompanyId(lockedCompanyId || (companies[0]?.id ?? null))
                  setIsDialogOpen(true)
                }}
                disabled={companiesLoading || companies.length === 0 || (!!lockedCompanyId && !lockedCompany)}
                className="bg-[#E0742D] text-white hover:bg-[#c96526]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouveau diagnostic
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="relative -mt-32 mb-12">
        <div className="mx-auto max-w-[1920px] px-6">
          {companiesLoading ? (
            <MesDiagnosticsCard>
              <div className="px-6 py-8">
                <p className="text-sm text-slate-600">Chargement…</p>
              </div>
            </MesDiagnosticsCard>
          ) : companies.length === 0 ? (
            <MesDiagnosticsCard>
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <FolderOpen className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
                <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune société disponible</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Créez d&apos;abord une société dans la configuration pour générer un diagnostic.
                </p>
                <Link href="/settings/companies" className="mt-6">
                  <Button className="bg-[#2A2F3A] text-[#E6D6C3] hover:bg-[#1F2430]">
                    Gérer les sociétés
                  </Button>
                </Link>
              </div>
            </MesDiagnosticsCard>
          ) : diagnostics.length === 0 ? (
            <MesDiagnosticsCard>
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <ClipboardList className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
                <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucun diagnostic créé</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  {lockedCompany
                    ? `Lancez votre premier rapport de diagnostic pour ${lockedCompany.name}.`
                    : "Lancez votre premier rapport de diagnostic pour une société de votre espace."}
                </p>
                <Button
                  className="mt-6 bg-[#E0742D] text-white hover:bg-[#c96526]"
                  onClick={() => {
                    setNewCompanyId(lockedCompanyId || (companies[0]?.id ?? null))
                    setIsDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un diagnostic
                </Button>
              </div>
            </MesDiagnosticsCard>
          ) : (
            <MesDiagnosticsCard>
              <div className="grid min-h-[min(70vh,600px)] grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
                <aside
                  className={cn(
                    "flex min-h-[220px] min-w-0 flex-col border-slate-200 bg-gradient-to-b from-slate-50/95 to-white",
                    "border-b lg:min-h-0 lg:border-r lg:border-b-0",
                  )}
                >
                  <div className="border-b border-slate-200/90 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Diagnostics ({diagnostics.length})
                    </p>
                  </div>
                  <ScrollArea className="h-[min(45vh,380px)] lg:h-[min(70vh,600px)]">
                    <ul className="p-2">
                      {diagnostics.map((diag) => {
                        const selected = diag.id === selectedDiagnosticId
                        return (
                          <li key={diag.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedDiagnosticId(diag.id)}
                              className={cn(
                                "mb-1 flex w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                                selected
                                  ? "bg-[#E0742D]/10 shadow-sm ring-1 ring-[#E0742D]/40"
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
                                  {diag.title}
                                </span>
                                {!lockedCompanyId ? (
                                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                                    {diag.companyName}
                                  </span>
                                ) : null}
                                <span className="mt-0.5 block truncate text-[10px] text-slate-400">
                                  Ouvert {formatShortDateTime(diag.lastOpenedAt)}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </ScrollArea>
                </aside>

                <section className="flex min-h-[320px] min-w-0 flex-col bg-white">
                  {selectedDiagnostic && previewLoading ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
                      <p className="text-sm text-slate-600">Chargement de l&apos;aperçu…</p>
                    </div>
                  ) : selectedDiagnostic && preview ? (
                    <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-7">
                      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E0742D]">
                            Aperçu du diagnostic
                          </p>
                          <h3 className="mt-1 text-xl font-semibold leading-snug text-[#2A2F3A] sm:text-2xl">
                            {selectedDiagnostic.title}
                          </h3>
                          {!lockedCompanyId ? (
                            <p className="mt-2 text-sm text-slate-500">{selectedDiagnostic.companyName}</p>
                          ) : null}
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

                      <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Date de référence
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatReferencePeriod(
                              selectedDiagnostic.referenceYear,
                              selectedDiagnostic.referenceMonth,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Exercice de référence
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {preview.latest_fiscal_year}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Stade de vie
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {lifecycleLabel(preview.summary.lifecycle_stage)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Chiffre d&apos;affaires
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatMoney(preview.summary.latest_revenue, preview.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Marge EBITDA
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-800">
                            {formatPercent(preview.summary.latest_ebitda_margin_pct)}
                          </p>
                        </div>
                      </div>

                      <div className="my-6 h-px bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" />

                      <div className="space-y-2 text-sm text-slate-600">
                        <p>
                          <span className="text-slate-400">Créé</span>{" "}
                          {formatShortDateTime(selectedDiagnostic.createdAt)}
                        </p>
                        <p>
                          <span className="text-slate-400">Données générées</span>{" "}
                          {formatDateFr(preview.generated_at)}
                        </p>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <Button
                          className="bg-[#E0742D] text-white shadow-sm hover:bg-[#c96526]"
                          onClick={() => openDiagnostic(selectedDiagnostic)}
                        >
                          Ouvrir le diagnostic
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : selectedDiagnostic ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center text-sm text-slate-600">
                      Impossible de charger l&apos;aperçu pour ce diagnostic.
                    </div>
                  ) : null}
                </section>
              </div>
            </MesDiagnosticsCard>
          )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau diagnostic</DialogTitle>
            <DialogDescription>
              {lockedCompany
                ? `Le diagnostic sera créé pour ${lockedCompany.name}. Vous pourrez le rouvrir depuis cette page.`
                : "Choisissez l'entité à analyser. Vous pourrez rouvrir ce diagnostic depuis cette page."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!lockedCompanyId ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Société</label>
                <EntitySelector
                  companies={companies}
                  selectedCompanyId={newCompanyId}
                  selectedDivisionId={null}
                  selectedSubDivisionId={null}
                  onCompanyChange={setNewCompanyId}
                  onDivisionChange={() => {}}
                  onSubDivisionChange={() => {}}
                />
              </div>
            ) : null}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Titre du diagnostic <span className="font-normal text-slate-400">(optionnel)</span>
              </label>
              <Input
                placeholder="Ex. Diagnostic annuel 2025"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date de référence (année)
                </label>
                <Select
                  value={String(newReferenceYear)}
                  onValueChange={(v) => setNewReferenceYear(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceYearOptions.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Date de référence (mois)
                </label>
                <Select
                  value={String(newReferenceMonth)}
                  onValueChange={(v) => setNewReferenceMonth(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {referenceMonthOptions.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setNewTitle("")
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button
              onClick={handleCreateDiagnostic}
              disabled={!(lockedCompanyId || newCompanyId) || creating}
              className="bg-[#E0742D] text-white hover:bg-[#c96526]"
            >
              <Check className="mr-2 h-4 w-4" />
              Créer le diagnostic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce diagnostic ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action retire le diagnostic de votre liste locale. Le rapport calculé n&apos;est pas
              supprimé côté serveur. Tapez{" "}
              <span className="font-semibold text-slate-900">{selectedDiagnostic?.title}</span> pour confirmer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="Titre du diagnostic"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={!canDelete}
              onClick={(e) => {
                e.preventDefault()
                handleDeleteDiagnostic()
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
