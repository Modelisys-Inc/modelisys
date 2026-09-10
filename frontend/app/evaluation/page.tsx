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
import { FolderOpen, ArrowRight, Trash2, Loader2 } from "lucide-react"
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
import { useValuationPreviewSummary } from "@/hooks/use-valuation-preview-summary"
import { formatCurrency } from "@/lib/financial-utils"
import { cn } from "@/lib/utils"
import {
  valuationPlanOverallProgressPercent,
} from "@/lib/valuation-plan-phases"
import {
  createValuation,
  listValuationsForCompany,
  removeValuation,
  touchValuation,
  valuationDetailPath,
  type ValuationRecord,
} from "@/lib/valuation-registry"
import type { ValuationPreviewSummary } from "@/lib/valuation-preview-summary"

function formatPreviewAmount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return formatCurrency(value)
}

function formatPreviewMultiple(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}×`
}

const PREVIEW_METRIC_ROWS: {
  key: keyof Pick<
    ValuationPreviewSummary,
    | "vca"
    | "revenueRepresentativeMid"
    | "baiiaAdjustedMid"
    | "cashFlowMid"
    | "multipleRetained"
    | "enterpriseValueMid"
    | "acn"
    | "goodwillMid"
  >
  label: string
  source: string
  format: (v: number | null) => string
}[] = [
  {
    key: "vca",
    label: "Valeur comptable ajustée",
    source: "Valeur comptable ajustée",
    format: formatPreviewAmount,
  },
  {
    key: "revenueRepresentativeMid",
    label: "Revenus (moyen)",
    source: "Flux monétaires — Fourchette retenue",
    format: formatPreviewAmount,
  },
  {
    key: "baiiaAdjustedMid",
    label: "BAIIA ajusté (moyen)",
    source: "Flux monétaires — Fourchette retenue",
    format: formatPreviewAmount,
  },
  {
    key: "cashFlowMid",
    label: "Flux monétaires caractéristiques moyens",
    source: "Flux monétaires",
    format: formatPreviewAmount,
  },
  {
    key: "multipleRetained",
    label: "Multiple de capitalisation retenu",
    source: "Multiplicateur / Capitalisation",
    format: formatPreviewMultiple,
  },
  {
    key: "enterpriseValueMid",
    label: "Valeur d'entreprise",
    source: "Capitalisation",
    format: formatPreviewAmount,
  },
  {
    key: "acn",
    label: "Actif corporel net",
    source: "Valeur comptable ajustée",
    format: formatPreviewAmount,
  },
  {
    key: "goodwillMid",
    label: "Achalandage",
    source: "Capitalisation",
    format: formatPreviewAmount,
  },
]

function ValuationFinancialPreview({
  summary,
  loading,
}: {
  summary: ValuationPreviewSummary
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Chargement de l&apos;aperçu financier…
      </div>
    )
  }

  const hasAnyMetric =
    summary.vca != null ||
    summary.acn != null ||
    summary.revenueRepresentativeMid != null ||
    summary.baiiaAdjustedMid != null ||
    summary.cashFlowMid != null ||
    summary.multipleRetained != null ||
    summary.enterpriseValueMid != null ||
    summary.goodwillMid != null ||
    summary.highRiskNames.length > 0

  return (
    <div className="space-y-8" data-testid="valuation-financial-preview">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
          Synthèse indicative
        </p>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
          Paramètres clés issus des modules déjà documentés. Les montants absents
          apparaîtront une fois l&apos;étape correspondante complétée.
        </p>
      </div>

      {!hasAnyMetric ? (
        <p className="border-l-2 border-slate-200 pl-4 text-sm leading-relaxed text-slate-500">
          Aucun paramètre financier n&apos;est encore disponible. Ouvrez la valorisation et
          complétez les étapes du parcours pour peupler cette synthèse.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr className="border-b-2 border-[#2A2F3A] text-left">
                  <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Paramètre
                  </th>
                  <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Valeur
                  </th>
                  <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Module
                  </th>
                </tr>
              </thead>
              <tbody>
                {PREVIEW_METRIC_ROWS.map((row) => {
                  const raw = summary[row.key]
                  const isEmphasis =
                    row.key === "enterpriseValueMid" ||
                    row.key === "goodwillMid" ||
                    row.key === "vca"
                  return (
                    <tr key={row.key} className="border-b border-slate-200 align-top">
                      <td className="py-2.5 pr-4 text-sm font-medium text-[#2A2F3A]">
                        {row.label}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 pr-4 text-right font-mono text-sm tabular-nums",
                          isEmphasis && raw != null
                            ? "font-semibold text-[#2A2F3A]"
                            : "text-[#2A2F3A]",
                          raw == null && "text-slate-400",
                        )}
                      >
                        {row.format(raw)}
                      </td>
                      <td className="py-2.5 text-sm text-slate-500">{row.source}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div>
            <p className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Principaux risques élevés — modèle d&apos;affaires
            </p>
            {summary.highRiskNames.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Aucun risque de niveau élevé n&apos;a été documenté à ce jour.
              </p>
            ) : (
              <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#2A2F3A]">
                {summary.highRiskNames.slice(0, 5).map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ol>
            )}
            {summary.highRiskNames.length > 5 ? (
              <p className="mt-2 text-xs text-slate-500">
                {summary.highRiskNames.length - 5} autre
                {summary.highRiskNames.length - 5 > 1 ? "s" : ""} non affiché
                {summary.highRiskNames.length - 5 > 1 ? "s" : ""} — voir le modèle
                d&apos;affaires.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
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
  const [heroVisible, setHeroVisible] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

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
    setSelectedId((prev) => {
      if (prev && saved.some((v) => v.id === prev)) return prev
      return saved[0]?.id ?? null
    })
  }, [saved])

  const selected = selectedId ? saved.find((v) => v.id === selectedId) ?? null : null
  const previewCompanyId = selected?.companyId ?? null
  const { summary: previewSummary, loading: previewLoading } = useValuationPreviewSummary(
    previewCompanyId,
    selected
      ? { month: selected.referenceMonth, year: selected.referenceYear }
      : null,
  )
  const overallProgress = valuationPlanOverallProgressPercent(selected?.completedPlanSteps)

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
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      <section ref={heroRef} className="relative overflow-hidden pb-40 pt-16 sm:pt-20 sm:pb-44">
        <div className="absolute inset-0 pointer-events-none bg-[#222732]">
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
              Évaluation d&apos;entreprise
            </p>

            <h1 className="mt-7 text-[2rem] font-semibold leading-[1.15] tracking-tight text-[#E6D6C3] sm:mt-8 sm:text-[2.45rem] sm:leading-[1.12] xl:text-[2.85rem]">
              Valorisation
            </h1>

            <p className="mt-7 max-w-[30rem] text-[15px] leading-[1.75] text-[#C9B8A5]/78 sm:mt-8 sm:text-base">
              Créez une valorisation ou sélectionnez une existante, puis ouvrez son tableau de bord
              pour parcourir le plan de valorisation.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4 sm:mt-12">
              <button
                type="button"
                data-testid="new-valuation-button"
                onClick={() => setCreateOpen(true)}
                className="group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
              >
                NOUVELLE VALORISATION
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-5 sm:px-10 lg:px-12 xl:px-16 2xl:px-20">
          <div className="mb-6 w-full overflow-hidden rounded-xl border border-[#E6D6C3]/35 bg-white shadow-[0_18px_50px_-28px_rgba(34,39,50,0.45)] ring-1 ring-[#222732]/[0.04]">
            <h2 className="sr-only">Mes valorisations</h2>

            {saved.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-8">
                <FolderOpen className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
                <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune valorisation créée</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">
                  Créez votre première valorisation pour commencer.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="mt-6 group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8]"
                >
                  NOUVELLE VALORISATION
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
                                  ? "bg-[#E6D6C3]/35 shadow-sm ring-1 ring-[#E6D6C3]/70"
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
                    <div className="flex min-h-0 flex-1 flex-col">
                      <div className="shrink-0 border-b border-slate-100 px-5 py-5 sm:px-7">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
                                Résumé valorisation
                              </p>
                              <h3 className="mt-1.5 truncate text-xl font-semibold leading-snug text-[#2A2F3A] sm:text-2xl">
                                {selected.title}
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                Progression, indicateurs clés et principaux risques avant d&apos;ouvrir
                                le parcours.
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
                                  Progression globale de l&apos;évaluation.
                                </p>
                              </div>
                              <p className="text-2xl font-semibold tabular-nums tracking-tight text-[#2A2F3A]">
                                {overallProgress}
                                <span className="text-sm font-medium text-slate-500">%</span>
                              </p>
                            </div>
                            <div
                              className="h-1.5 w-full overflow-hidden rounded-full bg-[#E6D6C3]/40"
                              data-testid="valuation-hub-progress-bar"
                            >
                              <div
                                className="h-full rounded-full bg-[#2A2F3A] transition-all duration-500 ease-out"
                                style={{ width: `${overallProgress}%` }}
                              />
                            </div>
                          </div>

                          <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

                          <ValuationFinancialPreview
                            summary={previewSummary}
                            loading={previewLoading}
                          />
                        </div>
                      </ScrollArea>

                      <div className="shrink-0 border-t border-slate-100 px-5 py-4 sm:px-7">
                        <button
                          type="button"
                          data-testid="open-valuation-button"
                          onClick={() => handleOpen(selected)}
                          className="group inline-flex items-center gap-2.5 rounded-md bg-[#E6D6C3] px-5 py-3 text-xs font-semibold tracking-[0.08em] text-[#1F2430] transition hover:bg-[#f0e6d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D6C3]/60"
                        >
                          OUVRIR LA VALORISATION
                          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                        </button>
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
          className="w-[calc(100vw-2rem)] overflow-hidden border border-[#E6D6C3]/40 p-0 shadow-[0_24px_60px_-28px_rgba(34,39,50,0.45)] sm:w-[min(36rem,92vw)] sm:max-w-none"
          data-testid="new-valuation-dialog"
        >
          <div className="border-b border-[#E6D6C3]/40 bg-[#222732]/[0.02] px-6 py-5 sm:px-8">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E6D6C3]" aria-hidden />
              <DialogHeader className="space-y-1.5 text-left">
                <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#C9B8A5]/90">
                  Évaluation d&apos;entreprise
                </p>
                <DialogTitle className="text-xl font-semibold tracking-tight text-[#2A2F3A] sm:text-2xl">
                  Nouvelle valorisation
                </DialogTitle>
                <DialogDescription className="max-w-md text-sm leading-relaxed text-slate-600">
                  Indiquez le nom et la date de référence. Vous serez conduit au tableau de bord
                  pour parcourir le plan de valorisation
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
              <label htmlFor="new-valuation-name" className="sr-only">
                Nom de la valorisation
              </label>
              <Input
                id="new-valuation-name"
                data-testid="new-valuation-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex. : Valorisation 2026, Scénario cession…"
                className="h-11 w-full border-slate-200 bg-white text-[#2A2F3A] placeholder:text-slate-400 focus-visible:ring-[#E6D6C3]/80"
                autoFocus
              />
            </div>

            <div className="h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent" aria-hidden />

            <div className="space-y-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#2A2F3A]/55">
                Date de référence
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-sm text-slate-600">Mois</label>
                  <Select
                    value={String(newMonth)}
                    onValueChange={(v) => setNewMonth(parseInt(v, 10))}
                  >
                    <SelectTrigger
                      className="h-11 w-full border-slate-200 bg-white"
                      data-testid="new-valuation-month"
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
                  <label className="text-sm text-slate-600">Année</label>
                  <Select
                    value={String(newYear)}
                    onValueChange={(v) => setNewYear(parseInt(v, 10))}
                  >
                    <SelectTrigger
                      className="h-11 w-full border-slate-200 bg-white"
                      data-testid="new-valuation-year"
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
              data-testid="new-valuation-submit"
              onClick={handleCreate}
              disabled={!newName.trim() || !companyIdForCreate}
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
