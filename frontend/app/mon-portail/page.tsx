"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Calendar, Check, FolderOpen, Loader2, Plus, User, X } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  createCompany,
  getCompanyPortalSummary,
  listCompanies,
  type Company as ApiCompany,
  type CompanyPortalSummary,
} from "@/lib/api"

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const

const NOTE_PAGE_LABELS: Record<string, string> = {
  "income-statement": "États des résultats",
  "balance-sheet": "Bilan",
  "cash-flow": "Flux de trésorerie",
  "product-margin": "Marge par produits",
  "capex": "Capex",
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

function formatBvReference(p: { fiscal_year: number; month: number }) {
  const m = MONTHS_FR[p.month - 1] ?? String(p.month)
  return `${m} · exercice fiscal ${p.fiscal_year}`
}

function pickLatestActivity(summary: CompanyPortalSummary) {
  const companyMs = new Date(summary.company_updated_at).getTime()
  const note = summary.note_last_activity
  const noteMs = note ? new Date(note.updated_at).getTime() : -1
  if (note && noteMs >= companyMs) {
    return {
      displayAt: note.updated_at,
      kind: "note" as const,
      who: note.created_by_name?.trim() || null,
      detail: note.row_label,
      pageLabel: NOTE_PAGE_LABELS[note.page] ?? note.page,
    }
  }
  return {
    displayAt: summary.company_updated_at,
    kind: "company" as const,
    who: null as string | null,
    detail: "Paramètres ou métadonnées de la société",
    pageLabel: null as string | null,
  }
}

type ConsolidatedGroup = {
  id: string
  name: string
  companyIds: string[]
}

function MesSocietesCard({
  children,
  bodyClassName,
}: {
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <div className="mb-6 w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
      <div className="border-b border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80 px-6 py-4 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#E0742D]" aria-hidden />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-[#2A2F3A] sm:text-xl">Mes sociétés</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                Liste des sociétés créées dans votre portail.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className={bodyClassName ?? undefined}>{children}</div>
    </div>
  )
}

export default function MonPortailPage() {
  const [companies, setCompanies] = useState<ApiCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [portalSummary, setPortalSummary] = useState<CompanyPortalSummary | null>(null)
  const [portalSummaryLoading, setPortalSummaryLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [newCompanyFiscalYearEnd, setNewCompanyFiscalYearEnd] = useState("12-31")
  const [newCompanyCurrency, setNewCompanyCurrency] = useState("CAD")
  const [creating, setCreating] = useState(false)
  const [groups, setGroups] = useState<ConsolidatedGroup[]>([])
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])

  const refreshCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listCompanies()
      setCompanies(data)
    } catch {
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCompanies()
  }, [refreshCompanies])

  useEffect(() => {
    if (companies.length === 0) {
      setSelectedCompanyId(null)
      return
    }
    setSelectedCompanyId((prev) => {
      if (prev && companies.some((c) => c.id === prev)) return prev
      return companies[0].id
    })
  }, [companies])

  useEffect(() => {
    if (!selectedCompanyId) {
      setPortalSummary(null)
      return
    }
    let cancelled = false
    setPortalSummaryLoading(true)
    setPortalSummary(null)
    getCompanyPortalSummary(selectedCompanyId)
      .then((data) => {
        if (!cancelled) setPortalSummary(data)
      })
      .catch(() => {
        if (!cancelled) setPortalSummary(null)
      })
      .finally(() => {
        if (!cancelled) setPortalSummaryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedCompanyId])

  const fiscalYearEndOptions = [
    { value: "12-31", label: "31 décembre" },
    { value: "01-31", label: "31 janvier" },
    { value: "02-28", label: "28 février" },
    { value: "03-31", label: "31 mars" },
    { value: "04-30", label: "30 avril" },
    { value: "05-31", label: "31 mai" },
    { value: "06-30", label: "30 juin" },
    { value: "07-31", label: "31 juillet" },
    { value: "08-31", label: "31 août" },
    { value: "09-30", label: "30 septembre" },
    { value: "10-31", label: "31 octobre" },
    { value: "11-30", label: "30 novembre" },
  ]

  const currencies = [
    { value: "CAD", label: "CAD - Dollar canadien" },
    { value: "USD", label: "USD - Dollar américain" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - Livre sterling" },
    { value: "CHF", label: "CHF - Franc suisse" },
    { value: "JPY", label: "JPY - Yen japonais" },
    { value: "AUD", label: "AUD - Dollar australien" },
  ]

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim() || creating) return
    setCreating(true)
    try {
      const created = await createCompany({
        name: newCompanyName.trim(),
        fiscal_year_end: newCompanyFiscalYearEnd,
        currency: newCompanyCurrency,
      })
      setCompanies((prev) => [...prev, created])
      setSelectedCompanyId(created.id)
      setNewCompanyName("")
      setNewCompanyFiscalYearEnd("12-31")
      setNewCompanyCurrency("CAD")
      setIsDialogOpen(false)
    } catch {
      alert("Erreur lors de la création de la société")
    } finally {
      setCreating(false)
    }
  }

  const toggleCompanyForGroup = (companyId: string, checked: boolean) => {
    setSelectedCompanyIds((prev) => {
      if (checked) {
        if (prev.includes(companyId)) return prev
        return [...prev, companyId]
      }
      return prev.filter((id) => id !== companyId)
    })
  }

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || selectedCompanyIds.length < 2) return
    const newGroup: ConsolidatedGroup = {
      id: crypto.randomUUID(),
      name: newGroupName.trim(),
      companyIds: selectedCompanyIds,
    }
    setGroups((prev) => [...prev, newGroup])
    setNewGroupName("")
    setSelectedCompanyIds([])
    setIsGroupDialogOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Modelisys" />

      {/* Dark Header Section */}
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
            <div className="w-2"></div>
            <div className="flex-1">
              <h2 className="text-4xl font-semibold text-[#E6D6C3] mb-2 tracking-tight">Mon portail</h2>
              <p className="text-base text-[#C9B8A5]/90 mb-6">
                Retrouvez toutes vos sociétés créées en un seul endroit.
              </p>
              <p className="text-base text-[#C9B8A5]/80 mb-6 leading-relaxed max-w-4xl">
                Cette vue vous permet de retrouver rapidement les sociétés de votre espace et d'accéder à leur fiche
                de configuration.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-[#E0742D] hover:bg-[#c96526] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle société
                </Button>
                <Button
                  onClick={() => setIsGroupDialogOpen(true)}
                  className="bg-[#E0742D] hover:bg-[#c96526] text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau groupe consolidé
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Overlapping section */}
      <main className="relative -mt-32 mb-12">
        <div className="max-w-[1920px] mx-auto px-6">
          {loading ? (
            <MesSocietesCard bodyClassName="px-6 py-8">
              <p className="text-sm text-slate-600">Chargement des sociétés...</p>
            </MesSocietesCard>
          ) : companies.length === 0 ? (
            <MesSocietesCard>
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <FolderOpen className="mb-4 h-14 w-14 text-slate-300" aria-hidden />
                <h3 className="text-lg font-semibold text-[#2A2F3A]">Aucune société créée</h3>
                <p className="mt-2 max-w-md text-sm text-slate-600">Créez votre première société pour commencer.</p>
                <Link href="/settings/companies" className="mt-6">
                  <Button className="bg-[#2A2F3A] text-[#E6D6C3] hover:bg-[#1F2430]">Ajouter une société</Button>
                </Link>
              </div>
            </MesSocietesCard>
          ) : (
            <MesSocietesCard>
              <div className="grid min-h-[min(70vh,600px)] grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
                <aside
                  className={cn(
                    "flex min-h-[220px] min-w-0 flex-col border-slate-200 bg-gradient-to-b from-slate-50/95 to-white",
                    "border-b lg:min-h-0 lg:border-r lg:border-b-0 lg:border-t-0",
                    "lg:shadow-[inset_-1px_0_0_0_rgba(226,232,240,0.85)]",
                  )}
                >
                  <div className="border-b border-slate-200/90 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Sociétés ({companies.length})
                    </p>
                  </div>
                  <ScrollArea className="h-[min(45vh,380px)] lg:h-[min(70vh,600px)]">
                    <ul className="p-2">
                      {companies.map((company) => {
                        const selected = company.id === selectedCompanyId
                        return (
                          <li key={company.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedCompanyId(company.id)}
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
                                  {company.name}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500">{company.currency}</span>
                                {selected ? (
                                  <span className="mt-2 block h-0.5 w-8 rounded-full bg-[#E0742D]" aria-hidden />
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
                  {selectedCompanyId && portalSummaryLoading ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
                      <p className="text-sm text-slate-600">Chargement du résumé…</p>
                    </div>
                  ) : selectedCompanyId && portalSummary ? (
                    <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-7">
                      {(() => {
                        const company = companies.find((c) => c.id === selectedCompanyId)
                        const fyeLabel =
                          fiscalYearEndOptions.find((o) => o.value === portalSummary.fiscal_year_end)?.label ??
                          portalSummary.fiscal_year_end
                        const currencyLabel =
                          currencies.find((c) => c.value === portalSummary.currency)?.label ?? portalSummary.currency
                        const activity = pickLatestActivity(portalSummary)
                        return (
                          <>
                            <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
                              <div className="flex min-w-0 flex-1 items-start gap-3">
                                <div
                                  className="mt-1 h-10 w-1 shrink-0 rounded-full bg-[#E0742D]"
                                  aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#E0742D]">
                                    Résumé société
                                  </p>
                                  <h3 className="mt-1 text-xl font-semibold leading-snug text-[#2A2F3A] sm:text-2xl">
                                    {company?.name ?? "—"}
                                  </h3>
                                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                    Paramètres, balance importée et dernière activité sur cette entité.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid gap-8 sm:grid-cols-2">
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                  Fin d&apos;exercice
                                </p>
                                <p className="text-sm font-medium text-slate-800">{fyeLabel}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Devise</p>
                                <p className="text-sm font-medium text-slate-800">{currencyLabel}</p>
                              </div>
                            </div>

                            <div
                              className="my-6 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent"
                              role="separator"
                              aria-hidden
                            />

                            <div className="space-y-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Date de référence (balance importée)
                              </p>
                              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                                <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                {portalSummary.trial_balance_last_period ? (
                                  <span className="font-medium text-slate-800">
                                    {formatBvReference(portalSummary.trial_balance_last_period)}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Aucune balance importée</span>
                                )}
                              </p>
                            </div>

                            <div
                              className="my-6 h-px w-full bg-gradient-to-r from-[#E0742D]/80 via-slate-200/40 to-transparent"
                              role="separator"
                              aria-hidden
                            />

                            <div className="space-y-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Dernière activité
                              </p>
                              <p className="text-sm text-slate-800">
                                <span className="font-semibold text-[#2A2F3A]">
                                  {activity.kind === "note" ? "Note" : "Fiche société"}
                                </span>
                                {activity.kind === "note" && activity.pageLabel ? (
                                  <span className="font-normal text-slate-500"> · {activity.pageLabel}</span>
                                ) : null}
                              </p>
                              <p className="text-sm leading-relaxed text-slate-600">{activity.detail}</p>
                              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                                <span>
                                  <span className="text-slate-400">Mis à jour</span>{" "}
                                  {formatShortDateTime(activity.displayAt)}
                                </span>
                                {activity.who ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <span className="text-slate-300">·</span>
                                    <User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                                    <span className="text-slate-400">{activity.who}</span>
                                  </span>
                                ) : activity.kind === "note" ? (
                                  <span className="text-slate-400"> · Auteur inconnu</span>
                                ) : null}
                              </p>
                            </div>

                            <p className="mt-8 border-t border-slate-100 pt-5 text-xs leading-relaxed text-slate-500">
                              Les pièces déposées dans Documentation / Fin d&apos;année ne sont pas encore reliées à ce
                              résumé.
                            </p>

                            <div className="mt-6 flex flex-wrap gap-3">
                              <Link href={`/dashboard?companyId=${selectedCompanyId}`}>
                                <Button className="bg-[#E0742D] text-white shadow-sm hover:bg-[#c96526]">
                                  Accéder au portail
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center text-sm text-slate-600">
                      Impossible de charger le résumé pour cette société.
                    </div>
                  )}
                </section>
              </div>
            </MesSocietesCard>
          )}

          {groups.length > 0 && (
          <div className="group relative overflow-hidden rounded-[28px] border-2 border-slate-700 bg-gradient-to-br from-white to-slate-50 shadow-lg mb-6">
            <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-[#E0742D]/[0.12]" />
            <div className="relative bg-white/90 px-8 py-6 border-b border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-[#2A2F3A] flex items-center justify-center transition-all duration-300">
                    <FolderOpen className="w-6 h-6 text-black group-hover:text-[#E6D6C3] transition-colors duration-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-1">Sommaire des groupes consolidés</h2>
                    <p className="text-sm text-slate-600">
                      Liste des groupes de sociétés consolidés configurés dans votre espace.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-x-auto bg-white">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm w-20">No.</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Nom du groupe</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900 text-sm">Sociétés incluses</th>
                    <th className="px-6 py-4 text-right font-semibold text-slate-900 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group, idx) => (
                    <tr key={group.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-slate-700">{idx + 1}</td>
                      <td className="px-6 py-3 font-semibold text-slate-900">{group.name}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {group.companyIds
                          .map((id) => companies.find((c) => c.id === id)?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-slate-500">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle société</DialogTitle>
            <DialogDescription>Créez une nouvelle société et configurez ses paramètres de base</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Nom de la société</label>
              <Input
                placeholder="Nom de la société"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCompany()
                }}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Fin d'année comptable</label>
                <Select value={newCompanyFiscalYearEnd} onValueChange={setNewCompanyFiscalYearEnd}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fiscalYearEndOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Devise</label>
                <Select value={newCompanyCurrency} onValueChange={setNewCompanyCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
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
                setNewCompanyName("")
                setNewCompanyFiscalYearEnd("12-31")
                setNewCompanyCurrency("CAD")
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              onClick={handleCreateCompany}
              disabled={!newCompanyName.trim() || creating}
              className="bg-[#E0742D] hover:bg-[#c96526] text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Créer la société
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau groupe consolidé</DialogTitle>
            <DialogDescription>
              Sélectionnez les sociétés actives à inclure dans le groupe consolidé.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Nom du groupe consolidé</label>
              <Input
                placeholder="Ex. Groupe ABC Inc. - Consolidé"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">Sociétés à inclure</label>
              <div className="rounded-md border border-slate-200 p-4 space-y-3 max-h-52 overflow-y-auto">
                {companies.length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune société disponible.</p>
                ) : (
                  companies.map((company) => {
                    const checked = selectedCompanyIds.includes(company.id)
                    return (
                      <label key={company.id} className="flex items-center gap-3 text-sm text-slate-700">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleCompanyForGroup(company.id, Boolean(value))}
                        />
                        <span>{company.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsGroupDialogOpen(false)
                setNewGroupName("")
                setSelectedCompanyIds([])
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || selectedCompanyIds.length < 2}
              className="bg-[#E0742D] hover:bg-[#c96526] text-white"
            >
              Créer le groupe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
